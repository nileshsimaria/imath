import katex from 'katex';

// Coordinate plane widget. Modes:
//   slope-intercept   sliders for m and b; line is y = m·x + b
//   two-points        drag two points; show line and slope (optional rise/run triangle)
//   point-slope       drag one anchor point + slope slider; equation in y - y1 = m(x - x1)
//   standard-form     A, B, C sliders; line is Ax + By = C; shows intercepts + conversion
//   two-lines         two independent lines with parallel/perpendicular detector

const SVG_W = 600;
const SVG_H = 460;
const PAD = 30;

const COLORS = {
  primary: '#4f46e5',
  primaryDark: '#3730a3',
  accent2: '#10b981',
  accent2Dark: '#047857',
  muted: '#94a3b8',
  axis: '#cbd5e1',
  grid: '#eef2f7',
  bg: '#fafbfc',
  text: '#475569',
};

const COMMON_DEFAULTS = {
  mode: 'slope-intercept',
  xRange: [-10, 10],
  yRange: [-10, 10],
};

const MODE_DEFAULTS = {
  'slope-intercept': {
    initialM: 1, initialB: 0,
    mRange: [-5, 5], bRange: [-8, 8],
    mStep: 0.5, bStep: 1,
  },
  'two-points': {
    pointA: [-3, -1],
    pointB: [3, 4],
    showRiseRun: false,
  },
  'point-slope': {
    initialM: 1,
    mRange: [-5, 5], mStep: 0.5,
    anchor: [2, 3],
  },
  'standard-form': {
    coefA: 2, coefB: 3, coefC: 6,
    coefRange: [-6, 6], coefStep: 1,
  },
  'two-lines': {
    line1: { m: 1, b: 0 },
    line2: { m: -1, b: 2 },
    mRange: [-3, 3], bRange: [-6, 6],
    mStep: 0.5, bStep: 1,
  },
  'plot-points': {
    points: [[2, 3], [-3, 1], [-2, -2], [4, -1]],
  },
  'quadrants': {
    initialPoint: [3, 2],
  },
  'inequality': {
    op: '>',
    initialM: 1,
    initialB: 0,
    mRange: [-3, 3],
    bRange: [-6, 6],
    mStep: 0.5,
    bStep: 1,
  },
};

// ── Number / coord helpers ──────────────────────────
const fmt = (n) => parseFloat(Number(n).toFixed(2)).toString();
const snapHalf = (v) => Math.round(v * 2) / 2;
const clamp = (v, [lo, hi]) => Math.max(lo, Math.min(hi, v));

function makeProjector(xRange, yRange) {
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;
  const w = SVG_W - 2 * PAD;
  const h = SVG_H - 2 * PAD;
  return {
    sx: (x) => PAD + ((x - xMin) / (xMax - xMin)) * w,
    sy: (y) => SVG_H - PAD - ((y - yMin) / (yMax - yMin)) * h,
    ix: (px) => xMin + ((px - PAD) / w) * (xMax - xMin),
    iy: (py) => yMin + ((SVG_H - PAD - py) / h) * (yMax - yMin),
  };
}

// ── KaTeX helpers ───────────────────────────────────
const tex = (s, display = false) => {
  try {
    return katex.renderToString(s, { throwOnError: false, displayMode: display });
  } catch {
    return s;
  }
};

const renderInline = (text) =>
  text
    .split(/(\$[^$]+\$)/)
    .map((p) => (p.length > 1 && p.startsWith('$') && p.endsWith('$') ? tex(p.slice(1, -1)) : p))
    .join('');

// ── Equation formatters ─────────────────────────────
function eqSlopeIntercept(m, b) {
  if (m === 0) return `y = ${fmt(b)}`;
  const mPart = m === 1 ? 'x' : m === -1 ? '-x' : `${fmt(m)}x`;
  const bPart = b === 0 ? '' : b > 0 ? ` + ${fmt(b)}` : ` - ${fmt(Math.abs(b))}`;
  return `y = ${mPart}${bPart}`;
}

function eqPointSlope(m, x1, y1) {
  const lhs = y1 === 0 ? 'y' : y1 > 0 ? `y - ${fmt(y1)}` : `y + ${fmt(-y1)}`;
  const mPart = m === 1 ? '' : m === -1 ? '-' : fmt(m);
  if (m === 0) return `${lhs} = 0`;
  if (x1 === 0) return `${lhs} = ${mPart || ''}x`;
  const xPart = x1 > 0 ? `(x - ${fmt(x1)})` : `(x + ${fmt(-x1)})`;
  return `${lhs} = ${mPart}${xPart}`;
}

function eqStandard(A, B, C) {
  let aPart = '', bPart = '';
  if (A !== 0) aPart = A === 1 ? 'x' : A === -1 ? '-x' : `${fmt(A)}x`;
  if (B !== 0) {
    if (B === 1) bPart = aPart ? '+ y' : 'y';
    else if (B === -1) bPart = aPart ? '- y' : '-y';
    else if (B > 0) bPart = aPart ? `+ ${fmt(B)}y` : `${fmt(B)}y`;
    else bPart = aPart ? `- ${fmt(-B)}y` : `${fmt(B)}y`;
  }
  const lhs = `${aPart}${aPart && bPart ? ' ' : ''}${bPart}` || '0';
  return `${lhs} = ${fmt(C)}`;
}

