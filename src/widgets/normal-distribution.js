import katex from 'katex';

// Normal distribution widget. Plots N(μ, σ) with shadable region and live
// area readout. Lets students vary mean, sd, and the bounds of the shaded
// region to feel how probability relates to area under the curve.
//
// Config:
//   mean: μ (default 0)
//   sd:   σ (default 1)
//   regionType: 'less' | 'greater' | 'between' (default 'less')
//   a: lower bound of shaded region (default -1)
//   b: upper bound (default +1, only used when regionType === 'between')
//   showSliders: bool — show sliders for mean, sd, a, b (default true)

const SVG_W = 640;
const SVG_H = 280;
const PAD = { left: 30, right: 20, top: 20, bottom: 36 };
const PLOT_W = SVG_W - PAD.left - PAD.right;
const PLOT_H = SVG_H - PAD.top - PAD.bottom;

const COLORS = {
  axis: '#cbd5e1',
  curve: '#4f46e5',
  shade: 'rgba(79, 70, 229, 0.25)',
  shadeStroke: '#4f46e5',
  text: '#475569',
  marker: '#dc2626',
};

const DEFAULTS = {
  mean: 0,
  sd: 1,
  regionType: 'less',
  a: -1,
  b: 1,
  showSliders: true,
};

const tex = (s, display = false) => {
  try { return katex.renderToString(s, { throwOnError: false, displayMode: display }); }
  catch { return s; }
};

function pdf(x, mean, sd) {
  const z = (x - mean) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}

// Standard normal CDF using Abramowitz-Stegun approximation 26.2.17.
function stdCdf(z) {
  if (z < 0) return 1 - stdCdf(-z);
  const t = 1 / (1 + 0.2316419 * z);
  const d = 0.3989422804 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return 1 - p;
}

function cdf(x, mean, sd) {
  return stdCdf((x - mean) / sd);
}

function regionProb(state) {
  const { mean, sd, regionType, a, b } = state;
  if (regionType === 'less') return cdf(a, mean, sd);
  if (regionType === 'greater') return 1 - cdf(a, mean, sd);
  // between
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return cdf(hi, mean, sd) - cdf(lo, mean, sd);
}

function buildSvg(state) {
  const { mean, sd, regionType, a, b } = state;
  // x-range: ±4σ around the mean
  const xMin = mean - 4 * sd;
  const xMax = mean + 4 * sd;
  // y-range: 0 to a hair above the peak (1/(σ√(2π)))
  const yMax = pdf(mean, mean, sd) * 1.05;

  const xToPx = (x) => PAD.left + ((x - xMin) / (xMax - xMin)) * PLOT_W;
  const yToPx = (y) => PAD.top + (1 - y / yMax) * PLOT_H;

  let svg = '';

  // axes
  const x0 = yToPx(0);
  svg += `<line x1="${PAD.left}" y1="${x0}" x2="${SVG_W - PAD.right}" y2="${x0}" stroke="${COLORS.axis}" stroke-width="1.5"/>`;

  // mean tick
  svg += `<line x1="${xToPx(mean)}" y1="${x0 - 4}" x2="${xToPx(mean)}" y2="${x0 + 4}" stroke="${COLORS.text}" stroke-width="1"/>`;
  svg += `<text x="${xToPx(mean)}" y="${x0 + 16}" text-anchor="middle" font-size="10" fill="${COLORS.text}">μ</text>`;

  // ±1σ, ±2σ, ±3σ ticks
  for (let k = -3; k <= 3; k++) {
    if (k === 0) continue;
    const x = mean + k * sd;
    const px = xToPx(x);
    svg += `<line x1="${px}" y1="${x0 - 4}" x2="${px}" y2="${x0 + 4}" stroke="${COLORS.text}" stroke-width="1"/>`;
    svg += `<text x="${px}" y="${x0 + 16}" text-anchor="middle" font-size="10" fill="${COLORS.text}">${k > 0 ? '+' : ''}${k}σ</text>`;
  }

  // shaded region path (computed first so the curve overlays its edge)
  let shadeXMin, shadeXMax;
  if (regionType === 'less') { shadeXMin = xMin; shadeXMax = a; }
  else if (regionType === 'greater') { shadeXMin = a; shadeXMax = xMax; }
  else { shadeXMin = Math.min(a, b); shadeXMax = Math.max(a, b); }

  // Clamp shading bounds to viewing window
  shadeXMin = Math.max(shadeXMin, xMin);
  shadeXMax = Math.min(shadeXMax, xMax);

  // Build shade polygon
  if (shadeXMax > shadeXMin) {
    const N = 200;
    let path = `M ${xToPx(shadeXMin)} ${x0}`;
    for (let i = 0; i <= N; i++) {
      const x = shadeXMin + (i / N) * (shadeXMax - shadeXMin);
      const px = xToPx(x);
      const py = yToPx(pdf(x, mean, sd));
      path += ` L ${px} ${py}`;
    }
    path += ` L ${xToPx(shadeXMax)} ${x0} Z`;
    svg += `<path d="${path}" fill="${COLORS.shade}" stroke="none"/>`;
  }

  // Curve
  const N = 300;
  let curvePath = '';
  for (let i = 0; i <= N; i++) {
    const x = xMin + (i / N) * (xMax - xMin);
    const px = xToPx(x);
    const py = yToPx(pdf(x, mean, sd));
    curvePath += (i === 0 ? 'M' : 'L') + ` ${px} ${py} `;
  }
  svg += `<path d="${curvePath}" stroke="${COLORS.curve}" stroke-width="2.5" fill="none"/>`;

  // Vertical bound markers
  const drawMarker = (x, label) => {
    if (x < xMin || x > xMax) return '';
    const px = xToPx(x);
    return `
      <line x1="${px}" y1="${PAD.top}" x2="${px}" y2="${x0}" stroke="${COLORS.marker}" stroke-width="1.5" stroke-dasharray="4 3"/>
      <text x="${px}" y="${PAD.top + 12}" text-anchor="middle" font-size="11" fill="${COLORS.marker}" font-weight="600">${label}</text>
    `;
  };
  if (regionType === 'less' || regionType === 'greater') {
    svg += drawMarker(a, 'a');
  } else {
    svg += drawMarker(Math.min(a, b), 'a');
    svg += drawMarker(Math.max(a, b), 'b');
  }

  return svg;
}

