const fs = require('fs');
const path = require('path');

const UNPACKED_DIR = 'c:/xampp/htdocs/costa_rica_puravida_in_many_ways/app/reverse_engineering/unpacked_data';
const OUT_DIR = 'c:/xampp/htdocs/costa_rica_puravida_in_many_ways/app/reverse_engineering/reverse_code';

const metaPath = path.join(UNPACKED_DIR, 'Il2CppData/Metadata/global-metadata.dat');
const memPath = path.join(UNPACKED_DIR, 'build.mem');
const asmPath = path.join(UNPACKED_DIR, 'build.asm.js');
const uiEventsPath = path.join(UNPACKED_DIR, 'methods_pointedto_by_uievents.xml');
const preservedPath = path.join(UNPACKED_DIR, 'preserved_derived_types.xml');

console.log('Loading global-metadata.dat and build.mem...');
const meta = fs.readFileSync(metaPath);
const mem = fs.readFileSync(memPath);
const GLOBAL_BASE = 8; // From build.framework.js: STATIC_BASE=8

// 1. Parse Il2CppGlobalMetadataHeader (Version 24)
const header = {
  sanity: meta.readUInt32LE(0),
  version: meta.readInt32LE(4),
  stringLiteralOffset: meta.readUInt32LE(8),
  stringLiteralCount: meta.readUInt32LE(12),
  stringLiteralDataOffset: meta.readUInt32LE(16),
  stringLiteralDataCount: meta.readUInt32LE(20),
  stringOffset: meta.readUInt32LE(24),
  stringCount: meta.readUInt32LE(28),
  eventsOffset: meta.readUInt32LE(32),
  eventsCount: meta.readUInt32LE(36),
  propertiesOffset: meta.readUInt32LE(40),
  propertiesCount: meta.readUInt32LE(44),
  methodsOffset: meta.readUInt32LE(48),
  methodsCount: meta.readUInt32LE(52),
  parameterDefaultValuesOffset: meta.readUInt32LE(56),
  parameterDefaultValuesCount: meta.readUInt32LE(60),
  fieldDefaultValuesOffset: meta.readUInt32LE(64),
  fieldDefaultValuesCount: meta.readUInt32LE(68),
  fieldAndParameterDefaultValueDataOffset: meta.readUInt32LE(72),
  fieldAndParameterDefaultValueDataCount: meta.readUInt32LE(76),
  fieldMarshaledSizesOffset: meta.readUInt32LE(80),
  fieldMarshaledSizesCount: meta.readUInt32LE(84),
  parametersOffset: meta.readUInt32LE(88),
  parametersCount: meta.readUInt32LE(92),
  fieldsOffset: meta.readUInt32LE(96),
  fieldsCount: meta.readUInt32LE(100),
  genericParametersOffset: meta.readUInt32LE(104),
  genericParametersCount: meta.readUInt32LE(108),
  genericParameterConstraintsOffset: meta.readUInt32LE(112),
  genericParameterConstraintsCount: meta.readUInt32LE(116),
  genericContainersOffset: meta.readUInt32LE(120),
  genericContainersCount: meta.readUInt32LE(124),
  nestedTypesOffset: meta.readUInt32LE(128),
  nestedTypesCount: meta.readUInt32LE(132),
  interfacesOffset: meta.readUInt32LE(136),
  interfacesCount: meta.readUInt32LE(140),
  vtableMethodsOffset: meta.readUInt32LE(144),
  vtableMethodsCount: meta.readUInt32LE(148),
  interfaceOffsetsOffset: meta.readUInt32LE(152),
  interfaceOffsetsCount: meta.readUInt32LE(156),
  typeDefinitionsOffset: meta.readUInt32LE(160),
  typeDefinitionsCount: meta.readUInt32LE(164),
  rgctxEntriesOffset: meta.readUInt32LE(168),
  rgctxEntriesCount: meta.readUInt32LE(172),
  imagesOffset: meta.readUInt32LE(176),
  imagesCount: meta.readUInt32LE(180),
  assembliesOffset: meta.readUInt32LE(184),
  assembliesCount: meta.readUInt32LE(188),
  metadataUsageListsOffset: meta.readUInt32LE(192),
  metadataUsageListsCount: meta.readUInt32LE(196),
  metadataUsagePairsOffset: meta.readUInt32LE(200),
  metadataUsagePairsCount: meta.readUInt32LE(204),
  fieldRefsOffset: meta.readUInt32LE(208),
  fieldRefsCount: meta.readUInt32LE(212),
  referencedAssembliesOffset: meta.readUInt32LE(216),
  referencedAssembliesCount: meta.readUInt32LE(220),
  attributesInfoOffset: meta.readUInt32LE(224),
  attributesInfoCount: meta.readUInt32LE(228),
  attributeTypesOffset: meta.readUInt32LE(232),
  attributeTypesCount: meta.readUInt32LE(236),
  unresolvedVirtualCallParameterTypesOffset: meta.readUInt32LE(240),
  unresolvedVirtualCallParameterTypesCount: meta.readUInt32LE(244),
  unresolvedVirtualCallParameterRangesOffset: meta.readUInt32LE(248),
  unresolvedVirtualCallParameterRangesCount: meta.readUInt32LE(252),
  windowsRuntimeTypeNamesOffset: meta.readUInt32LE(256),
  windowsRuntimeTypeNamesSize: meta.readUInt32LE(260),
  exportedTypeDefinitionsOffset: meta.readUInt32LE(264),
  exportedTypeDefinitionsCount: meta.readUInt32LE(268)
};

