import fs from 'fs';
import path from 'path';

const ROOT_DIR = 'c:\\xampp\\htdocs\\costa_rica_puravida_in_many_ways';
const REV_DIR = path.join(ROOT_DIR, 'app', 'reverse_engineering');
const UNPACKED_DIR = path.join(REV_DIR, 'unpacked_data');
const ASSETS_DIR = path.join(REV_DIR, 'extracted_assets');
const SCENES_DIR = path.join(ASSETS_DIR, 'scenes_hierarchy');
const OUT_DATA_DIR = path.join(ROOT_DIR, 'app', 'src', 'data');

fs.mkdirSync(OUT_DATA_DIR, { recursive: true });

// ============================================================================
// 1. Load Phase 2 & Phase 3 Extracted Catalogs
// ============================================================================
const scenesIndex = JSON.parse(fs.readFileSync(path.join(ASSETS_DIR, 'scenes_index.json'), 'utf8'));
const popquizRaw = JSON.parse(fs.readFileSync(path.join(ASSETS_DIR, 'popquiz_database.json'), 'utf8'));
const fungusRaw = JSON.parse(fs.readFileSync(path.join(ASSETS_DIR, 'fungus_dialogues.json'), 'utf8'));
const spritesCatalog = JSON.parse(fs.readFileSync(path.join(ASSETS_DIR, 'sprites_catalog.json'), 'utf8'));
const texturesCatalog = JSON.parse(fs.readFileSync(path.join(ASSETS_DIR, 'textures_catalog.json'), 'utf8'));
const audioCatalog = JSON.parse(fs.readFileSync(path.join(ASSETS_DIR, 'audio_catalog.json'), 'utf8'));
const fontsCatalog = JSON.parse(fs.readFileSync(path.join(ASSETS_DIR, 'fonts_catalog.json'), 'utf8'));

const audioByName = new Map();
for (const a of audioCatalog) {
  if (!audioByName.has(a.name)) audioByName.set(a.name, a);
}

const spriteByName = new Map();
const spritesBySource = new Map();
for (const s of spritesCatalog) {
  if (!spriteByName.has(s.name)) spriteByName.set(s.name, s);
  if (!spritesBySource.has(s.sourceFile)) spritesBySource.set(s.sourceFile, []);
  spritesBySource.get(s.sourceFile).push(s);
}

// ============================================================================
// 2. Binary Reader for SerializedFile v17 (Fixes UI.Text +56 offset & extracts Music/Sound/RegisterStar)
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

function parseUnityLevelObjects(levelIndex) {
  const filePath = path.join(UNPACKED_DIR, `level${levelIndex}`);
  const buf = fs.readFileSync(filePath);
  const dataOff = buf.readUInt32BE(12);
  let p = 20;
  while (buf[p] !== 0) p++;
  p++;
  p += 5; // targetPlatform (4) + enableTypeTree (1)
  const typeCount = buf.readInt32LE(p);
  p += 4;
  const types = [];
  for (let i = 0; i < typeCount; i++) {
    const classID = buf.readInt32LE(p);
    p += 4;
    const isStripped = buf[p++];
    const scriptTypeIndex = buf.readInt16LE(p);
    p += 2;
    if (classID === 114) p += 16;
    p += 16;
    types.push({ classID, isStripped, scriptTypeIndex });
  }
  const objCount = buf.readInt32LE(p);
  p += 4;
  const objMap = new Map();
  for (let i = 0; i < objCount; i++) {
    while (p % 4 !== 0) p++;
    const pathID = Number(buf.readBigInt64LE(p));
    p += 8;
    const byteStart = buf.readUInt32LE(p);
    p += 4;
    const byteSize = buf.readUInt32LE(p);
    p += 4;
    const typeID = buf.readInt32LE(p);
    p += 4;
    objMap.set(pathID, {
      pathID,
      byteStart: dataOff + byteStart,
      byteSize,
      classID: types[typeID].classID,
      raw: buf.subarray(dataOff + byteStart, dataOff + byteStart + byteSize)
    });
  }
  const scriptCount = buf.readInt32LE(p);
  p += 4;
  for (let i = 0; i < scriptCount; i++) {
    p += 4;
    while (p % 4 !== 0) p++;
    p += 8;
  }
  const extCount = buf.readInt32LE(p);
  p += 4;
  const externals = [];
  for (let i = 0; i < extCount; i++) {
    while (buf[p] !== 0) p++;
    p++;
    p += 20;
    let p0 = p;
    while (buf[p] !== 0) p++;
    externals.push(path.basename(buf.subarray(p0, p).toString('utf8')));
    p++;
  }
  return { buf, objMap, externals };
}

function decodeUITextString(rawMonoBehaviour) {
  try {
    const mbName = readAlignedString(rawMonoBehaviour, 28);
    const payload = rawMonoBehaviour.subarray(mbName.p);
    let q = 32; // m_Material(12) + m_Color(16) + m_RaycastTarget(4)
    const cullCalls = payload.readInt32LE(q);
    q += 4;
    if (cullCalls === 0) {
      q = readAlignedString(payload, q).p; // m_TypeName ("UnityEngine.UI.MaskableGraphic+CullStateChangedEvent...")
      q += 56; // m_FontData (56 bytes with 4-byte aligned booleans)
      return readAlignedString(payload, q).str;
    }
  } catch {}
  return '';
}

// Patch all 54 scene hierarchy JSONs so uiTexts and tree components have exact decoded text strings
const sceneHierarchies = new Map();
const sceneTextsByLevel = new Map();
const scenePlayMusicByLevel = new Map();

for (let idx = 0; idx <= 53; idx++) {
  const hPath = path.join(SCENES_DIR, `level${idx}.json`);
  const hData = JSON.parse(fs.readFileSync(hPath, 'utf8'));
  const { objMap } = parseUnityLevelObjects(idx);

  const textLookup = new Map();
  for (const t of hData.uiTexts || []) {
    const obj = objMap.get(t.componentPathID);
    if (obj) {
      t.text = decodeUITextString(obj.raw);
      textLookup.set(t.componentPathID, t.text);
    }
  }

  let playMusicIndex = null;
  function patchTree(nodes) {
    for (const n of nodes) {
      for (const c of n.components || []) {
        if (c.scriptClass === 'UnityEngine.UI.Text' && textLookup.has(c.componentPathID)) {
          c.text = textLookup.get(c.componentPathID);
        } else if (c.scriptClass === 'PlayMusic') {
          const obj = objMap.get(c.componentPathID);
          if (obj && obj.raw.length >= 36) {
            playMusicIndex = obj.raw.readInt32LE(32);
          }
        }
      }
      if (n.children) patchTree(n.children);
    }
  }
  patchTree(hData.hierarchyTree || []);

  fs.writeFileSync(hPath, JSON.stringify(hData, null, 2), 'utf8');
  sceneHierarchies.set(idx, hData);
  sceneTextsByLevel.set(
    idx,
    (hData.uiTexts || [])
      .filter((t) => (!t.hierarchyPath.startsWith('GameControl') || idx === 0) && t.text.trim().length > 0)
      .map((t) => ({
        gameObjectName: t.gameObjectName,
        hierarchyPath: t.hierarchyPath,
        text: t.text,
        fontName: t.fontName,
        fontSize: t.fontSize
      }))
  );
  scenePlayMusicByLevel.set(idx, playMusicIndex);
}

// Extract Music_Handler.Songs (29 tracks) & Sound_Handler.sounds (62 slots) from level0
const level0Parsed = parseUnityLevelObjects(0);
function resolveLevel0Audio(fileID, pathID) {
  const src = fileID === 0 ? 'level0' : level0Parsed.externals[fileID - 1];
  const found = audioCatalog.find(
    (a) => a.sourceFile.toLowerCase() === (src || '').toLowerCase() && a.pathID === pathID
  );
  return found
    ? {
        name: found.name,
        file: found.extractedFile,
        durationSeconds: found.lengthSeconds,
        frequency: found.frequency,
        channels: found.channels
      }
    : null;
}

const musicTracks = [];
{
  const mhObj = level0Parsed.objMap.get(365);
  let q = 56;
  const count = mhObj.raw.readInt32LE(q);
  q += 4;
  for (let i = 0; i < count; i++) {
    const fID = mhObj.raw.readInt32LE(q);
    const pID = Number(mhObj.raw.readBigInt64LE(q + 4));
    q += 12;
    const resolved = resolveLevel0Audio(fID, pID);
    musicTracks.push({
      index: i,
      ...(resolved || { name: null, file: null, durationSeconds: 0 })
    });
  }
}

const soundEffects = [];
{
  const shObj = level0Parsed.objMap.get(366);
  let q = 68;
  const count = shObj.raw.readInt32LE(q);
  q += 4;
  for (let i = 0; i < count; i++) {
    const fID = shObj.raw.readInt32LE(q);
    const pID = Number(shObj.raw.readBigInt64LE(q + 4));
    q += 12;
    const resolved = resolveLevel0Audio(fID, pID);
    if (resolved) {
      soundEffects.push({
        index: i,
        ...resolved
      });
    }
  }
}

// ============================================================================
// 3. Build 1: app/src/data/gameConfig.json
// ============================================================================
const gameConfig = {
  meta: {
    gameTitle: 'Costa Rica Pura Vida in Many Ways',
    subtitle: 'Educational English Learning Adventure across the 7 Provinces of Costa Rica',
    institution: 'Ministerio de Educación Pública (MEP) - Costa Rica',
    departments: [
      'Departamento de Gestión y Producción de Recursos (GESPRO)',
      'Departamento de Tercer Ciclo y Educación Diversificada'
    ],
    developers: {
      studio: 'Producciones de la Montaña & Tayassu Games',
      coordinator: 'Adrian Jurburg Gruskin',
      projectManager: 'Oscar Loria',
      softwareEngineers: ['Juan Navarro', 'Jean Arias', 'Gabriel Aguiar', 'Willbert Sibaja', 'Adrian Fernández'],
      artAndDesign: 'Kristoffer Vela',
      musicComposers: ['Antonio Loria', 'Dario Jurburg Chaves'],
      voiceActors: ['Rosa Chinchilla (Female Voiceovers)', 'André Mendez (Male Voiceovers)'],
      mepAdvisors: ['Katherine Williams Jiménez', 'Marianella Granados Sirias', 'Alfredo Ortega Cordero']
    },
    releaseYear: 2018,
    location: 'San José, Costa Rica',
    originalEngine: 'Unity 2017.3.1f1 WebGL (IL2CPP asm.js)',
    targetLanguage: 'en-US',
    uiLanguage: 'en'
  },
  viewport: {
    width: 960,
    height: 620,
    aspectRatio: '48:31',
    canvasReferenceResolution: { width: 800, height: 600 },
    backgroundColor: '#231F20'
  },
  economyAndProgression: {
    initialCoins: 5000,
    travelCostCoins: 5000,
    travelCostDisplayedInModalText: 1000,
    travelCostNote:
      'In C# (PopQuiz.NewRegion, asm: Gki), traveling between provinces requires >= 5000 coins and deducts 5000 coins via GameControl.GastarMonedas(5000), whereas the static UI text in PanelConformarCambioRegion reads "You must spend 1000 coins to travel and answer a question."',
    startingProvinceId: 0,
    startingProvinceName: 'San José',
    totalProvinces: 7,
    minigamesPerProvince: 3,
    totalMinigames: 21,
    totalStarPieces: 21,
    starPieceValues: {
      locked: '0',
      completed: '1'
    },
    endingCondition: {
      trackerSlotIndex: 7,
      trackerKey: 'CRPVMW_level_7',
      trackerInternalName: 'MapaCR',
      initialState: '000',
      readyToDisplayEndingState: '111',
      endingAlreadyDisplayedState: '222',
      rule: 'When all 7 provinces (indices 0..6) reach "111" (all 21 minigames completed), GameControl.RegisterMinigameProgress sets avance[7].level ("MapaCR") from "000" to "111". On loading MapaCostaRica (level7), GameEnding.CheckEnding() detects "111", sets it to "222", saves to localStorage, shows Panel Ending, and plays music track 26 (Ganar (largo).m4a).'
    }
  },
  storageKeys: {
    prefix: 'CRPVMW_',
    coins: { key: 'CRPVMW_monedas', type: 'int', defaultValue: 5000 },
    character: {
      key: 'CRPVMW_personaje',
      type: 'int',
      defaultValue: 1,
      mapping: { '1': 'Lisa (Female, bool true)', '0': 'Mike (Male, bool false)' }
    },
    currentLocation: {
      key: 'CRPVMW_location',
      type: 'int',
      defaultValue: 0,
      mapping: {
        '0': 'San José',
        '1': 'Heredia',
        '2': 'Cartago',
        '3': 'Alajuela',
        '4': 'Puntarenas',
        '5': 'Guanacaste',
        '6': 'Limón'
      }
    },
    provinceLevels: [
      { provinceId: 0, key: 'CRPVMW_level_0', name: 'SanJose', defaultValue: '000' },
      { provinceId: 1, key: 'CRPVMW_level_1', name: 'Heredia', defaultValue: '000' },
      { provinceId: 2, key: 'CRPVMW_level_2', name: 'Cartago', defaultValue: '000' },
      { provinceId: 3, key: 'CRPVMW_level_3', name: 'Alajuela', defaultValue: '000' },
      { provinceId: 4, key: 'CRPVMW_level_4', name: 'Puntarenas', defaultValue: '000' },
      { provinceId: 5, key: 'CRPVMW_level_5', name: 'Guanacaste', defaultValue: '000' },
      { provinceId: 6, key: 'CRPVMW_level_6', name: 'Limon', defaultValue: '000' },
      { provinceId: 7, key: 'CRPVMW_level_7', name: 'MapaCR', defaultValue: '000' }
    ]
  },
  characters: {
    selectable: [
      {
        id: 'lisa',
        name: 'Lisa',
        fullName: 'Lisa Smith',
        gender: 'female',
        idPersonajeBool: true,
        playerPrefsInt: 1,
        buttonColorRGBA: [0.247, 0.616, 0.129, 1],
        sprites: {
          portrait: 'sprites/lisa_portrait.png',
          fullBodySelect: 'sprites/Lisa_1.png',
          dialogAvatar: 'sprites/Lisa.png',
          mapPinAvatar: 'sprites/Lisa_4.png',
          topDownWalk: ['sprites/Personaje Mujer_0.png', 'sprites/Personaje Mujer_1.png'],
          biking: 'sprites/Personaje_Sprites_01_bici_0.png',
          diving: 'sprites/Personaje_Sprites_02_snorkel 1_0.png'
        },
        selectScreenGreeting: "Lisa, Costa Rica it's a wonderful country, a lot of adventures waits!",
        introVoiceOvers: [
          { clipName: 'MASTER MENU LISA 002', file: 'audio/MASTER MENU LISA 002.m4a' },
          { clipName: 'MASTER MENU LISA 003', file: 'audio/MASTER MENU LISA 003.m4a' }
        ]
      },
      {
        id: 'mike',
        name: 'Mike',
        fullName: 'Mike Smith',
        gender: 'male',
        idPersonajeBool: false,
        playerPrefsInt: 0,
        buttonColorRGBA: [0.949, 0.659, 0.188, 1],
        sprites: {
          portrait: 'sprites/mike_portrait.png',
          fullBodySelect: 'sprites/Mike_1.png',
          dialogAvatarRight: 'sprites/Mike Smith Right.png',
          dialogAvatarLeft: 'sprites/Mike Smith Left.png',
          mapPinAvatar: 'sprites/Mike_4.png',
          topDownWalk: ['sprites/Personaje_0.png', 'sprites/Personaje_1.png'],
          biking: 'sprites/Personaje_Sprites_02b_bike-Sheet_0.png',
          running: 'sprites/Mike_0.png'
        },
        selectScreenGreeting: "Mike, Costa Rica it's a wonderful country, a lot of adventures waits!",
        introVoiceOvers: [
          { clipName: 'MASTER MENU MIKE 002', file: 'audio/MASTER MENU MIKE 002.m4a' },
          { clipName: 'MASTER MENU MIKE OO3', file: 'audio/MASTER MENU MIKE OO3.m4a' }
        ]
      }
    ],
    guidesAndNpcs: [
      {
        id: 'daniel',
        name: 'Daniel',
        role: 'Costa Rican Taxi Driver & Main Tour Guide',
        sprite: 'sprites/Daniel Taxi Driver.png',
        introVoiceOvers: [
          { clipName: 'MASTER MENU DANIEL 001', file: 'audio/MASTER MENU DANIEL 001.m4a' },
          { clipName: 'MASTER MENU DANIEL 002', file: 'audio/MASTER MENU DANIEL 002.m4a' }
        ]
      },
      {
        id: 'maria_coffee',
        name: 'María',
        role: 'Coffee Farm Host (San José)',
        sprite: 'sprites/Maria Coffee.png'
      },
      {
        id: 'daniela_rose',
        name: 'Daniela',
        role: 'Flower Shop Owner (Heredia)',
        sprite: 'sprites/Floristeria Daniela Rose.png'
      },
      {
        id: 'manuel_fernandez',
        name: 'Manuel',
        role: 'Masquerade Host (Heredia)',
        sprite: 'sprites/Local Manuel Fernandez.png'
      },
      {
        id: 'miguel_gutierrez',
        name: 'Miguel',
        role: 'Park Ranger (Cartago Volcanoes)',
        sprite: 'sprites/Guarda parques Miguel Gutierrez.png'
      },
      {
        id: 'ester_guevara',
        name: 'Ester',
        role: 'Park Ranger (Barra Honda, Guanacaste)',
        sprite: 'sprites/Guarda parques Ester Guevara.png'
      },
      {
        id: 'luis_araya',
        name: 'Luis',
        role: 'Churchill Vendor (Puntarenas)',
        sprite: 'sprites/Copero Luis Araya.png'
      },
      {
        id: 'ana_cambronero',
        name: 'Ana',
        role: 'Sea Turtle Conservationist (Limón)',
        sprite: 'sprites/Conservacionista Ana Cambronero.png'
      }
    ]
  },
  audio: {
    musicVolume: { maxVolume: 0.4, minVolume: 0.0, defaultOn: true },
    sfxVolume: 0.8,
    keyMusicIndices: {
      mainMenuTheme: 0,
      costaRicaMapTheme: 1,
      creditsTheme: 23,
      victoryShortJingle: 24,
      defeatShortJingle: 25,
      victoryLongTheme: 26,
      defeatLongTheme: 27,
      introDialoguesTheme: 28
    },
    keySfxIndices: {
      itemPickup: 29,
      explosionBoom: 30,
      doorCreak: 31,
      ghostlyMoan: 32,
      coinTransaction: 35,
      quizCorrectOrWin: 36,
      quizWrongOrAlert: 37,
      uiButtonClick: 38,
      uiButtonBack: 39,
      cameraShutter: 40,
      swimStroke: 41,
      lightsOff: 42,
      shaveIceRaspar: 43,
      pickCoffeeBean: 44,
      boatMotor: 45,
      ratSqueak: 46,
      crowdCheer: 47
    },
    musicTracks,
    soundEffects
  },
  fonts: fontsCatalog.map((f) => ({
    name: f.name,
    file: f.extractedFile,
    format: f.extension,
    byteLength: f.byteLength
  })),
  uiScreens: {
    mainTitle: {
      sceneIndex: 0,
      sceneName: 'Main',
      musicIndex: 0,
      backgroundSprite: 'sprites/fondo.png',
      logoSprite: 'sprites/Logo Costa Rica Final Grande.png',
      buttonSprite: 'sprites/boton_2.png',
      buttons: [
        { id: 'btn_Nuevo', label: 'New Game', targetSceneIndex: 3, targetSceneName: 'NewGameWarning' },
        { id: 'btn_Continuar', label: 'Continue', targetSceneIndex: 7, targetSceneName: 'MapaCostaRica', action: 'GameControl.LoadData()' }
      ]
    },
    newGameWarning: {
      sceneIndex: 3,
      sceneName: 'NewGameWarning',
      backgroundSprite: 'sprites/fondo.png',
      warningText: 'Warning: starting a new game will delete all your previous data.\n\nAre you sure you want to go on?',
      buttons: [
        { id: 'btn_Nuevo', label: 'Yes, start a new game', targetSceneIndex: 5, targetSceneName: 'SelecGenero', action: 'GameControl.ResetData()' },
        { id: 'btn_Cancelar', label: 'No, go back', targetSceneIndex: 0, targetSceneName: 'Main' }
      ]
    },
    characterGenderSelect: {
      sceneIndex: 5,
      sceneName: 'SelecGenero',
      backgroundSprite: 'sprites/fondo.png',
      title1: 'Choose a \ncharacter',
      title2: 'Please tell me.\nAre you a boy? \nOr are you a girl?',
      buttons: [
        { id: 'btn_Male', label: 'Mike', characterBool: false, targetSceneIndex: 4, targetSceneName: 'SelecScreen' },
        { id: 'btn_Female', label: 'Lisa', characterBool: true, targetSceneIndex: 4, targetSceneName: 'SelecScreen' }
      ]
    },
    characterIntroDialogue: {
      sceneIndex: 4,
      sceneName: 'SelecScreen',
      musicIndex: 28,
      backgroundSprite: 'sprites/fondo.png',
      maleTitle: "Mike, Costa Rica it's a wonderful country, a lot of adventures waits!",
      femaleTitle: "Lisa, Costa Rica it's a wonderful country, a lot of adventures waits!",
      nextSceneIndex: 6,
      nextSceneName: 'AdventureStart'
    },
    adventureStart: {
      sceneIndex: 6,
      sceneName: 'AdventureStart',
      backgroundSprite: 'sprites/fondo.png',
      bodyText: "Costa Rica is a wonderful country!\n\nLots of adventures await for you.\n\nLet's get started!",
      startButtonLabel: 'START',
      targetSceneIndex: 7,
      targetSceneName: 'MapaCostaRica'
    },
    optionsMenu: {
      sceneIndex: 10,
      sceneName: 'Opciones',
      musicIndex: 28,
      backgroundSprite: 'sprites/fondo.png',
      title: 'Options',
      playMusicButtonLabel: 'Play music',
      stopMusicButtonLabel: 'No music',
      backButtonLabel: 'Back to game title',
      targetSceneIndex: 0
    },
    globalHudAndModals: {
      topBar: {
        backgroundColorRGBA: [0.278, 0.608, 0.839, 1],
        menuButtonSprite: 'sprites/options_button.png',
        cancelMinigameButtonSprite: 'sprites/boton_cerrar.png',
        coinIconSprite: 'sprites/es-moneda.png',
        dollIconSprite: 'sprites/doll-icon.png',
        logIconSprite: 'sprites/logicon.png',
        basketIconSprite: 'sprites/Tilemap_cafetal_32x32 V2_44.png',
        flowerIconSprite: 'sprites/flores.png',
        deliveriesLabel: 'Deliveries:'
      },
      pauseMainMenuModal: {
        title: 'Main Menu',
        backgroundSprite: 'sprites/fondo_mid.png',
        items: [
          { id: 'NuevaPartida', label: 'New Game', icon: 'sprites/newGame.png', targetSceneIndex: 3 },
          { id: 'Glosario', label: 'Keywords', icon: 'sprites/icono_glosario.png', targetSceneIndex: 8 },
          { id: 'Creditos', label: 'Credits', icon: 'sprites/icono_creditos.png', targetSceneIndex: 9 },
          { id: 'Opciones', label: 'Options', icon: 'sprites/icono_creditos copy.png', targetSceneIndex: 10 },
          { id: 'Salir', label: 'Exit', icon: 'sprites/icono_exit.png', action: 'ExitToTitle' }
        ]
      },
      cancelGameModal: {
        promptText: 'Do you want to exit the current game?',
        yesLabel: 'Yes',
        noLabel: 'No',
        buttonSprite: 'sprites/boton_2.png'
      },
      reloadGameModal: {
        promptText: 'Do you want to try again?',
        yesLabel: 'Yes',
        noLabel: 'Return to map',
        buttonSprite: 'sprites/boton_2.png'
      },
      loadingScreen: {
        label: 'Loading',
        logoSprite: 'sprites/Logo Costa Rica Final copy.png',
        backgroundSprite: 'sprites/fondo.png'
      },
      gameEndingModal: {
        congratulationsText: 'Hope you have enjoyed \nyour stay in Costa Rica!  \n\n\nWe hope to see you back soon!',
        buttonLabel: 'Credits',
        targetSceneIndex: 9,
        musicIndex: 26,
        musicFile: 'audio/Ganar (largo).m4a',
        starSprites: {
          left: 'sprites/star_left.png',
          center: 'sprites/star_center.png',
          right: 'sprites/star_right.png'
        }
      }
    }
  }
};

