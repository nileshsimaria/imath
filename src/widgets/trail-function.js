// Mountain-trail function visualizer.
//
// A hiking trail is the canonical continuous function: each position along
// the trail (input) has exactly one elevation (output). Drag the hiker to
// pick a position; the elevation meter on the right shows the matched
// output. Switch trail shapes to see "different rules = different
// functions" with the same input set.
//
// Modes:
//   single   — drag the hiker, see one input → one output pairing.
//   all      — every integer kilometer is connected to its elevation
//              with an arc landing on the meter (the whole function).
//   compare  — pick from several preset trails (rule changes; same axis).
//
// Config (all optional):
//   mode:        'single' | 'all' | 'compare'   (default 'single')
//   trail:       trail preset key (default 'two-peaks')
//   probeX:      initial hiker position 0..10 (single mode)

const SVG_W = 720;
const SVG_H = 380;

// Trail world coordinates: x ∈ [0, 10] km, y ∈ [0, 1600] m.
const W = {
  xMin: 0, xMax: 10,
  yMin: 0, yMax: 1600,
};

// Layout: trail plot on the left, elevation meter on the right.
const PLOT = {
  left: 60, right: 540,
  top: 40, bottom: 300,
};
const METER = {
  x: 600, w: 56,
  top: 60, bottom: 300,
};

const COLORS = {
  sky: '#e0f2fe',
  skyEdge: '#bae6fd',
  grass: '#86efac',
  rock: '#a8a29e',
  snow: '#f8fafc',
  trail: '#3f2a14',
  trailEdge: '#1c1410',
  hikerBody: '#dc2626',
  hikerHead: '#fde68a',
  axis: '#475569',
  axisTick: '#64748b',
  grid: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  arc: '#7c3aed',
  meterEdge: '#1e293b',
  probe: '#0f172a',
};

// Trail elevation functions, all over x ∈ [0, 10], returning meters.
const TRAILS = {
  'two-peaks': {
    label: 'Two-Peak Ridge',
    f: (x) => {
      // Two gaussian bumps + small base.
      const g = (mu, sd, amp) => amp * Math.exp(-((x - mu) ** 2) / (2 * sd * sd));
      return 200 + g(2.5, 1.2, 900) + g(7.2, 1.4, 1200);
    },
  },
  'rolling-hills': {
    label: 'Rolling Hills',
    f: (x) => 600 + 350 * Math.sin(0.9 * x) + 180 * Math.sin(2.2 * x + 0.3),
  },
  'long-climb': {
    label: 'Long Climb',
    f: (x) => 100 + 1300 * (x / 10) + 60 * Math.sin(2 * x),
  },
  'valley': {
    label: 'Valley Crossing',
    f: (x) => 1300 - 1100 * Math.exp(-((x - 5) ** 2) / 4),
  },
};

const DEFAULTS = {
  mode: 'single',
  trail: 'two-peaks',
  probeX: 4,
};

function fmt(n, d = 0) { return parseFloat(Number(n).toFixed(d)).toString(); }

// Project world → screen.
function px(x) {
  return PLOT.left + ((x - W.xMin) / (W.xMax - W.xMin)) * (PLOT.right - PLOT.left);
}
function py(y) {
  return PLOT.bottom - ((y - W.yMin) / (W.yMax - W.yMin)) * (PLOT.bottom - PLOT.top);
}
function meterY(y) {
  return METER.bottom - ((y - W.yMin) / (W.yMax - W.yMin)) * (METER.bottom - METER.top);
}

// Elevation-band color (terrain coloring): grass low, rock mid, snow high.
function elevColor(y) {
  const t = (y - W.yMin) / (W.yMax - W.yMin);
  if (t < 0.35) return '#65a30d';        // grass
  if (t < 0.55) return '#a16207';        // soil
  if (t < 0.75) return '#78716c';        // rock
  if (t < 0.88) return '#d6d3d1';        // light rock
  return '#f8fafc';                      // snow
}

