import katex from 'katex';

// Interactive sequence widget. Plots the first n terms of an arithmetic or
// geometric sequence as a scatter plot, lists the terms, shows the partial
// sum, and renders the explicit formula in the widget's current state.
//
// Config:
//   mode: 'arithmetic' | 'geometric' (default 'arithmetic')
//   a1: first term (default 1)
//   d: common difference, arithmetic only (default 2)
//   r: common ratio, geometric only (default 2)
//   n: number of terms (default 8)
//   showModeTabs: bool, allow switching arithmetic <-> geometric (default true)
//   showSum: bool, show partial sum row (default true)

const SVG_W = 460;
const SVG_H = 340;
const PADDING = { left: 50, right: 25, top: 25, bottom: 40 };

const COLORS = {
  axis: '#cbd5e1',
  point: '#4f46e5',
  line: '#cbd5e1',
  text: '#475569',
  zero: '#94a3b8',
};

const DEFAULTS = {
  mode: 'arithmetic',
  a1: 1,
  d: 2,
  r: 2,
  n: 8,
  showModeTabs: true,
  showSum: true,
};

const tex = (s, display = false) => {
  try { return katex.renderToString(s, { throwOnError: false, displayMode: display }); }
  catch { return s; }
};

const fmt = (n, dp = 2) => {
  if (!Number.isFinite(n)) return '∞';
  if (Math.abs(n) >= 1000) return n.toExponential(2);
  return parseFloat(n.toFixed(dp)).toString();
};

function computeTerms(state) {
  const { mode, a1, d, r, n } = state;
  const out = [];
  for (let k = 1; k <= n; k++) {
    const v = mode === 'arithmetic' ? a1 + (k - 1) * d : a1 * Math.pow(r, k - 1);
    out.push(v);
  }
  return out;
}

function partialSum(state, terms) {
  const { mode, a1, d, r, n } = state;
  if (mode === 'arithmetic') {
    return (n * (2 * a1 + (n - 1) * d)) / 2;
  }
  // geometric
  if (Math.abs(r - 1) < 1e-9) return a1 * n;
  return a1 * (1 - Math.pow(r, n)) / (1 - r);
}

