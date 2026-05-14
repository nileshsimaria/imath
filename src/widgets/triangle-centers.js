// Triangle centers (circumcenter, centroid, orthocenter) explorer.
//
// Draggable triangle. Toggleable overlays:
//   - Centroid (medians) — intersection of medians; divides each median 2:1
//   - Circumcenter (perpendicular bisectors) + circumcircle through all 3 vertices
//   - Orthocenter (altitudes) — intersection of the three altitudes
//   - Euler line — the line containing centroid, circumcenter, orthocenter
//     (collinear in any non-equilateral triangle, in ratio O–G–H = 1:2 from
//     circumcenter through centroid to orthocenter)
//
// Live readouts: each center's coordinates, the Euler-line existence note.
//
// Config:
//   vertexA/B/C: starting positions in unit coords
//   showCentroid, showCircumcenter, showOrthocenter, showEulerLine: bool

const SVG_W = 560;
const SVG_H = 440;
const SCALE = 36;
const ORIGIN = { x: 280, y: 240 };

const COLORS = {
  bg: '#fafbfc',
  tri: '#1e293b',
  triFill: '#fef3c7',
  vertex: '#1e293b',
  vertexHi: '#fde68a',
  centroid: '#16a34a',
  median: '#16a34a',
  circumcenter: '#dc2626',
  perpBisector: '#dc2626',
  circumcircle: 'rgba(220, 38, 38, 0.18)',
  orthocenter: '#7c3aed',
  altitude: '#7c3aed',
  eulerLine: '#0891b2',
  text: '#0f172a',
  textMuted: '#64748b',
  axisFaint: '#e2e8f0',
};

const DEFAULTS = {
  vertexA: [-3, -1.5],
  vertexB: [3.2, -1],
  vertexC: [-0.5, 2.6],
  showCentroid: true,
  showCircumcenter: false,
  showOrthocenter: false,
  showEulerLine: false,
};

const sx = (x) => ORIGIN.x + x * SCALE;
const sy = (y) => ORIGIN.y - y * SCALE;
const ix = (px) => (px - ORIGIN.x) / SCALE;
const iy = (py) => (ORIGIN.y - py) / SCALE;

function fmt(n, d = 2) {
  if (!Number.isFinite(n)) return '–';
  if (Math.abs(n) < 1e-10) return '0';
  return parseFloat(n.toFixed(d)).toString();
}

function centroid(A, B, C) {
  return [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
}

function circumcenter(A, B, C) {
  const ax = A[0], ay = A[1], bx = B[0], by = B[1], cx = C[0], cy = C[1];
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-9) return null;
  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
  return [ux, uy];
}

function circumradius(A, B, C) {
  const O = circumcenter(A, B, C);
  if (!O) return null;
  return Math.hypot(A[0] - O[0], A[1] - O[1]);
}

// Orthocenter = A + B + C − 2·(circumcenter)? Not quite.
// Use formula: H = A + B + C - 2·O is true ONLY for equilateral... actually
// general identity is H = A + B + C - 2·O where the centroid G satisfies
// G = (A+B+C)/3, so 3G - 2O = H, the standard Euler relation. Let's use
// that: O, G, H collinear with H = 3G - 2O.
function orthocenter(A, B, C) {
  const G = centroid(A, B, C);
  const O = circumcenter(A, B, C);
  if (!O) return null;
  return [3 * G[0] - 2 * O[0], 3 * G[1] - 2 * O[1]];
}

function midpoint(P, Q) {
  return [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2];
}

function perpFoot(P, A, B) {
  const dx = B[0] - A[0], dy = B[1] - A[1];
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-10) return [...A];
  const t = ((P[0] - A[0]) * dx + (P[1] - A[1]) * dy) / len2;
  return [A[0] + t * dx, A[1] + t * dy];
}

function drawAxes() {
  let svg = '';
  for (let x = -7; x <= 7; x++) {
    svg += `<line x1="${sx(x)}" y1="0" x2="${sx(x)}" y2="${SVG_H}" stroke="${COLORS.axisFaint}" stroke-width="${x === 0 ? 1.2 : 0.6}"/>`;
  }
  for (let y = -5; y <= 5; y++) {
    svg += `<line x1="0" y1="${sy(y)}" x2="${SVG_W}" y2="${sy(y)}" stroke="${COLORS.axisFaint}" stroke-width="${y === 0 ? 1.2 : 0.6}"/>`;
  }
  return svg;
}

