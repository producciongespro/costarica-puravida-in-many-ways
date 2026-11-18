import React, { useEffect } from 'react';
import { BookOpen, Settings, Award, Play, RotateCcw, Wrench } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useAudio } from '../../context/AudioContext';
import { assetUrl } from '../../utils/assetUrl';

export default function MainScreen() {
  const {
    navigateTo,
    loadSavedGame,
    hasSavedGame,
    totalStarsEarned,
    coins,
    setShowTeacherPanel
  } = useGame();
  const { playMusic, playSfx } = useAudio();

  useEffect(() => {
    playMusic(0); // audio/Tema del juego.m4a
  }, [playMusic]);

  const handleNewGame = () => {
    playSfx(38);
    navigateTo('NewGameWarning');
  };

  const handleContinue = () => {
    playSfx(38);
    loadSavedGame();
    navigateTo('MapaCostaRica');
  };

  return (
    <div
      className="relative w-full h-full min-h-[560px] flex flex-col items-center justify-between p-5 sm:p-8 select-none overflow-hidden"
      style={{
        backgroundImage: `url("${assetUrl('sprites/fondo.png')}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Top Bar: MEP Institutional Logo & Teacher Mode */}
      <div className="w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-3 bg-white/90 backdrop-blur px-3.5 py-1.5 rounded-2xl shadow-lg">
          <img
            src={assetUrl('sprites/mepLogo2.png')}
            alt="Ministerio de Educación Pública"
            className="h-9 sm:h-11 object-contain"
          />
          <div className="hidden sm:block text-slate-800 leading-tight border-l border-slate-300 pl-3">
            <div className="text-xs font-extrabold uppercase tracking-wider text-sky-800">
              Ministerio de Educación Pública
            </div>
            <div className="text-[11px] font-semibold text-slate-600">
              English Learning Adventure • GESPRO
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playSfx(38);
            setShowTeacherPanel(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg transition transform hover:scale-105"
        >
          <Wrench className="w-4 h-4" />
          <span>Modo Docente / Explorador</span>
        </button>
      </div>

      {/* Center: Main Game Logo & Primary Action Buttons */}
      <div className="flex flex-col items-center my-auto z-10 max-w-xl w-full text-center">
        <img
          src={assetUrl('sprites/Logo Costa Rica Final Grande.png')}
          alt="Costa Rica Pura Vida in Many Ways"
          className="w-72 sm:w-96 md:w-[430px] object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.65)] animate-float mb-6"
          draggable={false}
        />

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
          <button
            type="button"
            onClick={handleNewGame}
            className="relative group w-60 h-16 flex items-center justify-center transition transform hover:scale-105 active:scale-95"
          >
            <img
              src={assetUrl('sprites/boton_2.png')}
              alt=""
              className="absolute inset-0 w-full h-full object-fill drop-shadow-lg"
              draggable={false}
            />
            <span className="relative z-10 flex items-center gap-2 font-amaranth text-2xl font-bold text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]">
              <RotateCcw className="w-5 h-5" />
              New Game
            </span>
          </button>

          <button
            type="button"
            onClick={handleContinue}
            className="relative group w-60 h-16 flex items-center justify-center transition transform hover:scale-105 active:scale-95"
          >
            <img
              src={assetUrl('sprites/boton_2.png')}
              alt=""
              className="absolute inset-0 w-full h-full object-fill drop-shadow-lg hue-rotate-30"
              draggable={false}
            />
            <span className="relative z-10 flex items-center gap-2 font-amaranth text-2xl font-bold text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]">
              <Play className="w-5 h-5 fill-current" />
              Continue
            </span>
          </button>
        </div>

        {hasSavedGame && (
          <div className="mt-3 inline-flex items-center gap-3 px-4 py-1 rounded-full bg-sky-950/75 border border-sky-300/40 text-xs text-sky-100 shadow">
            <span>Saved Progress:</span>
            <span className="font-bold text-amber-300">★ {totalStarsEarned}/21 Stars</span>
            <span>•</span>
            <span className="font-bold text-amber-300">{coins.toLocaleString()} Coins</span>
          </div>
        )}
      </div>

      {/* Bottom Navigation: Glossary (Keywords), Options, Credits */}
      <div className="w-full flex flex-wrap items-center justify-center gap-3 z-10">
        <button
          type="button"
          onClick={() => {
            playSfx(38);
            navigateTo('Glosario');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-sky-950/80 hover:bg-sky-800 border border-sky-300/50 text-white font-bold text-sm shadow-lg transition"
        >
          <BookOpen className="w-4 h-4 text-amber-300" />
          <span>Glossary (Keywords)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playSfx(38);
            navigateTo('Opciones');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-sky-950/80 hover:bg-sky-800 border border-sky-300/50 text-white font-bold text-sm shadow-lg transition"
        >
          <Settings className="w-4 h-4 text-sky-300" />
          <span>Options</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playSfx(38);
            navigateTo('Creditos');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-sky-950/80 hover:bg-sky-800 border border-sky-300/50 text-white font-bold text-sm shadow-lg transition"
        >
          <Award className="w-4 h-4 text-emerald-300" />
          <span>Credits</span>
        </button>
      </div>
    </div>
  );
}
