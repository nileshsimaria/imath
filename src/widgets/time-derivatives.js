import katex from 'katex';

// Time-Derivatives widget (Thompson "Calculus Made Easy", Ch 8 "When time varies").
//
// Three stacked plots, one shared time axis:
//   s(t)   — position
//   v(t)   = s'(t) — velocity
//   a(t)   = v'(t) — acceleration
//
// Drag the time slider (or hit Play) and the cursor moves across all three
// plots together. Three motion profiles are provided:
//   ball-thrown-up  — quadratic s, linear v, constant a = -g
//   drag-race       — quadratic s, linear v, constant a > 0
//   oscillation     — sinusoidal s, cosine v, sinusoidal a = -s (SHM)
//
// Pedagogical payoff: students see that 'rate of change of rate of change'
// is a physical thing — not just calculus exercise. The same operation
// (differentiate w.r.t. t) applied TWICE turns position into acceleration.
//
// Config:
//   profile  starting motion profile (default 'ball-thrown-up')

const SVG_W = 720;
const SVG_H = 540;

const HEADER_H = 8;
const PLOT_GAP = 16;
const AXIS_PAD = 26;
const PLOT_H = (SVG_H - HEADER_H - 3 * PLOT_GAP - AXIS_PAD) / 3;
const LEFT_PAD = 70;
const RIGHT_PAD = 24;
const PLOT_W = SVG_W - LEFT_PAD - RIGHT_PAD;

const COLORS = {
  bg: '#fafbfc',
  panel: '#ffffff',
  axis: '#94a3b8',
  axisFaint: '#e2e8f0',
  pos: '#1e40af',
  vel: '#059669',
  acc: '#dc2626',
  cursor: '#0f172a',
  text: '#0f172a',
  textMuted: '#64748b',
};

const PROFILES = {
  'ball-thrown-up': {
    label: 'Ball thrown straight up',
    s: (t) => 20 + 25 * t - 4.9 * t * t,
    v: (t) => 25 - 9.8 * t,
    a: () => -9.8,
    tMax: 6,
    sLabel: 'height s (m)',
    vLabel: 'velocity v (m/s)',
    aLabel: 'acceleration a (m/s²)',
    formula: 's(t) = 20 + 25t - 4.9t^2',
    note: 'Gravity tugs at -9.8 m/s^2 the entire flight — even on the way up. That constant pull is exactly what acceleration is reporting.'
  },
  'drag-race': {
    label: 'Drag race (constant acceleration)',
    s: (t) => t * t,
    v: (t) => 2 * t,
    a: () => 2,
    tMax: 5,
    sLabel: 'distance s (m)',
    vLabel: 'speed v (m/s)',
    aLabel: 'acceleration a (m/s²)',
    formula: 's(t) = t^2,\\ \\text{so}\\ v = 2t,\\ a = 2',
    note: 'Acceleration constant → velocity climbs in a straight line → distance curves up like a parabola. Each "differentiate" step strips one power of t.'
  },
  'oscillation': {
    label: 'Mass on a spring (oscillation)',
    s: (t) => 2 * Math.sin(t),
    v: (t) => 2 * Math.cos(t),
    a: (t) => -2 * Math.sin(t),
    tMax: 2 * Math.PI,
    sLabel: 'displacement s (m)',
    vLabel: 'velocity v (m/s)',
    aLabel: 'acceleration a (m/s²)',
    formula: 's(t) = 2\\sin t,\\ v = 2\\cos t,\\ a = -2\\sin t',
    note: 'a(t) is the NEGATIVE of s(t). The spring pulls back hardest when you stretch farthest — that’s why y\'\' = -y is the law of every oscillator.'
  },
};

const DEFAULTS = { profile: 'ball-thrown-up' };

const tex = (s) => {
  try { return katex.renderToString(s, { throwOnError: false }); }
  catch { return s; }
};

const fmt = (n, dp = 2) => {
  const v = Number(n);
  if (Math.abs(v) < 1e-10) return '0';
  return parseFloat(v.toFixed(dp)).toString();
};

function rangeOf(fn, tMax, samples = 120) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i <= samples; i++) {
    const t = (tMax * i) / samples;
    const v = fn(t);
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  lo = Math.min(0, lo);
  hi = Math.max(0, hi);
  const span = hi - lo;
  const pad = Math.max(0.5, span * 0.1);
  lo -= pad * 0.4;
  hi += pad * 0.4;
  if (Math.abs(hi - lo) < 0.5) { hi += 0.5; lo -= 0.5; }
  return [lo, hi];
}