function readString(idx) {
  if (idx < 0 || idx >= header.stringCount) return '';
  const start = header.stringOffset + idx;
  let end = start;
  while (end < meta.length && meta[end] !== 0) end++;
  return meta.toString('utf8', start, end);
}

// 2. Extract 100% of String Literals
const numStringLiterals = header.stringLiteralCount / 8;
const stringLiterals = [];
for (let i = 0; i < numStringLiterals; i++) {
  const base = header.stringLiteralOffset + i * 8;
  const length = meta.readUInt32LE(base);
  const dataIndex = meta.readInt32LE(base + 4);
  const strStart = header.stringLiteralDataOffset + dataIndex;
  const value = meta.toString('utf8', strStart, strStart + length);
  stringLiterals.push({
    index: i,
    length,
    dataOffset: dataIndex,
    value
  });
}
console.log(`Extracted ${stringLiterals.length} string literals.`);

// 3. Parse Images
const numImages = header.imagesCount / 32;
const images = [];
const typeDefToImage = new Map();
for (let i = 0; i < numImages; i++) {
  const base = header.imagesOffset + i * 32;
  const nameIndex = meta.readInt32LE(base);
  const assemblyIndex = meta.readInt32LE(base + 4);
  const typeStart = meta.readInt32LE(base + 8);
  const typeCount = meta.readUInt32LE(base + 12);
  const entryPointIndex = meta.readInt32LE(base + 16);
  const token = meta.readUInt32LE(base + 20);
  const name = readString(nameIndex);
  images.push({ index: i, name, assemblyIndex, typeStart, typeCount, entryPointIndex, token });
  for (let t = typeStart; t < typeStart + typeCount; t++) {
    typeDefToImage.set(t, name);
  }
}

