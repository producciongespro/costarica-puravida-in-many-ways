import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import minigamesData from '../../data/minigames.json';
import provincesData from '../../data/provinces.json';
import { useGame } from '../../context/GameContext';
import { useAudio } from '../../context/AudioContext';
import { assetUrl } from '../../utils/assetUrl';
import FungusDialogBox from '../common/FungusDialogBox';
import StarMeter from '../common/StarMeter';
import {
  Play,
  RotateCcw,
  Map,
  HelpCircle,
  Sparkles,
  Trophy,
  Award,
  Volume2
} from 'lucide-react';

// Import all 7 Province Minigame Engines
import {
  CoffeeFarmingGame,
  GoldMuseumGame,
  WhitewaterRaftingGame
} from './SanJoseMinigames';
import {
  DeliveringFlowersGame,
  MascaradaGame,
  MountainBikeGame
} from './HerediaMinigames';
import {
  SanatorioDuranGame,
  VolcanoesControlGame,
  BasilicaPuzzleGame
} from './CartagoMinigames';
import {
  TriathlonRaceGame,
  SarchiOxcartGame,
  AlajuelaCulturalVariantGame
} from './AlajuelaMinigames';
import {
  ManuelAntonioGame,
  PaseoTuristasGame,
  TarcolesCleanupGame
} from './PuntarenasMinigames';
import {
  BarraHondaCavernsGame,
  ScubaDivingGame,
  TamarindoSurfGame
} from './GuanacasteMinigames';
import {
  CaribbeanCuisineGame,
  TortugueroBoatGame,
  TurtleNestingDefenseGame
} from './LimonMinigames';

