import katex from 'katex';

// Osculating-circle widget (Thompson "Calculus Made Easy", Ch 12).
//
// Drag a point P along a curve y = f(x). At every position, the widget
// draws the OSCULATING CIRCLE — the unique circle that kisses the curve
// at P with matching slope AND matching second derivative. Its radius is
//
//   R(x) = (1 + f'(x)^2)^{3/2} / |f''(x)|
//
// and curvature is κ = 1/R. The center of the circle lies along the
// normal at P, on the side the curve is bending toward (sign of f'').
//
// Pedagogical payoff:
//   - f''(x) > 0 → curve bends UP → circle lies ABOVE P.
//   - f''(x) < 0 → curve bends DOWN → circle lies BELOW P.
//   - At an inflection point, f'' = 0 → R → ∞ (the "circle" is a straight line).
//   - For a circle of radius r, R = r everywhere (the osculating circle IS
//     the circle itself — the natural sanity check).
//
// Config:
//   curve   one of 'parabola', 'sine', 'cubic', 'circle-top' (default 'parabola')
//   x       starting x-position (default = curve's natural starting point)

const SVG_W = 720;
const SVG_H = 520;

const PAD_L = 50;
const PAD_R = 30;
const PAD_T = 30;
const PAD_B = 50;

const COLORS = {
  bg: '#fafbfc',
  panel: '#ffffff',
  axis: '#94a3b8',
  axisFaint: '#e2e8f0',
  curve: '#1e40af',
  circle: '#dc2626',
  circleFill: 'rgba(220, 38, 38, 0.07)',
  point: '#0f172a',
  normal: '#94a3b8',
  text: '#0f172a',
  textMuted: '#64748b',
};

const CURVES = {
  'parabola': {
    label: 'Parabola: y = x² / 2',
    formula: 'y = \\tfrac{1}{2} x^2',
    f:    (x) => 0.5 * x * x,
    fp:   (x) => x,
    fpp:  ()  => 1,
    xMin: -3, xMax: 3,
    yMin: -0.5, yMax: 5,
    xStart: 1,
    note: 'Constant f\'\'(x) = 1, so the curvature is largest at x = 0 (where f\' = 0) and shrinks as the curve grows steeper. Try sliding to large |x|: the osculating circle balloons.'
  },
  'sine': {
    label: 'Sine: y = sin(x)',
    formula: 'y = \\sin x',
    f:    (x) => Math.sin(x),
    fp:   (x) => Math.cos(x),
    fpp:  (x) => -Math.sin(x),
    xMin: -1, xMax: 7,
    yMin: -2, yMax: 2,
    xStart: Math.PI / 2,
    note: 'At the peak (x = π/2): f\' = 0, f\'\' = -1 → R = 1, and the circle sits BELOW the curve (since it bends DOWN). At zero crossings (x = 0, π): f\'\' = 0 → R = ∞ (inflection points).'
  },
  'cubic': {
    label: 'Cubic: y = x³ / 3',
    formula: 'y = \\tfrac{1}{3} x^3',
    f:    (x) => x * x * x / 3,
    fp:   (x) => x * x,
    fpp:  (x) => 2 * x,
    xMin: -2.2, xMax: 2.2,
    yMin: -3, yMax: 3,
    xStart: 1,
    note: 'f\'\'(x) = 2x changes sign at x = 0 — the inflection point. Slide through x = 0 and watch the osculating circle FLIP from one side of the curve to the other. R → ∞ exactly at the flip.'
  },
  'circle-top': {
    label: 'Top of circle: y = √(4 − x²)',
    formula: 'y = \\sqrt{4 - x^2}',
    f:    (x) => Math.sqrt(Math.max(0, 4 - x * x)),
    fp:   (x) => -x / Math.sqrt(Math.max(1e-6, 4 - x * x)),
    fpp:  (x) => -4 / Math.pow(Math.max(1e-6, 4 - x * x), 1.5),
    xMin: -1.95, xMax: 1.95,
    yMin: -0.5, yMax: 3,
    xStart: 0,
    note: 'The top half of a circle of radius 2. Sanity check: R should equal 2 at EVERY point. Drag the slider — R stays locked at 2.0 ✓.'
  },
};

const DEFAULTS = { curve: 'parabola' };

const tex = (s) => {
  try { return katex.renderToString(s, { throwOnError: false }); }
  catch { return s; }
};

const fmt = (n, dp = 2) => {
  const v = Number(n);
  if (!isFinite(v)) return '∞';
  if (Math.abs(v) < 1e-10) return '0';
  if (Math.abs(v) > 99) return v.toFixed(0);
  return parseFloat(v.toFixed(dp)).toString();
};

