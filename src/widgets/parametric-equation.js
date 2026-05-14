import katex from 'katex';

// Parametric equation explorer.
//
// Driven by the PDF's bonus problem: √(1 + sin x) + √(1 − sin x) = √b.
// Plot the LHS (a curve in x) and the RHS (a horizontal line in y),
// with a slider for the parameter b. Mark intersections — those are
// the solutions to the equation.
//
// More generally, this widget shows the "graphical method" for any
// equation f(x) = c: draw f, draw the line y = c, the solutions are
// the x-coordinates of the intersections.
//
// Presets (config.preset):
//   sqrt-sin     LHS = √(1+sinx) + √(1−sinx) (default)
//   x2-plus-3    LHS = x² + 3  (the introductory algebra example)
//   neg-x2-3x-2  LHS = −x² + 3x + 2  (the inequality example)
//
// Other config:
//   b: initial RHS value
//   bMin, bMax, bStep: slider bounds
//   xMin, xMax, yMin, yMax: viewing window

const SVG_W = 640;
const SVG_H = 380;
const PAD = { left: 40, right: 16, top: 18, bottom: 36 };

const COLORS = {
  curve: '#dc2626',
  line: '#16a34a',
  axis: '#94a3b8',
  grid: '#eef2f7',
  intersection: '#facc15',
  intersectionEdge: '#b45309',
  text: '#1e293b',
  textMuted: '#64748b',
  bg: '#fafbfc',
};

const PRESETS = {
  'sqrt-sin': {
    label: '\\sqrt{1+\\sin x} + \\sqrt{1-\\sin x} = \\sqrt{b}',
    lhsLatex: '\\sqrt{1+\\sin x} + \\sqrt{1-\\sin x}',
    rhsLatex: '\\sqrt{b}',
    lhs: (x) => Math.sqrt(1 + Math.sin(x)) + Math.sqrt(1 - Math.sin(x)),
    rhs: (b) => Math.sqrt(b),
    rhsLabel: (b) => `\\sqrt{${fmt(b, 2)}} \\approx ${fmt(Math.sqrt(b), 3)}`,
    bMin: 0, bMax: 8, bStep: 0.1, b: 3,
    xMin: -2 * Math.PI, xMax: 2 * Math.PI, yMin: -0.2, yMax: 2.6,
    // Hint shown beneath the controls.
    explanation: 'The LHS bounces between $\\sqrt{2}$ (at $\\sin x = \\pm 1$) and $2$ (at $\\sin x = 0$). So solutions exist precisely when $\\sqrt{b} \\in [\\sqrt{2}, 2]$, i.e. $b \\in [2, 4]$.',
  },
  'x2-plus-3': {
    label: 'x^2 + 3 = -x',
    lhsLatex: 'x^2 + 3',
    rhsLatex: '-x',
    lhs: (x) => x * x + 3,
    rhs: (x) => -x,
    isRhsLine: true,  // RHS is a function of x, not a horizontal line
    bMin: 0, bMax: 0, bStep: 1, b: 0,
    xMin: -5, xMax: 5, yMin: -3, yMax: 10,
    explanation: 'These graphs never cross — the equation has no real solutions. (Confirm: discriminant $1 - 12 = -11 < 0$.)',
  },
  'horizontal-c': {
    label: 'f(x) = c',
    lhsLatex: 'f(x) = -x^2 + 3x + 2',
    rhsLatex: 'c',
    lhs: (x) => -x * x + 3 * x + 2,
    rhs: (b) => b,
    rhsLabel: (b) => `c = ${fmt(b, 2)}`,
    bMin: -2, bMax: 6, bStep: 0.1, b: 0,
    xMin: -2, xMax: 5, yMin: -3, yMax: 5,
    explanation: 'Slide $c$ to see where the parabola crosses the line $y = c$. Two crossings = two solutions, one = a double root, zero = no real solutions.',
  },
};

const tex = (s) => {
  try { return katex.renderToString(s, { throwOnError: false }); }
  catch { return s; }
};
function fmt(n, d = 2) { return parseFloat(Number(n).toFixed(d)).toString(); }

function makeProj(xMin, xMax, yMin, yMax) {
  const w = SVG_W - PAD.left - PAD.right;
  const h = SVG_H - PAD.top - PAD.bottom;
  return {
    sx: (x) => PAD.left + ((x - xMin) / (xMax - xMin)) * w,
    sy: (y) => SVG_H - PAD.bottom - ((y - yMin) / (yMax - yMin)) * h,
  };
}

