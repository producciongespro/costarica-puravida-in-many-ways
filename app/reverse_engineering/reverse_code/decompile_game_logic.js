const fs = require('fs');
const path = require('path');

const UNPACKED_DIR = 'c:/xampp/htdocs/costa_rica_puravida_in_many_ways/app/reverse_engineering/unpacked_data';
const OUT_DIR = 'c:/xampp/htdocs/costa_rica_puravida_in_many_ways/app/reverse_engineering/reverse_code';

const meta = fs.readFileSync(path.join(UNPACKED_DIR, 'Il2CppData/Metadata/global-metadata.dat'));
const mem = fs.readFileSync(path.join(UNPACKED_DIR, 'build.mem'));
const asmText = fs.readFileSync(path.join(UNPACKED_DIR, 'build.asm.js'), 'utf8');
const classesJson = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'assembly_csharp_classes.json'), 'utf8'));
const literalsJson = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'string_literals.json'), 'utf8'));

const GLOBAL_BASE = 8;
const stringOffset = meta.readUInt32LE(24);
const stringCount = meta.readUInt32LE(28);
const methodsOffset = meta.readUInt32LE(48);
const methodsCount = meta.readUInt32LE(52);
const parametersOffset = meta.readUInt32LE(88);
const fieldsOffset = meta.readUInt32LE(96);
const typeDefsOffset = meta.readUInt32LE(160);
const numTypeDefs = meta.readUInt32LE(164) / 104;
const metadataUsageListsOffset = meta.readUInt32LE(192);
const metadataUsagePairsOffset = meta.readUInt32LE(200);
const fieldRefsOffset = meta.readUInt32LE(208);

const TYPES_TABLE_MEM_OFF = 555788 - GLOBAL_BASE;
const METHOD_POINTERS_MEM_OFF = 1611444 - GLOBAL_BASE;
const METADATA_USAGES_MEM_OFF = 1472412 - GLOBAL_BASE;
const METADATA_USAGES_COUNT = 22013;
const METHOD_SPECS_MEM_OFF = 1704764 - GLOBAL_BASE;

function readString(idx) {
  if (idx < 0 || idx >= stringCount) return '';
  let end = stringOffset + idx;
  while (end < meta.length && meta[end] !== 0) end++;
  return meta.toString('utf8', stringOffset + idx, end);
}

// 1. All TypeDefs basic names
const allTypeNames = [];
for (let i = 0; i < numTypeDefs; i++) {
  const base = typeDefsOffset + i * 104;
  const name = readString(meta.readInt32LE(base));
  const ns = readString(meta.readInt32LE(base + 4));
  allTypeNames.push(ns ? `${ns}.${name}` : name);
}

// 2. Map dynCall signatures and function tables
const dynMap = new Map();
const reDyn = /dynCall_([vfdii]+):([a-zA-Z0-9_$]+)/g;
let mDyn;
while ((mDyn = reDyn.exec(asmText)) !== null) {
  const sig = mDyn[1];
  const fn = mDyn[2];
  const fnIdx = asmText.indexOf('function ' + fn + '(');
  if (fnIdx !== -1) {
    const snippet = asmText.slice(fnIdx, fnIdx + 250);
    const tm = snippet.match(/([a-zA-Z0-9_$]+)\[a&\d+\]/);
    if (tm) dynMap.set(sig, tm[1]);
  }
}

const fnTables = new Map();
const reTbl = /var ([a-zA-Z0-9_$]+)=\[([a-zA-Z0-9_$,]+)\];/g;
let mTbl;
while ((mTbl = reTbl.exec(asmText)) !== null) {
  fnTables.set(mTbl[1], mTbl[2].split(','));
}

function getTypeInfoQuick(typeIdx) {
  const vaddr = mem.readUInt32LE(TYPES_TABLE_MEM_OFF + typeIdx * 4);
  const off = vaddr - GLOBAL_BASE;
  const signedData = mem.readInt32LE(off);
  const typeEnum = mem[off + 6];
  const byref = (mem[off + 7] & 0x40) !== 0;
  let char = 'i';
  if (!byref) {
    if (typeEnum === 1) char = 'v';
    else if (typeEnum === 12) char = 'f';
    else if (typeEnum === 13) char = 'd';
    else if (typeEnum === 10 || typeEnum === 11) char = 'ii';
  }
  let name = `Type_${typeEnum}`;
  if (typeEnum === 17 || typeEnum === 18) name = allTypeNames[signedData] || name;
  return { char, name, typeEnum, signedData };
}

// 3. Map ALL 25,761 methods -> asmFuncName
const numMethods = methodsCount / 56;
const allMethods = [];
const asmFuncToMethods = new Map();

