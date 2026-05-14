import katex from 'katex';

// Trig-equation widget. Plots y = f(x) for f in {sin, cos, tan} together with
// a horizontal line y = c, marks every intersection in the viewing window,
// and shows the list of solution x-values. Designed to make "solve f(x) = c"
// visual: students see WHERE solutions live and how many there are.
//
// Config:
//   func: 'sin' | 'cos' | 'tan' (default 'sin')
//   c:    target RHS value (default 0.5)
//   xMin, xMax: viewing window (default -2π … 2π)

const SVG_W = 720;
const SVG_H = 360;
const PADDING = { left: 50, right: 30, top: 25, bottom: 40 };
const PLOT_W = SVG_W - PADDING.left - PADDING.right;
const PLOT_H = SVG_H - PADDING.top - PADDING.bottom;

const COLORS = {
  axis: '#cbd5e1',
  curve: '#4f46e5',
  asymptote: '#f87171',
  rhs: '#10b981',
  solution: '#dc2626',
  text: '#475569',
};

const FUNCS = {
  sin: { f: Math.sin, name: '\\sin', period: 2 * Math.PI },
  cos: { f: Math.cos, name: '\\cos', period: 2 * Math.PI },
  tan: { f: Math.tan, name: '\\tan', period: Math.PI },
};

const DEFAULTS = {
  func: 'sin',
  c: 0.5,
  xMin: -2 * Math.PI,
  xMax: 2 * Math.PI,
  yMin: -3,
  yMax: 3,
};

const tex = (s, display = false) => {
  try { return katex.renderToString(s, { throwOnError: false, displayMode: display }); }
  catch { return s; }
};

const fmt = (n, dp = 2) => parseFloat(Number(n).toFixed(dp)).toString();

function piLabel(n) {
  if (Math.abs(n) < 1e-9) return '0';
  const r = n / Math.PI;
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
  // sixths for tan-related angles
  const sixths = r * 6;
  if (Math.abs(sixths - Math.round(sixths)) < 0.02) {
    const k = Math.round(sixths);
    return k > 0 ? `${k}π/6` : `-${-k}π/6`;
  }
  return fmt(n);
}

// Find solutions to f(x) = c in [xMin, xMax] by sampling and bisecting.
function findSolutions(state) {
  const { func, c, xMin, xMax } = state;
  const f = FUNCS[func].f;
  const N = 4000;
  const dx = (xMax - xMin) / N;
  const sols = [];
  let prevG, prevX, prevValid;
  for (let i = 0; i <= N; i++) {
    const x = xMin + i * dx;
    const fx = f(x);
    const valid = Number.isFinite(fx) && Math.abs(fx) < 1e6;
    if (!valid) {
      prevValid = false;
      continue;
    }
    const g = fx - c;
    if (prevValid && Math.sign(g) !== Math.sign(prevG)) {
      // Avoid asymptote sign-flips for tan: skip if jump is huge.
      if (Math.abs(g - prevG) < 100) {
        // Linear interp between prevX and x to refine the root.
        const t = -prevG / (g - prevG);
        const root = prevX + t * (x - prevX);
        sols.push(root);
      }
    }
    prevG = g;
    prevX = x;
    prevValid = valid;
  }
  return sols;
}