function drawTri(A, B, C) {
  const pts = `${sx(A[0])},${sy(A[1])} ${sx(B[0])},${sy(B[1])} ${sx(C[0])},${sy(C[1])}`;
  return `<polygon points="${pts}" fill="${COLORS.triFill}" stroke="${COLORS.tri}" stroke-width="2.5" stroke-linejoin="round"/>`;
}

function drawVerts(A, B, C) {
  let svg = '';
  for (const [n, p] of [['A', A], ['B', B], ['C', C]]) {
    svg += `<circle data-vert="${n}" cx="${sx(p[0])}" cy="${sy(p[1])}" r="10" fill="${COLORS.vertex}" stroke="${COLORS.vertexHi}" stroke-width="2.5" style="cursor:grab"/>`;
    svg += `<text x="${sx(p[0])}" y="${sy(p[1]) + 4}" font-size="11" fill="white" text-anchor="middle" font-weight="700" pointer-events="none">${n}</text>`;
  }
  return svg;
}

function drawCentroidStuff(A, B, C, G) {
  let svg = '';
  // Three medians: vertex → midpoint of opposite side.
  const mBC = midpoint(B, C);
  const mAC = midpoint(A, C);
  const mAB = midpoint(A, B);
  svg += `<line x1="${sx(A[0])}" y1="${sy(A[1])}" x2="${sx(mBC[0])}" y2="${sy(mBC[1])}" stroke="${COLORS.median}" stroke-width="1.6" stroke-dasharray="5 3"/>`;
  svg += `<line x1="${sx(B[0])}" y1="${sy(B[1])}" x2="${sx(mAC[0])}" y2="${sy(mAC[1])}" stroke="${COLORS.median}" stroke-width="1.6" stroke-dasharray="5 3"/>`;
  svg += `<line x1="${sx(C[0])}" y1="${sy(C[1])}" x2="${sx(mAB[0])}" y2="${sy(mAB[1])}" stroke="${COLORS.median}" stroke-width="1.6" stroke-dasharray="5 3"/>`;
  // Midpoints.
  for (const M of [mBC, mAC, mAB]) {
    svg += `<circle cx="${sx(M[0])}" cy="${sy(M[1])}" r="3" fill="${COLORS.median}"/>`;
  }
  // Centroid.
  svg += `<circle cx="${sx(G[0])}" cy="${sy(G[1])}" r="6" fill="${COLORS.centroid}" stroke="white" stroke-width="2"/>`;
  svg += `<text x="${sx(G[0]) + 9}" y="${sy(G[1]) - 6}" font-size="13" fill="${COLORS.centroid}" font-weight="700">G</text>`;
  return svg;
}

function drawCircumStuff(A, B, C, O, R) {
  let svg = '';
  // Circumcircle.
  if (O) {
    svg += `<circle cx="${sx(O[0])}" cy="${sy(O[1])}" r="${R * SCALE}" fill="${COLORS.circumcircle}" stroke="${COLORS.circumcenter}" stroke-width="1.6" stroke-dasharray="0"/>`;
  }
  // Perpendicular bisectors of each side (drawn as a short segment from midpoint
  // through O, both directions).
  const sides = [[A, B], [B, C], [A, C]];
  for (const [P, Q] of sides) {
    const M = midpoint(P, Q);
    const dx = Q[0] - P[0], dy = Q[1] - P[1];
    const len = Math.hypot(dx, dy) || 1;
    // Perpendicular direction.
    const px = -dy / len, py = dx / len;
    // Extend ±3 units.
    const A1 = [M[0] - px * 3.5, M[1] - py * 3.5];
    const A2 = [M[0] + px * 3.5, M[1] + py * 3.5];
    svg += `<line x1="${sx(A1[0])}" y1="${sy(A1[1])}" x2="${sx(A2[0])}" y2="${sy(A2[1])}" stroke="${COLORS.perpBisector}" stroke-width="1.4" stroke-dasharray="4 3" opacity="0.7"/>`;
    svg += `<circle cx="${sx(M[0])}" cy="${sy(M[1])}" r="3" fill="${COLORS.perpBisector}"/>`;
  }
  if (O) {
    svg += `<circle cx="${sx(O[0])}" cy="${sy(O[1])}" r="6" fill="${COLORS.circumcenter}" stroke="white" stroke-width="2"/>`;
    svg += `<text x="${sx(O[0]) + 9}" y="${sy(O[1]) - 6}" font-size="13" fill="${COLORS.circumcenter}" font-weight="700">O</text>`;
  }
  return svg;
}