function radiusOfCurvature(fp, fpp) {
  if (Math.abs(fpp) < 1e-9) return Infinity;
  return Math.pow(1 + fp * fp, 1.5) / Math.abs(fpp);
}

function makeProj(c) {
  const xL = PAD_L, xR = SVG_W - PAD_R;
  const yT = PAD_T, yB = SVG_H - PAD_B;
  return {
    sx: (x) => xL + ((x - c.xMin) / (c.xMax - c.xMin)) * (xR - xL),
    sy: (y) => yB - ((y - c.yMin) / (c.yMax - c.yMin)) * (yB - yT),
    xL, xR, yT, yB,
  };
}

function gridAndAxes(c, proj) {
  let svg = '';
  // panel background
  svg += `<rect x="${proj.xL}" y="${proj.yT}" width="${proj.xR - proj.xL}" height="${proj.yB - proj.yT}" fill="${COLORS.panel}" stroke="${COLORS.axisFaint}"/>`;
  // integer gridlines
  for (let xi = Math.ceil(c.xMin); xi <= Math.floor(c.xMax); xi++) {
    const X = proj.sx(xi);
    svg += `<line x1="${X}" y1="${proj.yT}" x2="${X}" y2="${proj.yB}" stroke="${COLORS.axisFaint}" stroke-width="1"/>`;
    if (xi !== 0) svg += `<text x="${X}" y="${proj.yB + 14}" font-size="10" fill="${COLORS.textMuted}" text-anchor="middle">${xi}</text>`;
  }
  for (let yi = Math.ceil(c.yMin); yi <= Math.floor(c.yMax); yi++) {
    const Y = proj.sy(yi);
    svg += `<line x1="${proj.xL}" y1="${Y}" x2="${proj.xR}" y2="${Y}" stroke="${COLORS.axisFaint}" stroke-width="1"/>`;
    if (yi !== 0) svg += `<text x="${proj.xL - 6}" y="${Y + 4}" font-size="10" fill="${COLORS.textMuted}" text-anchor="end">${yi}</text>`;
  }
  // axes (y=0, x=0) if in range
  if (c.yMin <= 0 && c.yMax >= 0) {
    const Y = proj.sy(0);
    svg += `<line x1="${proj.xL}" y1="${Y}" x2="${proj.xR}" y2="${Y}" stroke="${COLORS.axis}" stroke-width="1.5"/>`;
  }
  if (c.xMin <= 0 && c.xMax >= 0) {
    const X = proj.sx(0);
    svg += `<line x1="${X}" y1="${proj.yT}" x2="${X}" y2="${proj.yB}" stroke="${COLORS.axis}" stroke-width="1.5"/>`;
  }
  return svg;
}

function curvePath(c, proj) {
  const samples = 240;
  let path = '';
  let started = false;
  for (let i = 0; i <= samples; i++) {
    const x = c.xMin + (c.xMax - c.xMin) * i / samples;
    let y;
    try { y = c.f(x); } catch { continue; }
    if (!isFinite(y) || y < c.yMin - 1 || y > c.yMax + 1) {
      started = false;
      continue;
    }
    path += `${started ? 'L' : 'M'} ${proj.sx(x).toFixed(2)} ${proj.sy(y).toFixed(2)} `;
    started = true;
  }
  return `<path d="${path}" stroke="${COLORS.curve}" stroke-width="2.6" fill="none"/>`;
}

function osculatingSvg(c, proj, x) {
  const y = c.f(x);
  const fp = c.fp(x);
  const fpp = c.fpp(x);
  const R = radiusOfCurvature(fp, fpp);
  // unit normal direction depends on sign of fpp:
  //   normal vector to the curve = (-fp, 1) / sqrt(1+fp^2), pointing UP for fp=0
  //   when fpp > 0, curve bends up — center is in normal direction
  //   when fpp < 0, curve bends down — center is opposite to normal
  const norm = Math.sqrt(1 + fp * fp);
  const sign = Math.sign(fpp) || 1;
  const nx = -fp / norm * sign;
  const ny = 1 / norm * sign;
  // center in data coords
  const Cx = x + R * nx;
  const Cy = y + R * ny;

  let svg = '';

  // Compute pixel radius — width of an x-unit times R isn't quite right
  // because x and y have different scales. We project center, then compute
  // pixel distance from point to center.
  const pX = proj.sx(x), pY = proj.sy(y);
  const cX = isFinite(R) ? proj.sx(Cx) : 0;
  const cY = isFinite(R) ? proj.sy(Cy) : 0;
  const pixelR = isFinite(R) ? Math.hypot(cX - pX, cY - pY) : 0;

  if (isFinite(R) && pixelR < 4000) {
    // Osculating circle
    svg += `<circle cx="${cX.toFixed(2)}" cy="${cY.toFixed(2)}" r="${pixelR.toFixed(2)}" fill="${COLORS.circleFill}" stroke="${COLORS.circle}" stroke-width="2"/>`;
    // Radius line from P to center
    svg += `<line x1="${pX}" y1="${pY}" x2="${cX.toFixed(2)}" y2="${cY.toFixed(2)}" stroke="${COLORS.normal}" stroke-width="1" stroke-dasharray="4 3"/>`;
    // Center dot
    svg += `<circle cx="${cX.toFixed(2)}" cy="${cY.toFixed(2)}" r="3" fill="${COLORS.circle}"/>`;
  } else {
    // Near an inflection — show the tangent line instead, labelled R = ∞
    const tx = 1 / norm, ty = fp / norm;
    const L = 200;
    svg += `<line x1="${pX - L * tx}" y1="${pY + L * ty}" x2="${pX + L * tx}" y2="${pY - L * ty}" stroke="${COLORS.circle}" stroke-width="2" stroke-dasharray="6 4"/>`;
  }

  // Point P (drawn last, on top)
  svg += `<circle cx="${pX}" cy="${pY}" r="6" fill="${COLORS.point}" stroke="white" stroke-width="2"/>`;
  svg += `<text x="${pX + 10}" y="${pY - 8}" font-size="12" font-weight="700" fill="${COLORS.point}">P</text>`;

  return { svg, R, fp, fpp, y };
}

