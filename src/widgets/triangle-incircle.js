// Triangle incircle / incenter / inradius explorer.
//
// A draggable triangle with toggleable overlays demonstrating:
//   - the three angle bisectors and their concurrency at the incenter
//   - the incircle (the largest circle that fits inside)
//   - the inradius r as the perpendicular distance from the incenter to
//     each side (same value to all three — the key invariant)
//   - tangent points where the incircle touches each side
//
// "Animate" mode grows the inscribed circle from radius 0 at the incenter
// outward until it kisses all three sides simultaneously — visually proving
// that r is the exact distance from incenter to each side.
//
// Live readouts: side lengths a, b, c; area A; semiperimeter s; inradius
// r = A/s (the key formula students must internalize).
//
// Config (all optional):
//   vertexA, vertexB, vertexC: starting positions in unit coords (default
//     gives a scalene-acute triangle)
//   showBisectors, showIncircle, showInradius, showTangentPoints:
//     initial toggle states (defaults: all true)
//   draggable: bool (default true; turn off for static lesson examples)
//   mode: 'explore' (default) or 'animate' (autoplays the grow animation)

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
  bisector: '#7c3aed',
  bisectorWeak: '#c4b5fd',
  incircle: 'rgba(34, 197, 94, 0.18)',
  incircleEdge: '#16a34a',
  incenter: '#15803d',
  inradius: '#dc2626',
  tangent: '#dc2626',
  text: '#0f172a',
  textMuted: '#64748b',
  axisFaint: '#e2e8f0',
};

const DEFAULTS = {
  vertexA: [-3, -1.5],
  vertexB: [3.2, -1],
  vertexC: [-0.5, 2.6],
  showBisectors: true,
  showIncircle: true,
  showInradius: true,
  showTangentPoints: true,
  draggable: true,
  mode: 'explore',
};

const sx = (x) => ORIGIN.x + x * SCALE;
const sy = (y) => ORIGIN.y - y * SCALE;
const ix = (px) => (px - ORIGIN.x) / SCALE;
const iy = (py) => (ORIGIN.y - py) / SCALE;

const fmt = (n, d = 2) => {
  if (!Number.isFinite(n)) return '–';
  if (Math.abs(n) < 1e-10) return '0';
  return parseFloat(n.toFixed(d)).toString();
};

function dist(P, Q) { return Math.hypot(P[0] - Q[0], P[1] - Q[1]); }

function triangleArea(A, B, C) {
  return Math.abs((B[0] - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (B[1] - A[1])) / 2;
}

function isDegenerate(A, B, C) {
  return triangleArea(A, B, C) < 0.05;
}

function incenter(A, B, C) {
  // I = (a·A + b·B + c·C) / (a+b+c), where a,b,c are OPPOSITE side lengths.
  const a = dist(B, C); // opposite A
  const b = dist(A, C); // opposite B
  const c = dist(A, B); // opposite C
  const s = a + b + c;
  return [
    (a * A[0] + b * B[0] + c * C[0]) / s,
    (a * A[1] + b * B[1] + c * C[1]) / s,
  ];
}

function inradius(A, B, C) {
  const a = dist(B, C), b = dist(A, C), c = dist(A, B);
  const semi = (a + b + c) / 2;
  return triangleArea(A, B, C) / semi;
}

// Foot of perpendicular from P onto line through U and V.
function perpFoot(P, U, V) {
  const dx = V[0] - U[0], dy = V[1] - U[1];
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-10) return [...U];
  const t = ((P[0] - U[0]) * dx + (P[1] - U[1]) * dy) / len2;
  return [U[0] + t * dx, U[1] + t * dy];
}

// Foot of the angle bisector from vertex V onto the opposite side U–W.
// By the angle bisector theorem: VU/VW = UF/FW, where F is the foot.
function bisectorFoot(V, U, W) {
  const VU = dist(V, U);
  const VW = dist(V, W);
  const total = VU + VW;
  if (total < 1e-10) return [(U[0] + W[0]) / 2, (U[1] + W[1]) / 2];
  const t = VU / total;
  return [U[0] + t * (W[0] - U[0]), U[1] + t * (W[1] - U[1])];
}

function drawAxes() {
  // Light grid only — gives draggable triangle a sense of place.
  let svg = '';
  for (let x = -7; x <= 7; x++) {
    svg += `<line x1="${sx(x)}" y1="0" x2="${sx(x)}" y2="${SVG_H}" stroke="${COLORS.axisFaint}" stroke-width="${x === 0 ? 1.2 : 0.6}"/>`;
  }
  for (let y = -5; y <= 5; y++) {
    svg += `<line x1="0" y1="${sy(y)}" x2="${SVG_W}" y2="${sy(y)}" stroke="${COLORS.axisFaint}" stroke-width="${y === 0 ? 1.2 : 0.6}"/>`;
  }
  return svg;
}