// ── Drawing primitives ──────────────────────────────
function gridLinesSvg(xRange, yRange, proj) {
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;
  let s = '';
  for (let x = Math.ceil(xMin); x <= xMax; x++) {
    const X = proj.sx(x);
    s += `<line x1="${X}" y1="${PAD}" x2="${X}" y2="${SVG_H - PAD}" stroke="${x === 0 ? COLORS.axis : COLORS.grid}" stroke-width="${x === 0 ? 1.5 : 1}"/>`;
  }
  for (let y = Math.ceil(yMin); y <= yMax; y++) {
    const Y = proj.sy(y);
    s += `<line x1="${PAD}" y1="${Y}" x2="${SVG_W - PAD}" y2="${Y}" stroke="${y === 0 ? COLORS.axis : COLORS.grid}" stroke-width="${y === 0 ? 1.5 : 1}"/>`;
  }
  return s;
}

function axisLabelsSvg(xRange, yRange, proj) {
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;
  let s = '';
  for (let x = Math.ceil(xMin); x <= xMax; x++) {
    if (x === 0) continue;
    if (x % 2 !== 0 && xMax - xMin > 12) continue;
    s += `<text x="${proj.sx(x)}" y="${proj.sy(0) + 14}" font-size="11" fill="#64748b" text-anchor="middle">${x}</text>`;
  }
  for (let y = Math.ceil(yMin); y <= yMax; y++) {
    if (y === 0) continue;
    if (y % 2 !== 0 && yMax - yMin > 12) continue;
    s += `<text x="${proj.sx(0) - 6}" y="${proj.sy(y) + 4}" font-size="11" fill="#64748b" text-anchor="end">${y}</text>`;
  }
  s += `<text x="${proj.sx(0) - 6}" y="${proj.sy(0) + 14}" font-size="11" fill="#64748b" text-anchor="end">0</text>`;
  return s;
}

function lineSvg(m, b, xRange, yRange, proj, color = COLORS.primary, width = 2.5) {
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;
  const candidates = [
    [xMin, m * xMin + b],
    [xMax, m * xMax + b],
  ];
  if (m !== 0) {
    candidates.push([(yMin - b) / m, yMin]);
    candidates.push([(yMax - b) / m, yMax]);
  }
  const inside = candidates.filter(
    ([x, y]) => x >= xMin - 1e-6 && x <= xMax + 1e-6 && y >= yMin - 1e-6 && y <= yMax + 1e-6,
  );
  if (inside.length < 2) return '';
  inside.sort((p, q) => p[0] - q[0]);
  const [a, c] = [inside[0], inside[inside.length - 1]];
  return `<line x1="${proj.sx(a[0])}" y1="${proj.sy(a[1])}" x2="${proj.sx(c[0])}" y2="${proj.sy(c[1])}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
}

function verticalLineSvg(x, xRange, yRange, proj, color = COLORS.primary, width = 2.5) {
  const [xMin, xMax] = xRange;
  if (x < xMin || x > xMax) return '';
  const X = proj.sx(x);
  return `<line x1="${X}" y1="${PAD}" x2="${X}" y2="${SVG_H - PAD}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
}

// ── Pointer drag ────────────────────────────────────
// Bind drag to a single SVG element representing a draggable math point.
// `setter([x, y])` updates state; `onChange` re-renders.
function bindDrag(svg, el, cfg, proj, setter, onChange) {
  let dragging = false;
  el.addEventListener('pointerdown', (e) => {
    dragging = true;
    el.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * SVG_W;
    const py = ((e.clientY - rect.top) / rect.height) * SVG_H;
    const x = clamp(snapHalf(proj.ix(px)), cfg.xRange);
    const y = clamp(snapHalf(proj.iy(py)), cfg.yRange);
    setter([x, y]);
    onChange();
  });
  el.addEventListener('pointerup', (e) => {
    dragging = false;
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {}
  });
}

// ── Mode: slope-intercept ───────────────────────────
function initSlopeIntercept(target, cfg, proj, refs) {
  const state = { m: cfg.initialM, b: cfg.initialB };

  refs.controls.innerHTML = `
    <div class="cp-eq" data-cp-eq></div>
    <div class="cp-row">
      <label>Slope <em>m</em></label>
      <input type="range" data-cp-m min="${cfg.mRange[0]}" max="${cfg.mRange[1]}" step="${cfg.mStep}" value="${state.m}" />
      <span class="val" data-cp-mval>${fmt(state.m)}</span>
    </div>
    <div class="cp-row">
      <label>Intercept <em>b</em></label>
      <input type="range" data-cp-b min="${cfg.bRange[0]}" max="${cfg.bRange[1]}" step="${cfg.bStep}" value="${state.b}" />
      <span class="val" data-cp-bval>${fmt(state.b)}</span>
    </div>
    <div class="cp-helper">Drag the sliders. The blue dot is the y-intercept; the gray dot is the x-intercept.</div>
  `;

  const eqBox = target.querySelector('[data-cp-eq]');

  function render() {
    refs.gLine.innerHTML = lineSvg(state.m, state.b, cfg.xRange, cfg.yRange, proj);
    let pts = `<circle cx="${proj.sx(0)}" cy="${proj.sy(state.b)}" r="5" fill="${COLORS.primary}" stroke="white" stroke-width="2"/>`;
    if (state.m !== 0) {
      pts += `<circle cx="${proj.sx(-state.b / state.m)}" cy="${proj.sy(0)}" r="4" fill="${COLORS.muted}" stroke="white" stroke-width="2"/>`;
    }
    refs.gPoints.innerHTML = pts;
    eqBox.innerHTML = tex(eqSlopeIntercept(state.m, state.b));
  }

  render();
  target.querySelector('[data-cp-m]').addEventListener('input', (e) => {
    state.m = parseFloat(e.target.value);
    target.querySelector('[data-cp-mval]').textContent = fmt(state.m);
    render();
  });
  target.querySelector('[data-cp-b]').addEventListener('input', (e) => {
    state.b = parseFloat(e.target.value);
    target.querySelector('[data-cp-bval]').textContent = fmt(state.b);
    render();
  });
}

