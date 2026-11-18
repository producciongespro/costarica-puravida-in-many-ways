import os
import sys
import gzip
import struct
import json
import hashlib

RAW_BUILD_DIR = r"c:\xampp\htdocs\costa_rica_puravida_in_many_ways\app\reverse_engineering\raw_build\Build"
UNPACKED_DIR = r"c:\xampp\htdocs\costa_rica_puravida_in_many_ways\app\reverse_engineering\unpacked_data"
MANIFEST_PATH = os.path.join(RAW_BUILD_DIR, "e3bd147cb76cb3d8c5882b29795ab98e.json")


def detect_and_decompress(data: bytes):
    """Detect Gzip, Brotli, or uncompressed data and return (compression_type, decompressed_bytes)."""
    if data[:2] == b"\x1f\x8b":
        return "Gzip", gzip.decompress(data)
    if b"UnityWeb Compressed Content (brotli)" in data[:128]:
        try:
            import brotli
            # Unity brotli header or standard brotli stream
            return "Brotli", brotli.decompress(data)
        except Exception as e:
            return f"Brotli (error: {e})", data
    if data.startswith(b"UnityWebData1.0\x00"):
        return "Uncompressed (UnityWebData1.0)", data
    # Try brotli just in case
    try:
        import brotli
        dec = brotli.decompress(data)
        return "Brotli (raw)", dec
    except Exception:
        pass
    return "Uncompressed", data


def unpack_unity_web_data(data: bytes, output_dir: str):
    """Parse UnityWebData1.0 container and extract all files."""
    magic = b"UnityWebData1.0\x00"
    if not data.startswith(magic):
        raise ValueError(f"Invalid header magic: {data[:16]!r}")

    offset = len(magic)
    head_size = struct.unpack_from("<I", data, offset)[0]
    offset += 4

    extracted_files = []
    while offset < head_size:
        data_offset, data_size, name_len = struct.unpack_from("<III", data, offset)
        offset += 12
        name = data[offset:offset + name_len].decode("utf-8")
        offset += name_len

        file_bytes = data[data_offset:data_offset + data_size]
        # Clean relative path
        rel_path = name.lstrip("/\\")
        out_path = os.path.join(output_dir, rel_path)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, "wb") as f:
            f.write(file_bytes)

        # Inspect file header for Unity version / magic
        header_preview = file_bytes[:64]
        extracted_files.append({
            "name": name,
            "data_offset": data_offset,
            "data_size": data_size,
            "out_path": out_path,
            "sha256": hashlib.sha256(file_bytes).hexdigest(),
            "header_hex": header_preview[:32].hex(),
            "header_ascii": "".join(chr(b) if 32 <= b < 127 else "." for b in header_preview),
        })

    return head_size, extracted_files


def inspect_unity_version(file_path: str):
    """Extract Unity version string from globalgamemanagers, data.unity3d, or assets file."""
    with open(file_path, "rb") as f:
        chunk = f.read(256)
    # In UnityFS (data.unity3d): magic "UnityFS\0", version(uint32 BE), player_version(cstr), engine_version(cstr)
    if chunk.startswith(b"UnityFS\x00"):
        parts = chunk[12:].split(b"\x00")
        if len(parts) >= 2:
            return {
                "format": "UnityFS",
                "format_version": struct.unpack(">I", chunk[8:12])[0],
                "player_version": parts[0].decode("ascii", errors="replace"),
                "engine_version": parts[1].decode("ascii", errors="replace"),
            }
    # In serialized asset file (globalgamemanagers, level0, etc.):
    # Standard header: metadata_size(4B BE), file_size(4B BE), version(4B BE), data_offset(4B BE), endian(1B), reserved(3B), unity_version(cstr)
    if len(chunk) >= 40:
        ver = struct.unpack(">I", chunk[8:12])[0]
        if 9 <= ver <= 30:
            cstr = chunk[20:].split(b"\x00")[0].decode("ascii", errors="replace")
            return {
                "format": "SerializedFile",
                "format_version": ver,
                "engine_version": cstr,
            }
    return {"format": "Binary/Metadata", "preview": chunk[:32].hex()}


def main():
    os.makedirs(UNPACKED_DIR, exist_ok=True)
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    report = {"manifest": manifest, "packages": {}, "extracted_files": []}

    # Process dataUrl
    data_url = manifest.get("dataUrl")
    if data_url:
        data_path = os.path.join(RAW_BUILD_DIR, data_url)
        with open(data_path, "rb") as f:
            raw_bytes = f.read()
        comp_type, dec_bytes = detect_and_decompress(raw_bytes)
        head_size, extracted = unpack_unity_web_data(dec_bytes, UNPACKED_DIR)
        for item in extracted:
            item["unity_info"] = inspect_unity_version(item["out_path"])
        report["packages"]["dataUrl"] = {
            "filename": data_url,
            "compressed_size": len(raw_bytes),
            "decompressed_size": len(dec_bytes),
            "compression": comp_type,
            "container_head_size": head_size,
            "file_count": len(extracted),
        }
        report["extracted_files"] = extracted

    # Process code / memory / framework packages
    mapping = [
        ("wasmCodeUrl", "build.wasm"),
        ("wasmFrameworkUrl", "build.framework.js"),
        ("asmCodeUrl", "build.asm.js"),
        ("asmMemoryUrl", "build.mem"),
        ("asmFrameworkUrl", "build.framework.js"),
    ]
    for key, out_name in mapping:
        pkg_file = manifest.get(key)
        if pkg_file:
            pkg_path = os.path.join(RAW_BUILD_DIR, pkg_file)
            if os.path.exists(pkg_path):
                with open(pkg_path, "rb") as f:
                    raw_bytes = f.read()
                comp_type, dec_bytes = detect_and_decompress(raw_bytes)
                out_path = os.path.join(UNPACKED_DIR, out_name)
                with open(out_path, "wb") as f:
                    f.write(dec_bytes)
                report["packages"][key] = {
                    "filename": pkg_file,
                    "output_name": out_name,
                    "compressed_size": len(raw_bytes),
                    "decompressed_size": len(dec_bytes),
                    "compression": comp_type,
                    "sha256_decompressed": hashlib.sha256(dec_bytes).hexdigest(),
                }

    report_path = os.path.join(UNPACKED_DIR, "extraction_summary.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"Extraction complete. Summary written to {report_path}")


if __name__ == "__main__":
    main()
