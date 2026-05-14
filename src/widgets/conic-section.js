import katex from 'katex';

// Conic-section explorer.
//
// One widget, four conic types: circle, ellipse, parabola, hyperbola.
// For each, sliders for the defining parameters and overlays for the
// key features (center, foci, vertices, directrix, asymptotes).
//
// Plus a "slice the cone" intuition panel: a cartoon double-cone with a
// slicing plane that tilts based on the chosen conic, suggesting how
// each curve emerges as a cross-section.
//
// Config:
//   mode:    'circle' (default) | 'ellipse' | 'parabola' | 'hyperbola'
//   Various params per mode (a, b, h, k, p) — defaults sensible.

const SVG_W = 560;
const SVG_H = 440;
const SCALE = 28;
const ORIGIN = { x: SVG_W / 2, y: SVG_H / 2 + 20 };

const COLORS = {
  bg: '#fafbfc',
  axis: '#94a3b8',
  grid: '#e2e8f0',
  curve: '#4f46e5',
  focus: '#dc2626',
  vertex: '#16a34a',
  center: '#1e293b',
  directrix: '#f59e0b',
  asymptote: '#7c3aed',
  text: '#0f172a',
  textMuted: '#64748b',
  cone: '#cbd5e1',
  conePlane: 'rgba(220, 38, 38, 0.35)',
  conePlaneEdge: '#dc2626',
};

const DEFAULTS = {
  mode: 'circle',
  r: 3,
  a: 4, b: 2,
  p: 1,
  h: 0, k: 0,
};

const sx = (x) => ORIGIN.x + x * SCALE;
const sy = (y) => ORIGIN.y - y * SCALE;

function fmt(n, d = 2) {
  if (!Number.isFinite(n)) return '–';
  if (Math.abs(n) < 1e-10) return '0';
  return parseFloat(n.toFixed(d)).toString();
}

function drawGrid() {
  let svg = '';
  for (let x = -10; x <= 10; x++) {
    svg += `<line x1="${sx(x)}" y1="0" x2="${sx(x)}" y2="${SVG_H}" stroke="${x === 0 ? COLORS.axis : COLORS.grid}" stroke-width="${x === 0 ? 1.5 : 0.6}"/>`;
  }
  for (let y = -7; y <= 7; y++) {
    svg += `<line x1="0" y1="${sy(y)}" x2="${SVG_W}" y2="${sy(y)}" stroke="${y === 0 ? COLORS.axis : COLORS.grid}" stroke-width="${y === 0 ? 1.5 : 0.6}"/>`;
  }
  for (let x = -8; x <= 8; x += 2) {
    if (x === 0) continue;
    svg += `<text x="${sx(x)}" y="${sy(0) + 14}" font-size="11" fill="${COLORS.textMuted}" text-anchor="middle">${x}</text>`;
  }
  for (let y = -6; y <= 6; y += 2) {
    if (y === 0) continue;
    svg += `<text x="${sx(0) - 6}" y="${sy(y) + 4}" font-size="11" fill="${COLORS.textMuted}" text-anchor="end">${y}</text>`;
  }
  return svg;
}

function drawCircle(h, k, r) {
  let svg = '';
  svg += `<circle cx="${sx(h)}" cy="${sy(k)}" r="${r * SCALE}" fill="none" stroke="${COLORS.curve}" stroke-width="2.5"/>`;
  svg += `<circle cx="${sx(h)}" cy="${sy(k)}" r="5" fill="${COLORS.center}"/>`;
  svg += `<text x="${sx(h) + 8}" y="${sy(k) - 6}" font-size="12" fill="${COLORS.center}" font-weight="700">C</text>`;
  // Radius indicator.
  svg += `<line x1="${sx(h)}" y1="${sy(k)}" x2="${sx(h + r)}" y2="${sy(k)}" stroke="${COLORS.vertex}" stroke-width="2" stroke-dasharray="4 3"/>`;
  svg += `<text x="${sx(h + r / 2)}" y="${sy(k) - 6}" font-size="12" fill="${COLORS.vertex}" font-weight="700">r</text>`;
  return svg;
}