fs.writeFileSync(path.join(OUT_DATA_DIR, 'gameConfig.json'), JSON.stringify(gameConfig, null, 2), 'utf8');
console.log('Generated app/src/data/gameConfig.json');

// ============================================================================
// 4. Build 2: app/src/data/provinces.json
// ============================================================================
const provincesData = [
  {
    id: 0,
    enumName: 'SanJose',
    code: 'SJ',
    storageKey: 'CRPVMW_level_0',
    nameEs: 'San José',
    nameEn: 'San José',
    welcomeTitle: 'Welcome to San José!',
    isStartingProvince: true,
    coatOfArmsSprite: 'sprites/EscudoSanJosé.png',
    mapHitboxSprite: 'sprites/mapPack_spritesheet_74.png',
    mapBackgroundSprite: 'sprites/mapa_cr2.png',
    panelBackgroundSprite: 'sprites/fondo 1.png',
    mapCoordinates: {
      anchoredPosition: [-46.9, 40.9],
      sizeDelta: [46.3, 50.0],
      defaultPlayerPinPosition: [-22.0, 42.1]
    },
    welcomeAudio: {
      female: { soundIndex: 53, clipName: 'welcome san jose fem', file: 'audio/welcome san jose fem.m4a', durationSeconds: 1.5699 },
      male: { soundIndex: 52, clipName: 'welcome san jose male', file: 'audio/welcome san jose male.m4a', durationSeconds: 1.401 }
    },
    ambientMusic: {
      mapMusicIndex: 1,
      mapMusicFile: 'audio/Tema del juego 2.m4a'
    },
    culturalDescriptionEn:
      'San José is the capital and most populated province of Costa Rica, located in the Central Valley. Surrounded by lush coffee plantations, cloud forests, and mountain rivers like the Reventazón and Pacuare, it is home to architectural landmarks such as the National Theater, the Pre-Columbian Gold Museum (Museo del Oro Precolombino), and Chirripó National Park.',
    culturalDescriptionEs:
      'San José es la capital y la provincia más poblada de Costa Rica, ubicada en el Valle Central. Rodeada de cafetales, bosques nubosos y ríos de montaña, alberga el Teatro Nacional, el Museo del Oro Precolombino y el Parque Nacional Chirripó.',
    highlights: [
      'Coffee Farming in the Central Valley & Los Santos region',
      'Pre-Columbian Gold Museum (Museo del Oro Precolombino) & Plaza de la Cultura',
      'White-water Rafting on tropical mountain rivers',
      'Chirripó National Park (highest peak in Costa Rica)'
    ],
    minigames: [
      {
        id: 'SJ_FincaCafetalera',
        starPieceIndex: 0,
        starPieceSprite: 'sprites/star_left.png',
        buttonLabel: 'Coffee Farming',
        titleEs: 'Finca Cafetalera',
        introSceneIndex: 47,
        introSceneName: 'SJ_FincaCafetalera_Intro',
        gameSceneIndex: 48,
        gameSceneName: 'SJ_FincaCafetalera',
        bannerSprite: 'sprites/02-CoffeeFarm.png'
      },
      {
        id: 'SJ_Museo_Oro',
        starPieceIndex: 1,
        starPieceSprite: 'sprites/star_center.png',
        buttonLabel: 'Find the "Museo del Oro"',
        titleEs: 'Museo del Oro Precolombino',
        introSceneIndex: 49,
        introSceneName: 'SJ_Museo_Oro_Intro',
        gameSceneIndex: 50,
        gameSceneName: 'SJ_Museo_Oro',
        bannerSprite: 'sprites/03-MuseoDelOro.png'
      },
      {
        id: 'SJ_Rafting',
        starPieceIndex: 2,
        starPieceSprite: 'sprites/star_right.png',
        buttonLabel: 'Rafting',
        titleEs: 'Rafting en el Río',
        introSceneIndex: 51,
        introSceneName: 'SJ_Rafting_Intro',
        gameSceneIndex: 52,
        gameSceneName: 'SJ_Rafting',
        bannerSprite: 'sprites/BG_SJ_Rafting.png'
      }
    ]
  },
  {
    id: 1,
    enumName: 'Heredia',
    code: 'HD',
    storageKey: 'CRPVMW_level_1',
    nameEs: 'Heredia',
    nameEn: 'Heredia',
    welcomeTitle: 'Welcome to Heredia!',
    isStartingProvince: false,
    coatOfArmsSprite: 'sprites/EscudoHeredia.png',
    mapHitboxSprite: 'sprites/mapPack_spritesheet_60.png',
    mapBackgroundSprite: 'sprites/mapa_cr2.png',
    panelBackgroundSprite: 'sprites/fondo 1.png',
    mapCoordinates: {
      anchoredPosition: [24.71, 167.8],
      sizeDelta: [58.9, 53.6]
    },
    welcomeAudio: {
      female: { soundIndex: 59, clipName: 'welcome heredia fem', file: 'audio/welcome heredia fem.m4a', durationSeconds: 1.6097 },
      male: { soundIndex: 58, clipName: 'welcome heredia male', file: 'audio/welcome heredia male.m4a', durationSeconds: 1.4308 }
    },
    ambientMusic: {
      mapMusicIndex: 1,
      mapMusicFile: 'audio/Tema del juego 2.m4a'
    },
    culturalDescriptionEn:
      'Known as "The City of Flowers" (La Ciudad de las Flores), Heredia is famous for its vibrant floriculture, historic adobe architecture, traditional Barva masquerade parades (Mascaradas), Barva Volcano, Braulio Carrillo National Park, and La Paz Waterfall Gardens.',
    culturalDescriptionEs:
      'Conocida como "La Ciudad de las Flores", Heredia destaca por su floricultura, sus tradicionales mascaradas de Barva, el Volcán Barva, el Parque Nacional Braulio Carrillo y las cataratas de La Paz.',
    highlights: [
      'Traditional Masquerade Parades (Mascaradas) in Barva',
      'Floriculture and Flower Delivery in the City of Flowers',
      'Mountain Biking across Bosque de la Hoja & Barva Volcano trails',
      'Braulio Carrillo National Park & Sarapiquí rainforest'
    ],
    minigames: [
      {
        id: 'HD_Mascarada',
        starPieceIndex: 0,
        starPieceSprite: 'sprites/star_left.png',
        buttonLabel: 'Masquerade Parade',
        titleEs: 'Desfile de Mascaradas',
        introSceneIndex: 31,
        introSceneName: 'HD_Mascarada_Intro',
        gameSceneIndex: 32,
        gameSceneName: 'HD_Mascarada',
        bannerSprite: 'sprites/mascarada.png'
      },
      {
        id: 'HD_Entregar_Flores',
        starPieceIndex: 1,
        starPieceSprite: 'sprites/star_center.png',
        buttonLabel: 'Delivering Flowers',
        titleEs: 'Reparto de Flores',
        introSceneIndex: 29,
        introSceneName: 'HD_Entregar_Flores_Intro',
        gameSceneIndex: 30,
        gameSceneName: 'HD_Entregar_Flores',
        bannerSprite: 'sprites/Floristeria Daniela Rose.png'
      },
      {
        id: 'HD_Mountainbike',
        starPieceIndex: 2,
        starPieceSprite: 'sprites/star_right.png',
        buttonLabel: 'Mountain Biking',
        titleEs: 'Ciclismo de Montaña',
        introSceneIndex: 33,
        introSceneName: 'HD_Mountainbike_Intro',
        gameSceneIndex: 34,
        gameSceneName: 'HD_Mountainbike',
        bannerSprite: 'sprites/bosquehoja.png'
      }
    ]
  },
  {
    id: 2,
    enumName: 'Cartago',
    code: 'CT',
    storageKey: 'CRPVMW_level_2',
    nameEs: 'Cartago',
    nameEn: 'Cartago',
    welcomeTitle: 'Welcome to Cartago!',
    isStartingProvince: false,
    coatOfArmsSprite: 'sprites/EscudoCartago.png',
    mapHitboxSprite: 'sprites/mapPack_spritesheet_18.png',
    mapBackgroundSprite: 'sprites/mapa_cr2.png',
    panelBackgroundSprite: 'sprites/fondo 1.png',
    mapCoordinates: {
      anchoredPosition: [102.8, 26.5],
      sizeDelta: [50.0, 50.0]
    },
    welcomeAudio: {
      female: { soundIndex: 51, clipName: 'welcome to cartago fem', file: 'audio/welcome to cartago fem.m4a', durationSeconds: 1.5898 },
      male: { soundIndex: 50, clipName: 'welcome to cartago male', file: 'audio/welcome to cartago male.m4a', durationSeconds: 1.406 }
    },
    ambientMusic: {
      mapMusicIndex: 1,
      mapMusicFile: 'audio/Tema del juego 2.m4a'
    },
    culturalDescriptionEn:
      'Cartago was the first capital of Costa Rica until 1823. Nestled in the fertile Orosi and Guarco valleys, it is home to the majestic Irazú and Turrialba volcanoes, the historic Sanatorio Carlos Durán, the Guayabo National Monument, and the Basilica of Our Lady of the Angels.',
    culturalDescriptionEs:
      'Cartago fue la antigua capital colonial de Costa Rica. Ubicada entre fértiles valles montañosos, alberga los volcanes Irazú y Turrialba, el histórico Sanatorio Carlos Durán, el Monumento Nacional Guayabo y la Basílica de Nuestra Señora de los Ángeles.',
    highlights: [
      'Historic Sanatorio Carlos Durán founded in 1918',
      'Irazú Volcano (highest active volcano in Costa Rica) & Turrialba Volcano',
      'Basilica of Our Lady of the Angels (La Negrita pilgrimage)',
      'Guayabo National Monument & Orosi Valley'
    ],
    minigames: [
      {
        id: 'CT_Sanatorio_Duran',
        starPieceIndex: 0,
        starPieceSprite: 'sprites/star_left.png',
        buttonLabel: 'Sanatorio Durán',
        titleEs: 'Sanatorio Durán',
        introSceneIndex: 17,
        introSceneName: 'CT_Sanatorio_Duran_Intro',
        gameSceneIndex: 18,
        gameSceneName: 'CT_Sanatorio_Duran',
        bannerSprite: 'sprites/sanatorio.png'
      },
      {
        id: 'CT_Volcanes',
        starPieceIndex: 1,
        starPieceSprite: 'sprites/star_center.png',
        buttonLabel: 'Volcanoes Challenge',
        titleEs: 'Reto de los Volcanes',
        introSceneIndex: 19,
        introSceneName: 'CT_Volcanes_Intro',
        gameSceneIndex: 20,
        gameSceneName: 'CT_Volcanes',
        bannerSprite: 'sprites/volcanes.png'
      },
      {
        id: 'CT_Volcanes2',
        starPieceIndex: 2,
        starPieceSprite: 'sprites/star_right.png',
        buttonLabel: 'Volcanoes of Costa Rica',
        titleEs: 'Volcanes de Costa Rica',
        introSceneIndex: 21,
        introSceneName: 'CT_Volcanes2_Intro',
        gameSceneIndex: 22,
        gameSceneName: 'CT_Volcanes2',
        bannerSprite: 'sprites/volcanes.png'
      }
    ]
  },
  {
    id: 3,
    enumName: 'Alajuela',
    code: 'AL',
    storageKey: 'CRPVMW_level_3',
    nameEs: 'Alajuela',
    nameEn: 'Alajuela',
    welcomeTitle: 'Welcome to Alajuela!',
    isStartingProvince: false,
    coatOfArmsSprite: 'sprites/EscudoAlajuela.png',
    mapHitboxSprite: 'sprites/mapPack_spritesheet_46.png',
    mapBackgroundSprite: 'sprites/mapa_cr2.png',
    panelBackgroundSprite: 'sprites/fondo 1.png',
    mapCoordinates: {
      anchoredPosition: [-83.1, 162.1],
      sizeDelta: [69.5, 66.8]
    },
    welcomeAudio: {
      female: { soundIndex: 49, clipName: 'welcome alajuela fem', file: 'audio/welcome alajuela fem.m4a', durationSeconds: 1.6395 },
      male: { soundIndex: 48, clipName: 'welcome alajuela male', file: 'audio/welcome alajuela male.m4a', durationSeconds: 1.5451 }
    },
    ambientMusic: {
      mapMusicIndex: 1,
      mapMusicFile: 'audio/Tema del juego 2.m4a'
    },
    culturalDescriptionEn:
      'Known as the "City of Mangoes" and birthplace of national hero Juan Santamaría, Alajuela encompasses diverse landscapes including Arenal Volcano, Poás Volcano, Laguna del Hule, Caño Negro Wildlife Refuge, La Fortuna Waterfall, and the artisan town of Sarchí famous for its colorful painted oxcarts.',
    culturalDescriptionEs:
      'Conocida como la "Ciudad de los Mangos" y cuna del héroe nacional Juan Santamaría, Alajuela abarca el Volcán Arenal, el Volcán Poás, la Laguna del Hule, el Refugio Caño Negro y la cuna de la artesanía costarricense en Sarchí.',
    highlights: [
      'Arenal Lake & Laguna del Hule Triathlon (Biking, Running, and Swimming Races)',
      'Poás & Arenal Volcano National Parks',
      'Sarchí Traditional Painted Oxcarts (UNESCO Intangible Cultural Heritage)',
      'Juan Santamaría Historical Museum & Butterfly Sanctuaries'
    ],
    minigames: [
      {
        id: 'AL_Ciclismo',
        starPieceIndex: 0,
        starPieceSprite: 'sprites/star_left.png',
        buttonLabel: 'Biking Race',
        titleEs: 'Carrera de Ciclismo',
        introSceneIndex: 11,
        introSceneName: 'AL_Ciclismo_Intro',
        gameSceneIndex: 12,
        gameSceneName: 'AL_Ciclismo',
        bannerSprite: 'sprites/arenallago.png'
      },
      {
        id: 'AL_Correr',
        starPieceIndex: 1,
        starPieceSprite: 'sprites/star_center.png',
        buttonLabel: 'Running Race',
        titleEs: 'Carrera de Atletismo',
        introSceneIndex: 13,
        introSceneName: 'AL_Correr_Intro',
        gameSceneIndex: 14,
        gameSceneName: 'AL_Correr',
        bannerSprite: 'sprites/arenallago.png'
      },
      {
        id: 'Al_Natacion',
        starPieceIndex: 2,
        starPieceSprite: 'sprites/star_right.png',
        buttonLabel: 'Swimming Race',
        titleEs: 'Carrera de Natación',
        introSceneIndex: 15,
        introSceneName: 'AL_Natacion_Intro',
        gameSceneIndex: 16,
        gameSceneName: 'Al_Natacion',
        bannerSprite: 'sprites/arenallago.png'
      }
    ]
  },
  {
    id: 4,
    enumName: 'Puntareanas',
    code: 'PR',
    storageKey: 'CRPVMW_level_4',
    nameEs: 'Puntarenas',
    nameEn: 'Puntarenas',
    welcomeTitle: 'Welcome to Puntarenas!',
    isStartingProvince: false,
    coatOfArmsSprite: 'sprites/EscudoPuntarenas.png',
    mapHitboxSprite: 'sprites/mapPack_spritesheet_32.png',
    mapBackgroundSprite: 'sprites/mapa_cr2.png',
    panelBackgroundSprite: 'sprites/fondo 1.png',
    mapCoordinates: {
      anchoredPosition: [218.3, -146.4],
      sizeDelta: [76.6, 66.8]
    },
    welcomeAudio: {
      female: { soundIndex: 55, clipName: 'welcome puntarenas fem', file: 'audio/welcome puntarenas fem.m4a', durationSeconds: 1.5898 },
      male: { soundIndex: 54, clipName: 'welcome puntarenas male', file: 'audio/welcome puntarenas male.m4a', durationSeconds: 1.9277 }
    },
    ambientMusic: {
      mapMusicIndex: 1,
      mapMusicFile: 'audio/Tema del juego 2.m4a'
    },
    culturalDescriptionEn:
      'Stretching along most of Costa Rica’s Pacific coast, Puntarenas is renowned for the Paseo de los Turistas and its iconic "Churchill" snow cones, Manuel Antonio National Park, the Tárcoles River crocodile habitat, Monteverde Cloud Forest, Corcovado National Park, and Cocos Island.',
    culturalDescriptionEs:
      'Extendida a lo largo de la costa pacífica costarricense, Puntarenas es famosa por el Paseo de los Turistas y su tradicional "Churchill", el Parque Nacional Manuel Antonio, el río Tárcoles, el Bosque Nuboso de Monteverde y la Isla del Coco.',
    highlights: [
      'Paseo de los Turistas & traditional Churchill shaved ice dessert',
      'Manuel Antonio National Park wildlife conservation',
      'Environmental protection & cleanup of the Tárcoles River',
      'Monteverde Cloud Forest, Corcovado & Cocos Island'
    ],
    minigames: [
      {
        id: 'PR_Paseo_Turistas',
        starPieceIndex: 0,
        starPieceSprite: 'sprites/star_left.png',
        buttonLabel: 'Churchill Express',
        titleEs: 'Expreso de Churchills en el Paseo de los Turistas',
        introSceneIndex: 43,
        introSceneName: 'PR_Paseo_Turistas_Intro',
        gameSceneIndex: 44,
        gameSceneName: 'PR_Paseo_Turistas',
        bannerSprite: 'sprites/puntarenas.png'
      },
      {
        id: 'PR_Manuel_Antonio',
        starPieceIndex: 1,
        starPieceSprite: 'sprites/star_center.png',
        buttonLabel: 'Picnic in Manuel Antonio',
        titleEs: 'Picnic en Manuel Antonio',
        introSceneIndex: 41,
        introSceneName: 'PR_Manuel_Antonio_Intro',
        gameSceneIndex: 42,
        gameSceneName: 'PR_Manuel_Antonio',
        bannerSprite: 'sprites/manuelantonio.png'
      },
      {
        id: 'PR_Tarcoles',
        starPieceIndex: 2,
        starPieceSprite: 'sprites/star_right.png',
        buttonLabel: "Let's clean Tárcoles River",
        titleEs: 'Limpiemos el Río Tárcoles',
        introSceneIndex: 45,
        introSceneName: 'PR_Tarcoles_Intro',
        gameSceneIndex: 46,
        gameSceneName: 'PR_Tarcoles',
        bannerSprite: 'sprites/tarcoles.png'
      }
    ]
  },
  {
    id: 5,
    enumName: 'Guanacaste',
    code: 'GN',
    storageKey: 'CRPVMW_level_5',
    nameEs: 'Guanacaste',
    nameEn: 'Guanacaste',
    welcomeTitle: 'Welcome to Guanacaste!',
    isStartingProvince: false,
    coatOfArmsSprite: 'sprites/EscudoGuanacaste.png',
    mapHitboxSprite: 'sprites/mapPack_spritesheet_31.png',
    mapBackgroundSprite: 'sprites/mapa_cr2.png',
    panelBackgroundSprite: 'sprites/fondo 1.png',
    mapCoordinates: {
      anchoredPosition: [-309.6, 170.9],
      sizeDelta: [85.1, 69.5]
    },
    welcomeAudio: {
      female: { soundIndex: 61, clipName: 'welcome guanacaste fem', file: 'audio/welcome guanacaste fem.m4a', durationSeconds: 1.6892 },
      male: { soundIndex: 60, clipName: 'welcome guanacaste male', file: 'audio/welcome guanacaste male.m4a', durationSeconds: 1.5923 }
    },
    ambientMusic: {
      mapMusicIndex: 1,
      mapMusicFile: 'audio/Tema del juego 2.m4a'
    },
    culturalDescriptionEn:
      'Located in northwestern Costa Rica, Guanacaste is celebrated for its tropical dry forests, golden Pacific beaches like Tamarindo and Playas del Coco, world-class surfing and scuba diving, the limestone caverns of Barra Honda National Park, Rincón de la Vieja Volcano, and rich "Sabanero" (cowboy) folklore and marimba music.',
    culturalDescriptionEs:
      'Ubicada en el noroeste del país, Guanacaste destaca por su bosque tropical seco, playas como Tamarindo y Playas del Coco, el Parque Nacional Barra Honda y sus cavernas, el Volcán Rincón de la Vieja y su rica tradición cultural sabanera.',
    highlights: [
      'Scuba Diving & Marine Photography at Playas del Coco',
      'Surfing Pacific Waves at Tamarindo Beach',
      'Speleology in the Limestone Caverns of Barra Honda National Park',
      'Santa Rosa & Rincón de la Vieja National Parks'
    ],
    minigames: [
      {
        id: 'GN_Buceo',
        starPieceIndex: 0,
        starPieceSprite: 'sprites/star_left.png',
        buttonLabel: 'Playas del Coco Diving',
        titleEs: 'Buceo en Playas del Coco',
        introSceneIndex: 25,
        introSceneName: 'GN_Buceo_Intro',
        gameSceneIndex: 26,
        gameSceneName: 'GN_Buceo',
        bannerSprite: 'sprites/elcoco.png'
      },
      {
        id: 'GN_Surf_Tamarindo',
        starPieceIndex: 1,
        starPieceSprite: 'sprites/star_center.png',
        buttonLabel: 'Tamarindo Surfing',
        titleEs: 'Surf en Tamarindo',
        introSceneIndex: 27,
        introSceneName: 'GN_Surf_Tamarindo_Intro',
        gameSceneIndex: 28,
        gameSceneName: 'GN_Surf_Tamarindo',
        bannerSprite: 'sprites/tamarindo.png'
      },
      {
        id: 'GN_BarraHonda',
        starPieceIndex: 2,
        starPieceSprite: 'sprites/star_right.png',
        buttonLabel: 'Barra Honda Caverns',
        titleEs: 'Cavernas de Barra Honda',
        introSceneIndex: 23,
        introSceneName: 'GN_BarraHonda_Intro',
        gameSceneIndex: 24,
        gameSceneName: 'GN_BarraHonda',
        bannerSprite: 'sprites/barrahonda.png'
      }
    ]
  },
  {
    id: 6,
    enumName: 'Limon',
    code: 'LM',
    storageKey: 'CRPVMW_level_6',
    nameEs: 'Limón',
    nameEn: 'Limón',
    welcomeTitle: 'Welcome to Limón!',
    isStartingProvince: false,
    coatOfArmsSprite: 'sprites/EscudoLimon.png',
    mapHitboxSprite: 'sprites/mapPack_spritesheet_17.png',
    mapBackgroundSprite: 'sprites/mapa_cr2.png',
    panelBackgroundSprite: 'sprites/fondo 1.png',
    mapCoordinates: {
      anchoredPosition: [167.6, 117.6],
      sizeDelta: [68.3, 58.3]
    },
    welcomeAudio: {
      female: { soundIndex: 57, clipName: 'welcome limon fem', file: 'audio/welcome limon fem.m4a', durationSeconds: 1.3911 },
      male: { soundIndex: 56, clipName: 'welcome limon male', file: 'audio/welcome limon male.m4a', durationSeconds: 1.4507 }
    },
    ambientMusic: {
      mapMusicIndex: 1,
      mapMusicFile: 'audio/Tema del juego 2.m4a'
    },
    culturalDescriptionEn:
      'Spanning the entire Caribbean coast of Costa Rica, Limón is a vibrant multicultural province shaped by Afro-Caribbean and Indigenous Bribri and Cabécar heritage. It is famous for its Afro-Caribbean cuisine (Rice and Beans, Rondón, Patty, Pan Bon, Agua de Sapo), Calypso music, Cahuita Coral Reefs, and the canals and sea turtle nesting beaches of Tortuguero National Park.',
    culturalDescriptionEs:
      'A lo largo de toda la costa caribeña de Costa Rica, Limón es una provincia multicultural con una rica herencia afrocaribeña e indígena Bribri y Cabécar, famosa por su gastronomía caribeña, el calipso, el Parque Nacional Cahuita y los canales y playas de desove de tortugas en Tortuguero.',
    highlights: [
      'Traditional Afro-Caribbean Cuisine (Rice and Beans, Patty, Rondón, Agua de Sapo, Pan Bon)',
      'Canal Boat Exploration & Manatee Spotting in Tortuguero National Park',
      'Sea Turtle Nesting & Hatchling Protection on Tortuguero Beach',
      'Cahuita National Park & Indigenous Bribri/Cabécar Territories in Talamanca'
    ],
    minigames: [
      {
        id: 'Lm_Cocina',
        starPieceIndex: 0,
        starPieceSprite: 'sprites/star_left.png',
        buttonLabel: 'Caribbean Cuisine',
        titleEs: 'Cocina Caribeña',
        introSceneIndex: 35,
        introSceneName: 'Lm_Cocina_Intro',
        gameSceneIndex: 36,
        gameSceneName: 'Lm_Cocina',
        bannerSprite: 'sprites/Negra Juego de Cocinar_0.png'
      },
      {
        id: 'LM_Tortuguero',
        starPieceIndex: 1,
        starPieceSprite: 'sprites/star_center.png',
        buttonLabel: 'Tortuguero Boat Trip',
        titleEs: 'Paseo en Bote por Tortuguero',
        introSceneIndex: 37,
        introSceneName: 'LM_Tortuguero_Intro',
        gameSceneIndex: 38,
        gameSceneName: 'LM_Tortuguero',
        bannerSprite: 'sprites/tortuguero.png'
      },
      {
        id: 'LM_Desove',
        starPieceIndex: 2,
        starPieceSprite: 'sprites/star_right.png',
        buttonLabel: 'Saving Turtles',
        titleEs: 'Protegiendo el Desove de Tortugas',
        introSceneIndex: 39,
        introSceneName: 'LM_Desove_Intro',
        gameSceneIndex: 40,
        gameSceneName: 'LM_Desove',
        bannerSprite: 'sprites/desove.png'
      }
    ]
  }
];

