// Circle theorems explorer.
//
// A unit circle with various draggable points/chords/tangents and the
// classical circle theorems visualized:
//
//   inscribed-angle  Two endpoints A, B fixed on the circle plus a third
//                    point P also on the circle. Shows inscribed angle
//                    APB and central angle AOB. The inscribed angle is
//                    ALWAYS half the central angle. Drag P and watch
//                    the inscribed angle stay rock-steady at half.
//
//   same-segment     Two points A, B fixed plus multiple "viewing"
//                    points on the same arc; all see AB at the same
//                    angle (because all are inscribed angles on AB).
//
//   thales           Special case: AB is a diameter, so the central
//                    angle is 180° and the inscribed angle is always
//                    90° (Thales' theorem).
//
//   tangent-radius   A tangent line at a point T on the circle, and the
//                    radius OT. They are always perpendicular.
//
//   cyclic-quad      Four points on the circle forming a quadrilateral.
//                    Opposite angles sum to 180°.
//
// Config:
//   mode: one of the above (default 'inscribed-angle')

const SVG_W = 540;
const SVG_H = 440;
const CR = 130;
const CX = SVG_W / 2;
const CY = SVG_H / 2 - 10;

const COLORS = {
  bg: '#fafbfc',
  circle: '#1e293b',
  chord: '#4f46e5',
  inscribed: '#dc2626',
  central: '#16a34a',
  pointFixed: '#1e293b',
  pointDraggable: '#dc2626',
  radius: '#7c3aed',
  tangent: '#f59e0b',
  text: '#0f172a',
  textMuted: '#64748b',
  fill: '#fef3c7',
};

const DEFAULTS = { mode: 'inscribed-angle' };

function deg(rad) { return rad * 180 / Math.PI; }
function fmt(n, d = 1) { return parseFloat(Number(n).toFixed(d)).toString(); }

function ptOnCircle(angleRad) {
  return [CX + CR * Math.cos(angleRad), CY - CR * Math.sin(angleRad)];
}

function angleAt(vertex, p1, p2) {
  const u = [p1[0] - vertex[0], p1[1] - vertex[1]];
  const v = [p2[0] - vertex[0], p2[1] - vertex[1]];
  const dot = u[0] * v[0] + u[1] * v[1];
  const mag = Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]);
  if (mag < 1e-9) return 0;
  const cosA = Math.max(-1, Math.min(1, dot / mag));
  return Math.acos(cosA) * 180 / Math.PI;
}

function arcMarkSvg(center, p1, p2, radius, color, arcs = 1) {
  const a1 = Math.atan2(p1[1] - center[1], p1[0] - center[0]);
  const a2 = Math.atan2(p2[1] - center[1], p2[0] - center[0]);
  let start = a1, end = a2;
  // Use the smaller arc direction (interior of the angle).
  let diff = end - start;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  end = start + diff;
  let svg = '';
  for (let i = 0; i < arcs; i++) {
    const r = radius - i * 6;
    if (r <= 4) break;
    const N = 24;
    let d = '';
    for (let k = 0; k <= N; k++) {
      const t = start + (end - start) * (k / N);
      const px = center[0] + r * Math.cos(t);
      const py = center[1] + r * Math.sin(t);
      d += (k === 0 ? 'M' : 'L') + `${px} ${py} `;
    }
    svg += `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.8"/>`;
  }
  return svg;
}

function drawCircle() {
  return `<circle cx="${CX}" cy="${CY}" r="${CR}" fill="${COLORS.fill}" stroke="${COLORS.circle}" stroke-width="2"/>
          <circle cx="${CX}" cy="${CY}" r="3" fill="${COLORS.circle}"/>
          <text x="${CX + 8}" y="${CY - 4}" font-size="12" fill="${COLORS.textMuted}">O</text>`;
}