function drawEllipse(h, k, a, b) {
  let svg = '';
  svg += `<ellipse cx="${sx(h)}" cy="${sy(k)}" rx="${a * SCALE}" ry="${b * SCALE}" fill="none" stroke="${COLORS.curve}" stroke-width="2.5"/>`;
  // Foci on the major axis (assume a > b → horizontal major).
  const major = Math.max(a, b);
  const minor = Math.min(a, b);
  const c = Math.sqrt(major * major - minor * minor);
  const horizontalMajor = a >= b;
  let f1, f2, v1, v2;
  if (horizontalMajor) {
    f1 = [h - c, k]; f2 = [h + c, k];
    v1 = [h - a, k]; v2 = [h + a, k];
  } else {
    f1 = [h, k - c]; f2 = [h, k + c];
    v1 = [h, k - b]; v2 = [h, k + b];
  }
  svg += `<circle cx="${sx(f1[0])}" cy="${sy(f1[1])}" r="5" fill="${COLORS.focus}"/>`;
  svg += `<circle cx="${sx(f2[0])}" cy="${sy(f2[1])}" r="5" fill="${COLORS.focus}"/>`;
  svg += `<circle cx="${sx(v1[0])}" cy="${sy(v1[1])}" r="4" fill="${COLORS.vertex}"/>`;
  svg += `<circle cx="${sx(v2[0])}" cy="${sy(v2[1])}" r="4" fill="${COLORS.vertex}"/>`;
  svg += `<circle cx="${sx(h)}" cy="${sy(k)}" r="3" fill="${COLORS.center}"/>`;
  svg += `<text x="${sx(f1[0]) - 10}" y="${sy(f1[1]) - 8}" font-size="11" fill="${COLORS.focus}" font-weight="700">F₁</text>`;
  svg += `<text x="${sx(f2[0]) + 6}" y="${sy(f2[1]) - 8}" font-size="11" fill="${COLORS.focus}" font-weight="700">F₂</text>`;
  return svg;
}

function drawParabola(h, k, p) {
  // y - k = (1/(4p)) (x - h)^2. Opens upward if p > 0.
  let svg = '';
  const N = 200;
  let d = '';
  const span = 5;
  for (let i = 0; i <= N; i++) {
    const x = h - span + (2 * span) * (i / N);
    const y = k + (x - h) * (x - h) / (4 * p);
    if (i === 0) d += `M ${sx(x)} ${sy(y)} `;
    else d += `L ${sx(x)} ${sy(y)} `;
  }
  svg += `<path d="${d}" fill="none" stroke="${COLORS.curve}" stroke-width="2.5"/>`;
  // Vertex.
  svg += `<circle cx="${sx(h)}" cy="${sy(k)}" r="5" fill="${COLORS.vertex}"/>`;
  svg += `<text x="${sx(h) + 8}" y="${sy(k) + 14}" font-size="12" fill="${COLORS.vertex}" font-weight="700">V</text>`;
  // Focus.
  svg += `<circle cx="${sx(h)}" cy="${sy(k + p)}" r="5" fill="${COLORS.focus}"/>`;
  svg += `<text x="${sx(h) + 8}" y="${sy(k + p) - 4}" font-size="12" fill="${COLORS.focus}" font-weight="700">F</text>`;
  // Directrix.
  svg += `<line x1="0" y1="${sy(k - p)}" x2="${SVG_W}" y2="${sy(k - p)}" stroke="${COLORS.directrix}" stroke-width="2" stroke-dasharray="6 4"/>`;
  svg += `<text x="${SVG_W - 80}" y="${sy(k - p) - 6}" font-size="12" fill="${COLORS.directrix}" font-weight="700">directrix</text>`;
  return svg;
}

