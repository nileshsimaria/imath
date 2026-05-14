// Geometric transformation explorer.
//
// One widget, five modes:
//   translate   sliders for dx, dy. (x,y) → (x+dx, y+dy)
//   reflect     pick axis: x-axis, y-axis, y=x, y=-x
//   rotate      angle (multiples of 15°) about origin (or (h,k))
//   dilate      scale factor k about origin (or (h,k))
//   compose     pre-set sequence: e.g. translate then rotate
//
// A pre-image polygon (arrow / triangle / L-shape) is drawn as outlined +
// faint, and the image (after the current transformation) is drawn solid
// and bold so the change is immediately obvious. A live "rule" panel shows
// the algebraic mapping in symbols.
//
// Config:
//   shape:      'arrow' (default) | 'triangle' | 'L'
//   mode:       'translate' (default) | 'reflect' | 'rotate' | 'dilate' | 'compose'
//   dx, dy:     initial translation
//   axis:       'y-axis' | 'x-axis' | 'y=x' | 'y=-x' for reflection
//   angle:      degrees for rotation (multiples of 15°)
//   k:          scale factor for dilation
//   interactive: bool (default true) — slider controls visible

import katex from 'katex';

const SVG_W = 600;
const SVG_H = 420;
const SCALE = 22;
const ORIGIN = { x: 300, y: 220 };

const COLORS = {
  bg: '#fafbfc',
  grid: '#e2e8f0',
  axis: '#94a3b8',
  preImage: '#94a3b8',
  preImageFill: 'rgba(148, 163, 184, 0.18)',
  image: '#4f46e5',
  imageFill: 'rgba(79, 70, 229, 0.18)',
  reflLine: '#dc2626',
  rotCenter: '#f59e0b',
  text: '#0f172a',
  textMuted: '#64748b',
  vertexLabel: '#1e293b',
  arrowFromTo: '#16a34a',
};

const SHAPES = {
  arrow: [[0, 0], [3, 0], [3, -1], [5, 0.5], [3, 2], [3, 1], [0, 1]],
  triangle: [[0, 0], [3, 0], [1, 2.5]],
  L: [[0, 0], [3, 0], [3, 1], [1, 1], [1, 3], [0, 3]],
};

const DEFAULTS = {
  shape: 'arrow',
  mode: 'translate',
  dx: 2, dy: -3,
  axis: 'y-axis',
  angle: 90,
  k: 1.5,
  interactive: true,
};

const sx = (x) => ORIGIN.x + x * SCALE;
const sy = (y) => ORIGIN.y - y * SCALE;

function fmt(n, d = 2) {
  if (!Number.isFinite(n)) return '–';
  if (Math.abs(n) < 1e-10) return '0';
  return parseFloat(n.toFixed(d)).toString();
}

const tex = (s) => {
  try { return katex.renderToString(s, { throwOnError: false }); }
  catch { return s; }
};

// Transformation functions: each takes a vertex [x,y] and returns the image.
function apply(mode, pt, state) {
  const [x, y] = pt;
  switch (mode) {
    case 'translate':
      return [x + state.dx, y + state.dy];
    case 'reflect':
      switch (state.axis) {
        case 'y-axis': return [-x, y];
        case 'x-axis': return [x, -y];
        case 'y=x':    return [y, x];
        case 'y=-x':   return [-y, -x];
        default:       return [x, y];
      }
    case 'rotate': {
      const a = state.angle * Math.PI / 180;
      return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    }
    case 'dilate':
      return [state.k * x, state.k * y];
    case 'compose': {
      // Preset composition: translate then rotate then dilate by fixed params
      // — illustrates that order matters.
      const t = [x + state.dx, y + state.dy];
      const a = state.angle * Math.PI / 180;
      const r = [t[0] * Math.cos(a) - t[1] * Math.sin(a),
                 t[0] * Math.sin(a) + t[1] * Math.cos(a)];
      return [state.k * r[0], state.k * r[1]];
    }
    default:
      return [x, y];
  }
}

