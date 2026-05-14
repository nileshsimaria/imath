import katex from 'katex';

// Exponential plotter for y = a · b^x. Sliders for a and b. Distinguishes
// growth (b > 1) from decay (0 < b < 1). The y-intercept is always (0, a)
// since b^0 = 1.

const SVG_W = 600;
const SVG_H = 460;
const PAD = 30;

const COLORS = {
  growth: '#16a34a',
  decay: '#dc2626',
  flat: '#475569',
  axis: '#cbd5e1',
  axisStrong: '#94a3b8',
  grid: '#eef2f7',
  intercept: '#7c3aed',
  text: '#475569',
  bg: '#fafbfc',
};

const DEFAULTS = {
  a: 1,
  b: 2,
  xRange: [-4, 4],
  yRange: [-2, 16],
  aRange: [-3, 3],
  bRange: [0.1, 4],
  aStep: 0.5,
  bStep: 0.1,
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

function curvePath(a, b, xRange, yRange, proj) {
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;
  if (b <= 0) return '';
  const samples = 300;
  const dx = (xMax - xMin) / samples;
  let d = '';
  let inPath = false;
  for (let i = 0; i <= samples; i++) {
    const x = xMin + i * dx;
    const y = a * Math.pow(b, x);
    if (Number.isFinite(y) && y >= yMin && y <= yMax) {
      d += (inPath ? 'L' : 'M') + `${proj.sx(x)} ${proj.sy(y)} `;
      inPath = true;
    } else {
      inPath = false;
    }
  }
  return d;
}

function buildEq(a, b) {
  const aPart = a === 1 ? '' : a === -1 ? '-' : `${fmt(a)} \\cdot `;
  return `y = ${aPart}${fmt(b)}^x`;
}

function classifyBehavior(a, b) {
  if (b <= 0) return { label: 'undefined (b must be > 0)', color: COLORS.flat };
  if (Math.abs(b - 1) < 1e-9) return { label: 'constant (b = 1)', color: COLORS.flat };
  if (b > 1) return { label: a >= 0 ? 'growth' : 'reflected growth', color: COLORS.growth };
  return { label: a >= 0 ? 'decay' : 'reflected decay', color: COLORS.decay };
}

export function mountExpGraph(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = { a: cfg.a, b: cfg.b };
  const proj = makeProj(cfg.xRange, cfg.yRange);

  target.innerHTML = `
    <div class="eg-wrap">
      <svg class="eg-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Exponential graph">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-eg-grid></g>
        <g data-eg-curve></g>
        <g data-eg-features></g>
      </svg>
      <div class="eg-controls">
        <div class="eg-eq" data-eg-eq></div>
        <div class="eg-row">
          <label><em>a</em></label>
          <input type="range" data-eg-a min="${cfg.aRange[0]}" max="${cfg.aRange[1]}" step="${cfg.aStep}" value="${state.a}"/>
          <span class="val" data-eg-aval>${fmt(state.a)}</span>
        </div>
        <div class="eg-row">
          <label><em>b</em></label>
          <input type="range" data-eg-b min="${cfg.bRange[0]}" max="${cfg.bRange[1]}" step="${cfg.bStep}" value="${state.b}"/>
          <span class="val" data-eg-bval>${fmt(state.b)}</span>
        </div>
        <div class="eg-readout" data-eg-readout></div>
      </div>
    </div>
  `;

  const gGrid = target.querySelector('[data-eg-grid]');
  const gCurve = target.querySelector('[data-eg-curve]');
  const gFeatures = target.querySelector('[data-eg-features]');
  const eqBox = target.querySelector('[data-eg-eq]');
  const readoutBox = target.querySelector('[data-eg-readout]');

  gGrid.innerHTML = gridAndAxes(cfg.xRange, cfg.yRange, proj);

  function render() {
    eqBox.innerHTML = tex(buildEq(state.a, state.b));
    gCurve.innerHTML = `<path d="${curvePath(state.a, state.b, cfg.xRange, cfg.yRange, proj)}" stroke="${COLORS.growth}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;

    // y-intercept is always (0, a) when b > 0
    let features = '';
    if (state.b > 0 && state.a >= cfg.yRange[0] && state.a <= cfg.yRange[1]) {
      features += `<circle cx="${proj.sx(0)}" cy="${proj.sy(state.a)}" r="6" fill="${COLORS.intercept}" stroke="white" stroke-width="2"/>`;
      features += `<text x="${proj.sx(0) + 10}" y="${proj.sy(state.a) - 10}" font-size="12" fill="${COLORS.intercept}" font-weight="600">(0, ${fmt(state.a)})</text>`;
    }
    gFeatures.innerHTML = features;

    const cls = classifyBehavior(state.a, state.b);
    let readout = '';
    readout += `<div class="eg-readout-row"><span>behavior</span><strong style="color:${cls.color}">${cls.label}</strong></div>`;
    readout += `<div class="eg-readout-row"><span>y-intercept</span><strong>$(0, ${fmt(state.a)})$</strong></div>`;
    if (state.b > 0 && Math.abs(state.b - 1) > 1e-9) {
      const f1 = state.a * Math.pow(state.b, 1);
      const fNeg1 = state.a * Math.pow(state.b, -1);
      readout += `<div class="eg-readout-row"><span>$f(1)$</span><strong>${fmt(f1)}</strong></div>`;
      readout += `<div class="eg-readout-row"><span>$f(-1)$</span><strong>${fmt(fNeg1)}</strong></div>`;
    }
    readoutBox.innerHTML = readout.replace(/\$([^$]+)\$/g, (_, t) => tex(t));
  }

  render();
  ['a', 'b'].forEach((k) => {
    target.querySelector(`[data-eg-${k}]`).addEventListener('input', (e) => {
      state[k] = parseFloat(e.target.value);
      target.querySelector(`[data-eg-${k}val]`).textContent = fmt(state[k]);
      render();
    });
  });
}