// ── Mode: two-points ────────────────────────────────
function initTwoPoints(target, cfg, proj, refs) {
  const state = { a: [...cfg.pointA], p: [...cfg.pointB] };
  const showRiseRun = !!cfg.showRiseRun;

  refs.controls.innerHTML = `
    <div class="cp-eq" data-cp-eq></div>
    <div class="cp-helper" data-cp-readout></div>
    <div class="cp-helper">Drag either point. The slope is calculated using $m = \\dfrac{y_2 - y_1}{x_2 - x_1}$.</div>
  `;

  const eqBox = target.querySelector('[data-cp-eq]');
  const readout = target.querySelector('[data-cp-readout]');

  function render() {
    const [x1, y1] = state.a;
    const [x2, y2] = state.p;
    let lineHtml = '';
    let triangle = '';
    let eq;

    if (x1 === x2) {
      lineHtml = verticalLineSvg(x1, cfg.xRange, cfg.yRange, proj);
      eq = `x = ${fmt(x1)}`;
    } else {
      const m = (y2 - y1) / (x2 - x1);
      const b = y1 - m * x1;
      lineHtml = lineSvg(m, b, cfg.xRange, cfg.yRange, proj);
      eq = eqSlopeIntercept(parseFloat(m.toFixed(2)), parseFloat(b.toFixed(2)));

      if (showRiseRun) {
        const cx = x2;
        const cy = y1;
        triangle += `<line x1="${proj.sx(x1)}" y1="${proj.sy(y1)}" x2="${proj.sx(cx)}" y2="${proj.sy(cy)}" stroke="${COLORS.muted}" stroke-width="2" stroke-dasharray="6 4"/>`;
        triangle += `<line x1="${proj.sx(cx)}" y1="${proj.sy(cy)}" x2="${proj.sx(x2)}" y2="${proj.sy(y2)}" stroke="${COLORS.muted}" stroke-width="2" stroke-dasharray="6 4"/>`;
        const runMid = (x1 + cx) / 2;
        const riseMid = (cy + y2) / 2;
        triangle += `<text x="${proj.sx(runMid)}" y="${proj.sy(cy) + (y2 > y1 ? 18 : -8)}" font-size="13" fill="${COLORS.text}" text-anchor="middle" font-style="italic">run = ${fmt(x2 - x1)}</text>`;
        triangle += `<text x="${proj.sx(cx) + 8}" y="${proj.sy(riseMid)}" font-size="13" fill="${COLORS.text}" font-style="italic">rise = ${fmt(y2 - y1)}</text>`;
      }
    }

    refs.gLine.innerHTML = triangle + lineHtml;
    refs.gPoints.innerHTML = `
      <circle data-pt="a" cx="${proj.sx(x1)}" cy="${proj.sy(y1)}" r="9" fill="${COLORS.primary}" stroke="white" stroke-width="2" style="cursor:grab"/>
      <circle data-pt="p" cx="${proj.sx(x2)}" cy="${proj.sy(y2)}" r="9" fill="${COLORS.accent2}" stroke="white" stroke-width="2" style="cursor:grab"/>
      <text x="${proj.sx(x1) + 12}" y="${proj.sy(y1) - 8}" font-size="12" fill="#1e1b4b">(${fmt(x1)}, ${fmt(y1)})</text>
      <text x="${proj.sx(x2) + 12}" y="${proj.sy(y2) - 8}" font-size="12" fill="#064e3b">(${fmt(x2)}, ${fmt(y2)})</text>
    `;
    eqBox.innerHTML = tex(eq);

    if (x1 === x2) {
      readout.textContent = 'Vertical line — slope is undefined.';
    } else {
      const m = (y2 - y1) / (x2 - x1);
      readout.innerHTML = tex(`m = \\dfrac{${fmt(y2)} - ${fmt(y1)}}{${fmt(x2)} - ${fmt(x1)}} = ${fmt(m)}`);
    }

    bindDrag(refs.svg, refs.svg.querySelector('[data-pt="a"]'), cfg, proj, (xy) => (state.a = xy), render);
    bindDrag(refs.svg, refs.svg.querySelector('[data-pt="p"]'), cfg, proj, (xy) => (state.p = xy), render);
  }

  render();
}