// 4. Parse TypeDefinitions (stride 104)
const numTypeDefs = header.typeDefinitionsCount / 104;
const typeDefs = [];
for (let i = 0; i < numTypeDefs; i++) {
  const base = header.typeDefinitionsOffset + i * 104;
  const nameIndex = meta.readInt32LE(base);
  const namespaceIndex = meta.readInt32LE(base + 4);
  const customAttributeIndex = meta.readInt32LE(base + 8);
  const byvalTypeIndex = meta.readInt32LE(base + 12);
  const byrefTypeIndex = meta.readInt32LE(base + 16);
  const declaringTypeIndex = meta.readInt32LE(base + 20);
  const parentIndex = meta.readInt32LE(base + 24);
  const elementTypeIndex = meta.readInt32LE(base + 28);
  const rgctxStartIndex = meta.readInt32LE(base + 32);
  const rgctxCount = meta.readInt32LE(base + 36);
  const genericContainerIndex = meta.readInt32LE(base + 40);
  const flags = meta.readUInt32LE(base + 44);
  const fieldStart = meta.readInt32LE(base + 48);
  const methodStart = meta.readInt32LE(base + 52);
  const eventStart = meta.readInt32LE(base + 56);
  const propertyStart = meta.readInt32LE(base + 60);
  const nestedTypesStart = meta.readInt32LE(base + 64);
  const interfacesStart = meta.readInt32LE(base + 68);
  const vtableStart = meta.readInt32LE(base + 72);
  const interfaceOffsetsStart = meta.readInt32LE(base + 76);
  const method_count = meta.readUInt16LE(base + 80);
  const property_count = meta.readUInt16LE(base + 82);
  const field_count = meta.readUInt16LE(base + 84);
  const event_count = meta.readUInt16LE(base + 86);
  const nested_type_count = meta.readUInt16LE(base + 88);
  const vtable_count = meta.readUInt16LE(base + 90);
  const interfaces_count = meta.readUInt16LE(base + 92);
  const interface_offsets_count = meta.readUInt16LE(base + 94);
  const bitfield = meta.readUInt32LE(base + 96);
  const token = meta.readUInt32LE(base + 100);

  const name = readString(nameIndex);
  const namespace = readString(namespaceIndex);
  typeDefs.push({
    index: i,
    image: typeDefToImage.get(i) || '',
    name,
    namespace,
    fullName: namespace ? `${namespace}.${name}` : name,
    customAttributeIndex,
    byvalTypeIndex,
    byrefTypeIndex,
    declaringTypeIndex,
    parentIndex,
    elementTypeIndex,
    genericContainerIndex,
    flags,
    fieldStart,
    methodStart,
    eventStart,
    propertyStart,
    nestedTypesStart,
    interfacesStart,
    vtableStart,
    interfaceOffsetsStart,
    method_count,
    property_count,
    field_count,
    event_count,
    nested_type_count,
    vtable_count,
    interfaces_count,
    interface_offsets_count,
    isValueType: (bitfield & 1) !== 0,
    isEnum: (bitfield & 2) !== 0,
    bitfield,
    token
  });
}

// 5. Parse Il2CppType table from build.mem (vaddr 555788 -> mem offset 555780, count 24601)
const TYPES_TABLE_MEM_OFF = 555788 - GLOBAL_BASE;
const TYPES_COUNT = 24601;
const FIELD_OFFSETS_TABLE_MEM_OFF = 2096648 - GLOBAL_BASE;
const METHOD_POINTERS_MEM_OFF = 1611444 - GLOBAL_BASE;

// Build map of Il2CppType virtual address -> typeIndex
const typeVaddrToIndex = new Map();
for (let i = 0; i < TYPES_COUNT; i++) {
  const vaddr = mem.readUInt32LE(TYPES_TABLE_MEM_OFF + i * 4);
  typeVaddrToIndex.set(vaddr, i);
}

const PRIMITIVE_NAMES = {
  1: 'void',
  2: 'bool',
  3: 'char',
  4: 'sbyte',
  5: 'byte',
  6: 'short',
  7: 'ushort',
  8: 'int',
  9: 'uint',
  10: 'long',
  11: 'ulong',
  12: 'float',
  13: 'double',
  14: 'string',
  22: 'TypedReference',
  24: 'IntPtr',
  25: 'UIntPtr',
  28: 'object'
};