function drawOrthoStuff(A, B, C, H) {
  let svg = '';
  // Altitudes: from each vertex perpendicular to opposite side.
  const altPairs = [
    [A, B, C], // altitude from A perp to BC
    [B, A, C],
    [C, A, B],
  ];
  for (const [V, P, Q] of altPairs) {
    const F = perpFoot(V, P, Q);
    svg += `<line x1="${sx(V[0])}" y1="${sy(V[1])}" x2="${sx(F[0])}" y2="${sy(F[1])}" stroke="${COLORS.altitude}" stroke-width="1.6" stroke-dasharray="5 3" opacity="0.85"/>`;
  }
  if (H) {
    svg += `<circle cx="${sx(H[0])}" cy="${sy(H[1])}" r="6" fill="${COLORS.orthocenter}" stroke="white" stroke-width="2"/>`;
    svg += `<text x="${sx(H[0]) + 9}" y="${sy(H[1]) - 6}" font-size="13" fill="${COLORS.orthocenter}" font-weight="700">H</text>`;
  }
  return svg;
}

function drawEulerLine(O, G, H) {
  if (!O || !H) return '';
  // Extend the line through O and H past both points.
  const dx = H[0] - O[0], dy = H[1] - O[1];
  const len = Math.hypot(dx, dy) || 1;
  const ext = 6;
  const P1 = [O[0] - dx / len * ext, O[1] - dy / len * ext];
  const P2 = [H[0] + dx / len * ext, H[1] + dy / len * ext];
  let svg = '';
  svg += `<line x1="${sx(P1[0])}" y1="${sy(P1[1])}" x2="${sx(P2[0])}" y2="${sy(P2[1])}" stroke="${COLORS.eulerLine}" stroke-width="1.6" stroke-dasharray="2 4" opacity="0.85"/>`;
  return svg;
}

