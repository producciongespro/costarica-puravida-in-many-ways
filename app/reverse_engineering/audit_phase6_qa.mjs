import fs from 'fs';
import path from 'path';

const APP_DIR = 'c:/xampp/htdocs/costa_rica_puravida_in_many_ways/app';
const PUBLIC_ASSETS_DIR = path.join(APP_DIR, 'public/assets');
const DATA_DIR = path.join(APP_DIR, 'src/data');
const SRC_DIR = path.join(APP_DIR, 'src');

// 1. Index all physical files in app/public/assets/ (case-sensitive & case-insensitive maps)
const exactAssetSet = new Set();
const lowerAssetMap = new Map();
const categoryCounts = { sprites: 0, textures: 0, audio: 0, fonts: 0 };

function walkAssets(dir, relPrefix = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkAssets(fullPath, relPath);
    } else if (entry.isFile()) {
      exactAssetSet.add(relPath);
      lowerAssetMap.set(relPath.toLowerCase(), relPath);
      const topCat = relPath.split('/')[0];
      if (categoryCounts[topCat] !== undefined) {
        categoryCounts[topCat]++;
      }
    }
  }
}

walkAssets(PUBLIC_ASSETS_DIR);

console.log('=== 1. PHYSICAL ASSETS IN app/public/assets/ ===');
console.log(JSON.stringify(categoryCounts, null, 2));
console.log('Total physical assets:', exactAssetSet.size);

// Helper to check a candidate asset path like "sprites/foo.png" or "/assets/sprites/foo.png"
function checkAssetPath(rawStr) {
  if (typeof rawStr !== 'string') return null;
  let cleaned = rawStr.trim();
  if (cleaned.startsWith('/assets/')) cleaned = cleaned.slice('/assets/'.length);
  else if (cleaned.startsWith('assets/')) cleaned = cleaned.slice('assets/'.length);

  if (!/^(sprites|textures|audio|fonts)\/.+\.[a-zA-Z0-9]+$/.test(cleaned)) {
    return null;
  }

  if (exactAssetSet.has(cleaned)) {
    return { status: 'OK', path: cleaned };
  }
  const lowerMatch = lowerAssetMap.get(cleaned.toLowerCase());
  if (lowerMatch) {
    return { status: 'CASE_MISMATCH', path: cleaned, actual: lowerMatch };
  }
  return { status: 'MISSING', path: cleaned };
}

// 2. Scan all JSON files in app/src/data/*.json
const jsonFiles = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
const jsonResults = {
  totalChecked: 0,
  ok: 0,
  caseMismatches: [],
  missing: []
};

function scanJsonNode(node, file, jsonPath = '') {
  if (typeof node === 'string') {
    const res = checkAssetPath(node);
    if (res) {
      jsonResults.totalChecked++;
      if (res.status === 'OK') {
        jsonResults.ok++;
      } else if (res.status === 'CASE_MISMATCH') {
        jsonResults.caseMismatches.push({ file, jsonPath, referenced: res.path, actual: res.actual });
      } else {
        jsonResults.missing.push({ file, jsonPath, referenced: res.path });
      }
    }
  } else if (Array.isArray(node)) {
    node.forEach((item, idx) => scanJsonNode(item, file, `${jsonPath}[${idx}]`));
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      scanJsonNode(v, file, jsonPath ? `${jsonPath}.${k}` : k);
    }
  }
}

for (const jf of jsonFiles) {
  const full = path.join(DATA_DIR, jf);
  const data = JSON.parse(fs.readFileSync(full, 'utf8'));
  scanJsonNode(data, jf);
}

console.log('\n=== 2. JSON DATA ASSET REFERENCES (src/data/*.json) ===');
console.log(`Total references scanned: ${jsonResults.totalChecked}`);
console.log(`Exact matches: ${jsonResults.ok}`);
console.log(`Case mismatches: ${jsonResults.caseMismatches.length}`);
console.log(`Missing / Broken paths: ${jsonResults.missing.length}`);

// 3. Scan all JS, JSX, CSS files in app/src/**/*.{js,jsx,css}
const codeFiles = [];
function walkSrc(dir, relPrefix = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSrc(fullPath, relPath);
    } else if (/\.(js|jsx|css)$/.test(entry.name)) {
      codeFiles.push({ relPath, fullPath });
    }
  }
}
walkSrc(SRC_DIR);

const codeResults = {
  totalChecked: 0,
  ok: 0,
  caseMismatches: [],
  missing: []
};