export function mountOsculatingCircle(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const startCurve = CURVES[cfg.curve] ? cfg.curve : 'parabola';
  const state = {
    curve: startCurve,
    x: cfg.x != null ? cfg.x : CURVES[startCurve].xStart,
  };

  const curveOpts = Object.entries(CURVES)
    .map(([k, p]) => `<option value="${k}"${state.curve === k ? ' selected' : ''}>${p.label}</option>`)
    .join('');

  target.innerHTML = `
    <div class="osc-wrap">
      <svg class="osc-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Osculating circle">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-osc-grid></g>
        <g data-osc-curve></g>
        <g data-osc-overlay></g>
      </svg>
      <div class="osc-controls">
        <div class="osc-row">
          <label>curve</label>
          <select data-osc-curve-select>${curveOpts}</select>
        </div>
        <div class="osc-row">
          <label>position $x$</label>
          <input type="range" data-osc-x min="0" max="1" step="0.001" value="0"/>
          <span class="val" data-osc-xval>x = 0</span>
        </div>
        <div class="osc-formula" data-osc-formula></div>
        <div class="osc-readout" data-osc-readout></div>
        <div class="osc-note" data-osc-note></div>
      </div>
    </div>
  `;

  const g = (sel) => target.querySelector(sel);
  target.querySelectorAll('.osc-controls label').forEach((el) => {
    el.innerHTML = el.innerHTML.replace(/\$([^$]+)\$/g, (_, t) => tex(t));
  });

  let proj = makeProj(CURVES[state.curve]);

  function setupSliderForCurve() {
    const c = CURVES[state.curve];
    const xSlider = g('[data-osc-x]');
    xSlider.min = c.xMin;
    xSlider.max = c.xMax;
    xSlider.step = ((c.xMax - c.xMin) / 600).toFixed(5);
    xSlider.value = state.x;
    g('[data-osc-formula]').innerHTML = tex(c.formula);
  }

  function redraw() {
    const c = CURVES[state.curve];
    proj = makeProj(c);
    g('[data-osc-grid]').innerHTML = gridAndAxes(c, proj);
    g('[data-osc-curve]').innerHTML = curvePath(c, proj);
    const { svg, R, fp, fpp, y } = osculatingSvg(c, proj, state.x);
    g('[data-osc-overlay]').innerHTML = svg;
    const kappa = isFinite(R) && R > 0 ? 1 / R : 0;
    g('[data-osc-xval]').textContent = `x = ${fmt(state.x)}`;
    g('[data-osc-readout]').innerHTML =
      `<span class="r-pt">P = (${fmt(state.x)}, ${fmt(y)})</span>` +
      `<span class="r-fp">f'(x) = ${fmt(fp)}</span>` +
      `<span class="r-fpp">f''(x) = ${fmt(fpp)}</span>` +
      `<span class="r-R">R = ${isFinite(R) ? fmt(R, 3) : '∞'}</span>` +
      `<span class="r-k">κ = ${fmt(kappa, 4)}</span>`;
    g('[data-osc-note]').textContent = c.note;
  }

  setupSliderForCurve();
  redraw();

  g('[data-osc-curve-select]').addEventListener('change', (e) => {
    state.curve = e.target.value;
    state.x = CURVES[state.curve].xStart;
    setupSliderForCurve();
    redraw();
  });

  g('[data-osc-x]').addEventListener('input', (e) => {
    state.x = parseFloat(e.target.value);
    redraw();
  });
}