for (const prov of provincesData) {
  const pqBank = popquizRaw.find((b) => b.questions?.[0]?.provinceId === prov.id);
  prov.popQuizCount = pqBank ? pqBank.questionCount : 0;
}

fs.writeFileSync(
  path.join(OUT_DATA_DIR, 'provinces.json'),
  JSON.stringify(
    {
      totalProvinces: provincesData.length,
      totalMinigames: 21,
      mapSceneIndex: 7,
      mapSceneName: 'MapaCostaRica',
      mapSprites: {
        windowBackground: 'sprites/fondo.png',
        costaRicaMap: 'sprites/mapa_cr2.png',
        starEmptyFrame: 'sprites/star_cero.png',
        starPieceLeft: 'sprites/star_left.png',
        starPieceCenter: 'sprites/star_center.png',
        starPieceRight: 'sprites/star_right.png',
        modalBackground: 'sprites/fondo 1.png',
        primaryButton: 'sprites/boton_2.png',
        secondaryButton: 'sprites/boton_3.png',
        checkboxBackground: 'sprites/UISprite.png',
        checkboxCheckmark: 'sprites/Checkmark.png'
      },
      mapModals: {
        confirmRegionChange: {
          promptText: 'Do you want to move to this province?\n\nYou must spend 1000 coins to travel \nand answer a question.',
          actualCoinsDeductedInCode: 5000,
          yesButtonLabel: "Yes, let's go!",
          noButtonLabel: 'Back to map'
        },
        insufficientCoinsAlert: {
          promptText: 'You must get more coins to travel to new locations.',
          returnButtonLabel: 'Return to map',
          sfxIndex: 37,
          sfxFile: 'audio/wrong.m4a'
        },
        popQuizModal: {
          evaluateButtonLabel: 'Evaluate',
          backButtonLabel: 'Back',
          correctSfxIndex: 36,
          correctSfxFile: 'audio/win-sound.m4a',
          wrongSfxIndex: 37,
          wrongSfxFile: 'audio/wrong.m4a'
        }
      },
      provinces: provincesData
    },
    null,
    2
  ),
  'utf8'
);
console.log('Generated app/src/data/provinces.json');

// ============================================================================
// 5. Build 3: app/src/data/popquiz.json
// ============================================================================
const popquizByProvince = [];
const allQuestionsFlat = [];

const sortedBanks = [...popquizRaw].sort(
  (a, b) => (a.questions?.[0]?.provinceId ?? 0) - (b.questions?.[0]?.provinceId ?? 0)
);

for (const bank of sortedBanks) {
  const bankProvId = bank.questions?.[0]?.provinceId ?? 0;
  const provMeta = provincesData.find((p) => p.id === bankProvId);
  const formattedQuestions = bank.questions.map((q, idx) => {
    const audioEntry = audioByName.get(q.audioClipName) || null;
    const correctCount = q.answers.filter((a) => a.isCorrect === true).length;
    const isMultiple = Boolean(q.isMultipleChoice);
    const minScore = q.pointsOrCorrectCount;
    const qId = `PQ_${provMeta.code}_${String(idx + 1).padStart(2, '0')}`;

    const item = {
      id: qId,
      provinceId: bankProvId,
      provinceCode: provMeta.code,
      provinceName: provMeta.nameEs,
      gameObjectName: bank.gameObjectName,
      questionIndex: idx,
      questionText: q.questionText,
      questionType: isMultiple ? 'multiple' : 'single',
      uiMode: isMultiple ? 'checkbox_grid_with_evaluate_button' : 'direct_answer_buttons',
      minScore,
      correctOptionsCount: correctCount,
      totalOptionsCount: q.answers.length,
      scoringFormula: 'score = (selectedCorrect * 1) + (selectedIncorrect * -1); passes if score >= minScore',
      questionAudio: {
        clipName: q.audioClipName,
        file: q.audioExtractedFile || (audioEntry ? audioEntry.extractedFile : `audio/${q.audioClipName}.m4a`),
        durationSeconds: audioEntry ? audioEntry.lengthSeconds : null
      },
      options: q.answers.map((ans, ansIdx) => ({
        index: ansIdx,
        text: ans.text,
        isCorrect: Boolean(ans.isCorrect),
        scoreDelta: ans.isCorrect ? 1 : -1
      }))
    };
    allQuestionsFlat.push(item);
    return item;
  });

  popquizByProvince.push({
    provinceId: bankProvId,
    provinceCode: provMeta.code,
    provinceName: provMeta.nameEs,
    coatOfArmsSprite: provMeta.coatOfArmsSprite,
    questionCount: formattedQuestions.length,
    questions: formattedQuestions
  });
}

fs.writeFileSync(
  path.join(OUT_DATA_DIR, 'popquiz.json'),
  JSON.stringify(
    {
      totalBanks: popquizByProvince.length,
      totalQuestions: allQuestionsFlat.length,
      rules: {
        triggerCondition:
          'Triggered when clicking a province on MapaCostaRica that is NOT the player’s currentLocation.',
        costCoins: 5000,
        deductionMoment: 'Coins are checked (>= 5000) and deducted immediately upon confirming travel in NewRegion() before the random question from that province is shown.',
        selectionAlgorithm: 'UnityEngine.Random.Range(0, questions.Length)',
        singleChoiceBehavior:
          'Rendered as up to 6 direct buttons (Respuesta1..Respuesta6). Clicking a correct option (+1 >= minScore) immediately unlocks travel, moves the player avatar, plays sfx 36 (win-sound.m4a), and if the province star state is "000", plays the province welcome voiceover.',
        multipleChoiceBehavior:
          'Rendered as up to 10 toggles in two columns (tglRespuesta1..10) with an "Evaluate" button (btnEvaluar). Each checked correct option adds +1 and each checked wrong option subtracts -1 (PreguntaController.OptionValue). Clicking "Evaluate" checks if currentScore >= minScore.',
        onWrongAnswer:
          'Plays sfx 37 (wrong.m4a), closes PanelPregunta without refunding the travel fee, and leaves player at previous location.'
      },
      byProvince: popquizByProvince,
      questions: allQuestionsFlat
    },
    null,
    2
  ),
  'utf8'
);
console.log('Generated app/src/data/popquiz.json');

