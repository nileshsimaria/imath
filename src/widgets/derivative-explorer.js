import katex from 'katex';

// Derivative explorer. Plots f(x), shows a movable point, and draws the
// tangent line at that point. The slope of the tangent IS f'(x) — students
// see "derivative = slope of tangent" by sliding the point and watching
// the slope change continuously.
//
// Optional overlay: f'(x) curve traced beneath f(x).
//
// Config:
//   func: preset function key (see PRESETS below; default 'parabola')
//   x0:   initial x for the movable point
//   xMin, xMax, yMin, yMax: viewing window (defaults vary by function)
//   showDerivative: bool, overlay f'(x) curve (default false)

const SVG_W = 640;
const SVG_H = 380;
const PAD = { left: 36, right: 16, top: 20, bottom: 36 };
const PLOT_W = SVG_W - PAD.left - PAD.right;
const PLOT_H = SVG_H - PAD.top - PAD.bottom;

const COLORS = {
  axis: '#cbd5e1',
  grid: '#f1f5f9',
  curve: '#4f46e5',
  derivative: '#10b981',
  tangent: '#dc2626',
  point: '#dc2626',
  text: '#475569',
};

// Each preset has:
//   label, latex, fn (numeric value), defaults for view window.
const PRESETS = {
  parabola: {
    label: 'f(x) = x²',
    latex: 'f(x) = x^2',
    derivativeLatex: "f'(x) = 2x",
    fn: (x) => x * x,
    xMin: -3, xMax: 3, yMin: -2, yMax: 9, x0: 1,
  },
  cubic: {
    label: 'f(x) = x³ - 3x',
    latex: 'f(x) = x^3 - 3x',
    derivativeLatex: "f'(x) = 3x^2 - 3",
    fn: (x) => x * x * x - 3 * x,
    xMin: -3, xMax: 3, yMin: -5, yMax: 5, x0: 0.5,
  },
  sin: {
    label: 'f(x) = sin(x)',
    latex: 'f(x) = \\sin(x)',
    derivativeLatex: "f'(x) = \\cos(x)",
    fn: Math.sin,
    xMin: -2 * Math.PI, xMax: 2 * Math.PI, yMin: -1.5, yMax: 1.5, x0: 0.5,
  },
  exp: {
    label: 'f(x) = eˣ',
    latex: 'f(x) = e^x',
    derivativeLatex: "f'(x) = e^x",
    fn: Math.exp,
    xMin: -2, xMax: 2.5, yMin: -1, yMax: 12, x0: 1,
  },
  ln: {
    label: 'f(x) = ln(x)',
    latex: 'f(x) = \\ln(x)',
    derivativeLatex: "f'(x) = 1/x",
    fn: (x) => x > 0 ? Math.log(x) : NaN,
    xMin: 0.05, xMax: 5, yMin: -3, yMax: 2, x0: 2,
  },
  recip: {
    label: 'f(x) = 1/x',
    latex: 'f(x) = 1/x',
    derivativeLatex: "f'(x) = -1/x^2",
    fn: (x) => Math.abs(x) < 0.001 ? NaN : 1 / x,
    xMin: -3, xMax: 3, yMin: -3, yMax: 3, x0: 1,
  },
};

const tex = (s, display = false) => {
  try { return katex.renderToString(s, { throwOnError: false, displayMode: display }); }
  catch { return s; }
};

const fmt = (n, dp = 3) => {
  if (!Number.isFinite(n)) return '—';
  return parseFloat(n.toFixed(dp)).toString();
};

// Numerical derivative via centered difference.
function numericDerivative(f, x, h = 1e-4) {
  const a = f(x + h);
  const b = f(x - h);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
  return (a - b) / (2 * h);
}

