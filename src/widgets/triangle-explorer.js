import katex from 'katex';

// Triangle with three draggable vertices. Live readout of all three angles
// (always summing to 180°), all three side lengths, and classification by
// angle and by side length.

const SVG_W = 520;
const SVG_H = 420;
const PAD = 30;
const SCALE = 32;          // pixels per unit
const ORIGIN = { x: 240, y: 230 };

const COLORS = {
  fill: '#eef2ff',
  side: '#4f46e5',
  vertex: '#1e293b',
  angle: '#7c3aed',
  text: '#475569',
  bg: '#fafbfc',
};

const DEFAULTS = {
  vertexA: [-3, -1],
  vertexB: [3, -1],
  vertexC: [0, 3],
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

const sx = (x) => ORIGIN.x + x * SCALE;
const sy = (y) => ORIGIN.y - y * SCALE;
const ix = (px) => (px - ORIGIN.x) / SCALE;
const iy = (py) => (ORIGIN.y - py) / SCALE;

function dist(p, q) {
  return Math.hypot(p[0] - q[0], p[1] - q[1]);
}

function angleAt(vertex, p1, p2) {
  // Angle at `vertex` of the triangle vertex-p1-p2 (using vectors from vertex).
  const u = [p1[0] - vertex[0], p1[1] - vertex[1]];
  const v = [p2[0] - vertex[0], p2[1] - vertex[1]];
  const dot = u[0] * v[0] + u[1] * v[1];
  const mag = Math.hypot(...u) * Math.hypot(...v);
  if (mag < 1e-9) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180 / Math.PI;
}

function classifyByAngle(A, B, C) {
  const max = Math.max(A, B, C);
  if (Math.abs(max - 90) < 0.5) return 'right';
  if (max < 90) return 'acute';
  return 'obtuse';
}

function classifyBySides(a, b, c) {
  const eps = 0.05;
  const eqAB = Math.abs(a - b) < eps;
  const eqBC = Math.abs(b - c) < eps;
  const eqAC = Math.abs(a - c) < eps;
  if (eqAB && eqBC) return 'equilateral';
  if (eqAB || eqBC || eqAC) return 'isosceles';
  return 'scalene';
}

function buildSvg(state) {
  const A = state.A, B = state.B, C = state.C;
  let svg = '';
  // Triangle fill + outline
  const points = `${sx(A[0])},${sy(A[1])} ${sx(B[0])},${sy(B[1])} ${sx(C[0])},${sy(C[1])}`;
  svg += `<polygon points="${points}" fill="${COLORS.fill}" stroke="${COLORS.side}" stroke-width="2.5" stroke-linejoin="round"/>`;

  // Side length labels (midpoints, slightly offset)
  const sides = [
    { p: A, q: B, opp: C, name: 'c' },  // side AB is opposite C, length c
    { p: B, q: C, opp: A, name: 'a' },
    { p: C, q: A, opp: B, name: 'b' },
  ];
  for (const s of sides) {
    const mx = (s.p[0] + s.q[0]) / 2;
    const my = (s.p[1] + s.q[1]) / 2;
    const length = dist(s.p, s.q);
    // Offset the label outward (away from the opposite vertex)
    const offDir = [mx - s.opp[0], my - s.opp[1]];
    const m = Math.hypot(...offDir) || 1;
    const off = 0.5;
    const lx = mx + (offDir[0] / m) * off;
    const ly = my + (offDir[1] / m) * off;
    svg += `<text x="${sx(lx)}" y="${sy(ly)}" font-size="13" fill="${COLORS.side}" text-anchor="middle" dominant-baseline="middle" font-weight="600">${s.name} = ${fmt(length)}</text>`;
  }

  // Angle labels at each vertex
  const angA = angleAt(A, B, C);
  const angB = angleAt(B, A, C);
  const angC = angleAt(C, A, B);
  const angles = [
    { vertex: A, opp1: B, opp2: C, name: 'A', value: angA },
    { vertex: B, opp1: A, opp2: C, name: 'B', value: angB },
    { vertex: C, opp1: A, opp2: B, name: 'C', value: angC },
  ];
  for (const a of angles) {
    // Position label inside the triangle, near the vertex
    const dirX = (a.opp1[0] + a.opp2[0]) / 2 - a.vertex[0];
    const dirY = (a.opp1[1] + a.opp2[1]) / 2 - a.vertex[1];
    const m = Math.hypot(dirX, dirY) || 1;
    const off = 0.7;
    const lx = a.vertex[0] + (dirX / m) * off;
    const ly = a.vertex[1] + (dirY / m) * off;
    svg += `<text x="${sx(lx)}" y="${sy(ly)}" font-size="12" fill="${COLORS.angle}" text-anchor="middle" dominant-baseline="middle" font-weight="600">${fmt(a.value)}°</text>`;
  }

  // Vertices (with vertex name labels)
  for (const [name, p] of [['A', A], ['B', B], ['C', C]]) {
    svg += `<circle data-vert="${name}" cx="${sx(p[0])}" cy="${sy(p[1])}" r="9" fill="${COLORS.vertex}" stroke="white" stroke-width="2.5" style="cursor:grab"/>`;
    svg += `<text x="${sx(p[0])}" y="${sy(p[1]) + 4}" font-size="11" fill="white" text-anchor="middle" font-weight="700" pointer-events="none">${name}</text>`;
  }

  return { svg, angA, angB, angC,
           a: dist(B, C), b: dist(A, C), c: dist(A, B) };
}

export function mountTriangleExplorer(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = { A: [...cfg.vertexA], B: [...cfg.vertexB], C: [...cfg.vertexC] };

  target.innerHTML = `
    <div class="te-wrap">
      <svg class="te-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Triangle explorer">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-te-svg></g>
      </svg>
      <div class="te-controls">
        <div class="te-readout" data-te-readout></div>
        <div class="te-helper">Drag any vertex (<strong>A</strong>, <strong>B</strong>, or <strong>C</strong>) to reshape the triangle. Notice the three angles always sum to <strong>180°</strong>.</div>
      </div>
    </div>
  `;

  const svgG = target.querySelector('[data-te-svg]');
  const readoutBox = target.querySelector('[data-te-readout]');

  function render() {
    const out = buildSvg(state);
    svgG.innerHTML = out.svg;
    const sum = out.angA + out.angB + out.angC;
    const angleType = classifyByAngle(out.angA, out.angB, out.angC);
    const sideType = classifyBySides(out.a, out.b, out.c);
    let html = '';
    html += `<div class="te-readout-row"><span>angles</span><strong>${fmt(out.angA)}° + ${fmt(out.angB)}° + ${fmt(out.angC)}° = ${fmt(sum)}°</strong></div>`;
    html += `<div class="te-readout-row"><span>by angle</span><strong>${angleType}</strong></div>`;
    html += `<div class="te-readout-row"><span>by sides</span><strong>${sideType}</strong></div>`;
    readoutBox.innerHTML = html;
    bindDrag();
  }

  function bindDrag() {
    const svgEl = target.querySelector('svg');
    svgEl.querySelectorAll('[data-vert]').forEach((el) => {
      let dragging = false;
      const which = el.dataset.vert;
      el.addEventListener('pointerdown', (e) => {
        dragging = true;
        el.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      el.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const rect = svgEl.getBoundingClientRect();
        const px = ((e.clientX - rect.left) / rect.width) * SVG_W;
        const py = ((e.clientY - rect.top) / rect.height) * SVG_H;
        const x = Math.round(ix(px) * 2) / 2;
        const y = Math.round(iy(py) * 2) / 2;
        // Clamp to a reasonable range
        state[which] = [Math.max(-6, Math.min(6, x)), Math.max(-4, Math.min(4, y))];
        render();
      });
      el.addEventListener('pointerup', (e) => {
        dragging = false;
        try { el.releasePointerCapture(e.pointerId); } catch {}
      });
    });
  }

  render();
}
