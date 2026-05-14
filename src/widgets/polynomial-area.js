import katex from 'katex';

// Visualize (x + a)(x + b) as a rectangle of width (x + a) and height (x + b),
// divided into 4 sub-rectangles whose areas sum to x² + (a+b)x + ab.

const SVG_W = 600;
const SVG_H = 380;

const COLORS = {
  r1: '#dbeafe',  // x²
  r2: '#dcfce7',  // a · x
  r3: '#fef3c7',  // x · b
  r4: '#fce7f3',  // a · b
  border: '#475569',
  text: '#1e293b',
  varColor: '#4f46e5',
};

const DEFAULTS = {
  a: 3,
  b: 2,
  range: [1, 6],
};

const tex = (s) => {
  try { return katex.renderToString(s, { throwOnError: false }); }
  catch { return s; }
};

function buildSvg(a, b) {
  // Layout: rectangle at fixed position, x-portion fixed, a/b portions scale with values.
  const X_PX = 160; // pixel size for the "x" portion
  const UNIT = 22;  // pixels per unit constant
  const padX = 60;
  const padTop = 40;
  const wA = a * UNIT;
  const hB = b * UNIT;
  const rectW = X_PX + wA;
  const rectH = X_PX + hB;
  const x0 = padX;
  const y0 = padTop;
  const xMid = x0 + X_PX;       // boundary between x-portion and a-portion
  const yMid = y0 + X_PX;       // boundary between x-portion and b-portion

  let svg = '';
  // Region 1: x by x → x²
  svg += `<rect x="${x0}" y="${y0}" width="${X_PX}" height="${X_PX}" fill="${COLORS.r1}" stroke="${COLORS.border}" stroke-width="1.5"/>`;
  svg += `<text x="${x0 + X_PX / 2}" y="${y0 + X_PX / 2}" font-size="22" fill="${COLORS.text}" text-anchor="middle" dominant-baseline="middle" font-style="italic" font-weight="600">x²</text>`;
  // Region 2: a by x → a·x  (top-right)
  svg += `<rect x="${xMid}" y="${y0}" width="${wA}" height="${X_PX}" fill="${COLORS.r2}" stroke="${COLORS.border}" stroke-width="1.5"/>`;
  svg += `<text x="${xMid + wA / 2}" y="${y0 + X_PX / 2}" font-size="18" fill="${COLORS.text}" text-anchor="middle" dominant-baseline="middle" font-weight="600">${a}x</text>`;
  // Region 3: x by b → x·b  (bottom-left)
  svg += `<rect x="${x0}" y="${yMid}" width="${X_PX}" height="${hB}" fill="${COLORS.r3}" stroke="${COLORS.border}" stroke-width="1.5"/>`;
  svg += `<text x="${x0 + X_PX / 2}" y="${yMid + hB / 2}" font-size="18" fill="${COLORS.text}" text-anchor="middle" dominant-baseline="middle" font-weight="600">${b}x</text>`;
  // Region 4: a by b → a·b  (bottom-right)
  svg += `<rect x="${xMid}" y="${yMid}" width="${wA}" height="${hB}" fill="${COLORS.r4}" stroke="${COLORS.border}" stroke-width="1.5"/>`;
  svg += `<text x="${xMid + wA / 2}" y="${yMid + hB / 2}" font-size="16" fill="${COLORS.text}" text-anchor="middle" dominant-baseline="middle" font-weight="600">${a * b}</text>`;

  // Outer dimension labels
  // Top: x | a (showing the width breakdown)
  svg += `<text x="${x0 + X_PX / 2}" y="${y0 - 10}" font-size="14" fill="${COLORS.varColor}" text-anchor="middle" font-style="italic" font-weight="600">x</text>`;
  svg += `<text x="${xMid + wA / 2}" y="${y0 - 10}" font-size="14" fill="${COLORS.varColor}" text-anchor="middle" font-weight="600">${a}</text>`;
  // Left: x | b
  svg += `<text x="${x0 - 12}" y="${y0 + X_PX / 2}" font-size="14" fill="${COLORS.varColor}" text-anchor="end" dominant-baseline="middle" font-style="italic" font-weight="600">x</text>`;
  svg += `<text x="${x0 - 12}" y="${yMid + hB / 2}" font-size="14" fill="${COLORS.varColor}" text-anchor="end" dominant-baseline="middle" font-weight="600">${b}</text>`;

  // Outer brace lines (subtle)
  svg += `<line x1="${x0}" y1="${y0 - 22}" x2="${xMid}" y2="${y0 - 22}" stroke="${COLORS.varColor}" stroke-width="1"/>`;
  svg += `<line x1="${xMid}" y1="${y0 - 22}" x2="${x0 + rectW}" y2="${y0 - 22}" stroke="${COLORS.varColor}" stroke-width="1"/>`;
  svg += `<text x="${x0 + rectW / 2}" y="${y0 - 30}" font-size="13" fill="${COLORS.varColor}" text-anchor="middle" font-weight="700">x + ${a}</text>`;

  svg += `<line x1="${x0 - 28}" y1="${y0}" x2="${x0 - 28}" y2="${yMid}" stroke="${COLORS.varColor}" stroke-width="1"/>`;
  svg += `<line x1="${x0 - 28}" y1="${yMid}" x2="${x0 - 28}" y2="${y0 + rectH}" stroke="${COLORS.varColor}" stroke-width="1"/>`;
  svg += `<text x="${x0 - 36}" y="${y0 + rectH / 2}" font-size="13" fill="${COLORS.varColor}" text-anchor="end" dominant-baseline="middle" font-weight="700">x + ${b}</text>`;

  return svg;
}

