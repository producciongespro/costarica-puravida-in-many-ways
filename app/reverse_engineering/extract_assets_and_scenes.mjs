import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';

const BASE_DIR = 'c:\\xampp\\htdocs\\costa_rica_puravida_in_many_ways\\app\\reverse_engineering';
const UNPACKED_DIR = path.join(BASE_DIR, 'unpacked_data');
const OUT_DIR = path.join(BASE_DIR, 'extracted_assets');

const DIRS = {
  textures: path.join(OUT_DIR, 'textures'),
  sprites: path.join(OUT_DIR, 'sprites'),
  audio: path.join(OUT_DIR, 'audio'),
  fonts: path.join(OUT_DIR, 'fonts'),
  text_assets: path.join(OUT_DIR, 'text_assets'),
  scenes_hierarchy: path.join(OUT_DIR, 'scenes_hierarchy')
};

for (const d of Object.values(DIRS)) {
  fs.mkdirSync(d, { recursive: true });
}

// ============================================================================
// 1. PNG Encoder & Texture Decoders (RGB24, RGBA32, ARGB32, DXT1, DXT5)
// ============================================================================

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(typeStr, dataBuf) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(dataBuf.length, 0);
  const typeBuf = Buffer.from(typeStr, 'ascii');
  const crcInput = Buffer.concat([typeBuf, dataBuf]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, dataBuf, crcBuf]);
}

function encodeRGBAtoPNG(width, height, rgbaTopDown) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth 8
  ihdr[9] = 6; // color type 6 = RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const rawScanlines = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    rawScanlines[rowStart] = 0; // filter type 0 (None)
    rgbaTopDown.copy(rawScanlines, rowStart + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(rawScanlines, { level: 6 });
  return Buffer.concat([
    sig,
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', compressed),
    makePngChunk('IEND', Buffer.alloc(0))
  ]);
}

function unpackRGB565(c) {
  const r = Math.round(((c >> 11) & 31) * 255 / 31);
  const g = Math.round(((c >> 5) & 63) * 255 / 63);
  const b = Math.round((c & 31) * 255 / 31);
  return [r, g, b];
}

// Decodes Unity Texture2D (bottom-to-top) into top-to-bottom RGBA8888 buffer
function decodeTexture2D(width, height, format, rawData) {
  const dst = Buffer.alloc(width * height * 4);

  if (format === 3) {
    // RGB24 (3 bytes per pixel, bottom-to-top)
    let srcOff = 0;
    for (let y = 0; y < height; y++) {
      const dstY = height - 1 - y;
      for (let x = 0; x < width; x++) {
        const dOff = (dstY * width + x) * 4;
        dst[dOff] = rawData[srcOff];
        dst[dOff + 1] = rawData[srcOff + 1];
        dst[dOff + 2] = rawData[srcOff + 2];
        dst[dOff + 3] = 255;
        srcOff += 3;
      }
    }
    return dst;
  }

  if (format === 4) {
    // RGBA32 (4 bytes per pixel, bottom-to-top)
    let srcOff = 0;
    for (let y = 0; y < height; y++) {
      const dstY = height - 1 - y;
      for (let x = 0; x < width; x++) {
        const dOff = (dstY * width + x) * 4;
        dst[dOff] = rawData[srcOff];
        dst[dOff + 1] = rawData[srcOff + 1];
        dst[dOff + 2] = rawData[srcOff + 2];
        dst[dOff + 3] = rawData[srcOff + 3];
        srcOff += 4;
      }
    }
    return dst;
  }

  if (format === 5) {
    // ARGB32 (4 bytes per pixel: A, R, G, B, bottom-to-top)
    let srcOff = 0;
    for (let y = 0; y < height; y++) {
      const dstY = height - 1 - y;
      for (let x = 0; x < width; x++) {
        const dOff = (dstY * width + x) * 4;
        dst[dOff] = rawData[srcOff + 1];
        dst[dOff + 1] = rawData[srcOff + 2];
        dst[dOff + 2] = rawData[srcOff + 3];
        dst[dOff + 3] = rawData[srcOff];
        srcOff += 4;
      }
    }
    return dst;
  }

  if (format === 10) {
    // DXT1 (BC1, 8 bytes per 4x4 block, bottom-to-top)
    const blocksX = Math.max(1, Math.ceil(width / 4));
    const blocksY = Math.max(1, Math.ceil(height / 4));
    let srcOff = 0;
    const colors = new Uint8Array(16);

    for (let by = 0; by < blocksY; by++) {
      for (let bx = 0; bx < blocksX; bx++) {
        const c0 = rawData.readUInt16LE(srcOff);
        const c1 = rawData.readUInt16LE(srcOff + 2);
        const code = rawData.readUInt32LE(srcOff + 4);
        srcOff += 8;

        const [r0, g0, b0] = unpackRGB565(c0);
        const [r1, g1, b1] = unpackRGB565(c1);
        colors[0] = r0; colors[1] = g0; colors[2] = b0; colors[3] = 255;
        colors[4] = r1; colors[5] = g1; colors[6] = b1; colors[7] = 255;

        if (c0 > c1) {
          colors[8] = Math.round((2 * r0 + r1) / 3);
          colors[9] = Math.round((2 * g0 + g1) / 3);
          colors[10] = Math.round((2 * b0 + b1) / 3);
          colors[11] = 255;
          colors[12] = Math.round((r0 + 2 * r1) / 3);
          colors[13] = Math.round((g0 + 2 * g1) / 3);
          colors[14] = Math.round((b0 + 2 * b1) / 3);
          colors[15] = 255;
        } else {
          colors[8] = Math.round((r0 + r1) / 2);
          colors[9] = Math.round((g0 + g1) / 2);
          colors[10] = Math.round((b0 + b1) / 2);
          colors[11] = 255;
          colors[12] = 0;
          colors[13] = 0;
          colors[14] = 0;
          colors[15] = 0;
        }

        for (let py = 0; py < 4; py++) {
          const y = by * 4 + py;
          if (y >= height) continue;
          const dstY = height - 1 - y;
          for (let px = 0; px < 4; px++) {
            const x = bx * 4 + px;
            if (x >= width) continue;
            const idx = (code >>> ((py * 4 + px) * 2)) & 3;
            const dOff = (dstY * width + x) * 4;
            dst[dOff] = colors[idx * 4];
            dst[dOff + 1] = colors[idx * 4 + 1];
            dst[dOff + 2] = colors[idx * 4 + 2];
            dst[dOff + 3] = colors[idx * 4 + 3];
          }
        }
      }
    }
    return dst;
  }

  if (format === 12) {
    // DXT5 (BC3, 16 bytes per 4x4 block, bottom-to-top)
    const blocksX = Math.max(1, Math.ceil(width / 4));
    const blocksY = Math.max(1, Math.ceil(height / 4));
    let srcOff = 0;
    const colors = new Uint8Array(12);
    const alphas = new Uint8Array(8);

    for (let by = 0; by < blocksY; by++) {
      for (let bx = 0; bx < blocksX; bx++) {
        const a0 = rawData[srcOff];
        const a1 = rawData[srcOff + 1];
        const alphaBitsLo = rawData.readUInt32LE(srcOff + 2); // 32 bits
        const alphaBitsHi = rawData.readUInt16LE(srcOff + 6); // 16 bits
        const alphaBits = BigInt(alphaBitsLo) | (BigInt(alphaBitsHi) << 32n);

        alphas[0] = a0;
        alphas[1] = a1;
        if (a0 > a1) {
          alphas[2] = Math.round((6 * a0 + 1 * a1) / 7);
          alphas[3] = Math.round((5 * a0 + 2 * a1) / 7);
          alphas[4] = Math.round((4 * a0 + 3 * a1) / 7);
          alphas[5] = Math.round((3 * a0 + 4 * a1) / 7);
          alphas[6] = Math.round((2 * a0 + 5 * a1) / 7);
          alphas[7] = Math.round((1 * a0 + 6 * a1) / 7);
        } else {
          alphas[2] = Math.round((4 * a0 + 1 * a1) / 5);
          alphas[3] = Math.round((3 * a0 + 2 * a1) / 5);
          alphas[4] = Math.round((2 * a0 + 3 * a1) / 5);
          alphas[5] = Math.round((1 * a0 + 4 * a1) / 5);
          alphas[6] = 0;
          alphas[7] = 255;
        }

        const c0 = rawData.readUInt16LE(srcOff + 8);
        const c1 = rawData.readUInt16LE(srcOff + 10);
        const code = rawData.readUInt32LE(srcOff + 12);
        srcOff += 16;

        const [r0, g0, b0] = unpackRGB565(c0);
        const [r1, g1, b1] = unpackRGB565(c1);
        colors[0] = r0; colors[1] = g0; colors[2] = b0;
        colors[3] = r1; colors[4] = g1; colors[5] = b1;
        colors[6] = Math.round((2 * r0 + r1) / 3);
        colors[7] = Math.round((2 * g0 + g1) / 3);
        colors[8] = Math.round((2 * b0 + b1) / 3);
        colors[9] = Math.round((r0 + 2 * r1) / 3);
        colors[10] = Math.round((g0 + 2 * g1) / 3);
        colors[11] = Math.round((b0 + 2 * b1) / 3);

        for (let py = 0; py < 4; py++) {
          const y = by * 4 + py;
          if (y >= height) continue;
          const dstY = height - 1 - y;
          for (let px = 0; px < 4; px++) {
            const x = bx * 4 + px;
            if (x >= width) continue;
            const pixIdx = py * 4 + px;
            const cIdx = (code >>> (pixIdx * 2)) & 3;
            const aIdx = Number((alphaBits >> BigInt(pixIdx * 3)) & 7n);
            const dOff = (dstY * width + x) * 4;
            dst[dOff] = colors[cIdx * 3];
            dst[dOff + 1] = colors[cIdx * 3 + 1];
            dst[dOff + 2] = colors[cIdx * 3 + 2];
            dst[dOff + 3] = alphas[aIdx];
          }
        }
      }
    }
    return dst;
  }

  throw new Error(`Unsupported TextureFormat: ${format}`);
}

