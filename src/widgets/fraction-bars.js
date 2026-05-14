import katex from 'katex';

// Fraction bars widget. Modes:
//   add-fractions       (default) two bars (n1/d1 and n2/d2) plus a sum bar over the LCD
//   compare-fractions   two bars side-by-side with no sum

const SVG_W = 600;
const SVG_H = 380;
const BAR_X = 30;
const BAR_W = 540;
const BAR_H = 60;
const Y = { bar1: 30, op1: 118, bar2: 135, op2: 223, sum1: 240 };

const COLORS = {
  fillA: '#4f46e5',
  fillB: '#10b981',
  fillSum: '#7c3aed',
  empty: '#f8fafc',
  divider: '#cbd5e1',
  border: '#475569',
  op: '#334155',
};

const DEFAULTS = {
  mode: 'add-fractions',
  n1: 1, d1: 2,
  n2: 1, d2: 3,
  minDen: 1,
  maxDen: 12,
};

const gcd = (a, b) => {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
};
const lcm = (a, b) => (a === 0 || b === 0 ? 0 : Math.abs((a * b) / gcd(a, b)));

const tex = (s, display = false) => {
  try {
    return katex.renderToString(s, { throwOnError: false, displayMode: display });
  } catch {
    return s;
  }
};

function fracTex(n, d) {
  if (d === 1) return `${n}`;
  return `\\dfrac{${n}}{${d}}`;
}

function simplify(n, d) {
  if (d === 0) return [n, d];
  if (n === 0) return [0, 1];
  const g = gcd(n, d) || 1;
  return [n / g, d / g];
}

function buildEqTex(n1, d1, n2, d2) {
  const lcd = lcm(d1, d2);
  if (lcd === 0) return '';
  const a = n1 * (lcd / d1);
  const b = n2 * (lcd / d2);
  const sum = a + b;
  const left = `${fracTex(n1, d1)} + ${fracTex(n2, d2)}`;

  if (d1 === d2) {
    const [sn, sd] = simplify(sum, lcd);
    if (sn === sum && sd === lcd) return `${left} = ${fracTex(sum, lcd)}`;
    return `${left} = ${fracTex(sum, lcd)} = ${fracTex(sn, sd)}`;
  }

  const conv = `${fracTex(a, lcd)} + ${fracTex(b, lcd)}`;
  const result = fracTex(sum, lcd);
  const [sn, sd] = simplify(sum, lcd);
  if (sn === sum && sd === lcd) return `${left} = ${conv} = ${result}`;
  return `${left} = ${conv} = ${result} = ${fracTex(sn, sd)}`;
}

function renderBar(yTop, n, d, fillColor) {
  if (d === 0) {
    return `<rect x="${BAR_X}" y="${yTop}" width="${BAR_W}" height="${BAR_H}" fill="${COLORS.empty}" stroke="${COLORS.border}" stroke-width="2"/>`;
  }
  const segW = BAR_W / d;
  let svg = '';
  for (let i = 0; i < d; i++) {
    const x = BAR_X + i * segW;
    const fill = i < n ? fillColor : COLORS.empty;
    svg += `<rect x="${x}" y="${yTop}" width="${segW}" height="${BAR_H}" fill="${fill}" stroke="${COLORS.divider}" stroke-width="1"/>`;
  }
  svg += `<rect x="${BAR_X}" y="${yTop}" width="${BAR_W}" height="${BAR_H}" fill="none" stroke="${COLORS.border}" stroke-width="2"/>`;
  return svg;
}

function renderOp(yMid, ch) {
  return `<text x="${SVG_W / 2}" y="${yMid}" font-size="26" fill="${COLORS.op}" text-anchor="middle" font-weight="600">${ch}</text>`;
}