function buildPlot(state, terms) {
  const PW = SVG_W - PADDING.left - PADDING.right;
  const PH = SVG_H - PADDING.top - PADDING.bottom;

  // Y range: include 0 so the user can see sign changes; cushion 10%.
  const finite = terms.filter((v) => Number.isFinite(v));
  let yMin = Math.min(0, ...finite);
  let yMax = Math.max(0, ...finite);
  if (yMin === yMax) { yMin -= 1; yMax += 1; }
  const span = yMax - yMin;
  yMin -= span * 0.08;
  yMax += span * 0.08;

  const xMin = 0.5;
  const xMax = state.n + 0.5;

  const xToPx = (x) => PADDING.left + ((x - xMin) / (xMax - xMin)) * PW;
  const yToPx = (y) => PADDING.top + (1 - (y - yMin) / (yMax - yMin)) * PH;

  let svg = '';

  // y = 0 reference (if visible)
  if (yMin <= 0 && yMax >= 0) {
    const y0 = yToPx(0);
    svg += `<line x1="${PADDING.left}" y1="${y0}" x2="${SVG_W - PADDING.right}" y2="${y0}" stroke="${COLORS.zero}" stroke-width="1" stroke-dasharray="3 3"/>`;
  }

  // axes
  svg += `<line x1="${PADDING.left}" y1="${SVG_H - PADDING.bottom}" x2="${SVG_W - PADDING.right}" y2="${SVG_H - PADDING.bottom}" stroke="${COLORS.axis}" stroke-width="1.5"/>`;
  svg += `<line x1="${PADDING.left}" y1="${PADDING.top}" x2="${PADDING.left}" y2="${SVG_H - PADDING.bottom}" stroke="${COLORS.axis}" stroke-width="1.5"/>`;

  // x ticks (integers 1..n)
  const xTickStep = state.n > 12 ? 2 : 1;
  for (let k = 1; k <= state.n; k += xTickStep) {
    const px = xToPx(k);
    svg += `<line x1="${px}" y1="${SVG_H - PADDING.bottom - 4}" x2="${px}" y2="${SVG_H - PADDING.bottom + 4}" stroke="${COLORS.text}" stroke-width="1"/>`;
    svg += `<text x="${px}" y="${SVG_H - PADDING.bottom + 16}" text-anchor="middle" font-size="10" fill="${COLORS.text}">${k}</text>`;
  }
  svg += `<text x="${SVG_W - PADDING.right}" y="${SVG_H - PADDING.bottom + 30}" text-anchor="end" font-size="11" fill="${COLORS.text}">n (term index)</text>`;
  svg += `<text x="${PADDING.left - 36}" y="${PADDING.top + 4}" font-size="11" fill="${COLORS.text}">a_n</text>`;

  // y ticks (5 between min and max)
  const niceStep = niceTickStep(yMax - yMin);
  const yStart = Math.ceil(yMin / niceStep) * niceStep;
  for (let v = yStart; v <= yMax; v += niceStep) {
    if (Math.abs(v) < 1e-9) continue;
    const py = yToPx(v);
    svg += `<line x1="${PADDING.left - 4}" y1="${py}" x2="${PADDING.left + 4}" y2="${py}" stroke="${COLORS.text}" stroke-width="1"/>`;
    svg += `<text x="${PADDING.left - 8}" y="${py + 4}" text-anchor="end" font-size="10" fill="${COLORS.text}">${fmt(v)}</text>`;
  }

  // points + connecting dashed line
  if (terms.length > 1) {
    let line = '';
    terms.forEach((v, i) => {
      if (!Number.isFinite(v)) return;
      const x = xToPx(i + 1);
      const y = yToPx(Math.max(yMin, Math.min(yMax, v)));
      line += (line === '' ? 'M' : 'L') + ` ${x} ${y} `;
    });
    svg += `<path d="${line}" stroke="${COLORS.line}" stroke-width="1" stroke-dasharray="4 4" fill="none"/>`;
  }
  terms.forEach((v, i) => {
    if (!Number.isFinite(v)) return;
    const cy = yToPx(Math.max(yMin, Math.min(yMax, v)));
    const cx = xToPx(i + 1);
    svg += `<circle cx="${cx}" cy="${cy}" r="5" fill="${COLORS.point}"/>`;
  });

  return svg;
}

function niceTickStep(span) {
  const raw = span / 6;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  let step;
  if (norm < 1.5) step = 1;
  else if (norm < 3.5) step = 2;
  else if (norm < 7.5) step = 5;
  else step = 10;
  return step * mag;
}

function eqTex(state) {
  if (state.mode === 'arithmetic') {
    const a1 = state.a1;
    const d = state.d;
    const a1Str = a1 === 0 ? '0' : `${fmt(a1)}`;
    const dStr = `${fmt(Math.abs(d))}`;
    if (d === 0) return `a_n = ${a1Str}`;
    if (d > 0) return `a_n = ${a1Str} + ${dStr}(n - 1)`;
    return `a_n = ${a1Str} - ${dStr}(n - 1)`;
  }
  // geometric
  const a1 = state.a1;
  const r = state.r;
  if (r === 1) return `a_n = ${fmt(a1)}`;
  return `a_n = ${fmt(a1)} \\cdot (${fmt(r)})^{\\,n - 1}`;
}

function termList(terms) {
  const labels = terms
    .slice(0, 12) // cap visible list to avoid overflow
    .map((v) => `<span class="seq-term">${fmt(v)}</span>`)
    .join(' , ');
  const more = terms.length > 12 ? ' …' : '';
  return `<div class="seq-terms">${labels}${more}</div>`;
}