// Crops a Sprite rectangle (rx, ry, rw, rh in bottom-left Unity coords) from a top-down RGBA texture buffer
function cropSpriteFromTopDownRGBA(texWidth, texHeight, texRGBA, rx, ry, rw, rh) {
  const x0 = Math.max(0, Math.round(rx));
  const y0Bottom = Math.max(0, Math.round(ry));
  const w = Math.min(texWidth - x0, Math.max(1, Math.round(rw)));
  const h = Math.min(texHeight - y0Bottom, Math.max(1, Math.round(rh)));
  const topY = texHeight - (y0Bottom + h);

  const out = Buffer.alloc(w * h * 4);
  for (let row = 0; row < h; row++) {
    const srcRow = topY + row;
    const srcStart = (srcRow * texWidth + x0) * 4;
    texRGBA.copy(out, row * w * 4, srcStart, srcStart + w * 4);
  }
  return { width: w, height: h, rgba: out };
}

// ============================================================================
// 2. SerializedFile v17 Parser & Helper Utilities
// ============================================================================

function readAlignedString(buf, p) {
  if (p + 4 > buf.length) return { str: '', p: buf.length };
  const len = buf.readInt32LE(p);
  p += 4;
  if (len < 0 || p + len > buf.length) return { str: '', p: buf.length };
  const str = buf.subarray(p, p + len).toString('utf8');
  p += len;
  while (p % 4 !== 0) p++;
  return { str, p };
}

function sanitizeFileName(name) {
  const cleaned = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim();
  return cleaned.length > 0 ? cleaned : 'unnamed';
}

function normalizeExtFileName(rawPath) {
  const base = path.basename(rawPath).toLowerCase();
  if (base === 'unity default resources') return 'Resources/unity_default_resources';
  if (base === 'unity_builtin_extra') return 'Resources/unity_builtin_extra';
  return path.basename(rawPath);
}

function parseSerializedFile(filePath, logicalName) {
  const buf = fs.readFileSync(filePath);
  const metaSize = buf.readUInt32BE(0);
  const fileSize = buf.readUInt32BE(4);
  const formatVersion = buf.readUInt32BE(8);
  const dataOff = buf.readUInt32BE(12);
  let p = 20;
  let v0 = p;
  while (buf[p] !== 0) p++;
  const engineVersion = buf.subarray(v0, p).toString('utf8');
  p++;
  const targetPlatform = buf.readInt32LE(p); p += 4;
  const enableTypeTree = buf[p++];
  const typeCount = buf.readInt32LE(p); p += 4;
  const types = [];
  for (let i = 0; i < typeCount; i++) {
    const classID = buf.readInt32LE(p); p += 4;
    const isStripped = buf[p++];
    const scriptTypeIndex = buf.readInt16LE(p); p += 2;
    let scriptID = null;
    if (classID === 114) {
      scriptID = buf.subarray(p, p + 16).toString('hex');
      p += 16;
    }
    const oldTypeHash = buf.subarray(p, p + 16).toString('hex');
    p += 16;
    types.push({ classID, isStripped, scriptTypeIndex, scriptID, oldTypeHash });
  }
  const objCount = buf.readInt32LE(p); p += 4;
  const objs = [];
  const objMap = new Map();
  for (let i = 0; i < objCount; i++) {
    while (p % 4 !== 0) p++;
    const pathID = Number(buf.readBigInt64LE(p)); p += 8;
    const byteStart = buf.readUInt32LE(p); p += 4;
    const byteSize = buf.readUInt32LE(p); p += 4;
    const typeID = buf.readInt32LE(p); p += 4;
    const obj = {
      pathID,
      byteStart,
      byteSize,
      typeID,
      classID: types[typeID].classID,
      scriptTypeIndex: types[typeID].scriptTypeIndex
    };
    objs.push(obj);
    objMap.set(pathID, obj);
  }
  const scriptCount = buf.readInt32LE(p); p += 4;
  const scripts = [];
  for (let i = 0; i < scriptCount; i++) {
    const fileID = buf.readInt32LE(p); p += 4;
    while (p % 4 !== 0) p++;
    const pathID = Number(buf.readBigInt64LE(p)); p += 8;
    scripts.push({ fileID, pathID });
  }
  const extCount = buf.readInt32LE(p); p += 4;
  const externals = [];
  for (let i = 0; i < extCount; i++) {
    while (buf[p] !== 0) p++; p++;
    const guid = buf.subarray(p, p + 16).toString('hex'); p += 16;
    const type = buf.readInt32LE(p); p += 4;
    let p0 = p;
    while (buf[p] !== 0) p++;
    const pathName = buf.subarray(p0, p).toString('utf8'); p++;
    externals.push({ pathName, normalized: normalizeExtFileName(pathName), guid, type });
  }
  return {
    logicalName,
    buf,
    metaSize,
    fileSize,
    formatVersion,
    dataOff,
    engineVersion,
    targetPlatform,
    types,
    objs,
    objMap,
    scripts,
    externals
  };
}

const FORMAT_NAMES = {
  3: 'RGB24',
  4: 'RGBA32',
  5: 'ARGB32',
  10: 'DXT1',
  12: 'DXT5'
};

const CLASS_ID_NAMES = {
  1: 'GameObject',
  4: 'Transform',
  5: 'TimeManager',
  11: 'AudioManager',
  13: 'InputManager',
  19: 'Physics2DSettings',
  20: 'Camera',
  21: 'Material',
  23: 'MeshRenderer',
  28: 'Texture2D',
  30: 'GraphicsSettings',
  33: 'MeshFilter',
  43: 'Mesh',
  47: 'QualitySettings',
  48: 'Shader',
  49: 'TextAsset',
  50: 'Rigidbody2D',
  55: 'PhysicsManager',
  58: 'CircleCollider2D',
  60: 'PolygonCollider2D',
  61: 'BoxCollider2D',
  62: 'PhysicsMaterial2D',
  68: 'EdgeCollider2D',
  70: 'CapsuleCollider2D',
  72: 'ComputeShader',
  74: 'AnimationClip',
  78: 'TagManager',
  81: 'AudioListener',
  82: 'AudioSource',
  83: 'AudioClip',
  89: 'Cubemap',
  90: 'Avatar',
  91: 'AnimatorController',
  92: 'GUILayer',
  94: 'ScriptMapper',
  95: 'Animator',
  96: 'TrailRenderer',
  98: 'DelayedCallManager',
  102: 'TextMesh',
  104: 'RenderSettings',
  108: 'Light',
  111: 'Animation',
  114: 'MonoBehaviour',
  115: 'MonoScript',
  116: 'MonoManager',
  124: 'FlareLayer',
  126: 'NavMeshProjectSettings',
  128: 'Font',
  129: 'PlayerSettings',
  136: 'CapsuleCollider',
  137: 'SkinnedMeshRenderer',
  141: 'BuildSettings',
  147: 'ResourceManager',
  150: 'PreloadData',
  157: 'LightmapSettings',
  198: 'ParticleSystem',
  199: 'ParticleSystemRenderer',
  212: 'SpriteRenderer',
  213: 'Sprite',
  222: 'CanvasRenderer',
  223: 'Canvas',
  224: 'RectTransform',
  225: 'CanvasGroup',
  258: 'LightProbes',
  300: 'CloudWebServicesManager',
  301: 'UnityConnectSettings',
  310: 'UnityAnalyticsManager'
};

