import katex from 'katex';

// Right triangle with literal squares drawn on each side. Sliders for legs
// a and b. Hypotenuse c = √(a² + b²) computed live. Side areas a², b², c²
// labeled — the iconic visualization of a² + b² = c².

const SVG_W = 600;
const SVG_H = 460;

const COLORS = {
  triangle: '#eef2ff',
  triangleStroke: '#4f46e5',
  squareA: '#dbeafe',
  squareAStroke: '#2563eb',
  squareB: '#dcfce7',
  squareBStroke: '#16a34a',
  squareC: '#fce7f3',
  squareCStroke: '#db2777',
  text: '#1e293b',
  bg: '#fafbfc',
};

const DEFAULTS = {
  a: 3,
  b: 4,
  range: [1, 6],
  step: 1,
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

function buildSvg(a, b) {
  const c = Math.sqrt(a * a + b * b);
  const maxC = Math.max(a, b, c) + Math.max(a, b);
  const PX_PER_UNIT = 36;

  // Place the right-angle vertex (origin of the triangle) so everything fits.
  // Triangle: right angle at (originX, originY). Legs go right (a) and up (b).
  const originX = 200;
  const originY = 280;
  const A = { x: originX, y: originY };       // right-angle vertex
  const B = { x: originX + a * PX_PER_UNIT, y: originY };       // along x-axis
  const C = { x: originX, y: originY - b * PX_PER_UNIT };       // along y-axis

  let svg = '';

  // Square on leg a (below the triangle): A → B → B+down → A+down
  const sqA = `${A.x},${A.y} ${B.x},${B.y} ${B.x},${B.y + a * PX_PER_UNIT} ${A.x},${A.y + a * PX_PER_UNIT}`;
  svg += `<polygon points="${sqA}" fill="${COLORS.squareA}" stroke="${COLORS.squareAStroke}" stroke-width="1.5"/>`;
  svg += `<text x="${(A.x + B.x) / 2}" y="${A.y + a * PX_PER_UNIT / 2 + 6}" font-size="20" fill="${COLORS.squareAStroke}" text-anchor="middle" font-weight="700">a² = ${a * a}</text>`;

  // Square on leg b (left of the triangle): A → C → C+left → A+left
  const sqB = `${A.x},${A.y} ${C.x},${C.y} ${C.x - b * PX_PER_UNIT},${C.y} ${A.x - b * PX_PER_UNIT},${A.y}`;
  svg += `<polygon points="${sqB}" fill="${COLORS.squareB}" stroke="${COLORS.squareBStroke}" stroke-width="1.5"/>`;
  svg += `<text x="${A.x - b * PX_PER_UNIT / 2}" y="${(A.y + C.y) / 2 + 6}" font-size="20" fill="${COLORS.squareBStroke}" text-anchor="middle" font-weight="700">b² = ${b * b}</text>`;

  // Square on the hypotenuse (rotated). Direction perpendicular to BC, outward.
  // Hypotenuse goes from B (bottom-right) to C (top-left). Outward normal points up-right.
  const hypDx = C.x - B.x; // negative
  const hypDy = C.y - B.y; // negative
  const hypLen = Math.hypot(hypDx, hypDy);
  // Outward normal (rotated 90° clockwise from B→C direction so it points away from triangle interior)
  const nx = -hypDy / hypLen;
  const ny = hypDx / hypLen;
  const hypPx = c * PX_PER_UNIT;
  const sqC1 = B;
  const sqC2 = C;
  const sqC3 = { x: C.x + nx * hypPx, y: C.y + ny * hypPx };
  const sqC4 = { x: B.x + nx * hypPx, y: B.y + ny * hypPx };
  const sqC = `${sqC1.x},${sqC1.y} ${sqC2.x},${sqC2.y} ${sqC3.x},${sqC3.y} ${sqC4.x},${sqC4.y}`;
  svg += `<polygon points="${sqC}" fill="${COLORS.squareC}" stroke="${COLORS.squareCStroke}" stroke-width="1.5"/>`;
  // Center of the hypotenuse square for label
  const sqCcx = (sqC1.x + sqC2.x + sqC3.x + sqC4.x) / 4;
  const sqCcy = (sqC1.y + sqC2.y + sqC3.y + sqC4.y) / 4;
  svg += `<text x="${sqCcx}" y="${sqCcy + 6}" font-size="20" fill="${COLORS.squareCStroke}" text-anchor="middle" font-weight="700">c² = ${fmt(c * c, 1)}</text>`;

  // Triangle on top
  svg += `<polygon points="${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}" fill="${COLORS.triangle}" stroke="${COLORS.triangleStroke}" stroke-width="2.5"/>`;
  // Right angle indicator
  svg += `<path d="M ${A.x + 12} ${A.y} L ${A.x + 12} ${A.y - 12} L ${A.x} ${A.y - 12}" stroke="#64748b" stroke-width="1.5" fill="none"/>`;
  // Side labels on triangle
  svg += `<text x="${(A.x + B.x) / 2}" y="${A.y - 8}" font-size="14" fill="${COLORS.squareAStroke}" text-anchor="middle" font-weight="700">a = ${a}</text>`;
  svg += `<text x="${A.x - 8}" y="${(A.y + C.y) / 2}" font-size="14" fill="${COLORS.squareBStroke}" text-anchor="end" dominant-baseline="middle" font-weight="700">b = ${b}</text>`;
  // Hypotenuse label inside triangle
  const hypMidX = (B.x + C.x) / 2;
  const hypMidY = (B.y + C.y) / 2;
  svg += `<text x="${hypMidX + 12}" y="${hypMidY - 8}" font-size="14" fill="${COLORS.squareCStroke}" text-anchor="start" font-weight="700">c = ${fmt(c)}</text>`;

  return svg;
}

export function mountPythagorean(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = { a: cfg.a, b: cfg.b };

  target.innerHTML = `
    <div class="py-wrap">
      <svg class="py-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Pythagorean theorem">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-py-svg></g>
      </svg>
      <div class="py-controls">
        <div class="py-eq" data-py-eq></div>
        <div class="py-row">
          <label>leg <em>a</em></label>
          <input type="range" data-py-a min="${cfg.range[0]}" max="${cfg.range[1]}" step="${cfg.step}" value="${state.a}"/>
          <span class="val" data-py-aval>${state.a}</span>
        </div>
        <div class="py-row">
          <label>leg <em>b</em></label>
          <input type="range" data-py-b min="${cfg.range[0]}" max="${cfg.range[1]}" step="${cfg.step}" value="${state.b}"/>
          <span class="val" data-py-bval>${state.b}</span>
        </div>
        <div class="py-helper">The areas of the two smaller squares always add up to the area of the square on the hypotenuse: <strong>a² + b² = c²</strong>.</div>
      </div>
    </div>
  `;

  const svgG = target.querySelector('[data-py-svg]');
  const eqBox = target.querySelector('[data-py-eq]');

  function render() {
    svgG.innerHTML = buildSvg(state.a, state.b);
    const c2 = state.a * state.a + state.b * state.b;
    const c = Math.sqrt(c2);
    eqBox.innerHTML = tex(`${state.a}^2 + ${state.b}^2 = ${state.a * state.a} + ${state.b * state.b} = ${fmt(c2, 1)} \\;\\Rightarrow\\; c = ${fmt(c)}`);
  }

  render();
  ['a', 'b'].forEach((k) => {
    target.querySelector(`[data-py-${k}]`).addEventListener('input', (e) => {
      state[k] = parseInt(e.target.value, 10);
      target.querySelector(`[data-py-${k}val]`).textContent = state[k];
      render();
    });
  });
}