// ── Mode: point-slope ───────────────────────────────
function initPointSlope(target, cfg, proj, refs) {
  const state = { m: cfg.initialM, anchor: [...cfg.anchor] };

  refs.controls.innerHTML = `
    <div class="cp-eq" data-cp-eq></div>
    <div class="cp-row">
      <label>Slope <em>m</em></label>
      <input type="range" data-cp-m min="${cfg.mRange[0]}" max="${cfg.mRange[1]}" step="${cfg.mStep}" value="${state.m}" />
      <span class="val" data-cp-mval>${fmt(state.m)}</span>
    </div>
    <div class="cp-helper">Drag the green point to choose $(x_1, y_1)$. Use the slider to set the slope.</div>
  `;

  const eqBox = target.querySelector('[data-cp-eq]');

  function render() {
    const [x1, y1] = state.anchor;
    const m = state.m;
    const b = y1 - m * x1;
    refs.gLine.innerHTML = lineSvg(m, b, cfg.xRange, cfg.yRange, proj);
    refs.gPoints.innerHTML = `
      <circle data-pt="anchor" cx="${proj.sx(x1)}" cy="${proj.sy(y1)}" r="9" fill="${COLORS.accent2}" stroke="white" stroke-width="2" style="cursor:grab"/>
      <text x="${proj.sx(x1) + 12}" y="${proj.sy(y1) - 8}" font-size="12" fill="#064e3b">(${fmt(x1)}, ${fmt(y1)})</text>
    `;
    eqBox.innerHTML = tex(eqPointSlope(m, x1, y1));

    bindDrag(
      refs.svg,
      refs.svg.querySelector('[data-pt="anchor"]'),
      cfg, proj,
      (xy) => (state.anchor = xy),
      render,
    );
  }

  render();
  target.querySelector('[data-cp-m]').addEventListener('input', (e) => {
    state.m = parseFloat(e.target.value);
    target.querySelector('[data-cp-mval]').textContent = fmt(state.m);
    render();
  });
}

// ── Mode: standard-form ─────────────────────────────
function initStandardForm(target, cfg, proj, refs) {
  const state = { A: cfg.coefA, B: cfg.coefB, C: cfg.coefC };
  const r = cfg.coefRange;
  const cR = [r[0] * 2, r[1] * 2]; // C tends to need a wider range
  const step = cfg.coefStep;

  refs.controls.innerHTML = `
    <div class="cp-eq" data-cp-eq></div>
    <div class="cp-row">
      <label><em>A</em></label>
      <input type="range" data-cp-A min="${r[0]}" max="${r[1]}" step="${step}" value="${state.A}" />
      <span class="val" data-cp-Aval>${fmt(state.A)}</span>
    </div>
    <div class="cp-row">
      <label><em>B</em></label>
      <input type="range" data-cp-B min="${r[0]}" max="${r[1]}" step="${step}" value="${state.B}" />
      <span class="val" data-cp-Bval>${fmt(state.B)}</span>
    </div>
    <div class="cp-row">
      <label><em>C</em></label>
      <input type="range" data-cp-C min="${cR[0]}" max="${cR[1]}" step="${step}" value="${state.C}" />
      <span class="val" data-cp-Cval>${fmt(state.C)}</span>
    </div>
    <div class="cp-helper" data-cp-conv></div>
  `;

  const eqBox = target.querySelector('[data-cp-eq]');
  const convBox = target.querySelector('[data-cp-conv]');

  function render() {
    const { A, B, C } = state;
    let lineHtml = '';
    let conv = '';
    let pts = '';

    if (A === 0 && B === 0) {
      conv = C === 0 ? 'All points satisfy this equation.' : 'No solutions: this equation has no points.';
    } else if (B === 0) {
      const x = C / A;
      lineHtml = verticalLineSvg(x, cfg.xRange, cfg.yRange, proj);
      conv = `Vertical line: $x = ${fmt(x)}$. Slope is undefined.`;
      pts += `<circle cx="${proj.sx(x)}" cy="${proj.sy(0)}" r="4" fill="${COLORS.muted}" stroke="white" stroke-width="2"/>`;
    } else {
      const m = -A / B;
      const b = C / B;
      lineHtml = lineSvg(m, b, cfg.xRange, cfg.yRange, proj);
      conv = `Slope-intercept form: $${eqSlopeIntercept(parseFloat(m.toFixed(3)), parseFloat(b.toFixed(3)))}$`;
    }

    if (A !== 0) {
      const xi = C / A;
      pts += `<circle cx="${proj.sx(xi)}" cy="${proj.sy(0)}" r="4" fill="${COLORS.muted}" stroke="white" stroke-width="2"/>`;
      pts += `<text x="${proj.sx(xi) + 8}" y="${proj.sy(0) + 14}" font-size="11" fill="${COLORS.text}">(${fmt(xi)}, 0)</text>`;
    }
    if (B !== 0) {
      const yi = C / B;
      pts += `<circle cx="${proj.sx(0)}" cy="${proj.sy(yi)}" r="4" fill="${COLORS.primary}" stroke="white" stroke-width="2"/>`;
      pts += `<text x="${proj.sx(0) + 8}" y="${proj.sy(yi) - 8}" font-size="11" fill="#1e1b4b">(0, ${fmt(yi)})</text>`;
    }

    refs.gLine.innerHTML = lineHtml;
    refs.gPoints.innerHTML = pts;
    eqBox.innerHTML = tex(eqStandard(A, B, C));
    convBox.innerHTML = renderInline(conv);
  }

  render();
  ['A', 'B', 'C'].forEach((k) => {
    target.querySelector(`[data-cp-${k}]`).addEventListener('input', (e) => {
      state[k] = parseFloat(e.target.value);
      target.querySelector(`[data-cp-${k}val]`).textContent = fmt(state[k]);
      render();
    });
  });
}