function makeProj(plotTop, plotH, tMax, [yLo, yHi]) {
  const xL = LEFT_PAD;
  const xR = LEFT_PAD + PLOT_W;
  const yT = plotTop;
  const yB = plotTop + plotH;
  return {
    sx: (t) => xL + (t / tMax) * (xR - xL),
    sy: (v) => yB - ((v - yLo) / (yHi - yLo)) * (yB - yT),
    yLo, yHi, tMax, xL, xR, yT, yB,
  };
}

function panelSvg(label, color, fn, proj, curT, curV) {
  let svg = '';
  svg += `<rect x="${proj.xL}" y="${proj.yT}" width="${proj.xR - proj.xL}" height="${proj.yB - proj.yT}" fill="${COLORS.panel}" stroke="${COLORS.axisFaint}"/>`;
  // y=0 dashed line if zero is in range
  if (proj.yLo < 0 && proj.yHi > 0) {
    const y0 = proj.sy(0);
    svg += `<line x1="${proj.xL}" y1="${y0}" x2="${proj.xR}" y2="${y0}" stroke="${COLORS.axis}" stroke-width="1" stroke-dasharray="3 3" opacity="0.6"/>`;
  }
  // y-axis ticks (bottom, middle, top)
  for (let k = 0; k <= 2; k++) {
    const v = proj.yLo + ((proj.yHi - proj.yLo) * k) / 2;
    const y = proj.sy(v);
    svg += `<text x="${proj.xL - 6}" y="${y + 4}" font-size="11" fill="${COLORS.textMuted}" text-anchor="end">${fmt(v, 1)}</text>`;
    svg += `<line x1="${proj.xL - 3}" y1="${y}" x2="${proj.xL}" y2="${y}" stroke="${COLORS.axis}" stroke-width="1"/>`;
  }
  // curve
  const samples = 200;
  let path = '';
  for (let i = 0; i <= samples; i++) {
    const t = (proj.tMax * i) / samples;
    const v = fn(t);
    path += `${i === 0 ? 'M' : 'L'} ${proj.sx(t).toFixed(2)} ${proj.sy(v).toFixed(2)} `;
  }
  svg += `<path d="${path}" stroke="${color}" stroke-width="2.6" fill="none"/>`;
  // cursor line
  const cX = proj.sx(curT);
  const cY = proj.sy(curV);
  svg += `<line x1="${cX}" y1="${proj.yT}" x2="${cX}" y2="${proj.yB}" stroke="${COLORS.cursor}" stroke-width="1" stroke-dasharray="3 3" opacity="0.55"/>`;
  svg += `<circle cx="${cX}" cy="${cY}" r="6" fill="${color}" stroke="white" stroke-width="2"/>`;
  // label inside the panel (top-left)
  svg += `<text x="${proj.xL + 8}" y="${proj.yT + 15}" font-size="12" font-weight="600" fill="${color}">${label}</text>`;
  // current value (top-right)
  svg += `<text x="${proj.xR - 8}" y="${proj.yT + 15}" font-size="13" font-weight="700" fill="${COLORS.text}" text-anchor="end">= ${fmt(curV)}</text>`;
  return svg;
}

function timeAxisSvg(proj, tMax) {
  let svg = '';
  const yA = proj.yB + 6;
  svg += `<line x1="${LEFT_PAD}" y1="${yA}" x2="${LEFT_PAD + PLOT_W}" y2="${yA}" stroke="${COLORS.axis}" stroke-width="1.5"/>`;
  const ticks = 5;
  for (let k = 0; k <= ticks; k++) {
    const tt = (tMax * k) / ticks;
    const x = proj.sx(tt);
    svg += `<line x1="${x}" y1="${yA}" x2="${x}" y2="${yA + 4}" stroke="${COLORS.axis}" stroke-width="1"/>`;
    svg += `<text x="${x}" y="${yA + 16}" font-size="11" fill="${COLORS.textMuted}" text-anchor="middle">${fmt(tt, 1)}</text>`;
  }
  svg += `<text x="${LEFT_PAD + PLOT_W + 4}" y="${yA + 16}" font-size="11" font-style="italic" fill="${COLORS.textMuted}">t</text>`;
  return svg;
}

