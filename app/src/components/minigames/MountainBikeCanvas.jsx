import React, { useEffect, useRef, useState, useCallback } from 'react';
import { assetUrl } from '../../utils/assetUrl';

const CANVAS_W = 960;
const CANVAS_H = 540;
const GRAVITY = 1550; // px/s^2
const JUMP_VELOCITY = -590; // px/s
const MAX_SPEED = 360; // px/s
const ACCEL = 900; // px/s^2
const FRICTION = 680; // px/s^2

/**
 * Piecewise terrain definition for Bosque de la Hoja (Heredia).
 * Each segment:
 *  - type: 'ground' | 'bridge' | 'cliff'
 *  - x1, x2: world X range
 *  - y1, y2: surface Y at x1 and x2 (smaller Y = higher elevation)
 */
const TERRAIN_SEGMENTS = [
  // Start area with "BOSQUE DE LA HOJA LOS CHORRITOS" sign
  { type: 'ground', x1: 0, x2: 430, y1: 390, y2: 390 },
  // Wooden log bridge over blue pond (just like 00:05 in original video)
  { type: 'bridge', x1: 430, x2: 700, y1: 390, y2: 390 },
  // Flat green trail + first uphill ramps
  { type: 'ground', x1: 700, x2: 1020, y1: 390, y2: 390 },
  { type: 'ground', x1: 1020, x2: 1200, y1: 390, y2: 315 },
  { type: 'ground', x1: 1200, x2: 1380, y1: 315, y2: 315 },
  { type: 'ground', x1: 1380, x2: 1560, y1: 315, y2: 245 },
  { type: 'ground', x1: 1560, x2: 1860, y1: 245, y2: 245 },
  // First cliff jump!
  { type: 'cliff', x1: 1860, x2: 2020, y1: 700, y2: 700 },
  // Landing + gentle descent
  { type: 'ground', x1: 2020, x2: 2300, y1: 265, y2: 265 },
  { type: 'ground', x1: 2300, x2: 2560, y1: 265, y2: 365 },
  { type: 'ground', x1: 2560, x2: 2820, y1: 365, y2: 365 },
  // Second bridge over mountain stream
  { type: 'bridge', x1: 2820, x2: 3080, y1: 365, y2: 365 },
  // Steep climb into cypress forest
  { type: 'ground', x1: 3080, x2: 3260, y1: 365, y2: 365 },
  { type: 'ground', x1: 3260, x2: 3480, y1: 365, y2: 265 },
  { type: 'ground', x1: 3480, x2: 3720, y1: 265, y2: 265 },
  // Second cliff jump (medium)
  { type: 'cliff', x1: 3720, x2: 3900, y1: 700, y2: 700 },
  // Rolling hills
  { type: 'ground', x1: 3900, x2: 4180, y1: 280, y2: 280 },
  { type: 'ground', x1: 4180, x2: 4380, y1: 280, y2: 350 },
  { type: 'ground', x1: 4380, x2: 4600, y1: 350, y2: 255 },
  { type: 'ground', x1: 4600, x2: 4840, y1: 255, y2: 255 },
  // Third cliff jump (exciting leap with coins!)
  { type: 'cliff', x1: 4840, x2: 5030, y1: 700, y2: 700 },
  // Final downhill sprint & finish plateau
  { type: 'ground', x1: 5030, x2: 5280, y1: 285, y2: 380 },
  { type: 'ground', x1: 5280, x2: 6050, y1: 380, y2: 380 }
];

const FINISH_X = 5760;

/**
 * Helper: get ground height & slope angle at world X.
 */
function sampleTerrain(x) {
  for (let i = 0; i < TERRAIN_SEGMENTS.length; i++) {
    const seg = TERRAIN_SEGMENTS[i];
    if (x >= seg.x1 && x <= seg.x2) {
      if (seg.type === 'cliff') {
        return { isCliff: true, y: 9999, angle: 0, type: 'cliff' };
      }
      const t = (x - seg.x1) / Math.max(1, seg.x2 - seg.x1);
      const y = seg.y1 + (seg.y2 - seg.y1) * t;
      const angle = Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1);
      return { isCliff: false, y, angle, type: seg.type };
    }
  }
  return { isCliff: false, y: 380, angle: 0, type: 'ground' };
}

