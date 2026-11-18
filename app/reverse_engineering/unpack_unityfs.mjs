import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const UNPACKED_DIR = 'c:\\xampp\\htdocs\\costa_rica_puravida_in_many_ways\\app\\reverse_engineering\\unpacked_data';
const DATA_UNITY3D_PATH = path.join(UNPACKED_DIR, 'data.unity3d');

function lz4DecompressBlock(src, uncompressedSize) {
  const dst = Buffer.alloc(uncompressedSize);
  let sOff = 0;
  let dOff = 0;

  while (sOff < src.length) {
    const token = src[sOff++];
    let literalLen = token >> 4;
    if (literalLen === 15) {
      let b;
      do {
        b = src[sOff++];
        literalLen += b;
      } while (b === 255);
    }
    if (literalLen > 0) {
      src.copy(dst, dOff, sOff, sOff + literalLen);
      sOff += literalLen;
      dOff += literalLen;
    }
    if (sOff >= src.length) break;

    const offset = src.readUInt16LE(sOff);
    sOff += 2;

    let matchLen = (token & 0x0f) + 4;
    if ((token & 0x0f) === 15) {
      let b;
      do {
        b = src[sOff++];
        matchLen += b;
      } while (b === 255);
    }

    let matchPos = dOff - offset;
    for (let i = 0; i < matchLen; i++) {
      dst[dOff++] = dst[matchPos++];
    }
  }
  return dst.subarray(0, dOff);
}

function readCString(buf, offset) {
  let end = offset;
  while (end < buf.length && buf[end] !== 0) end++;
  return { str: buf.subarray(offset, end).toString('utf8'), nextOffset: end + 1 };
}

function inspectSerializedHeader(buf) {
  if (buf.length < 40) return null;
  const metadataSize = buf.readUInt32BE(0);
  const fileSize = buf.readUInt32BE(4);
  const formatVersion = buf.readUInt32BE(8);
  const dataOffset = buf.readUInt32BE(12);
  const endian = buf[16] === 0 ? 'LittleEndian' : 'BigEndian';
  if (formatVersion >= 9 && formatVersion <= 30) {
    const { str: engineVersion } = readCString(buf, 20);
    return {
      metadata_size: metadataSize,
      file_size: fileSize,
      format_version: formatVersion,
      data_offset: dataOffset,
      endianness: endian,
      engine_version: engineVersion
    };
  }
  return null;
}