for (let m = 0; m < numMethods; m++) {
  const base = methodsOffset + m * 56;
  const name = readString(meta.readInt32LE(base));
  const declType = meta.readInt32LE(base + 4);
  const retTypeIdx = meta.readInt32LE(base + 8);
  const paramStart = meta.readInt32LE(base + 12);
  const codeMethodIndex = meta.readInt32LE(base + 24);
  const flags = meta.readUInt16LE(base + 48);
  const paramCount = meta.readUInt16LE(base + 54);
  const isStatic = (flags & 0x0010) !== 0;

  let sig = getTypeInfoQuick(retTypeIdx).char + (isStatic ? '' : 'i');
  for (let p = 0; p < paramCount; p++) {
    const pTypeIdx = meta.readInt32LE(parametersOffset + (paramStart + p) * 16 + 12);
    sig += getTypeInfoQuick(pTypeIdx).char;
  }
  sig += 'i';

  let asmFuncName = null;
  if (codeMethodIndex >= 0 && codeMethodIndex < 23330) {
    const fnPtr = mem.readUInt32LE(METHOD_POINTERS_MEM_OFF + codeMethodIndex * 4);
    const tblName = dynMap.get(sig);
    if (tblName && fnTables.has(tblName)) {
      const tbl = fnTables.get(tblName);
      if (fnPtr >= 0 && fnPtr < tbl.length) asmFuncName = tbl[fnPtr];
    }
  }
  const fullName = `${allTypeNames[declType]}.${name}`;
  allMethods.push({ index: m, fullName, name, declType, asmFuncName });
  if (asmFuncName) {
    if (!asmFuncToMethods.has(asmFuncName)) asmFuncToMethods.set(asmFuncName, []);
    asmFuncToMethods.get(asmFuncName).push(fullName);
  }
}

// 4. Map metadataUsages: cIndex (vaddr >> 2) -> resolved description
const cIndexToUsage = new Map();
const destIdxToCIndex = new Map();
for (let i = 0; i < METADATA_USAGES_COUNT; i++) {
  const vaddr = mem.readUInt32LE(METADATA_USAGES_MEM_OFF + i * 4);
  destIdxToCIndex.set(i, vaddr >> 2);
}

const numPairs = meta.readUInt32LE(204) / 8;
for (let i = 0; i < numPairs; i++) {
  const base = metadataUsagePairsOffset + i * 8;
  const destIdx = meta.readUInt32LE(base);
  const enc = meta.readUInt32LE(base + 4);
  const kind = enc >>> 29;
  const idx = enc & 0x1FFFFFFF;
  const cIdx = destIdxToCIndex.get(destIdx);
  if (!cIdx) continue;

  let desc = '';
  if (kind === 1 || kind === 2) {
    desc = `[Type: ${getTypeInfoQuick(idx).name}]`;
  } else if (kind === 3) {
    desc = `[Method: ${allMethods[idx] ? allMethods[idx].fullName : idx}]`;
  } else if (kind === 4) {
    const frBase = fieldRefsOffset + idx * 8;
    const tIdx = meta.readInt32LE(frBase);
    const fOff = meta.readInt32LE(frBase + 4);
    const tInfo = getTypeInfoQuick(tIdx);
    let fName = `field_${fOff}`;
    if (tInfo.typeEnum === 17 || tInfo.typeEnum === 18) {
      const tdBase = typeDefsOffset + tInfo.signedData * 104;
      const fStart = meta.readInt32LE(tdBase + 48);
      const fIdx = fStart + fOff;
      fName = readString(meta.readInt32LE(fieldsOffset + fIdx * 16));
    }
    desc = `[Field: ${tInfo.name}.${fName}]`;
  } else if (kind === 5) {
    const lit = literalsJson.literals[idx];
    desc = `STR_${idx}:${JSON.stringify(lit ? lit.value : '')}`;
  } else if (kind === 6) {
    // Il2CppMethodSpec (12 bytes in build.mem: methodDefinitionIndex, classIndexIndex, methodIndexIndex)
    const msOff = METHOD_SPECS_MEM_OFF + idx * 12;
    const mDefIdx = mem.readInt32LE(msOff);
    desc = `[GenericMethod: ${allMethods[mDefIdx] ? allMethods[mDefIdx].fullName : mDefIdx}]`;
  }
  cIndexToUsage.set(cIdx, desc);
}

// 5. Extract and symbolicate all custom game classes (excluding Fungus, DG.Tweening, Tiled2Unity, EpicToonFX, UnityStandardAssets)
const skipPrefixes = ['Fungus.', 'DG.Tweening', 'Tiled2Unity.', 'EpicToonFX.', 'UnityStandardAssets.'];
const customClasses = classesJson.classes.filter(c => {
  if (c.name === '<Module>') return false;
  for (const p of skipPrefixes) {
    if (c.fullName.startsWith(p)) return false;
  }
  return true;
});

