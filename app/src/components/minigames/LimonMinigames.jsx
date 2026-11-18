import React, { useState, useEffect, useRef } from 'react';
import { assetUrl } from '../../utils/assetUrl';
import { Utensils, BookOpen, Volume2, CheckCircle2, Zap, ShieldAlert, Sparkles } from 'lucide-react';

/**
 * 1. Lm_Cocina - Caribbean Cuisine (Limón)
 * Uses the exact 5 Afro-Caribbean recipes and 34 pantry ingredients from minigames.json!
 */
export function CaribbeanCuisineGame({ minigame, onComplete, playSfx, playVoiceover }) {
  const recipeSystem = minigame?.gameData || minigame?.recipeSystem || {};
  const recipes = (recipeSystem.recipes || [
    {
      id: 0,
      name: 'Agua de Sapo',
      dishSprite: 'sprites/Recetas e ingredientes_1.png',
      requiredIngredients: ['Water', 'Brown cane sugar', 'Ginger', 'Lemon juice'],
      culturalDescription: 'Refreshing spiced ginger, lemon, and raw cane sugar drink from Limón.'
    },
    {
      id: 1,
      name: 'Caribbean Rice and Bean',
      dishSprite: 'sprites/Recetas e ingredientes_2.png',
      requiredIngredients: [
        'Red beans',
        'Water',
        'Garlic and onion',
        'Habanero pepper',
        'Thyme',
        'Bay leaf',
        'Olive oil',
        'Salt and pepper',
        'Coconut milk',
        'Uncooked rice'
      ],
      culturalDescription: 'Traditional Afro-Caribbean rice and red beans slow-cooked in fresh coconut milk and thyme.'
    }
  ]).map((r) => ({
    ...r,
    culturalDescription:
      r.culturalDescription ||
      (Array.isArray(r.preparationStepsEn) ? r.preparationStepsEn[0] : 'Authentic Afro-Caribbean recipe from Limón.')
  }));

  const rawPantry = recipeSystem.pantryIngredients || [];
  const goToLabelMap = {};
  recipes.forEach((r) => {
    const reqLabels = r.requiredIngredients || [];
    const reqGo = r.requiredGameObjectNames || [];
    reqGo.forEach((goName, i) => {
      if (reqLabels[i] && !goToLabelMap[goName]) {
        goToLabelMap[goName] = reqLabels[i];
      }
    });
  });

  const pantry = rawPantry.map((item) => {
    const mappedLabel =
      item.id === 'BrownCaneSugar_TapaDulce'
        ? 'Brown cane sugar'
        : goToLabelMap[item.gameObjectName] ||
          goToLabelMap[item.id] ||
          item.name ||
          item.displayNameEn ||
          item.id;
    return {
      ...item,
      name: mappedLabel,
      sprite: item.sprite || 'sprites/olla.png'
    };
  });

  const [selectedRecipeIdx, setSelectedRecipeIdx] = useState(3); // Start with Agua de Sapo or let player pick any of the 5!
  const [potIngredients, setPotIngredients] = useState([]);
  const [cookedRecipes, setCookedRecipes] = useState([]);
  const [showRecipeBook, setShowRecipeBook] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [feedback, setFeedback] = useState(
    'Study the Recipe Card, then add the exact ingredients into the Cooking Pot and click "Check and cook"!'
  );

  const activeRecipe = recipes[selectedRecipeIdx] || recipes[0];

  const handleToggleIngredient = (ingName) => {
    playSfx(44);
    setPotIngredients((prev) =>
      prev.includes(ingName) ? prev.filter((i) => i !== ingName) : [...prev, ingName]
    );
  };

  const handleUseHint = () => {
    playSfx(36);
    const missing = activeRecipe.requiredIngredients.filter((req) => !potIngredients.includes(req));
    const extra = potIngredients.filter((p) => !activeRecipe.requiredIngredients.includes(p));

    if (extra.length > 0) {
      setFeedback(`Chef Hint: Remove "${extra[0]}" from the pot — it doesn't belong in ${activeRecipe.name}!`);
    } else if (missing.length > 0) {
      setPotIngredients((prev) => [...prev, missing[0]]);
      setFeedback(`Chef Hint: Added "${missing[0]}" to your pot! (${missing.length - 1} more needed)`);
    } else {
      setFeedback(`Chef Hint: All required ingredients for ${activeRecipe.name} are in the pot! Click "Check and cook"!`);
    }
  };

  const handleCheckAndCook = () => {
    const req = activeRecipe.requiredIngredients;
    const missing = req.filter((r) => !potIngredients.includes(r));
    const extra = potIngredients.filter((p) => !req.includes(p));

    if (missing.length === 0 && extra.length === 0) {
      playSfx(36);
      const nextCooked = cookedRecipes.includes(activeRecipe.name)
        ? cookedRecipes
        : [...cookedRecipes, activeRecipe.name];
      setCookedRecipes(nextCooked);
      setFeedback(`Delicious! You cooked authentic ${activeRecipe.name}!`);

      if (nextCooked.length >= 2) {
        setTimeout(() => {
          onComplete({
            won: true,
            score: nextCooked.length * 100,
            coinsEarned: 2000,
            summary: `Mastered Limón's Afro-Caribbean Cuisine by cooking ${nextCooked.join(' & ')}!`
          });
        }, 700);
      } else {
        setFeedback(
          `Awesome! You cooked ${activeRecipe.name} (1/2 dishes)! Now select one more Caribbean recipe above to earn your Star Piece!`
        );
      }
    } else {
      playSfx(37);
      setFeedback(
        `Not quite ready: ${missing.length} missing ingredient(s) and ${extra.length} extra ingredient(s). Use "Chef Hint" or check the Recipe Card!`
      );
    }
  };

  const filteredPantry = pantry.filter((item) =>
    item.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="relative w-full h-full flex flex-col bg-gradient-to-br from-amber-950 via-stone-900 to-emerald-950 text-white overflow-hidden select-none">
      {/* Top Recipe Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-black/80 border-b border-amber-400/40">
        <div className="flex items-center gap-1.5 flex-wrap">
          {recipes.map((r, idx) => {
            const isDone = cookedRecipes.includes(r.name);
            const isSelected = idx === selectedRecipeIdx;
            return (
              <button
                key={r.id ?? idx}
                onClick={() => {
                  setSelectedRecipeIdx(idx);
                  setPotIngredients([]);
                  setFeedback(`Selected ${r.name}. Add its ${r.requiredIngredients.length} ingredients to the pot!`);
                }}
                className={`px-2.5 py-1 rounded-xl font-display text-xs flex items-center gap-1 border transition-all ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 border-white shadow scale-105'
                    : isDone
                    ? 'bg-emerald-700 text-white border-emerald-300'
                    : 'bg-slate-800 text-slate-200 border-white/15 hover:bg-slate-700'
                }`}
              >
                {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                {r.name} ({r.requiredIngredients.length})
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-display text-emerald-300">
            Dishes Cooked: {cookedRecipes.length} / 2
          </span>
          {cookedRecipes.length >= 1 && (
            <button
              onClick={() =>
                onComplete({
                  won: true,
                  score: cookedRecipes.length * 100,
                  coinsEarned: 2000,
                  summary: `Cooked authentic ${cookedRecipes.join(', ')} in the Limón Caribbean Kitchen!`
                })
              }
              className="px-3 py-1 rounded-xl bg-emerald-400 text-slate-950 font-display text-xs shadow animate-pulse"
            >
              Finish Kitchen ★
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      <div className="bg-black/50 px-4 py-1.5 text-xs font-bold text-amber-200 border-b border-white/10 flex items-center justify-between">
        <span>{feedback}</span>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowRecipeBook((b) => !b)}
            className="px-2.5 py-0.5 rounded-lg bg-sky-500 text-slate-950 font-display text-[11px] flex items-center gap-1"
          >
            <BookOpen className="w-3 h-3" /> {showRecipeBook ? 'Hide Recipe' : 'Show Recipe'}
          </button>
          <button
            onClick={handleUseHint}
            className="px-2.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-display text-[11px]"
          >
            💡 Chef Hint (+Auto Add 1)
          </button>
        </div>
      </div>

      {/* Kitchen Main Grid */}
      <div className="flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* Left: Active Recipe Card & Cooking Pot */}
        <div className="col-span-5 flex flex-col justify-between bg-slate-950/80 border border-amber-400/30 rounded-2xl p-3 overflow-y-auto">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <img
                src={assetUrl(activeRecipe.dishSprite)}
                alt={activeRecipe.name}
                className="w-16 h-16 rounded-xl bg-amber-500/20 border border-amber-300 object-contain p-1"
                onError={(e) => {
                  e.currentTarget.src = assetUrl('sprites/olla.png');
                }}
              />
              <div>
                <h3 className="font-display text-base text-amber-300">{activeRecipe.name}</h3>
                <p className="text-[11px] text-slate-300 leading-snug">
                  {activeRecipe.culturalDescription}
                </p>
              </div>
            </div>

            {showRecipeBook && (
              <div className="bg-amber-950/40 border border-amber-400/30 rounded-xl p-2.5 mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300 block mb-1">
                  Required Ingredients ({potIngredients.length}/{activeRecipe.requiredIngredients.length} in pot):
                </span>
                <div className="flex flex-wrap gap-1">
                  {activeRecipe.requiredIngredients.map((req) => {
                    const inPot = potIngredients.includes(req);
                    return (
                      <button
                        key={req}
                        onClick={() => handleToggleIngredient(req)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                          inPot
                            ? 'bg-emerald-600 text-white border-emerald-300'
                            : 'bg-slate-900 text-amber-200 border-amber-400/40 hover:bg-amber-400 hover:text-slate-950'
                        }`}
                      >
                        {inPot ? `✓ ${req}` : `+ ${req}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Cooking Pot */}
          <div className="bg-slate-900/90 border border-white/15 rounded-xl p-2.5 flex flex-col items-center">
            <img
              src={assetUrl('sprites/olla.png')}
              alt="Cooking Pot"
              className="w-16 h-14 object-contain"
            />
            <span className="text-xs font-display text-amber-200 mt-1">
              Cooking Pot ({potIngredients.length} items)
            </span>
            <div className="flex flex-wrap gap-1 justify-center my-1.5 max-h-16 overflow-y-auto">
              {potIngredients.length === 0 ? (
                <span className="text-[11px] text-slate-400 italic">
                  Click ingredients in the Pantry or Recipe Card to add them!
                </span>
              ) : (
                potIngredients.map((ing) => (
                  <button
                    key={ing}
                    onClick={() => handleToggleIngredient(ing)}
                    className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-300 text-[10px] font-bold text-amber-200 hover:bg-red-600 hover:text-white"
                    title="Click to remove from pot"
                  >
                    {ing} ✕
                  </button>
                ))
              )}
            </div>

            <button
              onClick={handleCheckAndCook}
              className="w-full mt-1 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-display text-sm shadow-lg"
            >
              🍲 Check and cook
            </button>
          </div>
        </div>

        {/* Right: 34-Ingredient Caribbean Pantry */}
        <div className="col-span-7 flex flex-col bg-slate-950/75 border border-white/15 rounded-2xl p-3 overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="font-display text-xs text-amber-300">
              Caribbean Pantry ({filteredPantry.length} Authentic Ingredients)
            </span>
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter ingredient..."
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/20 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex-1 grid grid-cols-4 sm:grid-cols-5 gap-2 overflow-y-auto pr-1">
            {filteredPantry.map((item) => {
              const inPot = potIngredients.includes(item.name);
              const isRequired = activeRecipe.requiredIngredients.includes(item.name);
              return (
                <button
                  key={item.name}
                  onClick={() => handleToggleIngredient(item.name)}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-between text-center transition-all ${
                    inPot
                      ? 'bg-emerald-800/80 border-emerald-300 scale-95 shadow-inner'
                      : isRequired && showRecipeBook
                      ? 'bg-amber-500/15 border-amber-300/60 hover:bg-amber-500/30'
                      : 'bg-slate-900/80 border-white/10 hover:border-amber-300/50'
                  }`}
                >
                  <img
                    src={assetUrl(item.sprite)}
                    alt={item.name}
                    className="w-10 h-10 object-contain"
                    onError={(e) => {
                      e.currentTarget.src = assetUrl('sprites/olla.png');
                    }}
                  />
                  <span className="text-[10px] font-bold leading-tight mt-1 text-white">
                    {item.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 2. LM_Tortuguero - Tortuguero Canal Boat & Manatee Search (Limón)
 * Navigate the Tortuguero canals (sfx 45 Motor Bote.m4a) with a 5.0s Nitro Boost,
 * dodging floating river logs and collecting canal coins until finding the West Indian Manatee!
 */
export function TortugueroBoatGame({ minigame, character, onComplete, playSfx }) {
  const [canalLane, setCanalLane] = useState(1); // 0, 1, 2
  const [progress, setProgress] = useState(0); // 0..100
  const [hull, setHull] = useState(3);
  const [coins, setCoins] = useState(0);
  const [nitroActive, setNitroActive] = useState(false);
  const [nitroCooldown, setNitroCooldown] = useState(0);
  const [obstacles, setObstacles] = useState([]);

  const laneRef = useRef(canalLane);
  laneRef.current = canalLane;
  const nitroRef = useRef(nitroActive);
  nitroRef.current = nitroActive;
  const coinsRef = useRef(coins);
  coinsRef.current = coins;
  const doneRef = useRef(false);
  const nextId = useRef(1);

  const activateNitro = () => {
    if (nitroActive || nitroCooldown > 0 || doneRef.current) return;
    playSfx(45); // Motor Bote.m4a
    setNitroActive(true);
    setTimeout(() => {
      setNitroActive(false);
      setNitroCooldown(5);
    }, 3500);
  };

  useEffect(() => {
    if (nitroCooldown <= 0) return;
    const t = setTimeout(() => setNitroCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [nitroCooldown]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setCanalLane((l) => Math.max(0, l - 1));
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setCanalLane((l) => Math.min(2, l + 1));
      } else if (e.key === ' ') {
        e.preventDefault();
        activateNitro();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nitroActive, nitroCooldown]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const loop = setInterval(() => {
      if (doneRef.current) return;

      const speedMult = nitroRef.current ? 2.1 : 1.15;

      setProgress((p) => {
        const next = p + speedMult;
        if (next >= 100 && !doneRef.current) {
          doneRef.current = true;
          playSfx(40); // Photograph the Manatee!
          onComplete({
            won: true,
            score: 120 + coinsRef.current * 15,
            coinsEarned: 1500 + coinsRef.current * 50,
            summary: `Navigated the Tortuguero Canals and found the protected West Indian Manatee with ${coinsRef.current} bonus coins!`
          });
        }
        return Math.min(100, next);
      });

      setObstacles((prev) => {
        const moved = prev
          .map((o) => ({ ...o, x: o.x - (nitroRef.current ? 6.2 : 3.8) }))
          .filter((o) => o.x > -10);
        const kept = [];

        for (const o of moved) {
          if (o.x <= 22 && o.x >= 12 && o.lane === laneRef.current) {
            if (o.type === 'coin') {
              playSfx(36);
              setCoins((c) => c + 1);
            } else {
              playSfx(37);
              setHull((h) => {
                const nh = h - 1;
                if (nh <= 0 && !doneRef.current) {
                  doneRef.current = true;
                  onComplete({
                    won: false,
                    score: Math.round(progress),
                    coinsEarned: coinsRef.current * 50,
                    summary: 'Your boat hit too many floating canal logs! Steer between the 3 canal lanes to reach the Manatee sanctuary.'
                  });
                }
                return nh;
              });
            }
          } else {
            kept.push(o);
          }
        }

        if (Math.random() < 0.36) {
          const isCoin = Math.random() < 0.48;
          kept.push({
            id: nextId.current++,
            lane: Math.floor(Math.random() * 3),
            x: 103,
            type: isCoin ? 'coin' : 'log'
          });
        }
        return kept;
      });
    }, 80);

    return () => clearInterval(loop);
  }, [onComplete, playSfx, progress]);

  return (
    <div className="relative w-full h-full flex flex-col bg-gradient-to-b from-emerald-950 via-teal-900 to-emerald-950 text-white overflow-hidden select-none">
      {/* Top HUD */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/85 border-b border-emerald-400/40 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className={`text-lg ${i < hull ? 'opacity-100' : 'opacity-25'}`}>
                🚤
              </span>
            ))}
          </div>
          <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 font-display text-xs">
            Canal Coins: +{coins * 50}
          </span>
        </div>

        <div className="flex items-center gap-2 w-60">
          <span className="text-xs font-display text-emerald-300">Manatee Lagoon:</span>
          <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden border border-white/20">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-300" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs font-display">{Math.round(progress)}%</span>
        </div>

        <button
          onClick={activateNitro}
          disabled={nitroActive || nitroCooldown > 0}
          className={`px-4 py-1 rounded-xl font-display text-xs flex items-center gap-1 shadow ${
            nitroActive
              ? 'bg-cyan-400 text-slate-950 animate-pulse'
              : nitroCooldown > 0
              ? 'bg-slate-800 text-slate-400'
              : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
          }`}
        >
          <Zap className="w-4 h-4" />
          {nitroActive ? 'NITRO BOOSTING!' : nitroCooldown > 0 ? `Cooldown (${nitroCooldown}s)` : 'NITRO BOOST (Space)'}
        </button>
      </div>

      {/* Lush Rainforest Banks + 3 Tortuguero Canal Lanes */}
      <div className="relative flex-1 flex flex-col justify-between py-3">
        <div className="px-4 flex justify-around text-2xl opacity-75 pointer-events-none">
          <span>🌴</span><span>🦜</span><span>🌿</span><span>🐒</span><span>🌴</span><span>🐸</span><span>🌿</span>
        </div>

        {[0, 1, 2].map((lIdx) => (
          <div
            key={lIdx}
            onClick={() => setCanalLane(lIdx)}
            className={`relative flex-1 mx-3 my-1 rounded-2xl border-y border-teal-400/30 flex items-center cursor-pointer transition-colors ${
              canalLane === lIdx ? 'bg-teal-600/35 ring-2 ring-amber-300' : 'bg-teal-950/50 hover:bg-teal-800/30'
            }`}
          >
            <span className="ml-3 text-xs font-display text-teal-200/60">
              Tortuguero Canal {lIdx + 1}
            </span>

            {canalLane === lIdx && (
              <div
                style={{ left: '16%' }}
                className={`absolute -translate-x-1/2 px-3.5 py-1.5 rounded-2xl border-2 border-white shadow-xl flex items-center gap-1.5 z-20 ${
                  nitroActive ? 'bg-cyan-400 text-slate-950 scale-110' : 'bg-amber-400 text-slate-950'
                }`}
              >
                <img
                  src={assetUrl('sprites/bote down_0.png')}
                  alt="Boat"
                  className="w-7 h-7 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span className="font-display text-xs">🚤 {character}</span>
              </div>
            )}

            {obstacles
              .filter((o) => o.lane === lIdx)
              .map((o) => (
                <div
                  key={o.id}
                  style={{ left: `${o.x}%` }}
                  className="absolute -translate-x-1/2 z-10 pointer-events-none"
                >
                  {o.type === 'coin' ? (
                    <div className="w-9 h-9 rounded-full bg-amber-400/30 border-2 border-amber-300 flex items-center justify-center animate-bounce">
                      <img src={assetUrl('sprites/moneda.png')} alt="Coin" className="w-6 h-6 object-contain" />
                    </div>
                  ) : (
                    <div className="px-3 py-1 rounded-xl bg-amber-950 border-2 border-amber-500 flex items-center gap-1 shadow-lg">
                      <span>🪵</span>
                      <span className="text-[10px] font-bold text-amber-200">River Log</span>
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
 * 3. LM_Desove - Saving Baby Sea Turtles on Tortuguero Beach (Limón)
 * Protect the 10 baby Green Sea Turtles hatching on Tortuguero Beach as they crawl toward the Caribbean Sea!
 * Click swooping predatory Vultures (vulture-Sheet_0.png) to scare them away before they snatch a baby turtle!
 */
export function TurtleNestingDefenseGame({ minigame, onComplete, playSfx }) {
  const [turtlesAlive, setTurtlesAlive] = useState(10);
  const [seaProgress, setSeaProgress] = useState(0); // 0..100%
  const [vulturesScared, setVulturesScared] = useState(0);
  const [predators, setPredators] = useState([]);
  const [feedback, setFeedback] = useState(
    'Click approaching Predatory Vultures (🦅) to scare them away before they reach the 10 baby sea turtles!'
  );

  const turtlesRef = useRef(turtlesAlive);
  turtlesRef.current = turtlesAlive;
  const scaredRef = useRef(vulturesScared);
  scaredRef.current = vulturesScared;
  const doneRef = useRef(false);
  const nextId = useRef(1);

  useEffect(() => {
    const loop = setInterval(() => {
      if (doneRef.current) return;

      // Advance baby turtles toward the Caribbean Sea
      setSeaProgress((p) => {
        const next = p + 1.8;
        if (next >= 100 && !doneRef.current) {
          doneRef.current = true;
          const saved = turtlesRef.current;
          const won = saved >= 6;
          onComplete({
            won,
            score: saved * 20 + scaredRef.current * 5,
            coinsEarned: saved === 10 ? 2000 : saved * 180,
            summary: `Guided ${saved}/10 baby Green Sea Turtles safely into the Caribbean Sea at Tortuguero!`
          });
        }
        return Math.min(100, next);
      });

      // Move predators toward the baby turtles (at y ~ 72%)
      setPredators((prev) => {
        const moved = prev.map((v) => ({ ...v, y: v.y + v.speed }));
        const kept = [];

        for (const v of moved) {
          if (v.y >= 68) {
            playSfx(37);
            setTurtlesAlive((t) => {
              const nt = Math.max(0, t - 1);
              if (nt <= 3 && !doneRef.current) {
                doneRef.current = true;
                onComplete({
                  won: false,
                  score: scaredRef.current * 10,
                  coinsEarned: nt * 100,
                  summary: 'Too many baby sea turtles were snatched by predators! Click the swooping vultures quickly to scare them off.'
                });
              }
              return nt;
            });
            setFeedback('A vulture snatched a baby turtle! Click swooping vultures before they reach the beach!');
          } else {
            kept.push(v);
          }
        }

        if (kept.length < 4 && Math.random() < 0.45) {
          kept.push({
            id: nextId.current++,
            x: 12 + Math.random() * 76,
            y: 6,
            speed: 2.3 + Math.random() * 1.3
          });
        }
        return kept;
      });
    }, 120);

    return () => clearInterval(loop);
  }, [onComplete, playSfx]);

  const handleScarePredator = (id) => {
    playSfx(36);
    setPredators((prev) => prev.filter((p) => p.id !== id));
    setVulturesScared((s) => s + 1);
    setFeedback('Scared off a predatory vulture! Keep protecting the baby sea turtles!');
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-gradient-to-b from-sky-800 via-amber-200 to-cyan-600 text-slate-900 overflow-hidden select-none">
      {/* Top HUD */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/90 text-white border-b border-emerald-400/40 z-10">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-200 font-display text-sm">
            🐢 Baby Turtles Safe: {turtlesAlive} / 10
          </span>
          <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-200 font-display text-xs">
            🦅 Predators Scared: {vulturesScared}
          </span>
        </div>

        <div className="flex items-center gap-2 w-60">
          <span className="text-xs font-display text-cyan-300">To the Sea:</span>
          <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden border border-white/20">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-300" style={{ width: `${seaProgress}%` }} />
          </div>
          <span className="text-xs font-display">{Math.round(seaProgress)}%</span>
        </div>
      </div>

      <div className="bg-slate-900/85 text-amber-200 text-xs font-bold text-center py-1.5 px-4 z-10">
        {feedback}
      </div>

      {/* Tortuguero Beach Defense Arena */}
      <div className="relative flex-1 overflow-hidden">
        {/* Swooping Predatory Vultures */}
        {predators.map((v) => (
          <button
            key={v.id}
            onClick={() => handleScarePredator(v.id)}
            style={{ left: `${v.x}%`, top: `${v.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 px-3.5 py-2 rounded-2xl bg-slate-950/90 hover:bg-amber-400 text-white hover:text-slate-950 border-2 border-rose-400 shadow-2xl flex flex-col items-center transition-transform hover:scale-125 cursor-pointer z-30"
          >
            <img
              src={assetUrl('sprites/vulture-Sheet_0.png')}
              alt="Vulture"
              className="w-10 h-10 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <span className="text-xs font-display">🦅 Scare Off!</span>
          </button>
        ))}

        {/* Crawling Baby Sea Turtles */}
        <div
          style={{ bottom: '18%' }}
          className="absolute inset-x-8 flex items-center justify-around py-2 px-4 rounded-2xl bg-amber-900/25 border border-amber-800/30 z-20 pointer-events-none"
        >
          {Array.from({ length: turtlesAlive }).map((_, idx) => (
            <div key={idx} className="flex flex-col items-center animate-bounce">
              <img
                src={assetUrl('sprites/Tortu_pequenna-Sheet_7.png')}
                alt="Baby Turtle"
                className="w-9 h-9 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span className="text-lg">🐢</span>
            </div>
          ))}
        </div>

        {/* Caribbean Sea Surf at Bottom */}
        <div className="absolute bottom-0 inset-x-0 h-[15%] bg-gradient-to-t from-blue-900 via-cyan-600 to-cyan-300 border-t-4 border-white/80 flex items-center justify-around text-white font-display text-xs">
          <span>🌊 Caribbean Sea Sanctuary</span>
          <span>🐢 Tortuguero National Park</span>
          <span>🌊 Safe Waters</span>
        </div>
      </div>
    </div>
  );
}
