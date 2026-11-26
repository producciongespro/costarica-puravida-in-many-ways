import React, { useEffect, useRef, useState, useCallback } from 'react';
import { assetUrl } from '../../utils/assetUrl';

const CANVAS_W = 960;
const CANVAS_H = 540;
const GRAVITY = 1520; // px/s^2
const JUMP_VELOCITY = -600; // px/s
const MAX_SPEED = 370; // px/s
const ACCEL = 940; // px/s^2
const FRICTION = 720; // px/s^2

/**
 * Complete 1:1 Bosque de la Hoja (Heredia) terrain reconstructed from p1.mp4 - p5.mp4.
 * Coordinates:
 *  - World Y uses smaller values for HIGHER elevation (just like canvas Y).
 *  - Camera follows both X and Y smoothly so high climbs and deep descents stay framed.
 *  - type: 'ground' | 'bridge' | 'waterBridge' | 'cliff'
 *  - biome: 'forest' (sage sky + round trees) | 'alpine' (cyan sky + pines/mountains) | 'meadow' (cyan sky + flowers)
 *  - signpost: true draws the brown wooden arrow signpost near the right edge of the segment
 */
const TERRAIN_SEGMENTS = [
  // === SEGMENT 1 (p1.mp4 & p2.mp4 00:00-00:01): Start + Pond Bridge #1 ===
  { type: 'ground', x1: 0, x2: 430, y1: 400, y2: 400, biome: 'forest' },
  { type: 'waterBridge', x1: 430, x2: 710, y1: 400, y2: 400, biome: 'forest' },
  { type: 'ground', x1: 710, x2: 1030, y1: 400, y2: 400, biome: 'forest' },

  // === SEGMENT 2 (p2.mp4 00:01-00:18): Stepped Uphill Climb & Pine Forest ===
  { type: 'ground', x1: 1030, x2: 1180, y1: 400, y2: 340, biome: 'forest' },
  { type: 'ground', x1: 1180, x2: 1350, y1: 340, y2: 340, biome: 'forest' },
  { type: 'ground', x1: 1350, x2: 1560, y1: 340, y2: 240, biome: 'forest' },
  { type: 'ground', x1: 1560, x2: 1920, y1: 240, y2: 240, biome: 'alpine' },
  // Second pine climb
  { type: 'ground', x1: 1920, x2: 2100, y1: 240, y2: 170, biome: 'alpine' },
  { type: 'ground', x1: 2100, x2: 2260, y1: 170, y2: 170, biome: 'alpine' },
  { type: 'ground', x1: 2260, x2: 2520, y1: 170, y2: 50, biome: 'alpine' },
  { type: 'ground', x1: 2520, x2: 2800, y1: 50, y2: 50, biome: 'alpine', flowers: true, signpost: true },

  // === SEGMENT 3 (p2.mp4 00:18-00:29): Long Suspension Log Bridge over Gorge ===
  { type: 'bridge', x1: 2800, x2: 3920, y1: 50, y2: 50, biome: 'alpine' },

  // === SEGMENT 4 (p3.mp4 00:00-00:18): 4 Ascending Cliff Pillars ===
  // Pillar 1 (right after long bridge, gentle step up)
  { type: 'ground', x1: 3920, x2: 4080, y1: 50, y2: 50, biome: 'alpine', bareTrunks: true },
  { type: 'ground', x1: 4080, x2: 4160, y1: 50, y2: 20, biome: 'alpine', bareTrunks: true },
  { type: 'ground', x1: 4160, x2: 4340, y1: 20, y2: 20, biome: 'alpine', bareTrunks: true, signpost: true },
  { type: 'cliff', x1: 4340, x2: 4470, y1: 900, y2: 900, biome: 'alpine' },
  // Pillar 2
  { type: 'ground', x1: 4470, x2: 4770, y1: -10, y2: -10, biome: 'alpine', bareTrunks: true, signpost: true },
  { type: 'cliff', x1: 4770, x2: 4900, y1: 900, y2: 900, biome: 'alpine' },
  // Pillar 3
  { type: 'ground', x1: 4900, x2: 5200, y1: -40, y2: -40, biome: 'alpine', bareTrunks: true, signpost: true },
  { type: 'cliff', x1: 5200, x2: 5330, y1: 900, y2: 900, biome: 'alpine' },
  // Pillar 4
  { type: 'ground', x1: 5330, x2: 5620, y1: -70, y2: -70, biome: 'alpine', bareTrunks: true, signpost: true },
  { type: 'cliff', x1: 5620, x2: 5750, y1: 900, y2: 900, biome: 'alpine' },

  // === SEGMENT 5 (p3.mp4 00:18-00:28): Steep Pine Uphill + Big Leap to Flower Meadow ===
  { type: 'ground', x1: 5750, x2: 6020, y1: -70, y2: -70, biome: 'alpine' },
  { type: 'ground', x1: 6020, x2: 6360, y1: -70, y2: -220, biome: 'alpine' },
  { type: 'ground', x1: 6360, x2: 6600, y1: -220, y2: -220, biome: 'alpine', signpost: true },
  // Big downhill cliff jump!
  { type: 'cliff', x1: 6600, x2: 6820, y1: 900, y2: 900, biome: 'meadow' },
  // Flower Meadow plateau (red & blue flowers, slight step down)
  { type: 'ground', x1: 6820, x2: 7200, y1: -80, y2: -80, biome: 'meadow', flowers: true },
  { type: 'ground', x1: 7200, x2: 7260, y1: -80, y2: -45, biome: 'meadow', flowers: true },
  { type: 'ground', x1: 7260, x2: 7540, y1: -45, y2: -45, biome: 'meadow', flowers: true, signpost: true },

  // === SEGMENT 6 (p4.mp4 00:00-00:17): 2 Descending Bare Pillars + Broadleaf Island ===
  { type: 'cliff', x1: 7540, x2: 7710, y1: 900, y2: 900, biome: 'meadow' },
  // Bare Pillar 1
  { type: 'ground', x1: 7710, x2: 7960, y1: 40, y2: 40, biome: 'meadow', bare: true, signpost: true },
  { type: 'cliff', x1: 7960, x2: 8130, y1: 900, y2: 900, biome: 'meadow' },
  // Bare Pillar 2
  { type: 'ground', x1: 8130, x2: 8380, y1: 120, y2: 120, biome: 'meadow', bare: true, signpost: true },
  { type: 'cliff', x1: 8380, x2: 8550, y1: 900, y2: 900, biome: 'alpine' },
  // Broadleaf Tree Island
  { type: 'ground', x1: 8550, x2: 9080, y1: 185, y2: 185, biome: 'alpine', roundTrees: true, signpost: true },

  // === SEGMENT 7 (p4.mp4 00:17-00:22): Big Leap + Long Steep Downhill Slope ===
  { type: 'cliff', x1: 9080, x2: 9290, y1: 900, y2: 900, biome: 'alpine' },
  { type: 'ground', x1: 9290, x2: 9460, y1: 250, y2: 250, biome: 'alpine', roundTrees: true },
  { type: 'ground', x1: 9460, x2: 9920, y1: 250, y2: 420, biome: 'alpine', roundTrees: true },
  { type: 'ground', x1: 9920, x2: 10180, y1: 420, y2: 420, biome: 'forest', roundTrees: true },

  // === SEGMENT 8 (p5.mp4 00:00-00:10): Water Bridges, Twin Mounds & Finish Grove ===
  // Water Bridge #2 -> Mound #1
  { type: 'waterBridge', x1: 10180, x2: 10390, y1: 420, y2: 420, biome: 'forest' },
  { type: 'ground', x1: 10390, x2: 10490, y1: 420, y2: 360, biome: 'forest', bare: true },
  { type: 'ground', x1: 10490, x2: 10550, y1: 360, y2: 360, biome: 'forest', bare: true },
  { type: 'ground', x1: 10550, x2: 10650, y1: 360, y2: 420, biome: 'forest', bare: true },
  // Water Bridge #3 -> Mound #2
  { type: 'waterBridge', x1: 10650, x2: 10840, y1: 420, y2: 420, biome: 'forest' },
  { type: 'ground', x1: 10840, x2: 10940, y1: 420, y2: 360, biome: 'forest', bare: true },
  { type: 'ground', x1: 10940, x2: 11000, y1: 360, y2: 360, biome: 'forest', bare: true },
  { type: 'ground', x1: 11000, x2: 11100, y1: 360, y2: 420, biome: 'forest', bare: true },
  // Water Bridge #4 -> Final Mound #3 & Lush Finish Grove
  { type: 'waterBridge', x1: 11100, x2: 11260, y1: 420, y2: 420, biome: 'forest' },
  { type: 'ground', x1: 11260, x2: 11380, y1: 420, y2: 345, biome: 'forest', roundTrees: true },
  { type: 'ground', x1: 11380, x2: 11520, y1: 345, y2: 345, biome: 'forest', roundTrees: true },
  { type: 'ground', x1: 11520, x2: 11680, y1: 345, y2: 430, biome: 'forest', roundTrees: true },
  { type: 'ground', x1: 11680, x2: 12350, y1: 430, y2: 430, biome: 'forest', roundTrees: true }
];

