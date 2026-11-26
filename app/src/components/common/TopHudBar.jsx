import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, MapPin, Maximize2, Minimize2 } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useAudio } from '../../context/AudioContext';
import { assetUrl } from '../../utils/assetUrl';

/**
 * Persistent Top HUD Bar ("Panel Top" in level0 GameControl UI)
 * Original color RGBA [0.278, 0.608, 0.839, 1] -> #479BD6
 */
export default function TopHudBar({ extraHudContent = null }) {
  const {
    coins,
    characterData,
    currentProvince,
    currentScreen,
    setShowPauseMenu,
    setShowCancelGameModal
  } = useGame();

  const { musicEnabled, setMusicEnabled, playSfx } = useAudio();

  const [isFullscreen, setIsFullscreen] = useState(
    () => Boolean(document.fullscreenElement || document.webkitFullscreenElement)
  );

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const el = document.documentElement;
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
      }
    } catch {
      // Ignore fullscreen API rejections (e.g. unsupported environment)
    }
  };

  const isGameplayScreen =
    currentScreen === 'MapaCostaRica' || currentScreen === 'Minigame';
  const isInsideMinigame = currentScreen === 'Minigame';

  return (
    <header
      className="w-full h-12 border-b-2 border-sky-200/40 px-3 py-1.5 flex items-center justify-between gap-2 shadow-md z-30 shrink-0 select-none text-white"
      style={{ backgroundColor: '#479BD6', color: '#ffffff' }}
    >
      {/* Left: Menu & Player Badge (gameplay) or Game Title (menu/system screens) */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {isGameplayScreen ? (
          <>
            <button
              type="button"
              onClick={() => {
                playSfx(38);
                setShowPauseMenu(true);
              }}
              title="Main Menu"
              className="relative w-9 h-9 rounded-lg bg-sky-900/40 hover:bg-sky-900/70 border border-white/30 flex items-center justify-center transition active:scale-95 shrink-0"
            >
              <img
                src={assetUrl('sprites/options_button.png')}
                alt="Menu"
                className="w-6 h-6 object-contain"
              />
            </button>

            {/* Character Portrait + Current Province */}
            <div className="hidden xs:flex items-center gap-2 bg-sky-950/50 border border-white/25 rounded-full pr-3 pl-1 py-0.5">
              <img
                src={assetUrl(characterData?.sprites?.portrait || 'sprites/lisa_portrait.png')}
                alt={characterData?.name}
                className="w-7 h-7 rounded-full object-cover bg-amber-200 border border-amber-400"
              />
              <div className="leading-tight">
                <div className="text-xs font-bold text-white flex items-center gap-1">
                  <span>{characterData?.name}</span>
                  <span className="text-sky-200">•</span>
                  <span className="text-amber-200 flex items-center gap-0.5">
                    <MapPin className="w-3 h-3 inline" />
                    {currentProvince?.nameEn}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={assetUrl('sprites/Logo Costa Rica Final copy.png')}
              alt="Costa Rica Pura Vida"
              className="w-8 h-8 object-contain shrink-0 drop-shadow"
            />
            <span className="font-amaranth text-sm sm:text-base font-bold text-white drop-shadow truncate">
              Costa Rica Pura Vida in Many Ways
            </span>
          </div>
        )}
      </div>

      {/* Center: Coins Counter & Contextual Minigame HUD Items (only during gameplay) */}
      <div className="flex items-center gap-3">
        {isGameplayScreen && (
          <div className="flex items-center gap-2 bg-sky-950/75 border-2 border-amber-400/70 rounded-full px-3.5 py-0.5 shadow">
            <img
              src={assetUrl('sprites/es-moneda.png')}
              alt="Coins"
              className="w-5 h-5 object-contain"
            />
            <span className="font-fredoka text-sm sm:text-base text-amber-300 tracking-wide">
              {coins.toLocaleString()}
            </span>
          </div>
        )}

        {extraHudContent && <div className="flex items-center gap-2">{extraHudContent}</div>}
      </div>

      {/* Right: Audio Toggle, Fullscreen Toggle & Cancel Minigame */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => {
            setMusicEnabled(!musicEnabled);
          }}
          title={musicEnabled ? 'Mute Music' : 'Play Music'}
          className="w-9 h-9 rounded-lg bg-sky-900/50 hover:bg-sky-900/80 border border-white/25 flex items-center justify-center text-white transition"
        >
          {musicEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-300" />}
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          className="w-9 h-9 rounded-lg bg-sky-900/50 hover:bg-sky-900/80 border border-white/25 flex items-center justify-center text-white transition"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {isInsideMinigame && (
          <button
            type="button"
            onClick={() => {
              playSfx(39);
              setShowCancelGameModal(true);
            }}
            title="Exit current minigame"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-rose-600/80 hover:bg-rose-600 border border-white/40 flex items-center justify-center transition active:scale-95"
          >
            <img
              src={assetUrl('sprites/boton_cerrar.png')}
              alt="Exit minigame"
              className="w-7 h-7 object-contain"
            />
          </button>
        )}
      </div>
    </header>
  );
}