function drawGrid() {
  let svg = '';
  for (let x = -12; x <= 12; x++) {
    const c = x === 0 ? COLORS.axis : COLORS.grid;
    const w = x === 0 ? 1.5 : 0.6;
    svg += `<line x1="${sx(x)}" y1="0" x2="${sx(x)}" y2="${SVG_H}" stroke="${c}" stroke-width="${w}"/>`;
  }
  for (let y = -8; y <= 8; y++) {
    const c = y === 0 ? COLORS.axis : COLORS.grid;
    const w = y === 0 ? 1.5 : 0.6;
    svg += `<line x1="0" y1="${sy(y)}" x2="${SVG_W}" y2="${sy(y)}" stroke="${c}" stroke-width="${w}"/>`;
  }
  // Axis tick labels.
  for (let x = -10; x <= 10; x += 2) {
    if (x === 0) continue;
    svg += `<text x="${sx(x)}" y="${sy(0) + 12}" font-size="10" fill="${COLORS.textMuted}" text-anchor="middle">${x}</text>`;
  }
  for (let y = -6; y <= 6; y += 2) {
    if (y === 0) continue;
    svg += `<text x="${sx(0) - 6}" y="${sy(y) + 3}" font-size="10" fill="${COLORS.textMuted}" text-anchor="end">${y}</text>`;
  }
  return svg;
}

function drawShape(pts, edgeColor, fillColor, opacity = 1, dashed = false) {
  const ptStr = pts.map(([x, y]) => `${sx(x)},${sy(y)}`).join(' ');
  const dash = dashed ? 'stroke-dasharray="5 3"' : '';
  let svg = `<polygon points="${ptStr}" fill="${fillColor}" stroke="${edgeColor}" stroke-width="2" stroke-linejoin="round" ${dash} opacity="${opacity}"/>`;
  // Mark vertices.
  for (const [x, y] of pts) {
    svg += `<circle cx="${sx(x)}" cy="${sy(y)}" r="3" fill="${edgeColor}"/>`;
  }
  return svg;
}

function drawReflectionLine(axis) {
  let svg = '';
  let from, to;
  if (axis === 'y-axis') { from = [0, -10]; to = [0, 10]; }
  else if (axis === 'x-axis') { from = [-12, 0]; to = [12, 0]; }
  else if (axis === 'y=x') { from = [-8, -8]; to = [8, 8]; }
  else if (axis === 'y=-x') { from = [-8, 8]; to = [8, -8]; }
  svg += `<line x1="${sx(from[0])}" y1="${sy(from[1])}" x2="${sx(to[0])}" y2="${sy(to[1])}" stroke="${COLORS.reflLine}" stroke-width="2" stroke-dasharray="6 4" opacity="0.85"/>`;
  return svg;
}

function drawRotationCenter() {
  return `<circle cx="${sx(0)}" cy="${sy(0)}" r="6" fill="${COLORS.rotCenter}" stroke="white" stroke-width="2"/>`;
}

function drawMappingArrows(pre, post) {
  let svg = '';
  for (let i = 0; i < pre.length; i++) {
    const [x1, y1] = pre[i];
    const [x2, y2] = post[i];
    if (Math.hypot(x2 - x1, y2 - y1) < 0.1) continue;
    svg += `<line x1="${sx(x1)}" y1="${sy(y1)}" x2="${sx(x2)}" y2="${sy(y2)}" stroke="${COLORS.arrowFromTo}" stroke-width="1.2" opacity="0.5" stroke-dasharray="3 2"/>`;
  }
  return svg;
}