/**
 * Generate coins along ramps, flats, and cliff jump arcs.
 */
function createInitialCoins() {
  const specs = [
    // Over first bridge & uphill ramp
    { x: 560, dy: -58 },
    { x: 880, dy: -52 },
    { x: 1110, dy: -72 },
    { x: 1470, dy: -74 },
    { x: 1690, dy: -54 },
    // Arc over Cliff 1
    { x: 1940, yAbs: 155 },
    // Downhill & bridge 2
    { x: 2430, dy: -62 },
    { x: 2950, dy: -62 },
    // Cypress climb
    { x: 3370, dy: -75 },
    { x: 3600, dy: -55 },
    // Arc over Cliff 2
    { x: 3810, yAbs: 165 },
    // Rolling hills
    { x: 4280, dy: -64 },
    { x: 4490, dy: -76 },
    { x: 4720, dy: -55 },
    // Arc over Cliff 3
    { x: 4935, yAbs: 160 },
    // Final sprint
    { x: 5180, dy: -65 },
    { x: 5450, dy: -55 },
    { x: 5580, dy: -55 }
  ];

  return specs.map((s, idx) => {
    const t = sampleTerrain(s.x);
    const y = s.yAbs !== undefined ? s.yAbs : t.y + (s.dy || -55);
    return { id: idx, x: s.x, y, collected: false };
  });
}

/**
 * Pre-generate decorative trees, cypress pines, and bushes along ground segments.
 */
function createScenery() {
  const items = [];
  for (let x = 760; x < 5950; x += 92) {
    const t = sampleTerrain(x);
    if (t.isCliff || t.type === 'bridge') continue;
    const isCypress = x > 1400 && (Math.floor(x / 92) % 3 !== 0);
    items.push({
      x: x + ((x * 17) % 28) - 14,
      y: t.y,
      kind: isCypress ? 'cypress' : 'roundTree',
      scale: 0.85 + ((x * 13) % 30) / 100
    });
    if (Math.floor(x / 92) % 2 === 0) {
      items.push({
        x: x + 36,
        y: sampleTerrain(x + 36).y,
        kind: 'bush',
        scale: 0.9
      });
    }
  }
  return items;
}

const SCENERY = createScenery();