function plotPath(state) {
  const { func, xMin, xMax, yMin, yMax } = state;
  const f = FUNCS[func].f;
  const xToPx = (x) => PADDING.left + ((x - xMin) / (xMax - xMin)) * PLOT_W;
  const yToPx = (y) => PADDING.top + (1 - (y - yMin) / (yMax - yMin)) * PLOT_H;
  const N = 1200;
  const dx = (xMax - xMin) / N;
  const yClipMax = Math.max(Math.abs(yMin), Math.abs(yMax)) * 2;
  let path = '';
  let inSeg = false;
  let prevY;
  for (let i = 0; i <= N; i++) {
    const x = xMin + i * dx;
    const y = f(x);
    if (!Number.isFinite(y) || Math.abs(y) > yClipMax) {
      inSeg = false;
      prevY = undefined;
      continue;
    }
    if (inSeg && prevY !== undefined && Math.sign(y) !== Math.sign(prevY) && Math.abs(y - prevY) > 4) {
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
  if (state.func !== 'tan') return [];
  const { xMin, xMax } = state;
  const out = [];
  const kS = Math.floor((xMin - Math.PI / 2) / Math.PI);
  const kE = Math.ceil((xMax - Math.PI / 2) / Math.PI);
  for (let k = kS; k <= kE; k++) {
    const x = Math.PI / 2 + k * Math.PI;
    if (x >= xMin && x <= xMax) out.push(x);
  }
  return out;
}

function buildSvg(state) {
  const { xMin, xMax, yMin, yMax, c } = state;
  const xToPx = (x) => PADDING.left + ((x - xMin) / (xMax - xMin)) * PLOT_W;
  const yToPx = (y) => PADDING.top + (1 - (y - yMin) / (yMax - yMin)) * PLOT_H;

  let svg = '';

  // Axes
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

  // Asymptotes (for tan)
  for (const ax of findAsymptotes(state)) {
    svg += `<line x1="${xToPx(ax)}" y1="${yToPx(yMax)}" x2="${xToPx(ax)}" y2="${yToPx(yMin)}" stroke="${COLORS.asymptote}" stroke-width="1" stroke-dasharray="4 4"/>`;
  }

  // Curve
  svg += `<path d="${plotPath(state)}" stroke="${COLORS.curve}" stroke-width="2.5" fill="none"/>`;

  // Horizontal line y = c
  if (c >= yMin && c <= yMax) {
    const py = yToPx(c);
    svg += `<line x1="${PADDING.left}" y1="${py}" x2="${SVG_W - PADDING.right}" y2="${py}" stroke="${COLORS.rhs}" stroke-width="2" stroke-dasharray="6 3"/>`;
    svg += `<text x="${SVG_W - PADDING.right - 4}" y="${py - 6}" text-anchor="end" font-size="11" fill="${COLORS.rhs}" font-weight="600">y = ${fmt(c)}</text>`;
  }

  // Solution markers
  const sols = findSolutions(state);
  for (const s of sols) {
    const px = xToPx(s);
    const py = yToPx(c);
    svg += `<circle cx="${px}" cy="${py}" r="5.5" fill="${COLORS.solution}" stroke="white" stroke-width="2"/>`;
  }

  return svg;
}

function readouts(state) {
  const sols = findSolutions(state);
  const f = FUNCS[state.func];
  const eqText = `${f.name}(x) = ${fmt(state.c)}`;
  const sortedSols = sols.sort((a, b) => a - b);
  let solList = '';
  if (sortedSols.length === 0) {
    solList = '<em>No solutions in viewing window.</em>';
  } else {
    solList = sortedSols
      .map((s) => `<span class="te-sol">${piLabel(s)}</span>`)
      .join(', ');
  }
  return `
    <div class="te-eq">${tex(eqText, true)}</div>
    <div class="te-rdo">
      <div class="te-rdo-row"><span>solutions visible</span><strong>${sortedSols.length}</strong></div>
      <div class="te-rdo-row"><span>period of $${f.name}$</span><strong>${piLabel(f.period)}</strong></div>
    </div>
    <div class="te-sols">${solList}</div>
  `;
}

export function mountTrigEquation(target, userConfig = {}) {
  const state = { ...DEFAULTS, ...userConfig };

  const sliderRow = (key, label, min, max, step, val) => `
    <div class="te-row">
      <label>${label}</label>
      <input type="range" data-te-${key} min="${min}" max="${max}" step="${step}" value="${val}"/>
      <span class="val" data-te-${key}-val>${fmt(val)}</span>
    </div>`;

  target.innerHTML = `
    <div class="te-wrap">
      <svg class="te-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Trig equation visualization">
        <g data-te-svg></g>
      </svg>
      <div class="te-controls">
        <div data-te-readouts></div>
        <div class="te-row">
          <label>function</label>
          <div class="te-tabs">
            ${['sin', 'cos', 'tan']
              .map((f) => `<button data-te-func="${f}" class="${state.func === f ? 'active' : ''}">${f}</button>`)
              .join('')}
          </div>
        </div>
        ${sliderRow('c', 'target value (c)', -2, 2, 0.05, state.c)}
        <div class="te-helper">Drag the green line up/down. The red dots mark every solution to ${tex(`${FUNCS[state.func].name}(x) = c`)} in the viewing window.</div>
      </div>
    </div>
  `;

  const svgG = target.querySelector('[data-te-svg]');
  const readoutsEl = target.querySelector('[data-te-readouts]');
  const helper = target.querySelector('.te-helper');

  const render = () => {
    svgG.innerHTML = buildSvg(state);
    readoutsEl.innerHTML = readouts(state);
    if (helper) {
      helper.innerHTML = helper.innerHTML.replace(
        /<span class="katex"[^>]*>.*?<\/span>(?=\.|\s|$)/,
        tex(`${FUNCS[state.func].name}(x) = c`),
      );
    }
  };

  target.querySelectorAll('[data-te-func]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.func = btn.dataset.teFunc;
      target.querySelectorAll('[data-te-func]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    });
  });

  target.querySelector('[data-te-c]').addEventListener('input', (e) => {
    state.c = parseFloat(e.target.value);
    target.querySelector('[data-te-c-val]').textContent = fmt(state.c);
    render();
  });

  render();
}