// ── Mode: two-lines ─────────────────────────────────
function initTwoLines(target, cfg, proj, refs) {
  const state = {
    m1: cfg.line1.m, b1: cfg.line1.b,
    m2: cfg.line2.m, b2: cfg.line2.b,
  };

  refs.controls.innerHTML = `
    <div class="cp-eq" data-cp-eq></div>
    <div class="cp-rel" data-cp-rel></div>
    <div class="cp-row">
      <label style="color:${COLORS.primary}">L₁: <em>m₁</em></label>
      <input type="range" data-cp-m1 min="${cfg.mRange[0]}" max="${cfg.mRange[1]}" step="${cfg.mStep}" value="${state.m1}" />
      <span class="val" data-cp-m1val>${fmt(state.m1)}</span>
    </div>
    <div class="cp-row">
      <label style="color:${COLORS.primary}"><em>b₁</em></label>
      <input type="range" data-cp-b1 min="${cfg.bRange[0]}" max="${cfg.bRange[1]}" step="${cfg.bStep}" value="${state.b1}" />
      <span class="val" data-cp-b1val>${fmt(state.b1)}</span>
    </div>
    <div class="cp-row">
      <label style="color:${COLORS.accent2Dark}">L₂: <em>m₂</em></label>
      <input type="range" data-cp-m2 min="${cfg.mRange[0]}" max="${cfg.mRange[1]}" step="${cfg.mStep}" value="${state.m2}" />
      <span class="val" data-cp-m2val>${fmt(state.m2)}</span>
    </div>
    <div class="cp-row">
      <label style="color:${COLORS.accent2Dark}"><em>b₂</em></label>
      <input type="range" data-cp-b2 min="${cfg.bRange[0]}" max="${cfg.bRange[1]}" step="${cfg.bStep}" value="${state.b2}" />
      <span class="val" data-cp-b2val>${fmt(state.b2)}</span>
    </div>
  `;

  const eqBox = target.querySelector('[data-cp-eq]');
  const relBox = target.querySelector('[data-cp-rel]');

  function render() {
    const { m1, b1, m2, b2 } = state;
    refs.gLine.innerHTML =
      lineSvg(m1, b1, cfg.xRange, cfg.yRange, proj, COLORS.primary) +
      lineSvg(m2, b2, cfg.xRange, cfg.yRange, proj, COLORS.accent2);

    // Intersection point — only when the lines aren't parallel/coincident
    // and the meeting point is inside the visible window.
    let pts = '';
    if (Math.abs(m1 - m2) > 1e-9) {
      const ix = (b2 - b1) / (m1 - m2);
      const iy = m1 * ix + b1;
      if (ix >= cfg.xRange[0] && ix <= cfg.xRange[1] && iy >= cfg.yRange[0] && iy <= cfg.yRange[1]) {
        pts += `<circle cx="${proj.sx(ix)}" cy="${proj.sy(iy)}" r="7" fill="#dc2626" stroke="white" stroke-width="2.5"/>`;
        pts += `<text x="${proj.sx(ix) + 12}" y="${proj.sy(iy) - 12}" font-size="13" fill="#7f1d1d" font-weight="700">(${fmt(ix)}, ${fmt(iy)})</text>`;
      }
    }
    refs.gPoints.innerHTML = pts;

    eqBox.innerHTML = `
      <div style="text-align:left">
        <div style="color:${COLORS.primary}">${tex(`L_1\\!: ${eqSlopeIntercept(m1, b1)}`)}</div>
        <div style="color:${COLORS.accent2Dark}; margin-top:6px">${tex(`L_2\\!: ${eqSlopeIntercept(m2, b2)}`)}</div>
      </div>`;

    let rel, cls;
    if (Math.abs(m1 - m2) < 1e-9) {
      if (Math.abs(b1 - b2) < 1e-9) { rel = 'Same line'; cls = 'cp-rel-same'; }
      else { rel = 'Parallel — equal slopes, different y-intercepts'; cls = 'cp-rel-parallel'; }
    } else if (Math.abs(m1 * m2 + 1) < 1e-9) {
      rel = 'Perpendicular — slopes are negative reciprocals (m₁ · m₂ = −1)';
      cls = 'cp-rel-perp';
    } else {
      rel = `Neither parallel nor perpendicular  ·  m₁ · m₂ = ${fmt(m1 * m2)}`;
      cls = 'cp-rel-none';
    }
    relBox.className = `cp-rel ${cls}`;
    relBox.textContent = rel;
  }

  render();
  ['m1', 'b1', 'm2', 'b2'].forEach((k) => {
    target.querySelector(`[data-cp-${k}]`).addEventListener('input', (e) => {
      state[k] = parseFloat(e.target.value);
      target.querySelector(`[data-cp-${k}val]`).textContent = fmt(state[k]);
      render();
    });
  });
}