// ============================================================================
// 3. Main Execution Pipeline
// ============================================================================

function main() {
  console.log('Loading all SerializedFile containers...');
  const allFileNames = [
    'globalgamemanagers',
    'globalgamemanagers.assets',
    'resources.assets',
    'Resources/unity_builtin_extra',
    'Resources/unity_default_resources'
  ];
  for (let i = 0; i <= 53; i++) {
    allFileNames.push(`level${i}`);
    allFileNames.push(`sharedassets${i}.assets`);
  }

  const filesMap = new Map();
  for (const fname of allFileNames) {
    const fpath = path.join(UNPACKED_DIR, fname);
    if (fs.existsSync(fpath)) {
      filesMap.set(fname, parseSerializedFile(fpath, fname));
    }
  }

  function resolvePPtr(fromFileObj, fileID, pathID) {
    if (pathID === 0) return null;
    const targetFileName = fileID === 0
      ? fromFileObj.logicalName
      : (fromFileObj.externals[fileID - 1]?.normalized || null);
    if (!targetFileName) return null;
    const targetFile = filesMap.get(targetFileName);
    if (!targetFile) return { file: targetFileName, pathID, obj: null };
    return { file: targetFileName, pathID, obj: targetFile.objMap.get(pathID) || null, targetFile };
  }

  function getObjBytes(fileObj, obj) {
    const start = fileObj.dataOff + obj.byteStart;
    return fileObj.buf.subarray(start, start + obj.byteSize);
  }

  // --------------------------------------------------------------------------
  // Step A: Parse globalgamemanagers (BuildSettings, ResourceManager)
  // --------------------------------------------------------------------------
  const ggm = filesMap.get('globalgamemanagers');
  const buildScenes = [];
  const resourcePathsMap = new Map(); // "file:pathID" -> [resourcePath]

  for (const o of ggm.objs) {
    const obuf = getObjBytes(ggm, o);
    if (o.classID === 141) {
      // BuildSettings
      let p = 0;
      const count = obuf.readInt32LE(p); p += 4;
      for (let i = 0; i < count; i++) {
        const r = readAlignedString(obuf, p); p = r.p;
        buildScenes.push({
          index: i,
          levelFile: `level${i}`,
          sharedAssetsFile: `sharedassets${i}.assets`,
          unityScenePath: r.str,
          sceneName: path.basename(r.str, '.unity')
        });
      }
    } else if (o.classID === 147) {
      // ResourceManager
      let p = 0;
      const count = obuf.readInt32LE(p); p += 4;
      for (let i = 0; i < count; i++) {
        const r = readAlignedString(obuf, p); p = r.p;
        const fID = obuf.readInt32LE(p); p += 4;
        const pID = Number(obuf.readBigInt64LE(p)); p += 8;
        const resolved = resolvePPtr(ggm, fID, pID);
        if (resolved) {
          const key = `${resolved.file}:${resolved.pathID}`;
          if (!resourcePathsMap.has(key)) resourcePathsMap.set(key, []);
          resourcePathsMap.get(key).push(r.str);
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // Step B: Parse MonoScript Registry (classID 115)
  // --------------------------------------------------------------------------
  const monoScripts = new Map(); // "file:pathID" -> { name, className, namespace, assemblyName, fullClassName }
  for (const [fname, fobj] of filesMap.entries()) {
    for (const o of fobj.objs) {
      if (o.classID === 115) {
        const obuf = getObjBytes(fobj, o);
        let p = 0;
        const n = readAlignedString(obuf, p); p = n.p;
        const executionOrder = obuf.readInt32LE(p); p += 4;
        const propertiesHash = obuf.subarray(p, p + 16).toString('hex'); p += 16;
        const cn = readAlignedString(obuf, p); p = cn.p;
        const ns = readAlignedString(obuf, p); p = ns.p;
        const asm = readAlignedString(obuf, p); p = asm.p;
        const fullClassName = ns.str ? `${ns.str}.${cn.str}` : cn.str;
        monoScripts.set(`${fname}:${o.pathID}`, {
          sourceFile: fname,
          pathID: o.pathID,
          name: n.str,
          executionOrder,
          propertiesHash,
          className: cn.str,
          namespace: ns.str,
          assemblyName: asm.str,
          fullClassName
        });
      }
    }
  }
  console.log(`Parsed ${buildScenes.length} build scenes and ${monoScripts.size} MonoScript definitions.`);

  // --------------------------------------------------------------------------
  // Step C: Extract TextAssets (classID 49)
  // --------------------------------------------------------------------------
  const projectFileNames = ['globalgamemanagers', 'globalgamemanagers.assets', 'resources.assets'];
  for (let i = 0; i <= 53; i++) {
    projectFileNames.push(`level${i}`);
    projectFileNames.push(`sharedassets${i}.assets`);
  }

  const textAssetsCatalog = [];
  for (const fname of projectFileNames) {
    const fobj = filesMap.get(fname);
    for (const o of fobj.objs) {
      if (o.classID === 49) {
        const obuf = getObjBytes(fobj, o);
        const n = readAlignedString(obuf, 0);
        const scriptLen = obuf.readInt32LE(n.p);
        const scriptBytes = obuf.subarray(n.p + 4, n.p + 4 + scriptLen);
        const textStr = scriptBytes.toString('utf8');
        let ext = '.txt';
        if (textStr.trim().startsWith('{') || textStr.trim().startsWith('[')) ext = '.json';
        else if (textStr.includes('local ') || textStr.includes('function(')) ext = '.lua';

        const outFileName = `${sanitizeFileName(n.str)}${ext}`;
        const outPath = path.join(DIRS.text_assets, outFileName);
        fs.writeFileSync(outPath, scriptBytes);
        const key = `${fname}:${o.pathID}`;
        textAssetsCatalog.push({
          name: n.str,
          sourceFile: fname,
          pathID: o.pathID,
          resourcePaths: resourcePathsMap.get(key) || [],
          byteLength: scriptLen,
          extension: ext,
          extractedFile: `text_assets/${outFileName}`,
          sha256: crypto.createHash('sha256').update(scriptBytes).digest('hex')
        });
      }
    }
  }
  fs.writeFileSync(path.join(OUT_DIR, 'text_assets_catalog.json'), JSON.stringify(textAssetsCatalog, null, 2));
  console.log(`Extracted ${textAssetsCatalog.length} TextAssets.`);

  // --------------------------------------------------------------------------
  // Step D: Extract Fonts (classID 128)
  // --------------------------------------------------------------------------
  const fontsCatalog = [];
  const usedFontFileNames = new Set();
  const fontLookup = new Map(); // "file:pathID" -> fontCatalogEntry

  // Also register default Arial font
  fontLookup.set('Resources/unity_default_resources:10102', {
    name: 'Arial',
    sourceFile: 'Resources/unity_default_resources',
    pathID: 10102,
    format: 'BuiltIn-Font'
  });

  for (const fname of projectFileNames) {
    const fobj = filesMap.get(fname);
    for (const o of fobj.objs) {
      if (o.classID === 128) {
        const obuf = getObjBytes(fobj, o);
        let q = 0;
        const n = readAlignedString(obuf, q); q = n.p;
        const lineSpacing = obuf.readFloatLE(q);
        const fontSize = obuf.readFloatLE(q + 16);
        q += 52;
        const charRectCount = obuf.readInt32LE(q); q += 4 + charRectCount * 44;
        const kernCount = obuf.readInt32LE(q); q += 4 + kernCount * 8;
        const pixelScale = obuf.readFloatLE(q); q += 4;
        const fontDataSize = obuf.readInt32LE(q); q += 4;
        const fontBytes = obuf.subarray(q, q + fontDataSize);
        const magicAscii = fontBytes.subarray(0, 4).toString('ascii');
        const ext = magicAscii === 'OTTO' ? '.otf' : '.ttf';

        let outFileName = `${sanitizeFileName(n.str)}${ext}`;
        if (usedFontFileNames.has(outFileName.toLowerCase())) {
          outFileName = `${sanitizeFileName(n.str)}__${fname.replace('.assets', '')}_${o.pathID}${ext}`;
        }
        usedFontFileNames.add(outFileName.toLowerCase());

        const outPath = path.join(DIRS.fonts, outFileName);
        fs.writeFileSync(outPath, fontBytes);

        const entry = {
          name: n.str,
          sourceFile: fname,
          pathID: o.pathID,
          format: ext === '.otf' ? 'OpenType (OTTO/CFF)' : 'TrueType (TTF)',
          extension: ext,
          fontSize,
          lineSpacing,
          kerningPairsCount: kernCount,
          byteLength: fontDataSize,
          extractedFile: `fonts/${outFileName}`,
          sha256: crypto.createHash('sha256').update(fontBytes).digest('hex')
        };
        fontsCatalog.push(entry);
        fontLookup.set(`${fname}:${o.pathID}`, entry);
      }
    }
  }
  fs.writeFileSync(path.join(OUT_DIR, 'fonts_catalog.json'), JSON.stringify(fontsCatalog, null, 2));
  console.log(`Extracted ${fontsCatalog.length} Fonts.`);

  // --------------------------------------------------------------------------
  // Step E: Extract AudioClips (classID 83) from .resource streams
  // --------------------------------------------------------------------------
  const audioCatalog = [];
  const usedAudioFileNames = new Set();
  const audioLookup = new Map(); // "file:pathID" -> audioCatalogEntry
  const resourceBufCache = new Map();

  function getResourceBuf(resName) {
    const base = path.basename(resName);
    if (!resourceBufCache.has(base)) {
      const p = path.join(UNPACKED_DIR, base);
      resourceBufCache.set(base, fs.existsSync(p) ? fs.readFileSync(p) : null);
    }
    return resourceBufCache.get(base);
  }

  for (const fname of projectFileNames) {
    const fobj = filesMap.get(fname);
    for (const o of fobj.objs) {
      if (o.classID === 83) {
        const obuf = getObjBytes(fobj, o);
        const n = readAlignedString(obuf, 0);
        let p = n.p;
        const loadType = obuf.readInt32LE(p);
        const channels = obuf.readInt32LE(p + 4);
        const frequency = obuf.readInt32LE(p + 8);
        const bitsPerSample = obuf.readInt32LE(p + 12);
        const lengthSeconds = Number(obuf.readFloatLE(p + 16).toFixed(4));
        p += 32;
        const resSourceObj = readAlignedString(obuf, p);
        p = resSourceObj.p;
        const resOffset = Number(obuf.readBigUInt64LE(p));
        const resSize = Number(obuf.readBigUInt64LE(p + 8));
        const compressionFormat = obuf.readInt32LE(p + 16);

        const resBuf = getResourceBuf(resSourceObj.str);
        const clipBytes = resBuf.subarray(resOffset, resOffset + resSize);
        const containerBrand = clipBytes.length >= 12 ? clipBytes.subarray(4, 12).toString('ascii') : 'unknown';

        let outFileName = `${sanitizeFileName(n.str)}.m4a`;
        if (usedAudioFileNames.has(outFileName.toLowerCase())) {
          outFileName = `${sanitizeFileName(n.str)}__${fname.replace('.assets', '')}_${o.pathID}.m4a`;
        }
        usedAudioFileNames.add(outFileName.toLowerCase());

        const outPath = path.join(DIRS.audio, outFileName);
        fs.writeFileSync(outPath, clipBytes);

        const key = `${fname}:${o.pathID}`;
        const entry = {
          name: n.str,
          sourceFile: fname,
          pathID: o.pathID,
          resourcePaths: resourcePathsMap.get(key) || [],
          channels,
          frequency,
          bitsPerSample,
          lengthSeconds,
          compressionFormat,
          compressionFormatName: compressionFormat === 7 ? 'AAC (MP4/M4A ftypmp42)' : `Format_${compressionFormat}`,
          containerBrand,
          streamResource: path.basename(resSourceObj.str),
          streamOffset: resOffset,
          streamSize: resSize,
          extractedFile: `audio/${outFileName}`,
          sha256: crypto.createHash('sha256').update(clipBytes).digest('hex')
        };
        audioCatalog.push(entry);
        audioLookup.set(key, entry);
      }
    }
  }
  fs.writeFileSync(path.join(OUT_DIR, 'audio_catalog.json'), JSON.stringify(audioCatalog, null, 2));
  console.log(`Extracted ${audioCatalog.length} AudioClips.`);

  // --------------------------------------------------------------------------
  // Step F: Extract Texture2D (classID 28) & Decode RGBA for Sprite Cropping
  // --------------------------------------------------------------------------
  const texturesCatalog = [];
  const usedTextureFileNames = new Set();
  const decodedTexturesMap = new Map(); // "file:pathID" -> { entry, rgbaTopDown }

  for (const fname of projectFileNames) {
    const fobj = filesMap.get(fname);
    for (const o of fobj.objs) {
      if (o.classID === 28) {
        const obuf = getObjBytes(fobj, o);
        const n = readAlignedString(obuf, 0);
        const p = n.p;
        const width = obuf.readInt32LE(p + 8);
        const height = obuf.readInt32LE(p + 12);
        const completeImageSize = obuf.readInt32LE(p + 16);
        const format = obuf.readInt32LE(p + 20);
        const mipCount = obuf.readInt32LE(p + 24);
        const dataLen = obuf.readInt32LE(p + 72);
        const key = `${fname}:${o.pathID}`;

        if (width === 0 || height === 0 || dataLen === 0) {
          const entry = {
            name: n.str,
            sourceFile: fname,
            pathID: o.pathID,
            width,
            height,
            format,
            formatName: FORMAT_NAMES[format] || `Format_${format}`,
            mipCount,
            rawByteLength: dataLen,
            isDynamicFontPlaceholder: true,
            extractedFile: null
          };
          texturesCatalog.push(entry);
          continue;
        }

        const rawTexData = obuf.subarray(p + 76, p + 76 + dataLen);
        const rgbaTopDown = decodeTexture2D(width, height, format, rawTexData);
        const pngBuf = encodeRGBAtoPNG(width, height, rgbaTopDown);

        let outFileName = `${sanitizeFileName(n.str)}.png`;
        if (usedTextureFileNames.has(outFileName.toLowerCase())) {
          outFileName = `${sanitizeFileName(n.str)}__${fname.replace('.assets', '')}_${o.pathID}.png`;
        }
        usedTextureFileNames.add(outFileName.toLowerCase());

        const outPath = path.join(DIRS.textures, outFileName);
        fs.writeFileSync(outPath, pngBuf);

        const entry = {
          name: n.str,
          sourceFile: fname,
          pathID: o.pathID,
          resourcePaths: resourcePathsMap.get(key) || [],
          width,
          height,
          format,
          formatName: FORMAT_NAMES[format] || `Format_${format}`,
          mipCount,
          rawByteLength: dataLen,
          pngByteLength: pngBuf.length,
          isDynamicFontPlaceholder: false,
          extractedFile: `textures/${outFileName}`,
          sha256: crypto.createHash('sha256').update(pngBuf).digest('hex')
        };
        texturesCatalog.push(entry);
        decodedTexturesMap.set(key, { entry, rgbaTopDown });
      }
    }
  }
  fs.writeFileSync(path.join(OUT_DIR, 'textures_catalog.json'), JSON.stringify(texturesCatalog, null, 2));
  console.log(`Extracted ${decodedTexturesMap.size} PNG textures (${texturesCatalog.length} total Texture2D objects).`);

  // --------------------------------------------------------------------------
  // Step G: Extract & Crop Sprites (classID 213)
  // --------------------------------------------------------------------------
  const spritesCatalog = [];
  const usedSpriteFileNames = new Set();
  const spriteLookup = new Map(); // "file:pathID" -> spriteCatalogEntry

  for (const fname of projectFileNames) {
    const fobj = filesMap.get(fname);
    for (const o of fobj.objs) {
      if (o.classID === 213) {
        const obuf = getObjBytes(fobj, o);
        const n = readAlignedString(obuf, 0);
        let p = n.p;
        const rect = {
          x: Number(obuf.readFloatLE(p).toFixed(2)),
          y: Number(obuf.readFloatLE(p + 4).toFixed(2)),
          width: Number(obuf.readFloatLE(p + 8).toFixed(2)),
          height: Number(obuf.readFloatLE(p + 12).toFixed(2))
        };
        const offset = {
          x: Number(obuf.readFloatLE(p + 16).toFixed(2)),
          y: Number(obuf.readFloatLE(p + 20).toFixed(2))
        };
        const border = {
          x: Number(obuf.readFloatLE(p + 24).toFixed(2)),
          y: Number(obuf.readFloatLE(p + 28).toFixed(2)),
          z: Number(obuf.readFloatLE(p + 32).toFixed(2)),
          w: Number(obuf.readFloatLE(p + 36).toFixed(2))
        };
        const pixelsToUnits = Number(obuf.readFloatLE(p + 40).toFixed(2));
        const pivot = {
          x: Number(obuf.readFloatLE(p + 44).toFixed(4)),
          y: Number(obuf.readFloatLE(p + 48).toFixed(4))
        };
        p += 84;
        const tagCount = obuf.readInt32LE(p); p += 4;
        for (let t = 0; t < tagCount; t++) {
          p = readAlignedString(obuf, p).p;
        }
        p += 12; // m_SpriteAtlas PPtr
        const texFileID = obuf.readInt32LE(p);
        const texPathID = Number(obuf.readBigInt64LE(p + 4));
        const resolvedTex = resolvePPtr(fobj, texFileID, texPathID);
        const texKey = resolvedTex ? `${resolvedTex.file}:${resolvedTex.pathID}` : null;
        const parentTex = texKey ? decodedTexturesMap.get(texKey) : null;

        let outFileName = `${sanitizeFileName(n.str)}.png`;
        if (usedSpriteFileNames.has(outFileName.toLowerCase())) {
          outFileName = `${sanitizeFileName(n.str)}__${fname.replace('.assets', '')}_${o.pathID}.png`;
        }
        usedSpriteFileNames.add(outFileName.toLowerCase());

        let pngBuf = null;
        let croppedDims = { width: Math.round(rect.width), height: Math.round(rect.height) };
        if (parentTex) {
          const cropped = cropSpriteFromTopDownRGBA(
            parentTex.entry.width,
            parentTex.entry.height,
            parentTex.rgbaTopDown,
            rect.x,
            rect.y,
            rect.width,
            rect.height
          );
          croppedDims = { width: cropped.width, height: cropped.height };
          pngBuf = encodeRGBAtoPNG(cropped.width, cropped.height, cropped.rgba);
          fs.writeFileSync(path.join(DIRS.sprites, outFileName), pngBuf);
        }

        const key = `${fname}:${o.pathID}`;
        const entry = {
          name: n.str,
          sourceFile: fname,
          pathID: o.pathID,
          resourcePaths: resourcePathsMap.get(key) || [],
          rect,
          croppedWidth: croppedDims.width,
          croppedHeight: croppedDims.height,
          pivot,
          pixelsToUnits,
          border,
          offset,
          textureSourceFile: resolvedTex?.file || null,
          texturePathID: resolvedTex?.pathID || null,
          textureName: parentTex?.entry.name || null,
          textureExtractedFile: parentTex?.entry.extractedFile || null,
          extractedFile: pngBuf ? `sprites/${outFileName}` : null,
          pngByteLength: pngBuf ? pngBuf.length : 0,
          sha256: pngBuf ? crypto.createHash('sha256').update(pngBuf).digest('hex') : null
        };
        spritesCatalog.push(entry);
        spriteLookup.set(key, entry);
      }
    }
  }
  fs.writeFileSync(path.join(OUT_DIR, 'sprites_catalog.json'), JSON.stringify(spritesCatalog, null, 2));
  console.log(`Extracted and cropped ${spritesCatalog.length} Sprites.`);

  // --------------------------------------------------------------------------
  // Step H: Parse All 54 Scenes (level0 .. level53) & Build Scene Hierarchies
  // --------------------------------------------------------------------------
  const scenesSummaryIndex = [];
  const allPopQuizzes = [];
  const allFungusDialogues = [];

  for (const sceneInfo of buildScenes) {
    const lvlFileObj = filesMap.get(sceneInfo.levelFile);
    const sharedFileObj = filesMap.get(sceneInfo.sharedAssetsFile);
    const resFileName = `sharedassets${sceneInfo.index}.resource`;
    const hasResourceStream = fs.existsSync(path.join(UNPACKED_DIR, resFileName));

    // Count classes in levelN and sharedassetsN
    const levelClassCounts = {};
    for (const o of lvlFileObj.objs) {
      const cname = CLASS_ID_NAMES[o.classID] || `Class_${o.classID}`;
      levelClassCounts[cname] = (levelClassCounts[cname] || 0) + 1;
    }
    const sharedClassCounts = {};
    for (const o of sharedFileObj.objs) {
      const cname = CLASS_ID_NAMES[o.classID] || `Class_${o.classID}`;
      sharedClassCounts[cname] = (sharedClassCounts[cname] || 0) + 1;
    }

    // 1. Parse all GameObjects (classID 1)
    const gameObjects = new Map(); // pathID -> { pathID, name, layer, tag, isActive, componentPPtrs, transformId, components: [] }
    for (const o of lvlFileObj.objs) {
      if (o.classID === 1) {
        const obuf = getObjBytes(lvlFileObj, o);
        let p = 0;
        const compCount = obuf.readInt32LE(p); p += 4;
        const compPPtrs = [];
        for (let c = 0; c < compCount; c++) {
          const fID = obuf.readInt32LE(p);
          const pID = Number(obuf.readBigInt64LE(p + 4));
          p += 12;
          compPPtrs.push({ fileID: fID, pathID: pID });
        }
        const layer = obuf.readInt32LE(p); p += 4;
        const nameObj = readAlignedString(obuf, p);
        // Note: m_Name in GameObject is NOT padded before m_Tag in some versions, wait:
        // Let's read m_Name exact length:
        const nameLen = obuf.readInt32LE(p);
        const nameStr = obuf.subarray(p + 4, p + 4 + nameLen).toString('utf8');
        const tagOffset = p + 4 + nameLen;
        const tag = tagOffset + 2 <= obuf.length ? obuf.readUInt16LE(tagOffset) : 0;
        const isActive = tagOffset + 3 <= obuf.length ? Boolean(obuf[tagOffset + 2]) : true;

        gameObjects.set(o.pathID, {
          pathID: o.pathID,
          name: nameStr,
          layer,
          tag,
          isActive,
          componentPPtrs: compPPtrs,
          transform: null,
          components: []
        });
      }
    }

    // 2. Parse all Transforms (4) and RectTransforms (224)
    const transforms = new Map(); // pathID -> transformObj
    for (const o of lvlFileObj.objs) {
      if (o.classID === 4 || o.classID === 224) {
        const obuf = getObjBytes(lvlFileObj, o);
        let p = 0;
        const goFileID = obuf.readInt32LE(p);
        const goPathID = Number(obuf.readBigInt64LE(p + 4)); p += 12;
        const localRotation = [
          Number(obuf.readFloatLE(p).toFixed(4)),
          Number(obuf.readFloatLE(p + 4).toFixed(4)),
          Number(obuf.readFloatLE(p + 8).toFixed(4)),
          Number(obuf.readFloatLE(p + 12).toFixed(4))
        ]; p += 16;
        const localPosition = [
          Number(obuf.readFloatLE(p).toFixed(3)),
          Number(obuf.readFloatLE(p + 4).toFixed(3)),
          Number(obuf.readFloatLE(p + 8).toFixed(3))
        ]; p += 12;
        const localScale = [
          Number(obuf.readFloatLE(p).toFixed(3)),
          Number(obuf.readFloatLE(p + 4).toFixed(3)),
          Number(obuf.readFloatLE(p + 8).toFixed(3))
        ]; p += 12;
        const childCount = obuf.readInt32LE(p); p += 4;
        const childrenIds = [];
        for (let c = 0; c < childCount; c++) {
          const cfID = obuf.readInt32LE(p);
          const cpID = Number(obuf.readBigInt64LE(p + 4)); p += 12;
          if (cfID === 0 && cpID !== 0) childrenIds.push(cpID);
        }
        const fatherFileID = obuf.readInt32LE(p);
        const fatherPathID = Number(obuf.readBigInt64LE(p + 4)); p += 12;

        const trObj = {
          pathID: o.pathID,
          type: o.classID === 224 ? 'RectTransform' : 'Transform',
          gameObjectPathID: goPathID,
          fatherTransformPathID: fatherFileID === 0 ? fatherPathID : 0,
          childrenTransformPathIDs: childrenIds,
          localPosition,
          localRotation,
          localScale
        };

        if (o.classID === 224 && p + 40 <= obuf.length) {
          trObj.anchorMin = [Number(obuf.readFloatLE(p).toFixed(3)), Number(obuf.readFloatLE(p + 4).toFixed(3))];
          trObj.anchorMax = [Number(obuf.readFloatLE(p + 8).toFixed(3)), Number(obuf.readFloatLE(p + 12).toFixed(3))];
          trObj.anchoredPosition = [Number(obuf.readFloatLE(p + 16).toFixed(3)), Number(obuf.readFloatLE(p + 20).toFixed(3))];
          trObj.sizeDelta = [Number(obuf.readFloatLE(p + 24).toFixed(3)), Number(obuf.readFloatLE(p + 28).toFixed(3))];
          trObj.pivot = [Number(obuf.readFloatLE(p + 32).toFixed(3)), Number(obuf.readFloatLE(p + 36).toFixed(3))];
        }

        transforms.set(o.pathID, trObj);
        const go = gameObjects.get(goPathID);
        if (go) go.transform = trObj;
      }
    }

    // Helper to compute full GameObject hierarchy path
    function getHierarchyPath(goPathID) {
      const parts = [];
      let curGo = gameObjects.get(goPathID);
      let guard = 0;
      while (curGo && guard++ < 64) {
        parts.unshift(curGo.name);
        const fatherTrId = curGo.transform?.fatherTransformPathID || 0;
        if (!fatherTrId) break;
        const fatherTr = transforms.get(fatherTrId);
        if (!fatherTr) break;
        curGo = gameObjects.get(fatherTr.gameObjectPathID);
      }
      return parts.join('/');
    }

    // 3. Parse Scene Components (SpriteRenderer, AudioSource, Camera, Canvas, MonoBehaviour)
    const uiTexts = [];
    const uiImages = [];
    const uiButtons = [];
    const spriteRenderers = [];
    const audioSources = [];
    const monoBehaviours = [];
    const scriptUsageCounts = {};

    for (const o of lvlFileObj.objs) {
      if (o.classID === 1 || o.classID === 4 || o.classID === 224) continue;
      const obuf = getObjBytes(lvlFileObj, o);

      if (o.classID === 212 && obuf.length >= 132) {
        // SpriteRenderer
        const goPathID = Number(obuf.readBigInt64LE(4));
        const enabled = Boolean(obuf[12]);
        const matCount = obuf.readInt32LE(56);
        const spOff = 60 + matCount * 12 + 40;
        let spriteEntry = null;
        let sortingLayer = 0;
        let sortingOrder = 0;
        if (spOff + 12 <= obuf.length) {
          sortingLayer = obuf.readInt16LE(spOff - 4);
          sortingOrder = obuf.readInt16LE(spOff - 2);
          const spFileID = obuf.readInt32LE(spOff);
          const spPathID = Number(obuf.readBigInt64LE(spOff + 4));
          const resolvedSp = resolvePPtr(lvlFileObj, spFileID, spPathID);
          if (resolvedSp) {
            spriteEntry = spriteLookup.get(`${resolvedSp.file}:${resolvedSp.pathID}`) || null;
          }
        }
        const go = gameObjects.get(goPathID);
        const srData = {
          componentPathID: o.pathID,
          type: 'SpriteRenderer',
          gameObjectPathID: goPathID,
          gameObjectName: go?.name || null,
          hierarchyPath: getHierarchyPath(goPathID),
          enabled,
          sortingLayer,
          sortingOrder,
          spriteName: spriteEntry?.name || null,
          spriteExtractedFile: spriteEntry?.extractedFile || null,
          textureName: spriteEntry?.textureName || null
        };
        spriteRenderers.push(srData);
        if (go) go.components.push(srData);
        continue;
      }

      if (o.classID === 82 && obuf.length >= 56) {
        // AudioSource
        const goPathID = Number(obuf.readBigInt64LE(4));
        const enabled = Boolean(obuf[12]);
        const clipFileID = obuf.readInt32LE(28);
        const clipPathID = Number(obuf.readBigInt64LE(32));
        const playOnAwake = Boolean(obuf[40]);
        const volume = Number(obuf.readFloatLE(44).toFixed(3));
        const pitch = Number(obuf.readFloatLE(48).toFixed(3));
        const loop = Boolean(obuf[52]);
        const resolvedClip = resolvePPtr(lvlFileObj, clipFileID, clipPathID);
        const clipEntry = resolvedClip ? (audioLookup.get(`${resolvedClip.file}:${resolvedClip.pathID}`) || null) : null;
        const go = gameObjects.get(goPathID);
        const asData = {
          componentPathID: o.pathID,
          type: 'AudioSource',
          gameObjectPathID: goPathID,
          gameObjectName: go?.name || null,
          hierarchyPath: getHierarchyPath(goPathID),
          enabled,
          audioClipName: clipEntry?.name || null,
          audioExtractedFile: clipEntry?.extractedFile || null,
          playOnAwake,
          loop,
          volume,
          pitch
        };
        audioSources.push(asData);
        if (go) go.components.push(asData);
        continue;
      }

      if (o.classID === 114 && obuf.length >= 32) {
        // MonoBehaviour
        const goFileID = obuf.readInt32LE(0);
        const goPathID = Number(obuf.readBigInt64LE(4));
        const enabled = Boolean(obuf[12]);
        const scriptFileID = obuf.readInt32LE(16);
        const scriptPathID = Number(obuf.readBigInt64LE(20));
        const mbNameObj = readAlignedString(obuf, 28);
        const resolvedScript = resolvePPtr(lvlFileObj, scriptFileID, scriptPathID);
        const ms = resolvedScript ? monoScripts.get(`${resolvedScript.file}:${resolvedScript.pathID}`) : null;
        const fullClass = ms ? ms.fullClassName : `UnknownScript_${scriptPathID}`;
        scriptUsageCounts[fullClass] = (scriptUsageCounts[fullClass] || 0) + 1;

        const go = gameObjects.get(goPathID);
        const hPath = goPathID ? getHierarchyPath(goPathID) : mbNameObj.str;
        const payload = obuf.subarray(mbNameObj.p);

        const mbRecord = {
          componentPathID: o.pathID,
          type: 'MonoBehaviour',
          scriptClass: fullClass,
          assemblyName: ms?.assemblyName || null,
          gameObjectPathID: goPathID,
          gameObjectName: go?.name || mbNameObj.str || null,
          hierarchyPath: hPath,
          enabled
        };

        // Specific parsers for UI.Text, UI.Image, UI.Button, Fungus.*, PopQuiz
        if (fullClass === 'UnityEngine.UI.Text') {
          try {
            let q = 28 + 4; // skip m_Material(12), m_Color(16), m_RaycastTarget(4) = 32
            const color = [
              Number(payload.readFloatLE(12).toFixed(3)),
              Number(payload.readFloatLE(16).toFixed(3)),
              Number(payload.readFloatLE(20).toFixed(3)),
              Number(payload.readFloatLE(24).toFixed(3))
            ];
            const cullCalls = payload.readInt32LE(q); q += 4;
            // CullStateChangedEvent calls are always 0 in standard UI
            if (cullCalls === 0) {
              q = readAlignedString(payload, q).p;
              const fontFileID = payload.readInt32LE(q);
              const fontPathID = Number(payload.readBigInt64LE(q + 4));
              const fontSize = payload.readInt32LE(q + 12);
              const fontStyle = payload.readInt32LE(q + 16);
              const alignment = payload.readInt32LE(q + 32);
              q += 52;
              const textObj = readAlignedString(payload, q);
              const resolvedFont = resolvePPtr(lvlFileObj, fontFileID, fontPathID);
              const fontEntry = resolvedFont ? fontLookup.get(`${resolvedFont.file}:${resolvedFont.pathID}`) : null;

              const textData = {
                componentPathID: o.pathID,
                gameObjectPathID: goPathID,
                gameObjectName: go?.name || null,
                hierarchyPath: hPath,
                text: textObj.str,
                fontName: fontEntry?.name || null,
                fontSize,
                fontStyle,
                alignment,
                color
              };
              uiTexts.push(textData);
              mbRecord.uiText = textData;
            }
          } catch {}
        } else if (fullClass === 'UnityEngine.UI.Image') {
          try {
            const color = [
              Number(payload.readFloatLE(12).toFixed(3)),
              Number(payload.readFloatLE(16).toFixed(3)),
              Number(payload.readFloatLE(20).toFixed(3)),
              Number(payload.readFloatLE(24).toFixed(3))
            ];
            let q = 32;
            const cullCalls = payload.readInt32LE(q); q += 4;
            if (cullCalls === 0) {
              q = readAlignedString(payload, q).p;
              const spFileID = payload.readInt32LE(q);
              const spPathID = Number(payload.readBigInt64LE(q + 4));
              const imageType = payload.readInt32LE(q + 24);
              const preserveAspect = Boolean(payload[q + 28]);
              const resolvedSp = resolvePPtr(lvlFileObj, spFileID, spPathID);
              const spEntry = resolvedSp ? spriteLookup.get(`${resolvedSp.file}:${resolvedSp.pathID}`) : null;
              const imgData = {
                componentPathID: o.pathID,
                gameObjectPathID: goPathID,
                gameObjectName: go?.name || null,
                hierarchyPath: hPath,
                spriteName: spEntry?.name || null,
                spriteExtractedFile: spEntry?.extractedFile || null,
                textureName: spEntry?.textureName || null,
                color,
                imageType,
                preserveAspect
              };
              uiImages.push(imgData);
              mbRecord.uiImage = imgData;
            }
          } catch {}
        } else if (fullClass === 'UnityEngine.UI.Button') {
          try {
            // Selectable header before m_OnClick:
            // m_Navigation (52B) + m_Transition (4B) + m_Colors (68B) + m_SpriteState (36B) = 160B
            let q = 160;
            // 4 animation trigger strings: Normal, Highlighted, Pressed, Disabled
            for (let t = 0; t < 4; t++) q = readAlignedString(payload, q).p;
            const interactable = Boolean(payload[q]); q += 4;
            const targetGraphicFileID = payload.readInt32LE(q);
            const targetGraphicPathID = Number(payload.readBigInt64LE(q + 4)); q += 12;
            const callCount = payload.readInt32LE(q); q += 4;
            const onClickCalls = [];
            for (let c = 0; c < callCount; c++) {
              const targetFileID = payload.readInt32LE(q);
              const targetPathID = Number(payload.readBigInt64LE(q + 4)); q += 12;
              const methodObj = readAlignedString(payload, q); q = methodObj.p;
              const mode = payload.readInt32LE(q); q += 4;
              const objArgFileID = payload.readInt32LE(q);
              const objArgPathID = Number(payload.readBigInt64LE(q + 4)); q += 12;
              const objArgTypeObj = readAlignedString(payload, q); q = objArgTypeObj.p;
              const intArg = payload.readInt32LE(q); q += 4;
              const floatArg = Number(payload.readFloatLE(q).toFixed(3)); q += 4;
              const strArgObj = readAlignedString(payload, q); q = strArgObj.p;
              const boolArg = Boolean(payload[q]); q += 4;
              const callState = payload.readInt32LE(q); q += 4;

              onClickCalls.push({
                targetFileID,
                targetPathID,
                methodName: methodObj.str,
                mode,
                intArgument: intArg,
                floatArgument: floatArg,
                stringArgument: strArgObj.str,
                boolArgument: boolArg,
                objectArgumentType: objArgTypeObj.str,
                objectArgumentPathID: objArgPathID
              });
            }
            const btnData = {
              componentPathID: o.pathID,
              gameObjectPathID: goPathID,
              gameObjectName: go?.name || null,
              hierarchyPath: hPath,
              interactable,
              targetGraphicPathID,
              onClickCalls
            };
            uiButtons.push(btnData);
            mbRecord.uiButton = btnData;
          } catch {}
        } else if (fullClass === 'Fungus.Say') {
          try {
            const itemId = payload.readInt32LE(0);
            const indentLevel = payload.readInt32LE(4);
            const storyObj = readAlignedString(payload, 8);
            const descObj = readAlignedString(payload, storyObj.p);
            const charFileID = payload.readInt32LE(descObj.p);
            const charPathID = Number(payload.readBigInt64LE(descObj.p + 4));
            const portFileID = payload.readInt32LE(descObj.p + 12);
            const portPathID = Number(payload.readBigInt64LE(descObj.p + 16));
            const voFileID = payload.readInt32LE(descObj.p + 24);
            const voPathID = Number(payload.readBigInt64LE(descObj.p + 28));
            const resolvedVo = resolvePPtr(lvlFileObj, voFileID, voPathID);
            const voEntry = resolvedVo ? audioLookup.get(`${resolvedVo.file}:${resolvedVo.pathID}`) : null;
            const resolvedPort = resolvePPtr(lvlFileObj, portFileID, portPathID);
            const portEntry = resolvedPort ? spriteLookup.get(`${resolvedPort.file}:${resolvedPort.pathID}`) : null;

            const sayData = {
              sceneIndex: sceneInfo.index,
              sceneName: sceneInfo.sceneName,
              componentPathID: o.pathID,
              itemId,
              characterComponentPathID: charPathID,
              storyText: storyObj.str,
              voiceOverClip: voEntry?.name || null,
              voiceOverFile: voEntry?.extractedFile || null,
              portraitSprite: portEntry?.name || null
            };
            mbRecord.fungusSay = sayData;
            allFungusDialogues.push(sayData);
          } catch {}
        } else if (fullClass === 'Fungus.Block') {
          try {
            const itemId = payload.readInt32LE(36);
            const blockNameObj = readAlignedString(payload, 40);
            const descObj = readAlignedString(payload, blockNameObj.p);
            const cmdCount = payload.readInt32LE(descObj.p + 12);
            const cmdIds = [];
            let cp = descObj.p + 16;
            for (let c = 0; c < cmdCount; c++) {
              cmdIds.push(Number(payload.readBigInt64LE(cp + 4)));
              cp += 12;
            }
            mbRecord.fungusBlock = {
              itemId,
              blockName: blockNameObj.str,
              description: descObj.str,
              commandPathIDs: cmdIds
            };
          } catch {}
        } else if (fullClass === 'Fungus.Character') {
          try {
            const charNameObj = readAlignedString(payload, 0);
            mbRecord.fungusCharacter = { nameText: charNameObj.str };
          } catch {}
        } else if (fullClass === 'PopQuiz') {
          try {
            let q = 0;
            const qCount = payload.readInt32LE(q); q += 4;
            const questions = [];
            for (let qi = 0; qi < qCount; qi++) {
              const qTextObj = readAlignedString(payload, q); q = qTextObj.p;
              const provinceId = payload.readInt32LE(q); q += 4;
              const isMultipleChoice = Boolean(payload.readInt32LE(q)); q += 4;
              const imgFileID = payload.readInt32LE(q);
              const imgPathID = Number(payload.readBigInt64LE(q + 4)); q += 12;
              const pointsOrCorrectCount = payload.readInt32LE(q); q += 4;
              const ansCount = payload.readInt32LE(q); q += 4;
              const answers = [];
              for (let ai = 0; ai < ansCount; ai++) {
                const aTextObj = readAlignedString(payload, q); q = aTextObj.p;
                const aSpFileID = payload.readInt32LE(q);
                const aSpPathID = Number(payload.readBigInt64LE(q + 4)); q += 12;
                const isCorrect = Boolean(payload.readInt32LE(q)); q += 4;
                answers.push({ text: aTextObj.str, isCorrect, spritePathID: aSpPathID });
              }
              const audFileID = payload.readInt32LE(q);
              const audPathID = Number(payload.readBigInt64LE(q + 4)); q += 12;
              const ctrlFileID = payload.readInt32LE(q);
              const ctrlPathID = Number(payload.readBigInt64LE(q + 4)); q += 12;

              const resolvedAud = resolvePPtr(lvlFileObj, audFileID, audPathID);
              const audEntry = resolvedAud ? audioLookup.get(`${resolvedAud.file}:${resolvedAud.pathID}`) : null;

              questions.push({
                questionText: qTextObj.str,
                provinceId,
                isMultipleChoice,
                pointsOrCorrectCount,
                audioClipName: audEntry?.name || null,
                audioExtractedFile: audEntry?.extractedFile || null,
                answers
              });
            }
            const quizData = {
              sceneIndex: sceneInfo.index,
              sceneName: sceneInfo.sceneName,
              gameObjectName: go?.name || null,
              hierarchyPath: hPath,
              componentPathID: o.pathID,
              questionCount: questions.length,
              questions
            };
            mbRecord.popQuiz = quizData;
            allPopQuizzes.push(quizData);
          } catch {}
        }

        monoBehaviours.push(mbRecord);
        if (go) go.components.push(mbRecord);
      } else {
        // Other component types (Camera, Canvas, Colliders, Rigidbody2D, Animator, etc.)
        if (obuf.length >= 12) {
          const goFileID = obuf.readInt32LE(0);
          const goPathID = Number(obuf.readBigInt64LE(4));
          const go = goFileID === 0 ? gameObjects.get(goPathID) : null;
          if (go) {
            go.components.push({
              componentPathID: o.pathID,
              type: CLASS_ID_NAMES[o.classID] || `Class_${o.classID}`
            });
          }
        }
      }
    }

    // Build recursive scene hierarchy tree starting from root Transforms (fatherTransformPathID === 0)
    function buildTreeNode(trObj) {
      const go = gameObjects.get(trObj.gameObjectPathID);
      return {
        gameObjectPathID: trObj.gameObjectPathID,
        transformPathID: trObj.pathID,
        name: go?.name || '(Unnamed)',
        isActive: go?.isActive ?? true,
        layer: go?.layer ?? 0,
        tag: go?.tag ?? 0,
        transformType: trObj.type,
        localPosition: trObj.localPosition,
        localRotation: trObj.localRotation,
        localScale: trObj.localScale,
        ...(trObj.type === 'RectTransform' ? {
          anchorMin: trObj.anchorMin,
          anchorMax: trObj.anchorMax,
          anchoredPosition: trObj.anchoredPosition,
          sizeDelta: trObj.sizeDelta,
          pivot: trObj.pivot
        } : {}),
        components: (go?.components || []).map(c => ({
          componentPathID: c.componentPathID,
          type: c.type,
          ...(c.scriptClass ? { scriptClass: c.scriptClass } : {}),
          ...(c.uiText ? { text: c.uiText.text, fontName: c.uiText.fontName, fontSize: c.uiText.fontSize } : {}),
          ...(c.uiImage ? { spriteName: c.uiImage.spriteName, spriteExtractedFile: c.uiImage.spriteExtractedFile } : {}),
          ...(c.uiButton ? { onClickCalls: c.uiButton.onClickCalls } : {}),
          ...(c.type === 'SpriteRenderer' ? { spriteName: c.spriteName, sortingOrder: c.sortingOrder } : {}),
          ...(c.type === 'AudioSource' ? { audioClipName: c.audioClipName, playOnAwake: c.playOnAwake, loop: c.loop } : {}),
          ...(c.fungusSay ? { fungusSay: c.fungusSay } : {}),
          ...(c.fungusBlock ? { fungusBlock: c.fungusBlock } : {}),
          ...(c.fungusCharacter ? { fungusCharacter: c.fungusCharacter } : {}),
          ...(c.popQuiz ? { popQuizQuestionCount: c.popQuiz.questionCount } : {})
        })),
        children: trObj.childrenTransformPathIDs
          .map(cid => transforms.get(cid))
          .filter(Boolean)
          .map(childTr => buildTreeNode(childTr))
      };
    }

    const rootTransforms = Array.from(transforms.values()).filter(t => t.fatherTransformPathID === 0);
    const hierarchyTree = rootTransforms.map(rt => buildTreeNode(rt));

    // Collect assets stored directly in sharedassetsN.assets
    const sceneTextures = texturesCatalog.filter(t => t.sourceFile === sceneInfo.sharedAssetsFile && !t.isDynamicFontPlaceholder);
    const sceneSprites = spritesCatalog.filter(s => s.sourceFile === sceneInfo.sharedAssetsFile);
    const sceneAudio = audioCatalog.filter(a => a.sourceFile === sceneInfo.sharedAssetsFile);
    const sceneFonts = fontsCatalog.filter(f => f.sourceFile === sceneInfo.sharedAssetsFile);

    const sceneDump = {
      sceneIndex: sceneInfo.index,
      levelFile: sceneInfo.levelFile,
      sharedAssetsFile: sceneInfo.sharedAssetsFile,
      resourceStreamFile: hasResourceStream ? resFileName : null,
      unityScenePath: sceneInfo.unityScenePath,
      sceneName: sceneInfo.sceneName,
      statistics: {
        gameObjectsCount: gameObjects.size,
        transformsCount: transforms.size,
        rootGameObjectsCount: hierarchyTree.length,
        uiTextsCount: uiTexts.length,
        uiImagesCount: uiImages.length,
        uiButtonsCount: uiButtons.length,
        spriteRenderersCount: spriteRenderers.length,
        audioSourcesCount: audioSources.length,
        monoBehavioursCount: monoBehaviours.length,
        sharedTexturesCount: sceneTextures.length,
        sharedSpritesCount: sceneSprites.length,
        sharedAudioClipsCount: sceneAudio.length,
        sharedFontsCount: sceneFonts.length
      },
      levelClassCounts,
      sharedClassCounts,
      scriptUsageCounts,
      uiTexts,
      uiImages,
      uiButtons,
      spriteRenderers,
      audioSources,
      hierarchyTree
    };

    const sceneJsonFileName = `level${sceneInfo.index}_${sanitizeFileName(sceneInfo.sceneName)}.json`;
    fs.writeFileSync(path.join(DIRS.scenes_hierarchy, sceneJsonFileName), JSON.stringify(sceneDump, null, 2));
    // Also write canonical levelN.json
    fs.writeFileSync(path.join(DIRS.scenes_hierarchy, `level${sceneInfo.index}.json`), JSON.stringify(sceneDump, null, 2));

    scenesSummaryIndex.push({
      sceneIndex: sceneInfo.index,
      levelFile: sceneInfo.levelFile,
      sharedAssetsFile: sceneInfo.sharedAssetsFile,
      resourceStreamFile: hasResourceStream ? resFileName : null,
      unityScenePath: sceneInfo.unityScenePath,
      sceneName: sceneInfo.sceneName,
      hierarchyJsonFile: `scenes_hierarchy/${sceneJsonFileName}`,
      canonicalJsonFile: `scenes_hierarchy/level${sceneInfo.index}.json`,
      statistics: sceneDump.statistics,
      customScripts: Object.keys(scriptUsageCounts).filter(
        k => !k.startsWith('UnityEngine.') && !k.startsWith('Fungus.') && !k.startsWith('Tiled2Unity.')
      )
    });
  }

  fs.writeFileSync(path.join(OUT_DIR, 'scenes_index.json'), JSON.stringify(scenesSummaryIndex, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'popquiz_database.json'), JSON.stringify(allPopQuizzes, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'fungus_dialogues.json'), JSON.stringify(allFungusDialogues, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'monoscripts_registry.json'), JSON.stringify(Array.from(monoScripts.values()), null, 2));

  console.log('=== EXTRACTION COMPLETE ===');
  console.log({
    scenesProcessed: scenesSummaryIndex.length,
    texturesExtracted: decodedTexturesMap.size,
    spritesExtracted: spritesCatalog.length,
    audioClipsExtracted: audioCatalog.length,
    fontsExtracted: fontsCatalog.length,
    textAssetsExtracted: textAssetsCatalog.length,
    popQuizBanksExtracted: allPopQuizzes.length,
    fungusSayLinesExtracted: allFungusDialogues.length
  });
}

main();