console.log(`Found ${customClasses.length} custom game classes (including nested coroutines/types).`);

function extractAsmFunctionBody(fnName) {
  if (!fnName) return null;
  const marker = `function ${fnName}(`;
  const start = asmText.indexOf(marker);
  if (start === -1) return null;
  let depth = 0;
  let i = asmText.indexOf('{', start);
  if (i === -1) return null;
  for (; i < asmText.length; i++) {
    const ch = asmText[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return asmText.slice(start, i + 1);
      }
    }
  }
  return null;
}

function symbolicateAsmBody(body, cls) {
  if (!body) return '';
  const fieldByOffset = new Map();
  for (const f of cls.fields) {
    if (f.offsetBytes >= 0) fieldByOffset.set(f.offsetBytes, `${f.name}/*${f.type}*/`);
  }

  const usedStrings = [];
  const calledMethods = new Set();

  // Annotate c[NUMBER] metadata usages
  let annotated = body.replace(/c\[(\d+)\]/g, (match, numStr) => {
    const cIdx = Number(numStr);
    if (cIndexToUsage.has(cIdx)) {
      const u = cIndexToUsage.get(cIdx);
      if (u.startsWith('STR_')) usedStrings.push(u);
      return `c[${cIdx}/*${u}*/]`;
    }
    return match;
  });

  // Annotate field accesses on first parameter or local pointers (+OFFSET>>2 or +OFFSET>>0)
  annotated = annotated.replace(/\+(\d+)>>(2|0|1)/g, (match, offStr, shift) => {
    const off = Number(offStr);
    if (fieldByOffset.has(off)) {
      return `+${off}/*this.${fieldByOffset.get(off)}*/>>${shift}`;
    }
    return match;
  });

  // Annotate direct function calls
  annotated = annotated.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\(/g, (match, fn) => {
    if (fn === 'function' || fn === 'if' || fn === 'while' || fn === 'for' || fn === 'switch' || fn === 'return' || fn === 'X') {
      return match;
    }
    if (asmFuncToMethods.has(fn)) {
      const names = asmFuncToMethods.get(fn);
      const label = names.length <= 3 ? names.join('|') : `${names[0]} (+${names.length - 1})`;
      calledMethods.add(label);
      return `${fn}/*${label}*/(`;
    }
    return match;
  });

  return { annotated, usedStrings, calledMethods: Array.from(calledMethods) };
}

const decompiledLines = [];
for (const cls of customClasses) {
  decompiledLines.push(`================================================================================`);
  decompiledLines.push(`CLASS: ${cls.fullName} (TypeDefIndex: ${cls.typeDefIndex}, Image: ${cls.image})`);
  decompiledLines.push(`Parent: ${cls.parent || 'none'}`);
  if (cls.fields.length > 0) {
    decompiledLines.push(`Fields:`);
    for (const f of cls.fields) {
      const def = f.defaultValue !== undefined ? ` = ${JSON.stringify(f.defaultValue)}` : '';
      decompiledLines.push(`  [${f.offset || 'static'}] ${f.modifiers} ${f.type} ${f.name}${def}`);
    }
  }
  decompiledLines.push(`Methods:`);
  for (const m of cls.methods) {
    const pStr = m.parameters.map(p => `${p.type} ${p.name}`).join(', ');
    decompiledLines.push(`  ------------------------------------------------------------------------------`);
    decompiledLines.push(`  METHOD: ${m.modifiers} ${m.returnType} ${m.name}(${pStr}) [asm: ${m.asmFuncName || 'none'}, fnPtr: ${m.fnPtr}]`);
    const rawBody = extractAsmFunctionBody(m.asmFuncName);
    if (rawBody) {
      const sym = symbolicateAsmBody(rawBody, cls);
      if (sym.usedStrings.length > 0) {
        decompiledLines.push(`  Strings Used: ${sym.usedStrings.join(', ')}`);
      }
      if (sym.calledMethods.length > 0) {
        decompiledLines.push(`  Calls: ${sym.calledMethods.join(', ')}`);
      }
      decompiledLines.push(`  ASM Body:`);
      decompiledLines.push(`    ${sym.annotated}`);
    }
  }
  decompiledLines.push('');
}

fs.writeFileSync(path.join(OUT_DIR, 'decompiled_custom_classes.txt'), decompiledLines.join('\n'), 'utf8');
console.log(`Wrote decompiled_custom_classes.txt (${decompiledLines.length} lines).`);