function drawTriangle(A, B, C) {
  const pts = `${sx(A[0])},${sy(A[1])} ${sx(B[0])},${sy(B[1])} ${sx(C[0])},${sy(C[1])}`;
  return `<polygon points="${pts}" fill="${COLORS.triFill}" stroke="${COLORS.tri}" stroke-width="2.5" stroke-linejoin="round"/>`;
}

function drawSideLabels(A, B, C) {
  const sides = [
    { p: B, q: C, opp: A, name: 'a' },
    { p: A, q: C, opp: B, name: 'b' },
    { p: A, q: B, opp: C, name: 'c' },
  ];
  let svg = '';
  for (const s of sides) {
    const mx = (s.p[0] + s.q[0]) / 2;
    const my = (s.p[1] + s.q[1]) / 2;
    const len = dist(s.p, s.q);
    const ox = mx - s.opp[0], oy = my - s.opp[1];
    const m = Math.hypot(ox, oy) || 1;
    const lx = mx + (ox / m) * 0.45;
    const ly = my + (oy / m) * 0.45;
    svg += `<text x="${sx(lx)}" y="${sy(ly)}" font-size="13" fill="${COLORS.tri}" text-anchor="middle" dominant-baseline="middle" font-weight="600">${s.name} = ${fmt(len)}</text>`;
  }
  return svg;
}

function drawBisectors(A, B, C, I) {
  // Three angle bisectors, each from vertex to incenter and on to opposite side.
  let svg = '';
  const triples = [
    [A, B, C], // bisector from A onto BC
    [B, A, C],
    [C, A, B],
  ];
  for (const [V, U, W] of triples) {
    const F = bisectorFoot(V, U, W);
    svg += `<line x1="${sx(V[0])}" y1="${sy(V[1])}" x2="${sx(F[0])}" y2="${sy(F[1])}" stroke="${COLORS.bisector}" stroke-width="1.6" stroke-dasharray="5 3" opacity="0.85"/>`;
    svg += `<circle cx="${sx(F[0])}" cy="${sy(F[1])}" r="3" fill="${COLORS.bisector}"/>`;
  }
  return svg;
}

function drawIncircle(I, r, opacity = 1, growT = 1) {
  // growT in [0, 1] for animate mode.
  const rDraw = r * growT;
  let svg = '';
  svg += `<circle cx="${sx(I[0])}" cy="${sy(I[1])}" r="${rDraw * SCALE}" fill="${COLORS.incircle}" stroke="${COLORS.incircleEdge}" stroke-width="2" opacity="${opacity}"/>`;
  return svg;
}

function drawInradiusDrops(I, A, B, C, opacity = 1) {
  // Perpendicular from I to each side (length = r). Shows visually that all
  // three perp distances are equal.
  let svg = '';
  const sides = [
    [B, C], // side a
    [A, C], // side b
    [A, B], // side c
  ];
  for (const [P, Q] of sides) {
    const F = perpFoot(I, P, Q);
    svg += `<line x1="${sx(I[0])}" y1="${sy(I[1])}" x2="${sx(F[0])}" y2="${sy(F[1])}" stroke="${COLORS.inradius}" stroke-width="2" opacity="${opacity}"/>`;
    // Small right-angle marker at the foot.
    const dx = F[0] - I[0], dy = F[1] - I[1];
    const L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L;
    const px = -uy, py = ux;
    const mk = 0.15;
    const c1 = [F[0] - ux * mk, F[1] - uy * mk];
    const c2 = [c1[0] + px * mk, c1[1] + py * mk];
    const c3 = [F[0] + px * mk, F[1] + py * mk];
    svg += `<polyline points="${sx(c1[0])},${sy(c1[1])} ${sx(c2[0])},${sy(c2[1])} ${sx(c3[0])},${sy(c3[1])}" fill="none" stroke="${COLORS.inradius}" stroke-width="1" opacity="${opacity}"/>`;
  }
  // One single label "r" at the midpoint of one of the perpendiculars.
  const F = perpFoot(I, A, B);
  const labX = (I[0] + F[0]) / 2;
  const labY = (I[1] + F[1]) / 2;
  // Offset perpendicular to the drop.
  const dx = F[0] - I[0], dy = F[1] - I[1];
  const L = Math.hypot(dx, dy) || 1;
  const px = -dy / L * 0.25, py = dx / L * 0.25;
  svg += `<text x="${sx(labX + px)}" y="${sy(labY + py)}" font-size="14" fill="${COLORS.inradius}" font-weight="700" text-anchor="middle" dominant-baseline="middle" opacity="${opacity}">r</text>`;
  return svg;
}

