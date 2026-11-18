import React, { useState, useEffect, useRef } from 'react';
import { assetUrl } from '../../utils/assetUrl';
import { Flower2, Volume2, MapPin, CheckCircle2, Bike, Sparkles, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * 1. HD_Entregar_Flores - Delivering Flowers in Heredia ("The City of Flowers")
 * Help Daniela Rose deliver 5 flower bouquets across Heredia's landmarks by listening
 * to the real English audio clues and choosing the matching destination on the town map!
 */
export function DeliveringFlowersGame({ minigame, character, onComplete, playSfx, playVoiceover }) {
  const orders = [
    {
      id: 0,
      bouquet: 'Bouquet #1: Tropical Orchids & Roses',
      audio: 'audio/OK 003 Heredia entrega de Flores, Maria 002.m4a',
      clueText:
        'Take this first flower bouquet and deliver it to the young man waiting right across the street from the Flower Shop!',
      replyAudio: 'audio/OK Heredia, Flores Shy guy 002.m4a',
      replyText: 'Customer: "Thank you very much! Now I am ready for my date!"',
      targetId: 'across_street'
    },
    {
      id: 1,
      bouquet: 'Bouquet #2: Red Carnations & Sunflowers',
      audio: 'audio/OK 005 Heredia flores, supermercado Daniela 001.m4a',
      clueText:
        'Good job! Take these flowers and deliver them to the Red House on the corner near the park.',
      replyAudio: 'audio/OK Heredia, Flores,, Supermarket owner 001 B.m4a',
      replyText: 'Customer: "Oh, what beautiful flowers! Thank you very much!"',
      targetId: 'red_corner_house'
    },
    {
      id: 2,
      bouquet: 'Bouquet #3: Hydrangeas of Santa Bárbara',
      audio: 'audio/OK Heredia, Flores, entrega Entrega Maria, Daniela 001.m4a',
      clueText:
        'Look at that lady across the street sitting on the Central Park bench waiting for her flowers!',
      replyAudio: 'audio/OK Heredia, Flores entrega Maria (Centro del parque) Maria 001.m4a',
      replyText: 'Lady on Bench: "Thank you very much for bringing me these gorgeous flowers!"',
      targetId: 'park_bench'
    },
    {
      id: 3,
      bouquet: 'Bouquet #4: Golden Heliconias near El Fortín',
      audio: 'audio/OK Heredia, Flores, entrega chica corriendo Daniela 001.m4a',
      clueText:
        'Deliver this bouquet to the colonial house next to the Bakery two blocks north near El Fortín tower.',
      replyAudio: 'audio/OK Heredia, Flores, Chica corredora 001.m4a',
      replyText: 'Neighbor: "Thanks a lot! My mother will love these flowers!"',
      targetId: 'bakery_house'
    },
    {
      id: 4,
      bouquet: 'Bouquet #5: Royal Guaria Morada Arrangement',
      audio: 'audio/OK Heredia, Flores, Entrega admirador, Daniela 001.m4a',
      clueText:
        'This is the last delivery! Take these flowers to the school teacher waiting near the Immaculada Concepción Parish Church.',
      replyAudio: 'audio/OK Heredia, Flores, Entrega admirador, Daniela 003.m4a',
      replyText: 'Daniela Rose: "You delivered all the flowers on time! Thank you so much for your help!"',
      targetId: 'church_school'
    }
  ];

  const locations = [
    {
      id: 'across_street',
      name: 'Across the Street (Flower Shop Corner)',
      x: 22,
      y: 68,
      icon: '🧑',
      desc: 'Young man waiting across from Daniela Rose’s shop'
    },
    {
      id: 'red_corner_house',
      name: 'Red House on the Corner',
      x: 76,
      y: 66,
      icon: '🏠',
      desc: 'Bright red corner house with adobe roof'
    },
    {
      id: 'park_bench',
      name: 'Central Park Bench (Parque Nicolás Ulloa)',
      x: 50,
      y: 48,
      icon: '🪑',
      desc: 'Lady sitting on the bench by the park fountain'
    },
    {
      id: 'bakery_house',
      name: 'House Next to the Bakery (Near El Fortín)',
      x: 26,
      y: 25,
      icon: '🥖',
      desc: 'Two blocks north beside the traditional bakery'
    },
    {
      id: 'church_school',
      name: 'School Teacher Near the Parish Church',
      x: 75,
      y: 24,
      icon: '⛪',
      desc: 'Historic stone church & school plaza'
    }
  ];

  const [step, setStep] = useState(0);
  const [deliveredIds, setDeliveredIds] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [statusMsg, setStatusMsg] = useState(
    'Listen to Daniela Rose’s English directions and click the matching destination on the Heredia map!'
  );

  const currentOrder = orders[step];

  useEffect(() => {
    if (currentOrder?.audio) {
      playVoiceover(currentOrder.audio);
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectLocation = (loc) => {
    if (deliveredIds.includes(loc.id)) return;

    if (loc.id === currentOrder.targetId) {
      playSfx(36);
      if (currentOrder.replyAudio) {
        playVoiceover(currentOrder.replyAudio);
      }
      const nextDelivered = [...deliveredIds, loc.id];
      setDeliveredIds(nextDelivered);
      setStatusMsg(currentOrder.replyText);

      if (nextDelivered.length === orders.length) {
        setTimeout(() => {
          const coins = Math.max(800, 1500 - mistakes * 150);
          onComplete({
            won: true,
            score: 100 - mistakes * 10,
            coinsEarned: coins,
            summary: `Delivered all 5 flower bouquets across Heredia ("The City of Flowers") with ${mistakes} wrong turns!`
          });
        }, 1200);
      } else {
        setTimeout(() => {
          setStep((s) => s + 1);
        }, 1100);
      }
    } else {
      playSfx(37);
      setMistakes((m) => m + 1);
      setStatusMsg(
        `That's "${loc.name}". Re-read or listen carefully to Daniela's clue for ${currentOrder.bouquet}!`
      );
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-gradient-to-b from-emerald-900 via-teal-900 to-slate-900 text-white overflow-hidden select-none">
      {/* Top HUD */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/85 border-b border-pink-400/40">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-xl bg-pink-500/20 border border-pink-400 text-pink-200 font-display text-sm flex items-center gap-1.5">
            <Flower2 className="w-4 h-4 text-pink-300" />
            Deliveries: {deliveredIds.length} / 5
          </span>
          <span className="text-xs text-slate-300 font-bold">
            Current Order: <strong className="text-amber-300">{currentOrder?.bouquet}</strong>
          </span>
        </div>

        <button
          onClick={() => currentOrder?.audio && playVoiceover(currentOrder.audio)}
          className="px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display text-xs flex items-center gap-1.5 shadow"
        >
          <Volume2 className="w-4 h-4" /> Replay Voice Clue
        </button>
      </div>

      {/* Main Content: Daniela's Flower Shop Order + Heredia Town Map */}
      <div className="flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* Left Column: Daniela Rose & Order Card */}
        <div className="col-span-4 bg-slate-950/75 border border-pink-400/30 rounded-2xl p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <img
                src={assetUrl('sprites/Floristeria Daniela Rose.png')}
                alt="Daniela Rose"
                className="w-14 h-14 rounded-xl bg-pink-500/20 border border-pink-300 object-contain p-1"
                onError={(e) => {
                  e.currentTarget.src = assetUrl('sprites/flores.png');
                }}
              />
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-pink-300 block">
                  Heredia Flower Shop
                </span>
                <h3 className="font-display text-sm text-white">Daniela Rose</h3>
              </div>
            </div>

            <div className="bg-pink-950/40 border border-pink-400/30 rounded-xl p-3 text-xs text-pink-100 leading-relaxed">
              <p className="font-bold text-amber-300 mb-1">{currentOrder?.bouquet}</p>
              <p>“{currentOrder?.clueText}”</p>
            </div>
          </div>

          {/* Delivery Checklist */}
          <div className="space-y-1 my-2">
            {orders.map((o, idx) => {
              const done = deliveredIds.includes(o.targetId);
              const current = idx === step;
              return (
                <div
                  key={o.id}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-between border ${
                    done
                      ? 'bg-emerald-900/50 border-emerald-400/50 text-emerald-200'
                      : current
                      ? 'bg-amber-500/20 border-amber-300 text-amber-200'
                      : 'bg-slate-900/50 border-white/10 text-slate-400'
                  }`}
                >
                  <span className="truncate">{o.bouquet}</span>
                  <span>{done ? '✓' : current ? '💐' : '•'}</span>
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-amber-200 bg-black/50 p-2 rounded-xl border border-white/10">
            {statusMsg}
          </div>
        </div>

        {/* Right Column: Interactive Map of Heredia Streets & Landmarks */}
        <div className="col-span-8 relative bg-[#2d5a36] rounded-2xl border-2 border-amber-300/40 overflow-hidden shadow-inner">
          {/* Decorative Town Roads Grid */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Horizontal avenues */}
            <div className="absolute top-[25%] inset-x-0 h-10 bg-slate-700/80 border-y-2 border-dashed border-amber-200/40" />
            <div className="absolute top-[66%] inset-x-0 h-10 bg-slate-700/80 border-y-2 border-dashed border-amber-200/40" />
            {/* Vertical streets */}
            <div className="absolute left-[25%] inset-y-0 w-10 bg-slate-700/80 border-x-2 border-dashed border-amber-200/40" />
            <div className="absolute left-[75%] inset-y-0 w-10 bg-slate-700/80 border-x-2 border-dashed border-amber-200/40" />
            {/* Central Park Plaza */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-28 rounded-2xl bg-emerald-600/60 border-2 border-emerald-200/50 flex items-center justify-center">
              <span className="text-[10px] font-display text-emerald-100/80 uppercase tracking-widest">
                Parque Central de Heredia
              </span>
            </div>
          </div>

          {/* Daniela's Flower Shop Origin Marker */}
          <div
            style={{ left: '12%', top: '86%' }}
            className="absolute -translate-x-1/2 -translate-y-1/2 bg-pink-600 text-white px-2.5 py-1 rounded-xl border-2 border-white shadow-lg text-[10px] font-display flex items-center gap-1 z-10"
          >
            🌸 Flower Shop
          </div>

          {/* Interactive Delivery Destinations */}
          {locations.map((loc) => {
            const isDelivered = deliveredIds.includes(loc.id);
            return (
              <button
                key={loc.id}
                onClick={() => handleSelectLocation(loc)}
                style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 p-2.5 rounded-2xl border-2 transition-all flex flex-col items-center max-w-[165px] text-center shadow-xl z-20 ${
                  isDelivered
                    ? 'bg-emerald-700/95 border-emerald-200 text-white scale-95'
                    : 'bg-slate-950/90 hover:bg-amber-400 hover:text-slate-950 border-amber-300 text-white hover:scale-105 cursor-pointer'
                }`}
              >
                <div className="text-2xl mb-0.5">{isDelivered ? '💐✅' : loc.icon}</div>
                <span className="font-display text-xs leading-tight">{loc.name}</span>
                <span className="text-[10px] opacity-80 leading-tight mt-0.5">{loc.desc}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * 2. HD_Mascarada - Traditional Barva de Heredia Masquerade Run
 * Run through the festive streets of Barva during the traditional Mascarada!
 * Jump over street obstacles & firecrackers while keeping ahead of La Giganta and El Diablo!
 */
export function MascaradaGame({ minigame, character, onComplete, playSfx }) {
  const [distance, setDistance] = useState(0); // 0 to 100%
  const [playerY, setPlayerY] = useState(0); // 0 on ground, >0 jumping
  const [isJumping, setIsJumping] = useState(false);
  const [stamina, setStamina] = useState(3);
  const [coins, setCoins] = useState(0);
  const [obstacles, setObstacles] = useState([]);

  const yRef = useRef(0);
  const velRef = useRef(0);
  const staminaRef = useRef(3);
  staminaRef.current = stamina;
  const coinsRef = useRef(0);
  coinsRef.current = coins;
  const doneRef = useRef(false);
  const nextId = useRef(1);

  const triggerJump = () => {
    if (yRef.current <= 2) {
      velRef.current = 15;
      setIsJumping(true);
    }
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        triggerJump();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    const loop = setInterval(() => {
      if (doneRef.current) return;

      // Update jump physics
      if (yRef.current > 0 || velRef.current !== 0) {
        yRef.current = Math.max(0, yRef.current + velRef.current);
        velRef.current = yRef.current > 0 ? velRef.current - 2.1 : 0;
        setPlayerY(yRef.current);
        if (yRef.current === 0) setIsJumping(false);
      }

      // Advance distance
      setDistance((d) => {
        const next = d + 1.1;
        if (next >= 100 && !doneRef.current) {
          doneRef.current = true;
          onComplete({
            won: true,
            score: 100 + coinsRef.current * 10,
            coinsEarned: 1000 + coinsRef.current * 50,
            summary: `Danced and sprinted through the Barva Mascarada parade with ${coinsRef.current} bonus coins!`
          });
        }
        return Math.min(100, next);
      });

      // Move & spawn obstacles/coins
      setObstacles((prev) => {
        const moved = prev.map((o) => ({ ...o, x: o.x - 4.2 })).filter((o) => o.x > -10);
        const kept = [];

        for (const o of moved) {
          // Player is at x ~ 24%
          if (o.x <= 28 && o.x >= 18) {
            if (o.type === 'coin' && yRef.current >= 20) {
              playSfx(36);
              setCoins((c) => c + 1);
              continue;
            } else if (o.type === 'obstacle' && yRef.current < 24) {
              playSfx(37);
              setStamina((s) => {
                const ns = s - 1;
                if (ns <= 0 && !doneRef.current) {
                  doneRef.current = true;
                  onComplete({
                    won: false,
                    score: Math.round(distance),
                    coinsEarned: coinsRef.current * 50,
                    summary: 'La Giganta caught up with you! Jump over the street obstacles using SPACE, UP, or clicking JUMP.'
                  });
                }
                return ns;
              });
              continue;
            }
          }
          kept.push(o);
        }

        const lastX = kept.length > 0 ? Math.max(...kept.map((k) => k.x)) : 0;
        if (lastX < 72 && Math.random() < 0.35) {
          const isCoin = Math.random() < 0.45;
          kept.push({
            id: nextId.current++,
            x: 104,
            type: isCoin ? 'coin' : 'obstacle',
            label: isCoin ? 'Coin' : Math.random() < 0.5 ? 'Drum' : 'Barrier'
          });
        }
        return kept;
      });
    }, 65);

    return () => clearInterval(loop);
  }, [distance, onComplete, playSfx]);

  return (
    <div
      onClick={triggerJump}
      className="relative w-full h-full flex flex-col bg-gradient-to-b from-indigo-900 via-amber-800 to-stone-800 text-white overflow-hidden select-none cursor-pointer"
    >
      {/* Top Festive HUD */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/85 border-b border-amber-400/40 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className={`text-lg ${i < stamina ? 'opacity-100' : 'opacity-25'}`}>
                🎭
              </span>
            ))}
          </div>
          <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 font-display text-xs">
            Festival Coins: +{coins * 50}
          </span>
        </div>

        <div className="flex items-center gap-2 w-60">
          <span className="text-xs font-display text-amber-200">Plaza:</span>
          <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden border border-white/20">
            <div className="h-full bg-gradient-to-r from-pink-500 to-amber-300" style={{ width: `${distance}%` }} />
          </div>
          <span className="text-xs font-display">{Math.round(distance)}%</span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            triggerJump();
          }}
          className="px-4 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display text-xs shadow"
        >
          JUMP (Space / Click) ↑
        </button>
      </div>

      {/* Street Parade Scene */}
      <div className="relative flex-1 overflow-hidden">
        {/* Festive Bunting Flags */}
        <div className="absolute top-3 inset-x-0 flex justify-around text-2xl opacity-80 pointer-events-none">
          <span>🎊</span><span>🎺</span><span>🎭</span><span>🥁</span><span>🎊</span><span>🎶</span>
        </div>

        <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-1 rounded-full border border-amber-300/30 text-xs font-bold text-amber-200">
          Click anywhere or press SPACE / UP to jump over street drums & collect floating coins!
        </div>

        {/* Chasing Mascarada Cabezudos & La Giganta on the left */}
        <div
          style={{ left: `${6 + (3 - stamina) * 4}%`, bottom: '18%' }}
          className="absolute flex items-end gap-1 transition-all duration-300 z-10 pointer-events-none"
        >
          <img
            src={assetUrl('sprites/Giganta_anim_0.png')}
            alt="La Giganta"
            className="w-24 h-32 object-contain drop-shadow-[0_5px_12px_rgba(0,0,0,0.8)] animate-bounce"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <span className="px-2 py-0.5 rounded bg-rose-600 text-[10px] font-display shadow">
            La Giganta!
          </span>
        </div>

        {/* Player Runner */}
        <div
          style={{ left: '24%', bottom: `${18 + playerY}%` }}
          className="absolute -translate-x-1/2 flex flex-col items-center z-20 pointer-events-none"
        >
          <img
            src={assetUrl(character === 'Lisa' ? 'sprites/Lisa_1.png' : 'sprites/Mike_1.png')}
            alt={character}
            className={`w-16 h-20 object-contain drop-shadow-lg ${isJumping ? '-rotate-12' : ''}`}
          />
          <span className="text-[10px] font-display bg-amber-400 text-slate-950 px-2 rounded-full">
            {character}
          </span>
        </div>

        {/* Obstacles and Floating Coins */}
        {obstacles.map((o) => (
          <div
            key={o.id}
            style={{
              left: `${o.x}%`,
              bottom: o.type === 'coin' ? '44%' : '18%'
            }}
            className="absolute -translate-x-1/2 z-10 pointer-events-none"
          >
            {o.type === 'coin' ? (
              <div className="w-10 h-10 rounded-full bg-amber-400/30 border-2 border-amber-300 flex items-center justify-center animate-pulse shadow-lg">
                <img src={assetUrl('sprites/moneda.png')} alt="Coin" className="w-7 h-7 object-contain" />
              </div>
            ) : (
              <div className="px-3 py-2 rounded-xl bg-rose-800 border-2 border-amber-300 shadow-xl flex flex-col items-center">
                <span className="text-xl">🥁</span>
                <span className="text-[9px] font-bold text-amber-200 uppercase">{o.label}</span>
              </div>
            )}
          </div>
        ))}

        {/* Cobblestone Street Floor */}
        <div className="absolute bottom-0 inset-x-0 h-[18%] bg-gradient-to-b from-stone-700 to-stone-900 border-t-4 border-amber-400 flex items-center justify-around">
          <div className="w-16 h-1.5 bg-amber-300/40 rounded-full" />
          <div className="w-16 h-1.5 bg-amber-300/40 rounded-full" />
          <div className="w-16 h-1.5 bg-amber-300/40 rounded-full" />
          <div className="w-16 h-1.5 bg-amber-300/40 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * 3. HD_Mountainbike - Bosque de la Hoja Mountain Biking (Heredia)
 * Ride your mountain bike along the 3 cypress forest trails of Heredia,
 * jumping cliffs/rocks and collecting trail coins before the timer runs out!
 */
export function MountainBikeGame({ minigame, character, onComplete, playSfx }) {
  const [trail, setTrail] = useState(1); // 0, 1, 2
  const [distance, setDistance] = useState(0); // 0 to 100%
  const [coins, setCoins] = useState(0);
  const [energy, setEnergy] = useState(3);
  const [hazards, setHazards] = useState([]);

  const trailRef = useRef(trail);
  trailRef.current = trail;
  const coinsRef = useRef(coins);
  coinsRef.current = coins;
  const doneRef = useRef(false);
  const nextId = useRef(1);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setTrail((t) => Math.max(0, t - 1));
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setTrail((t) => Math.min(2, t + 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (doneRef.current) return;

      setDistance((d) => {
        const next = d + 1.25;
        if (next >= 100 && !doneRef.current) {
          doneRef.current = true;
          onComplete({
            won: true,
            score: 100 + coinsRef.current * 15,
            coinsEarned: 1100 + coinsRef.current * 50,
            summary: `Completed the Bosque de la Hoja Mountain Bike trail with ${coinsRef.current} trail coins!`
          });
        }
        return Math.min(100, next);
      });

      setHazards((prev) => {
        const moved = prev.map((h) => ({ ...h, x: h.x - 4.0 })).filter((h) => h.x > -10);
        const kept = [];

        for (const h of moved) {
          if (h.x <= 22 && h.x >= 12 && h.trail === trailRef.current) {
            if (h.type === 'coin') {
              playSfx(36);
              setCoins((c) => c + 1);
            } else {
              playSfx(37);
              setEnergy((en) => {
                const ne = en - 1;
                if (ne <= 0 && !doneRef.current) {
                  doneRef.current = true;
                  onComplete({
                    won: false,
                    score: Math.round(distance),
                    coinsEarned: coinsRef.current * 50,
                    summary: 'Crashed into too many mountain rocks! Switch trails with Up/Down or click a trail.'
                  });
                }
                return ne;
              });
            }
          } else {
            kept.push(h);
          }
        }

        if (Math.random() < 0.36) {
          const isCoin = Math.random() < 0.45;
          kept.push({
            id: nextId.current++,
            trail: Math.floor(Math.random() * 3),
            x: 102,
            type: isCoin ? 'coin' : 'rock'
          });
        }

        return kept;
      });
    }, 75);

    return () => clearInterval(timer);
  }, [distance, onComplete, playSfx]);

  return (
    <div className="relative w-full h-full flex flex-col bg-gradient-to-b from-emerald-950 via-green-900 to-amber-950 text-white overflow-hidden select-none">
      {/* Top HUD */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/85 border-b border-emerald-400/40 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className={`text-lg ${i < energy ? 'opacity-100' : 'opacity-25'}`}>
                🚵
              </span>
            ))}
          </div>
          <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 font-display text-xs">
            Trail Coins: +{coins * 50}
          </span>
        </div>

        <div className="flex items-center gap-2 w-64">
          <Bike className="w-4 h-4 text-emerald-300" />
          <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden border border-white/20">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-lime-300" style={{ width: `${distance}%` }} />
          </div>
          <span className="text-xs font-display">{Math.round(distance)}%</span>
        </div>

        <span className="text-xs text-emerald-200 font-bold">
          Switch Trails: ↑ / ↓ or Click Trail
        </span>
      </div>

      {/* Cypress Forest Backdrop + 3 Dirt Trails */}
      <div className="relative flex-1 flex flex-col justify-end py-3">
        <div className="px-4 pb-2 flex items-center justify-around text-3xl opacity-70 pointer-events-none">
          <span>🌲</span><span>🌲</span><span>⛰️</span><span>🌲</span><span>🌲</span><span>⛰️</span><span>🌲</span>
        </div>

        {[0, 1, 2].map((tIdx) => (
          <div
            key={tIdx}
            onClick={() => setTrail(tIdx)}
            className={`relative flex-1 my-1 mx-3 rounded-2xl border-y-2 border-amber-500/40 flex items-center cursor-pointer transition-colors ${
              trail === tIdx
                ? 'bg-amber-900/75 ring-2 ring-amber-300'
                : 'bg-amber-950/60 hover:bg-amber-900/50'
            }`}
          >
            <span className="ml-3 text-xs font-display text-amber-200/60">
              Cypress Trail {tIdx + 1}
            </span>

            {trail === tIdx && (
              <div
                style={{ left: '16%' }}
                className="absolute -translate-x-1/2 px-3 py-1.5 rounded-2xl bg-emerald-400 text-slate-950 border-2 border-white shadow-xl flex items-center gap-1.5 z-20"
              >
                <Bike className="w-6 h-6" />
                <span className="font-display text-xs">{character}</span>
              </div>
            )}

            {hazards
              .filter((h) => h.trail === tIdx)
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
                  ) : (
                    <div className="px-3 py-1.5 rounded-xl bg-stone-800 border-2 border-rose-400 shadow-lg flex items-center gap-1">
                      <span className="text-lg">🪨</span>
                      <span className="text-[10px] font-bold text-rose-200">Rock</span>
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
