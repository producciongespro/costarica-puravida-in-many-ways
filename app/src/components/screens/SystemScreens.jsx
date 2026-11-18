import React, { useState, useEffect, useMemo } from 'react';
import { Search, Volume2, VolumeX, ArrowLeft, Columns, LayoutGrid, Sparkles } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useAudio } from '../../context/AudioContext';
import glossaryData from '../../data/glossary.json';
import dialoguesData from '../../data/dialogues.json';
import gameConfig from '../../data/gameConfig.json';
import { assetUrl } from '../../utils/assetUrl';

/**
 * level8: Glosario ("Keywords")
 * Supports both the original 3-column MEP layout (22 core terms) and the interactive card explorer (all 37 terms with audio & definitions).
 */
export function GlossaryScreen() {
  const { previousScreen, navigateTo } = useGame();
  const { playMusic, playVoice, playSfx } = useAudio();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState('columns'); // 'columns' | 'cards'

  const allTerms = useMemo(() => {
    const core = (glossaryData.columns || []).flatMap((col) =>
      (col.terms || []).map((t) => ({ ...t, columnIndex: col.columnIndex, isCore: true }))
    );
    const extended = (
      glossaryData.extendedCulturalTerms ||
      glossaryData.extendedVocabulary ||
      []
    ).map((t) => ({
      ...t,
      columnIndex: 0,
      isCore: false
    }));
    return [...core, ...extended];
  }, []);

  const [activeTerm, setActiveTerm] = useState(() => allTerms[0] || null);

  useEffect(() => {
    playMusic(0); // Tema del juego.m4a
  }, [playMusic]);

  const categories = useMemo(() => {
    const set = new Set(allTerms.map((t) => t.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [allTerms]);

  const filteredTerms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTerms.filter((t) => {
      if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        t.termEn?.toLowerCase().includes(q) ||
        t.termEs?.toLowerCase().includes(q) ||
        t.definitionEn?.toLowerCase().includes(q)
      );
    });
  }, [allTerms, search, selectedCategory]);

  const handleSelectTerm = (term) => {
    playSfx(38);
    setActiveTerm(term);
    if (term.audioFile) {
      playVoice(term.audioFile);
    }
  };

  const handleBack = () => {
    playSfx(39);
    navigateTo(previousScreen === 'MapaCostaRica' ? 'MapaCostaRica' : 'Main');
  };

  return (
    <div
      className="w-full h-full min-h-[560px] flex flex-col p-4 sm:p-6 select-none overflow-hidden"
      style={{
        backgroundImage: `url("${assetUrl(glossaryData.backgroundSprite)}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-sky-950/85 border border-sky-300/50 rounded-2xl px-4 py-2.5 shadow-lg">
        <div>
          <h1 className="font-amaranth text-2xl sm:text-3xl font-bold text-amber-300 drop-shadow">
            {glossaryData.screenTitle} — Interactive MEP Vocabulary
          </h1>
          <p className="text-xs text-sky-200">
            Click any keyword to listen to its pronunciation and view its bilingual definition.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-sky-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (e.target.value.trim()) setViewMode('cards');
              }}
              placeholder="Search keyword..."
              className="pl-9 pr-3 py-1.5 rounded-xl bg-sky-900/90 border border-sky-300/40 text-xs sm:text-sm text-white placeholder:text-sky-300/70 focus:outline-none focus:border-amber-300"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              if (e.target.value !== 'All') setViewMode('cards');
            }}
            className="px-3 py-1.5 rounded-xl bg-sky-900/90 border border-sky-300/40 text-xs sm:text-sm text-white"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <div className="inline-flex rounded-xl bg-sky-900/90 border border-sky-300/40 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('columns')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                viewMode === 'columns' ? 'bg-amber-400 text-slate-950' : 'text-sky-200'
              }`}
            >
              <Columns className="w-3.5 h-3.5" /> 3 Columns
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                viewMode === 'cards' ? 'bg-amber-400 text-slate-950' : 'text-sky-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> All ({filteredTerms.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Split: Left = Columns / Grid, Right = Selected Term Detail Card */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-hidden">
        <div className="lg:col-span-7 bg-sky-950/80 border-2 border-sky-300/40 rounded-3xl p-4 overflow-y-auto shadow-xl">
          {viewMode === 'columns' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(glossaryData.columns || []).map((col) => (
                <div
                  key={col.columnIndex}
                  className="rounded-2xl bg-sky-900/60 border border-sky-300/30 p-3 space-y-1.5"
                >
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-300 border-b border-sky-300/20 pb-1 mb-2">
                    Column {col.columnIndex}
                  </div>
                  {(col.terms || []).map((term) => {
                    const isSelected = activeTerm?.id === term.id;
                    return (
                      <button
                        key={term.id}
                        type="button"
                        onClick={() => handleSelectTerm(term)}
                        className={`w-full text-left px-3 py-2 rounded-xl font-hanken text-sm sm:text-base font-bold flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 shadow'
                            : 'bg-sky-950/60 hover:bg-sky-800 text-white'
                        }`}
                      >
                        <span>{term.termEn}</span>
                        <Volume2 className="w-3.5 h-3.5 shrink-0 opacity-75" />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredTerms.map((term) => {
                const isSelected = activeTerm?.id === term.id;
                return (
                  <button
                    key={term.id}
                    type="button"
                    onClick={() => handleSelectTerm(term)}
                    className={`text-left p-3 rounded-2xl border transition flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 border-white shadow-lg'
                        : 'bg-sky-900/60 hover:bg-sky-800/80 text-white border-sky-300/30'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm sm:text-base">{term.termEn}</div>
                      <div
                        className={`text-xs ${
                          isSelected ? 'text-slate-800 font-semibold' : 'text-amber-200'
                        }`}
                      >
                        {term.termEs}
                      </div>
                    </div>
                    <Volume2 className="w-4 h-4 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Term Detail Inspector */}
        <div className="lg:col-span-5 bg-sky-950/90 border-2 border-amber-300/70 rounded-3xl p-5 flex flex-col justify-between shadow-2xl overflow-y-auto">
          {activeTerm ? (
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-sky-800 text-amber-300 border border-sky-400/30">
                    {activeTerm.category}
                  </span>
                  <h2 className="font-amaranth text-3xl font-bold text-white mt-1">
                    {activeTerm.termEn}
                  </h2>
                  <p className="text-base font-bold text-amber-300">{activeTerm.termEs}</p>
                </div>

                {activeTerm.audioFile && (
                  <button
                    type="button"
                    onClick={() => playVoice(activeTerm.audioFile)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-lg transition"
                  >
                    <Volume2 className="w-4 h-4" />
                    Listen Audio
                  </button>
                )}
              </div>

              {activeTerm.sprite && (
                <div className="w-full h-40 rounded-2xl bg-sky-900/80 border border-sky-300/30 overflow-hidden mb-4 flex items-center justify-center p-2">
                  <img
                    src={assetUrl(activeTerm.sprite)}
                    alt={activeTerm.termEn}
                    className="max-h-full max-w-full object-contain rounded-xl"
                  />
                </div>
              )}

              <div className="space-y-3 text-sm leading-relaxed">
                <div className="p-3 rounded-2xl bg-sky-900/70 border border-sky-300/30">
                  <div className="text-[11px] font-bold uppercase text-sky-300 mb-0.5">
                    English Definition
                  </div>
                  <p className="text-white">{activeTerm.definitionEn}</p>
                </div>

                <div className="p-3 rounded-2xl bg-sky-900/40 border border-sky-300/20">
                  <div className="text-[11px] font-bold uppercase text-amber-300 mb-0.5">
                    Traducción y Contexto (Español)
                  </div>
                  <p className="text-sky-100">{activeTerm.definitionEs}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-4 pt-3 border-t border-sky-800 flex justify-end">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-amaranth text-lg font-bold shadow-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
              {previousScreen === 'MapaCostaRica' ? 'Return to Map' : glossaryData.backButtonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * level10: Opciones (Audio & Music Configuration)
 */
export function OptionsScreen() {
  const { previousScreen, navigateTo } = useGame();
  const {
    musicEnabled,
    sfxEnabled,
    setSfxEnabled,
    musicVolume,
    setMusicVolume,
    sfxVolume,
    setSfxVolume,
    playMusic,
    stopMusic,
    resumeMusic,
    playSfx
  } = useAudio();

  const cfg = gameConfig.uiScreens.optionsMenu;

  useEffect(() => {
    playMusic(28); // dialogos.m4a
  }, [playMusic]);

  const handleBack = () => {
    playSfx(39);
    navigateTo(previousScreen === 'MapaCostaRica' ? 'MapaCostaRica' : 'Main');
  };

  return (
    <div
      className="w-full h-full min-h-[560px] flex items-center justify-center p-6 select-none"
      style={{
        backgroundImage: `url("${assetUrl(cfg.backgroundSprite)}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="max-w-lg w-full rounded-3xl border-4 border-sky-200/80 bg-sky-950/85 backdrop-blur-md p-8 text-center shadow-2xl">
        <h1 className="font-amaranth text-4xl font-bold text-amber-300 drop-shadow mb-6">
          {cfg.title}
        </h1>

        {/* Original Play Music / No Music Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            type="button"
            onClick={() => {
              resumeMusic();
              playSfx(38);
            }}
            className={`py-3.5 px-4 rounded-2xl font-amaranth text-xl font-bold flex items-center justify-center gap-2 border-2 transition shadow-lg ${
              musicEnabled
                ? 'bg-emerald-500 text-slate-950 border-white'
                : 'bg-sky-900/70 text-white border-sky-300/40 hover:bg-sky-800'
            }`}
          >
            <Volume2 className="w-5 h-5" />
            {cfg.playMusicButtonLabel}
          </button>

          <button
            type="button"
            onClick={() => {
              stopMusic();
              playSfx(39);
            }}
            className={`py-3.5 px-4 rounded-2xl font-amaranth text-xl font-bold flex items-center justify-center gap-2 border-2 transition shadow-lg ${
              !musicEnabled
                ? 'bg-rose-600 text-white border-white'
                : 'bg-sky-900/70 text-white border-sky-300/40 hover:bg-sky-800'
            }`}
          >
            <VolumeX className="w-5 h-5" />
            {cfg.stopMusicButtonLabel}
          </button>
        </div>

        {/* Independent Volume Sliders for Music and Voiceovers/SFX */}
        <div className="space-y-4 text-left bg-sky-900/60 border border-sky-300/30 rounded-2xl p-5 mb-6">
          <div>
            <div className="flex justify-between text-sm font-bold mb-1">
              <span className="text-sky-100">Background Music Volume</span>
              <span className="text-amber-300">{Math.round(musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVolume}
              onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm font-bold mb-1">
              <span className="text-sky-100">English Voiceovers & Sound Effects</span>
              <span className="text-amber-300">{Math.round(sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sfxVolume}
              onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-sm font-bold text-sky-100">Enable Voiceovers & SFX</span>
            <button
              type="button"
              onClick={() => setSfxEnabled(!sfxEnabled)}
              className={`px-4 py-1 rounded-xl text-xs font-bold ${
                sfxEnabled ? 'bg-emerald-500 text-slate-950' : 'bg-rose-600 text-white'
              }`}
            >
              {sfxEnabled ? 'ENABLED' : 'MUTED'}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-amaranth text-xl font-bold shadow-xl transition"
        >
          <ArrowLeft className="w-5 h-5" />
          {previousScreen === 'MapaCostaRica' ? 'Return to Map' : cfg.backButtonLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * level9: Creditos (Official MEP, Producciones de la Montaña & Tayassu Games Credits)
 */
export function CreditsScreen() {
  const { previousScreen, navigateTo } = useGame();
  const { playMusic, playSfx } = useAudio();
  const creditsCfg = dialoguesData.coreScreensNarrative.credits;
  const meta = gameConfig.meta;

  useEffect(() => {
    playMusic(23); // audio/Credits Costa Rica Pura Vida.m4a
  }, [playMusic]);

  const handleBack = () => {
    playSfx(39);
    navigateTo(previousScreen === 'MapaCostaRica' ? 'MapaCostaRica' : 'Main');
  };

  return (
    <div
      className="w-full h-full min-h-[560px] flex flex-col items-center justify-between p-5 sm:p-8 select-none overflow-hidden"
      style={{
        backgroundImage: `url("${assetUrl('sprites/fondo.png')}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="max-w-4xl w-full flex-1 flex flex-col rounded-3xl border-4 border-sky-200/80 bg-sky-950/85 backdrop-blur-md p-6 shadow-2xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sky-300/30 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <img
              src={assetUrl('sprites/Logo Costa Rica Final copy.png')}
              alt="Logo"
              className="h-14 object-contain"
            />
            <div>
              <h1 className="font-amaranth text-2xl sm:text-3xl font-bold text-amber-300">
                {meta.gameTitle}
              </h1>
              <p className="text-xs sm:text-sm text-sky-200">{meta.institution} • 2018</p>
            </div>
          </div>

          <img
            src={assetUrl('sprites/mepLogo2.png')}
            alt="MEP"
            className="h-12 bg-white px-3 py-1 rounded-xl object-contain"
          />
        </div>

        {/* Credits Grid from dialogues.json */}
        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {(creditsCfg.sections || []).map((sec) => (
            <div
              key={sec.id}
              className="p-4 rounded-2xl bg-sky-900/60 border border-sky-300/30 flex flex-col justify-center text-center shadow"
            >
              <p className="font-hanken text-sm sm:text-base text-white whitespace-pre-line leading-relaxed">
                {sec.text.trim()}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-sky-300/30 flex items-center justify-between">
          <span className="text-xs text-sky-300 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            San José, Costa Rica • Educational Resource
          </span>
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-7 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-amaranth text-lg font-bold shadow-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
            {previousScreen === 'MapaCostaRica' ? 'Return to Map' : creditsCfg.backButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