function buildSvg(state) {
  const { n1, d1, n2, d2, mode } = state;
  const showSum = mode !== 'compare-fractions';

  let svg = '';
  svg += renderBar(Y.bar1, n1, d1, COLORS.fillA);
  if (showSum) svg += renderOp(Y.op1, '+');
  svg += renderBar(Y.bar2, n2, d2, COLORS.fillB);

  if (showSum) {
    svg += renderOp(Y.op2, '=');
    const lcd = lcm(d1, d2);
    if (lcd > 0) {
      const sumNum = n1 * (lcd / d1) + n2 * (lcd / d2);
      const wholeBars = Math.floor(sumNum / lcd);
      const remainder = sumNum % lcd;
      let y = Y.sum1;
      for (let i = 0; i < wholeBars; i++) {
        svg += renderBar(y, lcd, lcd, COLORS.fillSum);
        y += BAR_H + 5;
      }
      if (remainder > 0 || wholeBars === 0) {
        svg += renderBar(y, remainder, lcd, COLORS.fillSum);
      }
    }
  }
  return svg;
}

export function mountFractionBars(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = { ...cfg };

  // Clamp initial state.
  state.d1 = Math.max(cfg.minDen, Math.min(cfg.maxDen, state.d1));
  state.d2 = Math.max(cfg.minDen, Math.min(cfg.maxDen, state.d2));
  state.n1 = Math.max(0, Math.min(state.d1, state.n1));
  state.n2 = Math.max(0, Math.min(state.d2, state.n2));

  const showSum = state.mode !== 'compare-fractions';

  target.innerHTML = `
    <div class="fb-wrap">
      <svg class="fb-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Fraction bars">
        <g data-fb-svg></g>
      </svg>
      <div class="fb-controls">
        ${showSum ? '<div class="fb-eq" data-fb-eq></div>' : ''}
        <div class="fb-group">
          <div class="fb-group-title" style="color:${COLORS.fillA}">First fraction</div>
          <div class="fb-row">
            <label>numerator</label>
            <input type="range" data-fb-n1 min="0" max="${state.d1}" step="1" value="${state.n1}"/>
            <span class="val" data-fb-n1val>${state.n1}</span>
          </div>
          <div class="fb-row">
            <label>denominator</label>
            <input type="range" data-fb-d1 min="${cfg.minDen}" max="${cfg.maxDen}" step="1" value="${state.d1}"/>
            <span class="val" data-fb-d1val>${state.d1}</span>
          </div>
        </div>
        <div class="fb-group">
          <div class="fb-group-title" style="color:${COLORS.fillB}">Second fraction</div>
          <div class="fb-row">
            <label>numerator</label>
            <input type="range" data-fb-n2 min="0" max="${state.d2}" step="1" value="${state.n2}"/>
            <span class="val" data-fb-n2val>${state.n2}</span>
          </div>
          <div class="fb-row">
            <label>denominator</label>
            <input type="range" data-fb-d2 min="${cfg.minDen}" max="${cfg.maxDen}" step="1" value="${state.d2}"/>
            <span class="val" data-fb-d2val>${state.d2}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  const svgG = target.querySelector('[data-fb-svg]');
  const eqBox = target.querySelector('[data-fb-eq]');

  function render() {
    svgG.innerHTML = buildSvg(state);
    if (eqBox) eqBox.innerHTML = tex(buildEqTex(state.n1, state.d1, state.n2, state.d2));
  }

  function refreshNumerator(side) {
    const n = side === 1 ? state.n1 : state.n2;
    const d = side === 1 ? state.d1 : state.d2;
    const slider = target.querySelector(`[data-fb-n${side}]`);
    const val = target.querySelector(`[data-fb-n${side}val]`);
    slider.max = d;
    slider.value = n;
    val.textContent = n;
  }

  for (const side of [1, 2]) {
    const nKey = `n${side}`;
    const dKey = `d${side}`;

    target.querySelector(`[data-fb-${nKey}]`).addEventListener('input', (e) => {
      state[nKey] = parseInt(e.target.value, 10);
      target.querySelector(`[data-fb-${nKey}val]`).textContent = state[nKey];
      render();
    });

    target.querySelector(`[data-fb-${dKey}]`).addEventListener('input', (e) => {
      state[dKey] = parseInt(e.target.value, 10);
      if (state[nKey] > state[dKey]) state[nKey] = state[dKey];
      refreshNumerator(side);
      target.querySelector(`[data-fb-${dKey}val]`).textContent = state[dKey];
      render();
    });
  }

  render();
}
