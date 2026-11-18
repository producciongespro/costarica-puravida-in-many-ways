import React, { useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useAudio } from '../../context/AudioContext';
import gameConfig from '../../data/gameConfig.json';
import dialoguesData from '../../data/dialogues.json';
import { assetUrl } from '../../utils/assetUrl';
import FungusDialogBox from '../common/FungusDialogBox';

/**
 * level3: NewGameWarning
 */
export function NewGameWarningScreen() {
  const { resetNewGame, navigateTo } = useGame();
  const { playSfx } = useAudio();
  const cfg = gameConfig.uiScreens.newGameWarning;

  return (
    <div
      className="w-full h-full min-h-[560px] flex items-center justify-center p-6 select-none"
      style={{
        backgroundImage: `url("${assetUrl(cfg.backgroundSprite)}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="max-w-xl w-full rounded-3xl border-4 border-sky-200/80 bg-sky-950/85 backdrop-blur-md p-8 text-center shadow-2xl">
        <img
          src={assetUrl('sprites/Logo Costa Rica Final copy.png')}
          alt="Costa Rica"
          className="w-48 mx-auto mb-4 object-contain"
        />
        <p className="font-amaranth text-2xl sm:text-3xl text-white whitespace-pre-line leading-relaxed mb-8 drop-shadow">
          {cfg.warningText}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => {
              playSfx(38);
              resetNewGame();
              navigateTo('SelecGenero');
            }}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-amaranth text-xl font-bold shadow-lg transition transform hover:scale-105"
          >
            Yes, start a new game
          </button>

          <button
            type="button"
            onClick={() => {
              playSfx(39);
              navigateTo('Main');
            }}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-amaranth text-xl font-bold shadow-lg transition transform hover:scale-105"
          >
            No, go back
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * level5: SelecGenero (Character Selection: Mike or Lisa)
 */
export function CharacterSelectScreen() {
  const { selectCharacter, navigateTo } = useGame();
  const { playSfx, playVoice } = useAudio();
  const characters = gameConfig.characters.selectable;

  const handleChoose = (charObj) => {
    playSfx(38);
    selectCharacter(charObj.id);
    navigateTo('SelecScreen');
  };

  return (
    <div
      className="w-full h-full min-h-[560px] flex flex-col items-center justify-center p-6 select-none"
      style={{
        backgroundImage: `url("${assetUrl('sprites/fondo.png')}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="max-w-3xl w-full rounded-3xl border-4 border-sky-200/80 bg-sky-950/80 backdrop-blur-md p-6 sm:p-8 shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="font-amaranth text-3xl sm:text-4xl font-bold text-amber-300 drop-shadow">
            Choose a character
          </h1>
          <p className="font-hanken text-lg sm:text-xl text-sky-100 mt-1">
            Please tell me. Are you a boy? Or are you a girl?
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {characters.map((char) => {
            const isLisa = char.id === 'lisa';
            return (
              <div
                key={char.id}
                onClick={() => handleChoose(char)}
                className="group cursor-pointer rounded-3xl border-2 border-white/30 hover:border-amber-300 bg-sky-900/70 hover:bg-sky-800/80 p-5 flex flex-col items-center text-center shadow-xl transition transform hover:-translate-y-1"
              >
                <div className="relative w-36 h-44 sm:w-40 sm:h-48 flex items-center justify-center mb-3">
                  <img
                    src={assetUrl(char.sprites.fullBodySelect)}
                    alt={char.name}
                    className="max-h-full max-w-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] group-hover:scale-105 transition"
                    draggable={false}
                  />
                  <img
                    src={assetUrl(char.sprites.portrait)}
                    alt=""
                    className="absolute -bottom-2 -right-2 w-14 h-14 rounded-full border-2 border-amber-300 bg-sky-950 object-contain shadow-md"
                  />
                </div>

                <h2 className="font-amaranth text-2xl font-bold text-white mb-1">
                  {char.fullName}
                </h2>
                <p className="text-xs text-sky-200 mb-4">
                  {isLisa ? 'Female Explorer (Girl)' : 'Male Explorer (Boy)'}
                </p>

                <div className="flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (char.introVoiceOvers?.[0]?.file) {
                        playVoice(char.introVoiceOvers[0].file);
                      }
                    }}
                    title="Hear Voice"
                    className="p-2.5 rounded-xl bg-sky-950 hover:bg-sky-700 text-amber-300 border border-sky-400/30 shadow"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-2.5 rounded-xl font-amaranth text-xl font-bold text-white shadow-lg transition ${
                      isLisa
                        ? 'bg-[#3F9D21] hover:bg-emerald-500'
                        : 'bg-[#F2A830] hover:bg-amber-400 text-slate-950'
                    }`}
                  >
                    Play as {char.name}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * level4: SelecScreen (Introductory Fungus Conversation with Daniel the Taxi Driver)
 */
export function SelecScreenDialogue() {
  const { characterData, isFemale, navigateTo } = useGame();
  const { playMusic } = useAudio();
  const conv = dialoguesData.coreScreensNarrative.characterIntroConversation;

  useEffect(() => {
    playMusic(28); // audio/dialogos.m4a
  }, [playMusic]);

  return (
    <div
      className="w-full h-full min-h-[560px] flex flex-col items-center justify-between p-5 sm:p-8 select-none"
      style={{
        backgroundImage: `url("${assetUrl('sprites/fondo.png')}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Top Banner */}
      <div className="max-w-3xl w-full rounded-2xl bg-sky-950/85 border-2 border-amber-300/70 px-6 py-3 text-center shadow-lg">
        <h2 className="font-amaranth text-xl sm:text-2xl text-amber-300 drop-shadow">
          {isFemale ? conv.femaleBannerText : conv.maleBannerText}
        </h2>
      </div>

      {/* Center Characters Stage */}
      <div className="flex items-end justify-center gap-8 sm:gap-16 my-auto py-4">
        <div className="flex flex-col items-center">
          <img
            src={assetUrl('sprites/Daniel Taxi Driver.png')}
            alt="Daniel"
            className="h-40 sm:h-52 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.7)]"
          />
          <span className="mt-2 px-3 py-0.5 rounded-full bg-sky-900/90 border border-sky-300/40 text-xs font-bold text-amber-200">
            Daniel (Tour Guide)
          </span>
        </div>

        <div className="flex flex-col items-center">
          <img
            src={assetUrl(characterData.sprites.fullBodySelect)}
            alt={characterData.name}
            className="h-40 sm:h-52 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.7)]"
          />
          <span className="mt-2 px-3 py-0.5 rounded-full bg-sky-900/90 border border-sky-300/40 text-xs font-bold text-emerald-200">
            {characterData.fullName}
          </span>
        </div>
      </div>

      {/* Fungus.Say Interactive Voiceover Dialogue Box */}
      <FungusDialogBox
        dialogues={conv.dialogues}
        defaultNpcSprite="sprites/Daniel Taxi Driver.png"
        defaultNpcName="Daniel"
        onComplete={() => navigateTo('AdventureStart')}
      />
    </div>
  );
}

/**
 * level6: AdventureStart
 */
export function AdventureStartScreen() {
  const { characterData, navigateTo } = useGame();
  const { playSfx } = useAudio();
  const screenCfg = gameConfig.uiScreens.adventureStart;

  return (
    <div
      className="w-full h-full min-h-[560px] flex items-center justify-center p-6 select-none"
      style={{
        backgroundImage: `url("${assetUrl(screenCfg.backgroundSprite)}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="max-w-xl w-full rounded-3xl border-4 border-amber-300/90 bg-sky-950/85 backdrop-blur-md p-8 text-center shadow-2xl">
        <img
          src={assetUrl(characterData.sprites.portrait)}
          alt={characterData.name}
          className="w-24 h-24 mx-auto mb-4 rounded-full border-4 border-amber-400 bg-sky-900 object-contain shadow-lg"
        />

        <p className="font-amaranth text-2xl sm:text-3xl text-white whitespace-pre-line leading-relaxed mb-8 drop-shadow">
          {screenCfg.bodyText}
        </p>

        <button
          type="button"
          onClick={() => {
            playSfx(38);
            navigateTo('MapaCostaRica');
          }}
          className="px-12 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-amaranth text-2xl font-extrabold tracking-wider shadow-xl transition transform hover:scale-105 active:scale-95"
        >
          {screenCfg.startButtonLabel}
        </button>
      </div>
    </div>
  );
}