const FINISH_X = 11920;

/**
 * Sample terrain height, slope angle, type, and biome at world X.
 */
function sampleTerrain(x) {
  for (let i = 0; i < TERRAIN_SEGMENTS.length; i++) {
    const seg = TERRAIN_SEGMENTS[i];
    if (x >= seg.x1 && x <= seg.x2) {
      if (seg.type === 'cliff') {
        return { isCliff: true, y: 9999, angle: 0, type: 'cliff', biome: seg.biome, seg };
      }
      const t = (x - seg.x1) / Math.max(1, seg.x2 - seg.x1);
      const y = seg.y1 + (seg.y2 - seg.y1) * t;
      const angle = Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1);
      return { isCliff: false, y, angle, type: seg.type, biome: seg.biome, seg };
    }
  }
  return { isCliff: false, y: 430, angle: 0, type: 'ground', biome: 'forest', seg: null };
}

/**
 * Generate bobbing coins (+100 each) matching the exact placements from p2.mp4 - p5.mp4.
 */
function createInitialCoins() {
  const specs = [
    // Segment 1-2: First forest & stepped climb (p2.mp4)
    { x: 920, dy: -55, amp: 24 },
    { x: 1470, dy: -65, amp: 22 },
    { x: 2010, dy: -65, amp: 22 },
    { x: 2340, dy: -70, amp: 26 },
    { x: 2410, dy: -70, amp: 26 },
    // Segment 3: Long suspension bridge (6 bobbing coins)
    { x: 2980, dy: -50, amp: 32 },
    { x: 3140, dy: -60, amp: 34 },
    { x: 3300, dy: -50, amp: 32 },
    { x: 3460, dy: -65, amp: 34 },
    { x: 3620, dy: -50, amp: 32 },
    { x: 3780, dy: -60, amp: 34 },
    // Segment 4: 4 Ascending Cliff Pillars (1 bobbing coin per gap)
    { x: 4405, yAbs: -55, amp: 30 },
    { x: 4835, yAbs: -85, amp: 30 },
    { x: 5265, yAbs: -115, amp: 30 },
    { x: 5685, yAbs: -145, amp: 30 },
    // Segment 5: Big downhill leap to Flower Meadow (2 coins in air)
    { x: 6690, yAbs: -215, amp: 28 },
    { x: 6775, yAbs: -145, amp: 28 },
    // Segment 6: 2 Descending Bare Pillars + Broadleaf Island
    { x: 7625, yAbs: -30, amp: 26 },
    { x: 8045, yAbs: 45, amp: 26 },
    { x: 8465, yAbs: 115, amp: 26 },
    { x: 8820, dy: -70, amp: 26 },
    // Segment 7: Big leap to long downhill
    { x: 9185, yAbs: 150, amp: 28 },
    // Segment 8: Twin Mounds finale (p5.mp4)
    { x: 10520, dy: -45, amp: 24 },
    { x: 10970, dy: -45, amp: 24 }
  ];

  return specs.map((s, idx) => {
    const t = sampleTerrain(s.x);
    const baseY = s.yAbs !== undefined ? s.yAbs : t.y + (s.dy || -55);
    return {
      id: idx,
      x: s.x,
      baseY,
      amp: s.amp || 24,
      phase: idx * 0.9,
      collected: false
    };
  });
}

