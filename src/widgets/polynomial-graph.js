import katex from 'katex';

// Cubic polynomial plotter. Sliders for a3, a2, a1, a0:
//   y = a3 x³ + a2 x² + a1 x + a0
// Roots found by sign-change bisection. Up to 3 real roots possible.

const SVG_W = 600;
const SVG_H = 460;
const PAD = 30;

const COLORS = {
  curve: '#4f46e5',
  axis: '#cbd5e1',
  axisStrong: '#94a3b8',
  grid: '#eef2f7',
  root: '#dc2626',
  text: '#475569',
  bg: '#fafbfc',
};

const DEFAULTS = {
  a3: 1, a2: 0, a1: -3, a0: 0,
  xRange: [-4, 4],
  yRange: [-8, 8],
  range: [-3, 3],
  step: 0.5,
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
    svg += `<text x="${proj.sx(x)}" y="${proj.sy(0) + 14}" font-size="11" fill="#64748b" text-anchor="middle">${x}</text>`;
  }
  for (let y = Math.ceil(yMin); y <= yMax; y++) {
    if (y === 0) continue;
    if (y % 2 !== 0 && (yMax - yMin) > 14) continue;
    svg += `<text x="${proj.sx(0) - 6}" y="${proj.sy(y) + 4}" font-size="11" fill="#64748b" text-anchor="end">${y}</text>`;
  }
  return svg;
}

function evalP(coefs, x) {
  return coefs[0] + coefs[1] * x + coefs[2] * x * x + coefs[3] * x * x * x;
}

function findRoots(coefs, xRange, samples = 1000) {
  const [xMin, xMax] = xRange;
  const dx = (xMax - xMin) / samples;
  const roots = [];
  let prev = evalP(coefs, xMin);
  for (let i = 1; i <= samples; i++) {
    const x = xMin + i * dx;
    const cur = evalP(coefs, x);
    if (Math.abs(cur) < 1e-9) {
      roots.push(x);
    } else if (prev * cur < 0) {
      // Bisection
      let lo = x - dx;
      let hi = x;
      for (let j = 0; j < 40; j++) {
        const mid = (lo + hi) / 2;
        const fmid = evalP(coefs, mid);
        if (Math.abs(fmid) < 1e-12) { lo = hi = mid; break; }
        if (evalP(coefs, lo) * fmid < 0) hi = mid;
        else lo = mid;
      }
      roots.push((lo + hi) / 2);
    }
    prev = cur;
  }
  return roots;
}

function curvePath(coefs, xRange, yRange, proj) {
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;
  const samples = 300;
  const dx = (xMax - xMin) / samples;
  let d = '';
  let inPath = false;
  for (let i = 0; i <= samples; i++) {
    const x = xMin + i * dx;
    const y = evalP(coefs, x);
    if (y >= yMin && y <= yMax) {
      d += (inPath ? 'L' : 'M') + `${proj.sx(x)} ${proj.sy(y)} `;
      inPath = true;
    } else {
      inPath = false;
    }
  }
  return d;
}

function buildEq(a3, a2, a1, a0) {
  let s = '';
  function term(coef, varStr) {
    if (coef === 0) return '';
    const isFirst = s.length === 0;
    const sign = coef < 0 ? (isFirst ? '-' : ' - ') : (isFirst ? '' : ' + ');
    const mag = Math.abs(coef);
    let coefStr;
    if (mag === 1 && varStr) coefStr = '';
    else coefStr = fmt(mag);
    return `${sign}${coefStr}${varStr}`;
  }
  s += term(a3, 'x^3');
  s += term(a2, 'x^2');
  s += term(a1, 'x');
  s += term(a0, '');
  if (s === '') s = '0';
  return `y = ${s}`;
}