function plotPath(f, xMin, xMax, yMin, yMax, xToPx, yToPx) {
  const N = 600;
  const dx = (xMax - xMin) / N;
  let path = '';
  let inSeg = false;
  let prevY;
  const yClipMax = Math.max(Math.abs(yMin), Math.abs(yMax)) * 3;
  for (let i = 0; i <= N; i++) {
    const x = xMin + i * dx;
    const y = f(x);
    if (!Number.isFinite(y) || Math.abs(y) > yClipMax) {
      inSeg = false;
      prevY = undefined;
      continue;
    }
    if (inSeg && prevY !== undefined && Math.sign(y) !== Math.sign(prevY) && Math.abs(y - prevY) > Math.max(yMax - yMin, 1) * 0.5) {
      inSeg = false;
    }
    const px = xToPx(x);
    const py = yToPx(Math.max(yMin - 0.5, Math.min(yMax + 0.5, y)));
    path += inSeg ? ` L ${px} ${py}` : ` M ${px} ${py}`;
    inSeg = true;
    prevY = y;
  }
  return path;
}

function buildSvg(state) {
  const { x0, showDerivative } = state;
  const preset = PRESETS[state.func];
  const { fn, xMin, xMax, yMin, yMax } = state;

  const xToPx = (x) => PAD.left + ((x - xMin) / (xMax - xMin)) * PLOT_W;
  const yToPx = (y) => PAD.top + (1 - (y - yMin) / (yMax - yMin)) * PLOT_H;

  let svg = '';

  // axes
  const x0Px = yToPx(0);
  const y0Px = xToPx(0);
  svg += `<line x1="${PAD.left}" y1="${x0Px}" x2="${SVG_W - PAD.right}" y2="${x0Px}" stroke="${COLORS.axis}" stroke-width="1.5"/>`;
  svg += `<line x1="${y0Px}" y1="${PAD.top}" x2="${y0Px}" y2="${SVG_H - PAD.bottom}" stroke="${COLORS.axis}" stroke-width="1.5"/>`;

  // simple x-axis ticks at integers
  for (let v = Math.ceil(xMin); v <= Math.floor(xMax); v++) {
    if (v === 0) continue;
    const px = xToPx(v);
    svg += `<line x1="${px}" y1="${x0Px - 3}" x2="${px}" y2="${x0Px + 3}" stroke="${COLORS.text}" stroke-width="1"/>`;
    svg += `<text x="${px}" y="${x0Px + 14}" text-anchor="middle" font-size="10" fill="${COLORS.text}">${v}</text>`;
  }
  // y-axis ticks
  for (let v = Math.ceil(yMin); v <= Math.floor(yMax); v++) {
    if (v === 0) continue;
    const py = yToPx(v);
    svg += `<line x1="${y0Px - 3}" y1="${py}" x2="${y0Px + 3}" y2="${py}" stroke="${COLORS.text}" stroke-width="1"/>`;
    svg += `<text x="${y0Px - 6}" y="${py + 4}" text-anchor="end" font-size="10" fill="${COLORS.text}">${v}</text>`;
  }

  // f(x) curve
  svg += `<path d="${plotPath(fn, xMin, xMax, yMin, yMax, xToPx, yToPx)}" stroke="${COLORS.curve}" stroke-width="2.5" fill="none"/>`;

  // optional f'(x) curve
  if (showDerivative) {
    const fp = (x) => numericDerivative(fn, x);
    svg += `<path d="${plotPath(fp, xMin, xMax, yMin, yMax, xToPx, yToPx)}" stroke="${COLORS.derivative}" stroke-width="2" stroke-dasharray="6 3" fill="none"/>`;
  }

  // tangent line at x0
  const y0Val = fn(x0);
  const slope = numericDerivative(fn, x0);
  if (Number.isFinite(y0Val) && Number.isFinite(slope)) {
    // tangent: y - y0Val = slope (x - x0)
    // Find intersection with the viewport edges
    const y1 = y0Val + slope * (xMin - x0);
    const y2 = y0Val + slope * (xMax - x0);
    svg += `<line x1="${xToPx(xMin)}" y1="${yToPx(Math.max(yMin - 1, Math.min(yMax + 1, y1)))}" x2="${xToPx(xMax)}" y2="${yToPx(Math.max(yMin - 1, Math.min(yMax + 1, y2)))}" stroke="${COLORS.tangent}" stroke-width="2"/>`;
    // movable point
    const px = xToPx(x0);
    const py = yToPx(y0Val);
    svg += `<circle cx="${px}" cy="${py}" r="6" fill="${COLORS.point}" stroke="white" stroke-width="2"/>`;
  }

  return svg;
}