function readouts(state) {
  const { mean, sd, regionType, a, b } = state;
  const p = regionProb(state);
  const zA = (a - mean) / sd;
  const zB = (b - mean) / sd;
  const eqStr =
    regionType === 'less' ? `P(X < ${a.toFixed(2)})` :
    regionType === 'greater' ? `P(X > ${a.toFixed(2)})` :
    `P(${Math.min(a, b).toFixed(2)} < X < ${Math.max(a, b).toFixed(2)})`;
  const zStr =
    regionType === 'less' ? `z = ${zA.toFixed(3)}` :
    regionType === 'greater' ? `z = ${zA.toFixed(3)}` :
    `z_a = ${zA.toFixed(3)},\\ z_b = ${zB.toFixed(3)}`;

  return `
    <div class="nd-eq">${tex(eqStr, true)} <span style="color:#dc2626;font-weight:600">= ${p.toFixed(4)}</span></div>
    <div class="nd-rdo">
      <div class="nd-rdo-row"><span>mean μ</span><strong>${mean.toFixed(2)}</strong></div>
      <div class="nd-rdo-row"><span>std dev σ</span><strong>${sd.toFixed(2)}</strong></div>
      <div class="nd-rdo-row"><span>z-score(s)</span><strong>${tex(zStr)}</strong></div>
      <div class="nd-rdo-row"><span>shaded area</span><strong>${p.toFixed(4)}</strong></div>
    </div>
  `;
}

export function mountNormalDistribution(target, userConfig = {}) {
  const state = { ...DEFAULTS, ...userConfig };

  const sliderRow = (key, label, min, max, step, val) => `
    <div class="nd-row">
      <label>${label}</label>
      <input type="range" data-nd-${key} min="${min}" max="${max}" step="${step}" value="${val}"/>
      <span class="val" data-nd-${key}-val>${val}</span>
    </div>`;

  const regionTabs = `
    <div class="nd-row">
      <label>region</label>
      <div class="nd-tabs">
        <button data-nd-region="less" class="${state.regionType === 'less' ? 'active' : ''}">X &lt; a</button>
        <button data-nd-region="greater" class="${state.regionType === 'greater' ? 'active' : ''}">X &gt; a</button>
        <button data-nd-region="between" class="${state.regionType === 'between' ? 'active' : ''}">a &lt; X &lt; b</button>
      </div>
    </div>`;

  target.innerHTML = `
    <div class="nd-wrap">
      <svg class="nd-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Normal distribution">
        <g data-nd-svg></g>
      </svg>
      <div class="nd-controls">
        <div data-nd-readouts></div>
        ${state.showSliders ? sliderRow('mean', 'mean (μ)', -3, 3, 0.1, state.mean) : ''}
        ${state.showSliders ? sliderRow('sd', 'std dev (σ)', 0.3, 3, 0.05, state.sd) : ''}
        ${regionTabs}
        ${sliderRow('a', 'bound a', -4, 4, 0.05, state.a)}
        <div data-nd-b-slot>${state.regionType === 'between' ? sliderRow('b', 'bound b', -4, 4, 0.05, state.b) : ''}</div>
      </div>
    </div>
  `;

  const svgG = target.querySelector('[data-nd-svg]');
  const readoutsEl = target.querySelector('[data-nd-readouts]');
  const bSlot = target.querySelector('[data-nd-b-slot]');

  function render() {
    svgG.innerHTML = buildSvg(state);
    readoutsEl.innerHTML = readouts(state);
  }

  function bindB() {
    const input = target.querySelector('[data-nd-b]');
    if (!input) return;
    input.addEventListener('input', (e) => {
      state.b = parseFloat(e.target.value);
      target.querySelector('[data-nd-b-val]').textContent = state.b.toFixed(2);
      render();
    });
  }

  target.querySelectorAll('[data-nd-region]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.regionType = btn.dataset.ndRegion;
      target.querySelectorAll('[data-nd-region]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      bSlot.innerHTML = state.regionType === 'between'
        ? `<div class="nd-row"><label>bound b</label><input type="range" data-nd-b min="-4" max="4" step="0.05" value="${state.b}"/><span class="val" data-nd-b-val>${state.b.toFixed(2)}</span></div>`
        : '';
      bindB();
      render();
    });
  });

  for (const key of ['mean', 'sd', 'a']) {
    const input = target.querySelector(`[data-nd-${key}]`);
    if (!input) continue;
    input.addEventListener('input', (e) => {
      state[key] = parseFloat(e.target.value);
      target.querySelector(`[data-nd-${key}-val]`).textContent = state[key].toFixed(2);
      render();
    });
  }
  bindB();

  render();
}