function buildEq(a, b) {
  const sumAB = a + b;
  const prodAB = a * b;
  const middle = sumAB === 0 ? '' : sumAB === 1 ? ' + x' : sumAB === -1 ? ' - x' : (sumAB > 0 ? ` + ${sumAB}x` : ` - ${Math.abs(sumAB)}x`);
  const cTerm = prodAB === 0 ? '' : (prodAB > 0 ? ` + ${prodAB}` : ` - ${Math.abs(prodAB)}`);
  return `(x + ${a})(x + ${b}) = x^2${middle}${cTerm}`;
}

export function mountPolynomialArea(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = { a: cfg.a, b: cfg.b };

  target.innerHTML = `
    <div class="pa-wrap">
      <svg class="pa-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Polynomial area model">
        <g data-pa-svg></g>
      </svg>
      <div class="pa-controls">
        <div class="pa-eq" data-pa-eq></div>
        <div class="pa-row">
          <label><em>a</em></label>
          <input type="range" data-pa-a min="${cfg.range[0]}" max="${cfg.range[1]}" step="1" value="${state.a}"/>
          <span class="val" data-pa-aval>${state.a}</span>
        </div>
        <div class="pa-row">
          <label><em>b</em></label>
          <input type="range" data-pa-b min="${cfg.range[0]}" max="${cfg.range[1]}" step="1" value="${state.b}"/>
          <span class="val" data-pa-bval>${state.b}</span>
        </div>
        <div class="pa-helper">The big rectangle has width $(x + a)$ and height $(x + b)$. Each colored region's area is its width × height; the four regions add up to the expanded polynomial.</div>
      </div>
    </div>
  `;

  const helperEl = target.querySelector('.pa-helper');
  if (helperEl) helperEl.innerHTML = helperEl.innerHTML.replace(/\$([^$]+)\$/g, (_, t) => tex(t));

  const svgG = target.querySelector('[data-pa-svg]');
  const eqBox = target.querySelector('[data-pa-eq]');

  function render() {
    svgG.innerHTML = buildSvg(state.a, state.b);
    eqBox.innerHTML = tex(buildEq(state.a, state.b));
  }

  render();
  ['a', 'b'].forEach((k) => {
    target.querySelector(`[data-pa-${k}]`).addEventListener('input', (e) => {
      state[k] = parseInt(e.target.value, 10);
      target.querySelector(`[data-pa-${k}val]`).textContent = state[k];
      render();
    });
  });
}