function ruleStringTex(mode, state) {
  switch (mode) {
    case 'translate':
      return `(x, y) \\;\\mapsto\\; (x ${state.dx >= 0 ? '+' : '-'} ${Math.abs(state.dx)},\\; y ${state.dy >= 0 ? '+' : '-'} ${Math.abs(state.dy)})`;
    case 'reflect':
      switch (state.axis) {
        case 'y-axis': return `(x, y) \\;\\mapsto\\; (-x, y) \\quad\\text{reflect over the y-axis}`;
        case 'x-axis': return `(x, y) \\;\\mapsto\\; (x, -y) \\quad\\text{reflect over the x-axis}`;
        case 'y=x':    return `(x, y) \\;\\mapsto\\; (y, x) \\quad\\text{reflect over } y = x`;
        case 'y=-x':   return `(x, y) \\;\\mapsto\\; (-y, -x) \\quad\\text{reflect over } y = -x`;
      }
      break;
    case 'rotate':
      return `(x, y) \\;\\mapsto\\; (x \\cos ${state.angle}° - y \\sin ${state.angle}°,\\; x \\sin ${state.angle}° + y \\cos ${state.angle}°)`;
    case 'dilate':
      return `(x, y) \\;\\mapsto\\; (${fmt(state.k)}x,\\; ${fmt(state.k)}y) \\quad\\text{dilation by } k = ${fmt(state.k)}`;
    case 'compose':
      return `\\text{translate by }(${state.dx}, ${state.dy}),\\text{ then rotate }${state.angle}°,\\text{ then dilate by }${fmt(state.k)}`;
  }
  return '';
}

function buildControls(state) {
  const modeBtns = [['translate', 'Translate'], ['reflect', 'Reflect'], ['rotate', 'Rotate'], ['dilate', 'Dilate'], ['compose', 'Compose']]
    .map(([k, lbl]) => `<button type="button" class="tx-tab${k === state.mode ? ' active' : ''}" data-tx-mode="${k}">${lbl}</button>`).join('');
  let modeControls = '';
  if (state.mode === 'translate' || state.mode === 'compose') {
    modeControls += `
      <div class="tx-row">
        <label>dx</label>
        <input type="range" data-tx-dx min="-6" max="6" step="0.5" value="${state.dx}"/>
        <span class="val" data-tx-dxval>${fmt(state.dx, 1)}</span>
      </div>
      <div class="tx-row">
        <label>dy</label>
        <input type="range" data-tx-dy min="-5" max="5" step="0.5" value="${state.dy}"/>
        <span class="val" data-tx-dyval>${fmt(state.dy, 1)}</span>
      </div>
    `;
  }
  if (state.mode === 'reflect') {
    const opts = [['y-axis','y-axis'],['x-axis','x-axis'],['y=x','y = x'],['y=-x','y = -x']];
    modeControls += `<div class="tx-row"><label>axis</label><select data-tx-axis>${opts.map(([v,l]) => `<option value="${v}"${v===state.axis?' selected':''}>${l}</option>`).join('')}</select></div>`;
  }
  if (state.mode === 'rotate' || state.mode === 'compose') {
    modeControls += `
      <div class="tx-row">
        <label>angle</label>
        <input type="range" data-tx-angle min="-360" max="360" step="15" value="${state.angle}"/>
        <span class="val" data-tx-angleval>${fmt(state.angle, 0)}°</span>
      </div>
    `;
  }
  if (state.mode === 'dilate' || state.mode === 'compose') {
    modeControls += `
      <div class="tx-row">
        <label>k</label>
        <input type="range" data-tx-k min="-2" max="3" step="0.25" value="${state.k}"/>
        <span class="val" data-tx-kval>${fmt(state.k, 2)}</span>
      </div>
    `;
  }
  return `<div class="tx-tabs">${modeBtns}</div>${modeControls}`;
}