function svgDefs() {
  // Meter gradient: grass → rock → snow, bottom to top.
  return `
    <defs>
      <linearGradient id="tf-meter" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%"  stop-color="#65a30d"/>
        <stop offset="35%" stop-color="#a16207"/>
        <stop offset="60%" stop-color="#78716c"/>
        <stop offset="85%" stop-color="#d6d3d1"/>
        <stop offset="100%" stop-color="#f8fafc"/>
      </linearGradient>
      <linearGradient id="tf-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#dbeafe"/>
        <stop offset="100%" stop-color="#fef3c7"/>
      </linearGradient>
      <marker id="tf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="${COLORS.arc}"/>
      </marker>
    </defs>`;
}

function backdrop() {
  // Sky panel behind the trail plot.
  return `<rect x="${PLOT.left}" y="${PLOT.top}" width="${PLOT.right - PLOT.left}" height="${PLOT.bottom - PLOT.top}" fill="url(#tf-sky)" stroke="${COLORS.skyEdge}" stroke-width="1" rx="6"/>`;
}

function trailShape(f) {
  // Sample the trail, then build a filled polygon: trail curve on top,
  // base of plot on the bottom. Color the polygon with a vertical
  // gradient by sampling slices.
  const N = 200;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const x = W.xMin + (i / N) * (W.xMax - W.xMin);
    pts.push({ x, y: f(x) });
  }
  // Paint vertical slices for a terrain feel.
  let svg = '';
  for (let i = 0; i < N; i++) {
    const a = pts[i], b = pts[i + 1];
    const yMid = (a.y + b.y) / 2;
    const fill = elevColor(yMid);
    svg += `<polygon points="${px(a.x)},${py(a.y)} ${px(b.x)},${py(b.y)} ${px(b.x)},${py(W.yMin)} ${px(a.x)},${py(W.yMin)}" fill="${fill}" stroke="none"/>`;
  }
  // Trail line on top of the terrain.
  let d = `M ${px(pts[0].x)} ${py(pts[0].y)}`;
  for (let i = 1; i <= N; i++) d += ` L ${px(pts[i].x)} ${py(pts[i].y)}`;
  svg += `<path d="${d}" fill="none" stroke="${COLORS.trailEdge}" stroke-width="2"/>`;
  // Dashed footpath following the ridge.
  svg += `<path d="${d}" fill="none" stroke="${COLORS.trail}" stroke-width="1.4" stroke-dasharray="6 4" opacity="0.7"/>`;
  return svg;
}

function xAxis() {
  let svg = '';
  // Baseline.
  svg += `<line x1="${PLOT.left}" y1="${PLOT.bottom}" x2="${PLOT.right}" y2="${PLOT.bottom}" stroke="${COLORS.axis}" stroke-width="1.5"/>`;
  for (let v = W.xMin; v <= W.xMax; v++) {
    const X = px(v);
    svg += `<line x1="${X}" y1="${PLOT.bottom}" x2="${X}" y2="${PLOT.bottom + 4}" stroke="${COLORS.axis}" stroke-width="1"/>`;
    svg += `<text x="${X}" y="${PLOT.bottom + 18}" font-size="12" fill="${COLORS.text}" text-anchor="middle">${v}</text>`;
  }
  svg += `<text x="${(PLOT.left + PLOT.right) / 2}" y="${PLOT.bottom + 38}" font-size="13" fill="${COLORS.textMuted}" text-anchor="middle" font-style="italic">distance along trail (km)  —  INPUT</text>`;
  return svg;
}

