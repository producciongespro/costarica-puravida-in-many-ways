import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';

const RAW_BUILD_DIR = 'c:\\xampp\\htdocs\\costa_rica_puravida_in_many_ways\\app\\reverse_engineering\\raw_build\\Build';
const UNPACKED_DIR = 'c:\\xampp\\htdocs\\costa_rica_puravida_in_many_ways\\app\\reverse_engineering\\unpacked_data';
const MANIFEST_PATH = path.join(RAW_BUILD_DIR, 'e3bd147cb76cb3d8c5882b29795ab98e.json');

function detectAndDecompress(buf) {
  if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
    return { type: 'Gzip', data: zlib.gunzipSync(buf) };
  }
  const headStr = buf.subarray(0, 128).toString('latin1');
  if (headStr.includes('UnityWeb Compressed Content (brotli)')) {
    // Unity brotli header format or raw brotli
    return { type: 'Brotli (Unity header)', data: zlib.brotliDecompressSync(buf) };
  }
  if (headStr.startsWith('UnityWebData1.0\0')) {
    return { type: 'Uncompressed (UnityWebData1.0)', data: buf };
  }
  try {
    const dec = zlib.brotliDecompressSync(buf);
    return { type: 'Brotli', data: dec };
  } catch (_) {}
  return { type: 'Uncompressed', data: buf };
}

function inspectUnityVersion(buf) {
  const chunk = buf.subarray(0, Math.min(256, buf.length));
  const ascii = chunk.toString('latin1');
  if (ascii.startsWith('UnityFS\0')) {
    const formatVersion = chunk.readUInt32BE(8);
    const rest = chunk.subarray(12);
    const parts = [];
    let start = 0;
    for (let i = 0; i < rest.length && parts.length < 2; i++) {
      if (rest[i] === 0) {
        parts.push(rest.subarray(start, i).toString('ascii'));
        start = i + 1;
      }
    }
    return {
      format: 'UnityFS',
      format_version: formatVersion,
      player_version: parts[0] || '',
      engine_version: parts[1] || ''
    };
  }
  if (chunk.length >= 40) {
    const ver = chunk.readUInt32BE(8);
    if (ver >= 9 && ver <= 30) {
      const rest = chunk.subarray(20);
      const zeroIdx = rest.indexOf(0);
      const engineVer = zeroIdx !== -1 ? rest.subarray(0, zeroIdx).toString('ascii') : '';
      return {
        format: 'SerializedFile',
        metadata_size: chunk.readUInt32BE(0),
        file_size: chunk.readUInt32BE(4),
        format_version: ver,
        data_offset: chunk.readUInt32BE(12),
        endianness: chunk[16] === 0 ? 'LittleEndian' : 'BigEndian',
        engine_version: engineVer
      };
    }
  }
  // Check if global-metadata.dat (0xFAB11BAF magic)
  if (chunk.length >= 8 && chunk.readUInt32LE(0) === 0xFAB11BAF) {
    return {
      format: 'Il2CppGlobalMetadata',
      magic: '0xFAB11BAF',
      metadata_version: chunk.readInt32LE(4)
    };
  }
  return {
    format: 'Binary/Resource',
    preview_hex: chunk.subarray(0, 32).toString('hex')
  };
}

function unpackUnityWebData(buf, outputDir) {
  const magic = 'UnityWebData1.0\0';
  const actualMagic = buf.subarray(0, 16).toString('latin1');
  if (actualMagic !== magic) {
    throw new Error(`Invalid UnityWebData1.0 magic: ${Buffer.from(actualMagic, 'latin1').toString('hex')}`);
  }
  let offset = 16;
  const headSize = buf.readUInt32LE(offset);
  offset += 4;

  const extractedFiles = [];
  while (offset < headSize) {
    const dataOffset = buf.readUInt32LE(offset);
    const dataSize = buf.readUInt32LE(offset + 4);
    const nameLen = buf.readUInt32LE(offset + 8);
    offset += 12;
    const name = buf.subarray(offset, offset + nameLen).toString('utf8');
    offset += nameLen;

    const fileBytes = buf.subarray(dataOffset, dataOffset + dataSize);
    const relPath = name.replace(/^[/\\]+/, '');
    const outPath = path.join(outputDir, relPath);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, fileBytes);

    const preview = fileBytes.subarray(0, Math.min(64, fileBytes.length));
    let asciiPreview = '';
    for (let i = 0; i < preview.length; i++) {
      const b = preview[i];
      asciiPreview += (b >= 32 && b < 127) ? String.fromCharCode(b) : '.';
    }

    extractedFiles.push({
      name,
      data_offset: dataOffset,
      data_size: dataSize,
      out_path: outPath,
      sha256: crypto.createHash('sha256').update(fileBytes).digest('hex'),
      header_hex: preview.subarray(0, 32).toString('hex'),
      header_ascii: asciiPreview,
      unity_info: inspectUnityVersion(fileBytes)
    });
  }
  return { headSize, extractedFiles };
}

function main() {
  fs.mkdirSync(UNPACKED_DIR, { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const report = {
    manifest,
    packages: {},
    extracted_files: []
  };

  if (manifest.dataUrl) {
    const dataPath = path.join(RAW_BUILD_DIR, manifest.dataUrl);
    const rawBuf = fs.readFileSync(dataPath);
    const { type, data } = detectAndDecompress(rawBuf);
    const { headSize, extractedFiles } = unpackUnityWebData(data, UNPACKED_DIR);
    report.packages.dataUrl = {
      filename: manifest.dataUrl,
      compressed_size: rawBuf.length,
      decompressed_size: data.length,
      compression: type,
      sha256_compressed: crypto.createHash('sha256').update(rawBuf).digest('hex'),
      sha256_decompressed: crypto.createHash('sha256').update(data).digest('hex'),
      container_head_size: headSize,
      file_count: extractedFiles.length
    };
    report.extracted_files = extractedFiles;
  }

  const mappings = [
    ['wasmCodeUrl', 'build.wasm'],
    ['wasmFrameworkUrl', 'build.framework.js'],
    ['asmCodeUrl', 'build.asm.js'],
    ['asmMemoryUrl', 'build.mem'],
    ['asmFrameworkUrl', 'build.framework.js']
  ];

  for (const [key, outName] of mappings) {
    const pkgFile = manifest[key];
    if (pkgFile) {
      const pkgPath = path.join(RAW_BUILD_DIR, pkgFile);
      if (fs.existsSync(pkgPath)) {
        const rawBuf = fs.readFileSync(pkgPath);
        const { type, data } = detectAndDecompress(rawBuf);
        const outPath = path.join(UNPACKED_DIR, outName);
        fs.writeFileSync(outPath, data);
        report.packages[key] = {
          filename: pkgFile,
          output_name: outName,
          compressed_size: rawBuf.length,
          decompressed_size: data.length,
          compression: type,
          sha256_compressed: crypto.createHash('sha256').update(rawBuf).digest('hex'),
          sha256_decompressed: crypto.createHash('sha256').update(data).digest('hex'),
          preview_ascii: data.subarray(0, 120).toString('utf8').replace(/[\r\n]+/g, ' ')
        };
      }
    }
  }

  const summaryPath = path.join(UNPACKED_DIR, 'extraction_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(report, null, 2));
  console.log(`Unpacked ${report.extracted_files.length} files from UnityWebData1.0.`);
}

main();
