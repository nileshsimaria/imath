import katex from 'katex';

// Riemann sum widget. Plots f(x) over [a, b] with rectangles approximating
// the area under the curve. Tabs to switch left/right/midpoint sums; slider
// to vary n. Live readout of the rectangle-sum approximation alongside the
// 'true' integral value (via high-n trapezoidal estimate).
//
// Config:
//   func: preset key (see PRESETS)
//   a, b: interval bounds (defaults from preset)
//   n:    initial number of rectangles (default 4)
//   type: 'left' | 'right' | 'midpoint' (default 'left')

const SVG_W = 640;
const SVG_H = 380;
const PAD = { left: 36, right: 16, top: 24, bottom: 36 };
const PLOT_W = SVG_W - PAD.left - PAD.right;
const PLOT_H = SVG_H - PAD.top - PAD.bottom;

const COLORS = {
  axis: '#cbd5e1',
  curve: '#4f46e5',
  rect: 'rgba(16, 185, 129, 0.35)',
  rectStroke: '#10b981',
  text: '#475569',
  exact: '#dc2626',
};

const PRESETS = {
  parabola: {
    label: 'f(x) = x²',
    latex: 'f(x) = x^2',
    fn: (x) => x * x,
    a: 0, b: 2, exactIntegral: 8 / 3,
  },
  cubic: {
    label: 'f(x) = x³',
    latex: 'f(x) = x^3',
    fn: (x) => x * x * x,
    a: 0, b: 2, exactIntegral: 4,
  },
  sin: {
    label: 'f(x) = sin(x)',
    latex: 'f(x) = \\sin(x)',
    fn: Math.sin,
    a: 0, b: Math.PI, exactIntegral: 2,
  },
  exp: {
    label: 'f(x) = eˣ',
    latex: 'f(x) = e^x',
    fn: Math.exp,
    a: 0, b: 1, exactIntegral: Math.E - 1,
  },
  linear: {
    label: 'f(x) = x',
    latex: 'f(x) = x',
    fn: (x) => x,
    a: 0, b: 4, exactIntegral: 8,
  },
};

const tex = (s, display = false) => {
  try { return katex.renderToString(s, { throwOnError: false, displayMode: display }); }
  catch { return s; }
};

const fmt = (n, dp = 4) => {
  if (!Number.isFinite(n)) return '—';
  return parseFloat(n.toFixed(dp)).toString();
};

function riemannSum(fn, a, b, n, type) {
  const dx = (b - a) / n;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    let x;
    if (type === 'left') x = a + i * dx;
    else if (type === 'right') x = a + (i + 1) * dx;
    else x = a + (i + 0.5) * dx;
    sum += fn(x);
  }
  return sum * dx;
}

function plotPath(fn, a, b, xToPx, yToPx, yMin, yMax) {
  const N = 400;
  const dx = (b - a) / N;
  let path = '';
  for (let i = 0; i <= N; i++) {
    const x = a + i * dx;
    const y = fn(x);
    if (!Number.isFinite(y)) continue;
    const px = xToPx(x);
    const py = yToPx(Math.max(yMin - 1, Math.min(yMax + 1, y)));
    path += (i === 0 ? 'M' : 'L') + ` ${px} ${py} `;
  }
  return path;
}

function buildSvg(state) {
  const { fn, a, b, n, type } = state;

  // Determine y-range from samples on the interval
  const SAMPLES = 200;
  const ys = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const x = a + (i / SAMPLES) * (b - a);
    const y = fn(x);
    if (Number.isFinite(y)) ys.push(y);
  }
  let yMax = Math.max(0, ...ys);
  let yMin = Math.min(0, ...ys);
  if (yMin === yMax) { yMin -= 1; yMax += 1; }
  const span = yMax - yMin;
  yMin -= span * 0.08;
  yMax += span * 0.08;

  const xToPx = (x) => PAD.left + ((x - a) / (b - a)) * PLOT_W;
  const yToPx = (y) => PAD.top + (1 - (y - yMin) / (yMax - yMin)) * PLOT_H;

  let svg = '';
  // x-axis (at y=0 if visible, else at bottom)
  const x0 = yToPx(Math.max(yMin, Math.min(yMax, 0)));
  svg += `<line x1="${PAD.left}" y1="${x0}" x2="${SVG_W - PAD.right}" y2="${x0}" stroke="${COLORS.axis}" stroke-width="1.5"/>`;

  // x ticks at a and b
  for (const v of [a, b]) {
    const px = xToPx(v);
    svg += `<line x1="${px}" y1="${x0 - 4}" x2="${px}" y2="${x0 + 4}" stroke="${COLORS.text}" stroke-width="1"/>`;
    svg += `<text x="${px}" y="${SVG_H - PAD.bottom + 14}" text-anchor="middle" font-size="11" fill="${COLORS.text}">${fmt(v, 2)}</text>`;
  }

  // Rectangles
  const dx = (b - a) / n;
  const rectW = (PLOT_W / n);
  for (let i = 0; i < n; i++) {
    const xLeft = a + i * dx;
    let xSample;
    if (type === 'left') xSample = xLeft;
    else if (type === 'right') xSample = xLeft + dx;
    else xSample = xLeft + dx / 2;
    const yVal = fn(xSample);
    if (!Number.isFinite(yVal)) continue;
    const xPx = xToPx(xLeft);
    const yPxTop = yToPx(Math.max(0, yVal));
    const yPxBottom = yToPx(Math.min(0, yVal));
    const h = Math.abs(yToPx(yVal) - yToPx(0));
    const yRect = yVal >= 0 ? yToPx(yVal) : yToPx(0);
    svg += `<rect x="${xPx}" y="${yRect}" width="${rectW}" height="${h}" fill="${COLORS.rect}" stroke="${COLORS.rectStroke}" stroke-width="1"/>`;
  }

  // Curve on top
  svg += `<path d="${plotPath(fn, a, b, xToPx, yToPx, yMin, yMax)}" stroke="${COLORS.curve}" stroke-width="2.5" fill="none"/>`;

  return svg;
}