function readouts(state, terms) {
  const sum = partialSum(state, terms);
  const sumRow = state.showSum
    ? `<div class="seq-rdo-row"><span>Partial sum $S_${state.n}$</span><strong>${fmt(sum)}</strong></div>`
    : '';
  return `
    <div class="seq-eq">${tex(eqTex(state), true)}</div>
    <div class="seq-rdo">
      <div class="seq-rdo-row"><span>type</span><strong>${state.mode === 'arithmetic' ? 'arithmetic (+)' : 'geometric (×)'}</strong></div>
      <div class="seq-rdo-row"><span>first term $a_1$</span><strong>${fmt(state.a1)}</strong></div>
      <div class="seq-rdo-row"><span>${state.mode === 'arithmetic' ? 'common diff $d$' : 'common ratio $r$'}</span><strong>${fmt(state.mode === 'arithmetic' ? state.d : state.r)}</strong></div>
      ${sumRow}
    </div>
    ${termList(terms)}
  `;
}

export function mountSequence(target, userConfig = {}) {
  const state = { ...DEFAULTS, ...userConfig };

  const sliderRow = (key, label, min, max, step, val) => `
    <div class="seq-row">
      <label>${label}</label>
      <input type="range" data-seq-${key} min="${min}" max="${max}" step="${step}" value="${val}"/>
      <span class="val" data-seq-${key}-val>${fmt(val)}</span>
    </div>`;

  const modeTabs = state.showModeTabs
    ? `<div class="seq-row">
         <label>type</label>
         <div class="seq-tabs">
           <button data-seq-mode="arithmetic" class="${state.mode === 'arithmetic' ? 'active' : ''}">arithmetic (+)</button>
           <button data-seq-mode="geometric" class="${state.mode === 'geometric' ? 'active' : ''}">geometric (×)</button>
         </div>
       </div>`
    : '';

  // Differs by mode: d slider for arithmetic, r slider for geometric.
  function paramSlider() {
    return state.mode === 'arithmetic'
      ? sliderRow('d', 'common difference (d)', -5, 5, 0.5, state.d)
      : sliderRow('r', 'common ratio (r)', -3, 3, 0.05, state.r);
  }

  target.innerHTML = `
    <div class="seq-wrap">
      <svg class="seq-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Sequence plot">
        <g data-seq-svg></g>
      </svg>
      <div class="seq-controls">
        <div data-seq-readouts></div>
        ${modeTabs}
        ${sliderRow('a1', 'first term (a₁)', -10, 10, 0.5, state.a1)}
        <div data-seq-param>${paramSlider()}</div>
        ${sliderRow('n', 'number of terms (n)', 2, 16, 1, state.n)}
      </div>
    </div>
  `;

  const svgG = target.querySelector('[data-seq-svg]');
  const readoutsEl = target.querySelector('[data-seq-readouts]');
  const paramSlot = target.querySelector('[data-seq-param]');

  function render() {
    const terms = computeTerms(state);
    svgG.innerHTML = buildPlot(state, terms);
    readoutsEl.innerHTML = readouts(state, terms);
  }

  function bindParam() {
    const key = state.mode === 'arithmetic' ? 'd' : 'r';
    const input = target.querySelector(`[data-seq-${key}]`);
    if (!input) return;
    input.addEventListener('input', (e) => {
      state[key] = parseFloat(e.target.value);
      target.querySelector(`[data-seq-${key}-val]`).textContent = fmt(state[key]);
      render();
    });
  }

  if (state.showModeTabs) {
    target.querySelectorAll('[data-seq-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.mode = btn.dataset.seqMode;
        target.querySelectorAll('[data-seq-mode]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        paramSlot.innerHTML = paramSlider();
        bindParam();
        render();
      });
    });
  }

  for (const key of ['a1', 'n']) {
    const input = target.querySelector(`[data-seq-${key}]`);
    if (!input) continue;
    input.addEventListener('input', (e) => {
      state[key] = key === 'n' ? parseInt(e.target.value, 10) : parseFloat(e.target.value);
      target.querySelector(`[data-seq-${key}-val]`).textContent = fmt(state[key]);
      render();
    });
  }

  bindParam();
  render();
}
