import katex from 'katex';

// Parabola plotter. Modes:
//   standard      sliders for a, b, c → y = ax² + bx + c
//   vertex-form   sliders for a, h, k → y = a(x − h)² + k

const SVG_W = 600;
const SVG_H = 460;
const PAD = 30;

const COLORS = {
  curve: '#4f46e5',
  axis: '#cbd5e1',
  axisStrong: '#94a3b8',
  grid: '#eef2f7',
  vertex: '#7c3aed',
  root: '#dc2626',
  text: '#475569',
  bg: '#fafbfc',
};

const DEFAULTS = {
  mode: 'standard',
  // standard mode
  a: 1, b: 0, c: -4,
  aRange: [-2, 2], bRange: [-6, 6], cRange: [-8, 8],
  aStep: 0.5, bStep: 1, cStep: 1,
  // vertex-form mode
  vh: 0, vk: -4,
  hRange: [-5, 5], kRange: [-6, 6],
  hStep: 1, kStep: 1,
  // common
  xRange: [-6, 6],
  yRange: [-6, 8],
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

function makeProj(xRange, yRange) {
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;
  const w = SVG_W - 2 * PAD;
  const h = SVG_H - 2 * PAD;
  return {
    sx: (x) => PAD + ((x - xMin) / (xMax - xMin)) * w,
    sy: (y) => SVG_H - PAD - ((y - yMin) / (yMax - yMin)) * h,
  };
}

function gridAndAxes(xRange, yRange, proj) {
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;
  let svg = '';
  for (let x = Math.ceil(xMin); x <= xMax; x++) {
    const X = proj.sx(x);
    svg += `<line x1="${X}" y1="${PAD}" x2="${X}" y2="${SVG_H - PAD}" stroke="${x === 0 ? COLORS.axisStrong : COLORS.grid}" stroke-width="${x === 0 ? 1.5 : 1}"/>`;
  }
  for (let y = Math.ceil(yMin); y <= yMax; y++) {
    const Y = proj.sy(y);
    svg += `<line x1="${PAD}" y1="${Y}" x2="${SVG_W - PAD}" y2="${Y}" stroke="${y === 0 ? COLORS.axisStrong : COLORS.grid}" stroke-width="${y === 0 ? 1.5 : 1}"/>`;
  }
  for (let x = Math.ceil(xMin); x <= xMax; x++) {
    if (x === 0) continue;
    if (x % 2 !== 0 && (xMax - xMin) > 12) continue;
    svg += `<text x="${proj.sx(x)}" y="${proj.sy(0) + 14}" font-size="11" fill="#64748b" text-anchor="middle">${x}</text>`;
  }
  for (let y = Math.ceil(yMin); y <= yMax; y++) {
    if (y === 0) continue;
    if (y % 2 !== 0 && (yMax - yMin) > 14) continue;
    svg += `<text x="${proj.sx(0) - 6}" y="${proj.sy(y) + 4}" font-size="11" fill="#64748b" text-anchor="end">${y}</text>`;
  }
  return svg;
}

function curvePath(a, b, c, xRange, yRange, proj) {
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;
  const samples = 240;
  const dx = (xMax - xMin) / samples;
  let d = '';
  let inPath = false;
  for (let i = 0; i <= samples; i++) {
    const x = xMin + i * dx;
    const y = a * x * x + b * x + c;
    if (y >= yMin && y <= yMax) {
      d += (inPath ? 'L' : 'M') + `${proj.sx(x)} ${proj.sy(y)} `;
      inPath = true;
    } else {
      inPath = false;
    }
  }
  return d;
}

function fmtTermFromA(a) {
  if (a === 1) return 'x^2';
  if (a === -1) return '-x^2';
  return `${fmt(a)}x^2`;
}
function fmtSignedB(b) {
  if (b === 0) return '';
  const sign = b > 0 ? ' + ' : ' - ';
  const mag = Math.abs(b);
  if (mag === 1) return `${sign}x`;
  return `${sign}${fmt(mag)}x`;
}
function fmtSignedC(c) {
  if (c === 0) return '';
  return c > 0 ? ` + ${fmt(c)}` : ` - ${fmt(Math.abs(c))}`;
}

function vertexFormTex(a, h, k) {
  const aPart = a === 1 ? '' : a === -1 ? '-' : fmt(a);
  const hPart = h === 0 ? 'x' : h > 0 ? `(x - ${fmt(h)})` : `(x + ${fmt(-h)})`;
  const sqPart = h === 0 ? `${aPart}x^2` : `${aPart}${hPart}^2`;
  const kPart = k === 0 ? '' : k > 0 ? ` + ${fmt(k)}` : ` - ${fmt(-k)}`;
  return `y = ${sqPart}${kPart}`;
}

function renderShared(state, mode, gCurve, gFeatures, eqBox, readoutBox, cfg, proj) {
  // Convert state to (a, b, c) regardless of input mode.
  let a, b, c, eqStr;
  if (mode === 'vertex-form') {
    a = state.a;
    const h = state.h, k = state.k;
    b = -2 * a * h;
    c = a * h * h + k;
    eqStr = vertexFormTex(a, h, k);
  } else {
    a = state.a; b = state.b; c = state.c;
    eqStr = a === 0
      ? `y = ${fmtSignedB(b).trim().replace(/^\+\s*/, '') || '0'}${fmtSignedC(c) || ''}`
      : `y = ${fmtTermFromA(a)}${fmtSignedB(b)}${fmtSignedC(c)}`;
  }

  eqBox.innerHTML = tex(eqStr);

  if (a === 0) {
    const d = curvePath(0, b, c, cfg.xRange, cfg.yRange, proj);
    gCurve.innerHTML = `<path d="${d}" stroke="${COLORS.curve}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    gFeatures.innerHTML = '';
    readoutBox.innerHTML = `<div class="pb-note">$a = 0$ — this is a line, not a parabola. Set $a$ to a non-zero value.</div>`;
    readoutBox.innerHTML = readoutBox.innerHTML.replace(/\$([^$]+)\$/g, (_, t) => tex(t));
    return;
  }

  const d = curvePath(a, b, c, cfg.xRange, cfg.yRange, proj);
  gCurve.innerHTML = `<path d="${d}" stroke="${COLORS.curve}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;

  let features = '';
  const vx = -b / (2 * a);
  const vy = a * vx * vx + b * vx + c;
  if (vx >= cfg.xRange[0] && vx <= cfg.xRange[1] && vy >= cfg.yRange[0] && vy <= cfg.yRange[1]) {
    features += `<circle cx="${proj.sx(vx)}" cy="${proj.sy(vy)}" r="6" fill="${COLORS.vertex}" stroke="white" stroke-width="2"/>`;
    features += `<text x="${proj.sx(vx) + 10}" y="${proj.sy(vy) - 10}" font-size="12" fill="${COLORS.vertex}" font-weight="600">vertex (${fmt(vx)}, ${fmt(vy)})</text>`;
  }

  const disc = b * b - 4 * a * c;
  const roots = [];
  if (disc > 1e-9) {
    const sq = Math.sqrt(disc);
    roots.push((-b - sq) / (2 * a));
    roots.push((-b + sq) / (2 * a));
  } else if (Math.abs(disc) < 1e-9) {
    roots.push(-b / (2 * a));
  }
  for (const r of roots) {
    if (r >= cfg.xRange[0] && r <= cfg.xRange[1]) {
      features += `<circle cx="${proj.sx(r)}" cy="${proj.sy(0)}" r="6" fill="${COLORS.root}" stroke="white" stroke-width="2"/>`;
      features += `<text x="${proj.sx(r)}" y="${proj.sy(0) + 26}" font-size="12" fill="${COLORS.root}" text-anchor="middle" font-weight="700">${fmt(r)}</text>`;
    }
  }
  gFeatures.innerHTML = features;

  let rootsLine;
  if (disc > 1e-9) rootsLine = `2 real roots: $x = ${fmt(roots[0])}, ${fmt(roots[1])}$`;
  else if (Math.abs(disc) < 1e-9) rootsLine = `1 repeated root: $x = ${fmt(roots[0])}$`;
  else rootsLine = '0 real roots — parabola does not cross the x-axis';

  let readout = '';
  readout += `<div class="pb-readout-row"><span>$b^2 - 4ac$</span><strong>${fmt(disc)}</strong></div>`;
  readout += `<div class="pb-readout-row"><span>roots</span><strong>${rootsLine}</strong></div>`;
  readout += `<div class="pb-readout-row"><span>vertex</span><strong>$(${fmt(vx)}, ${fmt(vy)})$</strong></div>`;

  if (cfg.showVieta) {
    // Sum and product of roots — Vieta's formulas. Works even when roots
    // are complex (sum/product are always real); we just can't show the
    // "actual" sum from the displayed roots in that case.
    const sumFormula = -b / a;
    const productFormula = c / a;
    let sumActual = '—';
    let productActual = '—';
    if (disc > 1e-9) {
      sumActual = `${fmt(roots[0])} + ${fmt(roots[1])} = ${fmt(roots[0] + roots[1])}`;
      productActual = `${fmt(roots[0])} \\cdot ${fmt(roots[1])} = ${fmt(roots[0] * roots[1])}`;
    } else if (Math.abs(disc) < 1e-9) {
      sumActual = `${fmt(roots[0])} + ${fmt(roots[0])} = ${fmt(2 * roots[0])}`;
      productActual = `${fmt(roots[0])}^2 = ${fmt(roots[0] * roots[0])}`;
    }
    readout += `<div class="pb-readout-row pb-vieta"><span>sum: $-b/a$</span><strong>$${fmt(sumFormula)}$ &nbsp;($r_1 + r_2 = ${sumActual}$)</strong></div>`;
    readout += `<div class="pb-readout-row pb-vieta"><span>product: $c/a$</span><strong>$${fmt(productFormula)}$ &nbsp;($r_1 \\cdot r_2 = ${productActual}$)</strong></div>`;
  }

  readoutBox.innerHTML = readout.replace(/\$([^$]+)\$/g, (_, t) => tex(t));
}

function buildControlsStandard(cfg, state) {
  return `
    <div class="pb-row">
      <label><em>a</em></label>
      <input type="range" data-pb-a min="${cfg.aRange[0]}" max="${cfg.aRange[1]}" step="${cfg.aStep}" value="${state.a}"/>
      <span class="val" data-pb-aval>${fmt(state.a)}</span>
    </div>
    <div class="pb-row">
      <label><em>b</em></label>
      <input type="range" data-pb-b min="${cfg.bRange[0]}" max="${cfg.bRange[1]}" step="${cfg.bStep}" value="${state.b}"/>
      <span class="val" data-pb-bval>${fmt(state.b)}</span>
    </div>
    <div class="pb-row">
      <label><em>c</em></label>
      <input type="range" data-pb-c min="${cfg.cRange[0]}" max="${cfg.cRange[1]}" step="${cfg.cStep}" value="${state.c}"/>
      <span class="val" data-pb-cval>${fmt(state.c)}</span>
    </div>
  `;
}

function buildControlsVertex(cfg, state) {
  return `
    <div class="pb-row">
      <label><em>a</em></label>
      <input type="range" data-pb-a min="${cfg.aRange[0]}" max="${cfg.aRange[1]}" step="${cfg.aStep}" value="${state.a}"/>
      <span class="val" data-pb-aval>${fmt(state.a)}</span>
    </div>
    <div class="pb-row">
      <label><em>h</em></label>
      <input type="range" data-pb-h min="${cfg.hRange[0]}" max="${cfg.hRange[1]}" step="${cfg.hStep}" value="${state.h}"/>
      <span class="val" data-pb-hval>${fmt(state.h)}</span>
    </div>
    <div class="pb-row">
      <label><em>k</em></label>
      <input type="range" data-pb-k min="${cfg.kRange[0]}" max="${cfg.kRange[1]}" step="${cfg.kStep}" value="${state.k}"/>
      <span class="val" data-pb-kval>${fmt(state.k)}</span>
    </div>
    <div class="pb-note">In vertex form $y = a(x - h)^2 + k$, the vertex is at $(h, k)$ — slide $h$ and $k$ to move the vertex around.</div>
  `;
}

export function mountParabola(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const mode = cfg.mode || 'standard';
  const state = mode === 'vertex-form'
    ? { a: cfg.a, h: cfg.vh, k: cfg.vk }
    : { a: cfg.a, b: cfg.b, c: cfg.c };
  const proj = makeProj(cfg.xRange, cfg.yRange);

  const controls = mode === 'vertex-form'
    ? buildControlsVertex(cfg, state)
    : buildControlsStandard(cfg, state);

  target.innerHTML = `
    <div class="pb-wrap">
      <svg class="pb-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Parabola">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-pb-grid></g>
        <g data-pb-curve></g>
        <g data-pb-features></g>
      </svg>
      <div class="pb-controls">
        <div class="pb-eq" data-pb-eq></div>
        ${controls}
        <div class="pb-readout" data-pb-readout></div>
      </div>
    </div>
  `;

  const gGrid = target.querySelector('[data-pb-grid]');
  const gCurve = target.querySelector('[data-pb-curve]');
  const gFeatures = target.querySelector('[data-pb-features]');
  const eqBox = target.querySelector('[data-pb-eq]');
  const readoutBox = target.querySelector('[data-pb-readout]');

  // Render KaTeX in the static note (vertex-form mode).
  const noteEl = target.querySelector('.pb-note');
  if (noteEl) noteEl.innerHTML = noteEl.innerHTML.replace(/\$([^$]+)\$/g, (_, t) => tex(t));

  gGrid.innerHTML = gridAndAxes(cfg.xRange, cfg.yRange, proj);

  function render() {
    renderShared(state, mode, gCurve, gFeatures, eqBox, readoutBox, cfg, proj);
  }

  render();

  const keys = mode === 'vertex-form' ? ['a', 'h', 'k'] : ['a', 'b', 'c'];
  keys.forEach((k) => {
    target.querySelector(`[data-pb-${k}]`).addEventListener('input', (e) => {
      state[k] = parseFloat(e.target.value);
      target.querySelector(`[data-pb-${k}val]`).textContent = fmt(state[k]);
      render();
    });
  });
}