function drawHyperbola(h, k, a, b) {
  // x²/a² − y²/b² = 1, centered at (h, k). Horizontal transverse axis.
  let svg = '';
  const N = 120;
  // Right branch.
  let d1 = '';
  let d2 = '';
  for (let i = 0; i <= N; i++) {
    const t = -1.5 + 3 * (i / N);
    const x1 = h + a * Math.cosh(t);
    const y1 = k + b * Math.sinh(t);
    const x2 = h - a * Math.cosh(t);
    const y2 = k + b * Math.sinh(t);
    if (i === 0) { d1 += `M ${sx(x1)} ${sy(y1)} `; d2 += `M ${sx(x2)} ${sy(y2)} `; }
    else { d1 += `L ${sx(x1)} ${sy(y1)} `; d2 += `L ${sx(x2)} ${sy(y2)} `; }
  }
  svg += `<path d="${d1}" fill="none" stroke="${COLORS.curve}" stroke-width="2.5"/>`;
  svg += `<path d="${d2}" fill="none" stroke="${COLORS.curve}" stroke-width="2.5"/>`;
  // Asymptotes: y - k = ±(b/a)(x - h).
  const slope = b / a;
  const range = 8;
  svg += `<line x1="${sx(h - range)}" y1="${sy(k - slope * range)}" x2="${sx(h + range)}" y2="${sy(k + slope * range)}" stroke="${COLORS.asymptote}" stroke-width="1.5" stroke-dasharray="5 3"/>`;
  svg += `<line x1="${sx(h - range)}" y1="${sy(k + slope * range)}" x2="${sx(h + range)}" y2="${sy(k - slope * range)}" stroke="${COLORS.asymptote}" stroke-width="1.5" stroke-dasharray="5 3"/>`;
  // Vertices.
  svg += `<circle cx="${sx(h - a)}" cy="${sy(k)}" r="4" fill="${COLORS.vertex}"/>`;
  svg += `<circle cx="${sx(h + a)}" cy="${sy(k)}" r="4" fill="${COLORS.vertex}"/>`;
  // Foci.
  const c = Math.sqrt(a * a + b * b);
  svg += `<circle cx="${sx(h - c)}" cy="${sy(k)}" r="5" fill="${COLORS.focus}"/>`;
  svg += `<circle cx="${sx(h + c)}" cy="${sy(k)}" r="5" fill="${COLORS.focus}"/>`;
  svg += `<text x="${sx(h - c)}" y="${sy(k) - 8}" font-size="11" fill="${COLORS.focus}" font-weight="700" text-anchor="middle">F₁</text>`;
  svg += `<text x="${sx(h + c)}" y="${sy(k) - 8}" font-size="11" fill="${COLORS.focus}" font-weight="700" text-anchor="middle">F₂</text>`;
  // Center.
  svg += `<circle cx="${sx(h)}" cy="${sy(k)}" r="3" fill="${COLORS.center}"/>`;
  return svg;
}

function drawConeIntuition(mode) {
  // Mini cartoon of slicing a double cone, in the bottom-right corner.
  const cx = SVG_W - 80, cy = 50;
  let svg = '';
  // Cone outline (two triangles).
  svg += `<polygon points="${cx - 30},${cy + 40} ${cx},${cy} ${cx + 30},${cy + 40}" fill="${COLORS.cone}" stroke="${COLORS.text}" stroke-width="1.5"/>`;
  svg += `<polygon points="${cx - 30},${cy + 40} ${cx},${cy + 80} ${cx + 30},${cy + 40}" fill="${COLORS.cone}" stroke="${COLORS.text}" stroke-width="1.5"/>`;
  // Slicing plane: orientation depends on mode.
  let p1, p2;
  if (mode === 'circle') {
    p1 = [cx - 40, cy + 30]; p2 = [cx + 40, cy + 30];
  } else if (mode === 'ellipse') {
    p1 = [cx - 40, cy + 24]; p2 = [cx + 40, cy + 36];
  } else if (mode === 'parabola') {
    p1 = [cx - 40, cy + 0]; p2 = [cx + 40, cy + 50];
  } else { // hyperbola
    p1 = [cx - 40, cy - 5]; p2 = [cx + 40, cy + 70];
  }
  svg += `<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="${COLORS.conePlaneEdge}" stroke-width="3"/>`;
  svg += `<text x="${cx}" y="${cy + 100}" font-size="10" fill="${COLORS.textMuted}" text-anchor="middle">${mode}</text>`;
  return svg;
}