// ============================================================================
// 6. Build 4: app/src/data/minigames.json
// ============================================================================
function inferSpeakerFromVoiceClip(clipName, text) {
  const up = (clipName || '').toUpperCase();
  if (up.includes('LISA')) return 'Lisa';
  if (up.includes('MIKE')) return 'Mike';
  if (up.includes('DANIEL ') || up.endsWith('DANIEL') || up.includes('DANIEL_')) return 'Daniel';
  if (up.includes('DANIELA')) return 'Daniela';
  if (up.includes('MARIA')) return 'María';
  if (up.includes('MARICELA')) return 'Maricela';
  if (up.includes('MANUEL') && !up.includes('MANUEL ANTONIO')) return 'Manuel';
  if (up.includes('MIGUEL')) return 'Miguel';
  if (up.includes('ESTER')) return 'Ester';
  if (up.includes('LUIS')) return 'Luis';
  if (up.includes('ANA ')) return 'Ana';
  if (up.includes('GUARDA')) return 'Park Ranger';
  if (up.includes('DOCTOR')) return 'Dr. Carlos Durán';
  if (up.includes('MONJA')) return 'Sister (Nun)';
  if (up.includes('NINA') || up.includes('NIÑA')) return 'Little Girl';
  if (up.includes('CLIENTE') || up.includes('PERSONA') || up.includes('TURISTA')) return 'Townsperson / Tourist';
  return 'Guide / Narrator';
}

function getFungusDialoguesForScene(sceneIdx) {
  const entries = fungusRaw
    .filter((f) => f.sceneIndex === sceneIdx)
    .sort((a, b) => (a.itemId ?? a.componentPathID) - (b.itemId ?? b.componentPathID));
  return entries.map((d, i) => {
    const a = d.voiceOverClip ? audioByName.get(d.voiceOverClip) : null;
    return {
      order: i + 1,
      itemId: d.itemId,
      componentPathID: d.componentPathID,
      character: inferSpeakerFromVoiceClip(d.voiceOverClip, d.storyText),
      portraitSprite: d.portraitSprite || null,
      text: d.storyText,
      voiceAudio: d.voiceOverFile
        ? {
            clipName: d.voiceOverClip,
            file: d.voiceOverFile,
            durationSeconds: a ? a.lengthSeconds : null
          }
        : null
    };
  });
}

function getSceneSpritesList(sceneIdx) {
  const h = sceneHierarchies.get(sceneIdx);
  const fromUI = (h?.uiImages || [])
    .filter((i) => !i.hierarchyPath.startsWith('GameControl') && i.spriteExtractedFile)
    .map((i) => i.spriteExtractedFile);
  const fromShared = (spritesBySource.get(`sharedassets${sceneIdx}.assets`) || []).map((s) => s.extractedFile);
  return [...new Set([...fromShared, ...fromUI])];
}

// Extract the 34 ingredient slots from level36 (Lm_Cocina)
const level36Hierarchy = sceneHierarchies.get(36);
const caribbeanIngredients = (level36Hierarchy?.uiImages || [])
  .filter(
    (i) =>
      i.hierarchyPath.includes('PanelIngredientes') &&
      !i.gameObjectName.startsWith('Slot') &&
      !i.gameObjectName.startsWith('PanelIngredientes')
  )
  .map((i, idx) => {
    const cleanName = i.gameObjectName.trim();
    const isTapaDeDulce = i.spriteExtractedFile === 'sprites/Recetas e ingredientes_40.png';
    return {
      index: idx,
      id: isTapaDeDulce ? 'BrownCaneSugar_TapaDulce' : cleanName.replace(/\s+/g, '_'),
      gameObjectName: cleanName,
      displayNameEn: isTapaDeDulce ? 'Brown cane sugar (Tapa de dulce)' : cleanName,
      panelSlotPath: i.hierarchyPath,
      sprite: i.spriteExtractedFile
    };
  });

