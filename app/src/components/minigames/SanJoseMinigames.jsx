import React, { useState, useEffect, useRef, useCallback } from 'react';
import { assetUrl } from '../../utils/assetUrl';
import { Coffee, Compass, Waves, Volume2, CheckCircle2, AlertTriangle, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

/**
 * 1. SJ_FincaCafetalera - Coffee Farming (San José)
 * Collect ripe red (+10) and yellow (+5) coffee cherries while avoiding green/black (-5) cherries.
 * Basket limit: 15 cherries. Must empty into the Large Receiver (Recibidor) at the bottom/side!
 * Time limit: 90s (fast-paced) or reach 120 points to win the star piece.
 */
export function CoffeeFarmingGame({ minigame, character, onComplete, playSfx, playVoiceover }) {
  const [timeLeft, setTimeLeft] = useState(90);
  const [deliveredScore, setDeliveredScore] = useState(0);
  const [basketCount, setBasketCount] = useState(0);
  const [basketPoints, setBasketPoints] = useState(0);
  const [cherries, setCherries] = useState([]);
  const [feedback, setFeedback] = useState('Click or tap RIPE RED (+10) & YELLOW (+5) coffee cherries! Avoid GREEN/BLACK (-5)!');
  const [basketWarning, setBasketWarning] = useState(false);
  const [deliverAnim, setDeliverAnim] = useState(false);

  const MAX_BASKET = 12;
  const TARGET_SCORE = 100;
  const nextIdRef = useRef(1);

  // Spawn coffee cherries across the coffee bushes
  const spawnCherry = useCallback(() => {
    const rand = Math.random();
    let type = 'red';
    let points = 10;
    let sprite = 'sprites/Tilemap_cafetal_32x32 V2_51.png';
    let label = 'Ripe Red (+10)';

    if (rand < 0.48) {
      type = 'red';
      points = 10;
      sprite = 'sprites/Tilemap_cafetal_32x32 V2_51.png';
      label = 'Ripe Red (+10)';
    } else if (rand < 0.72) {
      type = 'yellow';
      points = 5;
      sprite = 'sprites/Tilemap_cafetal_32x32 V2_57.png';
      label = 'Semi-Ripe Yellow (+5)';
    } else if (rand < 0.88) {
      type = 'green';
      points = -5;
      sprite = 'sprites/Tilemap_cafetal_32x32 V2_64.png';
      label = 'Unripe Green (-5)';
    } else {
      type = 'black';
      points = -5;
      sprite = 'sprites/Tilemap_cafetal_32x32 V2_65.png';
      label = 'Overripe Black (-5)';
    }

    const id = nextIdRef.current++;
    return {
      id,
      type,
      points,
      sprite,
      label,
      x: 8 + Math.random() * 82,
      y: 12 + Math.random() * 68,
      scale: 0.9 + Math.random() * 0.25,
      createdAt: Date.now()
    };
  }, []);

  useEffect(() => {
    const initial = Array.from({ length: 14 }, () => spawnCherry());
    setCherries(initial);

    const spawnTimer = setInterval(() => {
      setCherries((prev) => {
        const now = Date.now();
        const filtered = prev.filter((c) => now - c.createdAt < 7500);
        if (filtered.length < 16) {
          return [...filtered, spawnCherry(), spawnCherry()];
        }
        return filtered;
      });
    }, 950);

    return () => clearInterval(spawnTimer);
  }, [spawnCherry]);

  useEffect(() => {
    if (timeLeft <= 0) {
      const totalScore = deliveredScore + Math.max(0, basketPoints);
      const won = totalScore >= TARGET_SCORE;
      const coins = Math.max(250, totalScore * 12);
      onComplete({
        won,
        score: totalScore,
        coinsEarned: coins,
        summary: won
          ? `Harvested ${totalScore} pts of high-altitude Tarrazú coffee cherries!`
          : `You harvested ${totalScore} pts (Goal: ${TARGET_SCORE} pts). Remember to empty your basket at the Receiver!`
      });
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, deliveredScore, basketPoints, onComplete]);

  const handlePickCherry = (cherry) => {
    if (basketCount >= MAX_BASKET && cherry.points > 0) {
      setBasketWarning(true);
      playSfx(37);
      setFeedback('Your basket is full! Click the Big Coffee Receiver (Recibidor) to deliver your harvest!');
      return;
    }

    // Play coffee pick sound (sfx 44 = coger_cafe.m4a)
    playSfx(44);
    setCherries((prev) => prev.filter((c) => c.id !== cherry.id).concat(spawnCherry()));

    if (cherry.points > 0) {
      const nextCount = basketCount + 1;
      setBasketCount(nextCount);
      setBasketPoints((p) => p + cherry.points);
      setFeedback(`Picked ${cherry.label}! (${nextCount}/${MAX_BASKET} in basket)`);
      if (nextCount >= MAX_BASKET) {
        setBasketWarning(true);
        setFeedback('Your basket is full! Deliver your cherries to the Big Receiver on the right!');
      }
    } else {
      setBasketPoints((p) => Math.max(0, p + cherry.points));
      setFeedback(`Oops! Picked ${cherry.label}! Only harvest ripe red or yellow cherries!`);
    }
  };

  const handleDeliverBasket = () => {
    if (basketCount === 0 && basketPoints === 0) {
      setFeedback('Your basket is empty! Pick ripe red (+10) and yellow (+5) coffee cherries first.');
      return;
    }
    playSfx(36);
    const newTotal = deliveredScore + basketPoints;
    setDeliveredScore(newTotal);
    setBasketCount(0);
    setBasketPoints(0);
    setBasketWarning(false);
    setDeliverAnim(true);
    setTimeout(() => setDeliverAnim(false), 600);
    setFeedback(`Delivered ${basketPoints} pts to the Recibidor! Total Score: ${newTotal} / ${TARGET_SCORE}`);

    if (newTotal >= TARGET_SCORE + 60) {
      // Early mastery bonus option or keep collecting
    }
  };

  const handleFinishEarly = () => {
    if (deliveredScore >= TARGET_SCORE) {
      const totalScore = deliveredScore + Math.max(0, basketPoints);
      onComplete({
        won: true,
        score: totalScore,
        coinsEarned: totalScore * 12 + timeLeft * 10,
        summary: `Master Coffee Harvester! Delivered ${totalScore} pts with ${timeLeft}s remaining!`
      });
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-gradient-to-b from-[#1f4d24] via-[#28662b] to-[#1a3f1d] select-none overflow-hidden">
      {/* Top Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[#163018]/90 border-b-2 border-[#facc15]/50 text-white z-10">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/20 border border-amber-400 px-3 py-1 rounded-xl flex items-center gap-2">
            <Coffee className="w-5 h-5 text-amber-300" />
            <span className="font-display text-sm">
              Delivered: <strong className="text-amber-300 text-base">{deliveredScore}</strong> / {TARGET_SCORE} pts
            </span>
          </div>

          <div
            className={`px-3 py-1 rounded-xl border flex items-center gap-2 transition-all ${
              basketWarning
                ? 'bg-red-600/90 border-white animate-bounce text-white'
                : 'bg-emerald-900/80 border-emerald-400 text-emerald-100'
            }`}
          >
            <img src={assetUrl('sprites/Tilemap_cafetal_32x32 V2_44.png')} alt="Basket" className="w-6 h-6 object-contain" />
            <span className="font-bold text-xs">
              Basket: {basketCount}/{MAX_BASKET} ({basketPoints >= 0 ? `+${basketPoints}` : basketPoints} pts)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {deliveredScore >= TARGET_SCORE && (
            <button
              onClick={handleFinishEarly}
              className="px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display text-xs shadow-lg animate-pulse"
            >
              Claim Star Now! ★
            </button>
          )}
          <div className={`px-3 py-1 rounded-xl font-display text-sm border ${timeLeft <= 15 ? 'bg-red-600 border-white animate-pulse' : 'bg-slate-900/80 border-white/30'}`}>
            ⏱ {timeLeft}s
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      <div className="bg-black/50 text-center py-1.5 px-4 text-xs font-bold text-amber-200 border-b border-white/10">
        {feedback}
      </div>

      {/* Main Play Area: Coffee Plantation + Receiver Station */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Coffee Bushes Field */}
        <div className="relative flex-1 h-full overflow-hidden">
          {/* Decorative coffee bush foliage */}
          <img
            src={assetUrl('sprites/02-CoffeeFarm.png')}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-85 pointer-events-none"
          />

          {/* Legend overlay bottom-left */}
          <div className="absolute bottom-2 left-2 bg-slate-950/85 backdrop-blur-sm border border-white/20 rounded-xl p-2 flex items-center gap-3 text-[11px] text-white z-10">
            <span className="flex items-center gap-1 text-red-300 font-bold">
              <img src={assetUrl('sprites/Tilemap_cafetal_32x32 V2_51.png')} alt="Red" className="w-4 h-4 object-contain" /> +10
            </span>
            <span className="flex items-center gap-1 text-amber-300 font-bold">
              <img src={assetUrl('sprites/Tilemap_cafetal_32x32 V2_57.png')} alt="Yellow" className="w-4 h-4 object-contain" /> +5
            </span>
            <span className="flex items-center gap-1 text-emerald-300 font-bold">
              <img src={assetUrl('sprites/Tilemap_cafetal_32x32 V2_64.png')} alt="Green" className="w-4 h-4 object-contain" /> -5
            </span>
            <span className="flex items-center gap-1 text-slate-300 font-bold">
              <img src={assetUrl('sprites/Tilemap_cafetal_32x32 V2_65.png')} alt="Black" className="w-4 h-4 object-contain" /> -5
            </span>
          </div>

          {/* Interactive Coffee Cherries */}
          {cherries.map((cherry) => (
            <button
              key={cherry.id}
              onClick={() => handlePickCherry(cherry)}
              style={{
                left: `${cherry.x}%`,
                top: `${cherry.y}%`,
                transform: `translate(-50%, -50%) scale(${cherry.scale})`
              }}
              className="absolute group p-1.5 rounded-full hover:scale-125 active:scale-90 transition-transform focus:outline-none z-10"
              title={cherry.label}
            >
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg border-2 ${
                  cherry.type === 'red'
                    ? 'bg-red-900/40 border-red-300/80 hover:border-white'
                    : cherry.type === 'yellow'
                    ? 'bg-amber-900/40 border-amber-300/80 hover:border-white'
                    : 'bg-slate-950/50 border-slate-400/50'
                }`}
              >
                <img
                  src={assetUrl(cherry.sprite)}
                  alt={cherry.type}
                  className="w-8 h-8 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                />
              </div>
            </button>
          ))}
        </div>

        {/* Right Side: Coffee Receiver Station (Recibidor) */}
        <div className="w-52 bg-slate-950/80 border-l-2 border-amber-400/40 p-3 flex flex-col items-center justify-between z-10">
          <div className="text-center">
            <span className="text-[11px] uppercase tracking-wider text-amber-300 font-bold block">
              Coffee Receiver
            </span>
            <h4 className="font-display text-sm text-white">Recibidor</h4>
            <p className="text-[11px] text-slate-300 mt-1">
              Click below to empty your basket before it fills up!
            </p>
          </div>

          {/* Interactive Receiver Button */}
          <button
            onClick={handleDeliverBasket}
            className={`relative w-full py-4 px-2 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${
              basketCount > 0
                ? 'bg-gradient-to-b from-amber-500/30 to-amber-700/40 border-amber-300 hover:scale-105 shadow-xl cursor-pointer'
                : 'bg-slate-900/60 border-white/15 opacity-75'
            } ${deliverAnim ? 'scale-110 ring-4 ring-amber-400' : ''}`}
          >
            <img
              src={assetUrl('sprites/Tilemap_cafetal_32x32 V2_18.png')}
              alt="Recibidor"
              className="w-24 h-24 object-contain drop-shadow-lg"
            />
            <span className="mt-2 px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-display text-xs shadow">
              Empty Basket ({basketPoints >= 0 ? `+${basketPoints}` : basketPoints} pts)
            </span>
          </button>

          {/* Current Harvester Basket Preview */}
          <div className="w-full bg-slate-900/90 rounded-xl p-2.5 border border-white/10 text-center">
            <img
              src={assetUrl('sprites/Tilemap_cafetal_32x32 V2_44.png')}
              alt="Player Basket"
              className="w-14 h-14 mx-auto object-contain"
            />
            <div className="text-xs font-bold text-white mt-1">
              {character}&apos;s Chuspa: {basketCount}/{MAX_BASKET}
            </div>
            {basketWarning && (
              <div className="text-[11px] text-red-400 font-extrabold mt-0.5 animate-pulse">
                Your basket is full !
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 2. SJ_Museo_Oro - Pre-Columbian Gold Museum (San José)
 * Explore the 4 exhibition rooms beneath the Plaza de la Cultura with guide Maricela,
 * listen to the real English audio descriptions of Pre-Columbian artifacts, collect museum coins,
 * and answer the curator's cultural verification questions!
 */
export function GoldMuseumGame({ minigame, onComplete, playSfx, playVoiceover }) {
  const rooms = [
    {
      id: 0,
      title: 'Room 1: Entrance & History of the Museum',
      npc: 'Maricela (Museum Guide)',
      portrait: 'sprites/female01_0.png',
      artifactSprite: 'sprites/OroRotulo.png',
      audio: 'audio/MASTER MUSEO ORO TICO4NPC 002.m4a',
      dialogue:
        'First let me tell you a little bit about our history. The Pre-Columbian Gold Museum is located inside a subterranean building underneath the "Plaza de la Cultura", and is owned by the Banco Central de Costa Rica.',
      extraAudio: 'audio/MASTER MUSEO ORO TICO4NPC 006.m4a',
      extraText:
        'Here are preserved more than 1,600 artifacts of pre-Columbian gold dating from 500 AD to 1500 AD!',
      question: 'Where is the Pre-Columbian Gold Museum located and who owns it?',
      options: [
        { text: 'Underneath the Plaza de la Cultura, owned by the Banco Central de Costa Rica', correct: true },
        { text: 'On top of Irazú Volcano, owned by the National Theatre', correct: false },
        { text: 'Inside Manuel Antonio Park on the Pacific coast', correct: false }
      ]
    },
    {
      id: 1,
      title: 'Room 2: Metallurgy & Animal Symbolism',
      npc: 'Indigenous Goldsmith',
      portrait: 'sprites/male01_6.png',
      artifactSprite: 'sprites/Objetos para integrar en UNITY 1_1.png',
      audio: 'audio/MASTER MUSEO ORO TICO3NPC 001.m4a',
      dialogue:
        'Look at that frog-shaped gold badge! In Pre-Columbian Costa Rican culture, each animal symbol — such as frogs, eagles, jaguars, and alligators — had a sacred spiritual and social meaning.',
      extraAudio: 'audio/MASTER MUSEO ORO TICO1NPC 001.m4a',
      extraText:
        'Gold pieces were worn by shamans and caciques (chiefs) as emblems of rank, cosmology, and harmony with nature.',
      question: 'What did animal-shaped gold badges (like the golden frog) represent in Pre-Columbian culture?',
      options: [
        { text: 'Sacred spiritual meanings, cosmology, and social rank', correct: true },
        { text: 'Modern sports trophies from Europe', correct: false },
        { text: 'Simple kitchen utensils for cooking soup', correct: false }
      ]
    },
    {
      id: 2,
      title: 'Room 3: El Guerrero & Chamanismo Gallery',
      npc: 'Museum Curator',
      portrait: 'sprites/Objetos para integrar en UNITY 1_11.png',
      artifactSprite: 'sprites/Objetos para integrar en UNITY 1_12.png',
      audio: 'audio/MASTER MUSEO ORO TICO2NPC 001 V3.m4a',
      dialogue:
        'This gallery showcases life-size Pre-Columbian gold warriors ("El Guerrero") and intricate breastplates (pectorales) crafted between 500 AD and 1500 AD.',
      extraAudio: 'audio/MASTER MUSEO ORO TICO2NPC 003.m4a',
      extraText:
        'And today these extraordinary craft works are guarded by the museums of the Central Bank for all visitors to admire.',
      question: 'Approximately how many Pre-Columbian gold artifacts are preserved in this museum?',
      options: [
        { text: 'More than 1,600 artifacts dating from 500 AD to 1500 AD', correct: true },
        { text: 'Only 5 artifacts from the 20th century', correct: false },
        { text: 'Around 50 bronze statues from Rome', correct: false }
      ]
    },
    {
      id: 3,
      title: 'Room 4: Numismatics & Costa Rican Currency ("La Chocosuela")',
      npc: 'Maricela (Museum Guide)',
      portrait: 'sprites/female01_0.png',
      artifactSprite: 'sprites/es-moneda.png',
      audio: 'audio/MASTER MUSEO ORO LOCUTOR 001.m4a',
      dialogue:
        'Welcome to the Numismatic Room! Here you can see the history of Costa Rican coins and bills, including the first coin of 1825 and coffee tokens ("boletos de café"). Have you completed your tour in the museum?',
      extraAudio: 'audio/MASTER MUSEO ORO LOCUTOR 002.m4a',
      extraText:
        'Complete this final room verification to earn your Gold Museum Star Piece and 1,500 coins!',
      question: 'Besides Pre-Columbian gold, what else is exhibited in the subterranean museum complex?',
      options: [
        { text: 'The Numismatic collection (history of Costa Rican coins, coffee tokens, and currency)', correct: true },
        { text: 'Live sharks and sea turtles', correct: false },
        { text: 'Space rockets and satellites', correct: false }
      ]
    }
  ];

  const [currentRoomIdx, setCurrentRoomIdx] = useState(0);
  const [completedRooms, setCompletedRooms] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [roomFeedback, setRoomFeedback] = useState(null);
  const [bonusCoinsFound, setBonusCoinsFound] = useState([false, false, false, false]);

  const room = rooms[currentRoomIdx];

  useEffect(() => {
    if (room?.audio) {
      playVoiceover(room.audio);
    }
  }, [currentRoomIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCollectBonusCoin = (idx) => {
    if (bonusCoinsFound[idx]) return;
    playSfx(36);
    setBonusCoinsFound((prev) => prev.map((v, i) => (i === idx ? true : v)));
  };

  const handleAnswer = (opt, idx) => {
    setSelectedOption(idx);
    if (opt.correct) {
      playSfx(36);
      setRoomFeedback({ ok: true, msg: 'Correct! Artifact verified in your Explorer Journal!' });
      if (!completedRooms.includes(room.id)) {
        const updated = [...completedRooms, room.id];
        setCompletedRooms(updated);
      }
    } else {
      playSfx(37);
      setRoomFeedback({ ok: false, msg: 'Listen carefully to the audio guide and try another option!' });
    }
  };

  const handleFinishTour = () => {
    const bonusCount = bonusCoinsFound.filter(Boolean).length;
    const totalCoins = 1200 + bonusCount * 150;
    onComplete({
      won: true,
      score: completedRooms.length * 25 + bonusCount * 10,
      coinsEarned: totalCoins,
      summary: `Completed all 4 galleries of the Pre-Columbian Gold Museum and found ${bonusCount}/4 numismatic coins!`
    });
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-gradient-to-br from-[#2a1f14] via-[#3d2c19] to-[#1c140c] text-white overflow-hidden select-none">
      {/* Top Gallery Navigation */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/60 border-b border-amber-400/40">
        <div className="flex items-center gap-2">
          {rooms.map((r, i) => {
            const done = completedRooms.includes(r.id);
            const active = i === currentRoomIdx;
            return (
              <button
                key={r.id}
                onClick={() => {
                  setCurrentRoomIdx(i);
                  setSelectedOption(null);
                  setRoomFeedback(null);
                }}
                className={`px-3 py-1 rounded-xl font-display text-xs flex items-center gap-1.5 border transition-all ${
                  active
                    ? 'bg-amber-400 text-slate-950 border-white shadow-lg scale-105'
                    : done
                    ? 'bg-emerald-700/80 text-white border-emerald-400'
                    : 'bg-slate-800/80 text-slate-300 border-white/15 hover:bg-slate-700'
                }`}
              >
                {done && <CheckCircle2 className="w-3.5 h-3.5" />}
                Gallery {i + 1}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-amber-300">
            Galleries Verified: {completedRooms.length}/4
          </span>
          {completedRooms.length === 4 && (
            <button
              onClick={handleFinishTour}
              className="px-4 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-display text-xs shadow-lg animate-bounce"
            >
              Finish Museum Tour ★
            </button>
          )}
        </div>
      </div>

      {/* Main Gallery View */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-y-auto">
        {/* Left: Guide & Exhibition Pedestal */}
        <div className="col-span-5 flex flex-col justify-between bg-black/45 border border-amber-400/30 rounded-2xl p-4 relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-bold">
                {room.npc}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => playVoiceover(room.audio)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow"
                  title="Listen to Primary Audio Guide"
                >
                  <Volume2 className="w-3.5 h-3.5" /> Audio 1
                </button>
                <button
                  onClick={() => playVoiceover(room.extraAudio)}
                  className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow"
                  title="Listen to Artifact Details"
                >
                  <Volume2 className="w-3.5 h-3.5" /> Audio 2
                </button>
              </div>
            </div>

            <h3 className="font-display text-base text-amber-300 mb-2">{room.title}</h3>
          </div>

          {/* Guide Portrait + Golden Artifact Display */}
          <div className="relative flex items-center justify-around py-3 my-1 bg-gradient-to-b from-amber-500/10 to-transparent rounded-xl border border-amber-300/20">
            <img
              src={assetUrl(room.portrait)}
              alt={room.npc}
              className="w-24 h-28 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]"
              onError={(e) => {
                e.currentTarget.src = assetUrl('sprites/female01_0.png');
              }}
            />

            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-amber-400/20 border-2 border-amber-300 flex items-center justify-center shadow-[0_0_25px_rgba(251,191,36,0.4)]">
                <img
                  src={assetUrl(room.artifactSprite)}
                  alt="Artifact"
                  className="w-16 h-16 object-contain"
                  onError={(e) => {
                    e.currentTarget.src = assetUrl('sprites/moneda.png');
                  }}
                />
              </div>
              <span className="text-[10px] text-amber-200 mt-1 font-bold uppercase tracking-wider">
                500 AD – 1500 AD
              </span>
            </div>

            {/* Collectible Numismatic Bonus Coin in each room */}
            {!bonusCoinsFound[currentRoomIdx] ? (
              <button
                onClick={() => handleCollectBonusCoin(currentRoomIdx)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-amber-400/30 border border-amber-300 hover:scale-125 transition-transform animate-bounce"
                title="Click to collect hidden Numismatic Token (+150 coins)!"
              >
                <img src={assetUrl('sprites/moneda.png')} alt="Bonus Coin" className="w-6 h-6 object-contain" />
              </button>
            ) : (
              <span className="absolute top-2 right-2 text-[10px] text-emerald-300 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-400/40">
                +150 Coin Found!
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-xs text-amber-100/90 leading-relaxed bg-black/40 p-2.5 rounded-xl border border-white/10">
            <p>“{room.dialogue}”</p>
            <p className="text-amber-300/90 italic">“{room.extraText}”</p>
          </div>
        </div>

        {/* Right: Cultural Verification Challenge */}
        <div className="col-span-7 flex flex-col justify-between bg-slate-900/80 border border-white/15 rounded-2xl p-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-sky-300">
                Curator&apos;s Gallery Verification ({currentRoomIdx + 1}/4)
              </span>
              {completedRooms.includes(room.id) && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                </span>
              )}
            </div>

            <h4 className="font-display text-base text-white mb-3 bg-slate-950/70 p-3 rounded-xl border border-white/10">
              {room.question}
            </h4>

            <div className="space-y-2.5">
              {room.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(opt, idx)}
                    className={`w-full text-left p-3 rounded-xl border-2 text-xs font-bold transition-all flex items-center justify-between ${
                      isSelected
                        ? opt.correct
                          ? 'bg-emerald-700/80 border-emerald-300 text-white'
                          : 'bg-red-800/80 border-red-300 text-white'
                        : 'bg-slate-800/90 border-white/15 hover:border-amber-300 text-slate-100'
                    }`}
                  >
                    <span>{opt.text}</span>
                    {isSelected && (
                      <span className="ml-2 text-sm">{opt.correct ? '✓' : '✗'}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback & Room Navigation */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
            <div className="text-xs font-bold">
              {roomFeedback ? (
                <span className={roomFeedback.ok ? 'text-emerald-300' : 'text-rose-300'}>
                  {roomFeedback.msg}
                </span>
              ) : (
                <span className="text-slate-400">
                  Listen to the English audio clips and answer to verify this gallery.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentRoomIdx < rooms.length - 1 ? (
                <button
                  onClick={() => {
                    setCurrentRoomIdx((i) => i + 1);
                    setSelectedOption(null);
                    setRoomFeedback(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-display text-xs shadow"
                >
                  Next Gallery →
                </button>
              ) : (
                <button
                  onClick={handleFinishTour}
                  disabled={completedRooms.length < 4}
                  className={`px-4 py-2 rounded-xl font-display text-xs shadow ${
                    completedRooms.length >= 4
                      ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 animate-pulse'
                      : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Complete Museum Tour ({completedRooms.length}/4)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 3. SJ_Rafting - Whitewater Rafting on the Reventazón / Pacuare River (San José)
 * Steer the raft/kayak across 5 river lanes dodging boulders and logs while collecting coins!
 * Use Up/Down or Left/Right arrows or click lanes directly.
 */
export function WhitewaterRaftingGame({ minigame, character, onComplete, playSfx }) {
  const [lane, setLane] = useState(2); // 0 to 4
  const [progress, setProgress] = useState(0); // 0 to 100%
  const [lives, setLives] = useState(3);
  const [coinsCollected, setCoinsCollected] = useState(0);
  const [items, setItems] = useState([]);
  const [hitFlash, setHitFlash] = useState(false);

  const laneRef = useRef(lane);
  laneRef.current = lane;
  const livesRef = useRef(lives);
  livesRef.current = lives;
  const coinsRef = useRef(coinsCollected);
  coinsRef.current = coinsCollected;
  const completedRef = useRef(false);
  const nextItemId = useRef(1);

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setLane((l) => Math.max(0, l - 1));
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.key === 'ArrowRight') {
        e.preventDefault();
        setLane((l) => Math.min(4, l + 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Main River Loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (completedRef.current) return;

      setProgress((p) => {
        const nextP = p + 1.15;
        if (nextP >= 100 && !completedRef.current) {
          completedRef.current = true;
          const totalCoins = 1000 + coinsRef.current * 50 + livesRef.current * 250;
          onComplete({
            won: true,
            score: 100 + coinsRef.current * 10,
            coinsEarned: totalCoins,
            summary: `Conquered the whitewater rapids! Collected ${coinsRef.current} river coins with ${livesRef.current} hulls intact!`
          });
        }
        return Math.min(100, nextP);
      });

      setItems((prev) => {
        const moved = prev
          .map((it) => ({ ...it, x: it.x - it.speed }))
          .filter((it) => it.x > -10);

        // Collision check at player x (~16%)
        const remaining = [];
        for (const it of moved) {
          if (!it.collected && it.x <= 22 && it.x >= 10 && it.lane === laneRef.current) {
            if (it.type === 'coin') {
              playSfx(36);
              setCoinsCollected((c) => c + 1);
            } else {
              playSfx(37);
              setHitFlash(true);
              setTimeout(() => setHitFlash(false), 350);
              setLives((lv) => {
                const nextLv = lv - 1;
                if (nextLv <= 0 && !completedRef.current) {
                  completedRef.current = true;
                  onComplete({
                    won: false,
                    score: Math.round(progress),
                    coinsEarned: coinsRef.current * 50,
                    summary: 'Your raft hit too many river boulders! Steer between the 5 lanes to dodge rocks.'
                  });
                }
                return nextLv;
              });
            }
          } else {
            remaining.push(it);
          }
        }

        // Spawn new obstacles/coins
        if (Math.random() < 0.38) {
          const isCoin = Math.random() < 0.42;
          remaining.push({
            id: nextItemId.current++,
            lane: Math.floor(Math.random() * 5),
            x: 102,
            speed: 3.4 + Math.random() * 1.4,
            type: isCoin ? 'coin' : Math.random() < 0.5 ? 'rock' : 'log',
            sprite: isCoin
              ? 'sprites/moneda.png'
              : Math.random() < 0.5
              ? 'sprites/Personajes principales_10.png'
              : 'sprites/Mushroom.png'
          });
        }

        return remaining;
      });
    }, 85);

    return () => clearInterval(interval);
  }, [onComplete, playSfx, progress]);

  return (
    <div className="relative w-full h-full flex flex-col bg-gradient-to-r from-sky-700 via-cyan-600 to-blue-700 overflow-hidden select-none">
      {/* Top River HUD */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/85 border-b-2 border-cyan-300/40 text-white z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <span
                key={i}
                className={`text-lg transition-transform ${i < lives ? 'text-red-400 scale-100' : 'text-slate-600 scale-75'}`}
              >
                ❤️
              </span>
            ))}
          </div>
          <div className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 font-display text-xs">
            River Coins: +{coinsCollected * 50}
          </div>
        </div>

        {/* River Progress Bar */}
        <div className="flex items-center gap-2 w-64">
          <Waves className="w-4 h-4 text-cyan-300 shrink-0" />
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-white/20">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-amber-300 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-display text-cyan-200">{Math.round(progress)}%</span>
        </div>

        <div className="text-xs text-cyan-200 font-bold">
          Use ↑ / ↓ Keys or Click Any River Lane
        </div>
      </div>

      {/* 5 River Rapids Lanes */}
      <div className={`relative flex-1 flex flex-col justify-between py-2 ${hitFlash ? 'bg-red-500/40' : ''}`}>
        {[0, 1, 2, 3, 4].map((laneIdx) => (
          <div
            key={laneIdx}
            onClick={() => setLane(laneIdx)}
            className={`relative flex-1 border-b border-cyan-300/25 flex items-center cursor-pointer transition-colors ${
              lane === laneIdx ? 'bg-white/10' : 'hover:bg-white/5'
            }`}
          >
            {/* Animated water foam streaks */}
            <div className="absolute inset-0 flex items-center justify-around opacity-25 pointer-events-none">
              <div className="w-16 h-1 bg-white rounded-full animate-pulse" />
              <div className="w-24 h-1 bg-cyan-100 rounded-full" />
              <div className="w-12 h-1 bg-white rounded-full" />
            </div>

            {/* Lane label on far left */}
            <span className="ml-2 text-[10px] font-bold text-cyan-100/50">Lane {laneIdx + 1}</span>

            {/* Player Kayak/Raft */}
            {lane === laneIdx && (
              <div
                style={{ left: '15%' }}
                className="absolute -translate-x-1/2 flex items-center justify-center transition-all duration-100 z-20"
              >
                <div className="relative px-3 py-1.5 rounded-full bg-amber-400 border-2 border-white shadow-[0_0_15px_rgba(251,191,36,0.9)] flex items-center gap-1.5">
                  <img
                    src={assetUrl(character === 'Lisa' ? 'sprites/Lisa_1.png' : 'sprites/Mike_1.png')}
                    alt={character}
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      e.currentTarget.src = assetUrl('sprites/bote down_0.png');
                    }}
                  />
                  <span className="font-display text-[10px] text-slate-950 uppercase">Raft</span>
                </div>
              </div>
            )}

            {/* Obstacles & Coins in this lane */}
            {items
              .filter((it) => it.lane === laneIdx)
              .map((it) => (
                <div
                  key={it.id}
                  style={{ left: `${it.x}%` }}
                  className="absolute -translate-x-1/2 flex items-center justify-center z-10 pointer-events-none"
                >
                  {it.type === 'coin' ? (
                    <div className="w-9 h-9 rounded-full bg-amber-400/30 border-2 border-amber-300 flex items-center justify-center animate-bounce shadow-lg">
                      <img src={assetUrl('sprites/moneda.png')} alt="Coin" className="w-6 h-6 object-contain" />
                    </div>
                  ) : (
                    <div className="w-12 h-11 rounded-xl bg-slate-900/75 border-2 border-rose-400 flex items-center justify-center shadow-lg">
                      <img
                        src={assetUrl(it.sprite)}
                        alt="Obstacle"
                        className="w-9 h-9 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span className="text-xs font-extrabold text-rose-300">🪨</span>
                    </div>
                  )}
                </div>
              ))}
          </div>
        ))}

        {/* On-Screen Touch/Click Up/Down Controls */}
        <div className="absolute right-4 bottom-3 flex flex-col gap-2 z-30">
          <button
            onClick={() => setLane((l) => Math.max(0, l - 1))}
            className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-amber-400 hover:text-slate-950 text-white border border-white/30 shadow-lg"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
          <button
            onClick={() => setLane((l) => Math.min(4, l + 1))}
            className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-amber-400 hover:text-slate-950 text-white border border-white/30 shadow-lg"
          >
            <ArrowDown className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
