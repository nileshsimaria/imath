import katex from 'katex';

// Trig-function graph widget. Plots y = a · f(b(x - c)) + d for any of the six
// trig functions, with optional sliders for a, b, c, d and a function picker.
//
// Config:
//   func: 'sin' | 'cos' | 'tan' | 'cot' | 'sec' | 'csc'
//   a, b, c, d: initial values for the transformation parameters
//   xMin, xMax: x-axis range in radians (defaults: -2π … 2π)
//   yMin, yMax: y-axis range (defaults: -3 … 3)
//   controls: array picking which controls to render — any subset of
//             ['func', 'a', 'b', 'c', 'd']. Default: all of them.

const SVG_W = 720;
const SVG_H = 360;
const PADDING = { left: 50, right: 30, top: 25, bottom: 40 };
const PLOT_W = SVG_W - PADDING.left - PADDING.right;
const PLOT_H = SVG_H - PADDING.top - PADDING.bottom;

const COLORS = {
  axis: '#cbd5e1',
  curve: '#4f46e5',
  asymptote: '#f87171',
  midline: '#94a3b8',
  text: '#475569',
};

const FUNCS = {
  sin: { f: Math.sin, name: '\\sin' },
  cos: { f: Math.cos, name: '\\cos' },
  tan: { f: Math.tan, name: '\\tan' },
  cot: { f: (x) => 1 / Math.tan(x), name: '\\cot' },
  sec: { f: (x) => 1 / Math.cos(x), name: '\\sec' },
  csc: { f: (x) => 1 / Math.sin(x), name: '\\csc' },
};

const DEFAULTS = {
  func: 'sin',
  a: 1,
  b: 1,
  c: 0,
  d: 0,
  xMin: -2 * Math.PI,
  xMax: 2 * Math.PI,
  yMin: -3,
  yMax: 3,
  controls: ['func', 'a', 'b', 'c', 'd'],
};

const tex = (s, display = false) => {
  try { return katex.renderToString(s, { throwOnError: false, displayMode: display }); }
  catch { return s; }
};

const fmt = (n, dp = 2) => parseFloat(Number(n).toFixed(dp)).toString();

// Format value as a multiple of π when close (for axis labels & period).
function piLabel(n) {
  if (Math.abs(n) < 1e-9) return '0';
  const r = n / Math.PI;
  // halves: ±π/2, ±π, ±3π/2, …
  const halves = r * 2;
  if (Math.abs(halves - Math.round(halves)) < 0.02) {
    const k = Math.round(halves);
    if (k === 1) return 'π/2';
    if (k === -1) return '-π/2';
    if (k === 2) return 'π';
    if (k === -2) return '-π';
    if (k % 2 === 0) return `${k / 2}π`;
    return `${k}π/2`;
  }
  return fmt(n);
}

function plotPath(state) {
  const { func, a, b, c, d, xMin, xMax, yMin, yMax } = state;
  const f = FUNCS[func].f;
  const evalAt = (x) => a * f(b * (x - c)) + d;
  const xToPx = (x) => PADDING.left + ((x - xMin) / (xMax - xMin)) * PLOT_W;
  const yToPx = (y) => PADDING.top + (1 - (y - yMin) / (yMax - yMin)) * PLOT_H;

  const N = 1000;
  const dx = (xMax - xMin) / N;
  const yClipMax = Math.max(Math.abs(yMin), Math.abs(yMax)) * 2;
  let path = '';
  let inSeg = false;
  let prevY;

  for (let i = 0; i <= N; i++) {
    const x = xMin + i * dx;
    const y = evalAt(x);
    if (!Number.isFinite(y) || Math.abs(y) > yClipMax) {
      inSeg = false;
      prevY = undefined;
      continue;
    }
    // Break the path at sign-change discontinuities (asymptote crossings).
    if (
      inSeg &&
      prevY !== undefined &&
      Math.sign(y) !== Math.sign(prevY) &&
      Math.abs(y - prevY) > 4
    ) {
      inSeg = false;
    }
    const yClipped = Math.max(yMin - 0.5, Math.min(yMax + 0.5, y));
    const px = xToPx(x);
    const py = yToPx(yClipped);
    path += inSeg ? ` L ${px} ${py}` : ` M ${px} ${py}`;
    inSeg = true;
    prevY = y;
  }
  return path;
}