const minigamesSpecs = [
  // ==========================================================================
  // PROVINCE 0: SAN JOSÉ
  // ==========================================================================
  {
    id: 'SJ_FincaCafetalera',
    code: 'SJ_01',
    provinceId: 0,
    provinceName: 'San José',
    starPieceIndex: 0,
    starPieceSprite: 'sprites/star_left.png',
    titleEn: 'Coffee Farming',
    titleEs: 'Finca Cafetalera',
    introSceneIndex: 47,
    introSceneName: 'SJ_FincaCafetalera_Intro',
    gameSceneIndex: 48,
    gameSceneName: 'SJ_FincaCafetalera',
    music: {
      introMusicIndex: 28,
      introMusicFile: 'audio/dialogos.m4a',
      gameMusicIndex: 2,
      gameMusicFile: 'audio/San Jose - Finca cafetalera.m4a'
    },
    mechanicType: 'top_down_harvesting_and_delivery',
    controls: {
      movement: 'Arrow keys / WASD / Virtual Joystick',
      actionButton: 'Space / Left Click / "Pick" button',
      touchButtonLabel: 'Pick'
    },
    timerSeconds: 120,
    hintCost: 0,
    rewardFormula: 'coinsEarned = max(0, (redBeans * 10) + (yellowBeans * 5) - (greenBeans * 5))',
    winCondition: 'Complete the 120-second coffee harvest shift and deliver collected coffee cherries to the receiver (Recibidor). Registers star piece (0, 0, "1").',
    loseCondition: 'None (time-based score attack; star piece 0 of San José is awarded when timer finishes).',
    gameData: {
      basketCapacity: 20,
      fullBasketWarningText: 'Your basket is full !',
      pickBeanSfx: { index: 44, file: 'audio/coger_cafe.m4a' },
      deliveryStationName: 'Recibidor (Coffee Receiver Station)',
      beanTypes: [
        {
          type: 'Red (Ripe Coffee Cherry)',
          stateId: 2,
          pointsPerBean: 10,
          description: 'Fully ripe coffee cherry ready for harvesting. Grants maximum profit (+10 coins).',
          sprite: 'sprites/Tilemap_cafetal_32x32 V2_51.png'
        },
        {
          type: 'Yellow (Semi-Ripe Coffee Cherry)',
          stateId: 1,
          pointsPerBean: 5,
          description: 'Maturing coffee cherry. Grants moderate profit (+5 coins).',
          sprite: 'sprites/Tilemap_cafetal_32x32 V2_57.png'
        },
        {
          type: 'Green (Unripe Coffee Cherry)',
          stateId: 0,
          pointsPerBean: -5,
          description: 'Unripe green coffee cherry. Picking it penalizes quality (-5 coins).',
          sprite: 'sprites/Tilemap_cafetal_32x32 V2_64.png'
        }
      ],
      npcHost: {
        name: 'María',
        role: 'Coffee Plantation Manager',
        portraitSprite: 'sprites/Maria Coffee.png',
        introBannerSprite: 'sprites/02-CoffeeFarm.png'
      }
    }
  },
  {
    id: 'SJ_Museo_Oro',
    code: 'SJ_02',
    provinceId: 0,
    provinceName: 'San José',
    starPieceIndex: 1,
    starPieceSprite: 'sprites/star_center.png',
    titleEn: 'Find the "Museo del Oro"',
    titleEs: 'Museo del Oro Precolombino',
    introSceneIndex: 49,
    introSceneName: 'SJ_Museo_Oro_Intro',
    gameSceneIndex: 50,
    gameSceneName: 'SJ_Museo_Oro',
    music: {
      introMusicIndex: 28,
      introMusicFile: 'audio/dialogos.m4a',
      gameMusicIndex: 3,
      gameMusicFile: 'audio/San Jose - Museo del Oro.m4a'
    },
    mechanicType: 'top_down_museum_exploration_and_cultural_dialogue',
    controls: {
      movement: 'Arrow keys / WASD / Virtual Joystick',
      actionButton: 'Space / "Talk" button near NPCs and exhibition pedestals',
      touchButtonLabel: 'Talk'
    },
    timerSeconds: null,
    hintCost: 100,
    rewardFormula: '1000 completion bonus coins + 50 coins per collectible coin / exhibition interaction',
    winCondition: 'Explore all 4 Exhibition Rooms, inspect the pre-Columbian gold, jade, and stone artifacts, and talk to Maricela at the museum exit. Registers star piece (0, 1, "1").',
    loseCondition: 'None (exploratory cultural museum tour).',
    gameData: {
      introBannerSprite: 'sprites/03-MuseoDelOro.png',
      museumRooms: [
        {
          roomId: 1,
          name: 'Exhibition Room 1: Gold Working & Metallurgy',
          highlights: [
            'Pre-Columbian gold pendants (eagles, frogs, jaguars, shamans)',
            'Alloys of gold and copper (Tumbaga) crafted by Indigenous metallurgy'
          ]
        },
        {
          roomId: 2,
          name: 'Exhibition Room 2: Social Hierarchy & Shamans',
          highlights: [
            'Ceremonial breastplates, pectorals, bells, and headbands',
            'Spiritual symbolism of amphibians, reptiles, and birds of prey'
          ]
        },
        {
          roomId: 3,
          name: 'Exhibition Room 3: Daily Life, Stone & Ceramic Art',
          highlights: [
            'Stone metates, ceremonial tripods, and Diquís stone spheres',
            'Polychrome pottery and trade networks across Central America'
          ]
        },
        {
          roomId: 4,
          name: 'Exhibition Room 4: Numismatics & History of Costa Rican Currency',
          highlights: [
            'First coins minted in Costa Rica and evolution of the Colón',
            'Coffee "Boleto" tokens used on 19th-century coffee plantations'
          ]
        }
      ],
      npcs: ['Daniel (Guide)', 'Maricela (Museum Curator)', 'Museum Visitors & Guards']
    }
  },
  {
    id: 'SJ_Rafting',
    code: 'SJ_03',
    provinceId: 0,
    provinceName: 'San José',
    starPieceIndex: 2,
    starPieceSprite: 'sprites/star_right.png',
    titleEn: 'Rafting',
    titleEs: 'Rafting en el Río',
    introSceneIndex: 51,
    introSceneName: 'SJ_Rafting_Intro',
    gameSceneIndex: 52,
    gameSceneName: 'SJ_Rafting',
    music: {
      introMusicIndex: 28,
      introMusicFile: 'audio/dialogos.m4a',
      gameMusicIndex: 4,
      gameMusicFile: 'audio/San Jose - Rafting.m4a'
    },
    mechanicType: 'river_rapids_obstacle_runner',
    controls: {
      movement: 'Up / Down / Left / Right Arrow keys or Virtual Joystick to steer raft',
      actionButton: 'Dodge rocks, logs, and whirlpools while collecting floating coins',
      touchButtonLabel: 'Steer'
    },
    timerSeconds: null,
    hintCost: 0,
    rewardFormula: 'coinsEarned = collectedCoins + timeBonus (<=45s: 2000, <=60s: 1500, >60s: 1000)',
    winCondition: 'Reach the river finish line collider (TayassuGames.FinishCollider). Registers star piece (0, 2, "1").',
    loseCondition: 'Colliding with rocks slows the raft and reduces time bonus.',
    gameData: {
      introBannerSprite: 'sprites/BG_SJ_Rafting.png',
      obstacles: ['River Rocks', 'Floating Logs', 'Rapid Whirlpools'],
      collectibles: [{ type: 'Coin', value: 50, sprite: 'sprites/es-moneda.png' }]
    }
  },

  // ==========================================================================
  // PROVINCE 1: HEREDIA
  // ==========================================================================
  {
    id: 'HD_Mascarada',
    code: 'HD_01',
    provinceId: 1,
    provinceName: 'Heredia',
    starPieceIndex: 0,
    starPieceSprite: 'sprites/star_left.png',
    titleEn: 'Masquerade Parade',
    titleEs: 'Desfile de Mascaradas',
    introSceneIndex: 31,
    introSceneName: 'HD_Mascarada_Intro',
    gameSceneIndex: 32,
    gameSceneName: 'HD_Mascarada',
    music: {
      introMusicIndex: 28,
      introMusicFile: 'audio/dialogos.m4a',
      gameMusicIndex: 6,
      gameMusicFile: 'audio/Heredia - Mascarada 2.m4a'
    },
    mechanicType: 'side_scrolling_parade_chase_platformer',
    controls: {
      movement: 'Left / Right Arrow keys or Virtual Joystick',
      actionButton: 'Space / "Jump" button to leap over street obstacles',
      touchButtonLabel: 'Jump'
    },
    timerSeconds: null,
    hintCost: 0,
    rewardFormula: '1000 completion bonus coins + (collectedCoins * 50)',
    winCondition: 'Outrun the giant masquerade figures (Mantudos / Gigantas) through the streets of Barva and reach the WinCollider. Registers star piece (1, 0, "1").',
    loseCondition: 'Being caught by the chasing Mascarada figures prompts a retry.',
    gameData: {
      introBannerSprite: 'sprites/mascarada.png',
      npcHost: {
        name: 'Manuel Fernández',
        role: 'Barva Artisan & Masquerade Maker',
        portraitSprite: 'sprites/Local Manuel Fernandez.png'
      },
      chasers: [
        { name: 'La Giganta', sprite: 'sprites/Giganta_anim_0.png' },
        { name: 'El Diablo (The Devil)' },
        { name: 'La Calavera (The Skull)' },
        { name: 'El Policía (The Policeman)' }
      ]
    }
  },
  {
    id: 'HD_Entregar_Flores',
    code: 'HD_02',
    provinceId: 1,
    provinceName: 'Heredia',
    starPieceIndex: 1,
    starPieceSprite: 'sprites/star_center.png',
    titleEn: 'Delivering Flowers',
    titleEs: 'Reparto de Flores',
    introSceneIndex: 29,
    introSceneName: 'HD_Entregar_Flores_Intro',
    gameSceneIndex: 30,
    gameSceneName: 'HD_Entregar_Flores',
    music: {
      introMusicIndex: 28,
      introMusicFile: 'audio/dialogos.m4a',
      gameMusicIndex: 5,
      gameMusicFile: 'audio/Heredia - Reparto de flores.m4a'
    },
    mechanicType: 'top_down_town_navigation_and_reading_comprehension_delivery',
    controls: {
      movement: 'Arrow keys / WASD / Virtual Joystick',
      actionButton: 'Space / "Talk" button to pick up flowers at the shop and deliver to townspeople',
      touchButtonLabel: 'Talk'
    },
    timerSeconds: null,
    hintCost: 0,
    rewardFormula: '2000 completion bonus coins + (collectedCoins * 50)',
    winCondition: 'Fulfill all 5 flower deliveries (Deliveries: 5/5) around Heredia by matching each customer’s request with the right bouquet from Daniela’s flower shop. Registers star piece (1, 1, "1").',
    loseCondition: 'None (untimed town exploration and dialogue comprehension).',
    gameData: {
      totalDeliveriesRequired: 5,
      hudCounterFormat: 'Deliveries: 0/5',
      hudIconSprite: 'sprites/flores.png',
      npcHost: {
        name: 'Daniela Rose',
        role: 'Heredia Florist',
        portraitSprite: 'sprites/Floristeria Daniela Rose.png'
      },
      flowerOrders: [
        { orderNumber: 1, bouquetType: 'Red Roses (Rosas Rojas)', recipientClue: 'Customer near the north park bench' },
        { orderNumber: 2, bouquetType: 'Sunflowers (Girasoles)', recipientClue: 'Customer by the colonial house' },
        { orderNumber: 3, bouquetType: 'Carnations (Claveles)', recipientClue: 'Customer near the central avenue' },
        { orderNumber: 4, bouquetType: 'Hydrangeas (Hortensias)', recipientClue: 'Customer at the eastern corner' },
        { orderNumber: 5, bouquetType: 'Guaria Morada Orchids (Orquídeas)', recipientClue: 'Final customer near the church plaza' }
      ]
    }
  },
  {
    id: 'HD_Mountainbike',
    code: 'HD_03',
    provinceId: 1,
    provinceName: 'Heredia',
    starPieceIndex: 2,
    starPieceSprite: 'sprites/star_right.png',
    titleEn: 'Mountain Biking',
    titleEs: 'Ciclismo de Montaña',
    introSceneIndex: 33,
    introSceneName: 'HD_Mountainbike_Intro',
    gameSceneIndex: 34,
    gameSceneName: 'HD_Mountainbike',
    music: {
      introMusicIndex: 28,
      introMusicFile: 'audio/dialogos.m4a',
      gameMusicIndex: 7,
      gameMusicFile: 'audio/Heredia - Mountain Bike.m4a'
    },
    mechanicType: 'side_scrolling_mountain_bike_time_trial',
    controls: {
      movement: 'Left / Right Arrow keys to accelerate and balance',
      actionButton: 'Space / "Jump" button to bunny-hop over rocks, logs, and mud pits',
      touchButtonLabel: 'Jump'
    },
    timerSeconds: null,
    hintCost: 0,
    rewardFormula: 'coinsEarned = collectedCoins + timeBonus (1000 to 2000 coins)',
    winCondition: 'Reach the finish line at the end of the Bosque de la Hoja mountain trail (TayassuGames.FinishCollider). Registers star piece (1, 2, "1").',
    loseCondition: 'Crashing into obstacles slows the rider down.',
    gameData: {
      introBannerSprite: 'sprites/bosquehoja.png',
      backgrounds: [
        'sprites/Background 1 Colinas_Long.png',
        'sprites/Background 2 Nubes.png',
        'sprites/Background 3 Montanas_Long.png'
      ]
    }
  },

  // ==========================================================================
  // PROVINCE 2: CARTAGO
  // ==========================================================================
  {
    id: 'CT_Sanatorio_Duran',
    code: 'CT_01',
    provinceId: 2,
    provinceName: 'Cartago',
    starPieceIndex: 0,
    starPieceSprite: 'sprites/star_left.png',
    titleEn: 'Sanatorio Durán',
    titleEs: 'Sanatorio Carlos Durán',
    introSceneIndex: 17,
    introSceneName: 'CT_Sanatorio_Duran_Intro',
    gameSceneIndex: 18,
    gameSceneName: 'CT_Sanatorio_Duran',
    music: {
      introMusicIndex: 28,
      introMusicFile: 'audio/dialogos.m4a',
      gameMusicIndex: 11,
      gameMusicFile: 'audio/Sanatorio_mix Final.m4a'
    },
    mechanicType: 'top_down_mystery_exploration_and_historical_quests',
    controls: {
      movement: 'Arrow keys / WASD / Virtual Joystick (flashlight vision cone)',
      actionButton: 'Space / "Talk" button to interact with spirits, historical characters, and doors',
      touchButtonLabel: 'Talk'
    },
    timerSeconds: null,
    hintCost: 0,
    rewardFormula: '2000 completion bonus coins upon completing all 6 historical missions',
    winCondition: 'Complete the chain of 6 historical interactions inside the Sanatorio Durán (Dr. Carlos Durán, the Nun, the Little Girl spirit, and patients) and unlock the exit door. Registers star piece (2, 0, "1").',
    loseCondition: 'None (elapsed time is tracked on FinishCanvas).',
    gameData: {
      introBannerSprite: 'sprites/sanatorio.png',
      flashlightOverlaySprite: 'sprites/Transparecia sobre la cámara 1.png',
      soundEffects: [
        { index: 31, name: 'door', file: 'audio/door.m4a' },
        { index: 32, name: 'ghostlymoan', file: 'audio/ghostlymoan.m4a' },
        { index: 42, name: 'lightsOff', file: 'audio/lightsOff.m4a' },
        { index: 46, name: 'rat', file: 'audio/rat.m4a' }
      ],
      missionsCount: 6,
      historicalFacts: [
        'Founded in 1918 by physician and former Costa Rican President Dr. Carlos Durán Cartín to treat tuberculosis patients.',
        'Located on the slopes of Irazú Volcano in Tierra Blanca, Cartago, chosen for its pure mountain air and cool climate.',
        'Operated with the assistance of the Sisters of Charity of Saint Anne until tuberculosis was controlled with modern antibiotics.'
      ]
    }
  },
  {
    id: 'CT_Volcanes',
    code: 'CT_02',
    provinceId: 2,
    provinceName: 'Cartago',
    starPieceIndex: 1,
    starPieceSprite: 'sprites/star_center.png',
    titleEn: 'Volcanoes Challenge',
    titleEs: 'Reto de los Volcanes',
    introSceneIndex: 19,
    introSceneName: 'CT_Volcanes_Intro',
    gameSceneIndex: 20,
    gameSceneName: 'CT_Volcanes',
    music: {
      introMusicIndex: 28,
      introMusicFile: 'audio/dialogos.m4a',
      gameMusicIndex: 12,
      gameMusicFile: 'audio/Cartago - Volcanes.m4a'
    },
    mechanicType: 'interactive_volcano_reflex_and_geology_challenge',
    controls: {
      movement: 'Mouse cursor / Touch tap',
      actionButton: 'Left Click / Tap active volcano craters when they erupt',
      touchButtonLabel: 'Tap'
    },
    timerSeconds: 60,
    hintCost: 0,
    rewardFormula: 'coinsEarned = eruptingVolcanoesTapped * 50',
    winCondition: 'Tap the erupting volcanoes during the 3 phases of volcanic activity guided by Park Ranger Miguel Gutiérrez. Registers star piece (2, 1, "1").',
    loseCondition: 'None (awards coins based on score when timer ends).',
    gameData: {
      introBannerSprite: 'sprites/volcanes.png',
      npcHost: {
        name: 'Miguel Gutiérrez',
        role: 'National Park Ranger',
        portraitSprite: 'sprites/Guarda parques Miguel Gutierrez.png'
      },
      volcanoSprites: [
        'sprites/Volcan_01-Sheet_0.png',
        'sprites/Volcan_01-Sheet_6.png',
        'sprites/Volcan_02-Sheet_0.png',
        'sprites/Mapa Volcanes Fase 3.png'
      ],
      costaRicaVolcanoes: [
        { name: 'Irazú Volcano', province: 'Cartago', altitudeMeters: 3432, note: 'Highest active volcano in Costa Rica' },
        { name: 'Turrialba Volcano', province: 'Cartago', altitudeMeters: 3340, note: 'Twin-basin stratovolcano adjacent to Irazú' },
        { name: 'Poás Volcano', province: 'Alajuela', altitudeMeters: 2708, note: 'Famous for having one of the largest craters in the world' },
        { name: 'Arenal Volcano', province: 'Alajuela', altitudeMeters: 1670, note: 'Iconic conical volcano near La Fortuna and Lake Arenal' },
        { name: 'Rincón de la Vieja Volcano', province: 'Guanacaste', altitudeMeters: 1916, note: 'Known for fumaroles, hot springs, and boiling mud pots (pailas)' }
      ]
    }
  },
  {
    id: 'CT_Volcanes2',
    code: 'CT_03',
    provinceId: 2,
    provinceName: 'Cartago',
    starPieceIndex: 2,
    starPieceSprite: 'sprites/star_right.png',
    titleEn: 'Volcanoes of Costa Rica',
    titleEs: 'Volcanes de Costa Rica',
    introSceneIndex: 21,
    introSceneName: 'CT_Volcanes2_Intro',
    gameSceneIndex: 22,
    gameSceneName: 'CT_Volcanes2',
    music: {
      introMusicIndex: 28,
      introMusicFile: 'audio/dialogos.m4a',
      gameMusicIndex: 12,
      gameMusicFile: 'audio/Cartago - Volcanes.m4a'
    },
    mechanicType: 'volcano_map_identification_and_rapid_response',
    controls: {
      movement: 'Mouse cursor / Touch tap',
      actionButton: 'Left Click / Tap on the Costa Rican volcanic range map',
      touchButtonLabel: 'Tap'
    },
    timerSeconds: 60,
    hintCost: 0,
    rewardFormula: 'coinsEarned = volcanoPoints * 50',
    winCondition: 'Complete the advanced Costa Rican volcanic cordillera challenge with Park Ranger Miguel Gutiérrez. Registers star piece (2, 2, "1").',
    loseCondition: 'None (time-based score challenge).',
    gameData: {
      introBannerSprite: 'sprites/volcanes.png',
      npcHost: {
        name: 'Miguel Gutiérrez',
        role: 'National Park Ranger',
        portraitSprite: 'sprites/Guarda parques Miguel Gutierrez.png'
      },
      mapSprite: 'sprites/Mapa Volcanes Fase 3.png',
      volcanoAnatomyTerms: [
        { part: 'Magma Chamber', description: 'Underground pool of molten rock beneath the volcano' },
        { part: 'Main Vent / Conduit', description: 'Central pipe through which magma rises to the surface' },
        { part: 'Crater', description: 'Bowl-shaped opening at the summit of the volcano' },
        { part: 'Lava Flow', description: 'Molten rock that erupts and flows down the volcano slopes' },
        { part: 'Ash & Gas Cloud', description: 'Plume of volcanic ash, steam, and gases released during an eruption' }
      ]
    }
  },

  // ==========================================================================
  // PROVINCE 3: ALAJUELA
  // ==========================================================================
  {
    id: 'AL_Ciclismo',
    code: 'AL_01',
    provinceId: 3,
    provinceName: 'Alajuela',
    starPieceIndex: 0,
    starPieceSprite: 'sprites/star_left.png',
    titleEn: 'Biking Race',
    titleEs: 'Carrera de Ciclismo (Triatlón Laguna del Hule)',
    introSceneIndex: 11,
    introSceneName: 'AL_Ciclismo_Intro',
    gameSceneIndex: 12,
    gameSceneName: 'AL_Ciclismo',
    music: {
      introMusicIndex: 28,
      introMusicFile: 'audio/dialogos.m4a',
      gameMusicIndex: 18,
      gameMusicFile: 'audio/Alajuela - Bicicleta.m4a'
    },
    mechanicType: 'triathlon_sprint_race_biking',
    controls: {
      movement: 'Up / Down Arrow keys to change lanes',
      actionButton: 'Repeatedly tap Space / Right Arrow / "Pedal" button to build speed',
      touchButtonLabel: 'Pedal'
    },
    timerSeconds: null,
    hintCost: 0,
    rewardFormula: '1st place: 1000 coins | 2nd place: 500 coins | 3rd place: 100 coins | 4th place: 50 coins',
    winCondition: 'Finish in 1st to 4th place among the 7 cyclists in the Laguna del Hule Biking Race (TayassuGames.HD_FinishRace). Registers star piece (3, 0, "1").',
    loseCondition: 'Finishing 5th, 6th, or 7th awards 0 coins and requires a retry to earn the star piece.',
    gameData: {
      introBannerSprite: 'sprites/arenallago.png',
      totalRacers: 7,
      cheerSfx: { index: 47, file: 'audio/crowd.m4a' },
      placementRewards: [
        { rank: 1, label: '1st', coins: 1000, awardsStar: true },
        { rank: 2, label: '2nd', coins: 500, awardsStar: true },
        { rank: 3, label: '3rd', coins: 100, awardsStar: true },
        { rank: 4, label: '4th', coins: 50, awardsStar: true },
        { rank: 5, label: '5th', coins: 0, awardsStar: false },
        { rank: 6, label: '6th', coins: 0, awardsStar: false },
        { rank: 7, label: '7th', coins: 0, awardsStar: false }
      ]
    }
  },
  {
    id: 'AL_Correr',
    code: 'AL_02',
    provinceId: 3,
    provinceName: 'Alajuela',
    starPieceIndex: 1,
    starPieceSprite: 'sprites/star_center.png',
    titleEn: 'Running Race',
    titleEs: 'Carrera de Atletismo (Triatlón Laguna del Hule)',
    introSceneIndex: 13,
    introSceneName: 'AL_Correr_Intro',
    gameSceneIndex: 14,
    gameSceneName: 'AL_Correr',
    music: {
      introMusicIndex: 28,
      introMusicFile: 'audio/dialogos.m4a',
      gameMusicIndex: 17,
      gameMusicFile: 'audio/Alajuela - Correr.m4a'
    },
    mechanicType: 'triathlon_sprint_race_running',
    controls: {
      movement: 'Up / Down Arrow keys to change lanes',
      actionButton: 'Repeatedly tap Space / Right Arrow / "Run" button to sprint',
      touchButtonLabel: 'Run'
    },
    timerSeconds: null,
    hintCost: 0,
    rewardFormula: '1st place: 1000 coins | 2nd place: 500 coins | 3rd place: 100 coins | 4th place: 50 coins',
    winCondition: 'Finish in 1st to 4th place among the 7 runners in the Alajuela Running Race (TayassuGames.HD_FinishRace). Registers star piece (3, 1, "1").',
    loseCondition: 'Finishing 5th, 6th, or 7th awards 0 coins.',
    gameData: {
      introBannerSprite: 'sprites/arenallago.png',
      totalRacers: 7,
      cheerSfx: { index: 47, file: 'audio/crowd.m4a' },
      placementRewards: [
        { rank: 1, label: '1st', coins: 1000, awardsStar: true },
        { rank: 2, label: '2nd', coins: 500, awardsStar: true },
        { rank: 3, label: '3rd', coins: 100, awardsStar: true },
        { rank: 4, label: '4th', coins: 50, awardsStar: true },
        { rank: 5, label: '5th', coins: 0, awardsStar: false },
        { rank: 6, label: '6th', coins: 0, awardsStar: false },
        { rank: 7, label: '7th', coins: 0, awardsStar: false }
      ]
    }
  },
  {
    id: 'Al_Natacion',
    code: 'AL_03',
    provinceId: 3,
    provinceName: 'Alajuela',
    starPieceIndex: 2,
    starPieceSprite: 'sprites/star_right.png',
    titleEn: 'Swimming Race',
    titleEs: 'Carrera de Natación (Triatlón Laguna del Hule)',
    introSceneIndex: 15,
    introSceneName: 'AL_Natacion_Intro',
    gameSceneIndex: 16,
    gameSceneName: 'Al_Natacion',
    music: {
      introMusicIndex: 28,
      introMusicFile: 'audio/dialogos.m4a',
      gameMusicIndex: 19,
      gameMusicFile: 'audio/Alajuela - Nadar.m4a'
    },
    mechanicType: 'triathlon_sprint_race_swimming',
    controls: {
      movement: 'Up / Down Arrow keys to steer in lane',
      actionButton: 'Repeatedly tap Space / Right Arrow / "Swim" button to stroke forward',
      touchButtonLabel: 'Swim'
    },
    timerSeconds: null,
    hintCost: 0,
    rewardFormula: '1st place: 1000 coins | 2nd place: 500 coins | 3rd place: 100 coins | 4th place: 50 coins',
    winCondition: 'Finish in 1st to 4th place among the 7 swimmers across the volcanic lagoon (TayassuGames.HD_FinishRace). Registers star piece (3, 2, "1").',
    loseCondition: 'Finishing 5th, 6th, or 7th awards 0 coins.',
    gameData: {
      introBannerSprite: 'sprites/arenallago.png',
      totalRacers: 7,
      swimStrokeSfx: { index: 41, file: 'audio/Nadar.m4a' },
      cheerSfx: { index: 47, file: 'audio/crowd.m4a' },
      placementRewards: [
        { rank: 1, label: '1st', coins: 1000, awardsStar: true },
        { rank: 2, label: '2nd', coins: 500, awardsStar: true },
        { rank: 3, label: '3rd', coins: 100, awardsStar: true },
        { rank: 4, label: '4th', coins: 50, awardsStar: true },
        { rank: 5, label: '5th', coins: 0, awardsStar: false },
        { rank: 6, label: '6th', coins: 0, awardsStar: false },
        { rank: 7, label: '7th', coins: 0, awardsStar: false }
      ]
    }
  },

  // ==========================================================================
  // PROVINCE 4: PUNTARENAS
  // ==========================================================================
  {
    id: 'PR_Paseo_Turistas',
    code: 'PR_01',
    provinceId: 4,
    provinceName: 'Puntarenas',
    starPieceIndex: 0,
    starPieceSprite: 'sprites/star_left.png',
    titleEn: 'Churchill Express',
    titleEs: 'Expreso de Churchills en el Paseo de los Turistas',
    introSceneIndex: 43,
    introSceneName: 'PR_Paseo_Turistas_Intro',
    gameSceneIndex: 44,
    gameSceneName: 'PR_Paseo_Turistas',
    music: {
      introMusicIndex: 28,
      introMusicFile: 'audio/dialogos.m4a',
      gameMusicIndex: 21,
      gameMusicFile: 'audio/Puntarenas -Churchill.m4a'
    },
    mechanicType: 'time_management_shaved_ice_preparation_and_beach_delivery',
    controls: {
      movement: 'Arrow keys / WASD / Virtual Joystick along Paseo de los Turistas',
      actionButton: 'Space / "Talk" button at the Churchill cart to prepare snow cones and deliver to tourists',
      touchButtonLabel: 'Talk'
    },
    timerSeconds: 120,
    hintCost: 0,
    rewardFormula: 'coinsEarned = churchillsSold * 200',
    winCondition: 'Prepare Churchills at Luis Araya’s cart (Carrito Churchill) and deliver them to beachgoers along the Paseo de los Turistas before time runs out. Registers star piece (4, 0, "1") via PR_PT_GameControl.',
    loseCondition: 'None (time-based sales challenge; star piece 0 of Puntarenas is awarded at shift completion).',
    gameData: {
      introBannerSprite: 'sprites/puntarenas.png',
      cartSprite: 'sprites/Carrito Churchill.png',
      churchillIconSprite: 'sprites/Objetos para meter en UNITY_26.png',
      shaveIceSfx: { index: 43, file: 'audio/raspar.m4a' },
      emptyInventoryWarning: "You don't have any churchills!",
      maxCarriedChurchills: 5,
      churchillIngredients: [
        'Shaved ice (Hielo raspado)',
        'Kola red syrup (Sirope de kola)',
        'Powdered milk (Leche en polvo)',
        'Condensed milk (Leche condensada)',
        'Scoop of ice cream & tamarind/marshmallow topping'
      ],
      npcHost: {
        name: 'Luis Araya',
        role: 'Traditional Churchill Vendor ("Copero")',
        portraitSprite: 'sprites/Copero Luis Araya.png'
      }
    }
  },
  {
    id: 'PR_Manuel_Antonio',
    code: 'PR_02',
    provinceId: 4,
    provinceName: 'Puntarenas',
    starPieceIndex: 1,
    starPieceSprite: 'sprites/star_center.png',
    titleEn: 'Picnic in Manuel Antonio',
    titleEs: 'Picnic en Manuel Antonio',
    introSceneIndex: 41,
    introSceneName: 'PR_Manuel_Antonio_Intro',
    gameSceneIndex: 42,
    gameSceneName: 'PR_Manuel_Antonio',
    music: {
      introMusicIndex: 28,
      introMusicFile: 'audio/dialogos.m4a',
      gameMusicIndex: 20,
      gameMusicFile: 'audio/Puntarenas - Manuel Antonio.m4a'
    },
    mechanicType: 'ecological_park_patrol_and_wildlife_protection',
    controls: {
      movement: 'Arrow keys / WASD / Virtual Joystick along the beach & forest trails',
      actionButton: 'Space / "Talk" button to educate tourists and protect picnic areas from wild animals',
      touchButtonLabel: 'Talk'
    },
    timerSeconds: null,
    hintCost: 0,
    rewardFormula: '2000 completion bonus coins upon completing the park ranger conservation tasks',
    winCondition: 'Assist the Manuel Antonio Park Ranger in educating visitors not to feed wildlife (monkeys, raccoons, iguanas) and keeping human food safely stored. Registers star piece (4, 1, "1") via PR_MA_Game_Control.',
    loseCondition: 'None (guided ecological conservation mission).',
    gameData: {
      introBannerSprite: 'sprites/manuelantonio.png',
      parkRangerSprite: 'sprites/Guarda parques 1_0.png',
      wildlifeSpecies: [
        { name: 'White-faced Capuchin Monkey (Mono Carablanca)', sprite: 'sprites/Mono_manuel_0.png' },
        { name: 'Crab-eating Raccoon (Mapache)' },
        { name: 'Black Spiny-tailed Iguana (Garrobo / Iguana)' },
        { name: 'Three-toed Sloth (Perezoso de tres dedos)' }
      ],
      conservationRules: [
        'Never feed wild animals: human food damages their health, teeth, and natural foraging behavior.',
        'Keep backpacks and picnic baskets closed and supervised at all times.',
        'Carry all trash out of the national park and avoid single-use plastics.'
      ]
    }
  },
  {
    id: 'PR_Tarcoles',
    code: 'PR_03',
    provinceId: 4,
    provinceName: 'Puntarenas',
    starPieceIndex: 2,
    starPieceSprite: 'sprites/star_right.png',
    titleEn: "Let's clean Tárcoles River",
    titleEs: 'Limpiemos el Río Tárcoles',
    introSceneIndex: 45,
    introSceneName: 'PR_Tarcoles_Intro',
    gameSceneIndex: 46,
    gameSceneName: 'PR_Tarcoles',
    music: {
      introMusicIndex: 28,
      introMusicFile: 'audio/dialogos.m4a',
      gameMusicIndex: 22,
      gameMusicFile: 'audio/Puntarenas - Tarcoles.m4a'
    },
    mechanicType: 'platformer_river_cleanup_and_crocodile_hazard_avoidance',
    controls: {
      movement: 'Left / Right Arrow keys or Virtual Joystick across riverbanks and platforms',
      actionButton: 'Space / "Jump" button to leap over American crocodiles and collect garbage bags',
      touchButtonLabel: 'Jump'
    },
    timerSeconds: 90,
    hintCost: 0,
    rewardFormula: 'Tiered reward by garbage bags collected: >=20 bags: 5000 coins | >=12 bags: 3000 coins | >=5 bags: 1500 coins | <5 bags: 0 coins',
    winCondition: 'Collect garbage bags polluting the Tárcoles River while avoiding crocodiles until the timer finishes. Registers star piece (4, 2, "1") in <EvaluateGame>c__Iterator0.',
    loseCondition: 'Touching a crocodile or falling into the river triggers Frog helper relocation and a brief time penalty.',
    gameData: {
      introBannerSprite: 'sprites/tarcoles.png',
      garbageSprite: 'sprites/basura.png',
      platformSprite: 'sprites/platform_small.png',
      rewardTiers: [
        { minGarbageBags: 20, coinsAwarded: 5000, message: '5000 coins awarded!' },
        { minGarbageBags: 12, coinsAwarded: 3000, message: '3000 coins awarded!' },
        { minGarbageBags: 5, coinsAwarded: 1500, message: '1500 coins awarded!' },
        { minGarbageBags: 0, coinsAwarded: 0, message: 'No coins awarded' }
      ],
      ecologicalNote:
        'The Grande de Tárcoles River drains the Central Valley into the Pacific Ocean near Carara National Park and hosts one of the largest wild populations of American crocodiles (Crocodylus acutus) in Central America.'
    }
  },

  // ==========================================================================
  // PROVINCE 5: GUANACASTE
  // ==========================================================================
  {
    id: 'GN_Buceo',
    code: 'GN_01',
    provinceId: 5,
    provinceName: 'Guanacaste',
    starPieceIndex: 0,
    starPieceSprite: 'sprites/star_left.png',
    titleEn: 'Playas del Coco Diving',
    titleEs: 'Buceo en Playas del Coco',
    introSceneIndex: 25,
    introSceneName: 'GN_Buceo_Intro',
    gameSceneIndex: 26,
    gameSceneName: 'GN_Buceo',
    music: {
      introMusicIndex: 28,
      introMusicFile: 'audio/dialogos.m4a',
      gameMusicIndex: 8,
      gameMusicFile: 'audio/buceo_mixdown.m4a'
    },
    mechanicType: 'underwater_scuba_navigation_and_marine_photography',
    controls: {
      movement: 'Arrow keys / WASD to swim underwater in 4 directions',
      actionButton: 'Space / Left Click to snap underwater photos of marine species',
      touchButtonLabel: 'Photo'
    },
    timerSeconds: null,
    hintCost: 0,
    rewardFormula: 'coinsEarned = (uniqueMarinePhotos * 500) + (collectedCoins * 50)',
    winCondition: 'Swim through the Playas del Coco coral reef, photograph marine life, and reach theGN_Buceo_Final exit zone. Registers star piece (5, 0, "1").',
    loseCondition: 'Colliding with jellyfish or hazards depletes oxygen/health and prompts a retry.',
    gameData: {
      introBannerSprite: 'sprites/elcoco.png',
      cameraShutterSfx: { index: 40, file: 'audio/Camara V4.m4a' },
      marineSpecies: [
        { name: 'Green Tropical Fish', sprite: 'sprites/Pez Verde_0.png', points: 500 },
        { name: 'Blue Reef Fish', sprite: 'sprites/Pez Azul_0.png', points: 500 },
        { name: 'Red Coral Fish', sprite: 'sprites/Pez Rojo_0.png', points: 500 },
        { name: 'Yellow Butterflyfish', sprite: 'sprites/pez_0.png', points: 500 },
        { name: 'Pacific Manta Ray & Sea Turtles', points: 500 }
      ]
    }
  },
  {
    id: 'GN_Surf_Tamarindo',
    code: 'GN_02',
    provinceId: 5,
    provinceName: 'Guanacaste',
    starPieceIndex: 1,
    starPieceSprite: 'sprites/star_center.png',
    titleEn: 'Tamarindo Surfing',
    titleEs: 'Surf en Tamarindo',
    introSceneIndex: 27,
    introSceneName: 'GN_Surf_Tamarindo_Intro',
    gameSceneIndex: 28,
    gameSceneName: 'GN_Surf_Tamarindo',
    music: {
      introMusicIndex: 28,
      introMusicFile: 'audio/dialogos.m4a',
      gameMusicIndex: 9,
      gameMusicFile: 'audio/Guanacaste - Surf.m4a'
    },
    mechanicType: 'wave_surfing_balance_and_coin_collection_runner',
    controls: {
      movement: 'Up / Down / Left / Right Arrow keys to ride the wave face and dodge obstacles',
      actionButton: 'Space to carve/jump over wave crests',
      touchButtonLabel: 'Surf'
    },
    timerSeconds: null,
    hintCost: 0,
    rewardFormula: 'coinsEarned = collectedCoins * 100 (plus 1000 completion bonus)',
    winCondition: 'Ride the Pacific wave all the way to Tamarindo beach (GN_ST_Final trigger). Registers star piece (5, 1, "1").',
    loseCondition: 'Being swallowed by the breaking wave tube or hitting reef rocks prompts a retry.',
    gameData: {
      introBannerSprite: 'sprites/tamarindo.png',
      waveSprites: ['sprites/Guanacaste - Wave copia_0.png', 'sprites/Wave_01-Sheet_0.png']
    }
  },
  {
    id: 'GN_BarraHonda',
    code: 'GN_03',
    provinceId: 5,
    provinceName: 'Guanacaste',
    starPieceIndex: 2,
    starPieceSprite: 'sprites/star_right.png',
    titleEn: 'Barra Honda Caverns',
    titleEs: 'Cavernas de Barra Honda',
    introSceneIndex: 23,
    introSceneName: 'GN_BarraHonda_Intro',
    gameSceneIndex: 24,
    gameSceneName: 'GN_BarraHonda',
    music: {
      introMusicIndex: 28,
      introMusicFile: 'audio/dialogos.m4a',
      gameMusicIndex: 10,
      gameMusicFile: 'audio/Guanacaste - Barra Honda.m4a'
    },
    mechanicType: 'underground_cavern_platformer',
    controls: {
      movement: 'Left / Right Arrow keys or Virtual Joystick',
      actionButton: 'Space / "Jump" button to leap across chasms and dodge stalactites and bats',
      touchButtonLabel: 'Jump'
    },
    timerSeconds: null,
    hintCost: 0,
    rewardFormula: 'coinsEarned = collectedCoins * 50 (plus 1000 completion bonus)',
    winCondition: 'Navigate the limestone caverns of Barra Honda National Park and reach the FinishLine ("You found the exit!"). Registers star piece (5, 2, "1").',
    loseCondition: 'Falling into cavern pits or hitting bats/stalactites triggers GNBH_TerminarJuego.ShowGameOver.',
    gameData: {
      introBannerSprite: 'sprites/barrahonda.png',
      cavernBackgroundSprite: 'sprites/GNBH_Background2.png',
      batSprites: ['sprites/GNBH_Bat01.png', 'sprites/GNBH_Bat02.png', 'sprites/GNBH_Bat03.png', 'sprites/GNBH_Bat04.png'],
      npcHost: {
        name: 'Ester Guevara',
        role: 'Barra Honda Park Ranger',
        portraitSprite: 'sprites/Guarda parques Ester Guevara.png'
      },
      geologicalFacts: [
        'Barra Honda National Park features a network of over 40 limestone caverns formed by ancient marine reefs elevated by tectonic faults.',
        'Stalactites hang from the cave ceiling, while stalagmites rise from the cave floor as calcium carbonate precipitates from dripping water.'
      ]
    }
  },

  // ==========================================================================
  // PROVINCE 6: LIMÓN
  // ==========================================================================
  {
    id: 'Lm_Cocina',
    code: 'LM_01',
    provinceId: 6,
    provinceName: 'Limón',
    starPieceIndex: 0,
    starPieceSprite: 'sprites/star_left.png',
    titleEn: 'Caribbean Cuisine',
    titleEs: 'Cocina Caribeña',
    introSceneIndex: 35,
    introSceneName: 'Lm_Cocina_Intro',
    gameSceneIndex: 36,
    gameSceneName: 'Lm_Cocina',
    music: {
      introMusicIndex: 28,
      introMusicFile: 'audio/dialogos.m4a',
      gameMusicIndex: 14,
      gameMusicFile: 'audio/Limon - Cocinar.m4a'
    },
    mechanicType: 'culinary_recipe_memorization_and_ingredient_drag_and_drop',
    controls: {
      movement: 'Mouse / Touch drag and drop',
      actionButton: 'Browse pantry pages (Left/Right arrows), drag required ingredients into the cooking pot (Olla), and click "Check and cook"',
      touchButtonLabel: 'Check and cook'
    },
    timerSeconds: 120,
    hintCost: 100,
    rewardFormula: '2000 coins upon cooking the target Afro-Caribbean dish (minus 100 coins per recipe help consultation)',
    winCondition: 'Study the 5 traditional Limón recipes in the Educational panel, then place the exact required ingredients for the requested dish into the pot and click "Check and cook". Registers star piece (6, 0, "1").',
    loseCondition: 'Running out of time (2:00) or submitting incorrect ingredients.',
    gameData: {
      chefSprite: 'sprites/Negra Juego de Cocinar_0.png',
      kitchenTableSprite: 'sprites/sprite mesa.png',
      kitchenBackgroundSprite: 'sprites/fondo__sharedassets36_38.png',
      cookingPotSprite: 'sprites/olla.png',
      helpButtonSprite: 'sprites/icono_informacion.png',
      totalIngredientsInPantry: caribbeanIngredients.length,
      pantryIngredients: caribbeanIngredients,
      recipes: [
        {
          id: 'rice_and_beans',
          name: 'Caribbean Rice and Bean',
          dishSprite: 'sprites/Recetas e ingredientes_2.png',
          requiredIngredients: [
            'Red beans',
            'Water',
            'Garlic and onion',
            'Habanero pepper',
            'Thyme',
            'Bay leaf',
            'Olive oil',
            'Salt and pepper',
            'Coconut milk',
            'Uncooked rice'
          ],
          requiredGameObjectNames: [
            'RedBeans',
            'Water',
            'GarlicAndOnion',
            'PanamaPepper',
            'Thyme',
            'BayLeaf',
            'OliveOil',
            'Salt_Pepper',
            'CoconutMilk',
            'UncookedRice'
          ],
          preparationStepsEn: [
            'Wash beans and place in fresh water.',
            'Add onion, garlic, sprig fresh thyme, bay leaf and olive oil.',
            'Bring to a boil, about 1 to 1 ½ hrs.',
            'Remove and discard onion, garlic, bay leaf and thyme.',
            'Add 2 cups coconut milk, salt and pepper to taste, and one whole habanero pepper. Bring to a boil.',
            'While re-heating, wash and drain the rice.',
            'Add rice to the pot, stir well, and reduce to simmer. Cover and cook until done for about 17 to 20 minutes.',
            'Remove habanero pepper. Serve with Caribbean chicken cooked in coconut milk.'
          ]
        },
        {
          id: 'patty',
          name: 'Patty',
          dishSprite: 'sprites/Recetas e ingredientes_0.png',
          requiredIngredients: [
            'Ground beef',
            'Habanero pepper (Panama chili pepper)',
            'Brown bread rolls',
            'Thyme',
            'Garlic and onion',
            'Coconut oil',
            'Coconut milk',
            'Salt and pepper',
            'Special dough'
          ],
          requiredGameObjectNames: [
            'GroundBeef',
            'PanamaPepper',
            'BrownBreadRolls',
            'Thyme',
            'GarlicAndOnion',
            'CoconutOil',
            'CoconutMilk',
            'Salt_Pepper',
            'SpecialDough'
          ],
          preparationStepsEn: [
            'In a frying pan with some oil, sauté the onion along with the garlic for a few minutes, incorporate achiote, pork sausage, thyme, salt and pepper.',
            'Soak the bread with cold water and then incorporate in a bowl with the coconut milk.',
            'When the beef is ready, add the bread already soaked in water and coconut milk, add the panama chili and cook.',
            'Pour the filling into a processor and process for a few minutes.',
            'Spread the dough with a rolling pin until very thin.',
            'Cut the dough with a circular cutter, place filling in the center and fold forming the turnovers.',
            'Place the turnovers on a tray, varnish with egg whites and bake.'
          ]
        },
        {
          id: 'rondon',
          name: 'Rondón',
          dishSprite: 'sprites/Recetas e ingredientes_3.png',
          requiredIngredients: [
            'Yucca',
            'Coconut oil',
            'Yam',
            'Carrots',
            'Sweet potatoes / Fish',
            'Garlic and onion',
            'Ginger',
            'Coconut milk',
            'Curry powder',
            'Salt and pepper'
          ],
          requiredGameObjectNames: [
            'Yucca',
            'CoconutOil',
            'Yam',
            'Carrot',
            'Sweet potatoes',
            'Fish',
            'GarlicAndOnion',
            'Ginger',
            'CoconutMilk',
            'CurryPowder',
            'Salt_Pepper'
          ],
          preparationStepsEn: [
            'In a large pot, sauté the onions in coconut oil until tender.',
            'Add the garlic and ginger and cook for about 30 seconds.',
            'Add the coconut milk and all the root vegetables (yucca, yam, carrots, sweet potatoes) to the pot.',
            'Add water, enough that your vegetables are mostly covered.',
            'Reduce the heat to medium-low, and let the vegetables simmer for about 10 minutes.',
            'Add the fish and the minced hot pepper, curry powder, and salt and pepper.',
            'Continue to simmer the vegetables until everything is tender.'
          ]
        },
        {
          id: 'agua_de_sapo',
          name: 'Agua de Sapo',
          dishSprite: 'sprites/Recetas e ingredientes_1.png',
          requiredIngredients: ['Water', 'Brown cane sugar', 'Ginger', 'Lemon juice'],
          requiredGameObjectNames: ['Water', 'Yucca', 'Ginger', 'LemonJuice'],
          preparationStepsEn: [
            'Boil half a gallon of water with the brown cane sugar (tapa de dulce) and ginger.',
            'Cook until the sugar has dissolved and the ginger has been infused—about 20 minutes.',
            'Let cool and strain using a metal colander.',
            'Add fresh lemon juice and serve cold with ice.'
          ]
        },
        {
          id: 'pan_bon',
          name: 'Pan Bon',
          dishSprite: 'sprites/Recetas e ingredientes_4.png',
          requiredIngredients: [
            'Flour',
            'Water',
            'Egg yeast',
            'Brown sugar',
            'Vanilla',
            'Cinnamon',
            'Nutmeg',
            'Candied fruit',
            'Raisins'
          ],
          requiredGameObjectNames: [
            'Flour',
            'Water',
            'Egg yeast',
            'BrownSugar',
            'Vanilla',
            'Cinnamon',
            'Nutmeg',
            'CandiedFruit',
            'Raisins'
          ],
          preparationStepsEn: [
            'Mix flour, yeast, warm water, and brown sugar to form a spiced dark dough.',
            'Knead in vanilla, cinnamon, and grated nutmeg.',
            'Fold in candied fruit and raisins.',
            'Shape into loaves, decorate with a traditional cross on top, and bake until golden brown.'
          ]
        }
      ]
    }
  },
  {
    id: 'LM_Tortuguero',
    code: 'LM_02',
    provinceId: 6,
    provinceName: 'Limón',
    starPieceIndex: 1,
    starPieceSprite: 'sprites/star_center.png',
    titleEn: 'Tortuguero Boat Trip',
    titleEs: 'Paseo en Bote por Tortuguero',
    introSceneIndex: 37,
    introSceneName: 'LM_Tortuguero_Intro',
    gameSceneIndex: 38,
    gameSceneName: 'LM_Tortuguero',
    music: {
      introMusicIndex: 28,
      introMusicFile: 'audio/dialogos.m4a',
      gameMusicIndex: 15,
      gameMusicFile: 'audio/Limon - Tortuguero.m4a'
    },
    mechanicType: 'canal_boat_navigation_and_wildlife_spotting',
    controls: {
      movement: 'Up / Down / Left / Right Arrow keys or Virtual Joystick to steer boat through Tortuguero canals',
      actionButton: 'Collect coins, avoid logs/rocks, and reach the West Indian Manatee (LM_T_Manati) sanctuary',
      touchButtonLabel: 'Steer'
    },
    timerSeconds: null,
    hintCost: 0,
    rewardFormula: 'coinsEarned = collectedCoins * 50 (plus 1500 completion bonus)',
    winCondition: 'Steer the boat through the Tortuguero canals to encounter the West Indian Manatee (LM_T_Manati). Calls GameControl.RegisterMinigameProgress(6, 1, "1").',
    loseCondition: 'Hitting logs slows the boat.',
    gameData: {
      introBannerSprite: 'sprites/tortuguero.png',
      boatSprites: ['sprites/bote down_0.png', 'sprites/Bote up_0.png'],
      manateeSprite: 'sprites/Manatee-Sheet2_0.png',
      boatMotorSfx: { index: 45, file: 'audio/Motor Bote.m4a' },
      spottedFauna: [
        'West Indian Manatee (Trichechus manatus - National Marine Fauna Symbol of Costa Rica)',
        'Spectacled Caiman & American Crocodile',
        'Green Sea Turtle (Chelonia mydas)',
        'Keel-billed Toucan & Great Green Macaw (Lapa Verde)'
      ]
    }
  },
  {
    id: 'LM_Desove',
    code: 'LM_03',
    provinceId: 6,
    provinceName: 'Limón',
    starPieceIndex: 2,
    starPieceSprite: 'sprites/star_right.png',
    titleEn: 'Saving Turtles',
    titleEs: 'Protegiendo el Desove de Tortugas',
    introSceneIndex: 39,
    introSceneName: 'LM_Desove_Intro',
    gameSceneIndex: 40,
    gameSceneName: 'LM_Desove',
    music: {
      introMusicIndex: 28,
      introMusicFile: 'audio/dialogos.m4a',
      gameMusicIndex: 16,
      gameMusicFile: 'audio/Limon - Desove.m4a'
    },
    mechanicType: 'beach_defense_turtle_hatchling_protection',
    controls: {
      movement: 'Mouse cursor / Touch tap on approaching predators',
      actionButton: 'Left Click / Tap predators (vultures, dogs, crabs) to scare them away before they reach the baby sea turtles',
      touchButtonLabel: 'Protect'
    },
    timerSeconds: 90,
    hintCost: 0,
    rewardFormula: 'Fixed reward of 2000 coins upon protecting the baby turtles until time expires ("For you effort you earned 2000 coins!")',
    winCondition: 'Keep at least 1 of the 10 baby sea turtles (objetives = 10) safe from predators until the 90-second timer reaches 0:00. Registers star piece (6, 2, "1").',
    loseCondition: 'If predators eat 10 baby turtles (objetives < 1), displays LooseScreen ("Predators ate many baby turtles !") and plays track 27 (Perder (largo).m4a).',
    gameData: {
      introBannerSprite: 'sprites/desove.png',
      beachSprites: ['sprites/playa.png', 'sprites/playa2.png'],
      babyTurtleSprite: 'sprites/Tortu_pequenna-Sheet_7.png',
      adultTurtleSprite: 'sprites/Tortu_verde_0__sharedassets40_32.png',
      predatorSprite: 'sprites/vulture-Sheet_0.png',
      maxPredatorHitsAllowed: 10,
      fixedCoinsReward: 2000,
      npcHost: {
        name: 'Ana Cambronero',
        role: 'Sea Turtle Conservationist',
        portraitSprite: 'sprites/Conservacionista Ana Cambronero.png'
      }
    }
  }
];