/**
 * Pre-generate trees, pines, bare trunks, flowers, and bushes per segment biome.
 */
function createScenery() {
  const items = [];
  for (let i = 0; i < TERRAIN_SEGMENTS.length; i++) {
    const seg = TERRAIN_SEGMENTS[i];
    if (seg.type !== 'ground' || seg.bare) continue;

    const len = seg.x2 - seg.x1;
    const step = seg.flowers && seg.biome === 'meadow' ? 58 : 74;
    for (let x = seg.x1 + 32; x < seg.x2 - 28; x += step) {
      // Leave room around start sign
      if (x > 130 && x < 310) continue;

      const t = sampleTerrain(x);
      const hash = Math.abs(Math.sin(x * 0.037) * 1000);

      if (seg.biome === 'meadow' && seg.flowers) {
        items.push({ x, y: t.y, kind: 'bush', scale: 0.95 });
        items.push({
          x: x + 16,
          y: sampleTerrain(x + 16).y,
          kind: Math.floor(hash) % 2 === 0 ? 'flowerRed' : 'flowerBlue',
          scale: 1
        });
        continue;
      }

      if (seg.biome === 'alpine' && !seg.roundTrees) {
        if (seg.bareTrunks && Math.floor(hash) % 3 === 0) {
          items.push({ x, y: t.y, kind: 'bareTrunk', scale: 0.9 + (hash % 25) / 100 });
        } else {
          items.push({
            x,
            y: t.y,
            kind: Math.floor(hash) % 2 === 0 ? 'pineDark' : 'pineLight',
            scale: 0.9 + (hash % 28) / 100
          });
        }
        if (seg.flowers && Math.floor(hash) % 2 === 0) {
          items.push({
            x: x + 20,
            y: t.y,
            kind: Math.floor(hash) % 4 === 0 ? 'flowerBlue' : 'flowerRed',
            scale: 1
          });
        }
      } else {
        // Broadleaf round trees + bushes
        items.push({
          x,
          y: t.y,
          kind: 'roundTree',
          scale: 0.85 + (hash % 28) / 100
        });
        if (Math.floor(hash) % 2 === 0 && len > 120) {
          items.push({ x: x + 28, y: sampleTerrain(x + 28).y, kind: 'bush', scale: 0.95 });
        }
      }
    }
  }
  return items;
}

const SCENERY = createScenery();

