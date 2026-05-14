// Fractal explorer.
//
// Renders famous fractals iteratively. Each step zooms in on the recursion.
//
// Modes:
//   sierpinski-triangle   filled triangle, repeatedly remove the middle triangle
//   koch-snowflake        equilateral triangle, repeatedly bump each side into a peak
//   sierpinski-carpet     filled square, repeatedly remove the middle ninth
//   pythagoras-tree       square with two smaller squares glued at 45° on top
//
// Slider:
//   iterations: 0..6 (capped to avoid combinatorial explosion)

const SVG_W = 520;
const SVG_H = 460;

const COLORS = {
  bg: '#fafbfc',
  fill: '#4f46e5',
  fillAlt: '#a5b4fc',
  stroke: '#1e293b',
  textMuted: '#64748b',
};

const DEFAULTS = {
  mode: 'sierpinski-triangle',
  iterations: 4,
};

function fmt(n) { return Number(n).toString(); }

// === Sierpinski triangle ===
function sierpinskiTriangles(P1, P2, P3, depth) {
  // Returns array of triangle vertex triples (filled triangles).
  if (depth === 0) return [[P1, P2, P3]];
  const m12 = [(P1[0] + P2[0]) / 2, (P1[1] + P2[1]) / 2];
  const m23 = [(P2[0] + P3[0]) / 2, (P2[1] + P3[1]) / 2];
  const m13 = [(P1[0] + P3[0]) / 2, (P1[1] + P3[1]) / 2];
  return [
    ...sierpinskiTriangles(P1, m12, m13, depth - 1),
    ...sierpinskiTriangles(m12, P2, m23, depth - 1),
    ...sierpinskiTriangles(m13, m23, P3, depth - 1),
  ];
}

function renderSierpinski(iter) {
  const tri = [[60, SVG_H - 50], [SVG_W - 60, SVG_H - 50], [SVG_W / 2, 50]];
  const triangles = sierpinskiTriangles(tri[0], tri[1], tri[2], Math.min(6, iter));
  let svg = '';
  for (const t of triangles) {
    svg += `<polygon points="${t[0][0]},${t[0][1]} ${t[1][0]},${t[1][1]} ${t[2][0]},${t[2][1]}" fill="${COLORS.fill}" stroke="none"/>`;
  }
  return { svg, count: triangles.length };
}

// === Koch snowflake ===
function kochSegments(P1, P2, depth) {
  if (depth === 0) return [P1, P2];
  // Subdivide P1-P2 into 4 segments forming a bump.
  const dx = P2[0] - P1[0], dy = P2[1] - P1[1];
  const a = [P1[0] + dx / 3, P1[1] + dy / 3];
  const b = [P1[0] + 2 * dx / 3, P1[1] + 2 * dy / 3];
  // Apex of bump: rotate (b - a) by +60° around a.
  const ux = b[0] - a[0], uy = b[1] - a[1];
  const cos60 = 0.5, sin60 = -Math.sqrt(3) / 2; // negative for SVG y-down so peak points up
  const peak = [a[0] + ux * cos60 - uy * sin60, a[1] + ux * sin60 + uy * cos60];
  return [
    ...kochSegments(P1, a, depth - 1).slice(0, -1),
    ...kochSegments(a, peak, depth - 1).slice(0, -1),
    ...kochSegments(peak, b, depth - 1).slice(0, -1),
    ...kochSegments(b, P2, depth - 1),
  ];
}

function renderKoch(iter) {
  // Start with an equilateral triangle.
  const cx = SVG_W / 2, cy = SVG_H / 2 + 30;
  const R = 160;
  const P1 = [cx + R * Math.cos(-Math.PI / 2), cy + R * Math.sin(-Math.PI / 2)];
  const P2 = [cx + R * Math.cos(-Math.PI / 2 + 2 * Math.PI / 3), cy + R * Math.sin(-Math.PI / 2 + 2 * Math.PI / 3)];
  const P3 = [cx + R * Math.cos(-Math.PI / 2 - 2 * Math.PI / 3), cy + R * Math.sin(-Math.PI / 2 - 2 * Math.PI / 3)];
  const d = Math.min(5, iter);
  // Build segments for each of the three edges in order.
  const edge1 = kochSegments(P1, P2, d);
  const edge2 = kochSegments(P2, P3, d);
  const edge3 = kochSegments(P3, P1, d);
  const pts = [...edge1, ...edge2.slice(1), ...edge3.slice(1)];
  let svg = `<polygon points="${pts.map(p => p.join(',')).join(' ')}" fill="${COLORS.fillAlt}" stroke="${COLORS.stroke}" stroke-width="1.5"/>`;
  return { svg, count: pts.length };
}

// === Sierpinski carpet ===
function sierpinskiCarpetSquares(x, y, size, depth) {
  if (depth === 0) return [[x, y, size]];
  const third = size / 3;
  const result = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (i === 1 && j === 1) continue; // skip middle
      result.push(...sierpinskiCarpetSquares(x + i * third, y + j * third, third, depth - 1));
    }
  }
  return result;
}