function drawTangentPoints(I, A, B, C) {
  let svg = '';
  const sides = [[B, C], [A, C], [A, B]];
  for (const [P, Q] of sides) {
    const F = perpFoot(I, P, Q);
    svg += `<circle cx="${sx(F[0])}" cy="${sy(F[1])}" r="4" fill="${COLORS.tangent}" stroke="white" stroke-width="1.5"/>`;
  }
  return svg;
}

function drawIncenter(I) {
  return `<circle cx="${sx(I[0])}" cy="${sy(I[1])}" r="5.5" fill="${COLORS.incenter}" stroke="white" stroke-width="2"/><text x="${sx(I[0]) + 8}" y="${sy(I[1]) - 6}" font-size="13" fill="${COLORS.incenter}" font-weight="700">I</text>`;
}

function drawVertices(A, B, C, draggable) {
  const cursor = draggable ? 'grab' : 'default';
  let svg = '';
  for (const [name, p] of [['A', A], ['B', B], ['C', C]]) {
    svg += `<circle data-vert="${name}" cx="${sx(p[0])}" cy="${sy(p[1])}" r="10" fill="${COLORS.vertex}" stroke="${COLORS.vertexHi}" stroke-width="2.5" style="cursor:${cursor}"/>`;
    svg += `<text x="${sx(p[0])}" y="${sy(p[1]) + 4}" font-size="11" fill="white" text-anchor="middle" font-weight="700" pointer-events="none">${name}</text>`;
  }
  return svg;
}