// Enrich all 21 minigames with their extracted introDialogues, inGameDialogues, uiTexts, and sprites
for (const mg of minigamesSpecs) {
  mg.introDialogues = getFungusDialoguesForScene(mg.introSceneIndex);
  mg.inGameDialogues = getFungusDialoguesForScene(mg.gameSceneIndex);
  mg.uiTexts = sceneTextsByLevel.get(mg.gameSceneIndex) || [];
  mg.sprites = {
    introSceneSprites: getSceneSpritesList(mg.introSceneIndex),
    gameSceneSprites: getSceneSpritesList(mg.gameSceneIndex)
  };
}

// Also document the 4 Legacy / Sibling ICT Variant Minigames referenced in design docs
const legacyAndSiblingMinigames = [
  {
    id: 'CT_Basilica_Angeles',
    provinceId: 2,
    provinceName: 'Cartago',
    titleEn: 'Basilica of Our Lady of the Angels Puzzle',
    titleEs: 'Rompecabezas de la Basílica de los Ángeles',
    mechanicType: 'sliding_or_jigsaw_architectural_puzzle',
    timerSeconds: 120,
    hintCost: 150,
    rewardFormula: '1500 base coins + (remainingSeconds * 10)',
    gameData: {
      gridSize: '4x4 (16 pieces)',
      subject: 'Byzantine-colonial facade of the Basílica de Nuestra Señora de los Ángeles in Cartago (built 1912–1930)',
      culturalNote: 'Every August 2nd, over two million pilgrims walk the Romería to Cartago to honor La Negrita, Patroness of Costa Rica.'
    }
  },
  {
    id: 'AL_Carretas',
    provinceId: 3,
    provinceName: 'Alajuela',
    titleEn: 'Sarchí Oxcart Painting',
    titleEs: 'Pintura de Carretas de Sarchí',
    mechanicType: 'mandala_symmetry_color_matching',
    timerSeconds: 120,
    hintCost: 100,
    rewardFormula: '1500 base coins + accuracyBonus (up to 500 coins)',
    gameData: {
      symmetryAxes: 8,
      ringsCount: 4,
      paletteColors: [
        { id: 'vermilion_orange', name: 'Sarchí Vermilion Orange', hex: '#E64A19' },
        { id: 'cobalt_blue', name: 'Cobalt Sky Blue', hex: '#1976D2' },
        { id: 'canary_yellow', name: 'Golden Yellow', hex: '#FBC02D' },
        { id: 'crimson_red', name: 'Crimson Red', hex: '#C62828' },
        { id: 'emerald_green', name: 'Coffee Leaf Green', hex: '#2E7D32' },
        { id: 'royal_purple', name: 'Orchid Violet', hex: '#6A1B9A' },
        { id: 'pure_white', name: 'Highlight White', hex: '#FFFFFF' },
        { id: 'ebony_black', name: 'Contour Black', hex: '#212121' }
      ],
      culturalNote: 'Declared a Masterpiece of the Oral and Intangible Heritage of Humanity by UNESCO in 2005.'
    }
  },
  {
    id: 'AL_Mariposario',
    provinceId: 3,
    provinceName: 'Alajuela',
    titleEn: 'Butterfly Sanctuary Classification',
    titleEs: 'Mariposario de Alajuela',
    mechanicType: 'species_observation_and_classification',
    timerSeconds: 90,
    hintCost: 100,
    rewardFormula: 'coinsEarned = classifiedButterflies * 200',
    gameData: {
      species: [
        { commonName: 'Blue Morpho', scientificName: 'Morpho helenor', wingColor: 'Iridescent Electric Blue' },
        { commonName: 'Owl Butterfly', scientificName: 'Caligo memnon', wingColor: 'Brown with large owl-eye ocelli' },
        { commonName: 'Monarch Butterfly', scientificName: 'Danaus plexippus', wingColor: 'Orange with black veins and white spots' },
        { commonName: 'Zebra Longwing', scientificName: 'Heliconius charithonia', wingColor: 'Black with yellow stripes' },
        { commonName: 'Cloudless Sulphur', scientificName: 'Phoebis sennae', wingColor: 'Bright Lemon Yellow' }
      ]
    }
  },
  {
    id: 'AL_Juan_Santamaria',
    provinceId: 3,
    provinceName: 'Alajuela',
    titleEn: 'Juan Santamaría Historical Challenge',
    titleEs: 'Reto Histórico de Juan Santamaría',
    mechanicType: 'historical_sequence_and_torch_defense',
    timerSeconds: 90,
    hintCost: 100,
    rewardFormula: '2000 coins upon completing the 1856 Campaign historical sequence',
    gameData: {
      historicalDate: 'April 11, 1856',
      location: 'Mesón de Guerra in Rivas, Nicaragua (National Campaign of 1856–1857)',
      nickname: 'El Erizo (The Hedgehog)',
      birthplace: 'Alajuela, Costa Rica (August 29, 1831)'
    }
  }
];