export default function MountainBikeCanvas({ character, onComplete, playSfx }) {
  const canvasRef = useRef(null);
  const isLisa = String(character || '').toLowerCase() === 'lisa';

  // Phase: 'intro1' -> 'intro2' -> 'countdown' -> 'playing' -> 'finishBanner' -> 'finished'
  const [phase, setPhase] = useState('intro1');
  const [countdownText, setCountdownText] = useState('Ready!');
  const [hudCoins, setHudCoins] = useState(0);
  const [hudTime, setHudTime] = useState(0);
  const [hudProgress, setHudProgress] = useState(0);
  const [finishStats, setFinishStats] = useState(null);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const doneRef = useRef(false);

  // Input state
  const keysRef = useRef({ left: false, right: false, jump: false });

  // Sprite images cache
  const spritesRef = useRef({ bikeFrames: [], coinImg: null });

  // Mutable game world state (kept in ref for 60fps loop)
  const worldRef = useRef({
    px: 260,
    py: 400,
    vx: 0,
    vy: 0,
    angle: 0,
    onGround: true,
    coyoteTimer: 0,
    animTime: 0,
    cameraX: 0,
    cameraY: 0,
    elapsed: 0,
    coinsCollected: 0,
    coins: createInitialCoins(),
    particles: [],
    sparkles: [],
    lastSafeX: 260,
    lastSafeY: 400
  });

  // Load original extracted sprites (Mike/Lisa bike frames + moneda.png)
  useEffect(() => {
    const framePaths = isLisa
      ? [
          'sprites/Personaje_Sprites_02b_bike-Sheet_0.png',
          'sprites/Personaje_Sprites_02b_bike-Sheet_1.png',
          'sprites/Personaje_Sprites_02b_bike-Sheet_2.png',
          'sprites/Personaje_Sprites_02b_bike-Sheet_3.png',
          'sprites/Personaje_Sprites_02b_bike-Sheet_4.png',
          'sprites/Personaje_Sprites_02b_bike-Sheet_5.png'
        ]
      : [
          'sprites/Personaje_Sprites_01_bici_0.png',
          'sprites/Personaje_Sprites_01_bici_1.png',
          'sprites/Personaje_Sprites_01_bici_2.png',
          'sprites/Personaje_Sprites_01_bici_3.png',
          'sprites/Personaje_Sprites_01_bici_4.png',
          'sprites/Personaje_Sprites_01_bici_5.png'
        ];

    const loadedFrames = framePaths.map((p) => {
      const img = new Image();
      img.src = assetUrl(p);
      return img;
    });

    const coinImg = new Image();
    coinImg.src = assetUrl('sprites/moneda.png');

    spritesRef.current = { bikeFrames: loadedFrames, coinImg };
  }, [isLisa]);

  // Reset game for Retry button
  const resetGame = useCallback(() => {
    doneRef.current = false;
    setFinishStats(null);
    setHudCoins(0);
    setHudTime(0);
    setHudProgress(0);
    worldRef.current = {
      px: 260,
      py: 400,
      vx: 0,
      vy: 0,
      angle: 0,
      onGround: true,
      coyoteTimer: 0,
      animTime: 0,
      cameraX: 0,
      cameraY: 0,
      elapsed: 0,
      coinsCollected: 0,
      coins: createInitialCoins(),
      particles: [],
      sparkles: [],
      lastSafeX: 260,
      lastSafeY: 400
    };
    setCountdownText('Ready!');
    setPhase('countdown');
  }, []);

  // Advance intro dialog
  const advanceIntro = useCallback(() => {
    if (phaseRef.current === 'intro1') {
      playSfx(38);
      setPhase('intro2');
    } else if (phaseRef.current === 'intro2') {
      playSfx(38);
      setPhase('countdown');
      setCountdownText('Ready!');
    }
  }, [playSfx]);

  // Countdown sequence: Ready! -> Set! -> Goooo!
  useEffect(() => {
    if (phase !== 'countdown') return;
    const t1 = setTimeout(() => {
      setCountdownText('Set!');
      playSfx(38);
    }, 900);
    const t2 = setTimeout(() => {
      setCountdownText('Goooo!');
      playSfx(36);
    }, 1800);
    const t3 = setTimeout(() => {
      setPhase('playing');
    }, 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [phase, playSfx]);

  // Keyboard listeners
  useEffect(() => {
    const onKeyDown = (e) => {
      if (phaseRef.current === 'intro1' || phaseRef.current === 'intro2') {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
          e.preventDefault();
          advanceIntro();
        }
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        keysRef.current.right = true;
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        keysRef.current.left = true;
      } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        keysRef.current.jump = true;
      }
    };

    const onKeyUp = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysRef.current.right = false;
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysRef.current.left = false;
      } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        keysRef.current.jump = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [advanceIntro]);

  // Main 60fps HTML5 Canvas 2D Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let rafId;
    let lastTs = performance.now();
    let hudSyncAcc = 0;

    const triggerFinish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      const w = worldRef.current;
      playSfx(47); // crowd.m4a

      const t = w.elapsed;
      let timeBonus = 250;
      let headline = 'Better luck next time!';
      if (t < 56) {
        timeBonus = 1500;
        headline = 'That was so fast!';
      } else if (t < 64) {
        timeBonus = 1000;
        headline = 'Nice speed!';
      } else if (t < 75) {
        timeBonus = 750;
        headline = 'Not bad!';
      }
      const coinBonus = w.coinsCollected * 100;
      const totalWon = timeBonus + coinBonus;

      setFinishStats({
        elapsed: t,
        headline,
        timeBonus,
        coinBonus,
        totalWon
      });
      // First show "Well done! / Time Elapsed" (just like p5.mp4 00:09-00:11)
      setPhase('finishBanner');
      setTimeout(() => {
        setPhase('finished');
      }, 2400);
    };

    const update = (dt) => {
      const w = worldRef.current;
      w.animTime += dt;

      if (phaseRef.current !== 'playing') {
        if (phaseRef.current === 'finishBanner' || phaseRef.current === 'finished') {
          // Gentle coast to a stop in the finish grove
          w.vx = Math.max(0, w.vx - 500 * dt);
          w.px += w.vx * dt;
        }
        w.cameraX = Math.max(0, w.px - 280);
        const targetCamY = w.py - 380;
        w.cameraY += (targetCamY - w.cameraY) * Math.min(1, dt * 6);
        return;
      }

      w.elapsed += dt;
      const keys = keysRef.current;

      // Horizontal movement
      if (keys.right) {
        w.vx = Math.min(MAX_SPEED, w.vx + ACCEL * dt);
      } else if (keys.left) {
        w.vx = Math.max(-MAX_SPEED * 0.55, w.vx - ACCEL * dt);
      } else {
        if (w.vx > 0) w.vx = Math.max(0, w.vx - FRICTION * dt);
        else if (w.vx < 0) w.vx = Math.min(0, w.vx + FRICTION * dt);
      }

      w.px = Math.max(60, w.px + w.vx * dt);

      // Coyote time for responsive jumps off cliff edges
      if (w.onGround) {
        w.coyoteTimer = 0.13;
      } else {
        w.coyoteTimer = Math.max(0, w.coyoteTimer - dt);
      }

      // Jump trigger
      if (keys.jump && w.coyoteTimer > 0) {
        w.vy = JUMP_VELOCITY;
        w.onGround = false;
        w.coyoteTimer = 0;
        playSfx(29);
      }

      // Apply gravity
      w.vy += GRAVITY * dt;
      w.py += w.vy * dt;

      // Terrain collision
      const ground = sampleTerrain(w.px);
      if (!ground.isCliff && w.py >= ground.y && w.py <= ground.y + 65 && w.vy >= -40) {
        w.py = ground.y;
        w.vy = 0;
        w.onGround = true;
        w.angle += (ground.angle - w.angle) * Math.min(1, dt * 15);

        // Save safe respawn point on solid ground (instant respawn on cliff fall, 1:1 with p3.mp4)
        const ahead = sampleTerrain(w.px + 55);
        const behind = sampleTerrain(w.px - 30);
        if (!ahead.isCliff && !behind.isCliff && ground.type === 'ground') {
          w.lastSafeX = Math.max(120, w.px - 20);
          w.lastSafeY = sampleTerrain(w.lastSafeX).y;
        }
      } else {
        w.onGround = false;
        const airAngle = Math.max(-0.35, Math.min(0.32, w.vy * 0.0005));
        w.angle += (airAngle - w.angle) * Math.min(1, dt * 6);
      }

      // Dust particles behind rear tire
      if (w.onGround && Math.abs(w.vx) > 65 && Math.random() < 0.5) {
        w.particles.push({
          x: w.px - 18,
          y: w.py - 4,
          vx: -w.vx * 0.25 + (Math.random() - 0.5) * 30,
          vy: -20 - Math.random() * 32,
          life: 0.42,
          maxLife: 0.42,
          r: 3 + Math.random() * 3
        });
      }

      // Update dust particles
      for (let i = w.particles.length - 1; i >= 0; i--) {
        const p = w.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) w.particles.splice(i, 1);
      }

      // Update yellow coin-burst sparkles (just like p2.mp4 / p3.mp4)
      for (let i = w.sparkles.length - 1; i >= 0; i--) {
        const sp = w.sparkles[i];
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.life -= dt;
        if (sp.life <= 0) w.sparkles.splice(i, 1);
      }

      // Coin collection (+100 each, oscillating vertically)
      for (let i = 0; i < w.coins.length; i++) {
        const c = w.coins[i];
        if (c.collected) continue;
        const cy = c.baseY + Math.sin(w.animTime * 3.4 + c.phase) * c.amp;
        const dx = w.px - c.x;
        const dy = (w.py - 28) - cy;
        if (dx * dx + dy * dy < 38 * 38) {
          c.collected = true;
          w.coinsCollected += 1;
          playSfx(35); // coins.m4a
          // Spawn radial yellow burst rays
          for (let k = 0; k < 10; k++) {
            const ang = (k / 10) * Math.PI * 2;
            const spd = 75 + Math.random() * 55;
            w.sparkles.push({
              x: c.x,
              y: cy,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              life: 0.35,
              maxLife: 0.35
            });
          }
        }
      }

      // Instant cliff respawn (no lives lost, keeps coins, 1:1 with p3.mp4 & p4.mp4)
      if (w.py > w.cameraY + CANVAS_H + 110) {
        playSfx(37); // wrong.m4a
        w.px = w.lastSafeX;
        w.py = w.lastSafeY - 12;
        w.vx = 0;
        w.vy = 0;
        w.angle = 0;
      }

      // Check finish line
      if (w.px >= FINISH_X) {
        triggerFinish();
        return;
      }

      // Smooth 2D camera following player X and elevation Y
      const targetCamX = Math.max(0, Math.min(FINISH_X - CANVAS_W + 340, w.px - 290));
      const targetCamY = w.py - 360;
      w.cameraX += (targetCamX - w.cameraX) * Math.min(1, dt * 8);
      w.cameraY += (targetCamY - w.cameraY) * Math.min(1, dt * 5.5);

      // Sync React HUD ~10 times/sec
      hudSyncAcc += dt;
      if (hudSyncAcc >= 0.1) {
        hudSyncAcc = 0;
        setHudCoins(w.coinsCollected * 100);
        setHudTime(w.elapsed);
        setHudProgress(Math.min(100, Math.round((w.px / FINISH_X) * 100)));
      }
    };

    const draw = () => {
      const w = worldRef.current;
      const camX = w.cameraX;
      const camY = w.cameraY;

      // Determine biome blend (0 = sage forest sky, 1 = bright cyan alpine sky)
      const isAlpineZone = w.px > 1480 && w.px < 10050;
      const skyColor = isAlpineZone ? '#00a2bc' : '#8ea69e';

      // 1. Sky background
      ctx.fillStyle = skyColor;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // 2. Parallax Clouds
      ctx.fillStyle = 'rgba(240, 248, 250, 0.9)';
      for (let i = 0; i < 8; i++) {
        const cx = ((i * 220 - camX * 0.12) % (CANVAS_W + 240) + (CANVAS_W + 240)) % (CANVAS_W + 240) - 120;
        const cy = 54 + (i % 3) * 32;
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.arc(cx + 18, cy - 6, 22, 0, Math.PI * 2);
        ctx.arc(cx + 38, cy, 16, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Parallax Mountains & Rolling Hills
      if (isAlpineZone) {
        // Triangular grey mountains (Volcán Barva / alpine peaks from p2.mp4 & p4.mp4)
        ctx.fillStyle = '#7e9191';
        ctx.beginPath();
        ctx.moveTo(0, CANVAS_H);
        for (let sx = -160; sx <= CANVAS_W + 280; sx += 240) {
          const mx = sx - ((camX * 0.16) % 240);
          ctx.lineTo(mx, CANVAS_H - 90);
          ctx.lineTo(mx + 120, 120 + (Math.abs(sx) % 50));
          ctx.lineTo(mx + 240, CANVAS_H - 90);
        }
        ctx.lineTo(CANVAS_W, CANVAS_H);
        ctx.closePath();
        ctx.fill();
      } else {
        // Muted rolling hills with tiny pine silhouettes (p1.mp4 & p5.mp4)
        ctx.fillStyle = '#b4c9b8';
        ctx.beginPath();
        ctx.moveTo(0, CANVAS_H);
        for (let sx = 0; sx <= CANVAS_W + 40; sx += 40) {
          const wx = sx + camX * 0.28;
          const hy = 215 + Math.sin(wx * 0.0045) * 42;
          ctx.lineTo(sx, hy);
        }
        ctx.lineTo(CANVAS_W, CANVAS_H);
        ctx.closePath();
        ctx.fill();
      }

      // 4. World-Space Rendering (translate by -camX, -camY)
      ctx.save();
      ctx.translate(-camX, -camY);

      // 4a. Background Scenery (Trees, Pines, Bare Trunks, Flowers, Bushes)
      for (let i = 0; i < SCENERY.length; i++) {
        const item = SCENERY[i];
        if (item.x < camX - 140 || item.x > camX + CANVAS_W + 140) continue;
        const sx = item.x;
        const sy = item.y;

        if (item.kind === 'pineDark' || item.kind === 'pineLight') {
          const h = 135 * item.scale;
          ctx.fillStyle = '#6b4226';
          ctx.fillRect(sx - 6, sy - 26, 12, 28);
          ctx.fillStyle = item.kind === 'pineDark' ? '#1f6e2d' : '#4ca630';
          ctx.beginPath();
          ctx.moveTo(sx, sy - h);
          ctx.lineTo(sx - 28 * item.scale, sy - 22);
          ctx.lineTo(sx + 28 * item.scale, sy - 22);
          ctx.closePath();
          ctx.fill();
        } else if (item.kind === 'bareTrunk') {
          const h = 145 * item.scale;
          ctx.fillStyle = '#9b5c34';
          ctx.fillRect(sx - 5, sy - h, 10, h);
          ctx.fillRect(sx - 18, sy - h * 0.72, 16, 5);
          ctx.fillRect(sx + 4, sy - h * 0.55, 16, 5);
        } else if (item.kind === 'roundTree') {
          const r = 34 * item.scale;
          ctx.fillStyle = '#7a4b26';
          ctx.fillRect(sx - 7, sy - 42, 14, 44);
          ctx.fillStyle = '#569c2c';
          ctx.beginPath();
          ctx.arc(sx, sy - 66 * item.scale, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#7bc43b';
          ctx.beginPath();
          ctx.arc(sx - 7, sy - 72 * item.scale, r * 0.62, 0, Math.PI * 2);
          ctx.fill();
        } else if (item.kind === 'bush') {
          ctx.fillStyle = '#6ec236';
          ctx.beginPath();
          ctx.arc(sx, sy - 8, 13, Math.PI, 0);
          ctx.arc(sx + 13, sy - 6, 10, Math.PI, 0);
          ctx.fill();
        } else if (item.kind === 'flowerRed' || item.kind === 'flowerBlue') {
          ctx.fillStyle = '#2d8a34';
          ctx.fillRect(sx - 2, sy - 18, 4, 18);
          ctx.fillStyle = item.kind === 'flowerRed' ? '#ef4444' : '#3b82f6';
          ctx.beginPath();
          ctx.arc(sx, sy - 21, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(sx, sy - 21, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 4b. Start Sign: "BOSQUE LA HOJA LAS CHORRERAS" (with Costa Rica flag, 1:1 with p1.mp4)
      if (camX < 480) {
        const signX = 210;
        const signY = 400;
        ctx.fillStyle = '#7a4b26';
        ctx.fillRect(signX - 42, signY - 56, 7, 56);
        ctx.fillRect(signX + 35, signY - 56, 7, 56);
        ctx.fillStyle = '#f8f5ec';
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 4;
        ctx.fillRect(signX - 58, signY - 98, 116, 48);
        ctx.strokeRect(signX - 58, signY - 98, 116, 48);
        // Costa Rica mini flag on left
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(signX - 52, signY - 91, 20, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(signX - 52, signY - 87, 20, 4);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(signX - 52, signY - 83, 20, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(signX - 52, signY - 77, 20, 4);
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(signX - 52, signY - 73, 20, 4);

        ctx.fillStyle = '#991b1b';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('BOSQUE', signX + 12, signY - 84);
        ctx.fillText('LA HOJA', signX + 12, signY - 72);
        ctx.font = 'bold 9px monospace';
        ctx.fillText('LAS CHORRERAS', signX, signY - 57);
      }

      // 4c. Terrain Segments (Dirt + Wavy Texture + Grass, Bridges, Water Bridges, Signposts)
      const bottomWorldY = camY + CANVAS_H + 140;
      for (let i = 0; i < TERRAIN_SEGMENTS.length; i++) {
        const seg = TERRAIN_SEGMENTS[i];
        if (seg.x2 < camX - 80 || seg.x1 > camX + CANVAS_W + 80) continue;

        if (seg.type === 'ground') {
          // Dirt body
          ctx.fillStyle = '#b98758';
          ctx.beginPath();
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
          ctx.lineTo(seg.x2, bottomWorldY);
          ctx.lineTo(seg.x1, bottomWorldY);
          ctx.closePath();
          ctx.fill();

          // Horizontal layered zig-zag dirt bands (authentic pixel-art soil look)
          ctx.fillStyle = 'rgba(138, 92, 50, 0.22)';
          const minY = Math.min(seg.y1, seg.y2) + 18;
          for (let gy = Math.floor(minY / 22) * 22; gy < bottomWorldY; gy += 22) {
            ctx.fillRect(seg.x1, gy, seg.x2 - seg.x1, 10);
          }

          // Bright green grass top layer
          ctx.strokeStyle = '#6ec239';
          ctx.lineWidth = 14;
          ctx.lineCap = 'butt';
          ctx.beginPath();
          ctx.moveTo(seg.x1, seg.y1 + 5);
          ctx.lineTo(seg.x2, seg.y2 + 5);
          ctx.stroke();

          ctx.strokeStyle = '#4e9b26';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(seg.x1, seg.y1 + 13);
          ctx.lineTo(seg.x2, seg.y2 + 13);
          ctx.stroke();

          // Wooden arrow signpost near right cliff edge (1:1 with p2/p3/p4)
          if (seg.signpost) {
            const sx = seg.x2 - 26;
            const sy = seg.y2;
            ctx.fillStyle = '#7a4b26';
            ctx.fillRect(sx - 3, sy - 28, 6, 28);
            ctx.fillStyle = '#9b5c34';
            ctx.fillRect(sx - 12, sy - 38, 22, 12);
            ctx.beginPath();
            ctx.moveTo(sx + 10, sy - 41);
            ctx.lineTo(sx + 18, sy - 32);
            ctx.lineTo(sx + 10, sy - 23);
            ctx.closePath();
            ctx.fill();
          }
        } else if (seg.type === 'waterBridge' || seg.type === 'bridge') {
          if (seg.type === 'waterBridge') {
            // Sparkling pixel-art blue pond underneath
            const waterY = seg.y1 + 26;
            ctx.fillStyle = '#8ad8eb';
            ctx.fillRect(seg.x1, waterY, seg.x2 - seg.x1, bottomWorldY - waterY);
            ctx.fillStyle = '#bdf0fc';
            ctx.fillRect(seg.x1, waterY, seg.x2 - seg.x1, 10);
          }

          // Wooden log planks
          const logStep = 16;
          for (let lx = seg.x1; lx < seg.x2; lx += logStep) {
            ctx.fillStyle = '#a66b3c';
            ctx.beginPath();
            ctx.arc(lx + 8, seg.y1 + 6, 7.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#6b3e1b';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      }

      // 4d. Bobbing Coins (original sprites/moneda.png)
      const coinImg = spritesRef.current.coinImg;
      for (let i = 0; i < w.coins.length; i++) {
        const c = w.coins[i];
        if (c.collected) continue;
        if (c.x < camX - 40 || c.x > camX + CANVAS_W + 40) continue;
        const cy = c.baseY + Math.sin(w.animTime * 3.4 + c.phase) * c.amp;
        if (coinImg && coinImg.complete && coinImg.naturalWidth > 0) {
          ctx.drawImage(coinImg, c.x - 16, cy - 16, 32, 32);
        } else {
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(c.x, cy, 13, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 4e. Dust Particles
      for (let i = 0; i < w.particles.length; i++) {
        const p = w.particles[i];
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = `rgba(146, 98, 56, ${alpha * 0.7})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4f. Coin Burst Sparkles
      for (let i = 0; i < w.sparkles.length; i++) {
        const sp = w.sparkles[i];
        const alpha = Math.max(0, sp.life / sp.maxLife);
        ctx.strokeStyle = `rgba(253, 224, 71, ${alpha})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y);
        ctx.lineTo(sp.x - sp.vx * 0.06, sp.y - sp.vy * 0.06);
        ctx.stroke();
      }

      // 4g. Player Cyclist (Original Mike/Lisa Bike Sprites + Slope Rotation)
      const frames = spritesRef.current.bikeFrames;
      const frameIdx =
        Math.abs(w.vx) > 15
          ? Math.floor(w.animTime * (6 + Math.abs(w.vx) * 0.03)) % Math.max(1, frames.length)
          : 0;
      const bikeImg = frames[frameIdx];

      ctx.save();
      ctx.translate(w.px, w.py - 28);
      ctx.rotate(w.angle);
      if (w.vx < -10) ctx.scale(-1, 1);

      if (bikeImg && bikeImg.complete && bikeImg.naturalWidth > 0) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(bikeImg, -30, -32, 60, 62);
      } else {
        ctx.fillStyle = '#10b981';
        ctx.fillRect(-20, -24, 40, 40);
      }
      ctx.restore();

      ctx.restore(); // End world-space transform
    };

    const loop = (now) => {
      const dt = Math.min(0.04, (now - lastTs) / 1000);
      lastTs = now;
      update(dt);
      draw();
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [playSfx]);

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-900 overflow-hidden select-none">
      {/* Compact Top Race Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-950/85 border-b border-emerald-400/40 text-white z-10 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-amber-300">⏱ {hudTime.toFixed(1)}s</span>
          <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/60 text-amber-300 font-bold">
            🪙 +{hudCoins}
          </span>
        </div>

        <div className="flex items-center gap-2 w-48 sm:w-64">
          <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-white/20">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-lime-300 transition-all duration-100"
              style={{ width: `${hudProgress}%` }}
            />
          </div>
          <span className="font-bold text-emerald-300 w-9 text-right">{hudProgress}%</span>
        </div>

        <span className="hidden sm:inline text-emerald-200 font-semibold">
          ← / → Move • SPACE Jump
        </span>
      </div>

      {/* Main 2D Canvas Viewport */}
      <div className="relative flex-1 w-full flex items-center justify-center bg-[#8ea69e] overflow-hidden">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full h-full object-contain"
        />

        {/* Intro Instructions Box (1:1 Original Unity Style) */}
        {(phase === 'intro1' || phase === 'intro2') && (
          <div
            onClick={advanceIntro}
            className="absolute inset-0 z-20 flex flex-col justify-end p-4 sm:p-6 cursor-pointer"
          >
            {phase === 'intro2' && (
              <div className="self-center mb-6 flex items-center gap-6 bg-white/85 backdrop-blur-sm px-6 py-3 rounded-2xl border-2 border-slate-700 shadow-xl">
                <div className="px-10 py-2 rounded-lg bg-slate-200 border-b-4 border-slate-400 text-slate-800 font-bold text-sm">
                  SPACE
                </div>
                <div className="flex flex-col items-center gap-1 text-slate-800 font-bold text-xs">
                  <span className="px-2.5 py-1 rounded bg-slate-200 border-b-2 border-slate-400">↑</span>
                  <div className="flex items-center gap-1">
                    <span className="px-2.5 py-1 rounded bg-slate-200 border-b-2 border-slate-400">←</span>
                    <span className="px-2.5 py-1 rounded bg-slate-200 border-b-2 border-slate-400">↓</span>
                    <span className="px-2.5 py-1 rounded bg-slate-200 border-b-2 border-slate-400">→</span>
                  </div>
                </div>
              </div>
            )}

            <div className="w-full max-w-[820px] mx-auto rounded-2xl border-4 border-slate-200 bg-slate-800/95 text-white p-4 sm:p-5 shadow-2xl">
              <div className="inline-block px-3 py-0.5 -mt-8 mb-2 rounded-lg bg-slate-200 text-slate-900 font-bold text-xs tracking-wider uppercase shadow">
                INSTRUCTIONS:
              </div>
              <p className="font-hanken text-lg sm:text-xl text-white">
                {phase === 'intro1'
                  ? 'Go as fast as you can, but be careful not to fall into the cliffs.'
                  : 'Use the arrow keys to move and space bar to jump'}
              </p>
              <div className="text-right text-xs text-amber-300 font-bold mt-2 animate-pulse">
                Click or press SPACE to continue ▾
              </div>
            </div>
          </div>
        )}

        {/* Ready! Set! Goooo! Countdown Banner (1:1 semi-transparent band from p1.mp4) */}
        {phase === 'countdown' && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-20 bg-black/45 py-6 flex items-center justify-center pointer-events-none">
            <div
              className="font-hanken font-bold text-white tracking-wide drop-shadow-[0_3px_8px_rgba(0,0,0,0.6)]"
              style={{ fontSize: 'clamp(42px, 6.5vw, 68px)' }}
            >
              {countdownText}
            </div>
          </div>
        )}

        {/* 1:1 Finish Phase 1: "Well done! / Time Elapsed" (p5.mp4 00:09-00:11) */}
        {phase === 'finishBanner' && finishStats && (
          <div className="absolute inset-0 z-30 bg-black/45 flex flex-col items-center justify-center text-white text-center pointer-events-none">
            <h2 className="font-hanken font-bold text-5xl sm:text-6xl drop-shadow-lg mb-4">
              Well done!
            </h2>
            <p className="font-hanken text-xl sm:text-2xl text-white/90">Time Elapsed:</p>
            <p className="font-hanken font-bold text-4xl sm:text-5xl mt-1">
              {finishStats.elapsed.toFixed(1)}
            </p>
          </div>
        )}

        {/* 1:1 Finish Phase 2: Result + You Won + Retry / Return to map (p5.mp4 00:12-00:15) */}
        {phase === 'finished' && finishStats && (
          <div className="absolute inset-0 z-30 bg-black/50 flex flex-col items-center justify-center text-white text-center p-4">
            <h2 className="font-hanken font-bold text-4xl sm:text-5xl drop-shadow-lg mb-3">
              {finishStats.headline}
            </h2>
            <p className="font-hanken text-xl sm:text-2xl text-white/90">You Won:</p>
            <div className="flex items-center justify-center gap-2 mt-1 mb-6">
              <span className="font-hanken font-bold text-4xl sm:text-5xl">
                {finishStats.totalWon}
              </span>
              <img
                src={assetUrl('sprites/moneda.png')}
                alt="Coin"
                className="w-9 h-9 object-contain"
              />
            </div>

            <div className="flex flex-col gap-3 w-56">
              <button
                onClick={resetGame}
                className="w-full py-2.5 rounded-lg bg-[#5294c4] hover:bg-[#61a5d6] border-[3px] border-[#d96c2c] text-white font-hanken font-bold text-xl shadow-lg transition-transform active:scale-95"
              >
                Retry
              </button>
              <button
                onClick={() =>
                  onComplete({
                    won: true,
                    score: finishStats.totalWon,
                    coinsEarned: finishStats.totalWon,
                    summary: `${finishStats.headline} Finished Bosque de la Hoja in ${finishStats.elapsed.toFixed(1)}s (+${finishStats.timeBonus} time bonus & +${finishStats.coinBonus} trail coins).`
                  })
                }
                className="w-full py-2.5 rounded-lg bg-[#5294c4] hover:bg-[#61a5d6] border-[3px] border-[#d96c2c] text-white font-hanken font-bold text-xl shadow-lg transition-transform active:scale-95"
              >
                Return to map
              </button>
            </div>
          </div>
        )}

        {/* Touch / Mouse Controls for Tablets & Laptops */}
        {phase === 'playing' && (
          <div className="absolute bottom-3 inset-x-4 flex items-center justify-between pointer-events-none z-10">
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onMouseDown={() => { keysRef.current.left = true; }}
                onMouseUp={() => { keysRef.current.left = false; }}
                onMouseLeave={() => { keysRef.current.left = false; }}
                onTouchStart={(e) => { e.preventDefault(); keysRef.current.left = true; }}
                onTouchEnd={() => { keysRef.current.left = false; }}
                className="w-12 h-12 rounded-xl bg-slate-950/65 hover:bg-slate-900/80 border border-white/30 text-white font-bold text-xl shadow-lg active:scale-95"
                title="Move Left"
              >
                ◀
              </button>
              <button
                onMouseDown={() => { keysRef.current.right = true; }}
                onMouseUp={() => { keysRef.current.right = false; }}
                onMouseLeave={() => { keysRef.current.right = false; }}
                onTouchStart={(e) => { e.preventDefault(); keysRef.current.right = true; }}
                onTouchEnd={() => { keysRef.current.right = false; }}
                className="w-12 h-12 rounded-xl bg-slate-950/65 hover:bg-slate-900/80 border border-white/30 text-white font-bold text-xl shadow-lg active:scale-95"
                title="Move Right"
              >
                ▶
              </button>
            </div>

            <button
              onMouseDown={() => { keysRef.current.jump = true; }}
              onMouseUp={() => { keysRef.current.jump = false; }}
              onMouseLeave={() => { keysRef.current.jump = false; }}
              onTouchStart={(e) => { e.preventDefault(); keysRef.current.jump = true; }}
              onTouchEnd={() => { keysRef.current.jump = false; }}
              className="pointer-events-auto px-5 h-12 rounded-xl bg-amber-400/90 hover:bg-amber-300 border-2 border-white text-slate-950 font-display font-bold text-sm shadow-lg active:scale-95"
            >
              JUMP ↑
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