function readouts(state) {
  const preset = PRESETS[state.func];
  const sum = riemannSum(state.fn, state.a, state.b, state.n, state.type);
  const exact = preset.exactIntegral;
  const error = sum - exact;
  return `
    <div class="rs-eq">${tex(preset.latex, true)}</div>
    <div class="rs-rdo">
      <div class="rs-rdo-row"><span>method</span><strong>${state.type}</strong></div>
      <div class="rs-rdo-row"><span>n (rectangles)</span><strong>${state.n}</strong></div>
      <div class="rs-rdo-row"><span>${state.type} sum</span><strong style="color:#10b981">${fmt(sum)}</strong></div>
      <div class="rs-rdo-row"><span>exact integral</span><strong style="color:#dc2626">${fmt(exact)}</strong></div>
      <div class="rs-rdo-row"><span>error</span><strong>${fmt(error)}</strong></div>
    </div>
    <div class="rs-helper">As n grows, the rectangle sum converges to the true integral.</div>
  `;
}

export function mountRiemannSum(target, userConfig = {}) {
  const cfg = { func: 'parabola', n: 4, type: 'left', ...userConfig };
  const preset = PRESETS[cfg.func] || PRESETS.parabola;
  const state = {
    func: cfg.func in PRESETS ? cfg.func : 'parabola',
    fn: preset.fn,
    a: cfg.a ?? preset.a,
    b: cfg.b ?? preset.b,
    n: cfg.n,
    type: cfg.type,
  };

  const funcButtons = Object.entries(PRESETS)
    .map(([key, p]) => `<button data-rs-func="${key}" class="${state.func === key ? 'active' : ''}">${p.label}</button>`)
    .join('');

  target.innerHTML = `
    <div class="rs-wrap">
      <svg class="rs-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Riemann sum">
        <g data-rs-svg></g>
      </svg>
      <div class="rs-controls">
        <div data-rs-readouts></div>
        <div class="rs-row">
          <label>function</label>
          <div class="rs-tabs">${funcButtons}</div>
        </div>
        <div class="rs-row">
          <label>method</label>
          <div class="rs-tabs">
            <button data-rs-type="left" class="${state.type === 'left' ? 'active' : ''}">left</button>
            <button data-rs-type="midpoint" class="${state.type === 'midpoint' ? 'active' : ''}">mid</button>
            <button data-rs-type="right" class="${state.type === 'right' ? 'active' : ''}">right</button>
          </div>
        </div>
        <div class="rs-row">
          <label>n</label>
          <input type="range" data-rs-n min="1" max="60" step="1" value="${state.n}"/>
          <span class="val" data-rs-n-val>${state.n}</span>
        </div>
      </div>
    </div>
  `;

  const svgG = target.querySelector('[data-rs-svg]');
  const readoutsEl = target.querySelector('[data-rs-readouts]');

  function render() {
    svgG.innerHTML = buildSvg(state);
    readoutsEl.innerHTML = readouts(state);
  }

  function setFunc(key) {
    const p = PRESETS[key];
    state.func = key;
    state.fn = p.fn;
    state.a = p.a; state.b = p.b;
    render();
  }

  target.querySelectorAll('[data-rs-func]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setFunc(btn.dataset.rsFunc);
      target.querySelectorAll('[data-rs-func]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  target.querySelectorAll('[data-rs-type]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.type = btn.dataset.rsType;
      target.querySelectorAll('[data-rs-type]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    });
  });

  target.querySelector('[data-rs-n]').addEventListener('input', (e) => {
    state.n = parseInt(e.target.value, 10);
    target.querySelector('[data-rs-n-val]').textContent = state.n;
    render();
  });

  render();
}