function buildControls(state) {
  const tabs = [['circle', 'Circle'], ['ellipse', 'Ellipse'], ['parabola', 'Parabola'], ['hyperbola', 'Hyperbola']]
    .map(([k, l]) => `<button type="button" class="cn-tab${state.mode === k ? ' active' : ''}" data-cn-mode="${k}">${l}</button>`).join('');
  let modeC = '';
  if (state.mode === 'circle') {
    modeC = `
      <div class="cn-row"><label>$h$</label><input type="range" data-cn-h min="-4" max="4" step="0.5" value="${state.h}"/><span data-cn-hval>${fmt(state.h, 1)}</span></div>
      <div class="cn-row"><label>$k$</label><input type="range" data-cn-k min="-3" max="3" step="0.5" value="${state.k}"/><span data-cn-kval>${fmt(state.k, 1)}</span></div>
      <div class="cn-row"><label>$r$</label><input type="range" data-cn-r min="1" max="5" step="0.5" value="${state.r}"/><span data-cn-rval>${fmt(state.r, 1)}</span></div>
    `;
  } else if (state.mode === 'ellipse') {
    modeC = `
      <div class="cn-row"><label>$a$</label><input type="range" data-cn-a min="1" max="6" step="0.5" value="${state.a}"/><span data-cn-aval>${fmt(state.a, 1)}</span></div>
      <div class="cn-row"><label>$b$</label><input type="range" data-cn-b min="1" max="4" step="0.5" value="${state.b}"/><span data-cn-bval>${fmt(state.b, 1)}</span></div>
    `;
  } else if (state.mode === 'parabola') {
    modeC = `
      <div class="cn-row"><label>$p$</label><input type="range" data-cn-p min="0.25" max="3" step="0.25" value="${state.p}"/><span data-cn-pval>${fmt(state.p, 2)}</span></div>
    `;
  } else if (state.mode === 'hyperbola') {
    modeC = `
      <div class="cn-row"><label>$a$</label><input type="range" data-cn-a min="0.5" max="4" step="0.25" value="${state.a}"/><span data-cn-aval>${fmt(state.a, 2)}</span></div>
      <div class="cn-row"><label>$b$</label><input type="range" data-cn-b min="0.5" max="4" step="0.25" value="${state.b}"/><span data-cn-bval>${fmt(state.b, 2)}</span></div>
    `;
  }
  return `<div class="cn-tabs">${tabs}</div>${modeC}`;
}

function computeReadout(state) {
  if (state.mode === 'circle') {
    return [
      ['equation', `$(x - ${fmt(state.h, 1)})^2 + (y - ${fmt(state.k, 1)})^2 = ${fmt(state.r * state.r, 2)}$`],
      ['center', `$(${fmt(state.h, 1)}, ${fmt(state.k, 1)})$`],
      ['radius', `${fmt(state.r, 1)}`],
      ['circumference', `$2\\pi r \\approx ${fmt(2 * Math.PI * state.r)}$`],
      ['area', `$\\pi r^2 \\approx ${fmt(Math.PI * state.r * state.r)}$`],
    ];
  }
  if (state.mode === 'ellipse') {
    const major = Math.max(state.a, state.b);
    const minor = Math.min(state.a, state.b);
    const c = Math.sqrt(major * major - minor * minor);
    return [
      ['equation', `$\\dfrac{x^2}{${fmt(state.a * state.a, 2)}} + \\dfrac{y^2}{${fmt(state.b * state.b, 2)}} = 1$`],
      ['semi-major', `${fmt(major, 2)}`],
      ['semi-minor', `${fmt(minor, 2)}`],
      ['focal distance c', `${fmt(c, 2)}`],
      ['eccentricity', `$c/a = ${fmt(c / major, 3)}$`],
    ];
  }
  if (state.mode === 'parabola') {
    return [
      ['equation', `$y = \\dfrac{x^2}{${fmt(4 * state.p, 2)}}$ (vertex at origin)`],
      ['focus', `$(0, ${fmt(state.p, 2)})$`],
      ['directrix', `$y = ${fmt(-state.p, 2)}$`],
      ['focal parameter p', `${fmt(state.p, 2)}`],
    ];
  }
  // hyperbola
  const c = Math.sqrt(state.a * state.a + state.b * state.b);
  return [
    ['equation', `$\\dfrac{x^2}{${fmt(state.a * state.a, 2)}} - \\dfrac{y^2}{${fmt(state.b * state.b, 2)}} = 1$`],
    ['vertices', `$(\\pm ${fmt(state.a, 2)}, 0)$`],
    ['foci', `$(\\pm ${fmt(c, 2)}, 0)$`],
    ['eccentricity', `$c/a = ${fmt(c / state.a, 3)}$`],
    ['asymptotes', `$y = \\pm ${fmt(state.b / state.a, 2)}\\, x$`],
  ];
}