export function mountTimeDerivatives(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = {
    profile: PROFILES[cfg.profile] ? cfg.profile : 'ball-thrown-up',
    t: 0,
    playing: false,
    t0: performance.now(),
  };

  const profileOpts = Object.entries(PROFILES)
    .map(([k, p]) => `<option value="${k}"${state.profile === k ? ' selected' : ''}>${p.label}</option>`)
    .join('');

  target.innerHTML = `
    <div class="tdv-wrap">
      <svg class="tdv-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Position, velocity, and acceleration over time">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-tdv-pos></g>
        <g data-tdv-vel></g>
        <g data-tdv-acc></g>
        <g data-tdv-time-axis></g>
      </svg>
      <div class="tdv-controls">
        <div class="tdv-row">
          <label>motion</label>
          <select data-tdv-profile>${profileOpts}</select>
        </div>
        <div class="tdv-row">
          <label>time $t$</label>
          <input type="range" data-tdv-t min="0" max="1" step="0.001" value="0"/>
          <span class="val" data-tdv-tval>0.00 s</span>
        </div>
        <div class="tdv-row">
          <button data-tdv-play class="tdv-btn">▶ Play</button>
          <button data-tdv-reset class="tdv-btn">↻ Reset</button>
        </div>
        <div class="tdv-formula" data-tdv-formula></div>
        <div class="tdv-readout" data-tdv-readout></div>
        <div class="tdv-note" data-tdv-note></div>
      </div>
    </div>
  `;

  const g = (sel) => target.querySelector(sel);

  // KaTeX in labels
  target.querySelectorAll('.tdv-controls label').forEach((el) => {
    el.innerHTML = el.innerHTML.replace(/\$([^$]+)\$/g, (_, t) => tex(t));
  });

  let projS, projV, projA;

  function recomputeProjs() {
    const p = PROFILES[state.profile];
    const sR = rangeOf(p.s, p.tMax);
    const vR = rangeOf(p.v, p.tMax);
    const aR = rangeOf(p.a, p.tMax);
    let top = HEADER_H;
    projS = makeProj(top, PLOT_H, p.tMax, sR); top += PLOT_H + PLOT_GAP;
    projV = makeProj(top, PLOT_H, p.tMax, vR); top += PLOT_H + PLOT_GAP;
    projA = makeProj(top, PLOT_H, p.tMax, aR);
    const tSlider = g('[data-tdv-t]');
    tSlider.max = p.tMax;
    tSlider.step = (p.tMax / 600).toString();
    g('[data-tdv-formula]').innerHTML = tex(p.formula);
  }

  function redraw() {
    const p = PROFILES[state.profile];
    const t = state.t;
    g('[data-tdv-pos]').innerHTML = panelSvg(p.sLabel, COLORS.pos, p.s, projS, t, p.s(t));
    g('[data-tdv-vel]').innerHTML = panelSvg(p.vLabel, COLORS.vel, p.v, projV, t, p.v(t));
    g('[data-tdv-acc]').innerHTML = panelSvg(p.aLabel, COLORS.acc, p.a, projA, t, p.a(t));
    g('[data-tdv-time-axis]').innerHTML = timeAxisSvg(projA, p.tMax);
    g('[data-tdv-tval]').textContent = `${fmt(t)} s`;
    g('[data-tdv-readout]').innerHTML =
      `<span class="r-pos">s = ${fmt(p.s(t))}</span> · ` +
      `<span class="r-vel">v = ${fmt(p.v(t))}</span> · ` +
      `<span class="r-acc">a = ${fmt(p.a(t))}</span>`;
    g('[data-tdv-note]').textContent = p.note;
  }

  function tick() {
    if (state.playing) {
      const now = performance.now();
      const dt = (now - state.t0) / 1000;
      state.t0 = now;
      const p = PROFILES[state.profile];
      // play at ~0.7x real time so the user can follow
      state.t += dt * 0.7;
      if (state.t >= p.tMax) {
        state.t = p.tMax;
        state.playing = false;
        g('[data-tdv-play]').textContent = '▶ Play';
      }
      g('[data-tdv-t]').value = state.t;
      redraw();
    }
    requestAnimationFrame(tick);
  }

  recomputeProjs();
  redraw();
  requestAnimationFrame(tick);

  g('[data-tdv-profile]').addEventListener('change', (e) => {
    state.profile = e.target.value;
    state.t = 0;
    state.playing = false;
    recomputeProjs();
    g('[data-tdv-t]').value = 0;
    g('[data-tdv-play]').textContent = '▶ Play';
    redraw();
  });

  g('[data-tdv-t]').addEventListener('input', (e) => {
    state.t = parseFloat(e.target.value);
    if (state.playing) {
      state.playing = false;
      g('[data-tdv-play]').textContent = '▶ Play';
    }
    redraw();
  });

  g('[data-tdv-play]').addEventListener('click', (e) => {
    const p = PROFILES[state.profile];
    if (!state.playing && state.t >= p.tMax) state.t = 0;
    state.playing = !state.playing;
    state.t0 = performance.now();
    e.target.textContent = state.playing ? '⏸ Pause' : '▶ Play';
  });

  g('[data-tdv-reset]').addEventListener('click', () => {
    state.t = 0;
    state.playing = false;
    g('[data-tdv-t]').value = 0;
    g('[data-tdv-play]').textContent = '▶ Play';
    redraw();
  });
}
