import katex from 'katex';

// Growing-square widget.
//
// Inspired by Thompson's "Calculus Made Easy" (Chapter IV). The widget shows
// a square of side x. When x grows by a little bit dx, the new square has
// three new pieces:
//   - a strip of area x·dx along the right
//   - a strip of area x·dx along the top
//   - a tiny corner of area (dx)²
//
// The two strips together = 2·x·dx (the "first-order" growth).
// The corner (dx)² is the "second-order" piece, vanishingly small as dx → 0.
//
// Pedagogical payoff: d(x²)/dx = 2x, derived geometrically and *visibly*,
// because the (dx)² corner is provably negligible compared to 2·x·dx whenever
// dx is small.
//
// Config (all optional):
//   x       starting side length (default 4)
//   dx      starting "little bit" (default 0.8)
//   xRange  slider range for x (default [1, 6])
//   dxRange slider range for dx (default [0.01, 1.2])

const SVG_W = 560;
const SVG_H = 460;
const PAD = 36;

const COLORS = {
  bg: '#fafbfc',
  base: '#bfdbfe',
  baseEdge: '#1d4ed8',
  strip: '#fde68a',
  stripEdge: '#b45309',
  corner: '#fca5a5',
  cornerEdge: '#b91c1c',
  axis: '#94a3b8',
  axisFaint: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
};

const DEFAULTS = {
  x: 4,
  dx: 0.8,
  xRange: [1, 6],
  dxRange: [0.01, 1.2],
};

const tex = (s) => {
  try { return katex.renderToString(s, { throwOnError: false }); }
  catch { return s; }
};

const fmt = (n, dp = 3) => {
  const v = Number(n);
  if (Math.abs(v) < 1e-10) return '0';
  return parseFloat(v.toFixed(dp)).toString();
};

function makeProj(unitMax) {
  // Project a square in coordinate space [0, unitMax] into the SVG box.
  const sideSvg = Math.min(SVG_W, SVG_H) - 2 * PAD;
  const scale = sideSvg / unitMax;
  return {
    sx: (u) => PAD + u * scale,
    sy: (u) => SVG_H - PAD - u * scale,
    scale,
  };
}

function gridAxes(unitMax, proj) {
  let svg = '';
  for (let k = 0; k <= Math.ceil(unitMax); k++) {
    const X = proj.sx(k);
    const Y = proj.sy(k);
    const isAxis = k === 0;
    svg += `<line x1="${X}" y1="${proj.sy(0)}" x2="${X}" y2="${proj.sy(unitMax)}" stroke="${isAxis ? COLORS.axis : COLORS.axisFaint}" stroke-width="${isAxis ? 1.5 : 1}"/>`;
    svg += `<line x1="${proj.sx(0)}" y1="${Y}" x2="${proj.sx(unitMax)}" y2="${Y}" stroke="${isAxis ? COLORS.axis : COLORS.axisFaint}" stroke-width="${isAxis ? 1.5 : 1}"/>`;
  }
  // Tick labels along x-axis
  for (let k = 1; k <= Math.ceil(unitMax); k++) {
    svg += `<text x="${proj.sx(k)}" y="${proj.sy(0) + 16}" font-size="11" fill="${COLORS.textMuted}" text-anchor="middle">${k}</text>`;
  }
  return svg;
}

function rect(x, y, w, h, fill, stroke, dashed = false) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"${dashed ? ' stroke-dasharray="4 3"' : ''}/>`;
}