export default function MinigameRunner() {
  const {
    activeMinigameId,
    minigamePhase,
    setMinigamePhase,
    characterData,
    addCoins,
    registerMinigameProgress,
    provinceLevels,
    returnToMap
  } = useGame();

  const { playMusic, playSfx, playVoice, stopVoice } = useAudio();
  const character = characterData?.name || 'Lisa';
  const exitMinigameToMap = returnToMap;
  const playVoiceover = playVoice;
  const stopVoiceover = stopVoice;

  // Look up minigame in official list or legacy/cultural variants list
  const allMinigames = [
    ...(minigamesData.minigames || []),
    ...(minigamesData.legacyAndSiblingMinigames || [])
  ];

  const minigame =
    allMinigames.find((m) => m.id === activeMinigameId) || allMinigames[0];

  const province = (provincesData.provinces || []).find(
    (p) => p.id === minigame?.provinceId
  );

  const [phase, setPhase] = useState(minigamePhase || 'intro'); // 'intro' | 'play' | 'result'
  const [gameKey, setGameKey] = useState(1);
  const [resultData, setResultData] = useState(null);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  // Sync phase when activeMinigameId or minigamePhase changes from outside
  useEffect(() => {
    setPhase(minigamePhase || 'intro');
    setResultData(null);
    setGameKey((k) => k + 1);
  }, [activeMinigameId, minigamePhase]);

  // Switch music based on phase
  useEffect(() => {
    if (!minigame) return;
    if (phase === 'intro') {
      const introTrack = minigame.music?.introMusicIndex ?? 0;
      playMusic(introTrack);
    } else if (phase === 'play') {
      const gameTrack = minigame.music?.gameMusicIndex ?? 5;
      playMusic(gameTrack);
    }
    return () => {
      stopVoiceover();
    };
  }, [minigame, phase, playMusic, stopVoiceover]);

  if (!minigame) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-6">
        <p className="font-display text-lg mb-4">Minigame not found.</p>
        <button
          onClick={exitMinigameToMap}
          className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-display"
        >
          Return to Costa Rica Map
        </button>
      </div>
    );
  }

  const handleStartPlay = () => {
    stopVoiceover();
    playSfx(38);
    setResultData(null);
    setPhase('play');
  };

  const handleMinigameComplete = (res) => {
    stopVoiceover();
    const won = Boolean(res?.won);
    const coinsEarned = Math.max(0, Math.round(res?.coinsEarned || 0));

    if (coinsEarned > 0) {
      addCoins(coinsEarned);
    }

    let starAwarded = false;
    if (
      won &&
      minigame.provinceId !== undefined &&
      minigame.starPieceIndex !== null &&
      minigame.starPieceIndex !== undefined
    ) {
      registerMinigameProgress(minigame.provinceId, minigame.starPieceIndex, '1');
      starAwarded = true;
    }

    if (won) {
      playSfx(36);
      try {
        confetti({
          particleCount: 70,
          spread: 65,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore confetti error
      }
    } else {
      playSfx(37);
    }

    setResultData({
      won,
      coinsEarned,
      score: res?.score ?? 0,
      summary: res?.summary || (won ? 'Well done!' : 'Keep practicing!'),
      starAwarded
    });
    setPhase('result');
  };

  const handleRetry = () => {
    playSfx(38);
    setResultData(null);
    setGameKey((k) => k + 1);
    setPhase('play');
  };

  const renderMinigameEngine = () => {
    const commonProps = {
      key: `${minigame.id}_${gameKey}`,
      minigame,
      character,
      onComplete: handleMinigameComplete,
      playSfx,
      playVoiceover
    };

    switch (minigame.id) {
      // San José
      case 'SJ_FincaCafetalera':
        return <CoffeeFarmingGame {...commonProps} />;
      case 'SJ_Museo_Oro':
        return <GoldMuseumGame {...commonProps} />;
      case 'SJ_Rafting':
        return <WhitewaterRaftingGame {...commonProps} />;

      // Heredia
      case 'HD_Entregar_Flores':
        return <DeliveringFlowersGame {...commonProps} />;
      case 'HD_Mascarada':
        return <MascaradaGame {...commonProps} />;
      case 'HD_Mountainbike':
        return <MountainBikeGame {...commonProps} />;

      // Cartago
      case 'CT_Sanatorio_Duran':
        return <SanatorioDuranGame {...commonProps} />;
      case 'CT_Volcanes':
      case 'CT_Volcanes2':
        return <VolcanoesControlGame {...commonProps} />;
      case 'CT_Basilica_Angeles':
        return <BasilicaPuzzleGame {...commonProps} />;

      // Alajuela
      case 'AL_Ciclismo':
      case 'AL_Correr':
      case 'Al_Natacion':
        return <TriathlonRaceGame {...commonProps} />;
      case 'AL_Carretas':
        return <SarchiOxcartGame {...commonProps} />;
      case 'AL_Mariposario':
      case 'AL_Juan_Santamaria':
        return <AlajuelaCulturalVariantGame {...commonProps} />;

      // Puntarenas
      case 'PR_Manuel_Antonio':
        return <ManuelAntonioGame {...commonProps} />;
      case 'PR_Paseo_Turistas':
        return <PaseoTuristasGame {...commonProps} />;
      case 'PR_Tarcoles':
        return <TarcolesCleanupGame {...commonProps} />;

      // Guanacaste
      case 'GN_BarraHonda':
        return <BarraHondaCavernsGame {...commonProps} />;
      case 'GN_Buceo':
        return <ScubaDivingGame {...commonProps} />;
      case 'GN_Surf_Tamarindo':
        return <TamarindoSurfGame {...commonProps} />;

      // Limón
      case 'Lm_Cocina':
        return <CaribbeanCuisineGame {...commonProps} />;
      case 'LM_Tortuguero':
        return <TortugueroBoatGame {...commonProps} />;
      case 'LM_Desove':
        return <TurtleNestingDefenseGame {...commonProps} />;

      default:
        return <CoffeeFarmingGame {...commonProps} />;
    }
  };

  const instructionsList =
    minigame.controlsAndInstructions?.instructionsText ||
    minigame.mechanicsAndRules?.coreLoop ||
    minigame.instructionsScreenTexts ||
    [];
  const displayTitle = minigame.titleEn || minigame.title || minigame.id;
  const showcaseSprites =
    minigame.sprites?.gameSceneSprites || minigame.spritesUsed || [];

  const currentProvinceStarMask =
    provinceLevels?.[minigame.provinceId] || '000';

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* PHASE 1: INTERACTIVE _INTRO SCREEN (Fungus.Say + Voiceover + Instructions) */}
      {phase === 'intro' && (
        <div className="relative w-full h-full flex flex-col justify-between p-4 bg-gradient-to-br from-slate-950 via-[#122b44] to-emerald-950 text-white overflow-y-auto">
          {/* Top Header */}
          <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-2.5">
            <div className="flex items-center gap-3">
              {province?.coatOfArmsSprite && (
                <img
                  src={assetUrl(province.coatOfArmsSprite)}
                  alt={minigame.provinceName}
                  className="w-11 h-12 object-contain drop-shadow"
                />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/50 text-amber-300 text-[11px] font-extrabold uppercase tracking-wider">
                    {minigame.provinceName} Province
                  </span>
                  {minigame.starPieceIndex !== null &&
                    minigame.starPieceIndex !== undefined && (
                      <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-300/40 text-sky-200 text-[11px] font-bold">
                        Star Piece #{minigame.starPieceIndex + 1} (
                        {minigame.starPieceSlot || 'Star'})
                      </span>
                    )}
                </div>
                <h2 className="font-display text-xl text-white drop-shadow">
                  {displayTitle}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exitMinigameToMap}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/20 text-xs font-bold text-slate-200 flex items-center gap-1"
              >
                <Map className="w-3.5 h-3.5" /> Back to Map
              </button>
              <button
                onClick={handleStartPlay}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-display text-sm shadow-xl flex items-center gap-1.5 animate-pulse"
              >
                <Play className="w-4 h-4 fill-current" /> Start Game Now
              </button>
            </div>
          </div>

          {/* Middle Grid: Cultural Overview & Controls Card */}
          <div className="grid grid-cols-12 gap-3 my-2">
            {/* Left: Cultural & Gameplay Overview */}
            <div className="col-span-7 bg-slate-900/80 border border-white/15 rounded-2xl p-3.5 flex flex-col justify-between">
              <div>
                <h3 className="font-display text-sm text-amber-300 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Cultural Mission & Mechanics
                </h3>
                <p className="text-xs text-slate-200 leading-relaxed mb-2">
                  {minigame.mechanicsAndRules?.objective ||
                    minigame.culturalObjective ||
                    `Explore ${minigame.provinceName} and complete the ${displayTitle} challenge!`}
                </p>

                {Array.isArray(instructionsList) && instructionsList.length > 0 && (
                  <ul className="space-y-1 text-xs text-sky-100 bg-black/35 p-2.5 rounded-xl border border-white/10 max-h-28 overflow-y-auto">
                    {instructionsList.slice(0, 4).map((line, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-300 font-bold">•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Sprites Showcase Strip */}
              {Array.isArray(showcaseSprites) && showcaseSprites.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2 overflow-x-auto">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                    Original Sprites:
                  </span>
                  {showcaseSprites.slice(0, 7).map((sp, i) => (
                    <img
                      key={i}
                      src={assetUrl(sp)}
                      alt=""
                      className="w-8 h-8 object-contain bg-black/40 rounded-lg p-1 border border-white/10 shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right: Controls & Rewards Summary */}
            <div className="col-span-5 bg-slate-900/80 border border-amber-400/30 rounded-2xl p-3.5 flex flex-col justify-between">
              <div>
                <h3 className="font-display text-sm text-sky-300 mb-1.5">
                  Controls & Rewards
                </h3>
                <div className="space-y-1.5 text-xs text-slate-200">
                  <div className="bg-black/40 p-2 rounded-xl border border-white/10">
                    <strong className="text-amber-300 block text-[11px]">
                      Input Controls:
                    </strong>
                    <span>
                      {minigame.controlsAndInstructions?.inputScheme ||
                        'Mouse Click / Touch + Arrow Keys / Spacebar'}
                    </span>
                  </div>
                  <div className="bg-black/40 p-2 rounded-xl border border-white/10">
                    <strong className="text-emerald-300 block text-[11px]">
                      Victory Reward:
                    </strong>
                    <span>
                      {minigame.rewardsAndScoring?.winCondition ||
                        'Complete the regional challenge to earn coins & your Province Star Piece!'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="text-xs font-bold text-amber-200">
                  Province Progress:
                </span>
                <StarMeter levelStr={currentProvinceStarMask} size="sm" />
              </div>
            </div>
          </div>

          {/* Bottom: Interactive Fungus.Say Narrative Intro Dialogue with Real .m4a Voiceovers */}
          <div className="w-full">
            {Array.isArray(minigame.introDialogues) &&
            minigame.introDialogues.length > 0 ? (
              <FungusDialogBox
                dialogues={minigame.introDialogues}
                character={character}
                onComplete={handleStartPlay}
                finishButtonText="Play Minigame ▶"
              />
            ) : (
              <div className="bg-slate-900/90 border-2 border-amber-400 rounded-2xl p-4 flex items-center justify-between">
                <p className="text-sm text-amber-100 font-bold">
                  Ready to start <strong>{displayTitle}</strong> in{' '}
                  {minigame.provinceName}?
                </p>
                <button
                  onClick={handleStartPlay}
                  className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display text-sm shadow-lg"
                >
                  Start Minigame ▶
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PHASE 2: ACTIVE PLAYABLE MINIGAME */}
      {phase === 'play' && (
        <div className="relative w-full h-full flex flex-col overflow-hidden">
          {/* Compact Sub-bar for Instructions, Replay Intro and Restart */}
          <div className="flex items-center justify-between px-3 py-1 bg-slate-900 border-b border-white/15 text-xs text-white z-20">
            <div className="flex items-center gap-2">
              <span className="font-display text-amber-300">{displayTitle}</span>
              <span className="text-slate-400">({minigame.provinceName})</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowInstructionsModal(true)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-white/20 text-[11px] flex items-center gap-1"
              >
                <HelpCircle className="w-3 h-3 text-sky-300" /> How to Play
              </button>
              <button
                onClick={() => setPhase('intro')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-white/20 text-[11px] flex items-center gap-1"
              >
                <Volume2 className="w-3 h-3 text-amber-300" /> Intro Dialogue
              </button>
              <button
                onClick={handleRetry}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-white/20 text-[11px] flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Restart
              </button>
            </div>
          </div>

          {/* Playable Engine */}
          <div className="relative flex-1 overflow-hidden">
            {renderMinigameEngine()}
          </div>
        </div>
      )}

      {/* PHASE 3: FINAL RESULT MODAL (CanvasFinal / Well done!) */}
      {phase === 'result' && resultData && (
        <div className="relative w-full h-full flex items-center justify-center p-6 bg-gradient-to-br from-slate-950 via-sky-950 to-emerald-950 text-white">
          <div className="w-full max-w-lg bg-slate-900/95 border-4 border-amber-400 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="flex flex-col items-center">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 mb-2 shadow-xl ${
                  resultData.won
                    ? 'bg-amber-400/20 border-amber-300 text-amber-300'
                    : 'bg-rose-500/20 border-rose-400 text-rose-300'
                }`}
              >
                {resultData.won ? (
                  <Trophy className="w-10 h-10" />
                ) : (
                  <RotateCcw className="w-10 h-10" />
                )}
              </div>

              <h2 className="font-display text-3xl text-amber-300 drop-shadow">
                {resultData.won ? 'Well done!' : 'Good Effort!'}
              </h2>
              <p className="text-xs font-bold uppercase tracking-wider text-sky-300 mt-0.5">
                {displayTitle} — {minigame.provinceName}
              </p>
            </div>

            <p className="text-sm text-slate-100 bg-black/45 p-3.5 rounded-2xl border border-white/10 leading-relaxed">
              {resultData.summary}
            </p>

            {/* Rewards Row: Star Meter & Coins Earned */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950/80 border border-white/15 rounded-2xl p-3 flex flex-col items-center justify-center">
                <span className="text-[11px] font-bold text-slate-300 mb-1">
                  {minigame.provinceName} Star
                </span>
                <StarMeter
                  levelStr={provinceLevels?.[minigame.provinceId] || '000'}
                  size="md"
                />
                {resultData.starAwarded && (
                  <span className="text-[11px] font-extrabold text-emerald-300 mt-1">
                    ★ Star Piece Unlocked!
                  </span>
                )}
              </div>

              <div className="bg-slate-950/80 border border-amber-400/30 rounded-2xl p-3 flex flex-col items-center justify-center">
                <span className="text-[11px] font-bold text-slate-300 mb-1">
                  Reward Earned
                </span>
                <div className="flex items-center gap-2">
                  <img
                    src={assetUrl('sprites/moneda.png')}
                    alt="Coins"
                    className="w-8 h-8 object-contain"
                  />
                  <span className="font-display text-2xl text-amber-300">
                    +{resultData.coinsEarned}
                  </span>
                </div>
                <span className="text-[11px] text-amber-200/80 mt-0.5">
                  Added to your travel wallet
                </span>
              </div>
            </div>

            {/* Action Buttons: Play Again (Retry.png) & Return to Map (Return to map.png) */}
            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={handleRetry}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border-2 border-white/25 font-display text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-105"
              >
                <RotateCcw className="w-4 h-4" /> Play Again
              </button>
              <button
                onClick={exitMinigameToMap}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-display text-sm flex items-center justify-center gap-2 shadow-xl transition-transform hover:scale-105"
              >
                <Map className="w-4 h-4" /> Return to Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Instructions Modal during Gameplay */}
      {showInstructionsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border-2 border-amber-400 rounded-2xl p-5 text-white space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/15 pb-2">
              <h3 className="font-display text-base text-amber-300">
                How to Play: {displayTitle}
              </h3>
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              {minigame.mechanicsAndRules?.objective || minigame.culturalObjective}
            </p>
            {Array.isArray(instructionsList) && instructionsList.length > 0 && (
              <ul className="space-y-1.5 text-xs text-sky-100 bg-black/40 p-3 rounded-xl">
                {instructionsList.map((inst, i) => (
                  <li key={i}>• {inst}</li>
                ))}
              </ul>
            )}
            <div className="text-right pt-2">
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="px-5 py-2 rounded-xl bg-amber-400 text-slate-950 font-display text-xs"
              >
                Resume Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
