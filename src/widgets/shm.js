import katex from 'katex';

// Simple Harmonic Motion (SHM) widget.
//
// Animates a mass on a spring: y(t) = A sin(ωt). Simultaneously plots three
// time-traces:
//   y(t)   = A sin(ωt)           — position
//   y'(t)  = A·ω cos(ωt)         — velocity  (max magnitude Aω at zero crossing)
//   y''(t) = -A·ω² sin(ωt) = -ω²·y(t)   — acceleration (max magnitude Aω² at extremes)
//
// Pedagogical payoff (paired with the sine-derivative-and-waves lesson):
//   - Sees the 90° phase shift between position and velocity.
//   - Sees that acceleration is the NEGATIVE of position (scaled) — the
//     defining SHM relation y'' = -ω² y.
//   - Max speed occurs at y = 0 (zero crossing); max acceleration at y = ±A.
//
// Config (all optional):
//   amplitude     A (default 1)
//   omega         angular frequency ω (default 2)
//   speed         playback speed multiplier (default 1)
//   show          which curves to plot: 'all' (default) | 'pos' | 'pos-vel' | 'pos-acc'

const SVG_W = 720;
const SVG_H = 420;

// Panel layout: [spring panel | time-trace panel]
const SPRING_W = 200;
const TRACE_X = SPRING_W;
const TRACE_W = SVG_W - TRACE_X;

// Vertical axis on the spring panel: y ranges over [-1.2A, +1.2A]
// Mass marker bobs along the spring; spring drawn as a zigzag.
const MASS_R = 16;

// Time-trace panel: x is time, y is one of position/velocity/acceleration.
// We re-scale velocity and acceleration to display on the same axes as
// position for visual clarity (separate colored curves, each normalized to
// fit the same vertical range as position).
const T_WINDOW = 4 * Math.PI; // show ~2 full periods at ω = 1

const COLORS = {
  bg: '#fafbfc',
  springPanel: '#f3f4f6',
  spring: '#475569',
  wall: '#1e293b',
  mass: '#2563eb',
  massHi: '#bfdbfe',
  axis: '#94a3b8',
  axisFaint: '#e2e8f0',
  pos: '#1e40af',     // position curve (blue)
  vel: '#059669',     // velocity (green)
  acc: '#dc2626',     // acceleration (red)
  text: '#0f172a',
  textMuted: '#64748b',
};

const DEFAULTS = {
  amplitude: 1,
  omega: 2,
  speed: 1,
  show: 'all',
};

const tex = (s) => {
  try { return katex.renderToString(s, { throwOnError: false }); }
  catch { return s; }
};

const fmt = (n, dp = 2) => {
  const v = Number(n);
  if (Math.abs(v) < 1e-10) return '0';
  return parseFloat(v.toFixed(dp)).toString();
};

// Project (t, value) to SVG coordinates in the trace panel.
// t in [0, T_WINDOW] → x in [TRACE_X + 30, SVG_W - 20]
// value in [-1.2, 1.2] → y in [SVG_H - 20, 20] (flipped because SVG y grows down)
function makeTraceProj() {
  const xPad = 30;
  const yPad = 20;
  const tMin = 0, tMax = T_WINDOW;
  const vMin = -1.2, vMax = 1.2;
  const xL = TRACE_X + xPad;
  const xR = SVG_W - 10;
  const yT = yPad;
  const yB = SVG_H - yPad;
  return {
    sx: (t) => xL + ((t - tMin) / (tMax - tMin)) * (xR - xL),
    sy: (v) => yB - ((v - vMin) / (vMax - vMin)) * (yB - yT),
    bounds: { xL, xR, yT, yB },
  };
}

// Project (just) a value in [-1.2, 1.2] to SVG y in the spring panel.
function springY(value) {
  const yMid = SVG_H / 2;
  const yRange = SVG_H / 2 - 50; // padding top/bottom
  return yMid - value * yRange / 1.2;
}

