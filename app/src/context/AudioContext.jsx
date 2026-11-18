import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import gameConfig from '../data/gameConfig.json';
import { assetUrl } from '../utils/assetUrl';

const AudioContext = createContext(null);

const musicByIndex = new Map(
  (gameConfig.audio?.musicTracks || []).map((t) => [Number(t.index), t])
);
const sfxByIndex = new Map(
  (gameConfig.audio?.soundEffects || []).map((s) => [Number(s.index), s])
);

export function AudioProvider({ children }) {
  const [musicEnabled, setMusicEnabled] = useState(() => {
    const saved = localStorage.getItem('CRPVMW_musicEnabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [sfxEnabled, setSfxEnabled] = useState(() => {
    const saved = localStorage.getItem('CRPVMW_sfxEnabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [musicVolume, setMusicVolume] = useState(() => {
    const saved = parseFloat(localStorage.getItem('CRPVMW_musicVolume'));
    return Number.isFinite(saved) ? saved : 0.4;
  });
  const [sfxVolume, setSfxVolume] = useState(() => {
    const saved = parseFloat(localStorage.getItem('CRPVMW_sfxVolume'));
    return Number.isFinite(saved) ? saved : 0.85;
  });
  const [currentMusicTrack, setCurrentMusicTrack] = useState(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  const musicAudioRef = useRef(null);
  const voiceAudioRef = useRef(null);
  const pendingMusicRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('CRPVMW_musicEnabled', String(musicEnabled));
    if (musicAudioRef.current) {
      musicAudioRef.current.muted = !musicEnabled;
      if (!musicEnabled) {
        musicAudioRef.current.pause();
      } else if (musicAudioRef.current.src) {
        musicAudioRef.current.play().catch(() => {});
      }
    }
  }, [musicEnabled]);

  useEffect(() => {
    localStorage.setItem('CRPVMW_sfxEnabled', String(sfxEnabled));
    if (!sfxEnabled && voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      setIsPlayingVoice(false);
    }
  }, [sfxEnabled]);

  useEffect(() => {
    localStorage.setItem('CRPVMW_musicVolume', String(musicVolume));
    if (musicAudioRef.current) {
      musicAudioRef.current.volume = Math.max(0, Math.min(1, musicVolume));
    }
  }, [musicVolume]);

  useEffect(() => {
    localStorage.setItem('CRPVMW_sfxVolume', String(sfxVolume));
    if (voiceAudioRef.current) {
      voiceAudioRef.current.volume = Math.max(0, Math.min(1, sfxVolume));
    }
  }, [sfxVolume]);

  // Unlock audio playback on first user interaction
  useEffect(() => {
    const unlock = () => {
      if (musicEnabled && musicAudioRef.current && musicAudioRef.current.paused && musicAudioRef.current.src) {
        musicAudioRef.current.play().catch(() => {});
      } else if (musicEnabled && pendingMusicRef.current) {
        const { src, loop } = pendingMusicRef.current;
        if (musicAudioRef.current) {
          musicAudioRef.current.src = src;
          musicAudioRef.current.loop = loop;
          musicAudioRef.current.volume = Math.max(0, Math.min(1, musicVolume));
          musicAudioRef.current.play().catch(() => {});
        }
      }
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [musicEnabled, musicVolume]);

  const resolveMusicFile = useCallback((indexOrFile) => {
    if (typeof indexOrFile === 'number' || /^\d+$/.test(String(indexOrFile))) {
      const track = musicByIndex.get(Number(indexOrFile));
      return track ? track : null;
    }
    if (typeof indexOrFile === 'string' && indexOrFile.trim()) {
      return { index: -1, name: indexOrFile, file: indexOrFile };
    }
    return null;
  }, []);

  const playMusic = useCallback(
    (indexOrFile, options = {}) => {
      const track = resolveMusicFile(indexOrFile);
      if (!track || !track.file) return;
      const src = assetUrl(track.file);
      const isShortJingle = track.index === 24 || track.index === 25;
      const loop = options.loop !== undefined ? options.loop : !isShortJingle;

      if (!musicAudioRef.current) {
        musicAudioRef.current = new Audio();
      }
      const audio = musicAudioRef.current;
      pendingMusicRef.current = { src, loop, track };
      setCurrentMusicTrack(track);

      // Avoid restarting the exact same track if already playing
      if (audio.dataset.rawFile === track.file && !audio.paused && !options.forceRestart) {
        audio.loop = loop;
        audio.volume = Math.max(0, Math.min(1, musicVolume));
        audio.muted = !musicEnabled;
        return;
      }

      audio.pause();
      audio.src = src;
      audio.dataset.rawFile = track.file;
      audio.loop = loop;
      audio.volume = Math.max(0, Math.min(1, musicVolume));
      audio.muted = !musicEnabled;

      if (musicEnabled) {
        audio.play().catch(() => {
          // Will auto-resume on first pointerdown/keydown
        });
      }
    },
    [musicEnabled, musicVolume, resolveMusicFile]
  );

  const stopMusic = useCallback(() => {
    setMusicEnabled(false);
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
    }
  }, []);

  const resumeMusic = useCallback(() => {
    setMusicEnabled(true);
    if (musicAudioRef.current && musicAudioRef.current.src) {
      musicAudioRef.current.muted = false;
      musicAudioRef.current.play().catch(() => {});
    } else if (pendingMusicRef.current) {
      playMusic(pendingMusicRef.current.track.file);
    } else {
      playMusic(0);
    }
  }, [playMusic]);

  const playSfx = useCallback(
    (indexOrFile, volumeMultiplier = 1) => {
      if (!sfxEnabled) return null;
      let file = null;
      if (typeof indexOrFile === 'number' || /^\d+$/.test(String(indexOrFile))) {
        const item = sfxByIndex.get(Number(indexOrFile));
        if (item) file = item.file;
      } else if (typeof indexOrFile === 'string') {
        file = indexOrFile;
      } else if (indexOrFile && typeof indexOrFile === 'object' && indexOrFile.file) {
        file = indexOrFile.file;
      }
      if (!file) return null;

      try {
        const sfx = new Audio(assetUrl(file));
        sfx.volume = Math.max(0, Math.min(1, sfxVolume * volumeMultiplier));
        sfx.play().catch(() => {});
        return sfx;
      } catch {
        return null;
      }
    },
    [sfxEnabled, sfxVolume]
  );

  const stopVoice = useCallback(() => {
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current.currentTime = 0;
      voiceAudioRef.current = null;
    }
    setIsPlayingVoice(false);
  }, []);

  const playVoice = useCallback(
    (fileOrObj, onEndedCallback) => {
      stopVoice();
      if (!sfxEnabled || !fileOrObj) {
        if (onEndedCallback) onEndedCallback();
        return null;
      }
      const file = typeof fileOrObj === 'string' ? fileOrObj : fileOrObj.file;
      if (!file) {
        if (onEndedCallback) onEndedCallback();
        return null;
      }

      try {
        const voice = new Audio(assetUrl(file));
        voice.volume = Math.max(0, Math.min(1, sfxVolume));
        voiceAudioRef.current = voice;
        setIsPlayingVoice(true);

        const handleDone = () => {
          if (voiceAudioRef.current === voice) {
            setIsPlayingVoice(false);
          }
          if (onEndedCallback) onEndedCallback();
        };

        voice.addEventListener('ended', handleDone, { once: true });
        voice.addEventListener('error', handleDone, { once: true });
        voice.play().catch(() => {
          setIsPlayingVoice(false);
        });
        return voice;
      } catch {
        setIsPlayingVoice(false);
        return null;
      }
    },
    [sfxEnabled, sfxVolume, stopVoice]
  );

  const value = {
    musicEnabled,
    setMusicEnabled,
    sfxEnabled,
    setSfxEnabled,
    musicVolume,
    setMusicVolume,
    sfxVolume,
    setSfxVolume,
    currentMusicTrack,
    isPlayingVoice,
    playMusic,
    stopMusic,
    resumeMusic,
    playSfx,
    playVoice,
    stopVoice
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio() {
  const ctx = useContext(AudioContext);
  if (!ctx) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return ctx;
}
