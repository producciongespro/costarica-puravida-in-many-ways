import React, { useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { useAudio } from '../../context/AudioContext';
import { assetUrl } from '../../utils/assetUrl';

/**
 * Main Title Screen ("level0: Main") — 1:1 faithful to the original Unity WebGL build:
 * Radial blue background, centered game logo, and New Game / Continue buttons only.
 */
export default function MainScreen() {
  const { navigateTo, loadSavedGame } = useGame();
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
      className="relative w-full h-full min-h-[520px] flex flex-col items-center justify-center p-6 select-none overflow-hidden"
      style={{
        backgroundImage: `url("${assetUrl('sprites/fondo.png')}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Centered Main Game Logo & Primary Action Buttons (1:1 Original Layout) */}
      <div className="flex flex-col items-center justify-center w-full max-w-2xl text-center">
        <img
          src={assetUrl('sprites/Logo Costa Rica Final Grande.png')}
          alt="Costa Rica Pura Vida in Many Ways"
          className="w-72 sm:w-96 md:w-[440px] max-h-[55vh] object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)] mb-8"
          draggable={false}
        />

        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-8 w-full">
          <button
            type="button"
            onClick={handleNewGame}
            className="relative w-60 sm:w-64 h-14 sm:h-16 flex items-center justify-center transition transform hover:scale-105 active:scale-95 focus:outline-none"
          >
            <img
              src={assetUrl('sprites/boton_2.png')}
              alt=""
              className="absolute inset-0 w-full h-full object-fill drop-shadow-md"
              draggable={false}
            />
            <span className="relative z-10 font-hanken text-2xl sm:text-[26px] font-normal text-white tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
              New Game
            </span>
          </button>

          <button
            type="button"
            onClick={handleContinue}
            className="relative w-60 sm:w-64 h-14 sm:h-16 flex items-center justify-center transition transform hover:scale-105 active:scale-95 focus:outline-none"
          >
            <img
              src={assetUrl('sprites/boton_2.png')}
              alt=""
              className="absolute inset-0 w-full h-full object-fill drop-shadow-md"
              draggable={false}
            />
            <span className="relative z-10 font-hanken text-2xl sm:text-[26px] font-normal text-white tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
              Continue
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