function drawPoint(p, label, color, draggable = false, id = '') {
  const c = draggable ? COLORS.pointDraggable : COLORS.pointFixed;
  let svg = '';
  svg += `<circle ${id ? `data-cv="${id}"` : ''} cx="${p[0]}" cy="${p[1]}" r="${draggable ? 9 : 6}" fill="${c}" ${draggable ? 'style="cursor:grab"' : ''} stroke="white" stroke-width="2"/>`;
  if (label) {
    const dx = p[0] - CX, dy = p[1] - CY;
    const m = Math.hypot(dx, dy) || 1;
    const ox = dx / m * 18, oy = dy / m * 18;
    svg += `<text x="${p[0] + ox}" y="${p[1] + oy + 5}" font-size="14" fill="${COLORS.text}" text-anchor="middle" font-weight="700" pointer-events="none">${label}</text>`;
  }
  return svg;
}

function drawChord(p1, p2, color = COLORS.chord, width = 2) {
  return `<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="${color}" stroke-width="${width}"/>`;
}

// === inscribed-angle mode ===
function renderInscribedAngle(state) {
  const A = ptOnCircle(state.aA);
  const B = ptOnCircle(state.aB);
  const P = ptOnCircle(state.aP);
  const O = [CX, CY];

  let svg = '';
  svg += drawCircle();
  // Chord AB.
  svg += drawChord(A, B, COLORS.chord, 1.5);
  // Radii OA, OB.
  svg += drawChord(O, A, COLORS.central, 1.6);
  svg += drawChord(O, B, COLORS.central, 1.6);
  // Inscribed angle PA, PB.
  svg += drawChord(P, A, COLORS.inscribed, 2);
  svg += drawChord(P, B, COLORS.inscribed, 2);
  // Arc markers.
  // Central angle AOB (interior — choose the side P is NOT on, the major if you like; for simplicity we always use the smaller arc here).
  svg += arcMarkSvg(O, A, B, 22, COLORS.central, 2);
  // Inscribed angle APB.
  svg += arcMarkSvg(P, A, B, 28, COLORS.inscribed, 1);
  // Points.
  svg += drawPoint(A, 'A', COLORS.pointFixed);
  svg += drawPoint(B, 'B', COLORS.pointFixed);
  svg += drawPoint(P, 'P', COLORS.pointDraggable, true, 'P');

  // Compute angles.
  const centralAngle = angleAt(O, A, B);
  const inscribedAngle = angleAt(P, A, B);

  return { svg, info: {
    'central angle ∠AOB': `${fmt(centralAngle)}°`,
    'inscribed angle ∠APB': `${fmt(inscribedAngle)}°`,
    'ratio (central / inscribed)': `${fmt(centralAngle / Math.max(inscribedAngle, 0.001), 2)}`,
  } };
}

// === same-segment mode ===
function renderSameSegment(state) {
  const A = ptOnCircle(state.aA);
  const B = ptOnCircle(state.aB);
  const P1 = ptOnCircle(state.aP);
  // Two more points on the same side as P1 by reflecting around midpoint of AB.
  const angles = [state.aP, state.aP + 0.6, state.aP - 0.6];
  const points = angles.map(a => ptOnCircle(a));
  let svg = '';
  svg += drawCircle();
  svg += drawChord(A, B, COLORS.chord, 1.5);
  const colors = ['#dc2626', '#0891b2', '#7c3aed'];
  let info = {};
  for (let i = 0; i < points.length; i++) {
    svg += drawChord(points[i], A, colors[i], 2);
    svg += drawChord(points[i], B, colors[i], 2);
    svg += arcMarkSvg(points[i], A, B, 22, colors[i], 1);
    const ang = angleAt(points[i], A, B);
    info[`∠AP${i+1}B`] = `${fmt(ang)}°`;
  }
  svg += drawPoint(A, 'A', COLORS.pointFixed);
  svg += drawPoint(B, 'B', COLORS.pointFixed);
  for (let i = 0; i < points.length; i++) {
    const dr = i === 0;
    svg += drawPoint(points[i], `P${i+1}`, dr ? COLORS.pointDraggable : COLORS.pointFixed, dr, dr ? 'P' : '');
  }
  return { svg, info };
}