function axes(xMin, xMax, yMin, yMax, proj) {
  let svg = '';
  // Light grid.
  const dxGrid = Math.max(1, Math.round((xMax - xMin) / 12));
  for (let x = Math.ceil(xMin); x <= xMax; x += dxGrid) {
    const X = proj.sx(x);
    svg += `<line x1="${X}" y1="${PAD.top}" x2="${X}" y2="${SVG_H - PAD.bottom}" stroke="${x === 0 ? COLORS.axis : COLORS.grid}" stroke-width="${x === 0 ? 1.5 : 1}"/>`;
  }
  for (let y = Math.ceil(yMin); y <= yMax; y++) {
    const Y = proj.sy(y);
    svg += `<line x1="${PAD.left}" y1="${Y}" x2="${SVG_W - PAD.right}" y2="${Y}" stroke="${y === 0 ? COLORS.axis : COLORS.grid}" stroke-width="${y === 0 ? 1.5 : 1}"/>`;
  }
  // Tick labels along x — at multiples of π/2 if range looks trig-like.
  const trigLike = Math.abs(xMax - xMin - 4 * Math.PI) < 0.5;
  if (trigLike) {
    const ticks = [
      { v: -2 * Math.PI, label: '-2π' },
      { v: -Math.PI, label: '-π' },
      { v: 0, label: '0' },
      { v: Math.PI, label: 'π' },
      { v: 2 * Math.PI, label: '2π' },
    ];
    for (const t of ticks) {
      const X = proj.sx(t.v);
      svg += `<text x="${X}" y="${proj.sy(0) + 16}" font-size="12" fill="${COLORS.textMuted}" text-anchor="middle">${t.label}</text>`;
    }
  } else {
    for (let x = Math.ceil(xMin); x <= xMax; x += dxGrid) {
      if (x === 0) continue;
      svg += `<text x="${proj.sx(x)}" y="${proj.sy(0) + 14}" font-size="11" fill="${COLORS.textMuted}" text-anchor="middle">${x}</text>`;
    }
  }
  for (let y = Math.ceil(yMin); y <= yMax; y++) {
    if (y === 0) continue;
    svg += `<text x="${proj.sx(0) - 6}" y="${proj.sy(y) + 4}" font-size="11" fill="${COLORS.textMuted}" text-anchor="end">${y}</text>`;
  }
  return svg;
}

function curvePath(fn, xMin, xMax, yMin, yMax, proj) {
  const N = 500;
  let d = '';
  let inPath = false;
  for (let i = 0; i <= N; i++) {
    const x = xMin + (i / N) * (xMax - xMin);
    const y = fn(x);
    if (!Number.isFinite(y) || y < yMin - 0.5 || y > yMax + 0.5) { inPath = false; continue; }
    d += (inPath ? 'L' : 'M') + `${proj.sx(x)} ${proj.sy(y)} `;
    inPath = true;
  }
  return d;
}

// Numerically find intersections of f(x) = g(x) on [xMin, xMax].
// Uses sign-change detection + bisection.
function findIntersections(f, g, xMin, xMax) {
  const N = 2000;
  const xs = [];
  let prevX = xMin;
  let prevDiff = f(xMin) - g(xMin);
  for (let i = 1; i <= N; i++) {
    const x = xMin + (i / N) * (xMax - xMin);
    const diff = f(x) - g(x);
    if (!Number.isFinite(prevDiff) || !Number.isFinite(diff)) {
      prevX = x; prevDiff = diff; continue;
    }
    if (prevDiff === 0) {
      xs.push(prevX);
    } else if (prevDiff * diff < 0) {
      // Bisect.
      let lo = prevX, hi = x;
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2;
        const dm = f(mid) - g(mid);
        if (dm === 0 || !Number.isFinite(dm)) { lo = mid; break; }
        if (prevDiff * dm < 0) hi = mid; else { lo = mid; prevDiff = dm; }
      }
      xs.push((lo + hi) / 2);
      prevDiff = f(x) - g(x);
    } else {
      prevDiff = diff;
    }
    prevX = x;
  }
  // Deduplicate close roots.
  const out = [];
  for (const x of xs) {
    if (out.length === 0 || Math.abs(x - out[out.length - 1]) > 1e-3) out.push(x);
  }
  return out;
}

const DEFAULTS = { preset: 'sqrt-sin' };