const assetRegex = /['"`]((?:\/assets\/|assets\/)?(?:sprites|textures|audio|fonts)\/[^'"`\r\n]+?\.[a-zA-Z0-9]+)['"`]/g;

for (const cf of codeFiles) {
  const content = fs.readFileSync(cf.fullPath, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    let match;
    assetRegex.lastIndex = 0;
    while ((match = assetRegex.exec(line)) !== null) {
      const candidate = match[1];
      if (candidate.includes('${')) continue;
      const res = checkAssetPath(candidate);
      if (res) {
        codeResults.totalChecked++;
        if (res.status === 'OK') {
          codeResults.ok++;
        } else if (res.status === 'CASE_MISMATCH') {
          codeResults.caseMismatches.push({
            file: cf.relPath,
            line: idx + 1,
            referenced: res.path,
            actual: res.actual
          });
        } else {
          codeResults.missing.push({
            file: cf.relPath,
            line: idx + 1,
            referenced: res.path
          });
        }
      }
    }
  });
}

console.log('\n=== 3. CODE ASSET REFERENCES (src/**/*.{js,jsx,css}) ===');
console.log(`Total references scanned: ${codeResults.totalChecked}`);
console.log(`Exact matches: ${codeResults.ok}`);
console.log(`Case mismatches: ${codeResults.caseMismatches.length}`);
console.log(`Missing / Broken paths: ${codeResults.missing.length}`);

// 4. Audit playSfx(number) calls across JSX files against gameConfig.audio.soundEffects
const gameConfig = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'gameConfig.json'), 'utf8'));
const validSfxIndices = new Set((gameConfig.audio?.soundEffects || []).map((s) => s.index));
const sfxRegex = /playSfx\(\s*(\d+)\s*\)/g;
const sfxCalls = [];
for (const cf of codeFiles) {
  const content = fs.readFileSync(cf.fullPath, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    let m;
    sfxRegex.lastIndex = 0;
    while ((m = sfxRegex.exec(line)) !== null) {
      const sfxIdx = Number(m[1]);
      sfxCalls.push({
        file: cf.relPath,
        line: idx + 1,
        sfxIdx,
        valid: validSfxIndices.has(sfxIdx)
      });
    }
  });
}
const invalidSfxCalls = sfxCalls.filter((c) => !c.valid);
console.log('\n=== 4. playSfx(index) CALL AUDIT ===');
console.log(`Total numeric playSfx calls: ${sfxCalls.length}`);
console.log(`Invalid playSfx indices: ${invalidSfxCalls.length}`);

// 5. Audit 1:1 Parity against Original Unity 2017.3.1f1 WebGL
const provincesData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'provinces.json'), 'utf8'));
const popquizData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'popquiz.json'), 'utf8'));
const dialoguesData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'dialogues.json'), 'utf8'));
const minigamesData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'minigames.json'), 'utf8'));
const glossaryData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'glossary.json'), 'utf8'));
const runnerContent = fs.readFileSync(path.join(SRC_DIR, 'components/minigames/MinigameRunner.jsx'), 'utf8');

const officialMinigames = minigamesData.minigames || [];
const legacyMinigames = minigamesData.legacyAndSiblingMinigames || [];
const allMinigameIds = [...officialMinigames.map((m) => m.id), ...legacyMinigames.map((m) => m.id)];
const unroutedMinigames = allMinigameIds.filter((id) => !runnerContent.includes(`case '${id}'`));

const totalStarPieces = (provincesData.provinces || []).reduce(
  (acc, p) => acc + (p.minigames ? p.minigames.length : 0),
  0
);

console.log('\n=== 5. 1:1 PARITY AUDIT SUMMARY ===');
console.log(
  JSON.stringify(
    {
      originalEngine: gameConfig.meta.originalEngine,
      provincesCount: provincesData.provinces.length,
      totalStarPieces,
      provinceLevelsKeysCount: (gameConfig.storageKeys?.provinceLevels || []).length,
      popQuizTotalQuestions: popquizData.totalQuestions,
      popQuizWithValidAudio: (popquizData.byProvince || [])
        .flatMap((b) => b.questions || [])
        .filter((q) => q.questionAudio?.file && exactAssetSet.has(q.questionAudio.file)).length,
      fungusNarrativeScenes: dialoguesData.totalNarrativeScenesWithFungus,
      fungusTotalDialogueLines: dialoguesData.totalFungusDialogueLines,
      officialMinigamesCount: officialMinigames.length,
      rescuedBonusMinigamesCount: legacyMinigames.length,
      totalPlayableMinigamesRouted: allMinigameIds.length - unroutedMinigames.length,
      unroutedMinigames,
      glossaryCoreKeywords: glossaryData.totalCoreKeywords,
      glossaryExtendedTerms: glossaryData.totalExtendedTerms,
      travelCostInGameConfig: gameConfig.economyAndProgression.travelCostCoins,
      travelCostDisplayedInUiText: gameConfig.economyAndProgression.travelCostDisplayedInUiText,
      travelCostInProvincesModal: provincesData.mapModals.confirmRegionChange.actualCoinsDeductedInCode
    },
    null,
    2
  )
);