fs.writeFileSync(
  path.join(OUT_DATA_DIR, 'minigames.json'),
  JSON.stringify(
    {
      totalMinigames: minigamesSpecs.length,
      minigamesPerProvince: 3,
      minigames: minigamesSpecs,
      legacyAndSiblingMinigames
    },
    null,
    2
  ),
  'utf8'
);
console.log('Generated app/src/data/minigames.json');

// ============================================================================
// 7. Build 5: app/src/data/glossary.json
// ============================================================================
const coreKeywordsColumns = [
  {
    columnIndex: 1,
    gameObjectName: 'Text (1)',
    rawText: 'Waterfalls\nSea\nJungles\nVolcanoes\nWildlife\nCloud forest\nBeaches\nCountryside',
    terms: [
      {
        id: 'KW_01',
        termEn: 'Waterfalls',
        termEs: 'Cataratas / Cascadas',
        category: 'Nature & Ecosystems',
        definitionEn: 'Cascading streams of water falling from high rocky cliffs in tropical mountains and rivers, such as La Fortuna, Río Celeste, and La Paz Waterfalls.',
        definitionEs: 'Caídas de agua desde grandes alturas en montañas y ríos tropicales, como las cataratas de La Fortuna, Río Celeste y La Paz.',
        sprite: 'sprites/arenallago.png',
        audioFile: 'audio/005 What would you take on a trip to Rio Celeste.m4a'
      },
      {
        id: 'KW_02',
        termEn: 'Sea',
        termEs: 'Mar / Océano',
        category: 'Nature & Ecosystems',
        definitionEn: 'Costa Rica is bordered by two bodies of salt water: the Caribbean Sea to the east and the Pacific Ocean to the west.',
        definitionEs: 'Costa Rica está bañada por dos grandes masas de agua salada: el Mar Caribe al este y el Océano Pacífico al oeste.',
        sprite: 'sprites/elcoco.png',
        audioFile: 'audio/001 Guanacaste, Diving in coco, Lisa 001.m4a'
      },
      {
        id: 'KW_03',
        termEn: 'Jungles',
        termEs: 'Selvas tropicales',
        category: 'Nature & Ecosystems',
        definitionEn: 'Dense, humid tropical rainforests teeming with biodiversity, giant trees, lianas, and wildlife in regions like Corcovado, Tortuguero, and Sarapiquí.',
        definitionEs: 'Bosques tropicales húmedos y densos con enorme biodiversidad en regiones como Corcovado, Tortuguero y Sarapiquí.',
        sprite: 'sprites/tortuguero.png',
        audioFile: 'audio/Limon Tortuguero Locutor 001 FEM.m4a'
      },
      {
        id: 'KW_04',
        termEn: 'Volcanoes',
        termEs: 'Volcanes',
        category: 'Nature & Ecosystems',
        definitionEn: 'Geological mountain formations with craters that emit lava, ash, and gases, including Irazú, Poás, Arenal, Turrialba, and Rincón de la Vieja.',
        definitionEs: 'Formaciones montañosas con cráteres volcánicos como el Irazú, Poás, Arenal, Turrialba y Rincón de la Vieja.',
        sprite: 'sprites/volcanes.png',
        audioFile: 'audio/Volcanes, Irazú Volcano park ranger, 001.m4a'
      },
      {
        id: 'KW_05',
        termEn: 'Wildlife',
        termEs: 'Vida silvestre / Fauna',
        category: 'Biodiversity & Fauna',
        definitionEn: 'Wild animals and plants living in their natural habitats; Costa Rica holds nearly 5% of the world’s biodiversity.',
        definitionEs: 'Animales y plantas que viven en su hábitat natural; Costa Rica alberga cerca del 5% de la biodiversidad mundial.',
        sprite: 'sprites/Mono_manuel_0.png',
        audioFile: 'audio/Puntarenas Manuel Antonio Guardaparques 1.m4a'
      },
      {
        id: 'KW_06',
        termEn: 'Cloud forest',
        termEs: 'Bosque nuboso',
        category: 'Nature & Ecosystems',
        definitionEn: 'High-altitude tropical mountain forest characterized by persistent low-level cloud cover, mosses, orchids, and the Resplendent Quetzal, such as Monteverde.',
        definitionEs: 'Bosque montañoso de gran altitud cubierto de neblina constante, musgos, orquídeas y quetzales, como Monteverde.',
        sprite: 'sprites/bosquehoja.png',
        audioFile: 'audio/What is Monte Verde´s most famous attraction.m4a'
      },
      {
        id: 'KW_07',
        termEn: 'Beaches',
        termEs: 'Playas',
        category: 'Nature & Ecosystems',
        definitionEn: 'Sandy coastal shorelines along the Pacific and Caribbean coasts, ranging from white and golden sand to volcanic black sand beaches.',
        definitionEs: 'Costas de arena a lo largo del Pacífico y el Caribe, desde arenas blancas y doradas hasta playas de arena volcánica.',
        sprite: 'sprites/playa.png',
        audioFile: 'audio/006 All of the following are beaches in Guanacaste except.m4a'
      },
      {
        id: 'KW_08',
        termEn: 'Countryside',
        termEs: 'Zona rural / Campo',
        category: 'Culture & Traditions',
        definitionEn: 'Rural agricultural landscapes, coffee highlands, dairy pastures, and traditional villages outside urban centers.',
        definitionEs: 'Paisajes rurales, zonas agrícolas, cafetales, lecherías y pueblos tradicionales fuera de las ciudades.',
        sprite: 'sprites/02-CoffeeFarm.png',
        audioFile: 'audio/MASTER CAFE MARIA 001.m4a'
      }
    ]
  },
  {
    columnIndex: 2,
    gameObjectName: 'Text (2)',
    rawText: 'National parks\nSurfing\nWatching \nCrocodiles\nHiking\nCamping\nTypical food \nBird watching',
    terms: [
      {
        id: 'KW_09',
        termEn: 'National parks',
        termEs: 'Parques nacionales',
        category: 'Nature & Ecosystems',
        definitionEn: 'Protected natural reserves established by SINAC to conserve ecosystems and biodiversity, covering over a quarter of Costa Rica’s territory.',
        definitionEs: 'Áreas silvestres protegidas para conservar los ecosistemas y la biodiversidad, que cubren más del 25% del territorio nacional.',
        sprite: 'sprites/manuelantonio.png',
        audioFile: 'audio/Puntarenas Manuel Antonio Lisa 001.m4a'
      },
      {
        id: 'KW_10',
        termEn: 'Surfing',
        termEs: 'Surf / Surfear',
        category: 'Adventure & Sports',
        definitionEn: 'Water sport of riding ocean waves on a surfboard, practiced at famous beaches like Tamarindo, Jacó, Hermosa, Pavones, and Puerto Viejo (Salsa Brava).',
        definitionEs: 'Deporte acuático que consiste en deslizarse sobre las olas del mar en una tabla, famoso en Tamarindo, Jacó, Hermosa y Puerto Viejo.',
        sprite: 'sprites/tamarindo.png',
        audioFile: 'audio/002 Guanacaste, tamarindoi, surf lisa 001.m4a'
      },
      {
        id: 'KW_11',
        termEn: 'Watching Crocodiles',
        termEs: 'Avistamiento de cocodrilos',
        category: 'Biodiversity & Fauna',
        definitionEn: 'Observing wild American crocodiles (Crocodylus acutus) safely from bridges or guided riverboats along the Grande de Tárcoles River and Palo Verde.',
        definitionEs: 'Observación segura de cocodrilos americanos en su hábitat natural en el río Grande de Tárcoles y Palo Verde.',
        sprite: 'sprites/tarcoles.png',
        audioFile: 'audio/Ok lets go to Tarcoles River LISA B.m4a'
      },
      {
        id: 'KW_12',
        termEn: 'Hiking',
        termEs: 'Senderismo / Caminata',
        category: 'Adventure & Sports',
        definitionEn: 'Walking along nature trails through national parks, mountain peaks like Cerro Chirripó, volcano craters, and rainforest reserves.',
        definitionEs: 'Caminata por senderos naturales a través de parques nacionales, el Cerro Chirripó, volcanes y reservas biológicas.',
        sprite: 'sprites/barrahonda.png',
        audioFile: 'audio/001 Guanacaste, Barra Honda Park ranger 001.m4a'
      },
      {
        id: 'KW_13',
        termEn: 'Camping',
        termEs: 'Acampar',
        category: 'Adventure & Sports',
        definitionEn: 'Staying overnight outdoors in tents at designated national park sectors such as Santa Rosa, Junquillal, and Barra Honda.',
        definitionEs: 'Pernoctar al aire libre en tiendas de campaña en áreas autorizadas de parques nacionales como Santa Rosa y Barra Honda.',
        sprite: 'sprites/Mochileros_Spritesheet_0.png',
        audioFile: 'audio/001 Is “Bosque de la Hoja” a place where you can enjoy nature.m4a'
      },
      {
        id: 'KW_14',
        termEn: 'Typical food',
        termEs: 'Comida típica',
        category: 'Culture & Traditions',
        definitionEn: 'Traditional Costa Rican dishes including Gallo Pinto, Casado, Olla de Carne, Chorreadas, Tamales, Churchill, and Caribbean Rice and Beans with Rondón.',
        definitionEs: 'Gastronomía tradicional costarricense como el Gallo Pinto, Casado, Olla de Carne, Tamales, Churchill y el Rice and Beans caribeño.',
        sprite: 'sprites/Recetas e ingredientes_2.png',
        audioFile: 'audio/Mark the typical dishes form Limón that you have tasted.m4a'
      },
      {
        id: 'KW_15',
        termEn: 'Bird watching',
        termEs: 'Avistamiento de aves',
        category: 'Biodiversity & Fauna',
        definitionEn: 'Observing Costa Rica’s more than 900 bird species, including the Resplendent Quetzal, Scarlet Macaw, Keel-billed Toucan, Hummingbirds, and Yigüirro.',
        definitionEs: 'Observación de las más de 900 especies de aves del país, como el Quetzal, la Lapa Roja, el Tucán, los Colibríes y el Yigüirro.',
        sprite: 'sprites/vulture-Sheet_0.png',
        audioFile: 'audio/006 fauna cahuita.m4a'
      }
    ]
  },
  {
    columnIndex: 3,
    gameObjectName: 'Text (3)',
    rawText: 'Rafting on rivers\nCanopy tours\nHot springs \nScuba diving\nSport fishing \nKayaking\nGolfing',
    terms: [
      {
        id: 'KW_16',
        termEn: 'Rafting on rivers',
        termEs: 'Rafting en ríos / Rápidos',
        category: 'Adventure & Sports',
        definitionEn: 'Navigating white-water river rapids in an inflatable raft with paddles on rivers such as the Pacuare, Reventazón, Sarapiquí, and Savegre.',
        definitionEs: 'Descenso en balsa inflable por los rápidos de ríos caudalosos como el Pacuare, Reventazón, Sarapiquí y Savegre.',
        sprite: 'sprites/BG_SJ_Rafting.png',
        audioFile: 'audio/006 What should you take with you on the Pacuare River for safety.m4a'
      },
      {
        id: 'KW_17',
        termEn: 'Canopy tours',
        termEs: 'Canopy / Tirolesa',
        category: 'Adventure & Sports',
        definitionEn: 'Gliding along steel zip-lines suspended high between rainforest treetops in destinations like Monteverde, Arenal, and Sarapiquí.',
        definitionEs: 'Deslizamiento por cables de acero suspendidos entre las copas de los árboles del bosque en Monteverde, Arenal y Sarapiquí.',
        sprite: 'sprites/Background 1 Colinas_Long.png',
        audioFile: 'audio/004 What tourist attractions can you find in La Fortuna de San Carlos.m4a'
      },
      {
        id: 'KW_18',
        termEn: 'Hot springs',
        termEs: 'Aguas termales',
        category: 'Nature & Ecosystems',
        definitionEn: 'Natural geothermally heated mineral pools fed by volcanic activity around Arenal Volcano (La Fortuna), Rincón de la Vieja, and Orosi.',
        definitionEs: 'Piscinas naturales de aguas minerales calentadas por la actividad volcánica en La Fortuna de San Carlos, Rincón de la Vieja y Orosi.',
        sprite: 'sprites/Volcan_01-Sheet_6.png',
        audioFile: 'audio/007 What volcanoes are located in Alajuela.m4a'
      },
      {
        id: 'KW_19',
        termEn: 'Scuba diving',
        termEs: 'Buceo',
        category: 'Adventure & Sports',
        definitionEn: 'Swimming underwater with breathing equipment to explore coral reefs and marine life in Playas del Coco, Catalina Islands, Caño Island, and Cocos Island.',
        definitionEs: 'Inmersión subacuática con equipo de respiración para explorar arrecifes y vida marina en Playas del Coco, Isla del Caño e Isla del Coco.',
        sprite: 'sprites/Personaje_Sprites_02_snorkel 1_0.png',
        audioFile: 'audio/003 Guanacaste, diving in coco, locutor 001 MASC.m4a'
      },
      {
        id: 'KW_20',
        termEn: 'Sport fishing',
        termEs: 'Pesca deportiva',
        category: 'Adventure & Sports',
        definitionEn: 'Catch-and-release recreational fishing for marlin, sailfish, dorado, and tarpon along the Pacific marinas (Quepos, Golfito, Flamingo) and CaribbeanBarra del Colorado.',
        definitionEs: 'Pesca recreativa de captura y liberación de pez vela, marlín y sábalo en Quepos, Golfito, Flamingo y Barra del Colorado.',
        sprite: 'sprites/Pez Azul_0.png',
        audioFile: 'audio/007 What sports can you practice in Limón.m4a'
      },
      {
        id: 'KW_21',
        termEn: 'Kayaking',
        termEs: 'Kayak',
        category: 'Adventure & Sports',
        definitionEn: 'Paddling a narrow small boat across calm lagoons, mangroves, estuaries, and canals such as Tortuguero, Lake Arenal, and Golfo Dulce.',
        definitionEs: 'Navegación con remo en una embarcación ligera por canales, manglares y lagos como Tortuguero, Lago Arenal y Golfo Dulce.',
        sprite: 'sprites/bote down_0.png',
        audioFile: 'audio/Limon Tortuguero Locutor 002 FEM.m4a'
      },
      {
        id: 'KW_22',
        termEn: 'Golfing',
        termEs: 'Golf',
        category: 'Adventure & Sports',
        definitionEn: 'Playing golf on scenic coastal and Central Valley courses surrounded by tropical dry forest and ocean views in Guanacaste and Puntarenas.',
        definitionEs: 'Práctica de golf en campos escénicos rodeados de bosque tropical y vistas al mar en Guanacaste, Puntarenas y el Valle Central.',
        sprite: 'sprites/fondo.png',
        audioFile: 'audio/010 What sports can you practice in Heredia.m4a'
      }
    ]
  }
];

