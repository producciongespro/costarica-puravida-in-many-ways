import React, { useState, useEffect, useRef } from 'react';
import { assetUrl } from '../../utils/assetUrl';
import { Trophy, Zap, Palette, Eye, Shield, Flame, Sparkles, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * 1. AL_Ciclismo, AL_Correr, Al_Natacion - Laguna del Hule Triathlon (Alajuela)
 * Compete against 6 rivals (7 competitors total, faithful to PosicionController) in:
 * - AL_Ciclismo (Mountain Cycling)
 * - AL_Correr (Cross-Country Running)
 * - Al_Natacion (Laguna del Hule Open-Water Swimming)
 * Podium rewards: 1st = 1000 coins, 2nd = 500 coins, 3rd = 100 coins, 4th = 50 coins.
 */
export function TriathlonRaceGame({ minigame, character, onComplete, playSfx }) {
  const id = minigame?.id || 'AL_Ciclismo';
  const mode =
    id === 'Al_Natacion'
      ? {
          name: 'Laguna del Hule Swimming',
          icon: '🏊',
          bg: 'from-sky-800 via-blue-700 to-cyan-800',
          laneColor: 'border-cyan-300/30',
          obstacleIcon: '🪵',
          obstacleLabel: 'Floating Log',
          boostLabel: 'Oxygen Stroke'
        }
      : id === 'AL_Correr'
      ? {
          name: 'Poás Footrace (Running)',
          icon: '🏃',
          bg: 'from-emerald-900 via-amber-900 to-stone-900',
          laneColor: 'border-amber-300/30',
          obstacleIcon: '🪨',
          obstacleLabel: 'Trail Hurdle',
          boostLabel: 'Water Bottle'
        }
      : {
          name: 'Alajuela Cycling Sprint',
          icon: '🚴',
          bg: 'from-slate-800 via-slate-700 to-emerald-950',
          laneColor: 'border-yellow-300/30',
          obstacleIcon: '🚧',
          obstacleLabel: 'Road Cone',
          boostLabel: 'Hydration Boost'
        };

  const [lane, setLane] = useState(1); // 0, 1, 2, 3
  const [playerDist, setPlayerDist] = useState(0); // 0..100
  const [energy, setEnergy] = useState(80); // 0..100
  const [rivals, setRivals] = useState([
    { id: 1, name: 'Carlos (SJ)', dist: 3, speed: 0.92, lane: 0 },
    { id: 2, name: 'Elena (HD)', dist: 2, speed: 0.88, lane: 1 },
    { id: 3, name: 'Mateo (CT)', dist: 4, speed: 0.96, lane: 2 },
    { id: 4, name: 'Sofía (AL)', dist: 5, speed: 1.01, lane: 3 },
    { id: 5, name: 'Diego (PR)', dist: 1, speed: 0.84, lane: 0 },
    { id: 6, name: 'Valeria (GN)', dist: 2, speed: 0.9, lane: 2 }
  ]);
  const [items, setItems] = useState([]);

  const laneRef = useRef(lane);
  laneRef.current = lane;
  const energyRef = useRef(energy);
  energyRef.current = energy;
  const distRef = useRef(playerDist);
  distRef.current = playerDist;
  const rivalsRef = useRef(rivals);
  rivalsRef.current = rivals;
  const doneRef = useRef(false);
  const nextId = useRef(1);

  // Calculate live rank 1..7 (PosicionController)
  const higherCount = rivals.filter((r) => r.dist > playerDist).length;
  const currentRank = higherCount + 1;
  const rankSuffix =
    currentRank === 1 ? '1st' : currentRank === 2 ? '2nd' : currentRank === 3 ? '3rd' : `${currentRank}th`;

  const handleSprintBoost = () => {
    if (doneRef.current) return;
    if (id === 'Al_Natacion') {
      playSfx(41); // Nadar.m4a
    }
    setPlayerDist((d) => Math.min(100, d + (energyRef.current > 20 ? 2.4 : 1.1)));
    setEnergy((e) => Math.max(5, e - 5));
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setLane((l) => Math.max(0, l - 1));
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setLane((l) => Math.min(3, l + 1));
      } else if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handleSprintBoost();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const loop = setInterval(() => {
      if (doneRef.current) return;

      // Passive regeneration of energy
      setEnergy((e) => Math.min(100, e + 1.4));

      // Advance rivals
      setRivals((prev) =>
        prev.map((r) => ({
          ...r,
          dist: Math.min(100, r.dist + r.speed * (0.75 + Math.random() * 0.45))
        }))
      );

      // Advance player base speed
      setPlayerDist((d) => {
        const baseStep = energyRef.current > 35 ? 1.05 : 0.72;
        const nextD = Math.min(100, d + baseStep);

        if (nextD >= 100 && !doneRef.current) {
          doneRef.current = true;
          playSfx(47); // crowd cheering
          const rank = rivalsRef.current.filter((r) => r.dist >= 100).length + 1;
          const won = rank <= 3;
          const rewardMap = { 1: 1000, 2: 500, 3: 100, 4: 50 };
          const coins = rewardMap[rank] || 50;
          const ord = rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`;

          onComplete({
            won,
            score: Math.max(50, (8 - rank) * 25),
            coinsEarned: coins,
            summary: `Finished ${ord} place out of 7 competitors in ${mode.name}! (${won ? 'Podium Star Won!' : 'Reach Top 3 to win the Star!'})`
          });
        }
        return nextD;
      });

      // Spawn and move lane items (boosts & obstacles)
      setItems((prev) => {
        const moved = prev.map((it) => ({ ...it, x: it.x - 4.2 })).filter((it) => it.x > -8);
        const kept = [];

        for (const it of moved) {
          if (it.x <= 22 && it.x >= 12 && it.lane === laneRef.current) {
            if (it.type === 'boost') {
              playSfx(36);
              setEnergy((e) => Math.min(100, e + 30));
              setPlayerDist((d) => Math.min(100, d + 3.2));
            } else {
              playSfx(37);
              setEnergy((e) => Math.max(0, e - 22));
              setPlayerDist((d) => Math.max(0, d - 2.0));
            }
          } else {
            kept.push(it);
          }
        }

        if (Math.random() < 0.35) {
          const isBoost = Math.random() < 0.52;
          kept.push({
            id: nextId.current++,
            lane: Math.floor(Math.random() * 4),
            x: 102,
            type: isBoost ? 'boost' : 'obstacle'
          });
        }

        return kept;
      });
    }, 85);

    return () => clearInterval(loop);
  }, [mode.name, onComplete, playSfx]);

  return (
    <div className={`relative w-full h-full flex flex-col bg-gradient-to-r ${mode.bg} text-white overflow-hidden select-none`}>
      {/* Top Triathlon HUD */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/85 border-b border-amber-400/40 z-10">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-xl bg-amber-400 text-slate-950 font-display text-sm flex items-center gap-1.5 shadow">
            <Trophy className="w-4 h-4" />
            Position: {rankSuffix} / 7
          </div>

          {/* Energy / Hydration Meter */}
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-xl border border-white/15">
            <Zap className="w-4 h-4 text-cyan-300" />
            <div className="w-28 h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
                style={{ width: `${energy}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-cyan-200">{Math.round(energy)}%</span>
          </div>
        </div>

        {/* Race Distance Bar */}
        <div className="flex items-center gap-2 w-56">
          <span className="text-xs font-display text-amber-200">Finish:</span>
          <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden border border-white/20">
            <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-400" style={{ width: `${playerDist}%` }} />
          </div>
          <span className="text-xs font-display">{Math.round(playerDist)}%</span>
        </div>

        <button
          onClick={handleSprintBoost}
          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-display text-xs shadow-lg active:scale-95"
        >
          ⚡ SPRINT (Space / Click)
        </button>
      </div>

      {/* Live 7-Racer Mini Radar */}
      <div className="bg-black/55 px-4 py-1.5 border-b border-white/10 flex items-center gap-2 text-[11px]">
        <span className="font-bold text-amber-300 shrink-0">Live Track Radar:</span>
        <div className="relative flex-1 h-5 bg-slate-900/90 rounded-full border border-white/15 overflow-hidden">
          {rivals.map((r) => (
            <div
              key={r.id}
              style={{ left: `${r.dist}%` }}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-rose-500 border border-white text-[8px] flex items-center justify-center font-bold"
              title={r.name}
            >
              {r.id}
            </div>
          ))}
          <div
            style={{ left: `${playerDist}%` }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-display text-[9px] border border-white z-10"
          >
            YOU
          </div>
        </div>
      </div>

      {/* 4 Triathlon Lanes */}
      <div className="relative flex-1 flex flex-col justify-between py-2">
        {[0, 1, 2, 3].map((lIdx) => (
          <div
            key={lIdx}
            onClick={() => setLane(lIdx)}
            className={`relative flex-1 border-b ${mode.laneColor} flex items-center cursor-pointer transition-colors ${
              lane === lIdx ? 'bg-white/15' : 'hover:bg-white/5'
            }`}
          >
            <span className="ml-3 text-xs font-display text-white/50">Lane {lIdx + 1}</span>

            {/* Player Avatar */}
            {lane === lIdx && (
              <div
                style={{ left: '16%' }}
                className="absolute -translate-x-1/2 px-3 py-1.5 rounded-2xl bg-amber-400 text-slate-950 border-2 border-white shadow-xl flex items-center gap-1.5 z-20"
              >
                <span className="text-xl">{mode.icon}</span>
                <span className="font-display text-xs">{character}</span>
              </div>
            )}

            {/* Lane Obstacles & Hydration Boosts */}
            {items
              .filter((it) => it.lane === lIdx)
              .map((it) => (
                <div
                  key={it.id}
                  style={{ left: `${it.x}%` }}
                  className="absolute -translate-x-1/2 z-10 pointer-events-none"
                >
                  {it.type === 'boost' ? (
                    <div className="px-2.5 py-1 rounded-full bg-cyan-500/30 border-2 border-cyan-300 flex items-center gap-1 animate-bounce shadow">
                      <span>💧</span>
                      <span className="text-[10px] font-bold text-cyan-100">+Boost</span>
                    </div>
                  ) : (
                    <div className="px-2.5 py-1 rounded-xl bg-rose-900/85 border-2 border-rose-400 flex items-center gap-1 shadow">
                      <span>{mode.obstacleIcon}</span>
                      <span className="text-[10px] font-bold text-rose-200">{mode.obstacleLabel}</span>
                    </div>
                  )}
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 2. AL_Carretas - Carretas de Sarchí Memory & Painting Workshop (PintarCarretaController)
 * Memorize the colorful traditional geometric pattern of the Sarchí oxcart wheel,
 * then select colors from the artisan palette to paint all 6 segments accurately!
 */
export function SarchiOxcartGame({ minigame, onComplete, playSfx }) {
  const palette = [
    { id: 'red', name: 'Crimson Red', hex: '#ef4444' },
    { id: 'orange', name: 'Sarchí Orange', hex: '#f97316' },
    { id: 'yellow', name: 'Golden Sun', hex: '#facc15' },
    { id: 'blue', name: 'Cobalt Blue', hex: '#2563eb' },
    { id: 'teal', name: 'Turquoise', hex: '#14b8a6' },
    { id: 'magenta', name: 'Bougainvillea', hex: '#db2777' }
  ];

  const targetPattern = [
    { ring: 'Center Hub (Bok)', targetColor: 'yellow' },
    { ring: 'Inner Star Petals', targetColor: 'red' },
    { ring: 'Middle Geometric Diamonds', targetColor: 'blue' },
    { ring: 'Secondary Rosette Points', targetColor: 'orange' },
    { ring: 'Outer Floral Scroll', targetColor: 'magenta' },
    { ring: 'Rim Trim (Aro)', targetColor: 'teal' }
  ];

  const [memorizeCountdown, setMemorizeCountdown] = useState(5);
  const [showReference, setShowReference] = useState(true);
  const [selectedColor, setSelectedColor] = useState('yellow');
  const [playerColors, setPlayerColors] = useState(Array(6).fill(null));
  const [feedback, setFeedback] = useState('Memorize the Sarchí Oxcart wheel colors for 5 seconds!');

  useEffect(() => {
    if (memorizeCountdown <= 0) {
      setShowReference(false);
      setFeedback('Now select a color from the palette and click each wheel ring to paint it!');
      return;
    }
    const t = setTimeout(() => setMemorizeCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [memorizeCountdown]);

  const handlePaintRing = (idx) => {
    playSfx(44);
    setPlayerColors((prev) => prev.map((c, i) => (i === idx ? selectedColor : c)));
  };

  const handleVerifyWheel = () => {
    const matches = targetPattern.filter((t, i) => playerColors[i] === t.targetColor).length;
    if (matches >= 5) {
      playSfx(36);
      onComplete({
        won: true,
        score: matches * 25,
        coinsEarned: 1200 + matches * 50,
        summary: `Painted a UNESCO-heritage Sarchí Oxcart wheel with ${matches}/6 exact traditional colors!`
      });
    } else {
      playSfx(37);
      setFeedback(`You matched ${matches}/6 rings! Click "Peek Pattern (2s)" if you need another look.`);
    }
  };

  const handlePeek = () => {
    setShowReference(true);
    setTimeout(() => setShowReference(false), 2500);
  };

  const getHex = (colorId) => palette.find((p) => p.id === colorId)?.hex || '#334155';

  return (
    <div className="relative w-full h-full flex flex-col bg-gradient-to-br from-amber-950 via-stone-900 to-rose-950 text-white overflow-hidden select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/75 border-b border-amber-400/40">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-amber-300" />
          <span className="font-display text-sm text-amber-300">
            Sarchí Artisan Oxcart Workshop (Cuna de la Artesanía Nacional)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {memorizeCountdown > 0 ? (
            <span className="px-3 py-1 rounded-xl bg-amber-400 text-slate-950 font-display text-xs animate-pulse">
              Memorize Pattern: {memorizeCountdown}s
            </span>
          ) : (
            <button
              onClick={handlePeek}
              className="px-3 py-1 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-display text-xs flex items-center gap-1 shadow"
            >
              <Eye className="w-3.5 h-3.5" /> Peek Pattern (2.5s)
            </button>
          )}
          <button
            onClick={handleVerifyWheel}
            className="px-4 py-1 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-display text-xs shadow"
          >
            Verify Oxcart Painting ✓
          </button>
        </div>
      </div>

      <div className="bg-black/40 px-4 py-1.5 text-center text-xs font-bold text-amber-200 border-b border-white/10">
        {feedback}
      </div>

      {/* Main Workshop */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 items-center overflow-y-auto">
        {/* Left: Concentric Wheel Visualization */}
        <div className="col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-60 h-60 rounded-full flex items-center justify-center shadow-2xl border-4 border-amber-300">
            {/* Render concentric rings from outside (5) to inside (0) */}
            {[5, 4, 3, 2, 1, 0].map((ringIdx) => {
              const sizePct = ((ringIdx + 1) / 6) * 100;
              const activeColorId = showReference
                ? targetPattern[ringIdx].targetColor
                : playerColors[ringIdx];
              return (
                <button
                  key={ringIdx}
                  onClick={() => !showReference && handlePaintRing(ringIdx)}
                  style={{
                    width: `${sizePct}%`,
                    height: `${sizePct}%`,
                    backgroundColor: getHex(activeColorId)
                  }}
                  className="absolute rounded-full border-2 border-white/80 hover:scale-[1.02] transition-all flex items-start justify-center pt-1 shadow-inner"
                  title={targetPattern[ringIdx].ring}
                >
                  <span className="text-[9px] font-extrabold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    #{ringIdx + 1}
                  </span>
                </button>
              );
            })}
          </div>
          <span className="text-xs text-amber-200 font-bold mt-2">
            {showReference ? 'REFERENCE PATTERN (Memorize!)' : 'Click any ring (#1–#6) or list item to paint!'}
          </span>
        </div>

        {/* Right: Palette & Ring Selector List */}
        <div className="col-span-7 bg-slate-900/85 border border-white/15 rounded-2xl p-4 space-y-3">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300 block mb-2">
              1. Pick Artisan Brush Color:
            </span>
            <div className="grid grid-cols-6 gap-2">
              {palette.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedColor(p.id)}
                  style={{ backgroundColor: p.hex }}
                  className={`p-2 rounded-xl border-2 text-[10px] font-extrabold text-white shadow transition-all ${
                    selectedColor === p.id ? 'border-white scale-105 ring-2 ring-amber-300' : 'border-black/40 opacity-85'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-sky-300 block mb-2">
              2. Paint Oxcart Wheel Layers (#1 Inner to #6 Outer):
            </span>
            <div className="grid grid-cols-2 gap-2">
              {targetPattern.map((layer, idx) => {
                const chosen = showReference ? layer.targetColor : playerColors[idx];
                return (
                  <button
                    key={idx}
                    onClick={() => !showReference && handlePaintRing(idx)}
                    className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-white/15 flex items-center justify-between text-left"
                  >
                    <span className="text-xs font-bold text-slate-100">
                      #{idx + 1} {layer.ring}
                    </span>
                    <span
                      style={{ backgroundColor: getHex(chosen) }}
                      className="w-6 h-6 rounded-full border-2 border-white shrink-0"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 3. AL_Mariposario & AL_Juan_Santamaria - Alajuela Cultural & Historical Variants
 */
export function AlajuelaCulturalVariantGame({ minigame, onComplete, playSfx }) {
  const isJuan = minigame?.id === 'AL_Juan_Santamaria';

  const challenges = isJuan
    ? [
        {
          title: 'Milestone 1: Hero of Alajuela (Born August 29, 1831)',
          desc: 'Juan Santamaría was born in the province of Alajuela and joined the Costa Rican army as a drummer boy during the National Campaign of 1856–1857.',
          q: 'What was Juan Santamaría’s affectionate nickname in Alajuela because of his curly spiked hair?',
          options: [
            { text: '"El Erizo" (The Hedgehog)', ok: true },
            { text: '"El León" (The Lion)', ok: false },
            { text: '"El Águila" (The Eagle)', ok: false }
          ]
        },
        {
          title: 'Milestone 2: The Battle of Rivas (April 11, 1856)',
          desc: 'During the Second Battle of Rivas in Nicaragua, William Walker’s filibuster forces fortified themselves inside a large wooden building.',
          q: 'What was the name of the strategic building that Juan Santamaría volunteered to set on fire with his torch?',
          options: [
            { text: 'The Mesón de Guerra (Francisco Guerra’s Inn)', ok: true },
            { text: 'The Fortín de Heredia', ok: false },
            { text: 'The Castillo de la Gloria', ok: false }
          ]
        },
        {
          title: 'Milestone 3: Legacy & National Sovereignty',
          desc: 'Before advancing with his blazing torch on April 11, 1856, Juan Santamaría asked his comrades to look after his mother, Manuela Carvajal (Manuela Santamaría).',
          q: 'On what date does Costa Rica commemorate Juan Santamaría Day every year?',
          options: [
            { text: 'April 11th', ok: true },
            { text: 'December 31st', ok: false },
            { text: 'July 4th', ok: false }
          ]
        }
      ]
    : [
        {
          title: 'Specimen 1: The Blue Morpho (Morpho peleides)',
          desc: 'Costa Rica is home to around 18% of the world’s butterfly species! The iridescent Blue Morpho is one of the most iconic butterflies in Alajuela’s rainforests.',
          q: 'Why do the Blue Morpho’s wings look bright metallic blue on top and brown with eyespots underneath?',
          options: [
            { text: 'To dazzle predators in flight and camouflage like tree bark when its wings are closed', ok: true },
            { text: 'Because it swims underwater in the ocean', ok: false },
            { text: 'Because it glows with electricity at night', ok: false }
          ]
        },
        {
          title: 'Specimen 2: The Glasswing Butterfly (Greta oto)',
          desc: 'Known in Spanish as "Espejitos", this delicate butterfly feeds on nectar from tropical flowers in Alajuela’s cloud forests.',
          q: 'What makes the Glasswing Butterfly ("Espejitos") unique among insects?',
          options: [
            { text: 'Its wings are transparent like glass, making it nearly invisible in flight', ok: true },
            { text: 'It weighs more than 5 kilograms', ok: false },
            { text: 'It builds nests out of volcanic rock', ok: false }
          ]
        },
        {
          title: 'Specimen 3: The Owl Butterfly (Caligo memnon)',
          desc: 'Active at dusk in banana and heliconia gardens across Alajuela, this large butterfly has huge markings on its hindwings.',
          q: 'What animal do the large eyespots on the Caligo butterfly’s wings resemble to scare away small birds and lizards?',
          options: [
            { text: 'The eyes of an Owl (Mariposa Búho)', ok: true },
            { text: 'A hammerhead shark', ok: false },
            { text: 'A white-tailed deer', ok: false }
          ]
        }
      ];

  const [step, setStep] = useState(0);
  const [feedback, setFeedback] = useState(null);

  const current = challenges[step];

  const handleAnswer = (opt) => {
    if (opt.ok) {
      playSfx(36);
      if (step < challenges.length - 1) {
        setFeedback('Correct! Advancing to the next stage...');
        setTimeout(() => {
          setFeedback(null);
          setStep((s) => s + 1);
        }, 700);
      } else {
        onComplete({
          won: true,
          score: 120,
          coinsEarned: 1200,
          summary: isJuan
            ? 'Completed the 1856 Battle of Rivas & Juan Santamaría Historical Challenge!'
            : 'Cataloged all 3 tropical butterfly species in the Alajuela Butterfly Sanctuary!'
        });
      }
    } else {
      playSfx(37);
      setFeedback('Not quite! Read the cultural note on the left and try again.');
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-gradient-to-br from-slate-900 via-red-950 to-amber-950 text-white p-5 select-none">
      <div className="flex items-center justify-between pb-3 border-b border-amber-400/40">
        <h3 className="font-display text-lg text-amber-300 flex items-center gap-2">
          <span>{isJuan ? '🔥' : '🦋'}</span>
          {isJuan
            ? 'Battle of Rivas 1856: Juan Santamaría Historical Mission'
            : 'Alajuela Tropical Butterfly Sanctuary (Mariposario)'}
        </h3>
        <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-display text-xs">
          Stage {step + 1} / {challenges.length}
        </span>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4 pt-4 items-center">
        <div className="col-span-5 bg-black/50 border border-amber-400/30 rounded-2xl p-4 space-y-3">
          <div className="text-5xl text-center py-2">{isJuan ? '🥁🔥🏛️' : '🦋🌺🌿'}</div>
          <h4 className="font-display text-base text-amber-300">{current.title}</h4>
          <p className="text-xs text-slate-200 leading-relaxed">{current.desc}</p>
        </div>

        <div className="col-span-7 bg-slate-900/85 border border-white/15 rounded-2xl p-4 space-y-3">
          <h4 className="font-display text-base text-white">{current.q}</h4>
          <div className="space-y-2.5">
            {current.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(opt)}
                className="w-full text-left p-3.5 rounded-xl bg-slate-800 hover:bg-amber-400 hover:text-slate-950 border-2 border-white/15 hover:border-white text-xs font-bold transition-all"
              >
                {opt.text}
              </button>
            ))}
          </div>
          {feedback && (
            <div className="p-2.5 rounded-xl bg-black/60 text-xs font-bold text-amber-300">
              {feedback}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
