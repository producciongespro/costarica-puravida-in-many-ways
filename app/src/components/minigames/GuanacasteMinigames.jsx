import React, { useState, useEffect, useRef } from 'react';
import { assetUrl } from '../../utils/assetUrl';
import { Compass, Camera, Waves, Sparkles, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * 1. GN_BarraHonda - Barra Honda Caverns Exploration (Guanacaste)
 * Explore the limestone caverns of Barra Honda National Park in Nicoya!
 * Dodge flying cave bats (GNBH_Bat01.png) and stalactites while collecting mineral coins to reach the exit!
 */
export function BarraHondaCavernsGame({ minigame, character, onComplete, playSfx }) {
  const [depthLane, setDepthLane] = useState(1); // 0, 1, 2
  const [progress, setProgress] = useState(0); // 0..100
  const [torches, setTorches] = useState(3);
  const [coins, setCoins] = useState(0);
  const [hazards, setHazards] = useState([]);

  const laneRef = useRef(depthLane);
  laneRef.current = depthLane;
  const coinsRef = useRef(coins);
  coinsRef.current = coins;
  const doneRef = useRef(false);
  const nextId = useRef(1);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setDepthLane((l) => Math.max(0, l - 1));
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setDepthLane((l) => Math.min(2, l + 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const loop = setInterval(() => {
      if (doneRef.current) return;

      setProgress((p) => {
        const next = p + 1.25;
        if (next >= 100 && !doneRef.current) {
          doneRef.current = true;
          onComplete({
            won: true,
            score: 100 + coinsRef.current * 15,
            coinsEarned: 1200 + coinsRef.current * 50,
            summary: `Explored the limestone formations of Barra Honda Caverns and collected ${coinsRef.current} mineral coins!`
          });
        }
        return Math.min(100, next);
      });

      setHazards((prev) => {
        const moved = prev.map((h) => ({ ...h, x: h.x - 4.1 })).filter((h) => h.x > -10);
        const kept = [];

        for (const h of moved) {
          if (h.x <= 22 && h.x >= 12 && h.lane === laneRef.current) {
            if (h.type === 'coin') {
              playSfx(36);
              setCoins((c) => c + 1);
            } else {
              playSfx(37);
              setTorches((t) => {
                const nt = t - 1;
                if (nt <= 0 && !doneRef.current) {
                  doneRef.current = true;
                  onComplete({
                    won: false,
                    score: Math.round(progress),
                    coinsEarned: coinsRef.current * 50,
                    summary: 'Your cavern helmet light went out after hitting cave bats and stalactites! Switch cavern ledges to dodge them.'
                  });
                }
                return nt;
              });
            }
          } else {
            kept.push(h);
          }
        }

        if (Math.random() < 0.38) {
          const isCoin = Math.random() < 0.45;
          const isBat = Math.random() < 0.55;
          kept.push({
            id: nextId.current++,
            lane: Math.floor(Math.random() * 3),
            x: 103,
            type: isCoin ? 'coin' : isBat ? 'bat' : 'stalactite'
          });
        }
        return kept;
      });
    }, 80);

    return () => clearInterval(loop);
  }, [onComplete, playSfx, progress]);

  return (
    <div className="relative w-full h-full flex flex-col bg-gradient-to-b from-stone-950 via-amber-950 to-slate-950 text-white overflow-hidden select-none">
      {/* Top HUD */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/80 border-b border-amber-400/40 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className={`text-lg ${i < torches ? 'opacity-100' : 'opacity-25'}`}>
                🔦
              </span>
            ))}
          </div>
          <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 font-display text-xs">
            Cavern Coins: +{coins * 50}
          </span>
        </div>

        <div className="flex items-center gap-2 w-64">
          <Compass className="w-4 h-4 text-amber-300" />
          <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden border border-white/20">
            <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-300" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs font-display">{Math.round(progress)}%</span>
        </div>

        <span className="text-xs text-amber-200 font-bold">
          Switch Cavern Ledge: ↑ / ↓ or Click
        </span>
      </div>

      {/* 3 Limestone Cavern Tunnels */}
      <div className="relative flex-1 flex flex-col justify-between py-3">
        {[0, 1, 2].map((lIdx) => (
          <div
            key={lIdx}
            onClick={() => setDepthLane(lIdx)}
            className={`relative flex-1 mx-3 my-1 rounded-2xl border-y-2 border-amber-500/30 flex items-center cursor-pointer transition-colors ${
              depthLane === lIdx ? 'bg-amber-900/40 ring-2 ring-amber-400' : 'bg-black/40 hover:bg-white/5'
            }`}
          >
            <span className="ml-3 text-xs font-display text-amber-200/50">
              Cavern Ledge {lIdx + 1}
            </span>

            {depthLane === lIdx && (
              <div
                style={{ left: '16%' }}
                className="absolute -translate-x-1/2 px-3 py-1.5 rounded-2xl bg-amber-400 text-slate-950 border-2 border-white shadow-[0_0_20px_rgba(251,191,36,0.7)] flex items-center gap-1.5 z-20"
              >
                <span>🧗🔦</span>
                <span className="font-display text-xs">{character}</span>
              </div>
            )}

            {hazards
              .filter((h) => h.lane === lIdx)
              .map((h) => (
                <div
                  key={h.id}
                  style={{ left: `${h.x}%` }}
                  className="absolute -translate-x-1/2 z-10 pointer-events-none"
                >
                  {h.type === 'coin' ? (
                    <div className="w-9 h-9 rounded-full bg-amber-400/30 border-2 border-amber-300 flex items-center justify-center animate-bounce">
                      <img src={assetUrl('sprites/moneda.png')} alt="Coin" className="w-6 h-6 object-contain" />
                    </div>
                  ) : h.type === 'bat' ? (
                    <div className="px-3 py-1 rounded-xl bg-purple-950/90 border-2 border-purple-400 flex items-center gap-1.5 shadow-lg">
                      <img
                        src={assetUrl('sprites/GNBH_Bat01.png')}
                        alt="Bat"
                        className="w-7 h-7 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span className="text-xs font-bold text-purple-200">🦇 Cave Bat</span>
                    </div>
                  ) : (
                    <div className="px-3 py-1 rounded-xl bg-stone-800 border-2 border-amber-400 flex items-center gap-1 shadow-lg">
                      <span>🪨</span>
                      <span className="text-[10px] font-bold text-amber-200">Stalactite</span>
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
 * 2. GN_Buceo - Playas del Coco Scuba Diving Marine Photography (Guanacaste)
 * Photograph marine wildlife using sfx 40 (Camara V4.m4a)!
 * Scoring: Shark = +3 pts, Manta Ray = +2 pts, Tropical Reef Fish = +1 pt. Avoid Jellyfish (-2 pts)!
 * Target: 18 Photo Points to earn the Guanacaste Scuba Star!
 */
export function ScubaDivingGame({ minigame, onComplete, playSfx }) {
  const [score, setScore] = useState(0);
  const [photosCount, setPhotosCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [creatures, setCreatures] = useState([]);
  const [flashEffect, setFlashEffect] = useState(false);
  const [lastShot, setLastShot] = useState('Click swimming Sharks (+3), Manta Rays (+2), and Reef Fish (+1) to photograph them!');

  const TARGET_POINTS = 18;
  const nextId = useRef(1);
  const doneRef = useRef(false);

  const spawnCreature = () => {
    const r = Math.random();
    let species = {
      type: 'fish',
      name: 'Tropical Reef Fish',
      pts: 1,
      icon: '🐠',
      badge: '+1 pt (+100 coins)',
      color: 'border-sky-300 bg-sky-900/60'
    };
    if (r < 0.24) {
      species = {
        type: 'shark',
        name: 'White-Tip Reef Shark',
        pts: 3,
        icon: '🦈',
        badge: '+3 pts (+300 coins)',
        color: 'border-amber-300 bg-indigo-950/80'
      };
    } else if (r < 0.54) {
      species = {
        type: 'manta',
        name: 'Pacific Giant Manta Ray',
        pts: 2,
        icon: '🐋',
        badge: '+2 pts (+200 coins)',
        color: 'border-cyan-300 bg-cyan-950/80'
      };
    } else if (r > 0.85) {
      species = {
        type: 'jellyfish',
        name: 'Stinging Jellyfish (Avoid!)',
        pts: -2,
        icon: '🪼',
        badge: '-2 pts',
        color: 'border-rose-400 bg-rose-950/75'
      };
    }

    return {
      id: nextId.current++,
      ...species,
      x: 10 + Math.random() * 80,
      y: 16 + Math.random() * 68,
      createdAt: Date.now()
    };
  };

  useEffect(() => {
    setCreatures(Array.from({ length: 8 }, () => spawnCreature()));
    const spawner = setInterval(() => {
      setCreatures((prev) => {
        const now = Date.now();
        const active = prev.filter((c) => now - c.createdAt < 5500);
        if (active.length < 9) {
          return [...active, spawnCreature(), spawnCreature()];
        }
        return active;
      });
    }, 900);
    return () => clearInterval(spawner);
  }, []);

  useEffect(() => {
    if (doneRef.current) return;
    if (timeLeft <= 0) {
      doneRef.current = true;
      const won = score >= TARGET_POINTS;
      onComplete({
        won,
        score,
        coinsEarned: Math.max(500, score * 80),
        summary: `Captured ${photosCount} underwater photos scoring ${score} pts in Playas del Coco!`
      });
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [onComplete, photosCount, score, timeLeft]);

  const handlePhotograph = (c) => {
    if (doneRef.current) return;

    if (c.pts > 0) {
      playSfx(40); // Camara V4.m4a camera shutter sound!
      setFlashEffect(true);
      setTimeout(() => setFlashEffect(false), 180);

      const nextScore = score + c.pts;
      setScore(nextScore);
      setPhotosCount((p) => p + 1);
      setLastShot(`📸 Photographed ${c.name} (${c.badge})!`);

      if (nextScore >= TARGET_POINTS + 6 && !doneRef.current) {
        doneRef.current = true;
        setTimeout(() => {
          onComplete({
            won: true,
            score: nextScore,
            coinsEarned: 1500 + nextScore * 40,
            summary: `Master Underwater Photographer! Scored ${nextScore} pts in Playas del Coco!`
          });
        }, 400);
      }
    } else {
      playSfx(37);
      setScore((s) => Math.max(0, s + c.pts));
      setLastShot('⚡ Ouch! Stung by a Jellyfish (-2 pts)! Only photograph Sharks, Manta Rays, and Reef Fish.');
    }

    setCreatures((prev) => prev.filter((item) => item.id !== c.id).concat(spawnCreature()));
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-gradient-to-b from-cyan-600 via-blue-800 to-indigo-950 text-white overflow-hidden select-none">
      {/* Camera Flash Effect */}
      {flashEffect && <div className="pointer-events-none absolute inset-0 bg-white/70 z-40" />}

      {/* Top HUD */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/85 border-b border-cyan-400/40 z-10">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-xl bg-cyan-500/20 border border-cyan-300 text-cyan-200 font-display text-sm flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-cyan-300" />
            Photo Score: {score} / {TARGET_POINTS} pts
          </span>
          <span className="text-xs font-bold text-amber-300">
            🦈 Shark +3 | 🐋 Manta Ray +2 | 🐠 Reef Fish +1
          </span>
        </div>

        <div className="flex items-center gap-2">
          {score >= TARGET_POINTS && (
            <button
              onClick={() => {
                if (!doneRef.current) {
                  doneRef.current = true;
                  onComplete({
                    won: true,
                    score,
                    coinsEarned: 1500 + score * 40,
                    summary: `Scored ${score} pts photographing Guanacaste's marine biodiversity!`
                  });
                }
              }}
              className="px-3 py-1 rounded-xl bg-amber-400 text-slate-950 font-display text-xs shadow animate-pulse"
            >
              Finish Dive ★
            </button>
          )}
          <span className="px-3 py-1 rounded-xl bg-slate-900 border border-white/20 font-display text-sm">
            🫧 O₂: {timeLeft}s
          </span>
        </div>
      </div>

      <div className="bg-black/45 text-center py-1.5 text-xs font-bold text-cyan-100 border-b border-white/10">
        {lastShot}
      </div>

      {/* Underwater Reef Viewfinder */}
      <div className="relative flex-1 overflow-hidden cursor-crosshair">
        {/* Coral Reef Floor Decoration */}
        <div className="absolute bottom-2 inset-x-0 flex justify-around text-3xl opacity-65 pointer-events-none">
          <span>🪸</span><span>🌿</span><span>🐚</span><span>🪸</span><span>🪨</span><span>🪸</span><span>🌿</span>
        </div>

        {creatures.map((c) => (
          <button
            key={c.id}
            onClick={() => handlePhotograph(c)}
            style={{ left: `${c.x}%`, top: `${c.y}%` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 px-3.5 py-2 rounded-2xl border-2 ${c.color} shadow-2xl flex flex-col items-center hover:scale-125 active:scale-95 transition-transform z-20`}
          >
            <span className="text-3xl">{c.icon}</span>
            <span className="font-display text-xs text-white mt-0.5">{c.name}</span>
            <span className="text-[10px] font-extrabold text-amber-300">{c.badge}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * 3. GN_Surf_Tamarindo - Tamarindo / Santa Teresa Wave Surfing (Guanacaste)
 * Carve across 3 wave zones (Wave Crest, Barrel Tube, Wave Base) collecting surf coins
 * and turbo wave boosts while dodging sharp reef rocks!
 */
export function TamarindoSurfGame({ minigame, character, onComplete, playSfx }) {
  const [waveZone, setWaveZone] = useState(1); // 0=Crest, 1=Tube, 2=Base
  const [rideProgress, setRideProgress] = useState(0); // 0..100
  const [balance, setBalance] = useState(3);
  const [coins, setCoins] = useState(0);
  const [waveItems, setWaveItems] = useState([]);

  const zoneRef = useRef(waveZone);
  zoneRef.current = waveZone;
  const coinsRef = useRef(coins);
  coinsRef.current = coins;
  const doneRef = useRef(false);
  const nextId = useRef(1);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setWaveZone((z) => Math.max(0, z - 1));
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setWaveZone((z) => Math.min(2, z + 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const loop = setInterval(() => {
      if (doneRef.current) return;

      setRideProgress((p) => {
        const next = p + 1.3;
        if (next >= 100 && !doneRef.current) {
          doneRef.current = true;
          onComplete({
            won: true,
            score: 100 + coinsRef.current * 15,
            coinsEarned: 1200 + coinsRef.current * 50,
            summary: `Surfed the Tamarindo Pacific wave all the way to the beach with ${coinsRef.current} bonus coins!`
          });
        }
        return Math.min(100, next);
      });

      setWaveItems((prev) => {
        const moved = prev.map((it) => ({ ...it, x: it.x - 4.3 })).filter((it) => it.x > -10);
        const kept = [];

        for (const it of moved) {
          if (it.x <= 22 && it.x >= 12 && it.zone === zoneRef.current) {
            if (it.type === 'coin') {
              playSfx(36);
              setCoins((c) => c + 1);
            } else {
              playSfx(37);
              setBalance((b) => {
                const nb = b - 1;
                if (nb <= 0 && !doneRef.current) {
                  doneRef.current = true;
                  onComplete({
                    won: false,
                    score: Math.round(rideProgress),
                    coinsEarned: coinsRef.current * 50,
                    summary: 'Wiped out on the coral reef! Switch between Wave Crest, Barrel Tube, and Wave Base to dodge rocks.'
                  });
                }
                return nb;
              });
            }
          } else {
            kept.push(it);
          }
        }

        if (Math.random() < 0.38) {
          const isCoin = Math.random() < 0.48;
          kept.push({
            id: nextId.current++,
            zone: Math.floor(Math.random() * 3),
            x: 103,
            type: isCoin ? 'coin' : 'reef'
          });
        }
        return kept;
      });
    }, 80);

    return () => clearInterval(loop);
  }, [onComplete, playSfx, rideProgress]);

  const zoneNames = ['Wave Crest (Lip)', 'Inside the Barrel (Tube)', 'Wave Base (Pocket)'];

  return (
    <div className="relative w-full h-full flex flex-col bg-gradient-to-b from-sky-400 via-cyan-600 to-blue-900 text-white overflow-hidden select-none">
      {/* Top HUD */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/85 border-b border-cyan-300/40 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className={`text-lg ${i < balance ? 'opacity-100' : 'opacity-25'}`}>
                🏄
              </span>
            ))}
          </div>
          <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 font-display text-xs">
            Surf Coins: +{coins * 50}
          </span>
        </div>

        <div className="flex items-center gap-2 w-64">
          <Waves className="w-4 h-4 text-cyan-300" />
          <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden border border-white/20">
            <div className="h-full bg-gradient-to-r from-cyan-300 to-amber-300" style={{ width: `${rideProgress}%` }} />
          </div>
          <span className="text-xs font-display">{Math.round(rideProgress)}%</span>
        </div>

        <span className="text-xs text-cyan-200 font-bold">
          Carve Wave: ↑ / ↓ or Click Zone
        </span>
      </div>

      {/* 3 Pacific Wave Zones */}
      <div className="relative flex-1 flex flex-col justify-between py-3">
        {[0, 1, 2].map((zIdx) => (
          <div
            key={zIdx}
            onClick={() => setWaveZone(zIdx)}
            className={`relative flex-1 mx-3 my-1 rounded-2xl border-y-2 border-cyan-200/40 flex items-center cursor-pointer transition-colors ${
              waveZone === zIdx ? 'bg-white/20 ring-2 ring-amber-300' : 'bg-cyan-950/30 hover:bg-white/10'
            }`}
          >
            <span className="ml-4 text-xs font-display text-cyan-100/75">
              🌊 {zoneNames[zIdx]}
            </span>

            {waveZone === zIdx && (
              <div
                style={{ left: '16%' }}
                className="absolute -translate-x-1/2 px-3.5 py-1.5 rounded-2xl bg-amber-400 text-slate-950 border-2 border-white shadow-xl flex items-center gap-1.5 z-20"
              >
                <span className="text-xl">🏄</span>
                <span className="font-display text-xs">{character}</span>
              </div>
            )}

            {waveItems
              .filter((it) => it.zone === zIdx)
              .map((it) => (
                <div
                  key={it.id}
                  style={{ left: `${it.x}%` }}
                  className="absolute -translate-x-1/2 z-10 pointer-events-none"
                >
                  {it.type === 'coin' ? (
                    <div className="w-9 h-9 rounded-full bg-amber-400/30 border-2 border-amber-300 flex items-center justify-center animate-bounce">
                      <img src={assetUrl('sprites/moneda.png')} alt="Coin" className="w-6 h-6 object-contain" />
                    </div>
                  ) : (
                    <div className="px-3 py-1 rounded-xl bg-slate-900/90 border-2 border-rose-400 flex items-center gap-1 shadow-lg">
                      <span>🪨</span>
                      <span className="text-[10px] font-bold text-rose-200">Reef Rock</span>
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
