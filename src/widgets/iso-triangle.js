// Isosceles / equilateral triangle explorer.
//
// One widget, two modes:
//   isosceles   — sliders for leg length (the two equal sides) and base
//                 length. The apex angle, base angles, and altitude are
//                 derived. Tick-marks call out the two equal sides; arc
//                 marks call out the two equal base angles. Optional
//                 axis of symmetry, altitude from apex (which doubles
//                 as the median / perp-bisector / angle bisector of
//                 the apex).
//   equilateral — single slider for side length. All sides ticked
//                 equal, all three 60° angles marked, three lines of
//                 symmetry available.
//
// Config (all optional):
//   mode:           'isosceles' (default) | 'equilateral'
//   legLength:      starting leg length for isosceles (default 5)
//   baseLength:     starting base length for isosceles (default 6)
//   side:           starting side length for equilateral (default 5)
//   showAltitude:   bool (default true)
//   showSymmetry:   bool (default false)
//   showEqualMarks: bool (default true)  — tick marks on equal sides
//   showAngleMarks: bool (default true)  — arc marks on equal angles
//   interactive:    bool (default true)  — slider control

const SVG_W = 600;
const SVG_H = 380;
const SCALE = 30;
const ORIGIN = { x: 300, y: 280 };

const COLORS = {
  bg: '#fafbfc',
  triEdge: '#1e293b',
  triFill: '#fef3c7',
  tick: '#dc2626',
  arc: '#7c3aed',
  altitude: '#16a34a',
  symmetry: '#0891b2',
  vertex: '#1e293b',
  text: '#0f172a',
  textMuted: '#64748b',
};

const DEFAULTS = {
  mode: 'isosceles',
  legLength: 5,
  baseLength: 6,
  side: 5,
  showAltitude: true,
  showSymmetry: false,
  showEqualMarks: true,
  showAngleMarks: true,
  interactive: true,
};

const sx = (x) => ORIGIN.x + x * SCALE;
const sy = (y) => ORIGIN.y - y * SCALE;

function fmt(n, d = 2) {
  if (!Number.isFinite(n)) return '–';
  if (Math.abs(n) < 1e-10) return '0';
  return parseFloat(n.toFixed(d)).toString();
}

// Compute apex + base vertices for an isosceles triangle. Base is centered
// on the origin (apex straight up).
function isoVertices(leg, base) {
  // leg² = (base/2)² + altitude²  →  altitude = √(leg² - (base/2)²)
  const half = base / 2;
  const h = Math.sqrt(Math.max(0, leg * leg - half * half));
  return { A: [-half, 0], B: [half, 0], C: [0, h], h };
}

function eqVertices(side) {
  // Same as isosceles with leg = base = side. Altitude = (√3/2) · side.
  const half = side / 2;
  const h = (Math.sqrt(3) / 2) * side;
  return { A: [-half, 0], B: [half, 0], C: [0, h], h };
}

function drawTriangle(A, B, C) {
  const pts = `${sx(A[0])},${sy(A[1])} ${sx(B[0])},${sy(B[1])} ${sx(C[0])},${sy(C[1])}`;
  return `<polygon points="${pts}" fill="${COLORS.triFill}" stroke="${COLORS.triEdge}" stroke-width="2.5" stroke-linejoin="round"/>`;
}

