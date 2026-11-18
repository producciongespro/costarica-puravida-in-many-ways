import React, { useState, useEffect, useRef } from 'react';
import { assetUrl } from '../../utils/assetUrl';
import { Flame, Ghost, HelpCircle, Volume2, CheckCircle2, Sparkles, Compass, Eye } from 'lucide-react';

/**
 * 1. CT_Sanatorio_Duran - Sanatorio Carlos Durán (Cartago)
 * Explore the 6 rooms/mysteries of the historic 1918 Sanatorio Durán with your flashlight!
 * Uses sfx 31 (door), 32 (ghostlymoan), 42 (lightsOff) and real in-game dialogues.
 */
export function SanatorioDuranGame({ minigame, character, onComplete, playSfx, playVoiceover }) {
  const mysteries = [
    {
      id: 0,
      room: 'Wing 1: Entrance Pavilion (Founded 1918)',
      icon: '🏥',
      audio: 'audio/Sanatorio Duran Locutor 001 MASC.m4a',
      prompt:
        'You enter the historic Sanatorio Carlos Durán, founded in 1918 on the slopes of Irazú Volcano. Why did Dr. Carlos Durán Cartín establish this hospital here?',
      options: [
        { text: 'To treat tuberculosis patients using fresh high-altitude mountain air and sunlight', ok: true },
        { text: 'As a beachfront surf hotel in Guanacaste', ok: false },
        { text: 'As a coffee roasting warehouse in 1995', ok: false }
      ],
      clue: 'Dr. Carlos Durán Cartín (President & physician) modeled it after European mountain sanatoriums.'
    },
    {
      id: 1,
      room: 'Wing 2: The Pediatric Hall & The Lost Doll',
      icon: '🪆',
      audio: 'audio/Sanatorio Duran Fantasma 1 001 Fem.m4a',
      prompt:
        'A friendly voice whispers in the corridor: "Could you help me find my doll?" Where is the antique porcelain doll hidden in this room?',
      options: [
        { text: 'Inspect the wooden cabinet beside the sunlit window (Click to recover the doll)', ok: true },
        { text: 'Run outside without helping', ok: false },
        { text: 'Break the locked cellar floor', ok: false }
      ],
      clue: 'Helping the spirits of the Sanatorio with kindness unlocks the upper corridor!'
    },
    {
      id: 2,
      room: 'Wing 3: The Solarium & Hide-and-Seek',
      icon: '🔦',
      audio: 'audio/Sanatorio Duran Fantasma 1 006 Fem.m4a',
      prompt:
        '"Thank you for finding my doll! Now let us play hide and seek!" Your flashlight flickers (lightsOff). Which numbered door leads safely to the Solarium?',
      options: [
        { text: 'Door #1918 — The year the Sanatorio was inaugurated', ok: true },
        { text: 'Door #0000 — The pitch-black basement', ok: false },
        { text: 'Door #9999 — The blocked chimney', ok: false }
      ],
      clue: 'Remember the founding year of the Sanatorio Durán: 1918!'
    },
    {
      id: 3,
      room: 'Wing 4: The Yellow Steps & Architecture',
      icon: '🪜',
      audio: '',
      prompt:
        'You reach the iconic yellow concrete staircases connecting the pavilions. Why did the Sanatorio eventually close as a tuberculosis hospital in 1973?',
      options: [
        { text: 'Modern antibiotics and vaccines made isolated mountain sanatoriums unnecessary', ok: true },
        { text: 'Because whales took over the building', ok: false },
        { text: 'Because Cartago moved to the beach', ok: false }
      ],
      clue: 'Medical advances cured tuberculosis without requiring years of mountain isolation.'
    },
    {
      id: 4,
      room: 'Wing 5: The Old Chapel & Volcanic Mist',
      icon: '🔔',
      audio: '',
      prompt:
        'Thick mist from the nearby Irazú Volcano rolls past the chapel windows. What national heritage status does the Sanatorio Durán hold today?',
      options: [
        { text: 'Historical and Architectural Heritage of Costa Rica (open to cultural & educational tourism)', ok: true },
        { text: 'An active international airport', ok: false },
        { text: 'A shopping mall', ok: false }
      ],
      clue: 'Thousands of visitors explore its history, architecture, and legends every year.'
    },
    {
      id: 5,
      room: 'Wing 6: Courtyard Exit & Investigator Badge',
      icon: '🗝️',
      audio: '',
      prompt:
        'Final Mystery: You found the master key to the main courtyard gate! What province and canton is the Sanatorio Durán located in?',
      options: [
        { text: 'Tierra Blanca / Potrero Cerrado of Oreamuno, Cartago Province', ok: true },
        { text: 'Puerto Viejo, Limón Province', ok: false },
        { text: 'Nicoya Peninsula, Guanacaste Province', ok: false }
      ],
      clue: 'Located high on the road toward Irazú Volcano in Oreamuno, Cartago.'
    }
  ];

  const [activeIdx, setActiveIdx] = useState(0);
  const [solved, setSolved] = useState([]);
  const [flashlightPos, setFlashlightPos] = useState({ x: 50, y: 50 });
  const [feedback, setFeedback] = useState('Move your flashlight across the Sanatorio halls and solve all 6 mysteries!');

  const current = mysteries[activeIdx];

  useEffect(() => {
    playSfx(31); // door creak
    if (current?.audio) {
      playVoiceover(current.audio);
    }
  }, [activeIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setFlashlightPos({ x, y });
  };

  const handleSelectOption = (opt) => {
    if (opt.ok) {
      playSfx(36);
      const nextSolved = solved.includes(current.id) ? solved : [...solved, current.id];
      setSolved(nextSolved);
      setFeedback(`Mystery #${current.id + 1} Solved! ${current.clue}`);

      if (nextSolved.length === mysteries.length) {
        setTimeout(() => {
          onComplete({
            won: true,
            score: 150,
            coinsEarned: 1500,
            summary: 'Solved all 6 historical mysteries of the Sanatorio Carlos Durán in Cartago!'
          });
        }, 900);
      } else if (activeIdx < mysteries.length - 1) {
        setTimeout(() => setActiveIdx((i) => i + 1), 850);
      }
    } else {
      playSfx(32); // ghostly moan
      setFeedback('A ghostly chill echoes down the hallway! Try another choice.');
    }
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative w-full h-full flex flex-col bg-slate-950 text-white overflow-hidden select-none"
    >
      {/* Dynamic Flashlight Radial Glow */}
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity"
        style={{
          background: `radial-gradient(circle 220px at ${flashlightPos.x}% ${flashlightPos.y}%, rgba(254, 240, 138, 0.18), rgba(2, 6, 23, 0.92) 80%)`
        }}
      />

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-amber-400/30">
        <div className="flex items-center gap-2">
          <Ghost className="w-5 h-5 text-cyan-300 animate-bounce" />
          <span className="font-display text-sm text-amber-300">
            Sanatorio Durán Mysteries: {solved.length} / 6
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {mysteries.map((m, idx) => (
            <button
              key={m.id}
              onClick={() => setActiveIdx(idx)}
              className={`w-7 h-7 rounded-lg font-display text-xs border transition-all ${
                idx === activeIdx
                  ? 'bg-amber-400 text-slate-950 border-white scale-110'
                  : solved.includes(m.id)
                  ? 'bg-emerald-700 text-white border-emerald-400'
                  : 'bg-slate-800 text-slate-400 border-white/15'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        <button
          onClick={() => playSfx(42)}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/20 text-xs font-bold text-cyan-200"
        >
          🔦 Toggle Flashlight Click
        </button>
      </div>

      {/* Main Mystery Room */}
      <div className="relative z-10 flex-1 grid grid-cols-12 gap-4 p-4 overflow-y-auto">
        <div className="col-span-5 bg-slate-900/80 border border-cyan-400/30 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-300 block mb-1">
              Mystery {activeIdx + 1} of 6
            </span>
            <h3 className="font-display text-base text-amber-300 mb-3 flex items-center gap-2">
              <span className="text-2xl">{current.icon}</span>
              {current.room}
            </h3>
            <p className="text-xs text-slate-200 leading-relaxed bg-black/50 p-3 rounded-xl border border-white/10">
              {current.prompt}
            </p>
          </div>

          <div className="bg-cyan-950/40 border border-cyan-400/30 rounded-xl p-3 text-xs text-cyan-200">
            <strong className="block text-amber-300 mb-0.5">Historical Note:</strong>
            {current.clue}
          </div>
        </div>

        <div className="col-span-7 bg-slate-900/80 border border-white/15 rounded-2xl p-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="font-display text-sm text-white">
              Choose your investigation action:
            </h4>
            {current.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSelectOption(opt)}
                className="w-full text-left p-3.5 rounded-xl bg-slate-800/90 hover:bg-amber-400 hover:text-slate-950 border-2 border-white/15 hover:border-white text-xs font-bold transition-all shadow-md"
              >
                {opt.text}
              </button>
            ))}
          </div>

          <div className="mt-3 p-3 rounded-xl bg-black/60 border border-amber-400/30 text-xs font-bold text-amber-200">
            {feedback}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 2. CT_Volcanes & CT_Volcanes2 - Volcanoes of Cartago & Costa Rica
 * Monitor the 5 iconic volcanoes of Costa Rica (Irazú, Turrialba, Poás, Arenal, Rincón de la Vieja).
 * Click rising pressure vents before any volcano reaches 100% eruption pressure for 45 seconds!
 */
export function VolcanoesControlGame({ minigame, onComplete, playSfx }) {
  const initialVolcanoes = [
    {
      id: 'irazu',
      name: 'Irazú Volcano',
      province: 'Cartago (3,432 m - Highest in CR)',
      pressure: 25,
      rate: 4.2,
      fact: 'Highest active volcano in Costa Rica, famous for its emerald-green Diego de la Haya crater lake.'
    },
    {
      id: 'turrialba',
      name: 'Turrialba Volcano',
      province: 'Cartago (3,340 m)',
      pressure: 30,
      rate: 4.8,
      fact: 'Twin volcano to Irazú in the Central Volcanic Cordillera, known for frequent gas and ash fumaroles.'
    },
    {
      id: 'poas',
      name: 'Poás Volcano',
      province: 'Alajuela (2,708 m)',
      pressure: 20,
      rate: 3.9,
      fact: 'Features one of the largest acidic crater lagoons in the world and Laguna Botos.'
    },
    {
      id: 'arenal',
      name: 'Arenal Volcano',
      province: 'Alajuela / San Carlos (1,670 m)',
      pressure: 15,
      rate: 3.5,
      fact: 'Iconic conical stratovolcano surrounded by geothermal hot springs and Lake Arenal.'
    },
    {
      id: 'rincon',
      name: 'Rincón de la Vieja',
      province: 'Guanacaste (1,916 m)',
      pressure: 22,
      rate: 4.1,
      fact: 'Located in the Guanacaste Cordillera, rich in boiling mud pots (pailas), fumaroles, and thermal waters.'
    }
  ];

  const [volcanoes, setVolcanoes] = useState(initialVolcanoes);
  const [timeLeft, setTimeLeft] = useState(40);
  const [stabilizedCount, setStabilizedCount] = useState(0);
  const [activeFact, setActiveFact] = useState(
    'Click on any volcano with rising magma pressure to release geothermal steam and keep it below 100%!'
  );
  const doneRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      if (doneRef.current) return;

      setTimeLeft((t) => {
        if (t <= 1 && !doneRef.current) {
          doneRef.current = true;
          onComplete({
            won: true,
            score: 100 + stabilizedCount * 10,
            coinsEarned: 1200 + stabilizedCount * 35,
            summary: `Protected Costa Rica's 5 volcanoes from erupting and vented geothermal steam ${stabilizedCount} times!`
          });
          return 0;
        }
        return t - 1;
      });

      setVolcanoes((prev) => {
        const next = prev.map((v) => {
          const surge = Math.random() < 0.35 ? v.rate * 2.1 : v.rate;
          return { ...v, pressure: Math.min(100, Math.round(v.pressure + surge)) };
        });

        const erupted = next.find((v) => v.pressure >= 100);
        if (erupted && !doneRef.current) {
          doneRef.current = true;
          playSfx(37);
          onComplete({
            won: false,
            score: stabilizedCount * 10,
            coinsEarned: stabilizedCount * 25,
            summary: `${erupted.name} reached 100% pressure and erupted! Click volcanoes with red/orange bars to release pressure in time.`
          });
        }
        return next;
      });
    }, 900);

    return () => clearInterval(timer);
  }, [onComplete, playSfx, stabilizedCount]);

  const handleVentVolcano = (v) => {
    playSfx(36);
    setStabilizedCount((c) => c + 1);
    setActiveFact(`${v.name} (${v.province}): ${v.fact}`);
    setVolcanoes((prev) =>
      prev.map((item) =>
        item.id === v.id ? { ...item, pressure: Math.max(8, item.pressure - 38) } : item
      )
    );
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-gradient-to-b from-slate-950 via-stone-900 to-orange-950 text-white overflow-hidden select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/75 border-b border-orange-400/40">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-xl bg-orange-500/20 border border-orange-400 text-orange-300 font-display text-sm flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-400" />
            Geothermal Vents Stabilized: {stabilizedCount}
          </span>
        </div>

        <div className={`px-4 py-1 rounded-xl font-display text-sm border ${timeLeft <= 10 ? 'bg-emerald-600 border-white animate-pulse' : 'bg-slate-900 border-white/25'}`}>
          ⏱ Hold for {timeLeft}s
        </div>
      </div>

      {/* Educational Fact Ticker */}
      <div className="bg-orange-950/60 border-b border-orange-400/20 px-4 py-1.5 text-center text-xs font-bold text-amber-200">
        {activeFact}
      </div>

      {/* 5 Volcano Cards */}
      <div className="flex-1 grid grid-cols-5 gap-3 p-4 items-stretch">
        {volcanoes.map((v) => {
          const danger = v.pressure >= 75;
          const warning = v.pressure >= 50 && v.pressure < 75;
          return (
            <button
              key={v.id}
              onClick={() => handleVentVolcano(v)}
              className={`rounded-2xl border-2 p-3 flex flex-col items-center justify-between transition-all cursor-pointer ${
                danger
                  ? 'bg-red-950/90 border-red-400 animate-pulse shadow-[0_0_25px_rgba(248,113,113,0.6)]'
                  : warning
                  ? 'bg-amber-950/80 border-amber-400 hover:scale-105'
                  : 'bg-slate-900/80 border-emerald-400/50 hover:scale-105'
              }`}
            >
              <div className="text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">
                  {v.province.split('(')[0]}
                </span>
                <h4 className="font-display text-sm text-white mt-0.5">{v.name}</h4>
              </div>

              {/* Volcano Illustration + Pressure Thermometer */}
              <div className="my-2 flex flex-col items-center w-full">
                <div className="text-4xl mb-2">🌋</div>
                <div className="w-full h-5 bg-slate-950 rounded-full overflow-hidden border border-white/25 p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      danger
                        ? 'bg-gradient-to-r from-orange-500 to-red-500'
                        : warning
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                        : 'bg-gradient-to-r from-emerald-500 to-lime-400'
                    }`}
                    style={{ width: `${v.pressure}%` }}
                  />
                </div>
                <span className="font-display text-xs mt-1">
                  Pressure: {v.pressure}%
                </span>
              </div>

              <span className="w-full py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display text-xs shadow">
                Release Steam 💨
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 3. CT_Basilica_Angeles - Basílica de Nuestra Señora de los Ángeles (Rescued Cultural Puzzle Variant)
 * Reconstruct the iconic Byzantine-colonial Basilica of Cartago by swapping puzzle tiles,
 * with Hint ("Pista") preview and cultural facts about La Negrita & the August 2 Romería.
 */
export function BasilicaPuzzleGame({ minigame, onComplete, playSfx }) {
  // 9-tile (3x3) or 16-tile (4x4) fast interactive architectural puzzle
  const GRID_SIZE = 3;
  const TOTAL = GRID_SIZE * GRID_SIZE;

  const [tiles, setTiles] = useState(() => {
    const arr = Array.from({ length: TOTAL }, (_, i) => i);
    // Shuffle deterministically so it's not already solved
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [moves, setMoves] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const isSolved = tiles.every((val, idx) => val === idx);

  useEffect(() => {
    if (isSolved && moves > 0) {
      playSfx(36);
      setTimeout(() => {
        onComplete({
          won: true,
          score: Math.max(100, 200 - moves * 5),
          coinsEarned: 1200,
          summary: `Reconstructed the Basílica de Nuestra Señora de los Ángeles in ${moves} moves!`
        });
      }, 700);
    }
  }, [isSolved, moves, onComplete, playSfx]);

  const handleTileClick = (idx) => {
    if (selectedIdx === null) {
      setSelectedIdx(idx);
    } else if (selectedIdx === idx) {
      setSelectedIdx(null);
    } else {
      playSfx(44);
      setTiles((prev) => {
        const copy = [...prev];
        [copy[selectedIdx], copy[idx]] = [copy[idx], copy[selectedIdx]];
        return copy;
      });
      setSelectedIdx(null);
      setMoves((m) => m + 1);
    }
  };

  const tileLabels = [
    'Left Bell Tower Spire',
    'Central Byzantine Dome',
    'Right Bell Tower Spire',
    'West Rose Window',
    'Main Altar of La Negrita',
    'East Rose Window',
    'Left Collonade Arch',
    'Main Basilica Portal (1912)',
    'Sacred Water Stone (La Piedra)'
  ];

  return (
    <div className="relative w-full h-full flex flex-col bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white overflow-hidden select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/70 border-b border-amber-400/40">
        <div className="flex items-center gap-3">
          <span className="font-display text-sm text-amber-300">
            ⛪ Basílica de los Ángeles Architectural Puzzle
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-xs font-bold">
            Swaps: {moves}
          </span>
        </div>

        <button
          onClick={() => setShowHint((h) => !h)}
          className="px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display text-xs flex items-center gap-1.5 shadow"
        >
          <Eye className="w-4 h-4" /> {showHint ? 'Hide Hint (Pista)' : 'Show Hint (Pista)'}
        </button>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4 p-4 items-center">
        {/* Left: Puzzle Grid */}
        <div className="col-span-7 flex flex-col items-center">
          <div className="grid grid-cols-3 gap-2 w-full max-w-[380px] aspect-square bg-slate-950 p-2.5 rounded-2xl border-2 border-amber-400/50 shadow-2xl">
            {tiles.map((pieceId, gridIdx) => {
              const isCorrectSpot = pieceId === gridIdx;
              const isSelected = selectedIdx === gridIdx;
              const row = Math.floor(pieceId / 3);
              const col = pieceId % 3;
              return (
                <button
                  key={gridIdx}
                  onClick={() => handleTileClick(gridIdx)}
                  style={{
                    backgroundImage: `url(${assetUrl('sprites/sanatorio.png')})`,
                    backgroundSize: '300% 300%',
                    backgroundPosition: `${col * 50}% ${row * 50}%`
                  }}
                  className={`relative rounded-xl border-2 p-2 flex flex-col items-center justify-between transition-all overflow-hidden ${
                    isSelected
                      ? 'border-amber-300 ring-4 ring-amber-400 scale-95 z-10'
                      : isCorrectSpot
                      ? 'border-emerald-400/80'
                      : 'border-white/25 hover:border-amber-200'
                  }`}
                >
                  <div className="w-full flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded bg-slate-950/85 text-[10px] font-display text-amber-300">
                      #{pieceId + 1}
                    </span>
                    {isCorrectSpot && (
                      <span className="px-1 rounded bg-emerald-600 text-[10px] font-bold text-white">
                        ✓
                      </span>
                    )}
                  </div>
                  <span className="w-full text-center bg-slate-950/85 px-1.5 py-1 rounded text-[10px] font-bold text-white leading-tight">
                    {tileLabels[pieceId]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Instructions & Cultural History */}
        <div className="col-span-5 bg-slate-900/85 border border-white/15 rounded-2xl p-4 space-y-3">
          <h4 className="font-display text-base text-amber-300">
            How to Solve the Basilica Puzzle
          </h4>
          <p className="text-xs text-slate-200 leading-relaxed">
            Click any two architectural tiles to swap their positions until tiles <strong>#1 through #9</strong> are in sequential order from top-left to bottom-right!
          </p>

          {showHint && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-300/40 text-xs space-y-1">
              <strong className="text-amber-300 block">Correct Order (Pista):</strong>
              <div className="grid grid-cols-3 gap-1 text-[10px] text-amber-100">
                {tileLabels.map((lbl, i) => (
                  <div key={i} className="bg-black/40 p-1 rounded border border-white/10">
                    <strong>#{i + 1}:</strong> {lbl}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-400/30 text-xs text-indigo-100 leading-relaxed">
            <strong className="text-amber-300 block mb-1">Cultural Heritage of Cartago:</strong>
            Built in a unique Franco-Byzantine style after the 1910 earthquake, the Basílica houses the statue of <em>La Negrita</em> (Our Lady of the Angels, patron saint of Costa Rica). Every August 2nd, over two million pilgrims walk the traditional <em>Romería</em> to Cartago!
          </div>
        </div>
      </div>
    </div>
  );
}