export default function MountainBikeCanvas({ character, onComplete, playSfx }) {
  const canvasRef = useRef(null);
  const isLisa = String(character || '').toLowerCase() === 'lisa';

  // Phase: 'intro1' -> 'intro2' -> 'countdown' -> 'playing' -> 'finished'
  const [phase, setPhase] = useState('intro1');
  const [countdownText, setCountdownText] = useState('Ready!');
  const [hudCoins, setHudCoins] = useState(0);
  const [hudTime, setHudTime] = useState(0);
  const [hudProgress, setHudProgress] = useState(0);
  const [lives, setLives] = useState(3);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const livesRef = useRef(lives);
  livesRef.current = lives;
  const doneRef = useRef(false);

  // Input state
  const keysRef = useRef({ left: false, right: false, jump: false });

  // Sprite images cache
  const spritesRef = useRef({ bikeFrames: [], coinImg: null });

  // Mutable game world state (kept in ref for 60fps loop)
  const worldRef = useRef({
    px: 260,
    py: 390,
    vx: 0,
    vy: 0,
    angle: 0,
    onGround: true,
    coyoteTimer: 0,
    animTime: 0,
    cameraX: 0,
    elapsed: 0,
    coinsCollected: 0,
    coins: createInitialCoins(),
    particles: [],
    popups: [],
    lastSafeX: 260,
    lastSafeY: 390
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

    const finishGame = (won, customSummary) => {
      if (doneRef.current) return;
      doneRef.current = true;
      setPhase('finished');
      const w = worldRef.current;

      if (won) {
        playSfx(47); // crowd.m4a
        const t = w.elapsed;
        let timeBonus = 250;
        let msg = 'Better luck next time!';
        if (t < 56) {
          timeBonus = 1500;
          msg = 'That was so fast!';
        } else if (t < 64) {
          timeBonus = 1000;
          msg = 'Nice speed!';
        } else if (t < 75) {
          timeBonus = 750;
          msg = 'Not bad!';
        }
        const coinBonus = w.coinsCollected * 100;
        onComplete({
          won: true,
          score: timeBonus + coinBonus,
          coinsEarned: timeBonus + coinBonus,
          summary: `${msg} Finished Bosque de la Hoja in ${t.toFixed(1)}s (+${timeBonus} time bonus & +${coinBonus} trail coins).`
        });
      } else {
        playSfx(37);
        onComplete({
          won: false,
          score: Math.round((w.px / FINISH_X) * 100),
          coinsEarned: w.coinsCollected * 100,
          summary: customSummary || 'Try harder next time! Watch out for the cliffs in Bosque de la Hoja.'
        });
      }
    };

    const update = (dt) => {
      const w = worldRef.current;
      w.animTime += dt;

      if (phaseRef.current !== 'playing') {
        // Gentle idle camera at start
        w.cameraX = Math.max(0, w.px - 240);
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

      // Coyote time for responsive jumps off ramps/cliffs
      if (w.onGround) {
        w.coyoteTimer = 0.12;
      } else {
        w.coyoteTimer = Math.max(0, w.coyoteTimer - dt);
      }

      // Jump trigger
      if (keys.jump && w.coyoteTimer > 0) {
        w.vy = JUMP_VELOCITY;
        w.onGround = false;
        w.coyoteTimer = 0;
        playSfx(29); // jump / pickup
      }

      // Apply gravity
      w.vy += GRAVITY * dt;
      w.py += w.vy * dt;

      // Terrain collision
      const ground = sampleTerrain(w.px);
      if (!ground.isCliff && w.py >= ground.y && w.vy >= -40) {
        w.py = ground.y;
        w.vy = 0;
        w.onGround = true;
        // Smoothly align bike tilt with ramp slope
        w.angle += (ground.angle - w.angle) * Math.min(1, dt * 14);
        // Save safe respawn spot on solid ground away from cliff edges
        const ahead = sampleTerrain(w.px + 70);
        if (!ahead.isCliff && ground.type === 'ground') {
          w.lastSafeX = Math.max(120, w.px - 40);
          w.lastSafeY = sampleTerrain(w.lastSafeX).y;
        }
      } else {
        w.onGround = false;
        // Subtle nose-up tilt when jumping, nose-down when falling
        const airAngle = Math.max(-0.35, Math.min(0.3, w.vy * 0.0005));
        w.angle += (airAngle - w.angle) * Math.min(1, dt * 6);
      }

      // Dust particles when pedaling on ground
      if (w.onGround && Math.abs(w.vx) > 70 && Math.random() < 0.45) {
        w.particles.push({
          x: w.px - 18,
          y: w.py - 4,
          vx: -w.vx * 0.25 + (Math.random() - 0.5) * 30,
          vy: -25 - Math.random() * 35,
          life: 0.45,
          maxLife: 0.45,
          r: 3 + Math.random() * 3
        });
      }

      // Update particles & floating +100 popups
      for (let i = w.particles.length - 1; i >= 0; i--) {
        const p = w.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) w.particles.splice(i, 1);
      }
      for (let i = w.popups.length - 1; i >= 0; i--) {
        const pop = w.popups[i];
        pop.y -= 45 * dt;
        pop.life -= dt;
        if (pop.life <= 0) w.popups.splice(i, 1);
      }

      // Coin collection (+100 each)
      for (let i = 0; i < w.coins.length; i++) {
        const c = w.coins[i];
        if (c.collected) continue;
        const dx = w.px - c.x;
        const dy = (w.py - 30) - c.y;
        if (dx * dx + dy * dy < 38 * 38) {
          c.collected = true;
          w.coinsCollected += 1;
          playSfx(35); // coins.m4a
          w.popups.push({ x: c.x, y: c.y - 10, text: '+100', life: 0.75 });
        }
      }

      // Check cliff fall
      if (w.py > CANVAS_H + 90) {
        playSfx(37); // wrong.m4a
        const nextLives = livesRef.current - 1;
        setLives(nextLives);
        if (nextLives <= 0) {
          finishGame(false, 'You fell into the cliffs! Use SPACE to jump across the gaps.');
          return;
        }
        // Respawn safely before cliff
        w.px = w.lastSafeX;
        w.py = w.lastSafeY - 12;
        w.vx = 0;
        w.vy = 0;
        w.angle = 0;
      }

      // Check finish line
      if (w.px >= FINISH_X) {
        finishGame(true);
        return;
      }

      // Smooth side-scrolling camera
      const targetCam = Math.max(0, Math.min(FINISH_X - CANVAS_W + 260, w.px - 280));
      w.cameraX += (targetCam - w.cameraX) * Math.min(1, dt * 8);

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

      // 1. Sky gradient (Bosque de la Hoja misty sky)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      skyGrad.addColorStop(0, '#8ec2c8');
      skyGrad.addColorStop(0.55, '#c7e2e4');
      skyGrad.addColorStop(1, '#e8f3ef');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // 2. Parallax Clouds (slowest layer)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (let i = 0; i < 8; i++) {
        const cx = ((i * 230 - camX * 0.12) % (CANVAS_W + 260) + (CANVAS_W + 260)) % (CANVAS_W + 260) - 130;
        const cy = 58 + (i % 3) * 34;
        ctx.beginPath();
        ctx.arc(cx, cy, 24, 0, Math.PI * 2);
        ctx.arc(cx + 22, cy - 8, 28, 0, Math.PI * 2);
        ctx.arc(cx + 48, cy, 22, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Parallax Distant Mountains (Volcán Barva peaks)
      ctx.fillStyle = '#7ea6a0';
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_H);
      for (let sx = -100; sx <= CANVAS_W + 200; sx += 160) {
        const worldPeak = sx - ((camX * 0.22) % 320);
        ctx.lineTo(worldPeak, 210 + Math.sin(sx * 0.015) * 45);
        ctx.lineTo(worldPeak + 80, 125 + Math.cos(sx * 0.02) * 35);
      }
      ctx.lineTo(CANVAS_W, CANVAS_H);
      ctx.closePath();
      ctx.fill();

      // 4. Parallax Rolling Green Hills (mid-far)
      ctx.fillStyle = '#97ba94';
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_H);
      for (let sx = 0; sx <= CANVAS_W + 40; sx += 40) {
        const wx = sx + camX * 0.4;
        const hy = 250 + Math.sin(wx * 0.0045) * 36 + Math.cos(wx * 0.009) * 16;
        ctx.lineTo(sx, hy);
      }
      ctx.lineTo(CANVAS_W, CANVAS_H);
      ctx.closePath();
      ctx.fill();

      // 5. Background Scenery (Trees, Cypress Pines, Bushes)
      for (let i = 0; i < SCENERY.length; i++) {
        const item = SCENERY[i];
        const sx = item.x - camX;
        if (sx < -120 || sx > CANVAS_W + 120) continue;
        const sy = item.y;

        if (item.kind === 'cypress') {
          // Tall cypress / pine tree (iconic Bosque de la Hoja)
          const h = 115 * item.scale;
          ctx.fillStyle = '#6b4423';
          ctx.fillRect(sx - 6, sy - 28, 12, 30);
          ctx.fillStyle = '#2d6a31';
          ctx.beginPath();
          ctx.moveTo(sx, sy - h);
          ctx.lineTo(sx - 30 * item.scale, sy - 22);
          ctx.lineTo(sx + 30 * item.scale, sy - 22);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#3f8f3a';
          ctx.beginPath();
          ctx.moveTo(sx, sy - h * 0.85);
          ctx.lineTo(sx - 24 * item.scale, sy - 38);
          ctx.lineTo(sx + 24 * item.scale, sy - 38);
          ctx.closePath();
          ctx.fill();
        } else if (item.kind === 'roundTree') {
          const r = 34 * item.scale;
          ctx.fillStyle = '#7a4b26';
          ctx.fillRect(sx - 7, sy - 42, 14, 44);
          ctx.fillStyle = '#5c9c31';
          ctx.beginPath();
          ctx.arc(sx, sy - 64 * item.scale, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#79be3b';
          ctx.beginPath();
          ctx.arc(sx - 8, sy - 70 * item.scale, r * 0.65, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Grassy bush
          ctx.fillStyle = '#6cb536';
          ctx.beginPath();
          ctx.arc(sx, sy - 8, 14, Math.PI, 0);
          ctx.arc(sx + 14, sy - 6, 11, Math.PI, 0);
          ctx.fill();
        }
      }

      // 6. Start Sign: "BOSQUE DE LA HOJA LOS CHORRITOS"
      const signX = 215 - camX;
      if (signX > -160 && signX < CANVAS_W + 160) {
        const signY = 390;
        ctx.fillStyle = '#7a4b26';
        ctx.fillRect(signX - 42, signY - 62, 8, 62);
        ctx.fillRect(signX + 34, signY - 62, 8, 62);
        ctx.fillStyle = '#f8f5ec';
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 4;
        ctx.fillRect(signX - 56, signY - 96, 112, 46);
        ctx.strokeRect(signX - 56, signY - 96, 112, 46);
        ctx.fillStyle = '#991b1b';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BOSQUE DE', signX, signY - 80);
        ctx.fillText('LA HOJA', signX, signY - 67);
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('LOS CHORRITOS', signX, signY - 56);
      }

      // 7. Terrain Segments (Dirt + Grass, Bridges + Water, Cliffs + Warning Signs)
      for (let i = 0; i < TERRAIN_SEGMENTS.length; i++) {
        const seg = TERRAIN_SEGMENTS[i];
        const sx1 = seg.x1 - camX;
        const sx2 = seg.x2 - camX;
        if (sx2 < -50 || sx1 > CANVAS_W + 50) continue;

        if (seg.type === 'ground') {
          // Dirt body
          ctx.fillStyle = '#b67d4b';
          ctx.beginPath();
          ctx.moveTo(sx1, seg.y1);
          ctx.lineTo(sx2, seg.y2);
          ctx.lineTo(sx2, CANVAS_H + 20);
          ctx.lineTo(sx1, CANVAS_H + 20);
          ctx.closePath();
          ctx.fill();

          // Subtle checkered soil texture
          ctx.fillStyle = 'rgba(120, 72, 34, 0.22)';
          const step = 28;
          const startGridX = Math.floor(seg.x1 / step) * step;
          for (let gx = startGridX; gx < seg.x2; gx += step) {
            const localT = Math.max(0, Math.min(1, (gx - seg.x1) / Math.max(1, seg.x2 - seg.x1)));
            const topY = seg.y1 + (seg.y2 - seg.y1) * localT + 14;
            for (let gy = Math.floor(topY / step) * step; gy < CANVAS_H; gy += step) {
              if (((gx / step) + (gy / step)) % 2 === 0) {
                ctx.fillRect(gx - camX, gy, step, step);
              }
            }
          }

          // Bright green grass top layer
          ctx.strokeStyle = '#6ec239';
          ctx.lineWidth = 14;
          ctx.lineCap = 'butt';
          ctx.beginPath();
          ctx.moveTo(sx1, seg.y1 + 5);
          ctx.lineTo(sx2, seg.y2 + 5);
          ctx.stroke();

          ctx.strokeStyle = '#4e9b26';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(sx1, seg.y1 + 13);
          ctx.lineTo(sx2, seg.y2 + 13);
          ctx.stroke();
        } else if (seg.type === 'bridge') {
          // Sparkling water underneath bridge
          const waterY = seg.y1 + 26;
          ctx.fillStyle = '#7ad1e6';
          ctx.fillRect(sx1, waterY, sx2 - sx1, CANVAS_H - waterY + 20);
          ctx.fillStyle = '#a8e6f5';
          ctx.fillRect(sx1, waterY, sx2 - sx1, 10);

          // Wooden log bridge planks
          const logStep = 18;
          for (let lx = seg.x1; lx < seg.x2; lx += logStep) {
            const screenLx = lx - camX;
            ctx.fillStyle = '#a66b3c';
            ctx.beginPath();
            ctx.arc(screenLx + 9, seg.y1 + 6, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#6b3e1b';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        } else if (seg.type === 'cliff') {
          // Warning sign right before the cliff!
          const warnX = sx1 - 36;
          const prevGround = sampleTerrain(seg.x1 - 36);
          if (warnX > -40 && warnX < CANVAS_W + 40) {
            const wy = prevGround.y;
            ctx.fillStyle = '#5c3a21';
            ctx.fillRect(warnX - 3, wy - 38, 6, 38);
            ctx.fillStyle = '#facc15';
            ctx.strokeStyle = '#111827';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(warnX, wy - 64);
            ctx.lineTo(warnX - 18, wy - 34);
            ctx.lineTo(warnX + 18, wy - 34);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#111827';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('!', warnX, wy - 40);
          }
        }
      }

      // 8. Finish Line Banner
      const finX = FINISH_X - camX;
      if (finX > -80 && finX < CANVAS_W + 80) {
        const fy = sampleTerrain(FINISH_X).y;
        ctx.fillStyle = '#334155';
        ctx.fillRect(finX - 5, fy - 140, 10, 140);
        // Checkered flag
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 6; c++) {
            ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#111827';
            ctx.fillRect(finX + 5 + c * 11, fy - 138 + r * 11, 11, 11);
          }
        }
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FINISH', finX + 36, fy - 146);
      }

      // 9. Coins (original sprites/moneda.png with gentle bob)
      const coinImg = spritesRef.current.coinImg;
      for (let i = 0; i < w.coins.length; i++) {
        const c = w.coins[i];
        if (c.collected) continue;
        const sx = c.x - camX;
        if (sx < -40 || sx > CANVAS_W + 40) continue;
        const bob = Math.sin(w.animTime * 5 + i) * 5;
        if (coinImg && coinImg.complete && coinImg.naturalWidth > 0) {
          ctx.drawImage(coinImg, sx - 17, c.y + bob - 17, 34, 34);
        } else {
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(sx, c.y + bob, 14, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 10. Dust Particles
      for (let i = 0; i < w.particles.length; i++) {
        const p = w.particles[i];
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = `rgba(146, 98, 56, ${alpha * 0.7})`;
        ctx.beginPath();
        ctx.arc(p.x - camX, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 11. Player Cyclist (Original Mike/Lisa Bike Sprites + Slope Rotation)
      const frames = spritesRef.current.bikeFrames;
      const frameIdx =
        Math.abs(w.vx) > 15
          ? Math.floor(w.animTime * (6 + Math.abs(w.vx) * 0.03)) % Math.max(1, frames.length)
          : 0;
      const bikeImg = frames[frameIdx];

      ctx.save();
      ctx.translate(w.px - camX, w.py - 28);
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

      // 12. Floating +100 Coin Popups
      for (let i = 0; i < w.popups.length; i++) {
        const pop = w.popups[i];
        ctx.fillStyle = `rgba(253, 224, 71, ${Math.min(1, pop.life * 1.5)})`;
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.lineWidth = 3;
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeText(pop.text, pop.x - camX, pop.y);
        ctx.fillText(pop.text, pop.x - camX, pop.y);
      }
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
  }, [onComplete, playSfx]);

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-900 overflow-hidden select-none">
      {/* Compact Top Race Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-950/85 border-b border-emerald-400/40 text-white z-10 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-amber-300">
            ⏱ {hudTime.toFixed(1)}s
          </span>
          <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/60 text-amber-300 font-bold">
            🪙 +{hudCoins}
          </span>
          <span className="text-rose-400 font-bold" title="Lives">
            {'❤️'.repeat(Math.max(0, lives))}
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
      <div className="relative flex-1 w-full flex items-center justify-center bg-[#8ec2c8] overflow-hidden">
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
              <div className="self-center mb-6 flex items-center gap-6 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-2xl border-2 border-slate-700 shadow-xl">
                <div className="px-8 py-2 rounded-lg bg-slate-200 border-b-4 border-slate-400 text-slate-800 font-bold text-sm">
                  SPACE (Jump)
                </div>
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-sm">
                  <span className="px-2.5 py-1.5 rounded bg-slate-200 border-b-4 border-slate-400">←</span>
                  <span className="px-2.5 py-1.5 rounded bg-slate-200 border-b-4 border-slate-400">→</span>
                </div>
              </div>
            )}

            <div className="w-full max-w-[820px] mx-auto rounded-2xl border-4 border-slate-200 bg-slate-800/95 text-white p-4 sm:p-5 shadow-2xl">
              <div className="inline-block px-3 py-0.5 -mt-8 mb-2 rounded-lg bg-slate-200 text-slate-900 font-bold text-xs tracking-wider uppercase shadow">
                INSTRUCTIONS
              </div>
              <p className="font-hanken text-lg sm:text-xl text-white">
                {phase === 'intro1'
                  ? 'Go as fast as you can, but be careful not to fall into the cliffs.'
                  : 'Use the arrow keys to move and space bar to jump.'}
              </p>
              <div className="text-right text-xs text-amber-300 font-bold mt-2 animate-pulse">
                Click or press SPACE to continue ▸
              </div>
            </div>
          </div>
        )}

        {/* Ready! Set! Goooo! Countdown Overlay */}
        {phase === 'countdown' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <div
              className="font-hanken font-extrabold text-white tracking-wide drop-shadow-[0_4px_10px_rgba(0,0,0,0.65)]"
              style={{ fontSize: 'clamp(44px, 7vw, 72px)' }}
            >
              {countdownText}
            </div>
          </div>
        )}

        {/* Touch / Mouse Controls for Tablets & Laptops */}
        {phase === 'playing' && (
          <div className="absolute bottom-3 inset-x-4 z-20 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                type="button"
                onMouseDown={() => (keysRef.current.left = true)}
                onMouseUp={() => (keysRef.current.left = false)}
                onMouseLeave={() => (keysRef.current.left = false)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  keysRef.current.left = true;
                }}
                onTouchEnd={() => (keysRef.current.left = false)}
                className="w-12 h-12 rounded-2xl bg-slate-900/70 hover:bg-slate-900/90 border-2 border-white/50 text-white font-bold text-xl shadow-lg active:scale-95"
              >
                ◀
              </button>
              <button
                type="button"
                onMouseDown={() => (keysRef.current.right = true)}
                onMouseUp={() => (keysRef.current.right = false)}
                onMouseLeave={() => (keysRef.current.right = false)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  keysRef.current.right = true;
                }}
                onTouchEnd={() => (keysRef.current.right = false)}
                className="w-12 h-12 rounded-2xl bg-slate-900/70 hover:bg-slate-900/90 border-2 border-white/50 text-white font-bold text-xl shadow-lg active:scale-95"
              >
                ▶
              </button>
            </div>

            <button
              type="button"
              onMouseDown={() => (keysRef.current.jump = true)}
              onMouseUp={() => (keysRef.current.jump = false)}
              onMouseLeave={() => (keysRef.current.jump = false)}
              onTouchStart={(e) => {
                e.preventDefault();
                keysRef.current.jump = true;
              }}
              onTouchEnd={() => (keysRef.current.jump = false)}
              className="pointer-events-auto px-6 h-12 rounded-2xl bg-emerald-600/85 hover:bg-emerald-500 border-2 border-white/60 text-white font-bold text-sm tracking-wider uppercase shadow-lg active:scale-95"
            >
              JUMP
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