function readouts(state) {
  const preset = PRESETS[state.func];
  const slope = numericDerivative(state.fn, state.x0);
  const yVal = state.fn(state.x0);

  return `
    <div class="de-eq">${tex(preset.latex, true)}</div>
    <div class="de-rdo">
      <div class="de-rdo-row"><span>x</span><strong>${fmt(state.x0)}</strong></div>
      <div class="de-rdo-row"><span>f(x)</span><strong>${fmt(yVal)}</strong></div>
      <div class="de-rdo-row"><span>slope at x = f'(x)</span><strong style="color:#dc2626">${fmt(slope)}</strong></div>
    </div>
    <div class="de-derivative-eq">${tex(preset.derivativeLatex, true)}</div>
  `;
}

export function mountDerivativeExplorer(target, userConfig = {}) {
  const cfg = { func: 'parabola', showDerivative: false, ...userConfig };
  const preset = PRESETS[cfg.func] || PRESETS.parabola;
  const state = {
    func: cfg.func in PRESETS ? cfg.func : 'parabola',
    x0: cfg.x0 ?? preset.x0,
    fn: preset.fn,
    xMin: cfg.xMin ?? preset.xMin,
    xMax: cfg.xMax ?? preset.xMax,
    yMin: cfg.yMin ?? preset.yMin,
    yMax: cfg.yMax ?? preset.yMax,
    showDerivative: cfg.showDerivative,
  };

  const funcButtons = Object.entries(PRESETS)
    .map(([key, p]) => `<button data-de-func="${key}" class="${state.func === key ? 'active' : ''}">${p.label}</button>`)
    .join('');

  target.innerHTML = `
    <div class="de-wrap">
      <svg class="de-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Derivative explorer">
        <g data-de-svg></g>
      </svg>
      <div class="de-controls">
        <div data-de-readouts></div>
        <div class="de-row">
          <label>function</label>
          <div class="de-tabs">${funcButtons}</div>
        </div>
        <div class="de-row">
          <label>x value</label>
          <input type="range" data-de-x0 min="${state.xMin}" max="${state.xMax}" step="0.01" value="${state.x0}"/>
          <span class="val" data-de-x0-val>${fmt(state.x0)}</span>
        </div>
        <div class="de-row">
          <label>show f'(x)</label>
          <input type="checkbox" data-de-showd ${state.showDerivative ? 'checked' : ''}/>
          <span class="val" style="color:#10b981;font-weight:600">${state.showDerivative ? 'on' : 'off'}</span>
        </div>
      </div>
    </div>
  `;

  const svgG = target.querySelector('[data-de-svg]');
  const readoutsEl = target.querySelector('[data-de-readouts]');

  function render() {
    svgG.innerHTML = buildSvg(state);
    readoutsEl.innerHTML = readouts(state);
  }

  function setFunc(key) {
    const p = PRESETS[key];
    state.func = key;
    state.fn = p.fn;
    state.xMin = p.xMin; state.xMax = p.xMax;
    state.yMin = p.yMin; state.yMax = p.yMax;
    state.x0 = p.x0;
    const slider = target.querySelector('[data-de-x0]');
    slider.min = state.xMin;
    slider.max = state.xMax;
    slider.value = state.x0;
    target.querySelector('[data-de-x0-val]').textContent = fmt(state.x0);
    render();
  }

  target.querySelectorAll('[data-de-func]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setFunc(btn.dataset.deFunc);
      target.querySelectorAll('[data-de-func]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  target.querySelector('[data-de-x0]').addEventListener('input', (e) => {
    state.x0 = parseFloat(e.target.value);
    target.querySelector('[data-de-x0-val]').textContent = fmt(state.x0);
    render();
  });

  target.querySelector('[data-de-showd]').addEventListener('change', (e) => {
    state.showDerivative = e.target.checked;
    render();
  });

  render();
}