// ── Mode: plot-points ───────────────────────────────
const POINT_PALETTE = ['#4f46e5', '#10b981', '#7c3aed', '#dc2626', '#ea580c', '#0891b2'];

function initPlotPoints(target, cfg, proj, refs) {
  const points = cfg.points || [];

  refs.controls.innerHTML = `
    <div class="cp-helper">A point $(x, y)$ tells you to go $x$ units right (or left if negative) along the x-axis, then $y$ units up (or down if negative) along the y-axis.</div>
    <div class="cp-points-list">
      ${points
        .map((p, i) => {
          const color = POINT_PALETTE[i % POINT_PALETTE.length];
          return `<div class="cp-point-item"><span class="cp-dot" style="background:${color}"></span><span>(${fmt(p[0])}, ${fmt(p[1])})</span></div>`;
        })
        .join('')}
    </div>
  `;
  // Math in helper text is rendered post-mount by registry.postRenderHelperMath.

  let pointsHtml = '';
  points.forEach((p, i) => {
    const color = POINT_PALETTE[i % POINT_PALETTE.length];
    const sx = proj.sx(p[0]);
    const sy = proj.sy(p[1]);
    pointsHtml += `<line x1="${proj.sx(0)}" y1="${sy}" x2="${sx}" y2="${sy}" stroke="${color}" stroke-width="1" stroke-dasharray="4 3" opacity="0.4"/>`;
    pointsHtml += `<line x1="${sx}" y1="${proj.sy(0)}" x2="${sx}" y2="${sy}" stroke="${color}" stroke-width="1" stroke-dasharray="4 3" opacity="0.4"/>`;
    pointsHtml += `<circle cx="${sx}" cy="${sy}" r="6" fill="${color}" stroke="white" stroke-width="2"/>`;
    pointsHtml += `<text x="${sx + 10}" y="${sy - 10}" font-size="13" fill="${color}" font-weight="600">(${fmt(p[0])}, ${fmt(p[1])})</text>`;
  });
  refs.gPoints.innerHTML = pointsHtml;
  refs.gLine.innerHTML = '';
}

// ── Mode: quadrants ─────────────────────────────────
const QUADRANT_FILLS = {
  I: '#dbeafe', II: '#dcfce7', III: '#fef3c7', IV: '#fce7f3',
};
const QUADRANT_LABEL_COLORS = {
  I: '#3730a3', II: '#047857', III: '#92400e', IV: '#9d174d',
};

function getQuadrant(x, y) {
  if (x === 0 && y === 0) return { name: 'origin', html: 'On the <strong>origin</strong>.' };
  if (x === 0) return { name: 'y-axis', html: `On the <strong>y-axis</strong> (${y > 0 ? 'positive' : 'negative'}).` };
  if (y === 0) return { name: 'x-axis', html: `On the <strong>x-axis</strong> (${x > 0 ? 'positive' : 'negative'}).` };
  if (x > 0 && y > 0) return { name: 'I', html: 'In Quadrant <strong>I</strong> — both coordinates positive.' };
  if (x < 0 && y > 0) return { name: 'II', html: 'In Quadrant <strong>II</strong> — x negative, y positive.' };
  if (x < 0 && y < 0) return { name: 'III', html: 'In Quadrant <strong>III</strong> — both coordinates negative.' };
  return { name: 'IV', html: 'In Quadrant <strong>IV</strong> — x positive, y negative.' };
}