function main() {
  const buf = fs.readFileSync(DATA_UNITY3D_PATH);
  let pos = 0;
  const sig = readCString(buf, pos); pos = sig.nextOffset;
  const archiveVersion = buf.readUInt32BE(pos); pos += 4;
  const bundleVersion = readCString(buf, pos); pos = bundleVersion.nextOffset;
  const minRevision = readCString(buf, pos); pos = minRevision.nextOffset;
  const totalSize = Number(buf.readBigInt64BE(pos)); pos += 8;
  const compBlocksInfoSize = buf.readUInt32BE(pos); pos += 4;
  const uncompBlocksInfoSize = buf.readUInt32BE(pos); pos += 4;
  const flags = buf.readUInt32BE(pos); pos += 4;

  console.log({
    signature: sig.str,
    archiveVersion,
    bundleVersion: bundleVersion.str,
    minRevision: minRevision.str,
    totalSize,
    compBlocksInfoSize,
    uncompBlocksInfoSize,
    flags: '0x' + flags.toString(16),
    compressionType: flags & 0x3f,
    blocksInfoAtEnd: Boolean(flags & 0x80)
  });

  let blocksInfoComp;
  let dataStartPos = pos;
  if (flags & 0x80) {
    blocksInfoComp = buf.subarray(totalSize - compBlocksInfoSize, totalSize);
  } else {
    blocksInfoComp = buf.subarray(pos, pos + compBlocksInfoSize);
    dataStartPos = pos + compBlocksInfoSize;
  }

  let blocksInfoBuf;
  const compType = flags & 0x3f;
  if (compType === 0) {
    blocksInfoBuf = blocksInfoComp;
  } else if (compType === 2 || compType === 3) {
    blocksInfoBuf = lz4DecompressBlock(blocksInfoComp, uncompBlocksInfoSize);
  } else {
    throw new Error(`Unsupported BlocksInfo compression type: ${compType}`);
  }

  let bPos = 16; // skip 16-byte uncompressedDataHash
  const blockCount = blocksInfoBuf.readInt32BE(bPos); bPos += 4;
  const blocks = [];
  let totalUncompressedSize = 0;
  for (let i = 0; i < blockCount; i++) {
    const uncompSize = blocksInfoBuf.readUInt32BE(bPos); bPos += 4;
    const compSize = blocksInfoBuf.readUInt32BE(bPos); bPos += 4;
    const bFlags = blocksInfoBuf.readUInt16BE(bPos); bPos += 2;
    blocks.push({ uncompSize, compSize, bFlags });
    totalUncompressedSize += uncompSize;
  }

  const nodeCount = blocksInfoBuf.readInt32BE(bPos); bPos += 4;
  const nodes = [];
  for (let i = 0; i < nodeCount; i++) {
    const nOffset = Number(blocksInfoBuf.readBigInt64BE(bPos)); bPos += 8;
    const nSize = Number(blocksInfoBuf.readBigInt64BE(bPos)); bPos += 8;
    const nFlags = blocksInfoBuf.readUInt32BE(bPos); bPos += 4;
    const nPath = readCString(blocksInfoBuf, bPos); bPos = nPath.nextOffset;
    nodes.push({ offset: nOffset, size: nSize, flags: nFlags, name: nPath.str });
  }

  console.log(`Blocks: ${blockCount}, Total Uncompressed: ${totalUncompressedSize} bytes, Nodes: ${nodeCount}`);

  // Decompress all blocks into one stream buffer
  const streamBuf = Buffer.alloc(totalUncompressedSize);
  let curCompPos = dataStartPos;
  let curUncompPos = 0;
  for (const blk of blocks) {
    const blkCompType = blk.bFlags & 0x3f;
    const chunk = buf.subarray(curCompPos, curCompPos + blk.compSize);
    curCompPos += blk.compSize;
    if (blkCompType === 0) {
      chunk.copy(streamBuf, curUncompPos);
    } else if (blkCompType === 2 || blkCompType === 3) {
      const dec = lz4DecompressBlock(chunk, blk.uncompSize);
      dec.copy(streamBuf, curUncompPos);
    } else {
      throw new Error(`Unsupported block compression: ${blkCompType}`);
    }
    curUncompPos += blk.uncompSize;
  }

  const extractedNodes = [];
  for (const node of nodes) {
    const nodeBytes = streamBuf.subarray(node.offset, node.offset + node.size);
    const outPath = path.join(UNPACKED_DIR, node.name);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, nodeBytes);
    const headerInfo = inspectSerializedHeader(nodeBytes);
    extractedNodes.push({
      name: node.name,
      offset: node.offset,
      size: node.size,
      flags: node.flags,
      sha256: crypto.createHash('sha256').update(nodeBytes).digest('hex'),
      serialized_header: headerInfo
    });
  }

  const outJsonPath = path.join(UNPACKED_DIR, 'data_unity3d_nodes.json');
  fs.writeFileSync(outJsonPath, JSON.stringify({
    header: {
      signature: sig.str,
      archiveVersion,
      bundleVersion: bundleVersion.str,
      minRevision: minRevision.str,
      totalSize,
      compBlocksInfoSize,
      uncompBlocksInfoSize,
      flags,
      blockCount,
      totalUncompressedSize,
      nodeCount
    },
    nodes: extractedNodes
  }, null, 2));
  console.log(`Extracted ${extractedNodes.length} internal UnityFS nodes into ${UNPACKED_DIR}`);
}

main();
