import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { X, Sparkles } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useAudio } from '../../context/AudioContext';
import provincesData from '../../data/provinces.json';
import { assetUrl } from '../../utils/assetUrl';
import StarMeter from './StarMeter';

export default function GlobalModals() {
  const {
    showPauseMenu,
    setShowPauseMenu,
    showCancelGameModal,
    setShowCancelGameModal,
    showEndingModal,
    setShowEndingModal,
    navigateTo,
    returnToMap
  } = useGame();

  const { playSfx, playMusic } = useAudio();

  // Trigger victory music (track 26) and confetti when GameEndingModal opens
  useEffect(() => {
    if (showEndingModal) {
      playMusic(26, { loop: false });
      try {
        confetti({
          particleCount: 110,
          spread: 80,
          origin: { y: 0.55 }
        });
      } catch {
        // Ignore confetti errors
      }
    }
  }, [showEndingModal, playMusic]);

  return (
    <>
      {/* 1. Pause Main Menu Modal ("Panel Menu Principal" in level0) */}
      {showPauseMenu && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="relative w-full max-w-md rounded-3xl border-4 border-sky-300/80 bg-[#2b6ca3] p-6 shadow-2xl text-white"
            style={{
              backgroundImage: `url("${assetUrl('sprites/fondo_mid.png')}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <button
              type="button"
              onClick={() => {
                playSfx(39);
                setShowPauseMenu(false);
              }}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center shadow"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-center font-amaranth text-3xl font-bold text-amber-300 drop-shadow mb-5">
              Main Menu
            </h2>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  playSfx(38);
                  navigateTo('NewGameWarning');
                }}
                className="w-full flex items-center gap-4 px-4 py-2.5 rounded-2xl bg-sky-950/80 hover:bg-sky-800 border border-sky-300/40 transition"
              >
                <img
                  src={assetUrl('sprites/newGame.png')}
                  alt="New Game"
                  className="w-10 h-10 object-contain"
                />
                <span className="text-lg font-bold">New Game</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playSfx(38);
                  navigateTo('Glosario');
                }}
                className="w-full flex items-center gap-4 px-4 py-2.5 rounded-2xl bg-sky-950/80 hover:bg-sky-800 border border-sky-300/40 transition"
              >
                <img
                  src={assetUrl('sprites/icono_glosario.png')}
                  alt="Keywords"
                  className="w-10 h-10 object-contain"
                />
                <span className="text-lg font-bold">Keywords (Glossary)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playSfx(38);
                  navigateTo('Creditos');
                }}
                className="w-full flex items-center gap-4 px-4 py-2.5 rounded-2xl bg-sky-950/80 hover:bg-sky-800 border border-sky-300/40 transition"
              >
                <img
                  src={assetUrl('sprites/icono_creditos.png')}
                  alt="Credits"
                  className="w-10 h-10 object-contain"
                />
                <span className="text-lg font-bold">Credits</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playSfx(38);
                  navigateTo('Opciones');
                }}
                className="w-full flex items-center gap-4 px-4 py-2.5 rounded-2xl bg-sky-950/80 hover:bg-sky-800 border border-sky-300/40 transition"
              >
                <img
                  src={assetUrl('sprites/icono_creditos copy.png')}
                  alt="Options"
                  className="w-10 h-10 object-contain"
                />
                <span className="text-lg font-bold">Options</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playSfx(39);
                  navigateTo('Main');
                }}
                className="w-full flex items-center gap-4 px-4 py-2.5 rounded-2xl bg-rose-900/80 hover:bg-rose-700 border border-rose-300/40 transition"
              >
                <img
                  src={assetUrl('sprites/icono_exit.png')}
                  alt="Exit"
                  className="w-10 h-10 object-contain"
                />
                <span className="text-lg font-bold">Exit to Game Title</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Cancel Minigame Confirmation Modal ("Panel Cancel Game" in level0) */}
      {showCancelGameModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border-4 border-sky-300 bg-[#2b6ca3] p-6 text-center shadow-2xl">
            <h3 className="font-amaranth text-2xl sm:text-3xl font-bold text-white mb-6 drop-shadow">
              Do you want to exit the current game?
            </h3>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => {
                  playSfx(38);
                  returnToMap();
                }}
                className="px-7 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-lg shadow-lg transition"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => {
                  playSfx(39);
                  setShowCancelGameModal(false);
                }}
                className="px-7 py-2.5 rounded-2xl bg-sky-900 hover:bg-sky-800 text-white font-bold text-lg border border-white/30 shadow-lg transition"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Game Ending Victory Modal ("Panel Ending" when all 21 star pieces are earned) */}
      {showEndingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div
            className="w-full max-w-2xl rounded-3xl border-4 border-amber-300 bg-[#23649e] p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(251,191,36,0.5)]"
            style={{
              backgroundImage: `url("${assetUrl('sprites/fondo.png')}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <img
              src={assetUrl('sprites/Logo Costa Rica Final Grande.png')}
              alt="Costa Rica Pura Vida in Many Ways"
              className="w-48 sm:w-56 mx-auto mb-3 object-contain drop-shadow-lg"
            />

            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-400 text-slate-950 font-extrabold text-sm uppercase tracking-wider mb-3 shadow">
              <Sparkles className="w-4 h-4" />
              21 / 21 Stars Completed!
            </div>

            <p className="font-amaranth text-2xl sm:text-3xl text-white drop-shadow mb-6 whitespace-pre-line">
              {'Hope you have enjoyed \nyour stay in Costa Rica!\n\nWe hope to see you back soon!'}
            </p>

            {/* 7 Completed Province Stars */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 bg-sky-950/70 border border-sky-300/40 rounded-2xl p-3 mb-6">
              {provincesData.provinces.map((prov) => (
                <div key={prov.id} className="flex flex-col items-center">
                  <StarMeter levelStr="111" size="sm" />
                  <img
                    src={assetUrl(prov.coatOfArmsSprite)}
                    alt={prov.nameEn}
                    className="w-7 h-7 object-contain mt-1"
                  />
                  <span className="text-[11px] font-bold text-amber-200 mt-0.5">
                    {prov.nameEn}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => {
                  playSfx(38);
                  setShowEndingModal(false);
                  navigateTo('Creditos');
                }}
                className="px-8 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-lg shadow-xl transition"
              >
                Credits
              </button>
              <button
                type="button"
                onClick={() => {
                  playSfx(38);
                  setShowEndingModal(false);
                  playMusic(1);
                }}
                className="px-6 py-3 rounded-2xl bg-sky-900/90 hover:bg-sky-800 text-white font-bold text-base border border-white/30 shadow transition"
              >
                Keep Exploring Map
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