export function mountTriangleCenters(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = {
    A: [...cfg.vertexA], B: [...cfg.vertexB], C: [...cfg.vertexC],
    showCentroid: cfg.showCentroid,
    showCircumcenter: cfg.showCircumcenter,
    showOrthocenter: cfg.showOrthocenter,
    showEulerLine: cfg.showEulerLine,
  };

  target.innerHTML = `
    <div class="tc-wrap">
      <svg class="tc-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Triangle centers explorer">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-tc-axes></g>
        <g data-tc-tri></g>
        <g data-tc-circum></g>
        <g data-tc-centroid></g>
        <g data-tc-ortho></g>
        <g data-tc-euler></g>
        <g data-tc-verts></g>
      </svg>
      <div class="tc-controls">
        <div class="tc-toggles">
          <label class="tc-check tc-color-centroid"><input type="checkbox" data-tc-tog="showCentroid" ${state.showCentroid ? 'checked' : ''}/> Centroid (medians)</label>
          <label class="tc-check tc-color-circum"><input type="checkbox" data-tc-tog="showCircumcenter" ${state.showCircumcenter ? 'checked' : ''}/> Circumcenter (perp bisectors + circle)</label>
          <label class="tc-check tc-color-ortho"><input type="checkbox" data-tc-tog="showOrthocenter" ${state.showOrthocenter ? 'checked' : ''}/> Orthocenter (altitudes)</label>
          <label class="tc-check tc-color-euler"><input type="checkbox" data-tc-tog="showEulerLine" ${state.showEulerLine ? 'checked' : ''}/> Euler line</label>
        </div>
        <div class="tc-readout" data-tc-readout></div>
        <div class="tc-note">Drag any vertex. Toggle which centers to display. In a generic triangle, $O$, $G$, $H$ are <strong>collinear</strong> on the Euler line, with $G$ between $O$ and $H$ in ratio $1 : 2$.</div>
      </div>
    </div>
  `;

  const gAxes = target.querySelector('[data-tc-axes]');
  const gTri = target.querySelector('[data-tc-tri]');
  const gCircum = target.querySelector('[data-tc-circum]');
  const gCentroid = target.querySelector('[data-tc-centroid]');
  const gOrtho = target.querySelector('[data-tc-ortho]');
  const gEuler = target.querySelector('[data-tc-euler]');
  const gVerts = target.querySelector('[data-tc-verts]');
  const readout = target.querySelector('[data-tc-readout]');

  gAxes.innerHTML = drawAxes();

  function render() {
    const { A, B, C } = state;
    gTri.innerHTML = drawTri(A, B, C);
    gVerts.innerHTML = drawVerts(A, B, C);

    const G = centroid(A, B, C);
    const O = circumcenter(A, B, C);
    const R = O ? Math.hypot(A[0] - O[0], A[1] - O[1]) : null;
    const H = orthocenter(A, B, C);

    gCentroid.innerHTML = state.showCentroid ? drawCentroidStuff(A, B, C, G) : '';
    gCircum.innerHTML = state.showCircumcenter && O ? drawCircumStuff(A, B, C, O, R) : '';
    gOrtho.innerHTML = state.showOrthocenter && H ? drawOrthoStuff(A, B, C, H) : '';
    gEuler.innerHTML = state.showEulerLine && O && H ? drawEulerLine(O, G, H) : '';

    let html = '';
    if (state.showCentroid) html += `<div class="tc-readout-row tc-color-centroid"><span>centroid $G$</span><strong>(${fmt(G[0])}, ${fmt(G[1])})</strong></div>`;
    if (state.showCircumcenter && O) html += `<div class="tc-readout-row tc-color-circum"><span>circumcenter $O$</span><strong>(${fmt(O[0])}, ${fmt(O[1])})</strong></div>`;
    if (state.showCircumcenter && R) html += `<div class="tc-readout-row tc-color-circum"><span>circumradius $R$</span><strong>${fmt(R)}</strong></div>`;
    if (state.showOrthocenter && H) html += `<div class="tc-readout-row tc-color-ortho"><span>orthocenter $H$</span><strong>(${fmt(H[0])}, ${fmt(H[1])})</strong></div>`;
    if (state.showEulerLine && O && H) {
      const OG = Math.hypot(G[0] - O[0], G[1] - O[1]);
      const GH = Math.hypot(H[0] - G[0], H[1] - G[1]);
      html += `<div class="tc-readout-row tc-color-euler"><span>OG : GH</span><strong>${fmt(OG, 2)} : ${fmt(GH, 2)} = 1 : ${fmt(GH / OG, 2)}</strong></div>`;
    }
    readout.innerHTML = html;

    bindDrag();
  }

  function bindDrag() {
    const svgEl = target.querySelector('svg');
    svgEl.querySelectorAll('[data-vert]').forEach((el) => {
      let dragging = false;
      const which = el.dataset.vert;
      el.addEventListener('pointerdown', (e) => {
        dragging = true;
        try { el.setPointerCapture(e.pointerId); } catch {}
        e.preventDefault();
      });
      el.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const rect = svgEl.getBoundingClientRect();
        const px = ((e.clientX - rect.left) / rect.width) * SVG_W;
        const py = ((e.clientY - rect.top) / rect.height) * SVG_H;
        const x = Math.round(ix(px) * 4) / 4;
        const y = Math.round(iy(py) * 4) / 4;
        state[which] = [Math.max(-6, Math.min(6, x)), Math.max(-4, Math.min(4, y))];
        render();
      });
      el.addEventListener('pointerup', (e) => { dragging = false; try { el.releasePointerCapture(e.pointerId); } catch {} });
    });
  }

  target.querySelectorAll('[data-tc-tog]').forEach((el) => {
    el.addEventListener('change', () => {
      state[el.dataset.tcTog] = el.checked;
      render();
    });
  });

  render();
}
