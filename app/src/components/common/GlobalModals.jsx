import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { X, Download, Upload, Coins, Sparkles, CheckCircle2, RotateCcw, Play } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useAudio } from '../../context/AudioContext';
import provincesData from '../../data/provinces.json';
import minigamesData from '../../data/minigames.json';
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
    showTeacherPanel,
    setShowTeacherPanel,
    navigateTo,
    returnToMap,
    coins,
    addCoins,
    setCoins,
    characterId,
    selectCharacter,
    currentLocation,
    setCurrentLocation,
    starsByProvince,
    registerMinigameProgress,
    unlockAllStars,
    resetNewGame,
    launchMinigame,
    teacherFreeTravel,
    setTeacherFreeTravel,
    exportSaveData,
    importSaveData
  } = useGame();

  const { playSfx, playMusic } = useAudio();
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState(null);

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

  const handleExportDownload = () => {
    const json = exportSaveData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `costa_rica_puravida_save_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = () => {
    if (!importText.trim()) return;
    const ok = importSaveData(importText);
    setImportStatus(ok ? 'Save data imported successfully!' : 'Invalid JSON format.');
    if (ok) {
      playSfx(36);
      setTimeout(() => setImportStatus(null), 3000);
    } else {
      playSfx(37);
    }
  };

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

      {/* 4. MEP Teacher / QA Explorer Panel */}
      {showTeacherPanel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border-2 border-amber-400 bg-slate-900 text-white shadow-2xl overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-amber-300 flex items-center gap-2">
                  <span>Modo Explorador / Docente MEP</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-400/20 text-amber-200 border border-amber-400/40">
                    QA & Classroom Tool
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Test any province or minigame immediately, manage coins/stars, or export/import student progress in JSON.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTeacherPanel(false)}
                className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-rose-600 flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-6 text-sm">
              {/* Quick Controls Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700">
                  <div className="text-xs uppercase font-bold text-slate-400 mb-2">
                    Economy & Coins ({coins.toLocaleString()})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => addCoins(5000)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs"
                    >
                      <Coins className="w-3.5 h-3.5" /> +5,000 Coins
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoins(50000)}
                      className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs"
                    >
                      Set 50,000
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700">
                  <div className="text-xs uppercase font-bold text-slate-400 mb-2">
                    Character & Travel Mode
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => selectCharacter(characterId === 'lisa' ? 'mike' : 'lisa')}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
                    >
                      Switch: {characterId === 'lisa' ? 'Lisa (Girl)' : 'Mike (Boy)'}
                    </button>
                    <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={teacherFreeTravel}
                        onChange={(e) => setTeacherFreeTravel(e.target.checked)}
                        className="rounded text-amber-400"
                      />
                      <span>Free Travel (Skip 5000 fee)</span>
                    </label>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700">
                  <div className="text-xs uppercase font-bold text-slate-400 mb-2">
                    Global Progression
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        playSfx(36);
                        unlockAllStars();
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Unlock 21/21 Stars & Ending
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetNewGame();
                        playSfx(39);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reset Save
                    </button>
                  </div>
                </div>
              </div>

              {/* Direct Launcher for All 7 Provinces & 21 Minigames */}
              <div>
                <h4 className="font-bold text-amber-300 mb-2">
                  7 Provinces & 21 Official Minigames (Direct Launch & Star Toggles)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {provincesData.provinces.map((prov) => {
                    const provStars = starsByProvince[prov.id]?.pieces || [false, false, false];
                    return (
                      <div
                        key={prov.id}
                        className="p-3 rounded-2xl bg-slate-800/70 border border-slate-700 flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img
                              src={assetUrl(prov.coatOfArmsSprite)}
                              alt={prov.nameEn}
                              className="w-7 h-7 object-contain"
                            />
                            <span className="font-bold text-white">{prov.nameEn}</span>
                            {currentLocation === prov.id && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                Current
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentLocation(prov.id);
                              navigateTo('MapaCostaRica');
                              setShowTeacherPanel(false);
                            }}
                            className="text-xs px-2.5 py-1 rounded-lg bg-sky-700 hover:bg-sky-600 text-white font-semibold"
                          >
                            Teleport Here
                          </button>
                        </div>

                        <div className="space-y-1.5 mt-1">
                          {prov.minigames.map((mg) => {
                            const hasStar = provStars[mg.starPieceIndex];
                            return (
                              <div
                                key={mg.id}
                                className="flex items-center justify-between gap-2 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-700/80"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      registerMinigameProgress(
                                        prov.id,
                                        mg.starPieceIndex,
                                        hasStar ? '0' : '1'
                                      )
                                    }
                                    title="Toggle Star Piece"
                                    className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                                      hasStar
                                        ? 'bg-amber-400 text-slate-950'
                                        : 'bg-slate-700 text-slate-400'
                                    }`}
                                  >
                                    ★
                                  </button>
                                  <span className="truncate text-xs font-medium text-slate-200">
                                    {mg.buttonLabel}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCurrentLocation(prov.id);
                                      launchMinigame(mg.id, false);
                                      setShowTeacherPanel(false);
                                    }}
                                    className="px-2 py-1 rounded bg-sky-600/80 hover:bg-sky-500 text-[11px] font-semibold"
                                  >
                                    Intro
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCurrentLocation(prov.id);
                                      launchMinigame(mg.id, true);
                                      setShowTeacherPanel(false);
                                    }}
                                    className="inline-flex items-center gap-0.5 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-[11px] font-bold"
                                  >
                                    <Play className="w-3 h-3" /> Play
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4 Rescued Cultural / Historical Bonus Minigames */}
              <div>
                <h4 className="font-bold text-amber-300 mb-2">
                  4 Bonus Cultural & Historical Minigames (Rescued from Assets & C# Metadata)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {(minigamesData.legacyAndSiblingMinigames || []).map((bmg) => (
                    <div
                      key={bmg.id}
                      className="p-3 rounded-2xl bg-slate-800/80 border border-amber-400/30 flex flex-col justify-between gap-2"
                    >
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-amber-300">
                          {bmg.provinceName}
                        </span>
                        <div className="font-bold text-xs text-white mt-0.5">{bmg.titleEn}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          launchMinigame(bmg.id, true);
                          setShowTeacherPanel(false);
                        }}
                        className="w-full py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs"
                      >
                        Play Bonus Activity
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* JSON Save Export / Import */}
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-amber-300">
                    LocalStorage Persistence (CRPVMW_*) — Export / Import JSON
                  </span>
                  <button
                    type="button"
                    onClick={handleExportDownload}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Save (.json)
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder='Paste exported JSON save here (e.g. {"CRPVMW_monedas":12000,...})'
                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={handleImportSubmit}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                  >
                    <Upload className="w-3.5 h-3.5" /> Import JSON
                  </button>
                </div>
                {importStatus && <p className="text-xs text-amber-300 font-semibold">{importStatus}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