export function mountPolynomialGraph(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = { a3: cfg.a3, a2: cfg.a2, a1: cfg.a1, a0: cfg.a0 };
  const proj = makeProj(cfg.xRange, cfg.yRange);

  target.innerHTML = `
    <div class="pg2-wrap">
      <svg class="pg2-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Polynomial graph">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-pg2-grid></g>
        <g data-pg2-curve></g>
        <g data-pg2-features></g>
      </svg>
      <div class="pg2-controls">
        <div class="pg2-eq" data-pg2-eq></div>
        <div class="pg2-row">
          <label>a₃ <span class="pg2-deg">(x³)</span></label>
          <input type="range" data-pg2-a3 min="${cfg.range[0]}" max="${cfg.range[1]}" step="${cfg.step}" value="${state.a3}"/>
          <span class="val" data-pg2-a3val>${fmt(state.a3)}</span>
        </div>
        <div class="pg2-row">
          <label>a₂ <span class="pg2-deg">(x²)</span></label>
          <input type="range" data-pg2-a2 min="${cfg.range[0]}" max="${cfg.range[1]}" step="${cfg.step}" value="${state.a2}"/>
          <span class="val" data-pg2-a2val>${fmt(state.a2)}</span>
        </div>
        <div class="pg2-row">
          <label>a₁ <span class="pg2-deg">(x)</span></label>
          <input type="range" data-pg2-a1 min="${cfg.range[0]}" max="${cfg.range[1]}" step="${cfg.step}" value="${state.a1}"/>
          <span class="val" data-pg2-a1val>${fmt(state.a1)}</span>
        </div>
        <div class="pg2-row">
          <label>a₀ <span class="pg2-deg">(const)</span></label>
          <input type="range" data-pg2-a0 min="${cfg.range[0]}" max="${cfg.range[1]}" step="${cfg.step}" value="${state.a0}"/>
          <span class="val" data-pg2-a0val>${fmt(state.a0)}</span>
        </div>
        <div class="pg2-readout" data-pg2-readout></div>
      </div>
    </div>
  `;

  const gGrid = target.querySelector('[data-pg2-grid]');
  const gCurve = target.querySelector('[data-pg2-curve]');
  const gFeatures = target.querySelector('[data-pg2-features]');
  const eqBox = target.querySelector('[data-pg2-eq]');
  const readoutBox = target.querySelector('[data-pg2-readout]');

  gGrid.innerHTML = gridAndAxes(cfg.xRange, cfg.yRange, proj);

  function render() {
    const coefs = [state.a0, state.a1, state.a2, state.a3];
    eqBox.innerHTML = tex(buildEq(state.a3, state.a2, state.a1, state.a0));
    gCurve.innerHTML = `<path d="${curvePath(coefs, cfg.xRange, cfg.yRange, proj)}" stroke="${COLORS.curve}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;

    const isCubic = Math.abs(state.a3) > 1e-9;
    const degree = isCubic ? 3 : (Math.abs(state.a2) > 1e-9 ? 2 : (Math.abs(state.a1) > 1e-9 ? 1 : 0));

    const roots = findRoots(coefs, cfg.xRange);
    let features = '';
    for (const r of roots) {
      features += `<circle cx="${proj.sx(r)}" cy="${proj.sy(0)}" r="6" fill="${COLORS.root}" stroke="white" stroke-width="2"/>`;
      features += `<text x="${proj.sx(r)}" y="${proj.sy(0) + 26}" font-size="12" fill="${COLORS.root}" text-anchor="middle" font-weight="700">${fmt(r)}</text>`;
    }
    gFeatures.innerHTML = features;

    const rootsLine = roots.length === 0
      ? 'no real roots in window'
      : roots.map((r) => fmt(r)).join(', ');
    let readout = '';
    readout += `<div class="pg2-readout-row"><span>degree</span><strong>${degree}</strong></div>`;
    readout += `<div class="pg2-readout-row"><span>real roots</span><strong>${rootsLine}</strong></div>`;
    readoutBox.innerHTML = readout;
  }

  render();
  ['a3', 'a2', 'a1', 'a0'].forEach((k) => {
    target.querySelector(`[data-pg2-${k}]`).addEventListener('input', (e) => {
      state[k] = parseFloat(e.target.value);
      target.querySelector(`[data-pg2-${k}val]`).textContent = fmt(state[k]);
      render();
    });
  });
}