export function mountTriangleIncircle(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = {
    A: [...cfg.vertexA],
    B: [...cfg.vertexB],
    C: [...cfg.vertexC],
    showBisectors: cfg.showBisectors,
    showIncircle: cfg.showIncircle,
    showInradius: cfg.showInradius,
    showTangentPoints: cfg.showTangentPoints,
    growT: 1, // 1 = full size; 0 = collapsed at incenter
    animating: false,
  };

  const togglesHtml = `
    <label class="ti-check"><input type="checkbox" data-ti-tog="showBisectors" ${state.showBisectors ? 'checked' : ''}/> Angle bisectors</label>
    <label class="ti-check"><input type="checkbox" data-ti-tog="showIncircle" ${state.showIncircle ? 'checked' : ''}/> Incircle</label>
    <label class="ti-check"><input type="checkbox" data-ti-tog="showInradius" ${state.showInradius ? 'checked' : ''}/> Inradius drops (r)</label>
    <label class="ti-check"><input type="checkbox" data-ti-tog="showTangentPoints" ${state.showTangentPoints ? 'checked' : ''}/> Tangent points</label>
  `;

  const actionsHtml = cfg.draggable
    ? `<button type="button" class="ti-btn" data-ti-animate>Grow the incircle ▶</button>
       <button type="button" class="ti-btn ti-btn-light" data-ti-reset>Reset triangle</button>`
    : `<button type="button" class="ti-btn" data-ti-animate>Grow the incircle ▶</button>`;

  target.innerHTML = `
    <div class="ti-wrap">
      <svg class="ti-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Triangle incircle explorer">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-ti-axes></g>
        <g data-ti-tri></g>
        <g data-ti-bisectors></g>
        <g data-ti-incircle></g>
        <g data-ti-drops></g>
        <g data-ti-tangents></g>
        <g data-ti-incenter></g>
        <g data-ti-labels></g>
        <g data-ti-verts></g>
      </svg>
      <div class="ti-controls">
        <div class="ti-toggles">${togglesHtml}</div>
        <div class="ti-row">${actionsHtml}</div>
        <div class="ti-readout" data-ti-readout></div>
        ${cfg.draggable ? `<div class="ti-note">Drag vertex <strong>A</strong>, <strong>B</strong>, or <strong>C</strong> to reshape the triangle. Watch how the incenter stays inside, the incircle stays tangent, and <em>r = A&nbsp;/&nbsp;s</em> updates live.</div>` : ''}
      </div>
    </div>
  `;

  const gAxes = target.querySelector('[data-ti-axes]');
  const gTri = target.querySelector('[data-ti-tri]');
  const gBis = target.querySelector('[data-ti-bisectors]');
  const gInc = target.querySelector('[data-ti-incircle]');
  const gDrops = target.querySelector('[data-ti-drops]');
  const gTan = target.querySelector('[data-ti-tangents]');
  const gCenter = target.querySelector('[data-ti-incenter]');
  const gLabels = target.querySelector('[data-ti-labels]');
  const gVerts = target.querySelector('[data-ti-verts]');
  const readout = target.querySelector('[data-ti-readout]');

  gAxes.innerHTML = drawAxes();

  function render() {
    const { A, B, C } = state;
    gTri.innerHTML = drawTriangle(A, B, C);
    gLabels.innerHTML = drawSideLabels(A, B, C);
    gVerts.innerHTML = drawVertices(A, B, C, cfg.draggable);

    if (isDegenerate(A, B, C)) {
      gBis.innerHTML = '';
      gInc.innerHTML = '';
      gDrops.innerHTML = '';
      gTan.innerHTML = '';
      gCenter.innerHTML = '';
      readout.innerHTML = `<div class="ti-readout-row"><em>Degenerate triangle (collinear vertices). Drag a vertex.</em></div>`;
      if (cfg.draggable) bindDrag();
      return;
    }

    const I = incenter(A, B, C);
    const r = inradius(A, B, C);
    const a = dist(B, C), b = dist(A, C), c = dist(A, B);
    const s = (a + b + c) / 2;
    const area = triangleArea(A, B, C);

    gBis.innerHTML = state.showBisectors ? drawBisectors(A, B, C, I) : '';
    gInc.innerHTML = state.showIncircle ? drawIncircle(I, r, 1, state.growT) : '';
    gDrops.innerHTML = state.showInradius ? drawInradiusDrops(I, A, B, C) : '';
    gTan.innerHTML = (state.showTangentPoints && state.growT >= 0.99) ? drawTangentPoints(I, A, B, C) : '';
    gCenter.innerHTML = drawIncenter(I);

    let html = '';
    html += `<div class="ti-readout-row"><span>sides</span><strong>a = ${fmt(a)}, b = ${fmt(b)}, c = ${fmt(c)}</strong></div>`;
    html += `<div class="ti-readout-row"><span>perimeter</span><strong>${fmt(a + b + c)}</strong></div>`;
    html += `<div class="ti-readout-row"><span>semiperimeter <em>s</em></span><strong>${fmt(s)}</strong></div>`;
    html += `<div class="ti-readout-row"><span>area <em>A</em></span><strong>${fmt(area)}</strong></div>`;
    html += `<div class="ti-readout-row ti-readout-r"><span>inradius <em>r = A / s</em></span><strong>${fmt(r, 3)}</strong></div>`;
    html += `<div class="ti-readout-row"><span>incenter <em>I</em></span><strong>(${fmt(I[0])}, ${fmt(I[1])})</strong></div>`;
    readout.innerHTML = html;

    if (cfg.draggable) bindDrag();
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
      el.addEventListener('pointerup', (e) => {
        dragging = false;
        try { el.releasePointerCapture(e.pointerId); } catch {}
      });
      el.addEventListener('pointercancel', () => { dragging = false; });
    });
  }

  // Toggle handlers.
  target.querySelectorAll('[data-ti-tog]').forEach((el) => {
    el.addEventListener('change', () => {
      state[el.dataset.tiTog] = el.checked;
      render();
    });
  });

  // Animate (grow incircle).
  let animRaf = null;
  function animate() {
    if (state.animating) return;
    state.animating = true;
    // Force incircle visible while animating.
    const wasIncircleOn = state.showIncircle;
    state.showIncircle = true;
    // Sync the checkbox.
    const cb = target.querySelector('[data-ti-tog="showIncircle"]');
    if (cb) cb.checked = true;
    state.growT = 0;
    const start = performance.now();
    const duration = 1500;
    function step(ts) {
      const t = Math.min(1, (ts - start) / duration);
      state.growT = t;
      render();
      if (t < 1) {
        animRaf = requestAnimationFrame(step);
      } else {
        state.animating = false;
        state.growT = 1;
        render();
      }
    }
    animRaf = requestAnimationFrame(step);
  }
  target.querySelector('[data-ti-animate]').addEventListener('click', animate);

  // Reset.
  const resetBtn = target.querySelector('[data-ti-reset]');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.A = [...cfg.vertexA];
      state.B = [...cfg.vertexB];
      state.C = [...cfg.vertexC];
      state.growT = 1;
      render();
    });
  }

  render();

  // Cleanup on removal.
  const observer = new MutationObserver(() => {
    if (!document.body.contains(target)) {
      if (animRaf) cancelAnimationFrame(animRaf);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