function renderCarpet(iter) {
  const size = 380, x = (SVG_W - size) / 2, y = (SVG_H - size) / 2;
  const squares = sierpinskiCarpetSquares(x, y, size, Math.min(4, iter));
  let svg = '';
  for (const [sx, sy, ss] of squares) {
    svg += `<rect x="${sx}" y="${sy}" width="${ss}" height="${ss}" fill="${COLORS.fill}"/>`;
  }
  return { svg, count: squares.length };
}

// === Pythagoras tree ===
function pythagorasTreeLines(x, y, size, angle, depth) {
  // Draw a square at (x, y) with side `size`, rotated by `angle`.
  // Then place two child squares of size size/√2 on top, rotated by ±45°.
  if (depth < 0) return [];
  const out = [];
  // Square corners — bottom-left = (x, y), and we draw rotated about that corner.
  const c = Math.cos(angle), s = Math.sin(angle);
  const blx = x, bly = y;
  const brx = x + size * c, bry = y - size * s; // SVG y-down
  const trx = brx - size * s, try_ = bry - size * c;
  const tlx = blx - size * s, tly = bly - size * c;
  out.push({ pts: [[blx, bly], [brx, bry], [trx, try_], [tlx, tly]] });
  if (depth === 0) return out;
  // Children on the top edge (tlx,tly)-(trx,try_).
  // Top edge midpoint and apex of right triangle (45-45-90).
  const newSize = size / Math.SQRT2;
  // Left child: rotated by angle + 45°, positioned at (tlx, tly).
  out.push(...pythagorasTreeLines(tlx, tly, newSize, angle + Math.PI / 4, depth - 1));
  // Right child: rotated by angle - 45°, positioned where its bottom-left aligns with the apex of the right triangle.
  // Apex coords:
  const ax = tlx + newSize * Math.cos(angle + Math.PI / 4);
  const ay = tly - newSize * Math.sin(angle + Math.PI / 4);
  out.push(...pythagorasTreeLines(ax, ay, newSize, angle - Math.PI / 4, depth - 1));
  return out;
}

function renderTree(iter) {
  const size = 60;
  const x = SVG_W / 2 - size / 2;
  const y = SVG_H - 30;
  const sq = pythagorasTreeLines(x, y, size, 0, Math.min(7, iter));
  let svg = '';
  for (let i = 0; i < sq.length; i++) {
    const t = i / Math.max(1, sq.length - 1);
    const hue = 100 + t * 80; // green→blue
    svg += `<polygon points="${sq[i].pts.map(p => p.join(',')).join(' ')}" fill="hsl(${hue.toFixed(0)}, 60%, 55%)" stroke="${COLORS.stroke}" stroke-width="0.8"/>`;
  }
  return { svg, count: sq.length };
}

const MODES = {
  'sierpinski-triangle': { label: 'Sierpinski Triangle', render: renderSierpinski, max: 6 },
  'koch-snowflake':      { label: 'Koch Snowflake',      render: renderKoch,       max: 5 },
  'sierpinski-carpet':   { label: 'Sierpinski Carpet',   render: renderCarpet,     max: 4 },
  'pythagoras-tree':     { label: 'Pythagoras Tree',     render: renderTree,       max: 7 },
};

export function mountFractalExplorer(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = { mode: cfg.mode, iterations: Math.min(cfg.iterations, MODES[cfg.mode].max) };

  function buildTabs() {
    return Object.entries(MODES).map(([k, m]) =>
      `<button type="button" class="fr-tab${k === state.mode ? ' active' : ''}" data-fr-mode="${k}">${m.label}</button>`
    ).join('');
  }

  target.innerHTML = `
    <div class="fr-wrap">
      <div class="fr-tabs" data-fr-tabs>${buildTabs()}</div>
      <svg class="fr-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Fractal explorer">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-fr-stage></g>
      </svg>
      <div class="fr-controls">
        <div class="fr-row"><label>Iterations</label><input type="range" data-fr-iter min="0" max="${MODES[state.mode].max}" step="1" value="${state.iterations}"/><span data-fr-iterval>${state.iterations}</span></div>
        <div class="fr-readout" data-fr-readout></div>
      </div>
    </div>
  `;

  const stage = target.querySelector('[data-fr-stage]');
  const ro = target.querySelector('[data-fr-readout]');
  const tabsBox = target.querySelector('[data-fr-tabs]');
  const slider = target.querySelector('[data-fr-iter]');
  const sval = target.querySelector('[data-fr-iterval]');

  function render() {
    const { svg, count } = MODES[state.mode].render(state.iterations);
    stage.innerHTML = svg;
    ro.innerHTML = `<div>Iteration: <strong>${state.iterations}</strong>.</div><div>Pieces drawn: <strong>${count}</strong>.</div>`;
  }

  function bind() {
    tabsBox.innerHTML = buildTabs();
    tabsBox.querySelectorAll('[data-fr-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.mode = btn.dataset.frMode;
        if (state.iterations > MODES[state.mode].max) state.iterations = MODES[state.mode].max;
        slider.max = MODES[state.mode].max;
        slider.value = state.iterations;
        sval.textContent = state.iterations;
        bind();
        render();
      });
    });
  }
  bind();
  slider.addEventListener('input', (e) => {
    state.iterations = +e.target.value;
    sval.textContent = state.iterations;
    render();
  });
  render();
}