// === thales mode ===
function renderThales(state) {
  const A = ptOnCircle(Math.PI);
  const B = ptOnCircle(0);
  const P = ptOnCircle(state.aP);
  const O = [CX, CY];
  let svg = '';
  svg += drawCircle();
  svg += drawChord(A, B, COLORS.chord, 1.8);
  svg += drawChord(P, A, COLORS.inscribed, 2);
  svg += drawChord(P, B, COLORS.inscribed, 2);
  svg += arcMarkSvg(P, A, B, 20, COLORS.inscribed, 1);
  // Right-angle marker if angle is close to 90.
  const ang = angleAt(P, A, B);
  if (Math.abs(ang - 90) < 0.5) {
    const ux = (A[0] - P[0]) / Math.hypot(A[0]-P[0], A[1]-P[1]);
    const uy = (A[1] - P[1]) / Math.hypot(A[0]-P[0], A[1]-P[1]);
    const vx = (B[0] - P[0]) / Math.hypot(B[0]-P[0], B[1]-P[1]);
    const vy = (B[1] - P[1]) / Math.hypot(B[0]-P[0], B[1]-P[1]);
    const sz = 14;
    svg += `<polyline points="${P[0]+ux*sz},${P[1]+uy*sz} ${P[0]+ux*sz+vx*sz},${P[1]+uy*sz+vy*sz} ${P[0]+vx*sz},${P[1]+vy*sz}" fill="none" stroke="${COLORS.inscribed}" stroke-width="1.5"/>`;
  }
  svg += drawPoint(A, 'A', COLORS.pointFixed);
  svg += drawPoint(B, 'B', COLORS.pointFixed);
  svg += drawPoint(P, 'P', COLORS.pointDraggable, true, 'P');
  return { svg, info: {
    'AB is the': 'diameter',
    'inscribed angle ∠APB': `${fmt(ang)}°`,
  } };
}

// === tangent-radius mode ===
function renderTangent(state) {
  const T = ptOnCircle(state.aT);
  const O = [CX, CY];
  // Tangent direction is perpendicular to OT.
  const dx = T[0] - O[0], dy = T[1] - O[1];
  const len = Math.hypot(dx, dy);
  const tx = -dy / len, ty = dx / len;
  const tL = 120;
  const p1 = [T[0] - tx * tL, T[1] - ty * tL];
  const p2 = [T[0] + tx * tL, T[1] + ty * tL];
  let svg = '';
  svg += drawCircle();
  svg += drawChord(O, T, COLORS.radius, 2);
  svg += drawChord(p1, p2, COLORS.tangent, 2.5);
  // Right-angle marker at T.
  const sz = 12;
  const ux = (O[0] - T[0]) / len, uy = (O[1] - T[1]) / len;
  svg += `<polyline points="${T[0]+ux*sz},${T[1]+uy*sz} ${T[0]+ux*sz+tx*sz},${T[1]+uy*sz+ty*sz} ${T[0]+tx*sz},${T[1]+ty*sz}" fill="none" stroke="${COLORS.text}" stroke-width="1.5"/>`;
  svg += drawPoint(T, 'T', COLORS.pointDraggable, true, 'T');
  return { svg, info: {
    'radius OT': `length ${fmt(CR/30, 1)}`,
    'angle between OT and tangent': '90°',
  } };
}