function meter() {
  let svg = '';
  svg += `<rect x="${METER.x}" y="${METER.top}" width="${METER.w}" height="${METER.bottom - METER.top}" fill="url(#tf-meter)" stroke="${COLORS.meterEdge}" stroke-width="2" rx="6"/>`;
  // Tick marks every 200 m.
  for (let v = 0; v <= 1600; v += 200) {
    const y = meterY(v);
    if (y < METER.top - 1 || y > METER.bottom + 1) continue;
    svg += `<line x1="${METER.x - 5}" y1="${y}" x2="${METER.x}" y2="${y}" stroke="${COLORS.meterEdge}" stroke-width="1.2"/>`;
    if (v % 400 === 0) {
      svg += `<text x="${METER.x - 9}" y="${y + 4}" font-size="11" fill="${COLORS.text}" text-anchor="end">${v}</text>`;
    }
  }
  svg += `<text x="${METER.x + METER.w / 2}" y="${METER.top - 8}" font-size="12" fill="${COLORS.textMuted}" text-anchor="middle" font-style="italic">elevation</text>`;
  svg += `<text x="${METER.x + METER.w / 2}" y="${METER.bottom + 18}" font-size="11" fill="${COLORS.textMuted}" text-anchor="middle">(meters)</text>`;
  svg += `<text x="${METER.x + METER.w / 2}" y="${METER.bottom + 38}" font-size="13" fill="${COLORS.textMuted}" text-anchor="middle" font-style="italic">OUTPUT</text>`;
  return svg;
}

function hiker(x, y) {
  // Hiker at trail position (x in km, y in meters).
  const X = px(x), Y = py(y);
  return `
    <line x1="${X}" y1="${Y - 22}" x2="${X}" y2="${Y - 4}" stroke="${COLORS.hikerBody}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="${X}" cy="${Y - 28}" r="6" fill="${COLORS.hikerHead}" stroke="${COLORS.trailEdge}" stroke-width="1.5"/>
    <line x1="${X - 5}" y1="${Y - 4}" x2="${X - 9}" y2="${Y + 4}" stroke="${COLORS.hikerBody}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="${X + 5}" y1="${Y - 4}" x2="${X + 9}" y2="${Y + 4}" stroke="${COLORS.hikerBody}" stroke-width="2.5" stroke-linecap="round"/>
  `;
}

function probeOverlay(xp, f) {
  const yp = f(xp);
  const X = px(xp), Y = py(yp);
  const mY = meterY(yp);
  let svg = '';
  // Dashed guides: vertical from x-axis up to the trail, then horizontal
  // across to the meter.
  svg += `<line x1="${X}" y1="${PLOT.bottom}" x2="${X}" y2="${Y}" stroke="${COLORS.probe}" stroke-width="1.4" stroke-dasharray="4 3"/>`;
  svg += `<line x1="${X}" y1="${Y}" x2="${METER.x}" y2="${mY}" stroke="${COLORS.probe}" stroke-width="1.4" stroke-dasharray="4 3"/>`;
  // Highlight band on the meter.
  svg += `<rect x="${METER.x - 4}" y="${mY - 6}" width="${METER.w + 8}" height="12" fill="none" stroke="${COLORS.probe}" stroke-width="2"/>`;
  // Curved arrow from hiker to meter.
  const cx = (X + METER.x) / 2;
  const cy = Math.min(Y, mY) - 50;
  svg += `<path d="M ${X} ${Y - 36} Q ${cx} ${cy} ${METER.x - 4} ${mY}" fill="none" stroke="${COLORS.arc}" stroke-width="2.5" marker-end="url(#tf-arrow)" opacity="0.9"/>`;
  // Big readout next to the meter.
  svg += `<text x="${METER.x + METER.w + 14}" y="${mY + 5}" font-size="14" fill="${COLORS.text}" font-weight="700">${fmt(yp)} m</text>`;
  return svg;
}

function allArcsOverlay(f) {
  let svg = '';
  for (let kx = W.xMin; kx <= W.xMax; kx++) {
    const y = f(kx);
    const X = px(kx), Y = py(y);
    const mY = meterY(y);
    const cx = (X + METER.x) / 2;
    const cy = Math.min(Y, mY) - 40;
    const c = elevColor(y);
    svg += `<path d="M ${X} ${Y - 4} Q ${cx} ${cy} ${METER.x - 3} ${mY}" fill="none" stroke="${c}" stroke-width="2" opacity="0.9" marker-end="url(#tf-arrow)"/>`;
  }
  return svg;
}