function initQuadrants(target, cfg, proj, refs) {
  const [xMin, xMax] = cfg.xRange;
  const [yMin, yMax] = cfg.yRange;
  const x0 = proj.sx(0);
  const y0 = proj.sy(0);
  const xL = proj.sx(xMin);
  const xR = proj.sx(xMax);
  const yT = proj.sy(yMax);
  const yB = proj.sy(yMin);

  let bg = '';
  bg += `<rect x="${x0}" y="${yT}" width="${xR - x0}" height="${y0 - yT}" fill="${QUADRANT_FILLS.I}" opacity="0.5"/>`;
  bg += `<rect x="${xL}" y="${yT}" width="${x0 - xL}" height="${y0 - yT}" fill="${QUADRANT_FILLS.II}" opacity="0.5"/>`;
  bg += `<rect x="${xL}" y="${y0}" width="${x0 - xL}" height="${yB - y0}" fill="${QUADRANT_FILLS.III}" opacity="0.5"/>`;
  bg += `<rect x="${x0}" y="${y0}" width="${xR - x0}" height="${yB - y0}" fill="${QUADRANT_FILLS.IV}" opacity="0.5"/>`;
  bg += `<text x="${(x0 + xR) / 2}" y="${(yT + y0) / 2}" font-size="40" fill="${QUADRANT_LABEL_COLORS.I}" text-anchor="middle" dominant-baseline="middle" opacity="0.45" font-weight="700" font-family="Iowan Old Style, Georgia, serif">I</text>`;
  bg += `<text x="${(xL + x0) / 2}" y="${(yT + y0) / 2}" font-size="40" fill="${QUADRANT_LABEL_COLORS.II}" text-anchor="middle" dominant-baseline="middle" opacity="0.45" font-weight="700" font-family="Iowan Old Style, Georgia, serif">II</text>`;
  bg += `<text x="${(xL + x0) / 2}" y="${(y0 + yB) / 2}" font-size="40" fill="${QUADRANT_LABEL_COLORS.III}" text-anchor="middle" dominant-baseline="middle" opacity="0.45" font-weight="700" font-family="Iowan Old Style, Georgia, serif">III</text>`;
  bg += `<text x="${(x0 + xR) / 2}" y="${(y0 + yB) / 2}" font-size="40" fill="${QUADRANT_LABEL_COLORS.IV}" text-anchor="middle" dominant-baseline="middle" opacity="0.45" font-weight="700" font-family="Iowan Old Style, Georgia, serif">IV</text>`;
  refs.gLine.innerHTML = bg;

  refs.controls.innerHTML = `
    <div class="cp-quad-readout" data-cp-quad></div>
    <div class="cp-helper">Drag the point to any region. Quadrants are numbered <strong>I</strong>, <strong>II</strong>, <strong>III</strong>, <strong>IV</strong> counterclockwise starting from the top right.</div>
  `;
  const readoutEl = target.querySelector('[data-cp-quad]');

  const state = { p: [...cfg.initialPoint] };

  function render() {
    const [x, y] = state.p;
    refs.gPoints.innerHTML = `
      <circle data-pt="p" cx="${proj.sx(x)}" cy="${proj.sy(y)}" r="9" fill="#1e293b" stroke="white" stroke-width="2.5" style="cursor:grab"/>
      <text x="${proj.sx(x) + 12}" y="${proj.sy(y) - 10}" font-size="13" fill="#1e293b" font-weight="600">(${fmt(x)}, ${fmt(y)})</text>
    `;
    const q = getQuadrant(x, y);
    readoutEl.innerHTML = `<div style="font-size:14px"><strong>(${fmt(x)}, ${fmt(y)})</strong> — ${q.html}</div>`;

    bindDrag(refs.svg, refs.svg.querySelector('[data-pt="p"]'), cfg, proj, (xy) => (state.p = xy), render);
  }

  render();
}

// ── Mode: inequality ────────────────────────────────
const OP_TEX_CP = { '<': '<', '<=': '\\leq', '>': '>', '>=': '\\geq' };
const SHADE_COLOR = '#4f46e5';

function shadingPolygon(m, b, op, xRange, yRange, proj) {
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;
  const above = op === '>' || op === '>=';
  const eps = 1e-9;
  const inRegion = (x, y) => (above ? y > m * x + b - eps : y < m * x + b + eps);

  // Find where the line meets the window perimeter (same as lineSvg helper).
  const candidates = [
    [xMin, m * xMin + b],
    [xMax, m * xMax + b],
  ];
  if (m !== 0) {
    candidates.push([(yMin - b) / m, yMin]);
    candidates.push([(yMax - b) / m, yMax]);
  }
  const inside = candidates.filter(
    ([x, y]) => x >= xMin - 1e-6 && x <= xMax + 1e-6 && y >= yMin - 1e-6 && y <= yMax + 1e-6,
  );
  if (inside.length < 2) {
    // Line doesn't cross visible window — shade the entire window if the test point is in the region.
    const testInside = inRegion(0, 0);
    if (testInside) {
      return [
        [xMin, yMin], [xMax, yMin], [xMax, yMax], [xMin, yMax],
      ].map(([x, y]) => `${proj.sx(x)},${proj.sy(y)}`).join(' ');
    }
    return '';
  }
  inside.sort((p, q) => p[0] - q[0]);
  const [P1, P2] = [inside[0], inside[inside.length - 1]];

  const corners = [[xMin, yMin], [xMax, yMin], [xMax, yMax], [xMin, yMax]];
  const shadedCorners = corners.filter(([x, y]) => inRegion(x, y));
  const points = [P1, P2, ...shadedCorners];
  if (points.length < 3) return '';

  const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
  const cy = points.reduce((s, p) => s + p[1], 0) / points.length;
  points.sort((a, c) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(c[1] - cy, c[0] - cx));
  return points.map(([x, y]) => `${proj.sx(x)},${proj.sy(y)}`).join(' ');
}

