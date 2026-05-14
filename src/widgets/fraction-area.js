import katex from 'katex';

// Fraction multiplication as area. The unit square is divided into a
// d1 x d2 grid (d1 columns, d2 rows). n1 columns are tinted in color A
// (the first fraction). n2 rows are tinted in color B (the second
// fraction). Cells in BOTH a tinted column AND a tinted row are filled
// with color C — and that count, n1*n2 out of d1*d2, is the product.

const SVG = 400;
const PAD = 10;

const COLORS = {
  fillA: '#c7d2fe',     // light indigo (column highlight)
  fillB: '#bbf7d0',     // light green (row highlight)
  fillBoth: '#7c3aed',  // purple (intersection — the product)
  empty: '#f8fafc',
  divider: '#cbd5e1',
  border: '#475569',
  textA: '#3730a3',
  textB: '#047857',
};

const DEFAULTS = {
  n1: 1, d1: 2,
  n2: 1, d2: 3,
  minDen: 2,
  maxDen: 8,
};

const tex = (s) => {
  try { return katex.renderToString(s, { throwOnError: false }); }
  catch { return s; }
};

function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; }

function buildSvg(state) {
  const inner = SVG - 2 * PAD;
  const cw = inner / state.d1;
  const ch = inner / state.d2;
  let svg = '';
  for (let r = 0; r < state.d2; r++) {
    for (let c = 0; c < state.d1; c++) {
      const x = PAD + c * cw;
      const y = PAD + r * ch;
      const inCol = c < state.n1;
      const inRow = r < state.n2;
      let fill = COLORS.empty;
      if (inCol && inRow) fill = COLORS.fillBoth;
      else if (inCol) fill = COLORS.fillA;
      else if (inRow) fill = COLORS.fillB;
      svg += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="${fill}" stroke="${COLORS.divider}" stroke-width="1"/>`;
    }
  }
  svg += `<rect x="${PAD}" y="${PAD}" width="${inner}" height="${inner}" fill="none" stroke="${COLORS.border}" stroke-width="2"/>`;
  // Side labels
  svg += `<text x="${PAD + inner / 2}" y="${SVG - PAD + 18}" font-size="13" fill="${COLORS.textA}" text-anchor="middle" font-weight="600">${state.n1}/${state.d1}</text>`;
  svg += `<text x="${PAD - 8}" y="${PAD + inner / 2}" font-size="13" fill="${COLORS.textB}" text-anchor="end" dominant-baseline="middle" font-weight="600">${state.n2}/${state.d2}</text>`;
  return svg;
}

function buildEqTex(state) {
  const num = state.n1 * state.n2;
  const den = state.d1 * state.d2;
  let s = `\\dfrac{${state.n1}}{${state.d1}} \\times \\dfrac{${state.n2}}{${state.d2}} = \\dfrac{${state.n1} \\cdot ${state.n2}}{${state.d1} \\cdot ${state.d2}} = \\dfrac{${num}}{${den}}`;
  const g = gcd(num, den) || 1;
  if (g > 1 && num !== 0) {
    s += ` = \\dfrac{${num / g}}{${den / g}}`;
  }
  return s;
}

export function mountFractionArea(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = { ...cfg };
  state.d1 = Math.max(cfg.minDen, Math.min(cfg.maxDen, state.d1));
  state.d2 = Math.max(cfg.minDen, Math.min(cfg.maxDen, state.d2));
  state.n1 = Math.max(0, Math.min(state.d1, state.n1));
  state.n2 = Math.max(0, Math.min(state.d2, state.n2));

  target.innerHTML = `
    <div class="fa-wrap">
      <svg class="fa-svg" viewBox="0 0 ${SVG} ${SVG}" role="img" aria-label="Fraction multiplication">
        <g data-fa-svg></g>
      </svg>
      <div class="fa-controls">
        <div class="fa-eq" data-fa-eq></div>
        <div class="fa-group">
          <div class="fa-group-title" style="color:${COLORS.textA}">First fraction (columns)</div>
          <div class="fa-row">
            <label>numerator</label>
            <input type="range" data-fa-n1 min="0" max="${state.d1}" step="1" value="${state.n1}"/>
            <span class="val" data-fa-n1val>${state.n1}</span>
          </div>
          <div class="fa-row">
            <label>denominator</label>
            <input type="range" data-fa-d1 min="${cfg.minDen}" max="${cfg.maxDen}" step="1" value="${state.d1}"/>
            <span class="val" data-fa-d1val>${state.d1}</span>
          </div>
        </div>
        <div class="fa-group">
          <div class="fa-group-title" style="color:${COLORS.textB}">Second fraction (rows)</div>
          <div class="fa-row">
            <label>numerator</label>
            <input type="range" data-fa-n2 min="0" max="${state.d2}" step="1" value="${state.n2}"/>
            <span class="val" data-fa-n2val>${state.n2}</span>
          </div>
          <div class="fa-row">
            <label>denominator</label>
            <input type="range" data-fa-d2 min="${cfg.minDen}" max="${cfg.maxDen}" step="1" value="${state.d2}"/>
            <span class="val" data-fa-d2val>${state.d2}</span>
          </div>
        </div>
        <div class="fa-helper">The <span style="color:${COLORS.fillBoth};font-weight:600">purple</span> region is the product — cells that are in both a shaded column <em>and</em> a shaded row.</div>
      </div>
    </div>
  `;

  const svgG = target.querySelector('[data-fa-svg]');
  const eqBox = target.querySelector('[data-fa-eq]');

  function render() {
    svgG.innerHTML = buildSvg(state);
    eqBox.innerHTML = tex(buildEqTex(state));
  }

  for (const side of [1, 2]) {
    const nKey = `n${side}`;
    const dKey = `d${side}`;
    target.querySelector(`[data-fa-${nKey}]`).addEventListener('input', (e) => {
      state[nKey] = parseInt(e.target.value, 10);
      target.querySelector(`[data-fa-${nKey}val]`).textContent = state[nKey];
      render();
    });
    target.querySelector(`[data-fa-${dKey}]`).addEventListener('input', (e) => {
      state[dKey] = parseInt(e.target.value, 10);
      if (state[nKey] > state[dKey]) state[nKey] = state[dKey];
      const nSlider = target.querySelector(`[data-fa-${nKey}]`);
      nSlider.max = state[dKey];
      nSlider.value = state[nKey];
      target.querySelector(`[data-fa-${nKey}val]`).textContent = state[nKey];
      target.querySelector(`[data-fa-${dKey}val]`).textContent = state[dKey];
      render();
    });
  }

  render();
}