export function mountConicSection(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = { ...cfg };

  target.innerHTML = `
    <div class="cn-wrap">
      <svg class="cn-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Conic section explorer">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-cn-grid></g>
        <g data-cn-cone></g>
        <g data-cn-curve></g>
      </svg>
      <div class="cn-controls">
        <div data-cn-cset></div>
        <div class="cn-readout" data-cn-readout></div>
      </div>
    </div>
  `;

  const gGrid = target.querySelector('[data-cn-grid]');
  const gCone = target.querySelector('[data-cn-cone]');
  const gCurve = target.querySelector('[data-cn-curve]');
  const cset = target.querySelector('[data-cn-cset]');
  const ro = target.querySelector('[data-cn-readout]');

  gGrid.innerHTML = drawGrid();

  function render() {
    gCone.innerHTML = drawConeIntuition(state.mode);
    let curve = '';
    if (state.mode === 'circle') curve = drawCircle(state.h, state.k, state.r);
    else if (state.mode === 'ellipse') curve = drawEllipse(0, 0, state.a, state.b);
    else if (state.mode === 'parabola') curve = drawParabola(0, 0, state.p);
    else curve = drawHyperbola(0, 0, state.a, state.b);
    gCurve.innerHTML = curve;

    const lines = computeReadout(state);
    let html = '';
    for (const [k, v] of lines) html += `<div class="cn-readout-row"><span>${k}</span><strong>${v}</strong></div>`;
    ro.innerHTML = html.replace(/\$([^$]+)\$/g, (whole, inner) => {
      try { return katex.renderToString(inner, { throwOnError: false }); }
      catch { return whole; }
    });

    // For consistency with the rest of the codebase, let KaTeX process any
    // remaining $...$ via the registry's postRender helper — but since
    // we're emitting raw HTML, we use a lighter approach: leave the math
    // markers and the registry will render them.
  }

  function renderLabelMath(root) {
    // Process $...$ inside <label> elements — buildControls writes them
    // as plain text and the registry's post-mount helper only runs once,
    // so rebuilt controls would otherwise show literal $h$, $k$ …
    root.querySelectorAll('label').forEach((el) => {
      if (el.dataset.cnTexed === '1') return;
      el.innerHTML = el.innerHTML.replace(/\$([^$\n]+)\$/g, (whole, inner) => {
        try { return katex.renderToString(inner, { throwOnError: false }); }
        catch { return whole; }
      });
      el.dataset.cnTexed = '1';
    });
  }

  function rebuild() {
    cset.innerHTML = buildControls(state);
    renderLabelMath(cset);
    cset.querySelectorAll('[data-cn-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.mode = btn.dataset.cnMode;
        rebuild();
        render();
      });
    });
    const map = [['h','hval'],['k','kval'],['r','rval'],['a','aval'],['b','bval'],['p','pval']];
    for (const [key, valKey] of map) {
      const el = cset.querySelector(`[data-cn-${key}]`);
      if (el) {
        el.addEventListener('input', (e) => {
          state[key] = +e.target.value;
          const valEl = cset.querySelector(`[data-cn-${valKey}]`);
          if (valEl) valEl.textContent = fmt(state[key], 2);
          render();
        });
      }
    }
  }

  rebuild();
  render();
}