function drawSpring(ceilingY, massY) {
  const cx = SPRING_W / 2;
  const segs = 14;
  const totalH = massY - ceilingY;
  const dy = totalH / segs;
  const amp = 14;
  let path = `M ${cx} ${ceilingY} `;
  for (let i = 1; i <= segs; i++) {
    const sign = i % 2 === 0 ? -1 : 1;
    const y = ceilingY + i * dy;
    path += `L ${cx + sign * amp} ${y - dy * 0.5} L ${cx} ${y} `;
  }
  return `<path d="${path}" stroke="${COLORS.spring}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function drawCeiling() {
  const ceilingY = 30;
  let svg = `<rect x="0" y="0" width="${SPRING_W}" height="${ceilingY}" fill="${COLORS.wall}" opacity="0.85"/>`;
  // diagonal hash lines for the ceiling
  for (let x = 0; x < SPRING_W; x += 14) {
    svg += `<line x1="${x}" y1="${ceilingY}" x2="${x + 10}" y2="${ceilingY + 8}" stroke="${COLORS.wall}" stroke-width="1.5"/>`;
  }
  return svg;
}

function tracePath(fn, proj) {
  const samples = 220;
  const tMin = 0, tMax = T_WINDOW;
  let path = '';
  for (let i = 0; i <= samples; i++) {
    const t = tMin + (tMax - tMin) * i / samples;
    const v = fn(t);
    const cmd = i === 0 ? 'M' : 'L';
    path += `${cmd} ${proj.sx(t)} ${proj.sy(v)} `;
  }
  return path;
}

function gridAndAxes(proj) {
  let svg = '';
  // axes
  const yZero = proj.sy(0);
  const xZero = proj.sx(0);
  svg += `<line x1="${proj.bounds.xL}" y1="${yZero}" x2="${proj.bounds.xR}" y2="${yZero}" stroke="${COLORS.axis}" stroke-width="1.5"/>`;
  svg += `<line x1="${xZero}" y1="${proj.bounds.yT}" x2="${xZero}" y2="${proj.bounds.yB}" stroke="${COLORS.axis}" stroke-width="1.5"/>`;
  // value gridlines
  for (let v = -1; v <= 1; v++) {
    if (v === 0) continue;
    const y = proj.sy(v);
    svg += `<line x1="${proj.bounds.xL}" y1="${y}" x2="${proj.bounds.xR}" y2="${y}" stroke="${COLORS.axisFaint}" stroke-width="1"/>`;
    svg += `<text x="${proj.bounds.xL - 6}" y="${y + 4}" font-size="11" fill="${COLORS.textMuted}" text-anchor="end">${v}</text>`;
  }
  // time tick marks at multiples of π
  for (let k = 1; k <= Math.floor(T_WINDOW / Math.PI); k++) {
    const t = k * Math.PI;
    const x = proj.sx(t);
    svg += `<line x1="${x}" y1="${yZero - 4}" x2="${x}" y2="${yZero + 4}" stroke="${COLORS.axis}" stroke-width="1"/>`;
    svg += `<text x="${x}" y="${yZero + 18}" font-size="11" fill="${COLORS.textMuted}" text-anchor="middle">${k}π</text>`;
  }
  // axis labels
  svg += `<text x="${proj.bounds.xR - 5}" y="${yZero - 6}" font-size="11" fill="${COLORS.textMuted}" text-anchor="end" font-style="italic">ωt</text>`;
  return svg;
}

export function mountShm(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = {
    amplitude: cfg.amplitude,
    omega: cfg.omega,
    speed: cfg.speed,
    show: cfg.show,
    playing: true,
    t0: performance.now(),
    phase: 0, // accumulated phase (ωt) — survives pausing
  };

  target.innerHTML = `
    <div class="shm-wrap">
      <svg class="shm-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Simple Harmonic Motion">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <rect x="0" y="0" width="${SPRING_W}" height="${SVG_H}" fill="${COLORS.springPanel}"/>
        <g data-shm-ceiling></g>
        <g data-shm-static-trace></g>
        <g data-shm-grid></g>
        <g data-shm-curves></g>
        <g data-shm-spring></g>
        <g data-shm-mass></g>
        <g data-shm-readout></g>
      </svg>
      <div class="shm-controls">
        <div class="shm-row">
          <label>amplitude $A$</label>
          <input type="range" data-shm-a min="0.2" max="1.2" step="0.05" value="${state.amplitude}"/>
          <span class="val" data-shm-aval>${fmt(state.amplitude, 2)}</span>
        </div>
        <div class="shm-row">
          <label>frequency $\\omega$</label>
          <input type="range" data-shm-w min="0.5" max="4" step="0.1" value="${state.omega}"/>
          <span class="val" data-shm-wval>${fmt(state.omega, 2)}</span>
        </div>
        <div class="shm-row">
          <label>show</label>
          <select data-shm-show>
            <option value="all"${state.show === 'all' ? ' selected' : ''}>position + velocity + acceleration</option>
            <option value="pos"${state.show === 'pos' ? ' selected' : ''}>position only</option>
            <option value="pos-vel"${state.show === 'pos-vel' ? ' selected' : ''}>position + velocity</option>
            <option value="pos-acc"${state.show === 'pos-acc' ? ' selected' : ''}>position + acceleration</option>
          </select>
        </div>
        <div class="shm-row">
          <button data-shm-play class="shm-btn">${state.playing ? '⏸ Pause' : '▶ Play'}</button>
          <button data-shm-reset class="shm-btn">↻ Reset</button>
        </div>
        <div class="shm-readout-text" data-shm-readout-text></div>
      </div>
    </div>
  `;

  const g = (sel) => target.querySelector(sel);
  const gCeiling = g('[data-shm-ceiling]');
  const gStatic = g('[data-shm-static-trace]');
  const gGrid = g('[data-shm-grid]');
  const gCurves = g('[data-shm-curves]');
  const gSpring = g('[data-shm-spring]');
  const gMass = g('[data-shm-mass]');
  const gReadout = g('[data-shm-readout]');
  const readoutTextBox = g('[data-shm-readout-text]');

  // Render KaTeX in labels
  target.querySelectorAll('.shm-controls label').forEach((el) => {
    el.innerHTML = el.innerHTML.replace(/\$([^$]+)\$/g, (_, t) => tex(t));
  });

  const proj = makeTraceProj();
  gCeiling.innerHTML = drawCeiling();
  gGrid.innerHTML = gridAndAxes(proj);

  function redrawCurves() {
    const { amplitude: A, omega: w, show } = state;
    // Normalize so all three fit the [-1.2, 1.2] visual range:
    //   position: A (scale 1)
    //   velocity: Aω (scale 1/ω so peak shown is A)
    //   acceleration: Aω² (scale 1/ω² so peak shown is A)
    const posFn = (t) => A * Math.sin(w * t);
    const velFnScaled = (t) => A * Math.cos(w * t); // velocity rescaled by 1/ω
    const accFnScaled = (t) => -A * Math.sin(w * t); // accel rescaled by 1/ω²
    let html = '';
    const showVel = show === 'all' || show === 'pos-vel';
    const showAcc = show === 'all' || show === 'pos-acc';
    if (showAcc) {
      const d = tracePath(accFnScaled, proj);
      html += `<path d="${d}" stroke="${COLORS.acc}" stroke-width="2" fill="none" opacity="0.85" stroke-dasharray="4 3"/>`;
    }
    if (showVel) {
      const d = tracePath(velFnScaled, proj);
      html += `<path d="${d}" stroke="${COLORS.vel}" stroke-width="2" fill="none" opacity="0.85" stroke-dasharray="2 2"/>`;
    }
    // Position always shown
    const dPos = tracePath(posFn, proj);
    html += `<path d="${dPos}" stroke="${COLORS.pos}" stroke-width="2.6" fill="none"/>`;
    gCurves.innerHTML = html;

    // Static legend at top-right
    let legend = '';
    let legendX = SVG_W - 200;
    let legendY = 30;
    legend += `<rect x="${legendX - 8}" y="${legendY - 14}" width="200" height="${showVel || showAcc ? 70 : 28}" fill="white" stroke="${COLORS.axisFaint}" rx="4"/>`;
    legend += `<line x1="${legendX}" y1="${legendY}" x2="${legendX + 18}" y2="${legendY}" stroke="${COLORS.pos}" stroke-width="2.6"/>`;
    legend += `<text x="${legendX + 24}" y="${legendY + 4}" font-size="11" fill="${COLORS.text}">y(t) — position</text>`;
    if (showVel) {
      legendY += 18;
      legend += `<line x1="${legendX}" y1="${legendY}" x2="${legendX + 18}" y2="${legendY}" stroke="${COLORS.vel}" stroke-width="2" stroke-dasharray="2 2"/>`;
      legend += `<text x="${legendX + 24}" y="${legendY + 4}" font-size="11" fill="${COLORS.text}">y'(t) ÷ ω — velocity</text>`;
    }
    if (showAcc) {
      legendY += 18;
      legend += `<line x1="${legendX}" y1="${legendY}" x2="${legendX + 18}" y2="${legendY}" stroke="${COLORS.acc}" stroke-width="2" stroke-dasharray="4 3"/>`;
      legend += `<text x="${legendX + 24}" y="${legendY + 4}" font-size="11" fill="${COLORS.text}">y''(t) ÷ ω² — acceleration</text>`;
    }
    gStatic.innerHTML = legend;
  }

  function updateReadoutText() {
    const A = state.amplitude;
    const w = state.omega;
    const T = (2 * Math.PI / w).toFixed(2);
    const maxV = (A * w).toFixed(2);
    const maxA = (A * w * w).toFixed(2);
    let html = '';
    html += `<div class="shm-stats">`;
    html += `<div><strong>Period $T = 2\\pi/\\omega$:</strong> ${T}</div>`;
    html += `<div><strong>Max speed $A\\omega$:</strong> ${maxV} (at $y = 0$ crossings)</div>`;
    html += `<div><strong>Max accel $A\\omega^2$:</strong> ${maxA} (at $y = \\pm A$ extremes)</div>`;
    html += `<div><strong>SHM equation:</strong> $y''(t) = -\\omega^2\\,y(t) = -${(w * w).toFixed(2)}\\,y(t)$</div>`;
    html += `</div>`;
    readoutTextBox.innerHTML = html.replace(/\$([^$]+)\$/g, (_, t) => tex(t));
  }

  function tick() {
    if (state.playing) {
      const now = performance.now();
      const dt = (now - state.t0) / 1000;
      state.phase += dt * state.omega * state.speed;
      state.t0 = now;
    }
    // Wrap the trace position around the time window for endless animation
    const phaseT = (state.phase / state.omega) % T_WINDOW;
    const currentY = state.amplitude * Math.sin(state.omega * phaseT);

    // Spring + mass
    const cx = SPRING_W / 2;
    const ceilingY = 30;
    const massY = springY(currentY);
    gSpring.innerHTML = drawSpring(ceilingY, massY);
    gMass.innerHTML =
      `<circle cx="${cx}" cy="${massY}" r="${MASS_R}" fill="${COLORS.mass}" stroke="white" stroke-width="3"/>` +
      `<circle cx="${cx - 4}" cy="${massY - 4}" r="${MASS_R / 2.4}" fill="${COLORS.massHi}" opacity="0.5"/>`;

    // Cursor on the trace panel showing where we are in the cycle
    const cursorX = proj.sx(phaseT);
    const cursorYPos = proj.sy(currentY / state.amplitude);
    let cursorSvg = `<line x1="${cursorX}" y1="${proj.bounds.yT}" x2="${cursorX}" y2="${proj.bounds.yB}" stroke="${COLORS.axisFaint}" stroke-width="1" stroke-dasharray="3 3"/>`;
    cursorSvg += `<circle cx="${cursorX}" cy="${cursorYPos}" r="5" fill="${COLORS.pos}" stroke="white" stroke-width="2"/>`;
    gReadout.innerHTML = cursorSvg;

    requestAnimationFrame(tick);
  }

  // Initial draw
  redrawCurves();
  updateReadoutText();
  requestAnimationFrame(tick);

  // Wire up controls
  g('[data-shm-a]').addEventListener('input', (e) => {
    state.amplitude = parseFloat(e.target.value);
    g('[data-shm-aval]').textContent = fmt(state.amplitude, 2);
    redrawCurves();
    updateReadoutText();
  });
  g('[data-shm-w]').addEventListener('input', (e) => {
    state.omega = parseFloat(e.target.value);
    g('[data-shm-wval]').textContent = fmt(state.omega, 2);
    redrawCurves();
    updateReadoutText();
  });
  g('[data-shm-show]').addEventListener('change', (e) => {
    state.show = e.target.value;
    redrawCurves();
  });
  g('[data-shm-play]').addEventListener('click', (e) => {
    state.playing = !state.playing;
    state.t0 = performance.now();
    e.target.textContent = state.playing ? '⏸ Pause' : '▶ Play';
  });
  g('[data-shm-reset]').addEventListener('click', () => {
    state.phase = 0;
    state.t0 = performance.now();
  });
}