function findAsymptotes(state) {
  const { func, b, c, xMin, xMax } = state;
  const out = [];
  // tan, sec → cos(b(x-c)) = 0   →  x = c + (π/2 + kπ)/b
  // cot, csc → sin(b(x-c)) = 0   →  x = c + kπ/b
  if (func === 'tan' || func === 'sec') {
    const kS = Math.floor((b * (xMin - c) - Math.PI / 2) / Math.PI);
    const kE = Math.ceil((b * (xMax - c) - Math.PI / 2) / Math.PI);
    for (let k = kS; k <= kE; k++) {
      const x = c + (Math.PI / 2 + k * Math.PI) / b;
      if (x >= xMin && x <= xMax) out.push(x);
    }
  } else if (func === 'cot' || func === 'csc') {
    const kS = Math.floor((b * (xMin - c)) / Math.PI);
    const kE = Math.ceil((b * (xMax - c)) / Math.PI);
    for (let k = kS; k <= kE; k++) {
      const x = c + (k * Math.PI) / b;
      if (x >= xMin && x <= xMax) out.push(x);
    }
  }
  return out;
}

function drawAxes(state) {
  const { xMin, xMax, yMin, yMax } = state;
  const xToPx = (x) => PADDING.left + ((x - xMin) / (xMax - xMin)) * PLOT_W;
  const yToPx = (y) => PADDING.top + (1 - (y - yMin) / (yMax - yMin)) * PLOT_H;
  let svg = '';
  const x0 = yToPx(0);
  const y0 = xToPx(0);
  svg += `<line x1="${PADDING.left}" y1="${x0}" x2="${SVG_W - PADDING.right}" y2="${x0}" stroke="${COLORS.axis}" stroke-width="1.5"/>`;
  svg += `<line x1="${y0}" y1="${PADDING.top}" x2="${y0}" y2="${SVG_H - PADDING.bottom}" stroke="${COLORS.axis}" stroke-width="1.5"/>`;
  // x ticks at multiples of π/2
  const step = Math.PI / 2;
  const kS = Math.ceil(xMin / step);
  const kE = Math.floor(xMax / step);
  for (let k = kS; k <= kE; k++) {
    if (k === 0) continue;
    const x = k * step;
    const px = xToPx(x);
    svg += `<line x1="${px}" y1="${x0 - 4}" x2="${px}" y2="${x0 + 4}" stroke="${COLORS.text}" stroke-width="1"/>`;
    svg += `<text x="${px}" y="${x0 + 16}" text-anchor="middle" font-size="10" fill="${COLORS.text}">${piLabel(x)}</text>`;
  }
  // y ticks at integers
  for (let v = Math.ceil(yMin); v <= Math.floor(yMax); v++) {
    if (v === 0) continue;
    const py = yToPx(v);
    svg += `<line x1="${y0 - 4}" y1="${py}" x2="${y0 + 4}" y2="${py}" stroke="${COLORS.text}" stroke-width="1"/>`;
    svg += `<text x="${y0 - 8}" y="${py + 4}" text-anchor="end" font-size="10" fill="${COLORS.text}">${v}</text>`;
  }
  // axis labels
  svg += `<text x="${SVG_W - PADDING.right + 12}" y="${x0 + 4}" font-size="12" fill="${COLORS.text}">x</text>`;
  svg += `<text x="${y0 + 8}" y="${PADDING.top - 8}" font-size="12" fill="${COLORS.text}">y</text>`;
  return svg;
}

function drawAsymptotes(state, lines) {
  const { xMin, xMax, yMin, yMax } = state;
  const xToPx = (x) => PADDING.left + ((x - xMin) / (xMax - xMin)) * PLOT_W;
  const yToPx = (y) => PADDING.top + (1 - (y - yMin) / (yMax - yMin)) * PLOT_H;
  return lines
    .map((x) => `<line x1="${xToPx(x)}" y1="${yToPx(yMax)}" x2="${xToPx(x)}" y2="${yToPx(yMin)}" stroke="${COLORS.asymptote}" stroke-width="1" stroke-dasharray="4 4"/>`)
    .join('');
}

function drawMidline(state) {
  if (Math.abs(state.d) < 0.005) return '';
  const { xMin, xMax, yMin, yMax, d } = state;
  const xToPx = (x) => PADDING.left + ((x - xMin) / (xMax - xMin)) * PLOT_W;
  const yToPx = (y) => PADDING.top + (1 - (y - yMin) / (yMax - yMin)) * PLOT_H;
  const py = yToPx(d);
  return `<line x1="${xToPx(xMin)}" y1="${py}" x2="${xToPx(xMax)}" y2="${py}" stroke="${COLORS.midline}" stroke-width="1" stroke-dasharray="2 4"/>`;
}

