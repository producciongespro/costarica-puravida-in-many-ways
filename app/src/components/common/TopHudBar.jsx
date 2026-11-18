import React from 'react';
import { Volume2, VolumeX, Wrench, BookOpen, MapPin } from 'lucide-react';
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
    totalStarsEarned,
    currentScreen,
    navigateTo,
    setShowPauseMenu,
    setShowCancelGameModal,
    setShowTeacherPanel
  } = useGame();

  const { musicEnabled, setMusicEnabled, playSfx } = useAudio();

  const isInsideMinigame = currentScreen === 'Minigame';

  return (
    <header className="w-full bg-[#479BD6] border-b-2 border-sky-200/40 px-3 py-1.5 flex items-center justify-between gap-2 shadow-md z-30 shrink-0">
      {/* Left: Options / Pause Menu Button & Player Badge */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => {
            playSfx(38);
            setShowPauseMenu(true);
          }}
          title="Main Menu"
          className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-sky-900/40 hover:bg-sky-900/70 border border-white/30 flex items-center justify-center transition active:scale-95"
        >
          <img
            src={assetUrl('sprites/options_button.png')}
            alt="Menu"
            className="w-7 h-7 object-contain"
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

        {/* Global Stars Counter (X / 21) */}
        <div
          className="flex items-center gap-1.5 bg-sky-950/60 border border-amber-300/40 rounded-full px-2.5 py-1 text-xs sm:text-sm font-bold text-amber-300 shadow-inner"
          title="Total Star Pieces Collected across the 7 Provinces"
        >
          <img
            src={assetUrl('sprites/star_center.png')}
            alt="Stars"
            className="w-5 h-5 object-contain"
          />
          <span>{totalStarsEarned} / 21</span>
        </div>
      </div>

      {/* Center: Coins Counter & Contextual Minigame HUD Items */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-sky-950/75 border-2 border-amber-400/70 rounded-full px-3.5 py-1 shadow">
          <img
            src={assetUrl('sprites/es-moneda.png')}
            alt="Coins"
            className="w-6 h-6 object-contain"
          />
          <span className="font-fredoka text-sm sm:text-base text-amber-300 tracking-wide">
            {coins.toLocaleString()}
          </span>
        </div>

        {extraHudContent && <div className="flex items-center gap-2">{extraHudContent}</div>}
      </div>

      {/* Right: Quick Glossary, Audio Toggle, Teacher/Debug Mode & Cancel Minigame */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {currentScreen === 'MapaCostaRica' && (
          <button
            type="button"
            onClick={() => {
              playSfx(38);
              navigateTo('Glosario');
            }}
            title="Keywords Glossary"
            className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-900/60 hover:bg-sky-900 text-white text-xs font-bold border border-white/25 transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-300" />
            <span>Keywords</span>
          </button>
        )}

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
          onClick={() => {
            playSfx(38);
            setShowTeacherPanel(true);
          }}
          title="MEP Teacher / Explorer Mode (Jump to any province/minigame, add coins, export save)"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow transition"
        >
          <Wrench className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">MEP Mode</span>
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