function initInequality(target, cfg, proj, refs) {
  const state = { m: cfg.initialM, b: cfg.initialB, op: cfg.op };

  refs.controls.innerHTML = `
    <div class="cp-eq" data-cp-eq></div>
    <div class="cp-row">
      <label>op</label>
      <div class="cp-op-tabs" data-cp-ops>
        <button data-op="<" class="${state.op === '<' ? 'active' : ''}">&lt;</button>
        <button data-op="<=" class="${state.op === '<=' ? 'active' : ''}">≤</button>
        <button data-op=">" class="${state.op === '>' ? 'active' : ''}">&gt;</button>
        <button data-op=">=" class="${state.op === '>=' ? 'active' : ''}">≥</button>
      </div>
    </div>
    <div class="cp-row">
      <label>Slope <em>m</em></label>
      <input type="range" data-cp-m min="${cfg.mRange[0]}" max="${cfg.mRange[1]}" step="${cfg.mStep}" value="${state.m}"/>
      <span class="val" data-cp-mval>${fmt(state.m)}</span>
    </div>
    <div class="cp-row">
      <label>Intercept <em>b</em></label>
      <input type="range" data-cp-b min="${cfg.bRange[0]}" max="${cfg.bRange[1]}" step="${cfg.bStep}" value="${state.b}"/>
      <span class="val" data-cp-bval>${fmt(state.b)}</span>
    </div>
    <div class="cp-helper">A <strong>dashed</strong> boundary means the line itself is <em>not</em> in the solution (strict $<$ or $>$). A <strong>solid</strong> boundary means it <em>is</em> ($\\leq$ or $\\geq$).</div>
  `;
  // Math in helper text is rendered post-mount by registry.postRenderHelperMath.

  const eqBox = target.querySelector('[data-cp-eq]');

  function render() {
    const isStrict = state.op === '<' || state.op === '>';
    const dash = isStrict ? ' stroke-dasharray="6 4"' : '';
    // Half-plane shading
    const polyPoints = shadingPolygon(state.m, state.b, state.op, cfg.xRange, cfg.yRange, proj);
    let svg = '';
    if (polyPoints) {
      svg += `<polygon points="${polyPoints}" fill="${SHADE_COLOR}" opacity="0.18"/>`;
    }
    // Line
    const [xMin, xMax] = cfg.xRange;
    const [yMin, yMax] = cfg.yRange;
    const candidates = [
      [xMin, state.m * xMin + state.b],
      [xMax, state.m * xMax + state.b],
    ];
    if (state.m !== 0) {
      candidates.push([(yMin - state.b) / state.m, yMin]);
      candidates.push([(yMax - state.b) / state.m, yMax]);
    }
    const inside = candidates.filter(
      ([x, y]) => x >= xMin - 1e-6 && x <= xMax + 1e-6 && y >= yMin - 1e-6 && y <= yMax + 1e-6,
    );
    if (inside.length >= 2) {
      inside.sort((p, q) => p[0] - q[0]);
      const a = inside[0];
      const c = inside[inside.length - 1];
      svg += `<line x1="${proj.sx(a[0])}" y1="${proj.sy(a[1])}" x2="${proj.sx(c[0])}" y2="${proj.sy(c[1])}" stroke="${SHADE_COLOR}" stroke-width="2.5" stroke-linecap="round"${dash}/>`;
    }
    refs.gLine.innerHTML = svg;
    refs.gPoints.innerHTML = '';

    eqBox.innerHTML = tex(`y ${OP_TEX_CP[state.op]} ${eqSlopeIntercept(state.m, state.b).slice(4)}`);
  }

  render();

  target.querySelectorAll('[data-op]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.op = btn.dataset.op;
      target.querySelectorAll('[data-op]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    });
  });
  target.querySelector('[data-cp-m]').addEventListener('input', (e) => {
    state.m = parseFloat(e.target.value);
    target.querySelector('[data-cp-mval]').textContent = fmt(state.m);
    render();
  });
  target.querySelector('[data-cp-b]').addEventListener('input', (e) => {
    state.b = parseFloat(e.target.value);
    target.querySelector('[data-cp-bval]').textContent = fmt(state.b);
    render();
  });
}

// ── Dispatcher ──────────────────────────────────────
const MODE_INITS = {
  'slope-intercept': initSlopeIntercept,
  'two-points': initTwoPoints,
  'point-slope': initPointSlope,
  'standard-form': initStandardForm,
  'two-lines': initTwoLines,
  'plot-points': initPlotPoints,
  'quadrants': initQuadrants,
  'inequality': initInequality,
};

export function mountCoordinatePlane(target, userConfig = {}) {
  const mode = userConfig.mode || COMMON_DEFAULTS.mode;
  const cfg = {
    ...COMMON_DEFAULTS,
    ...(MODE_DEFAULTS[mode] || {}),
    ...userConfig,
  };
  const proj = makeProjector(cfg.xRange, cfg.yRange);

  target.innerHTML = `
    <div class="cp-wrap">
      <svg class="cp-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Interactive coordinate plane">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}" />
        <g data-cp-grid></g>
        <g data-cp-labels></g>
        <g data-cp-line></g>
        <g data-cp-points></g>
      </svg>
      <div class="cp-controls" data-cp-controls></div>
    </div>
  `;

  const refs = {
    svg: target.querySelector('svg'),
    gGrid: target.querySelector('[data-cp-grid]'),
    gLabels: target.querySelector('[data-cp-labels]'),
    gLine: target.querySelector('[data-cp-line]'),
    gPoints: target.querySelector('[data-cp-points]'),
    controls: target.querySelector('[data-cp-controls]'),
  };
  refs.gGrid.innerHTML = gridLinesSvg(cfg.xRange, cfg.yRange, proj);
  refs.gLabels.innerHTML = axisLabelsSvg(cfg.xRange, cfg.yRange, proj);

  (MODE_INITS[mode] || MODE_INITS['slope-intercept'])(target, cfg, proj, refs);
}