function render(state, gShapes, gLabels, readoutBox, cfg, proj) {
  const x = state.x;
  const dx = state.dx;
  const dropCorner = state.dropCorner;

  // SVG-space corners of the base square [0, x] × [0, x]
  const baseX0 = proj.sx(0);
  const baseY0 = proj.sy(x);
  const baseW = x * proj.scale;
  const baseH = x * proj.scale;

  // Strips of width dx (in math units), along top and right of the square.
  const stripPx = dx * proj.scale;

  // Right strip
  const rightX = proj.sx(x);
  const rightY = proj.sy(x);
  const rightW = stripPx;
  const rightH = x * proj.scale;

  // Top strip
  const topX = proj.sx(0);
  const topY = proj.sy(x + dx);
  const topW = x * proj.scale;
  const topH = stripPx;

  // Corner (dx × dx)
  const cornerX = proj.sx(x);
  const cornerY = proj.sy(x + dx);

  let shapes = '';
  // Base square
  shapes += rect(baseX0, baseY0, baseW, baseH, COLORS.base, COLORS.baseEdge);
  // Two strips (always shown — they ARE the derivative)
  shapes += rect(rightX, rightY, rightW, rightH, COLORS.strip, COLORS.stripEdge);
  shapes += rect(topX, topY, topW, topH, COLORS.strip, COLORS.stripEdge);
  // Corner — dashed if dropped, solid otherwise
  shapes += rect(cornerX, cornerY, stripPx, stripPx, dropCorner ? 'rgba(0,0,0,0)' : COLORS.corner, COLORS.cornerEdge, dropCorner);

  // Outline the *full* (x + dx) square in a thicker dashed line for orientation
  const fullX = proj.sx(0);
  const fullY = proj.sy(x + dx);
  const fullSide = (x + dx) * proj.scale;
  shapes += `<rect x="${fullX}" y="${fullY}" width="${fullSide}" height="${fullSide}" fill="none" stroke="${COLORS.baseEdge}" stroke-width="1.2" stroke-dasharray="2 4" opacity="0.7"/>`;

  gShapes.innerHTML = shapes;

  // Labels in SVG (positioned over the regions)
  let labels = '';
  // Base square label: x² at center of base
  labels += `<text x="${baseX0 + baseW / 2}" y="${baseY0 + baseH / 2 + 5}" font-size="18" fill="${COLORS.baseEdge}" text-anchor="middle" font-weight="700">x²</text>`;
  // Right strip: "x · dx" if there's room
  if (stripPx > 22) {
    labels += `<text x="${rightX + rightW / 2}" y="${rightY + rightH / 2 + 4}" font-size="11" fill="${COLORS.stripEdge}" text-anchor="middle" font-weight="600">x·dx</text>`;
  }
  // Top strip
  if (stripPx > 22) {
    labels += `<text x="${topX + topW / 2}" y="${topY + topH / 2 + 4}" font-size="11" fill="${COLORS.stripEdge}" text-anchor="middle" font-weight="600">x·dx</text>`;
  }
  // Corner label
  if (stripPx > 30) {
    labels += `<text x="${cornerX + stripPx / 2}" y="${cornerY + stripPx / 2 + 4}" font-size="10" fill="${COLORS.cornerEdge}" text-anchor="middle" font-weight="700">(dx)²</text>`;
  }
  // Side measure labels along bottom edge
  labels += `<text x="${baseX0 + baseW / 2}" y="${proj.sy(0) + 32}" font-size="12" fill="${COLORS.text}" text-anchor="middle" font-weight="600">x = ${fmt(x, 2)}</text>`;
  // dx bracket along bottom-right
  labels += `<line x1="${rightX}" y1="${proj.sy(0) + 6}" x2="${rightX + rightW}" y2="${proj.sy(0) + 6}" stroke="${COLORS.cornerEdge}" stroke-width="1.5"/>`;
  labels += `<text x="${rightX + rightW / 2}" y="${proj.sy(0) + 32}" font-size="12" fill="${COLORS.cornerEdge}" text-anchor="middle" font-weight="600">dx = ${fmt(dx, 2)}</text>`;

  gLabels.innerHTML = labels;

  // Numerical readout box
  const xSq = x * x;
  const twoXdx = 2 * x * dx;
  const dxSq = dx * dx;
  const growth = twoXdx + dxSq;
  const ratio = twoXdx === 0 ? 0 : dxSq / twoXdx;

  let readout = '';
  readout += `<div class="gs-row"><span>start area</span><strong>$x^2 = ${fmt(xSq, 2)}$</strong></div>`;
  readout += `<div class="gs-row"><span>two strips</span><strong style="color:${COLORS.stripEdge}">$2\\,x\\,dx = ${fmt(twoXdx, 3)}$</strong></div>`;
  readout += `<div class="gs-row"><span>corner</span><strong style="color:${COLORS.cornerEdge}">$(dx)^2 = ${fmt(dxSq, 4)}$</strong></div>`;
  readout += `<div class="gs-row gs-divider"><span>total growth</span><strong>$2\\,x\\,dx + (dx)^2 = ${fmt(growth, 4)}$</strong></div>`;
  readout += `<div class="gs-row"><span>corner ÷ strips</span><strong>${(ratio * 100).toFixed(2)}%</strong></div>`;
  readout += `<div class="gs-note">As $dx$ shrinks, the corner's share shrinks toward $0$. Drop it — what's left is $\\dfrac{d(x^2)}{dx} = 2x$.</div>`;

  readoutBox.innerHTML = readout.replace(/\$([^$]+)\$/g, (_, t) => tex(t));
}