export function mountParametricEquation(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const preset = PRESETS[cfg.preset] || PRESETS['sqrt-sin'];
  // Allow per-instance overrides on window + slider bounds.
  const view = {
    xMin: cfg.xMin ?? preset.xMin,
    xMax: cfg.xMax ?? preset.xMax,
    yMin: cfg.yMin ?? preset.yMin,
    yMax: cfg.yMax ?? preset.yMax,
  };
  const state = {
    b: cfg.b ?? preset.b,
  };
  const proj = makeProj(view.xMin, view.xMax, view.yMin, view.yMax);

  const showSlider = !preset.isRhsLine;

  target.innerHTML = `
    <div class="pe-wrap">
      <svg class="pe-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Parametric equation visualizer">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-pe-grid></g>
        <g data-pe-lhs></g>
        <g data-pe-rhs></g>
        <g data-pe-pts></g>
        <g data-pe-legend></g>
      </svg>
      <div class="pe-controls">
        <div class="pe-eq" data-pe-eq></div>
        ${showSlider ? `
        <div class="pe-row">
          <label data-pe-blabel>b</label>
          <input type="range" data-pe-b min="${preset.bMin}" max="${preset.bMax}" step="${preset.bStep}" value="${state.b}"/>
          <span class="val" data-pe-bval>${fmt(state.b, 2)}</span>
        </div>` : ''}
        <div class="pe-readout" data-pe-readout></div>
        <div class="pe-note" data-pe-note></div>
      </div>
    </div>
  `;

  const gGrid = target.querySelector('[data-pe-grid]');
  const gLhs = target.querySelector('[data-pe-lhs]');
  const gRhs = target.querySelector('[data-pe-rhs]');
  const gPts = target.querySelector('[data-pe-pts]');
  const gLegend = target.querySelector('[data-pe-legend]');
  const eqBox = target.querySelector('[data-pe-eq]');
  const readout = target.querySelector('[data-pe-readout]');
  const note = target.querySelector('[data-pe-note]');

  gGrid.innerHTML = axes(view.xMin, view.xMax, view.yMin, view.yMax, proj);
  eqBox.innerHTML = tex(preset.label);
  note.innerHTML = preset.explanation.replace(/\$([^$]+)\$/g, (_, t) => tex(t));

  // Legend swatches (top right of plot).
  const legX = SVG_W - 200, legY = PAD.top + 6;
  gLegend.innerHTML = `
    <rect x="${legX}" y="${legY}" width="190" height="44" fill="white" stroke="${COLORS.grid}" stroke-width="1" rx="4"/>
    <line x1="${legX + 10}" y1="${legY + 14}" x2="${legX + 36}" y2="${legY + 14}" stroke="${COLORS.curve}" stroke-width="2.5"/>
    <text x="${legX + 42}" y="${legY + 18}" font-size="12" fill="${COLORS.text}">y = LHS</text>
    <line x1="${legX + 10}" y1="${legY + 32}" x2="${legX + 36}" y2="${legY + 32}" stroke="${COLORS.line}" stroke-width="2.5"/>
    <text x="${legX + 42}" y="${legY + 36}" font-size="12" fill="${COLORS.text}">y = RHS</text>
  `;

  function render() {
    const fLhs = preset.lhs;
    const fRhs = preset.isRhsLine
      ? preset.rhs
      : () => preset.rhs(state.b);
    gLhs.innerHTML = `<path d="${curvePath(fLhs, view.xMin, view.xMax, view.yMin, view.yMax, proj)}" fill="none" stroke="${COLORS.curve}" stroke-width="2.5"/>`;
    gRhs.innerHTML = `<path d="${curvePath(fRhs, view.xMin, view.xMax, view.yMin, view.yMax, proj)}" fill="none" stroke="${COLORS.line}" stroke-width="2.5" stroke-dasharray="${preset.isRhsLine ? '0' : '5 4'}"/>`;

    const roots = findIntersections(fLhs, fRhs, view.xMin, view.xMax);
    let ptsSvg = '';
    for (const r of roots) {
      const y = fLhs(r);
      if (!Number.isFinite(y)) continue;
      ptsSvg += `<circle cx="${proj.sx(r)}" cy="${proj.sy(y)}" r="6" fill="${COLORS.intersection}" stroke="${COLORS.intersectionEdge}" stroke-width="2"/>`;
    }
    gPts.innerHTML = ptsSvg;

    let summary;
    if (roots.length === 0) summary = `<strong>0</strong> solutions in view`;
    else if (roots.length <= 6) summary = `<strong>${roots.length}</strong> solution${roots.length === 1 ? '' : 's'} at $x \\approx ${roots.map((r) => fmt(r, 3)).join(', ')}$`;
    else summary = `<strong>${roots.length}</strong> solutions in view (periodic — infinitely many overall)`;

    let rhsValueLine = '';
    if (preset.rhsLabel && !preset.isRhsLine) {
      rhsValueLine = `<div>RHS: $${preset.rhsLabel(state.b)}$</div>`;
    }
    readout.innerHTML = (`${rhsValueLine}<div>${summary}</div>`).replace(/\$([^$]+)\$/g, (_, t) => tex(t));
  }

  render();

  const bSlider = target.querySelector('[data-pe-b]');
  if (bSlider) {
    bSlider.addEventListener('input', (e) => {
      state.b = parseFloat(e.target.value);
      target.querySelector('[data-pe-bval]').textContent = fmt(state.b, 2);
      render();
    });
  }
}