function readIl2CppTypeAtVaddr(vaddr, depth = 0) {
  if (!vaddr || depth > 6) return { typeName: 'unknown', attrs: 0, typeEnum: 0, byref: false };
  const off = vaddr - GLOBAL_BASE;
  if (off < 0 || off + 8 > mem.length) return { typeName: 'unknown', attrs: 0, typeEnum: 0, byref: false };
  const data = mem.readUInt32LE(off);
  const signedData = mem.readInt32LE(off);
  const attrs = mem.readUInt16LE(off + 4);
  const typeEnum = mem[off + 6];
  const bitflags = mem[off + 7];
  const byref = (bitflags & 0x40) !== 0;

  let typeName = PRIMITIVE_NAMES[typeEnum];
  if (!typeName) {
    if (typeEnum === 17 || typeEnum === 18) {
      // VALUETYPE or CLASS: signedData is TypeDefinitionIndex
      const td = typeDefs[signedData];
      typeName = td ? td.fullName : `TypeDef_${signedData}`;
    } else if (typeEnum === 29) {
      // SZARRAY: data is vaddr of element Il2CppType
      const elem = readIl2CppTypeAtVaddr(data, depth + 1);
      typeName = `${elem.typeName}[]`;
    } else if (typeEnum === 15) {
      // PTR: data is vaddr of target Il2CppType
      const elem = readIl2CppTypeAtVaddr(data, depth + 1);
      typeName = `${elem.typeName}*`;
    } else if (typeEnum === 20) {
      // ARRAY: data is vaddr of Il2CppArrayType { Il2CppType* etype, uint8 rank, ... }
      const arrOff = data - GLOBAL_BASE;
      const elemVaddr = mem.readUInt32LE(arrOff);
      const rank = mem[arrOff + 4] || 2;
      const elem = readIl2CppTypeAtVaddr(elemVaddr, depth + 1);
      typeName = `${elem.typeName}[${','.repeat(Math.max(0, rank - 1))}]`;
    } else if (typeEnum === 21) {
      // GENERICINST: data is vaddr of Il2CppGenericClass
      const gcOff = data - GLOBAL_BASE;
      const tdIdx = mem.readInt32LE(gcOff);
      const classInstVaddr = mem.readUInt32LE(gcOff + 4);
      const td = typeDefs[tdIdx];
      let baseName = td ? td.fullName : `GenericType_${tdIdx}`;
      baseName = baseName.replace(/`\d+$/, '');
      if (classInstVaddr) {
        const ciOff = classInstVaddr - GLOBAL_BASE;
        const argc = mem.readUInt32LE(ciOff);
        const argvVaddr = mem.readUInt32LE(ciOff + 4);
        const args = [];
        for (let a = 0; a < Math.min(argc, 8); a++) {
          const argTypeVaddr = mem.readUInt32LE(argvVaddr - GLOBAL_BASE + a * 4);
          args.push(readIl2CppTypeAtVaddr(argTypeVaddr, depth + 1).typeName);
        }
        typeName = `${baseName}<${args.join(', ')}>`;
      } else {
        typeName = baseName;
      }
    } else if (typeEnum === 19 || typeEnum === 30) {
      // VAR or MVAR: signedData is GenericParameterIndex
      const gpBase = header.genericParametersOffset + signedData * 16;
      if (gpBase >= 0 && gpBase + 16 <= meta.length) {
        const gpNameIdx = meta.readInt32LE(gpBase + 4);
        typeName = readString(gpNameIdx) || `T${signedData}`;
      } else {
        typeName = `T${signedData}`;
      }
    } else {
      typeName = `Il2CppType_${typeEnum}_${signedData}`;
    }
  }
  return { typeName, attrs, typeEnum, byref, rawData: signedData };
}

function resolveTypeIndex(typeIdx) {
  if (typeIdx < 0 || typeIdx >= TYPES_COUNT) return { typeName: 'void', attrs: 0, typeEnum: 1, byref: false };
  const vaddr = mem.readUInt32LE(TYPES_TABLE_MEM_OFF + typeIdx * 4);
  return readIl2CppTypeAtVaddr(vaddr);
}

// 6. Parse FieldDefaultValues (stride 12) for constants and enums
const numFieldDefaultValues = header.fieldDefaultValuesCount / 12;
const fieldDefaultMap = new Map();

function readCompressedUInt32(offset) {
  const b0 = meta[offset];
  if ((b0 & 0x80) === 0) return { val: b0, bytes: 1 };
  if ((b0 & 0xC0) === 0x80) return { val: ((b0 & 0x3F) << 8) | meta[offset + 1], bytes: 2 };
  if ((b0 & 0xE0) === 0xC0) {
    return {
      val: ((b0 & 0x1F) << 24) | (meta[offset + 1] << 16) | (meta[offset + 2] << 8) | meta[offset + 3],
      bytes: 4
    };
  }
  if (b0 === 0xF0) return { val: meta.readUInt32LE(offset + 1), bytes: 5 };
  if (b0 === 0xFE) return { val: 0xFFFFFFFE, bytes: 1 };
  if (b0 === 0xFF) return { val: 0xFFFFFFFF, bytes: 1 };
  return { val: 0, bytes: 1 };
}

for (let i = 0; i < numFieldDefaultValues; i++) {
  const base = header.fieldDefaultValuesOffset + i * 12;
  const fieldIndex = meta.readInt32LE(base);
  const typeIndex = meta.readInt32LE(base + 4);
  const dataIndex = meta.readInt32LE(base + 8);
  if (dataIndex < 0) continue;
  const dOff = header.fieldAndParameterDefaultValueDataOffset + dataIndex;
  const tInfo = resolveTypeIndex(typeIndex);
  let val = null;
  try {
    switch (tInfo.typeEnum) {
      case 2: val = meta[dOff] !== 0; break;
      case 3: val = meta.readUInt16LE(dOff); break;
      case 4: val = meta.readInt8(dOff); break;
      case 5: val = meta.readUInt8(dOff); break;
      case 6: val = meta.readInt16LE(dOff); break;
      case 7: val = meta.readUInt16LE(dOff); break;
      case 8: val = meta.readInt32LE(dOff); break;
      case 9: val = meta.readUInt32LE(dOff); break;
      case 12: val = Number(meta.readFloatLE(dOff).toFixed(5)); break;
      case 13: val = meta.readDoubleLE(dOff); break;
      case 14: {
        const comp = readCompressedUInt32(dOff);
        if (comp.val !== 0xFFFFFFFF && comp.val < 65536) {
          val = meta.toString('utf8', dOff + comp.bytes, dOff + comp.bytes + comp.val);
        }
        break;
      }
    }
  } catch (e) {}
  if (val !== null) fieldDefaultMap.set(fieldIndex, val);
}

// 7. Parse Fields (stride 16), Properties (stride 24), Parameters (stride 16), Methods (stride 56)
function getFieldOffset(typeDefIdx, fieldIdxInType) {
  const ptrVaddr = mem.readUInt32LE(FIELD_OFFSETS_TABLE_MEM_OFF + typeDefIdx * 4);
  if (!ptrVaddr) return -1;
  const off = ptrVaddr - GLOBAL_BASE + fieldIdxInType * 4;
  if (off < 0 || off + 4 > mem.length) return -1;
  return mem.readInt32LE(off);
}

function getFieldModifiers(attrs) {
  const access = attrs & 0x0007;
  const parts = [];
  if (access === 1) parts.push('private');
  else if (access === 2) parts.push('private protected');
  else if (access === 3) parts.push('internal');
  else if (access === 4) parts.push('protected');
  else if (access === 5) parts.push('protected internal');
  else if (access === 6) parts.push('public');

  if (attrs & 0x0040) parts.push('const');
  else {
    if (attrs & 0x0010) parts.push('static');
    if (attrs & 0x0020) parts.push('readonly');
  }
  return parts.join(' ');
}

function getMethodModifiers(flags) {
  const access = flags & 0x0007;
  const parts = [];
  if (access === 1) parts.push('private');
  else if (access === 2) parts.push('private protected');
  else if (access === 3) parts.push('internal');
  else if (access === 4) parts.push('protected');
  else if (access === 5) parts.push('protected internal');
  else if (access === 6) parts.push('public');

  if (flags & 0x0010) parts.push('static');
  if (flags & 0x0400) parts.push('abstract');
  else if ((flags & 0x0040) && !(flags & 0x0020)) {
    if (flags & 0x0100) parts.push('virtual');
    else parts.push('override');
  }
  return parts.join(' ');
}

function getTypeModifiers(td) {
  const vis = td.flags & 0x00000007;
  const parts = [];
  if (vis === 1 || vis === 2) parts.push('public');
  else if (vis === 3) parts.push('private');
  else if (vis === 4) parts.push('protected');
  else parts.push('internal');

  if (td.isEnum) {
    parts.push('enum');
  } else if (td.isValueType) {
    parts.push('struct');
  } else if (td.flags & 0x00000020) {
    parts.push('interface');
  } else {
    if ((td.flags & 0x00000180) === 0x00000180) parts.push('static');
    else if (td.flags & 0x00000080) parts.push('abstract');
    else if (td.flags & 0x00000100) parts.push('sealed');
    parts.push('class');
  }
  return parts.join(' ');
}

// 8. Parse build.asm.js function tables so we can map C# methods directly to JS functions!
console.log('Loading build.asm.js for function table & metadata usage mapping...');
const asmText = fs.readFileSync(asmPath, 'utf8');
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

function getAsmTypeChar(tInfo) {
  if (tInfo.byref) return 'i';
  if (tInfo.typeEnum === 1) return 'v';
  if (tInfo.typeEnum === 12) return 'f';
  if (tInfo.typeEnum === 13) return 'd';
  if (tInfo.typeEnum === 10 || tInfo.typeEnum === 11) return 'ii';
  return 'i';
}

function parseMethod(methodIdx) {
  const base = header.methodsOffset + methodIdx * 56;
  const nameIndex = meta.readInt32LE(base);
  const declaringType = meta.readInt32LE(base + 4);
  const returnTypeIdx = meta.readInt32LE(base + 8);
  const parameterStart = meta.readInt32LE(base + 12);
  const customAttributeIndex = meta.readInt32LE(base + 16);
  const genericContainerIndex = meta.readInt32LE(base + 20);
  const codeMethodIndex = meta.readInt32LE(base + 24);
  const invokerIndex = meta.readInt32LE(base + 28);
  const delegateWrapperIndex = meta.readInt32LE(base + 32);
  const rgctxStartIndex = meta.readInt32LE(base + 36);
  const rgctxCount = meta.readInt32LE(base + 40);
  const token = meta.readUInt32LE(base + 44);
  const flags = meta.readUInt16LE(base + 48);
  const iflags = meta.readUInt16LE(base + 50);
  const slot = meta.readUInt16LE(base + 52);
  const parameterCount = meta.readUInt16LE(base + 54);

  const name = readString(nameIndex);
  const retType = resolveTypeIndex(returnTypeIdx);
  const isStatic = (flags & 0x0010) !== 0;

  const parameters = [];
  let asmSig = getAsmTypeChar(retType) + (isStatic ? '' : 'i');
  for (let p = 0; p < parameterCount; p++) {
    const pBase = header.parametersOffset + (parameterStart + p) * 16;
    const pName = readString(meta.readInt32LE(pBase));
    const pToken = meta.readUInt32LE(pBase + 4);
    const pTypeIdx = meta.readInt32LE(pBase + 12);
    const pType = resolveTypeIndex(pTypeIdx);
    asmSig += getAsmTypeChar(pType);
    parameters.push({
      name: pName || `arg${p}`,
      type: pType.typeName,
      byref: pType.byref,
      typeIndex: pTypeIdx,
      token: `0x${pToken.toString(16)}`
    });
  }
  asmSig += 'i'; // const MethodInfo* method

  let fnPtr = -1;
  let asmFuncName = null;
  if (codeMethodIndex >= 0 && codeMethodIndex < 23330) {
    fnPtr = mem.readUInt32LE(METHOD_POINTERS_MEM_OFF + codeMethodIndex * 4);
    const tblName = dynMap.get(asmSig);
    if (tblName && fnTables.has(tblName)) {
      const tbl = fnTables.get(tblName);
      if (fnPtr >= 0 && fnPtr < tbl.length) {
        asmFuncName = tbl[fnPtr];
      }
    }
  }

  return {
    index: methodIdx,
    name,
    declaringType,
    returnType: retType.typeName,
    modifiers: getMethodModifiers(flags),
    isStatic,
    flags,
    iflags,
    slot,
    token: `0x${token.toString(16)}`,
    codeMethodIndex,
    fnPtr,
    asmSig,
    asmFuncName,
    parameters
  };
}

// 9. Build full class definitions for Assembly-CSharp.dll and Assembly-CSharp-firstpass.dll
const targetImages = new Set(['Assembly-CSharp.dll', 'Assembly-CSharp-firstpass.dll']);
const gameClasses = [];
const dumpLines = [];

dumpLines.push('// ============================================================================');
dumpLines.push('// IL2CPP Metadata v24 Dump - Costa Rica Pura Vida in Many Ways (Unity 2017.3.1f1)');
dumpLines.push(`// Generated from global-metadata.dat (${meta.length} bytes) & build.mem (${mem.length} bytes)`);
dumpLines.push('// ============================================================================\n');

dumpLines.push('// --- Images (Assemblies) ---');
for (const img of images) {
  dumpLines.push(`// Image ${img.index}: ${img.name} - Types: ${img.typeStart}..${img.typeStart + img.typeCount - 1} (${img.typeCount})`);
}
dumpLines.push('');

for (let tIdx = 0; tIdx < numTypeDefs; tIdx++) {
  const td = typeDefs[tIdx];
  if (!targetImages.has(td.image)) continue;

  // Parent & Interfaces
  let parentName = null;
  if (td.parentIndex >= 0) {
    parentName = resolveTypeIndex(td.parentIndex).typeName;
  }
  const interfaces = [];
  for (let i = 0; i < td.interfaces_count; i++) {
    const ifaceTypeIdx = meta.readInt32LE(header.interfacesOffset + (td.interfacesStart + i) * 4);
    interfaces.push(resolveTypeIndex(ifaceTypeIdx).typeName);
  }

  // Fields
  const fields = [];
  for (let f = 0; f < td.field_count; f++) {
    const fIdx = td.fieldStart + f;
    const fBase = header.fieldsOffset + fIdx * 16;
    const fName = readString(meta.readInt32LE(fBase));
    const fTypeIdx = meta.readInt32LE(fBase + 4);
    const fToken = meta.readUInt32LE(fBase + 12);
    const fType = resolveTypeIndex(fTypeIdx);
    const fOffset = getFieldOffset(tIdx, f);
    const defaultValue = fieldDefaultMap.has(fIdx) ? fieldDefaultMap.get(fIdx) : undefined;
    fields.push({
      index: fIdx,
      name: fName,
      type: fType.typeName,
      modifiers: getFieldModifiers(fType.attrs),
      attrs: fType.attrs,
      offset: fOffset >= 0 ? `0x${fOffset.toString(16).toUpperCase()}` : null,
      offsetBytes: fOffset,
      defaultValue,
      token: `0x${fToken.toString(16)}`
    });
  }

  // Methods
  const methods = [];
  for (let m = 0; m < td.method_count; m++) {
    methods.push(parseMethod(td.methodStart + m));
  }

  // Properties
  const properties = [];
  for (let p = 0; p < td.property_count; p++) {
    const pIdx = td.propertyStart + p;
    const pBase = header.propertiesOffset + pIdx * 24;
    const pName = readString(meta.readInt32LE(pBase));
    const getRel = meta.readInt32LE(pBase + 4);
    const setRel = meta.readInt32LE(pBase + 8);
    const pAttrs = meta.readInt32LE(pBase + 12);
    const pToken = meta.readUInt32LE(pBase + 20);
    const getter = getRel >= 0 && getRel < methods.length ? methods[getRel] : null;
    const setter = setRel >= 0 && setRel < methods.length ? methods[setRel] : null;
    const propType = getter ? getter.returnType : (setter && setter.parameters[0] ? setter.parameters[0].type : 'object');
    const propMod = getter ? getter.modifiers : (setter ? setter.modifiers : 'public');
    properties.push({
      index: pIdx,
      name: pName,
      type: propType,
      modifiers: propMod,
      hasGetter: !!getter,
      hasSetter: !!setter,
      getterMethod: getter ? getter.name : null,
      setterMethod: setter ? setter.name : null,
      token: `0x${pToken.toString(16)}`
    });
  }

  const clsObj = {
    typeDefIndex: tIdx,
    image: td.image,
    namespace: td.namespace,
    name: td.name,
    fullName: td.fullName,
    modifiers: getTypeModifiers(td),
    isValueType: td.isValueType,
    isEnum: td.isEnum,
    parent: parentName,
    interfaces,
    token: `0x${td.token.toString(16)}`,
    fields,
    properties,
    methods
  };
  gameClasses.push(clsObj);

  // Format for dump.cs
  dumpLines.push(`// Image: ${td.image} - TypeDefIndex: ${tIdx} - Token: 0x${td.token.toString(16)}`);
  const inheritance = [];
  if (!td.isEnum && !td.isValueType && parentName && parentName !== 'object' && parentName !== 'System.Object') {
    inheritance.push(parentName);
  } else if (!td.isEnum && parentName && parentName !== 'System.ValueType') {
    inheritance.push(parentName);
  }
  for (const iface of interfaces) inheritance.push(iface);
  const inhStr = inheritance.length > 0 ? ` : ${inheritance.join(', ')}` : '';
  dumpLines.push(`// Namespace: ${td.namespace}`);
  dumpLines.push(`${clsObj.modifiers} ${td.name}${inhStr}`);
  dumpLines.push('{');

  if (fields.length > 0) {
    dumpLines.push('\t// Fields');
    for (const f of fields) {
      if (td.isEnum && f.name !== 'value__') {
        const eqStr = f.defaultValue !== undefined ? ` = ${JSON.stringify(f.defaultValue)}` : '';
        dumpLines.push(`\t${f.name}${eqStr},`);
      } else {
        const eqStr = f.defaultValue !== undefined ? ` = ${JSON.stringify(f.defaultValue)}` : '';
        const offStr = f.offset ? ` // ${f.offset}` : '';
        dumpLines.push(`\t${f.modifiers} ${f.type} ${f.name}${eqStr};${offStr}`);
      }
    }
    dumpLines.push('');
  }

  if (properties.length > 0) {
    dumpLines.push('\t// Properties');
    for (const p of properties) {
      const gs = `${p.hasGetter ? 'get; ' : ''}${p.hasSetter ? 'set; ' : ''}`.trim();
      dumpLines.push(`\t${p.modifiers} ${p.type} ${p.name} { ${gs} }`);
    }
    dumpLines.push('');
  }

  if (methods.length > 0) {
    dumpLines.push('\t// Methods');
    for (const m of methods) {
      const pList = m.parameters.map(p => `${p.byref ? 'ref ' : ''}${p.type} ${p.name}`).join(', ');
      const asmInfo = m.asmFuncName ? ` // asm.js: ${m.asmFuncName} (fnPtr: ${m.fnPtr}, methodIdx: ${m.codeMethodIndex})` : '';
      dumpLines.push(`\t${m.modifiers} ${m.returnType} ${m.name}(${pList});${asmInfo}`);
    }
  }

  dumpLines.push('}\n');
}

// 10. Write dump.cs, assembly_csharp_classes.json, string_literals.json
fs.writeFileSync(path.join(OUT_DIR, 'dump.cs'), dumpLines.join('\n'), 'utf8');
console.log(`Wrote dump.cs (${dumpLines.length} lines).`);

fs.writeFileSync(
  path.join(OUT_DIR, 'assembly_csharp_classes.json'),
  JSON.stringify({
    metadataVersion: header.version,
    totalImages: images.length,
    totalTypeDefinitions: numTypeDefs,
    extractedClassesCount: gameClasses.length,
    images,
    classes: gameClasses
  }, null, 2),
  'utf8'
);
console.log(`Wrote assembly_csharp_classes.json (${gameClasses.length} classes).`);

fs.writeFileSync(
  path.join(OUT_DIR, 'string_literals.json'),
  JSON.stringify({
    totalStringLiterals: stringLiterals.length,
    stringLiteralOffset: header.stringLiteralOffset,
    stringLiteralDataOffset: header.stringLiteralDataOffset,
    literals: stringLiterals
  }, null, 2),
  'utf8'
);
console.log(`Wrote string_literals.json (${stringLiterals.length} literals).`);

// 11. Parse methods_pointedto_by_uievents.xml and preserved_derived_types.xml -> ui_events_map.json
const uiXml = fs.readFileSync(uiEventsPath, 'utf8');
const classMapByName = new Map();
for (const c of gameClasses) {
  classMapByName.set(c.fullName, c);
}

const uiAssemblies = [];
const asmRegex = /<assembly\s+fullname="([^"]+)">([\s\S]*?)<\/assembly>/g;
let mAsm;
while ((mAsm = asmRegex.exec(uiXml)) !== null) {
  const asmName = mAsm[1];
  const asmBody = mAsm[2];
  const types = [];
  const typeRegex = /<type\s+fullname="([^"]+)">([\s\S]*?)<\/type>/g;
  let mType;
  while ((mType = typeRegex.exec(asmBody)) !== null) {
    const typeName = mType[1];
    const typeBody = mType[2];
    const methodCounts = {};
    const methodOrder = [];
    const methRegex = /<method\s+name="([^"]+)"\s*\/>/g;
    let mMeth;
    while ((mMeth = methRegex.exec(typeBody)) !== null) {
      const mName = mMeth[1];
      if (!methodCounts[mName]) {
        methodCounts[mName] = 0;
        methodOrder.push(mName);
      }
      methodCounts[mName]++;
    }
    const cls = classMapByName.get(typeName);
    const resolvedMethods = methodOrder.map(mName => {
      const matching = cls ? cls.methods.filter(m => m.name === mName) : [];
      return {
        methodName: mName,
        uiEventBindingCount: methodCounts[mName],
        signatures: matching.map(m => ({
          signature: `${m.modifiers} ${m.returnType} ${m.name}(${m.parameters.map(p => `${p.type} ${p.name}`).join(', ')})`,
          asmFuncName: m.asmFuncName,
          fnPtr: m.fnPtr
        }))
      };
    });
    types.push({
      typeName,
      totalBindingsInScenes: Object.values(methodCounts).reduce((a, b) => a + b, 0),
      uniqueMethodsCount: methodOrder.length,
      methods: resolvedMethods
    });
  }
  uiAssemblies.push({
    assemblyName: asmName,
    typesCount: types.length,
    types
  });
}

fs.writeFileSync(
  path.join(OUT_DIR, 'ui_events_map.json'),
  JSON.stringify({
    sourceFile: 'methods_pointedto_by_uievents.xml',
    assemblies: uiAssemblies
  }, null, 2),
  'utf8'
);
console.log('Wrote ui_events_map.json.');