const extendedCulturalGlossary = [
  {
    id: 'CULT_01',
    termEn: 'Pura Vida',
    termEs: 'Pura Vida',
    category: 'Culture & Traditions',
    provinceId: 0,
    definitionEn: 'Costa Rica’s national motto and cultural philosophy signifying gratitude, peace, optimism, hello, goodbye, and living life to the fullest.',
    definitionEs: 'Expresión nacional y filosofía de vida costarricense que refleja gratitud, optimismo, armonía, saludo y bienestar.',
    sprite: 'sprites/Logo Costa Rica Final Grande.png',
    audioFile: 'audio/MASTER MENU DANIEL 001.m4a'
  },
  {
    id: 'CULT_02',
    termEn: 'Pre-Columbian Gold Museum',
    termEs: 'Museo del Oro Precolombino',
    category: 'Pre-Columbian Heritage',
    provinceId: 0,
    definitionEn: 'Underground museum beneath Plaza de la Cultura in San José managed by the Central Bank of Costa Rica, preserving over 1,600 Indigenous gold artifacts.',
    definitionEs: 'Museo subterráneo bajo la Plaza de la Cultura en San José que conserva más de 1.600 piezas de orfebrería indígena precolombina.',
    sprite: 'sprites/03-MuseoDelOro.png',
    audioFile: 'audio/MASTER MUSEO ORO TICO1NPC 001.m4a'
  },
  {
    id: 'CULT_03',
    termEn: 'Coffee Cherry (Grano de Oro)',
    termEs: 'Fruto del Café (Grano de Oro)',
    category: 'Culture & Traditions',
    provinceId: 0,
    definitionEn: 'Ripe red coffee fruit harvested in baskets (canastos) across Costa Rica’s volcanic valleys; historically called the "Golden Bean" for driving national development.',
    definitionEs: 'Fruto rojo maduro del cafeto recolectado en canastos; llamado históricamente el "Grano de Oro" por su aporte al desarrollo de Costa Rica.',
    sprite: 'sprites/Tilemap_cafetal_32x32 V2_44.png',
    audioFile: 'audio/MASTER CAFE MARIA 002.m4a'
  },
  {
    id: 'CULT_04',
    termEn: 'Masquerade Parade (Mascarada)',
    termEs: 'Mascarada tradicional costarricense',
    category: 'Culture & Traditions',
    provinceId: 1,
    definitionEn: 'Festive street parade featuring giant hand-crafted papier-mâché masks (Gigantas, Diablos, Calaveras) dancing to Cimarrona brass bands in Barva de Heredia and Cartago.',
    definitionEs: 'Desfile festivo con grandes máscaras artesanales (mantudos y gigantas) que bailan al ritmo de la cimarrona en pueblos como Barva de Heredia.',
    sprite: 'sprites/Giganta_anim_0.png',
    audioFile: 'audio/Mascarada Lisa 001.m4a'
  },
  {
    id: 'CULT_05',
    termEn: 'City of Flowers',
    termEs: 'Ciudad de las Flores (Heredia)',
    category: 'Culture & Traditions',
    provinceId: 1,
    definitionEn: 'Popular nickname for Heredia, honoring both its lush gardens and floriculture industry as well as the historic Flores family.',
    definitionEs: 'Sobrenombre tradicional de la provincia de Heredia, famosa por sus jardines, viveros, floristerías y su herencia histórica.',
    sprite: 'sprites/flores.png',
    audioFile: 'audio/003 Is Heredia called the city of flowers.m4a'
  },
  {
    id: 'CULT_06',
    termEn: 'Sanatorio Carlos Durán',
    termEs: 'Sanatorio Carlos Durán',
    category: 'Culture & Traditions',
    provinceId: 2,
    definitionEn: 'Historic hospital complex founded in 1918 in Tierra Blanca, Cartago, by Dr. Carlos Durán Cartín to treat tuberculosis patients; today a cultural and architectural landmark.',
    definitionEs: 'Histórico hospital fundado en 1918 en Tierra Blanca de Cartago por el Dr. Carlos Durán Cartín; hoy patrimonio arquitectónico y turístico.',
    sprite: 'sprites/sanatorio.png',
    audioFile: 'audio/Sanatorio Duran Locutor 001 MASC.m4a'
  },
  {
    id: 'CULT_07',
    termEn: 'Churchill',
    termEs: 'Churchill puntarenense',
    category: 'Culture & Traditions',
    provinceId: 4,
    definitionEn: 'Iconic cold dessert from the Paseo de los Turistas in Puntarenas made with shaved ice, red kola syrup, powdered milk, condensed milk, and ice cream.',
    definitionEs: 'Tradicional granizado del Paseo de los Turistas en Puntarenas preparado con hielo raspado, sirope de kola, leche en polvo, leche condensada y helado.',
    sprite: 'sprites/Carrito Churchill.png',
    audioFile: 'audio/Puntarenas churchil Luis vendedor1.m4a'
  },
  {
    id: 'CULT_08',
    termEn: 'Caribbean Rice and Beans',
    termEs: 'Rice and Beans caribeño',
    category: 'Caribbean Cuisine',
    provinceId: 6,
    definitionEn: 'Signature Afro-Caribbean dish of Limón made by slow-cooking red beans and rice in fresh coconut milk with thyme, garlic, onion, and habanero (Panamanian) pepper.',
    definitionEs: 'Platillo emblemático afrocaribeño de Limón cocinado con frijoles rojos y arroz en leche de coco, tomillo, ajo, cebolla y chile panameño.',
    sprite: 'sprites/Recetas e ingredientes_2.png',
    audioFile: 'audio/RiceAndBeansReceta.m4a'
  },
  {
    id: 'CULT_09',
    termEn: 'Rondón',
    termEs: 'Rondón caribeño',
    category: 'Caribbean Cuisine',
    provinceId: 6,
    definitionEn: 'Traditional Limón coconut milk soup ("Run Down") simmered with fresh fish, yucca, yellow yam, sweet potatoes, carrots, plantains, ginger, thyme, and Panama chili.',
    definitionEs: 'Sopa tradicional de Limón cocinada en leche de coco con pescado fresco, yuca, ñame, camote, zanahoria, jengibre, tomillo y chile panameño.',
    sprite: 'sprites/Recetas e ingredientes_3.png',
    audioFile: 'audio/Receta Rondon A-Fix.m4a'
  },
  {
    id: 'CULT_10',
    termEn: 'Patty',
    termEs: 'Patí limonense',
    category: 'Caribbean Cuisine',
    provinceId: 6,
    definitionEn: 'Golden baked pastry turnover stuffed with spiced ground beef, coconut milk, thyme, and fiery habanero/Panama chili pepper.',
    definitionEs: 'Empanada horneada rellena de carne molida condimentada con leche de coco, tomillo, especias y chile panameño.',
    sprite: 'sprites/Recetas e ingredientes_0.png',
    audioFile: 'audio/Receta Paty A.m4a'
  },
  {
    id: 'CULT_11',
    termEn: 'Agua de Sapo',
    termEs: 'Agua de Sapo (Hiel)',
    category: 'Caribbean Cuisine',
    provinceId: 6,
    definitionEn: 'Refreshing Limón beverage made by boiling brown cane sugar (tapa de dulce) and fresh ginger root in water, chilled with fresh lemon juice and ice.',
    definitionEs: 'Bebida refrescante típica de Limón elaborada con tapa de dulce, jengibre fresco, jugo de limón y hielo.',
    sprite: 'sprites/Recetas e ingredientes_1.png',
    audioFile: 'audio/Receta Agua de Sapo A.m4a'
  },
  {
    id: 'CULT_12',
    termEn: 'Pan Bon',
    termEs: 'Pan Bon (Pan negro caribeño)',
    category: 'Caribbean Cuisine',
    provinceId: 6,
    definitionEn: 'Dark spiced sweet bread from Limón baked with brown sugar/molasses, cinnamon, nutmeg, vanilla, raisins, and candied fruit.',
    definitionEs: 'Pan dulce especiado de Limón horneado con azúcar moreno o melaza, canela, nuez moscada, vainilla, pasas y frutas confitadas.',
    sprite: 'sprites/Recetas e ingredientes_4.png',
    audioFile: 'audio/Receta Pan Bon A.m4a'
  },
  {
    id: 'CULT_13',
    termEn: 'West Indian Manatee',
    termEs: 'Manatí del Caribe',
    category: 'Biodiversity & Fauna',
    provinceId: 6,
    definitionEn: 'Gentle herbivorous marine mammal living in the canals of Tortuguero and Barra del Colorado; declared Costa Rica’s National Symbol of Marine Fauna in 2014.',
    definitionEs: 'Mamífero acuático herbívoro que habita los canales de Tortuguero; declarado Símbolo Nacional de la Fauna Marina de Costa Rica en 2014.',
    sprite: 'sprites/Manatee-Sheet2_0.png',
    audioFile: 'audio/Limon Tortuguero Locutor 003 FEM.m4a'
  },
  {
    id: 'CULT_14',
    termEn: 'Sea Turtle Nesting (Arribada / Desove)',
    termEs: 'Desove de tortugas marinas',
    category: 'Biodiversity & Fauna',
    provinceId: 6,
    definitionEn: 'Natural cycle where green, leatherback, hawksbill, and olive ridley sea turtles come ashore at Tortuguero and Ostional to lay their eggs in the sand.',
    definitionEs: 'Proceso natural en el que las tortugas marinas llegan a playas como Tortuguero y Ostional para depositar sus huevos en la arena.',
    sprite: 'sprites/Tortu_verde_0__sharedassets40_32.png',
    audioFile: 'audio/Limon tortugas Sara (conservacionista) 001.m4a'
  },
  {
    id: 'CULT_15',
    termEn: 'Limestone Caverns (Stalactites & Stalagmites)',
    termEs: 'Cavernas calcáreas (Estalactitas y Estalagmitas)',
    category: 'Nature & Ecosystems',
    provinceId: 5,
    definitionEn: 'Underground karst caves in Barra Honda National Park featuring mineral formations hanging from ceilings (stalactites) and rising from floors (stalagmites).',
    definitionEs: 'Cuevas subterráneas del Parque Nacional Barra Honda con formaciones de carbonato de calcio en el techo (estalactitas) y el suelo (estalagmitas).',
    sprite: 'sprites/GNBH_Background2.png',
    audioFile: 'audio/002 Guanacaste, Barra Honda Park ranger 002.m4a'
  }
];

const flatKeywords = coreKeywordsColumns.flatMap((col) =>
  col.terms.map((t) => ({ ...t, columnIndex: col.columnIndex }))
);

fs.writeFileSync(
  path.join(OUT_DATA_DIR, 'glossary.json'),
  JSON.stringify(
    {
      sceneIndex: 8,
      sceneName: 'Glosario',
      screenTitle: 'Keywords',
      backButtonLabel: 'Back to game title',
      backgroundSprite: 'sprites/fondo.png',
      buttonSprite: 'sprites/boton_2.png',
      musicIndex: 0,
      musicFile: 'audio/Tema del juego.m4a',
      totalCoreKeywords: flatKeywords.length,
      totalExtendedTerms: extendedCulturalGlossary.length,
      totalEntries: flatKeywords.length + extendedCulturalGlossary.length,
      columns: coreKeywordsColumns,
      coreKeywords: flatKeywords,
      extendedCulturalTerms: extendedCulturalGlossary
    },
    null,
    2
  ),
  'utf8'
);
console.log('Generated app/src/data/glossary.json');

// ============================================================================
// 8. Build 6: app/src/data/dialogues.json
// ============================================================================
const creditsHierarchyTexts = sceneTextsByLevel.get(9) || [];
const uniqueFungusSceneIndices = [...new Set(fungusRaw.map((f) => f.sceneIndex))].sort((a, b) => a - b);
const dialoguesData = {
  totalNarrativeScenesWithFungus: uniqueFungusSceneIndices.length,
  totalFungusDialogueLines: fungusRaw.length,
  coreScreensNarrative: {
    mainTitle: {
      sceneIndex: 0,
      sceneName: 'Main',
      buttons: ['New Game', 'Continue']
    },
    newGameWarning: {
      sceneIndex: 3,
      sceneName: 'NewGameWarning',
      warningText: 'Warning: starting a new game will delete all your previous data.\n\nAre you sure you want to go on?',
      confirmLabel: 'Yes, start a new game',
      cancelLabel: 'No, go back'
    },
    characterSelect: {
      sceneIndex: 5,
      sceneName: 'SelecGenero',
      header: 'Choose a \ncharacter',
      prompt: 'Please tell me.\nAre you a boy? \nOr are you a girl?',
      options: ['Mike', 'Lisa']
    },
    characterIntroConversation: {
      sceneIndex: 4,
      sceneName: 'SelecScreen',
      musicFile: 'audio/dialogos.m4a',
      maleBannerText: "Mike, Costa Rica it's a wonderful country, a lot of adventures waits!",
      femaleBannerText: "Lisa, Costa Rica it's a wonderful country, a lot of adventures waits!",
      dialogues: getFungusDialoguesForScene(4)
    },
    adventureStart: {
      sceneIndex: 6,
      sceneName: 'AdventureStart',
      narrativeText: "Costa Rica is a wonderful country!\n\nLots of adventures await for you.\n\nLet's get started!",
      buttonLabel: 'START'
    },
    gameEnding: {
      sceneIndex: 7,
      triggerComponent: 'GameEnding.CheckEnding (level7) -> GameMenu.ShowEnding (level0)',
      musicIndex: 26,
      musicFile: 'audio/Ganar (largo).m4a',
      finalMessage: 'Hope you have enjoyed \nyour stay in Costa Rica!  \n\n\nWe hope to see you back soon!',
      creditsButtonLabel: 'Credits'
    },
    credits: {
      sceneIndex: 9,
      sceneName: 'Creditos',
      musicIndex: 23,
      musicFile: 'audio/Credits Costa Rica Pura Vida.m4a',
      backButtonLabel: 'Back to game title',
      sections: creditsHierarchyTexts.map((t) => ({
        id: t.gameObjectName,
        text: t.text
      }))
    }
  },
  provinceWelcomeVoiceOvers: provincesData.map((p) => ({
    provinceId: p.id,
    provinceName: p.nameEs,
    welcomeTitle: p.welcomeTitle,
    femaleAudio: p.welcomeAudio.female,
    maleAudio: p.welcomeAudio.male
  })),
  fungusScenes: uniqueFungusSceneIndices.map((scIdx) => {
    const scEntries = fungusRaw.filter((f) => f.sceneIndex === scIdx);
    const scName = scEntries[0]?.sceneName || `level${scIdx}`;
    const lines = getFungusDialoguesForScene(scIdx);
    return {
      sceneIndex: scIdx,
      sceneName: scName,
      totalLines: lines.length,
      lines
    };
  })
};

fs.writeFileSync(path.join(OUT_DATA_DIR, 'dialogues.json'), JSON.stringify(dialoguesData, null, 2), 'utf8');
console.log('Generated app/src/data/dialogues.json');

// ============================================================================
// 9. Build 7: app/src/data/assetsManifest.json
// ============================================================================
const assetsManifest = {
  summary: {
    totalSprites: spritesCatalog.length,
    totalTextures: texturesCatalog.length,
    totalAudioClips: audioCatalog.length,
    totalFonts: fontsCatalog.length,
    totalScenes: scenesIndex.length
  },
  basePaths: {
    sprites: 'sprites/',
    textures: 'textures/',
    audio: 'audio/',
    fonts: 'fonts/'
  },
  coreUIAssets: {
    logos: {
      loadingLogo: 'sprites/Logo Costa Rica Loading B.png',
      mainLogoLarge: 'sprites/Logo Costa Rica Final Grande.png',
      mainLogoSmall: 'sprites/Logo Costa Rica Final copy.png',
      mepLogo: 'sprites/mepLogo2.png',
      manyWaysIcon: 'sprites/Icon Many Ways.png'
    },
    backgrounds: {
      mainWindow: 'sprites/fondo.png',
      modalOverlay: 'sprites/fondo 1.png',
      pauseMenu: 'sprites/fondo_mid.png',
      costaRicaMap: 'sprites/mapa_cr2.png',
      dialogBox: 'sprites/DialogBoxSliced.png'
    },
    buttonsAndControls: {
      primaryButton: 'sprites/boton_2.png',
      secondaryButton: 'sprites/boton_3.png',
      closeButton: 'sprites/boton_cerrar.png',
      optionsGearButton: 'sprites/options_button.png',
      continueArrow: 'sprites/ContinueIcon.png',
      checkboxCheckmark: 'sprites/Checkmark.png',
      infoHelpButton: 'sprites/icono_informacion.png'
    },
    hudIcons: {
      coin: 'sprites/es-moneda.png',
      doll: 'sprites/doll-icon.png',
      log: 'sprites/logicon.png',
      coffeeBasket: 'sprites/Tilemap_cafetal_32x32 V2_44.png',
      flowers: 'sprites/flores.png',
      starEmpty: 'sprites/star_cero.png',
      starLeft: 'sprites/star_left.png',
      starCenter: 'sprites/star_center.png',
      starRight: 'sprites/star_right.png'
    },
    provinceShields: {
      SanJose: 'sprites/EscudoSanJosé.png',
      Heredia: 'sprites/EscudoHeredia.png',
      Cartago: 'sprites/EscudoCartago.png',
      Alajuela: 'sprites/EscudoAlajuela.png',
      Puntarenas: 'sprites/EscudoPuntarenas.png',
      Guanacaste: 'sprites/EscudoGuanacaste.png',
      Limon: 'sprites/EscudoLimon.png'
    }
  },
  fonts: fontsCatalog.map((f) => ({
    name: f.name,
    file: f.extractedFile,
    extension: f.extension,
    byteLength: f.byteLength
  })),
  musicTracks,
  soundEffects,
  sprites: spritesCatalog.map((s) => ({
    name: s.name,
    file: s.extractedFile,
    sourceFile: s.sourceFile,
    width: s.croppedWidth,
    height: s.croppedHeight,
    pivot: s.pivot
  })),
  audioClips: audioCatalog.map((a) => ({
    name: a.name,
    file: a.extractedFile,
    sourceFile: a.sourceFile,
    durationSeconds: a.lengthSeconds,
    frequency: a.frequency,
    channels: a.channels
  })),
  textures: texturesCatalog.map((t) => ({
    name: t.name,
    file: t.extractedFile,
    sourceFile: t.sourceFile,
    width: t.width,
    height: t.height,
    format: t.formatName
  }))
};

fs.writeFileSync(path.join(OUT_DATA_DIR, 'assetsManifest.json'), JSON.stringify(assetsManifest, null, 2), 'utf8');
console.log('Generated app/src/data/assetsManifest.json');
console.log('ALL 7 JSON DATABASE FILES GENERATED SUCCESSFULLY!');
