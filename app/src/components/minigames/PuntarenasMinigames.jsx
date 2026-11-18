import React, { useState, useEffect, useRef } from 'react';
import { assetUrl } from '../../utils/assetUrl';
import { Trees, Camera, Volume2, IceCream, Trash2, CheckCircle2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

/**
 * 1. PR_Manuel_Antonio - Manuel Antonio National Park Adventure (Puntarenas)
 * 3-Stage Eco-Quest:
 * Stage 1: Collect 10 tropical fruits & seashells along the trail + pick up the wooden bridge log.
 * Stage 2: Repair the river bridge with the log to cross into the primary rainforest.
 * Stage 3: Follow the Park Ranger's English directions to spot the Capuchin Monkeys in the canopy!
 */
export function ManuelAntonioGame({ minigame, character, onComplete, playSfx, playVoiceover }) {
  const [stage, setStage] = useState(1);
  const [itemsCollected, setItemsCollected] = useState(0);
  const [hasLog, setHasLog] = useState(false);
  const [bridgeRepaired, setBridgeRepaired] = useState(false);
  const [monkeysFound, setMonkeysFound] = useState([]);
  const [statusMsg, setStatusMsg] = useState(
    'Stage 1: Collect all 10 coastal fruits & shells along the beach trail AND pick up the wooden log!'
  );

  const [trailItems, setTrailItems] = useState(() =>
    Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      name: i % 3 === 0 ? 'Conch Shell' : i % 3 === 1 ? 'Ripe Mango' : 'Tropical Papaya',
      icon: i % 3 === 0 ? '🐚' : i % 3 === 1 ? '🥭' : '🍈',
      x: 10 + (i * 8) + (i % 2 === 0 ? 2 : -2),
      y: 25 + ((i * 19) % 55),
      collected: false
    }))
  );

  const canopyClues = [
    {
      treeId: 2,
      audio: 'audio/OK GUARDA PARQUES (al inicio del tercer room) 004.m4a',
      clue: 'Park Ranger: "Look carefully at Tree #2 — the tall cecropia tree in the middle next to the palm tree! A White-Faced Capuchin Monkey is hiding there with your camera!"'
    },
    {
      treeId: 4,
      audio: 'audio/OK GUARDA PARQUES (al inicio del tercer room) 005.m4a',
      clue: 'Park Ranger: "Great photo! Now look at Tree #4 on the far right side by the hibiscus flowers to photograph the Three-Toed Sloth & Squirrel Monkey!"'
    },
    {
      treeId: 1,
      audio: 'audio/OK GUARDA PARQUES (al inicio del tercer room) 008.m4a',
      clue: 'Park Ranger: "One last wildlife photo! Check Tree #1 on the left near the mangrove trail!"'
    }
  ];

  const [clueStep, setClueStep] = useState(0);

  const handleCollectTrailItem = (id) => {
    playSfx(44);
    setTrailItems((prev) => prev.map((it) => (it.id === id ? { ...it, collected: true } : it)));
    const nextCount = itemsCollected + 1;
    setItemsCollected(nextCount);
    if (nextCount >= 10 && hasLog) {
      setStage(2);
      setStatusMsg('Stage 2: Click the broken River Bridge to place your wooden log and cross into the canopy!');
    }
  };

  const handlePickLog = () => {
    playSfx(36);
    setHasLog(true);
    if (itemsCollected >= 10) {
      setStage(2);
      setStatusMsg('Stage 2: Click the broken River Bridge to place your wooden log and cross into the canopy!');
    } else {
      setStatusMsg(`Picked up the heavy Wooden Log! Collect the remaining ${10 - itemsCollected} items.`);
    }
  };

  const handleRepairBridge = () => {
    playSfx(36);
    setBridgeRepaired(true);
    setStage(3);
    if (canopyClues[0].audio) {
      playVoiceover(canopyClues[0].audio);
    }
    setStatusMsg(canopyClues[0].clue);
  };

  const handleInspectTree = (treeNum) => {
    const expected = canopyClues[clueStep]?.treeId;
    if (treeNum === expected) {
      playSfx(40); // Camera shutter sfx 40!
      const nextFound = [...monkeysFound, treeNum];
      setMonkeysFound(nextFound);

      if (nextFound.length >= 3) {
        playSfx(36);
        setTimeout(() => {
          onComplete({
            won: true,
            score: 150,
            coinsEarned: 1500,
            summary: 'Collected all 10 trail treasures, repaired the bridge, and photographed the wildlife of Manuel Antonio!'
          });
        }, 800);
      } else {
        const nextStep = clueStep + 1;
        setClueStep(nextStep);
        if (canopyClues[nextStep]?.audio) {
          playVoiceover(canopyClues[nextStep].audio);
        }
        setStatusMsg(canopyClues[nextStep].clue);
      }
    } else {
      playSfx(37);
      setStatusMsg(`No monkey in Tree #${treeNum}! Read the Park Ranger's clue carefully.`);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-gradient-to-b from-sky-600 via-emerald-800 to-amber-700 text-white overflow-hidden select-none">
      {/* Top HUD */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/85 border-b border-emerald-400/40 z-10">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-200 font-display text-xs">
            🐚 Trail Items: {itemsCollected}/10
          </span>
          <span className={`px-3 py-1 rounded-xl border font-display text-xs ${hasLog ? 'bg-amber-500/30 border-amber-300 text-amber-200' : 'bg-slate-800 border-white/15 text-slate-400'}`}>
            🪵 Bridge Log: {hasLog ? 'Carried ✓' : 'Find on Trail'}
          </span>
          <span className="px-3 py-1 rounded-xl bg-sky-500/20 border border-sky-400 text-sky-200 font-display text-xs">
            📸 Wildlife Photos: {monkeysFound.length}/3
          </span>
        </div>

        <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-display text-xs">
          Stage {stage} of 3
        </span>
      </div>

      {/* Ranger Message Banner */}
      <div className="bg-slate-950/75 px-4 py-2 text-xs font-bold text-amber-200 border-b border-white/10 flex items-center justify-between">
        <span>{statusMsg}</span>
        {stage === 3 && (
          <button
            onClick={() => canopyClues[clueStep]?.audio && playVoiceover(canopyClues[clueStep].audio)}
            className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-display text-[11px] flex items-center gap-1 shrink-0 ml-2"
          >
            <Volume2 className="w-3.5 h-3.5" /> Audio Clue
          </button>
        )}
      </div>

      {/* Interactive Park Scene */}
      <div className="relative flex-1 overflow-hidden">
        {stage === 1 && (
          <div className="relative w-full h-full">
            {trailItems.map(
              (it) =>
                !it.collected && (
                  <button
                    key={it.id}
                    onClick={() => handleCollectTrailItem(it.id)}
                    style={{ left: `${it.x}%`, top: `${it.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 p-2.5 rounded-2xl bg-slate-950/80 hover:bg-amber-400 hover:text-slate-950 border-2 border-amber-300 shadow-xl transition-transform hover:scale-125"
                  >
                    <span className="text-2xl">{it.icon}</span>
                  </button>
                )
            )}

            {!hasLog && (
              <button
                onClick={handlePickLog}
                style={{ left: '84%', top: '72%' }}
                className="absolute -translate-x-1/2 -translate-y-1/2 px-4 py-2.5 rounded-2xl bg-amber-800 hover:bg-amber-500 border-2 border-white shadow-2xl flex items-center gap-2 animate-bounce"
              >
                <span className="text-2xl">🪵</span>
                <span className="font-display text-xs">Pick Up Bridge Log</span>
              </button>
            )}
          </div>
        )}

        {stage === 2 && (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-sky-900/50">
            <div className="text-6xl mb-3">🌊🪵🌊</div>
            <h3 className="font-display text-xl text-amber-300 mb-2">
              Cross the Mangrove Stream
            </h3>
            <p className="text-xs text-slate-100 max-w-md mb-4">
              You collected all 10 trail items and carried the fallen trunk! Place the wooden log over the stream to reach the Park Ranger in the canopy zone.
            </p>
            <button
              onClick={handleRepairBridge}
              className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display text-base shadow-2xl animate-pulse"
            >
              🪵 Place Wooden Log & Cross Bridge →
            </button>
          </div>
        )}

        {stage === 3 && (
          <div className="w-full h-full grid grid-cols-4 gap-4 p-5 items-stretch">
            {[
              { id: 1, name: 'Tree #1: Left Mangrove Fig', icon: '🌳', desc: 'Near the coastal mangrove trail' },
              { id: 2, name: 'Tree #2: Tall Middle Cecropia', icon: '🌴', desc: 'In the middle next to the palm tree' },
              { id: 3, name: 'Tree #3: Shady Almond Tree', icon: '🌲', desc: 'By the rocky lookout point' },
              { id: 4, name: 'Tree #4: Far Right Canopy Branch', icon: '🌺', desc: 'Far right side by the hibiscus flowers' }
            ].map((tree) => {
              const photographed = monkeysFound.includes(tree.id);
              return (
                <button
                  key={tree.id}
                  onClick={() => handleInspectTree(tree.id)}
                  className={`rounded-2xl border-2 p-4 flex flex-col items-center justify-between transition-all ${
                    photographed
                      ? 'bg-emerald-800/90 border-emerald-300 text-white'
                      : 'bg-slate-950/80 hover:bg-emerald-900/90 border-amber-300/60 hover:border-amber-300 hover:scale-105'
                  }`}
                >
                  <span className="font-display text-sm text-amber-300">{tree.name}</span>
                  <div className="text-6xl my-2">{photographed ? '🐒📸' : tree.icon}</div>
                  <p className="text-xs text-slate-200 text-center">{tree.desc}</p>
                  <span className="mt-2 px-3 py-1 rounded-xl bg-amber-400 text-slate-950 font-display text-xs flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" />
                    {photographed ? 'Photographed ✓' : 'Take Photo'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 2. PR_Paseo_Turistas - Churchill Express on Paseo de los Turistas (Puntarenas)
 * Prepare traditional Puntarenas Churchills at Don Luis Araya's shaved-ice cart (sfx 43 raspar.m4a, max 5 in tray)
 * and serve thirsty beach tourists (200 coins each)! Deliver 8 Churchills before time runs out!
 */
export function PaseoTuristasGame({ minigame, character, onComplete, playSfx }) {
  const [trayCount, setTrayCount] = useState(3);
  const [servedCount, setServedCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(75);
  const [tourists, setTourists] = useState([
    { id: 1, name: 'Beach Surfer', x: 20, y: 32, timer: 100 },
    { id: 2, name: 'Family under Umbrella', x: 52, y: 28, timer: 100 },
    { id: 3, name: 'Cruise Tourist', x: 80, y: 35, timer: 100 },
    { id: 4, name: 'Pier Sightseer', x: 36, y: 65, timer: 100 }
  ]);
  const [feedback, setFeedback] = useState(
    'Click any Tourist craving a cold Churchill (🍧) to serve them (+200 coins)! Click Don Luis’s Cart to shave more ice!'
  );

  const MAX_TRAY = 5;
  const GOAL_SERVED = 8;
  const nextId = useRef(5);
  const doneRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      if (doneRef.current) return;

      setTimeLeft((t) => {
        if (t <= 1 && !doneRef.current) {
          doneRef.current = true;
          const won = servedCount >= GOAL_SERVED;
          onComplete({
            won,
            score: servedCount * 20,
            coinsEarned: servedCount * 200,
            summary: `Served ${servedCount} delicious Puntarenas Churchills along the Paseo de los Turistas!`
          });
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onComplete, servedCount]);

  const handlePrepareChurchill = () => {
    if (trayCount >= MAX_TRAY) {
      setFeedback('Your tray is full (5/5 Churchills)! Deliver them to the tourists on the beach!');
      return;
    }
    playSfx(43); // raspar.m4a shaved ice sound!
    setTrayCount((c) => Math.min(MAX_TRAY, c + 2));
    setFeedback('Shaved fresh ice & poured kola syrup, condensed milk, and powdered milk! Tray restocked!');
  };

  const handleServeTourist = (tourist) => {
    if (trayCount <= 0) {
      playSfx(37);
      setFeedback('Out of Churchills! Click Don Luis’s Churchill Cart on the bottom-right to shave more ice!');
      return;
    }

    playSfx(36);
    setTrayCount((c) => c - 1);
    const nextServed = servedCount + 1;
    setServedCount(nextServed);
    setFeedback(`Delivered a cold Churchill to ${tourist.name} (+200 coins)! (${nextServed}/${GOAL_SERVED})`);

    // Respawn a new tourist at a new beach spot
    setTourists((prev) =>
      prev
        .filter((t) => t.id !== tourist.id)
        .concat({
          id: nextId.current++,
          name: ['Sunbather', 'Volleyball Player', 'Boardwalk Stroller', 'Kayaker'][
            nextId.current % 4
          ],
          x: 15 + ((nextId.current * 23) % 62),
          y: 22 + ((nextId.current * 19) % 52),
          timer: 100
        })
    );

    if (nextServed >= GOAL_SERVED && !doneRef.current) {
      doneRef.current = true;
      setTimeout(() => {
        onComplete({
          won: true,
          score: nextServed * 25,
          coinsEarned: nextServed * 200 + timeLeft * 10,
          summary: `Served all ${nextServed} Churchills on the Paseo de los Turistas with ${timeLeft}s to spare!`
        });
      }, 500);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-gradient-to-b from-sky-400 via-amber-200 to-amber-400 text-slate-900 overflow-hidden select-none">
      {/* Top HUD */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/90 text-white border-b border-amber-400/40 z-10">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-xl bg-pink-500/20 border border-pink-400 text-pink-200 font-display text-sm">
            🍧 Churchills Served: {servedCount} / {GOAL_SERVED}
          </span>
          <span className={`px-3 py-1 rounded-xl border font-display text-sm ${trayCount === 0 ? 'bg-red-600 border-white animate-bounce' : 'bg-amber-500/20 border-amber-300 text-amber-200'}`}>
            Tray: {trayCount} / {MAX_TRAY} Ready
          </span>
          <span className="text-xs font-bold text-emerald-300">
            Earned: +{servedCount * 200} coins
          </span>
        </div>

        <div className="px-3 py-1 rounded-xl bg-slate-900 border border-white/20 font-display text-sm">
          ⏱ {timeLeft}s
        </div>
      </div>

      <div className="bg-slate-900/85 text-amber-200 text-xs font-bold text-center py-1.5 px-4">
        {feedback}
      </div>

      {/* Beach Promenade Play Area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Ocean Waves at Top */}
        <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-sky-600 to-cyan-400 border-b-4 border-white/70 flex items-center justify-around text-white font-display text-xs">
          <span>🌊 Golfo de Nicoya</span>
          <span>⛵ Puntarenas Pier</span>
          <span>🌊 Paseo de los Turistas</span>
        </div>

        {/* Waiting Tourists on the Beach */}
        {tourists.map((t) => (
          <button
            key={t.id}
            onClick={() => handleServeTourist(t)}
            style={{ left: `${t.x}%`, top: `${t.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 p-3 rounded-2xl bg-slate-950/90 hover:bg-pink-600 text-white border-2 border-amber-300 shadow-2xl flex flex-col items-center transition-transform hover:scale-110 z-20"
          >
            <div className="flex items-center gap-1 text-xl">
              <span>🏖️</span>
              <span className="animate-bounce">🍧</span>
            </div>
            <span className="font-display text-xs text-amber-300 mt-0.5">{t.name}</span>
            <span className="text-[10px] font-bold text-emerald-300">Serve (+200 coins)</span>
          </button>
        ))}

        {/* Don Luis Araya's Churchill Cart Station (Bottom-Right) */}
        <button
          onClick={handlePrepareChurchill}
          className="absolute right-4 bottom-4 p-4 rounded-2xl bg-gradient-to-b from-rose-600 to-rose-800 hover:from-rose-500 hover:to-rose-700 text-white border-4 border-amber-300 shadow-2xl flex flex-col items-center z-30 transition-transform active:scale-95"
        >
          <span className="text-3xl">🍧🛒</span>
          <span className="font-display text-sm mt-1">Don Luis&apos;s Churchill Cart</span>
          <span className="text-[11px] bg-amber-300 text-slate-950 font-extrabold px-2.5 py-0.5 rounded-full mt-1">
            Click to Shave Ice (+2 🍧)
          </span>
        </button>
      </div>
    </div>
  );
}

/**
 * 3. PR_Tarcoles - Let's Clean Tárcoles River (Puntarenas)
 * Collect floating plastic trash bags from the Tárcoles River while avoiding swimming American Crocodiles!
 * Rewards: >=10 bags = 5000 coins, >=7 bags = 3000 coins, >=5 bags = 1500 coins.
 */
export function TarcolesCleanupGame({ minigame, character, onComplete, playSfx }) {
  const [bagCount, setBagCount] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  const [playerRow, setPlayerRow] = useState(2); // 0..4
  const [playerCol, setPlayerCol] = useState(50); // 10..90%
  const [entities, setEntities] = useState([]);

  const rowRef = useRef(playerRow);
  rowRef.current = playerRow;
  const colRef = useRef(playerCol);
  colRef.current = playerCol;
  const bagsRef = useRef(bagCount);
  bagsRef.current = bagCount;
  const doneRef = useRef(false);
  const nextId = useRef(1);

  const finishCleanup = (wonOverride) => {
    if (doneRef.current) return;
    doneRef.current = true;
    const b = bagsRef.current;
    const won = wonOverride ?? b >= 5;
    const coins = b >= 10 ? 5000 : b >= 7 ? 3000 : b >= 5 ? 1500 : b * 150;
    onComplete({
      won,
      score: b * 20,
      coinsEarned: coins,
      summary: `Removed ${b} plastic trash bags from the Tárcoles River habitat!`
    });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setPlayerRow((r) => Math.max(0, r - 1));
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setPlayerRow((r) => Math.min(4, r + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setPlayerCol((c) => Math.max(10, c - 12));
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setPlayerCol((c) => Math.min(90, c + 12));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (doneRef.current) return;
      setTimeLeft((t) => {
        if (t <= 1) {
          finishCleanup();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const loop = setInterval(() => {
      if (doneRef.current) return;

      setEntities((prev) => {
        const moved = prev
          .map((en) => ({ ...en, x: en.x + en.vx }))
          .filter((en) => en.x > -12 && en.x < 112);

        const kept = [];
        for (const en of moved) {
          const sameRow = en.row === rowRef.current;
          const closeX = Math.abs(en.x - colRef.current) < 8;

          if (sameRow && closeX) {
            if (en.type === 'trash') {
              playSfx(36);
              const nextB = bagsRef.current + 1;
              setBagCount(nextB);
              if (nextB >= 12) {
                finishCleanup(true);
              }
              continue;
            } else {
              playSfx(37);
              setLives((lv) => {
                const n = lv - 1;
                if (n <= 0) {
                  finishCleanup(bagsRef.current >= 5);
                }
                return n;
              });
              continue;
            }
          }
          kept.push(en);
        }

        if (Math.random() < 0.42) {
          const isTrash = Math.random() < 0.58;
          const row = Math.floor(Math.random() * 5);
          const dir = row % 2 === 0 ? 1 : -1;
          kept.push({
            id: nextId.current++,
            row,
            x: dir === 1 ? -5 : 105,
            vx: dir * (2.2 + Math.random() * 1.4),
            type: isTrash ? 'trash' : 'croc'
          });
        }
        return kept;
      });
    }, 85);

    return () => clearInterval(loop);
  }, [playSfx]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDirectCollectTrash = (id) => {
    playSfx(36);
    setEntities((prev) => prev.filter((e) => e.id !== id));
    const nextB = bagCount + 1;
    setBagCount(nextB);
    if (nextB >= 12) {
      finishCleanup(true);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-gradient-to-b from-emerald-950 via-teal-800 to-cyan-900 text-white overflow-hidden select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/85 border-b border-emerald-400/40 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className={`text-lg ${i < lives ? 'opacity-100' : 'opacity-25'}`}>
                🛶
              </span>
            ))}
          </div>
          <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-200 font-display text-sm">
            ♻️ Trash Bags Cleaned: {bagCount} / 10 (Min 5 to pass)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {bagCount >= 5 && (
            <button
              onClick={() => finishCleanup(true)}
              className="px-3 py-1 rounded-xl bg-amber-400 text-slate-950 font-display text-xs shadow animate-pulse"
            >
              Finish Cleanup (+{bagCount >= 10 ? 5000 : bagCount >= 7 ? 3000 : 1500} coins) ★
            </button>
          )}
          <span className="px-3 py-1 rounded-xl bg-slate-900 border border-white/20 font-display text-sm">
            ⏱ {timeLeft}s
          </span>
        </div>
      </div>

      <div className="bg-black/45 text-center py-1 text-xs font-bold text-emerald-200">
        Move with Arrow Keys / WASD or Click Floating Trash Bags (🗑️) directly while dodging American Crocodiles (🐊)!
      </div>

      {/* 5 River Channels */}
      <div className="relative flex-1 flex flex-col justify-between py-2">
        {[0, 1, 2, 3, 4].map((rIdx) => (
          <div
            key={rIdx}
            onClick={() => setPlayerRow(rIdx)}
            className={`relative flex-1 border-b border-teal-400/25 flex items-center cursor-pointer ${
              playerRow === rIdx ? 'bg-white/10' : 'hover:bg-white/5'
            }`}
          >
            <span className="ml-3 text-[10px] font-bold text-teal-200/50">
              River Channel {rIdx + 1}
            </span>

            {playerRow === rIdx && (
              <div
                style={{ left: `${playerCol}%` }}
                className="absolute -translate-x-1/2 px-3 py-1 rounded-full bg-amber-400 text-slate-950 border-2 border-white shadow-xl flex items-center gap-1 z-20 transition-all duration-100"
              >
                <span>🛶</span>
                <span className="font-display text-xs">{character}</span>
              </div>
            )}

            {entities
              .filter((en) => en.row === rIdx)
              .map((en) => (
                <div
                  key={en.id}
                  style={{ left: `${en.x}%` }}
                  className="absolute -translate-x-1/2 z-10"
                >
                  {en.type === 'trash' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDirectCollectTrash(en.id);
                      }}
                      className="px-2.5 py-1 rounded-full bg-emerald-500/30 hover:bg-emerald-400 hover:text-slate-950 border-2 border-emerald-300 flex items-center gap-1 shadow-lg transition-transform hover:scale-125"
                    >
                      <img
                        src={assetUrl('sprites/basura.png')}
                        alt="Trash"
                        className="w-6 h-6 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span className="text-xs font-bold">🗑️ Clean</span>
                    </button>
                  ) : (
                    <div className="px-3 py-1 rounded-xl bg-rose-950/90 border-2 border-rose-400 flex items-center gap-1 shadow-lg pointer-events-none">
                      <span className="text-lg">🐊</span>
                      <span className="text-[10px] font-bold text-rose-200">Crocodile</span>
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