export function mountTransformation(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = {
    mode: cfg.mode,
    dx: cfg.dx, dy: cfg.dy,
    axis: cfg.axis,
    angle: cfg.angle,
    k: cfg.k,
  };
  const baseShape = SHAPES[cfg.shape] || SHAPES.arrow;

  const interactiveHtml = cfg.interactive ? buildControls(state) : '';

  target.innerHTML = `
    <div class="tx-wrap">
      <svg class="tx-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Transformation explorer">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-tx-grid></g>
        <g data-tx-aux></g>
        <g data-tx-arrows></g>
        <g data-tx-pre></g>
        <g data-tx-post></g>
      </svg>
      <div class="tx-controls">
        ${interactiveHtml ? `<div data-tx-controls>${interactiveHtml}</div>` : ''}
        <div class="tx-rule" data-tx-rule></div>
        <div class="tx-coords" data-tx-coords></div>
      </div>
    </div>
  `;

  const gGrid = target.querySelector('[data-tx-grid]');
  const gAux = target.querySelector('[data-tx-aux]');
  const gArrows = target.querySelector('[data-tx-arrows]');
  const gPre = target.querySelector('[data-tx-pre]');
  const gPost = target.querySelector('[data-tx-post]');
  const ruleBox = target.querySelector('[data-tx-rule]');
  const coordsBox = target.querySelector('[data-tx-coords]');
  const controlsBox = target.querySelector('[data-tx-controls]');

  gGrid.innerHTML = drawGrid();

  function render() {
    // Aux: reflection line or rotation center.
    let aux = '';
    if (state.mode === 'reflect') aux = drawReflectionLine(state.axis);
    if (state.mode === 'rotate' || state.mode === 'compose') aux = drawRotationCenter();
    gAux.innerHTML = aux;

    const pre = baseShape;
    const post = pre.map((p) => apply(state.mode, p, state));

    gPre.innerHTML = drawShape(pre, COLORS.preImage, COLORS.preImageFill, 1, true);
    gPost.innerHTML = drawShape(post, COLORS.image, COLORS.imageFill);
    gArrows.innerHTML = drawMappingArrows(pre, post);

    ruleBox.innerHTML = tex(ruleStringTex(state.mode, state));

    // Coord table: A, B, C, ... for each vertex.
    let coords = '<div class="tx-coords-grid">';
    coords += `<div class="tx-coords-head"><span></span><span>pre-image</span><span>image</span></div>`;
    for (let i = 0; i < Math.min(pre.length, 6); i++) {
      const name = String.fromCharCode(65 + i);
      coords += `<div class="tx-coords-row"><strong>${name}</strong><span>(${fmt(pre[i][0])}, ${fmt(pre[i][1])})</span><span>(${fmt(post[i][0])}, ${fmt(post[i][1])})</span></div>`;
    }
    coords += '</div>';
    coordsBox.innerHTML = coords;
  }
  render();

  function bindControls() {
    if (!controlsBox) return;
    controlsBox.querySelectorAll('[data-tx-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.mode = btn.dataset.txMode;
        controlsBox.innerHTML = buildControls(state);
        bindControls();
        render();
      });
    });
    const dxIn = controlsBox.querySelector('[data-tx-dx]');
    if (dxIn) dxIn.addEventListener('input', (e) => { state.dx = +e.target.value; controlsBox.querySelector('[data-tx-dxval]').textContent = fmt(state.dx, 1); render(); });
    const dyIn = controlsBox.querySelector('[data-tx-dy]');
    if (dyIn) dyIn.addEventListener('input', (e) => { state.dy = +e.target.value; controlsBox.querySelector('[data-tx-dyval]').textContent = fmt(state.dy, 1); render(); });
    const axisIn = controlsBox.querySelector('[data-tx-axis]');
    if (axisIn) axisIn.addEventListener('change', (e) => { state.axis = e.target.value; render(); });
    const angIn = controlsBox.querySelector('[data-tx-angle]');
    if (angIn) angIn.addEventListener('input', (e) => { state.angle = +e.target.value; controlsBox.querySelector('[data-tx-angleval]').textContent = fmt(state.angle, 0) + '°'; render(); });
    const kIn = controlsBox.querySelector('[data-tx-k]');
    if (kIn) kIn.addEventListener('input', (e) => { state.k = +e.target.value; controlsBox.querySelector('[data-tx-kval]').textContent = fmt(state.k, 2); render(); });
  }
  bindControls();
}