// === cyclic-quad mode ===
function renderCyclicQuad(state) {
  const A = ptOnCircle(state.aA);
  const B = ptOnCircle(state.aB);
  const C = ptOnCircle(state.aC);
  const D = ptOnCircle(state.aD);
  let svg = '';
  svg += drawCircle();
  // Quad ABCD.
  svg += `<polygon points="${A[0]},${A[1]} ${B[0]},${B[1]} ${C[0]},${C[1]} ${D[0]},${D[1]}" fill="none" stroke="${COLORS.chord}" stroke-width="2"/>`;
  // Arc markers at each vertex.
  const angA = angleAt(A, B, D);
  const angB = angleAt(B, A, C);
  const angC = angleAt(C, B, D);
  const angD = angleAt(D, A, C);
  svg += arcMarkSvg(A, B, D, 18, COLORS.inscribed, 1);
  svg += arcMarkSvg(C, B, D, 18, COLORS.inscribed, 2);
  svg += arcMarkSvg(B, A, C, 18, COLORS.central, 1);
  svg += arcMarkSvg(D, A, C, 18, COLORS.central, 2);
  svg += drawPoint(A, 'A', COLORS.pointDraggable, true, 'A');
  svg += drawPoint(B, 'B', COLORS.pointDraggable, true, 'B');
  svg += drawPoint(C, 'C', COLORS.pointDraggable, true, 'C');
  svg += drawPoint(D, 'D', COLORS.pointDraggable, true, 'D');
  return { svg, info: {
    '∠A + ∠C': `${fmt(angA + angC)}°`,
    '∠B + ∠D': `${fmt(angB + angD)}°`,
  } };
}

const MODES = {
  'inscribed-angle': { label: 'Inscribed Angle Theorem', render: renderInscribedAngle, initial: { aA: 2.3, aB: 0.5, aP: 4.5 } },
  'same-segment':    { label: 'Same Segment',            render: renderSameSegment,    initial: { aA: 2.3, aB: 0.5, aP: 4.5 } },
  'thales':          { label: "Thales' Theorem",         render: renderThales,         initial: { aP: 1.2 } },
  'tangent-radius':  { label: 'Tangent ⊥ Radius',        render: renderTangent,        initial: { aT: 1.0 } },
  'cyclic-quad':     { label: 'Cyclic Quadrilateral',    render: renderCyclicQuad,     initial: { aA: 2.5, aB: 0.8, aC: -0.6, aD: -2.0 } },
};

export function mountCircleTheorems(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = { mode: cfg.mode, ...MODES[cfg.mode].initial };

  const tabs = Object.entries(MODES).map(([k, m]) =>
    `<button type="button" class="ct-tab${k === state.mode ? ' active' : ''}" data-ct-mode="${k}">${m.label}</button>`
  ).join('');

  target.innerHTML = `
    <div class="ct-wrap">
      <div class="ct-tabs">${tabs}</div>
      <svg class="ct-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Circle theorems explorer">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-ct-stage></g>
      </svg>
      <div class="ct-readout" data-ct-readout></div>
      <div class="ct-note">Drag the red point(s). The relationships you see are <strong>theorems</strong> — they hold no matter where you drag.</div>
    </div>
  `;

  const stage = target.querySelector('[data-ct-stage]');
  const readout = target.querySelector('[data-ct-readout]');

  function render() {
    const { svg, info } = MODES[state.mode].render(state);
    stage.innerHTML = svg;
    let html = '';
    for (const [k, v] of Object.entries(info)) {
      html += `<div class="ct-readout-row"><span>${k}</span><strong>${v}</strong></div>`;
    }
    readout.innerHTML = html;
    bindDrag();
  }

  function angleFromCenter(x, y) {
    return Math.atan2(CY - y, x - CX);
  }

  function bindDrag() {
    const svgEl = target.querySelector('svg');
    svgEl.querySelectorAll('[data-cv]').forEach((el) => {
      let dragging = false;
      const which = el.dataset.cv;
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
        const a = angleFromCenter(px, py);
        const key = `a${which}`;
        if (state[key] !== undefined) {
          state[key] = a;
          render();
        }
      });
      el.addEventListener('pointerup', (e) => { dragging = false; try { el.releasePointerCapture(e.pointerId); } catch {} });
    });
  }

  target.querySelectorAll('[data-ct-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.ctMode;
      Object.assign(state, MODES[state.mode].initial);
      target.querySelectorAll('[data-ct-mode]').forEach((b) => b.classList.toggle('active', b === btn));
      render();
    });
  });

  render();
}