export function mountGrowingSquare(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = { x: cfg.x, dx: cfg.dx, dropCorner: false };

  target.innerHTML = `
    <div class="gs-wrap">
      <svg class="gs-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Growing square">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-gs-grid></g>
        <g data-gs-shapes></g>
        <g data-gs-labels></g>
      </svg>
      <div class="gs-controls">
        <div class="gs-row">
          <label>side $x$</label>
          <input type="range" data-gs-x min="${cfg.xRange[0]}" max="${cfg.xRange[1]}" step="0.1" value="${state.x}"/>
          <span class="val" data-gs-xval>${fmt(state.x, 2)}</span>
        </div>
        <div class="gs-row">
          <label>little bit $dx$</label>
          <input type="range" data-gs-dx min="${cfg.dxRange[0]}" max="${cfg.dxRange[1]}" step="0.01" value="${state.dx}"/>
          <span class="val" data-gs-dxval>${fmt(state.dx, 2)}</span>
        </div>
        <div class="gs-row">
          <label><input type="checkbox" data-gs-drop/> drop the $(dx)^2$ corner</label>
        </div>
        <div class="gs-readout" data-gs-readout></div>
      </div>
    </div>
  `;

  const gGrid = target.querySelector('[data-gs-grid]');
  const gShapes = target.querySelector('[data-gs-shapes]');
  const gLabels = target.querySelector('[data-gs-labels]');
  const readoutBox = target.querySelector('[data-gs-readout]');

  // Render KaTeX inside label tags
  target.querySelectorAll('.gs-controls label').forEach((el) => {
    el.innerHTML = el.innerHTML.replace(/\$([^$]+)\$/g, (_, t) => tex(t));
  });

  const unitMax = cfg.xRange[1] + cfg.dxRange[1] + 0.5;
  const proj = makeProj(unitMax);
  gGrid.innerHTML = gridAxes(unitMax, proj);

  function redraw() { render(state, gShapes, gLabels, readoutBox, cfg, proj); }
  redraw();

  target.querySelector('[data-gs-x]').addEventListener('input', (e) => {
    state.x = parseFloat(e.target.value);
    target.querySelector('[data-gs-xval]').textContent = fmt(state.x, 2);
    redraw();
  });
  target.querySelector('[data-gs-dx]').addEventListener('input', (e) => {
    state.dx = parseFloat(e.target.value);
    target.querySelector('[data-gs-dxval]').textContent = fmt(state.dx, 2);
    redraw();
  });
  target.querySelector('[data-gs-drop]').addEventListener('change', (e) => {
    state.dropCorner = e.target.checked;
    redraw();
  });
}
