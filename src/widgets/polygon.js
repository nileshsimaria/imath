import katex from 'katex';

// Regular polygon. Slider for n (number of sides). Computes interior angle
// sum (n - 2) · 180° and per-angle measure for a regular polygon.

const SVG_W = 460;
const SVG_H = 420;
const CX = 230;
const CY = 220;
const R = 130;

const COLORS = {
  fill: '#eef2ff',
  stroke: '#4f46e5',
  vertex: '#1e293b',
  angle: '#7c3aed',
  text: '#1e293b',
  bg: '#fafbfc',
};

const DEFAULTS = {
  initialN: 5,
  minN: 3,
  maxN: 10,
};

const tex = (s) => {
  try { return katex.renderToString(s, { throwOnError: false }); }
  catch { return s; }
};

const fmt = (n, dp = 1) => {
  const v = Number(n);
  if (Math.abs(v) < 1e-10) return '0';
  return parseFloat(v.toFixed(dp)).toString();
};

const POLYGON_NAMES = {
  3: 'triangle', 4: 'quadrilateral', 5: 'pentagon', 6: 'hexagon',
  7: 'heptagon', 8: 'octagon', 9: 'nonagon', 10: 'decagon',
};

function buildSvg(n) {
  const vertices = [];
  for (let i = 0; i < n; i++) {
    // Start from top, go clockwise
    const angle = (-Math.PI / 2) + (i * 2 * Math.PI / n);
    vertices.push([CX + R * Math.cos(angle), CY + R * Math.sin(angle)]);
  }
  const points = vertices.map(([x, y]) => `${x},${y}`).join(' ');
  let svg = '';
  svg += `<polygon points="${points}" fill="${COLORS.fill}" stroke="${COLORS.stroke}" stroke-width="2.5" stroke-linejoin="round"/>`;

  // Each interior angle = (n - 2) * 180 / n
  const interiorAngle = ((n - 2) * 180) / n;
  // Place a small angle label inside near each vertex
  for (const [vx, vy] of vertices) {
    // Pull label toward center
    const dx = CX - vx;
    const dy = CY - vy;
    const m = Math.hypot(dx, dy);
    const off = 28;
    const lx = vx + (dx / m) * off;
    const ly = vy + (dy / m) * off;
    svg += `<text x="${lx}" y="${ly}" font-size="11" fill="${COLORS.angle}" text-anchor="middle" dominant-baseline="middle" font-weight="600">${fmt(interiorAngle)}°</text>`;
  }

  // Vertex dots
  for (const [vx, vy] of vertices) {
    svg += `<circle cx="${vx}" cy="${vy}" r="4.5" fill="${COLORS.vertex}"/>`;
  }
  return svg;
}

export function mountPolygon(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = { n: cfg.initialN };

  target.innerHTML = `
    <div class="poly-wrap">
      <svg class="poly-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Polygon">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-poly-svg></g>
      </svg>
      <div class="poly-controls">
        <div class="poly-readout" data-poly-readout></div>
        <div class="poly-row">
          <label>sides <em>n</em></label>
          <input type="range" data-poly-n min="${cfg.minN}" max="${cfg.maxN}" step="1" value="${state.n}"/>
          <span class="val" data-poly-nval>${state.n}</span>
        </div>
        <div class="poly-helper">For any convex polygon: <strong>sum of interior angles = (n − 2) × 180°</strong>. For a <em>regular</em> polygon, each interior angle equals the sum divided by n.</div>
      </div>
    </div>
  `;

  const svgG = target.querySelector('[data-poly-svg]');
  const readoutBox = target.querySelector('[data-poly-readout]');

  function render() {
    svgG.innerHTML = buildSvg(state.n);
    const sum = (state.n - 2) * 180;
    const each = sum / state.n;
    const name = POLYGON_NAMES[state.n] || `${state.n}-gon`;
    let html = '';
    html += `<div class="poly-readout-row"><span>shape</span><strong>${name}</strong></div>`;
    html += `<div class="poly-readout-row"><span>angle sum</span><strong>(${state.n} − 2) × 180° = ${sum}°</strong></div>`;
    html += `<div class="poly-readout-row"><span>each interior angle</span><strong>${fmt(each)}°</strong></div>`;
    readoutBox.innerHTML = html;
  }

  render();
  target.querySelector('[data-poly-n]').addEventListener('input', (e) => {
    state.n = parseInt(e.target.value, 10);
    target.querySelector('[data-poly-nval]').textContent = state.n;
    render();
  });
}