function eqTex(state) {
  const { func, a, b, c, d } = state;
  const f = FUNCS[func].name;
  const aR = +a.toFixed(2);
  const bR = +b.toFixed(2);
  const cR = +c.toFixed(2);
  const dR = +d.toFixed(2);
  let inner;
  if (bR === 1 && cR === 0) inner = 'x';
  else if (cR === 0) inner = `${bR}x`;
  else if (bR === 1) inner = cR > 0 ? `(x - ${cR})` : `(x + ${-cR})`;
  else inner = `${bR}(x ${cR >= 0 ? '-' : '+'} ${Math.abs(cR)})`;
  let front;
  if (aR === 1) front = '';
  else if (aR === -1) front = '-';
  else front = `${aR}\\,`;
  let trail = '';
  if (dR > 0) trail = ` + ${dR}`;
  else if (dR < 0) trail = ` - ${-dR}`;
  return `y = ${front}${f}\\!\\left(${inner}\\right)${trail}`;
}

function readouts(state) {
  const period = (2 * Math.PI) / state.b;
  const ampRow = ['sin', 'cos'].includes(state.func)
    ? `<div class="tg-rdo-row"><span>amplitude</span><strong>${fmt(Math.abs(state.a))}</strong></div>`
    : '';
  return `
    <div class="tg-eq">${tex(eqTex(state), true)}</div>
    <div class="tg-rdo">
      <div class="tg-rdo-row"><span>period</span><strong>${piLabel(period)}</strong></div>
      ${ampRow}
      <div class="tg-rdo-row"><span>phase shift (c)</span><strong>${piLabel(state.c)}</strong></div>
      <div class="tg-rdo-row"><span>vertical shift (d)</span><strong>${fmt(state.d)}</strong></div>
    </div>
  `;
}

function buildSvg(state) {
  return (
    drawAxes(state) +
    drawAsymptotes(state, findAsymptotes(state)) +
    drawMidline(state) +
    `<path d="${plotPath(state)}" stroke="${COLORS.curve}" stroke-width="2.5" fill="none"/>`
  );
}

export function mountTrigGraph(target, userConfig = {}) {
  const state = { ...DEFAULTS, ...userConfig };

  const showFunc = state.controls.includes('func');
  const showA = state.controls.includes('a');
  const showB = state.controls.includes('b');
  const showC = state.controls.includes('c');
  const showD = state.controls.includes('d');

  const sliderRow = (key, label, min, max, step, val) => `
    <div class="tg-row">
      <label>${label}</label>
      <input type="range" data-tg-${key} min="${min}" max="${max}" step="${step}" value="${val}"/>
      <span class="val" data-tg-${key}-val>${fmt(val)}</span>
    </div>`;

  const funcRow = showFunc
    ? `<div class="tg-row">
         <label>function</label>
         <div class="tg-tabs">
           ${['sin', 'cos', 'tan', 'cot', 'sec', 'csc']
             .map((f) => `<button data-tg-func="${f}" class="${state.func === f ? 'active' : ''}">${f}</button>`)
             .join('')}
         </div>
       </div>`
    : '';

  target.innerHTML = `
    <div class="tg-wrap">
      <svg class="tg-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Trig function graph">
        <g data-tg-svg></g>
      </svg>
      <div class="tg-controls">
        <div data-tg-readouts></div>
        ${funcRow}
        ${showA ? sliderRow('a', 'amplitude (a)', -3, 3, 0.1, state.a) : ''}
        ${showB ? sliderRow('b', 'frequency (b)', 0.25, 3, 0.05, state.b) : ''}
        ${showC ? sliderRow('c', 'phase shift (c)', -3.14, 3.14, 0.1, state.c) : ''}
        ${showD ? sliderRow('d', 'vertical shift (d)', -3, 3, 0.1, state.d) : ''}
      </div>
    </div>
  `;

  const svgG = target.querySelector('[data-tg-svg]');
  const readoutsEl = target.querySelector('[data-tg-readouts]');
  const render = () => {
    svgG.innerHTML = buildSvg(state);
    readoutsEl.innerHTML = readouts(state);
  };

  if (showFunc) {
    target.querySelectorAll('[data-tg-func]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.func = btn.dataset.tgFunc;
        target.querySelectorAll('[data-tg-func]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        render();
      });
    });
  }

  for (const key of ['a', 'b', 'c', 'd']) {
    const input = target.querySelector(`[data-tg-${key}]`);
    if (!input) continue;
    input.addEventListener('input', (e) => {
      state[key] = parseFloat(e.target.value);
      target.querySelector(`[data-tg-${key}-val]`).textContent = fmt(state[key]);
      render();
    });
  }

  render();
}