// Tick marks: short cross-line at midpoint of a segment, perpendicular
// to the segment. `ticks` = how many parallel ticks (used to differentiate
// "equal pair A" vs "equal pair B" if needed).
function tickMark(P, Q, ticks = 1) {
  const mx = (P[0] + Q[0]) / 2;
  const my = (P[1] + Q[1]) / 2;
  const dx = Q[0] - P[0];
  const dy = Q[1] - P[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  // Perpendicular.
  const px = -uy, py = ux;
  const tickLen = 0.18;
  const gap = 0.14;
  let svg = '';
  // Place `ticks` parallel ticks along the segment direction.
  const start = -((ticks - 1) / 2) * gap;
  for (let i = 0; i < ticks; i++) {
    const offset = start + i * gap;
    const cx = mx + ux * offset;
    const cy = my + uy * offset;
    svg += `<line x1="${sx(cx + px * tickLen)}" y1="${sy(cy + py * tickLen)}" x2="${sx(cx - px * tickLen)}" y2="${sy(cy - py * tickLen)}" stroke="${COLORS.tick}" stroke-width="2"/>`;
  }
  return svg;
}

// Arc mark at vertex V, between rays VU and VW. `arcs` = number of nested arcs.
function arcMark(V, U, W, arcs = 1, radius = 0.5) {
  const uVU = [U[0] - V[0], U[1] - V[1]];
  const uVW = [W[0] - V[0], W[1] - V[1]];
  const lVU = Math.hypot(uVU[0], uVU[1]) || 1;
  const lVW = Math.hypot(uVW[0], uVW[1]) || 1;
  const a1 = Math.atan2(uVU[1] / lVU, uVU[0] / lVU);
  const a2 = Math.atan2(uVW[1] / lVW, uVW[0] / lVW);
  // Choose sweep that stays inside the angle (smaller of the two arcs).
  let start = Math.min(a1, a2);
  let end = Math.max(a1, a2);
  if (end - start > Math.PI) {
    [start, end] = [end, start + 2 * Math.PI];
  }
  let svg = '';
  for (let i = 0; i < arcs; i++) {
    const r = radius - i * 0.12;
    if (r <= 0.05) break;
    const N = 30;
    let d = '';
    for (let k = 0; k <= N; k++) {
      const t = start + (end - start) * (k / N);
      const px = V[0] + r * Math.cos(t);
      const py = V[1] + r * Math.sin(t);
      d += (k === 0 ? 'M' : 'L') + `${sx(px)} ${sy(py)} `;
    }
    svg += `<path d="${d}" fill="none" stroke="${COLORS.arc}" stroke-width="1.8"/>`;
  }
  return svg;
}

function drawAltitude(C, midBase) {
  let svg = '';
  svg += `<line x1="${sx(C[0])}" y1="${sy(C[1])}" x2="${sx(midBase[0])}" y2="${sy(midBase[1])}" stroke="${COLORS.altitude}" stroke-width="2" stroke-dasharray="5 3"/>`;
  // Right angle marker at midBase.
  const r = 0.22;
  svg += `<polyline points="${sx(midBase[0])},${sy(midBase[1] + r)} ${sx(midBase[0] + r)},${sy(midBase[1] + r)} ${sx(midBase[0] + r)},${sy(midBase[1])}" fill="none" stroke="${COLORS.altitude}" stroke-width="1.4"/>`;
  // Label h at midpoint.
  const lx = (C[0] + midBase[0]) / 2 + 0.3;
  const ly = (C[1] + midBase[1]) / 2;
  svg += `<text x="${sx(lx)}" y="${sy(ly)}" font-size="13" fill="${COLORS.altitude}" font-weight="700" dominant-baseline="middle">h</text>`;
  return svg;
}

function drawSymmetryAxes(mode, A, B, C, midBase) {
  let svg = '';
  if (mode === 'equilateral') {
    // Three medians = three axes of symmetry.
    const midAB = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    const midBC = [(B[0] + C[0]) / 2, (B[1] + C[1]) / 2];
    const midAC = [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2];
    svg += `<line x1="${sx(C[0])}" y1="${sy(C[1])}" x2="${sx(midAB[0])}" y2="${sy(midAB[1])}" stroke="${COLORS.symmetry}" stroke-width="1.6" stroke-dasharray="6 4" opacity="0.85"/>`;
    svg += `<line x1="${sx(A[0])}" y1="${sy(A[1])}" x2="${sx(midBC[0])}" y2="${sy(midBC[1])}" stroke="${COLORS.symmetry}" stroke-width="1.6" stroke-dasharray="6 4" opacity="0.85"/>`;
    svg += `<line x1="${sx(B[0])}" y1="${sy(B[1])}" x2="${sx(midAC[0])}" y2="${sy(midAC[1])}" stroke="${COLORS.symmetry}" stroke-width="1.6" stroke-dasharray="6 4" opacity="0.85"/>`;
  } else {
    // Single axis: through apex C perpendicular to base, extended.
    const top = [C[0], C[1] + 0.4];
    const bot = [midBase[0], midBase[1] - 0.4];
    svg += `<line x1="${sx(top[0])}" y1="${sy(top[1])}" x2="${sx(bot[0])}" y2="${sy(bot[1])}" stroke="${COLORS.symmetry}" stroke-width="1.6" stroke-dasharray="6 4" opacity="0.85"/>`;
  }
  return svg;
}

function drawSideLabels(mode, A, B, C, leg, base, side) {
  let svg = '';
  // Helper to label a side at midpoint, offset outward from the opposite vertex.
  function lab(P, Q, opp, text, color) {
    const mx = (P[0] + Q[0]) / 2;
    const my = (P[1] + Q[1]) / 2;
    const ox = mx - opp[0], oy = my - opp[1];
    const m = Math.hypot(ox, oy) || 1;
    const offset = 0.55;
    const lx = mx + (ox / m) * offset;
    const ly = my + (oy / m) * offset;
    svg += `<text x="${sx(lx)}" y="${sy(ly)}" font-size="13" fill="${color}" text-anchor="middle" dominant-baseline="middle" font-weight="600">${text}</text>`;
  }
  if (mode === 'equilateral') {
    lab(A, B, C, `s = ${fmt(side)}`, COLORS.triEdge);
    lab(B, C, A, `s = ${fmt(side)}`, COLORS.triEdge);
    lab(A, C, B, `s = ${fmt(side)}`, COLORS.triEdge);
  } else {
    lab(A, B, C, `b = ${fmt(base)}`, COLORS.triEdge);
    lab(B, C, A, `a = ${fmt(leg)}`, COLORS.triEdge);
    lab(A, C, B, `a = ${fmt(leg)}`, COLORS.triEdge);
  }
  return svg;
}

function drawVertices(A, B, C) {
  let svg = '';
  for (const [name, p] of [['A', A], ['B', B], ['C', C]]) {
    svg += `<circle cx="${sx(p[0])}" cy="${sy(p[1])}" r="5" fill="${COLORS.vertex}"/>`;
    const offset = name === 'C' ? [0, 0.4] : (name === 'A' ? [-0.4, -0.3] : [0.4, -0.3]);
    svg += `<text x="${sx(p[0] + offset[0])}" y="${sy(p[1] + offset[1])}" font-size="13" fill="${COLORS.text}" text-anchor="middle" font-weight="700">${name}</text>`;
  }
  return svg;
}

function buildControls(mode, state) {
  if (mode === 'equilateral') {
    return `
      <div class="it-row">
        <label>Side length $s$</label>
        <input type="range" data-it-side min="2" max="10" step="0.5" value="${state.side}"/>
        <span class="val" data-it-sideval>${fmt(state.side, 1)}</span>
      </div>
    `;
  }
  return `
    <div class="it-row">
      <label>Leg $a$</label>
      <input type="range" data-it-leg min="3" max="9" step="0.5" value="${state.leg}"/>
      <span class="val" data-it-legval>${fmt(state.leg, 1)}</span>
    </div>
    <div class="it-row">
      <label>Base $b$</label>
      <input type="range" data-it-base min="1" max="14" step="0.5" value="${state.base}"/>
      <span class="val" data-it-baseval>${fmt(state.base, 1)}</span>
    </div>
  `;
}

function buildToggles(mode, state) {
  return `
    <label class="it-check"><input type="checkbox" data-it-tog="showAltitude" ${state.showAltitude ? 'checked' : ''}/> Altitude from apex</label>
    <label class="it-check"><input type="checkbox" data-it-tog="showSymmetry" ${state.showSymmetry ? 'checked' : ''}/> ${mode === 'equilateral' ? '3 axes' : 'Axis'} of symmetry</label>
    <label class="it-check"><input type="checkbox" data-it-tog="showEqualMarks" ${state.showEqualMarks ? 'checked' : ''}/> Equal-side tick marks</label>
    <label class="it-check"><input type="checkbox" data-it-tog="showAngleMarks" ${state.showAngleMarks ? 'checked' : ''}/> Equal-angle arcs</label>
  `;
}

function computeReadouts(mode, state) {
  if (mode === 'equilateral') {
    const s = state.side;
    const h = (Math.sqrt(3) / 2) * s;
    const area = (Math.sqrt(3) / 4) * s * s;
    return {
      lines: [
        ['sides', `${fmt(s)} (all equal)`],
        ['angles', `60° at every vertex`],
        ['altitude $h$', `${fmt(s)} · √3/2 ≈ ${fmt(h)}`],
        ['area', `(√3/4) · ${fmt(s)}² ≈ ${fmt(area)}`],
        ['perimeter', `${fmt(3 * s)}`],
      ],
    };
  }
  const a = state.leg, b = state.base;
  if (b >= 2 * a) {
    return { lines: [['error', 'Base must be less than 2 × leg for a valid triangle.']] };
  }
  const half = b / 2;
  const h = Math.sqrt(a * a - half * half);
  const apex = 2 * Math.atan2(half, h) * 180 / Math.PI;
  const baseAngle = (180 - apex) / 2;
  const area = (1 / 2) * b * h;
  return {
    lines: [
      ['legs (equal)', `a = ${fmt(a)}`],
      ['base', `b = ${fmt(b)}`],
      ['base angles (equal)', `${fmt(baseAngle, 1)}°`],
      ['apex angle', `${fmt(apex, 1)}°`],
      ['altitude $h$', `√(${fmt(a)}² − ${fmt(half)}²) = ${fmt(h)}`],
      ['area', `½ · ${fmt(b)} · ${fmt(h)} = ${fmt(area)}`],
      ['perimeter', `${fmt(2 * a + b)}`],
    ],
  };
}

export function mountIsoTriangle(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = {
    mode: cfg.mode,
    leg: cfg.legLength,
    base: cfg.baseLength,
    side: cfg.side,
    showAltitude: cfg.showAltitude,
    showSymmetry: cfg.showSymmetry,
    showEqualMarks: cfg.showEqualMarks,
    showAngleMarks: cfg.showAngleMarks,
  };

  const controlsHtml = cfg.interactive ? buildControls(state.mode, state) : '';

  target.innerHTML = `
    <div class="it-wrap">
      <svg class="it-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Isosceles / equilateral triangle">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-it-symmetry></g>
        <g data-it-tri></g>
        <g data-it-altitude></g>
        <g data-it-ticks></g>
        <g data-it-arcs></g>
        <g data-it-labels></g>
        <g data-it-verts></g>
      </svg>
      <div class="it-controls">
        ${controlsHtml}
        <div class="it-toggles">${buildToggles(state.mode, state)}</div>
        <div class="it-readout" data-it-readout></div>
      </div>
    </div>
  `;

  const gSym = target.querySelector('[data-it-symmetry]');
  const gTri = target.querySelector('[data-it-tri]');
  const gAlt = target.querySelector('[data-it-altitude]');
  const gTick = target.querySelector('[data-it-ticks]');
  const gArc = target.querySelector('[data-it-arcs]');
  const gLabel = target.querySelector('[data-it-labels]');
  const gVerts = target.querySelector('[data-it-verts]');
  const readoutBox = target.querySelector('[data-it-readout]');

  function render() {
    const { A, B, C, h } = state.mode === 'equilateral'
      ? eqVertices(state.side)
      : isoVertices(state.leg, state.base);
    const midBase = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];

    gTri.innerHTML = drawTriangle(A, B, C);
    gLabel.innerHTML = drawSideLabels(state.mode, A, B, C, state.leg, state.base, state.side);
    gVerts.innerHTML = drawVertices(A, B, C);

    gSym.innerHTML = state.showSymmetry ? drawSymmetryAxes(state.mode, A, B, C, midBase) : '';
    gAlt.innerHTML = state.showAltitude ? drawAltitude(C, midBase) : '';

    let ticks = '';
    if (state.showEqualMarks) {
      if (state.mode === 'equilateral') {
        ticks += tickMark(A, B, 1);
        ticks += tickMark(B, C, 1);
        ticks += tickMark(A, C, 1);
      } else {
        // Mark the two equal legs.
        ticks += tickMark(B, C, 1);
        ticks += tickMark(A, C, 1);
        // Base gets a double tick (visually distinct).
        ticks += tickMark(A, B, 2);
      }
    }
    gTick.innerHTML = ticks;

    let arcs = '';
    if (state.showAngleMarks) {
      if (state.mode === 'equilateral') {
        arcs += arcMark(A, B, C, 1, 0.55);
        arcs += arcMark(B, C, A, 1, 0.55);
        arcs += arcMark(C, A, B, 1, 0.55);
      } else {
        arcs += arcMark(A, B, C, 1, 0.55);
        arcs += arcMark(B, A, C, 1, 0.55);
        arcs += arcMark(C, A, B, 2, 0.7);
      }
    }
    gArc.innerHTML = arcs;

    const r = computeReadouts(state.mode, state);
    let html = '';
    for (const [k, v] of r.lines) {
      html += `<div class="it-readout-row"><span>${k}</span><strong>${v}</strong></div>`;
    }
    readoutBox.innerHTML = html;
  }

  function bindControls() {
    target.querySelectorAll('[data-it-tog]').forEach((el) => {
      el.addEventListener('change', () => {
        state[el.dataset.itTog] = el.checked;
        render();
      });
    });
    const legSlider = target.querySelector('[data-it-leg]');
    if (legSlider) {
      legSlider.addEventListener('input', (e) => {
        state.leg = parseFloat(e.target.value);
        target.querySelector('[data-it-legval]').textContent = fmt(state.leg, 1);
        render();
      });
    }
    const baseSlider = target.querySelector('[data-it-base]');
    if (baseSlider) {
      baseSlider.addEventListener('input', (e) => {
        state.base = parseFloat(e.target.value);
        target.querySelector('[data-it-baseval]').textContent = fmt(state.base, 1);
        render();
      });
    }
    const sideSlider = target.querySelector('[data-it-side]');
    if (sideSlider) {
      sideSlider.addEventListener('input', (e) => {
        state.side = parseFloat(e.target.value);
        target.querySelector('[data-it-sideval]').textContent = fmt(state.side, 1);
        render();
      });
    }
  }

  bindControls();
  render();
}
