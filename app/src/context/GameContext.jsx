import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import gameConfig from '../data/gameConfig.json';
import provincesData from '../data/provinces.json';
import minigamesData from '../data/minigames.json';
import { useAudio } from './AudioContext';

const GameContext = createContext(null);

const STORAGE_KEYS = {
  coins: 'CRPVMW_monedas',
  character: 'CRPVMW_personaje',
  location: 'CRPVMW_location',
  levelPrefix: 'CRPVMW_level_'
};

function readInitialProvinceLevels() {
  const levels = {};
  for (let i = 0; i <= 7; i++) {
    const raw = localStorage.getItem(`${STORAGE_KEYS.levelPrefix}${i}`);
    if (raw && typeof raw === 'string' && raw.length === 3) {
      levels[i] = raw;
    } else {
      levels[i] = '000';
    }
  }
  return levels;
}

function normalizeCharacterFromStorage(val) {
  if (val === '0' || val === 0 || val === 'mike' || val === 'Mike' || val === 'false') {
    return 'mike';
  }
  return 'lisa';
}

export function GameProvider({ children }) {
  const { playSfx } = useAudio();

  // Core Persistent State (100% compatible with original CRPVMW_* localStorage keys)
  const [coins, setCoinsState] = useState(() => {
    const saved = parseInt(localStorage.getItem(STORAGE_KEYS.coins), 10);
    return Number.isFinite(saved) ? saved : gameConfig.economyAndProgression.initialCoins;
  });

  const [characterId, setCharacterIdState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.character);
    return saved !== null ? normalizeCharacterFromStorage(saved) : 'lisa';
  });

  const [currentLocation, setCurrentLocationState] = useState(() => {
    const saved = parseInt(localStorage.getItem(STORAGE_KEYS.location), 10);
    return Number.isFinite(saved) && saved >= 0 && saved <= 6 ? saved : 0;
  });

  const [provinceLevels, setProvinceLevelsState] = useState(() => readInitialProvinceLevels());

  // Navigation & UI Modal State
  // Screens: 'Main' | 'NewGameWarning' | 'SelecGenero' | 'SelecScreen' | 'AdventureStart' | 'MapaCostaRica' | 'Glosario' | 'Creditos' | 'Opciones' | 'Minigame'
  const [currentScreen, setCurrentScreen] = useState('Main');
  const [previousScreen, setPreviousScreen] = useState('Main');
  const [activeProvinceHub, setActiveProvinceHub] = useState(null); // provinceId 0..6 when viewing province minigames modal
  const [activeMinigameId, setActiveMinigameId] = useState(null);
  const [minigamePhase, setMinigamePhase] = useState('intro'); // 'intro' | 'play'

  // Global Modals
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [showCancelGameModal, setShowCancelGameModal] = useState(false);
  const [showEndingModal, setShowEndingModal] = useState(false);
  const [showTeacherPanel, setShowTeacherPanel] = useState(false);
  const [teacherFreeTravel, setTeacherFreeTravel] = useState(false);

  // Sync to localStorage automatically
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.coins, String(coins));
  }, [coins]);

  useEffect(() => {
    // Original C# stores 1 for Lisa (female=true) and 0 for Mike (male=false)
    localStorage.setItem(STORAGE_KEYS.character, characterId === 'lisa' ? '1' : '0');
  }, [characterId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.location, String(currentLocation));
  }, [currentLocation]);

  useEffect(() => {
    for (let i = 0; i <= 7; i++) {
      localStorage.setItem(`${STORAGE_KEYS.levelPrefix}${i}`, provinceLevels[i] || '000');
    }
  }, [provinceLevels]);

  const characterData = useMemo(() => {
    const list = gameConfig.characters?.selectable || [];
    return list.find((c) => c.id === characterId) || list[0];
  }, [characterId]);

  const isFemale = characterId === 'lisa';

  // Calculate stars per province & total stars (out of 21)
  const starsByProvince = useMemo(() => {
    const map = {};
    for (let i = 0; i < 7; i++) {
      const str = provinceLevels[i] || '000';
      const bits = [str[0] !== '0', str[1] !== '0', str[2] !== '0'];
      map[i] = {
        raw: str,
        pieces: bits,
        count: bits.filter(Boolean).length
      };
    }
    return map;
  }, [provinceLevels]);

  const totalStarsEarned = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      sum += starsByProvince[i]?.count || 0;
    }
    return sum;
  }, [starsByProvince]);

  const hasSavedGame = useMemo(() => {
    return (
      localStorage.getItem(STORAGE_KEYS.coins) !== null ||
      localStorage.getItem(`${STORAGE_KEYS.levelPrefix}0`) !== null
    );
  }, [coins, provinceLevels]);

  // Check GameEnding condition when on MapaCostaRica
  useEffect(() => {
    if (currentScreen === 'MapaCostaRica' && totalStarsEarned === 21) {
      if (provinceLevels[7] === '111') {
        setShowEndingModal(true);
        setProvinceLevelsState((prev) => ({
          ...prev,
          7: '222'
        }));
      }
    }
  }, [currentScreen, totalStarsEarned, provinceLevels]);

  // Economy methods
  const addCoins = useCallback(
    (amount, withSfx = true) => {
      const delta = Math.round(Number(amount) || 0);
      if (delta <= 0) return;
      setCoinsState((prev) => prev + delta);
      if (withSfx) playSfx(35); // audio/coins.m4a
    },
    [playSfx]
  );

  const spendCoins = useCallback(
    (amount, withSfx = true) => {
      const delta = Math.round(Number(amount) || 0);
      if (delta <= 0) return true;
      if (coins < delta) return false;
      setCoinsState((prev) => Math.max(0, prev - delta));
      if (withSfx) playSfx(35); // audio/coins.m4a
      return true;
    },
    [coins, playSfx]
  );

  const setCoins = useCallback((amount) => {
    setCoinsState(Math.max(0, Math.round(Number(amount) || 0)));
  }, []);

  const selectCharacter = useCallback((id) => {
    setCharacterIdState(id === 'mike' ? 'mike' : 'lisa');
  }, []);

  // Register minigame star piece (provinceId: 0..6, starPieceIndex: 0..2, value: '1')
  const registerMinigameProgress = useCallback((provinceId, starPieceIndex, value = '1') => {
    if (provinceId === undefined || provinceId === null || starPieceIndex === undefined || starPieceIndex === null) {
      return;
    }
    setProvinceLevelsState((prev) => {
      const currentStr = prev[provinceId] || '000';
      const chars = currentStr.split('');
      chars[starPieceIndex] = String(value)[0] || '1';
      const nextStr = chars.join('');
      const updated = { ...prev, [provinceId]: nextStr };

      // Check if all 7 provinces (0..6) have all 3 star pieces !== '0'
      let allComplete = true;
      for (let p = 0; p < 7; p++) {
        const s = updated[p] || '000';
        if (s[0] === '0' || s[1] === '0' || s[2] === '0') {
          allComplete = false;
          break;
        }
      }
      if (allComplete && updated[7] === '000') {
        updated[7] = '111';
      }
      return updated;
    });
  }, []);

  // Reset Data (GameControl.ResetData equivalent)
  const resetNewGame = useCallback(() => {
    setCoinsState(gameConfig.economyAndProgression.initialCoins);
    setCharacterIdState('lisa');
    setCurrentLocationState(0);
    const freshLevels = {
      0: '000',
      1: '000',
      2: '000',
      3: '000',
      4: '000',
      5: '000',
      6: '000',
      7: '000'
    };
    setProvinceLevelsState(freshLevels);
    setActiveProvinceHub(null);
    setActiveMinigameId(null);
    setShowEndingModal(false);
  }, []);

  // Load Data (GameControl.LoadData equivalent)
  const loadSavedGame = useCallback(() => {
    const savedCoins = parseInt(localStorage.getItem(STORAGE_KEYS.coins), 10);
    if (Number.isFinite(savedCoins)) setCoinsState(savedCoins);
    const savedChar = localStorage.getItem(STORAGE_KEYS.character);
    if (savedChar !== null) setCharacterIdState(normalizeCharacterFromStorage(savedChar));
    const savedLoc = parseInt(localStorage.getItem(STORAGE_KEYS.location), 10);
    if (Number.isFinite(savedLoc) && savedLoc >= 0 && savedLoc <= 6) {
      setCurrentLocationState(savedLoc);
    }
    setProvinceLevelsState(readInitialProvinceLevels());
  }, []);

  // Navigation helpers
  const navigateTo = useCallback(
    (screenName) => {
      setPreviousScreen(currentScreen);
      setCurrentScreen(screenName);
      setShowPauseMenu(false);
      setShowCancelGameModal(false);
    },
    [currentScreen]
  );

  const launchMinigame = useCallback((minigameId, skipIntro = false) => {
    const allGames = [
      ...(minigamesData.minigames || []),
      ...(minigamesData.legacyAndSiblingMinigames || [])
    ];
    const found = allGames.find((m) => m.id === minigameId);
    if (!found) return;
    setActiveMinigameId(minigameId);
    const hasIntro = Array.isArray(found.introDialogues) && found.introDialogues.length > 0;
    setMinigamePhase(skipIntro || !hasIntro ? 'play' : 'intro');
    setActiveProvinceHub(null);
    setCurrentScreen('Minigame');
    setShowPauseMenu(false);
    setShowCancelGameModal(false);
  }, []);

  const returnToMap = useCallback(() => {
    setActiveMinigameId(null);
    setMinigamePhase('intro');
    setCurrentScreen('MapaCostaRica');
    setShowPauseMenu(false);
    setShowCancelGameModal(false);
  }, []);

  const unlockAllStars = useCallback(() => {
    setProvinceLevelsState({
      0: '111',
      1: '111',
      2: '111',
      3: '111',
      4: '111',
      5: '111',
      6: '111',
      7: '111'
    });
    if (currentScreen === 'MapaCostaRica') {
      setShowEndingModal(true);
    }
  }, [currentScreen]);

  const exportSaveData = useCallback(() => {
    const payload = {
      project: 'Costa Rica Pura Vida in Many Ways',
      exportedAt: new Date().toISOString(),
      storage: {
        CRPVMW_monedas: coins,
        CRPVMW_personaje: characterId === 'lisa' ? 1 : 0,
        CRPVMW_location: currentLocation,
        CRPVMW_level_0: provinceLevels[0],
        CRPVMW_level_1: provinceLevels[1],
        CRPVMW_level_2: provinceLevels[2],
        CRPVMW_level_3: provinceLevels[3],
        CRPVMW_level_4: provinceLevels[4],
        CRPVMW_level_5: provinceLevels[5],
        CRPVMW_level_6: provinceLevels[6],
        CRPVMW_level_7: provinceLevels[7]
      }
    };
    return JSON.stringify(payload, null, 2);
  }, [coins, characterId, currentLocation, provinceLevels]);

  const importSaveData = useCallback((jsonText) => {
    try {
      const parsed = JSON.parse(jsonText);
      const s = parsed.storage || parsed;
      if (s.CRPVMW_monedas !== undefined) {
        setCoinsState(Math.max(0, parseInt(s.CRPVMW_monedas, 10) || 0));
      }
      if (s.CRPVMW_personaje !== undefined) {
        setCharacterIdState(normalizeCharacterFromStorage(s.CRPVMW_personaje));
      }
      if (s.CRPVMW_location !== undefined) {
        const loc = parseInt(s.CRPVMW_location, 10);
        if (loc >= 0 && loc <= 6) setCurrentLocationState(loc);
      }
      const nextLevels = {};
      for (let i = 0; i <= 7; i++) {
        const val = s[`CRPVMW_level_${i}`];
        nextLevels[i] = typeof val === 'string' && val.length === 3 ? val : '000';
      }
      setProvinceLevelsState(nextLevels);
      return true;
    } catch {
      return false;
    }
  }, []);

  const currentProvince = useMemo(() => {
    return (
      provincesData.provinces.find((p) => p.id === currentLocation) ||
      provincesData.provinces[0]
    );
  }, [currentLocation]);

  const value = {
    coins,
    addCoins,
    spendCoins,
    setCoins,
    characterId,
    characterData,
    isFemale,
    selectCharacter,
    currentLocation,
    setCurrentLocation: setCurrentLocationState,
    currentProvince,
    provinceLevels,
    starsByProvince,
    totalStarsEarned,
    registerMinigameProgress,
    hasSavedGame,
    resetNewGame,
    loadSavedGame,
    currentScreen,
    previousScreen,
    navigateTo,
    activeProvinceHub,
    setActiveProvinceHub,
    activeMinigameId,
    minigamePhase,
    setMinigamePhase,
    launchMinigame,
    returnToMap,
    showPauseMenu,
    setShowPauseMenu,
    showCancelGameModal,
    setShowCancelGameModal,
    showEndingModal,
    setShowEndingModal,
    showTeacherPanel,
    setShowTeacherPanel,
    teacherFreeTravel,
    setTeacherFreeTravel,
    unlockAllStars,
    exportSaveData,
    importSaveData
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return ctx;
}