function functionLabel() {
  // The big "function" label between trail and meter.
  const x = (PLOT.right + METER.x) / 2;
  return `<text x="${x}" y="35" font-size="14" fill="${COLORS.arc}" font-weight="700" text-anchor="middle">function</text>`;
}

function buildControls(mode, state) {
  if (mode === 'single') {
    return `
      <div class="tf-row">
        <label>Hiker at (km)</label>
        <input type="range" data-tf-probe min="0" max="10" step="0.1" value="${state.probeX}"/>
        <span class="val" data-tf-probeval>${fmt(state.probeX, 1)}</span>
      </div>
      <div class="tf-note">Drag the slider to walk along the trail. The function pairs every km marker with exactly one elevation, shown on the meter.</div>
    `;
  }
  if (mode === 'compare') {
    const tabs = Object.entries(TRAILS).map(([k, t]) =>
      `<button type="button" data-tf-trail="${k}" class="tf-tab${k === state.trail ? ' active' : ''}">${t.label}</button>`
    ).join('');
    return `
      <div class="tf-tabs">${tabs}</div>
      <div class="tf-note">Same input set (positions from 0 to 10 km), same output type (meters). Different <em>rule</em> = different function. The hiker stays put; the trail beneath their feet changes.</div>
    `;
  }
  // all
  return `
    <div class="tf-note">Every integer kilometer is linked to its elevation by a colored arc. One arrow per input — that is the function rule made visible.</div>
  `;
}

export function mountTrailFunction(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = {
    mode: cfg.mode,
    trail: cfg.trail,
    probeX: cfg.probeX,
  };

  target.innerHTML = `
    <div class="tf-wrap">
      <svg class="tf-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Mountain trail function visualizer">
        ${svgDefs()}
        ${backdrop()}
        <g data-tf-terrain></g>
        <g data-tf-overlay></g>
        <g data-tf-hiker></g>
        <g data-tf-axis></g>
        <g data-tf-meter></g>
        <g data-tf-labels></g>
      </svg>
      <div class="tf-controls" data-tf-controls></div>
    </div>
  `;

  const gTerrain = target.querySelector('[data-tf-terrain]');
  const gOverlay = target.querySelector('[data-tf-overlay]');
  const gHiker = target.querySelector('[data-tf-hiker]');
  const gAxis = target.querySelector('[data-tf-axis]');
  const gMeter = target.querySelector('[data-tf-meter]');
  const gLabels = target.querySelector('[data-tf-labels]');
  const ctrlBox = target.querySelector('[data-tf-controls]');

  gAxis.innerHTML = xAxis();
  gMeter.innerHTML = meter();
  gLabels.innerHTML = functionLabel();

  function bindControls() {
    ctrlBox.innerHTML = buildControls(state.mode, state);

    const probe = ctrlBox.querySelector('[data-tf-probe]');
    if (probe) {
      probe.addEventListener('input', (e) => {
        state.probeX = parseFloat(e.target.value);
        ctrlBox.querySelector('[data-tf-probeval]').textContent = fmt(state.probeX, 1);
        render();
      });
    }
    ctrlBox.querySelectorAll('[data-tf-trail]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.trail = btn.dataset.tfTrail;
        ctrlBox.querySelectorAll('[data-tf-trail]').forEach((b) => b.classList.toggle('active', b === btn));
        render();
      });
    });
  }

  function render() {
    const f = TRAILS[state.trail].f;
    gTerrain.innerHTML = trailShape(f);
    if (state.mode === 'single') {
      gOverlay.innerHTML = probeOverlay(state.probeX, f);
      gHiker.innerHTML = hiker(state.probeX, f(state.probeX));
    } else if (state.mode === 'all') {
      gOverlay.innerHTML = allArcsOverlay(f);
      gHiker.innerHTML = '';
    } else {
      // compare mode: park a hiker at km 5 as a reference
      gOverlay.innerHTML = '';
      gHiker.innerHTML = hiker(5, f(5));
    }
  }

  bindControls();
  render();
}
