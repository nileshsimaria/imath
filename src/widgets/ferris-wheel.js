// Ferris-wheel sine-wave widget.
//
// A Ferris wheel rotates at constant speed. One rider is highlighted.
// Beside it, the rider's HEIGHT is plotted against time — and a sine
// wave emerges, traced in real time. This is "where sine comes from",
// not a definition to memorize.
//
// Two derived plots:
//   height   = R · sin(ωt) + cy   → sine wave
//   x-pos    = R · cos(ωt)        → cosine wave (optional, toggleable)
//
// Config (all optional):
//   radius:       wheel radius in world units (default 1)
//   speed:        angular speed (rad / sec wall-clock); default 0.6
//   show:         'sin' | 'cos' | 'both' (default 'sin')
//   running:      autoplay on mount (default true)

const SVG_W = 760;
const SVG_H = 340;

// Wheel panel on the left.
const WHEEL = {
  cx: 150, cy: 170, r: 110,
  car: 8, // number of carriages
};
// Graph panel on the right.
const GRAPH = {
  x: 300, y: 30, w: 440, h: 280,
  tMax: 4 * Math.PI, // 4π seconds of trace shown
};

const COLORS = {
  ringEdge: '#1e293b',
  ringFill: '#fef3c7',
  spoke: '#94a3b8',
  hub: '#1e293b',
  carriage: '#3b82f6',
  carriageEdge: '#1e3a8a',
  riderRing: '#dc2626',
  rider: '#dc2626',
  riderHi: '#fde68a',
  sineCurve: '#dc2626',
  cosCurve: '#16a34a',
  axis: '#475569',
  grid: '#eef2f7',
  text: '#0f172a',
  textMuted: '#64748b',
  guide: '#0f172a',
  bg: '#fafbfc',
};

const DEFAULTS = {
  radius: 1,
  speed: 0.6,
  show: 'sin',
  running: true,
};

function fmt(n, d = 2) { return parseFloat(Number(n).toFixed(d)).toString(); }

function projT(t) {
  // t ∈ [0, GRAPH.tMax] → x in graph rectangle.
  return GRAPH.x + (t / GRAPH.tMax) * GRAPH.w;
}
function projY(y) {
  // y ∈ [-1.2, 1.2] (world units) → graph rect.
  const yMin = -1.2, yMax = 1.2;
  return GRAPH.y + GRAPH.h - ((y - yMin) / (yMax - yMin)) * GRAPH.h;
}

function graphAxes() {
  let svg = '';
  // Grid for y at -1, 0, 1.
  for (const y of [-1, 0, 1]) {
    const Y = projY(y);
    svg += `<line x1="${GRAPH.x}" y1="${Y}" x2="${GRAPH.x + GRAPH.w}" y2="${Y}" stroke="${y === 0 ? COLORS.axis : COLORS.grid}" stroke-width="${y === 0 ? 1.5 : 1}"/>`;
    svg += `<text x="${GRAPH.x - 8}" y="${Y + 4}" font-size="11" fill="${COLORS.textMuted}" text-anchor="end">${y}</text>`;
  }
  // Time ticks at π/2, π, 3π/2, 2π, ... (wheel angle ticks).
  const ticks = [Math.PI / 2, Math.PI, 3 * Math.PI / 2, 2 * Math.PI, 5 * Math.PI / 2, 3 * Math.PI, 7 * Math.PI / 2, 4 * Math.PI];
  const labels = ['π/2', 'π', '3π/2', '2π', '5π/2', '3π', '7π/2', '4π'];
  for (let i = 0; i < ticks.length; i++) {
    const t = ticks[i];
    if (t > GRAPH.tMax) break;
    const X = projT(t);
    svg += `<line x1="${X}" y1="${GRAPH.y + GRAPH.h}" x2="${X}" y2="${GRAPH.y + GRAPH.h + 4}" stroke="${COLORS.axis}" stroke-width="1"/>`;
    svg += `<text x="${X}" y="${GRAPH.y + GRAPH.h + 18}" font-size="11" fill="${COLORS.textMuted}" text-anchor="middle">${labels[i]}</text>`;
  }
  // Bounding box.
  svg += `<rect x="${GRAPH.x}" y="${GRAPH.y}" width="${GRAPH.w}" height="${GRAPH.h}" fill="none" stroke="${COLORS.axis}" stroke-width="1.5" rx="4"/>`;
  // Axis labels.
  svg += `<text x="${GRAPH.x + GRAPH.w / 2}" y="${GRAPH.y + GRAPH.h + 34}" font-size="12" fill="${COLORS.textMuted}" text-anchor="middle" font-style="italic">time (= angle traveled, in radians)</text>`;
  svg += `<text x="${GRAPH.x - 28}" y="${GRAPH.y + GRAPH.h / 2}" font-size="12" fill="${COLORS.textMuted}" text-anchor="middle" font-style="italic" transform="rotate(-90 ${GRAPH.x - 28} ${GRAPH.y + GRAPH.h / 2})">rider height</text>`;
  return svg;
}

function wheelStatic() {
  let svg = '';
  // Support struts.
  svg += `<line x1="${WHEEL.cx - 70}" y1="${WHEEL.cy + WHEEL.r + 20}" x2="${WHEEL.cx}" y2="${WHEEL.cy}" stroke="${COLORS.spoke}" stroke-width="4" stroke-linecap="round"/>`;
  svg += `<line x1="${WHEEL.cx + 70}" y1="${WHEEL.cy + WHEEL.r + 20}" x2="${WHEEL.cx}" y2="${WHEEL.cy}" stroke="${COLORS.spoke}" stroke-width="4" stroke-linecap="round"/>`;
  svg += `<line x1="${WHEEL.cx - 90}" y1="${WHEEL.cy + WHEEL.r + 20}" x2="${WHEEL.cx + 90}" y2="${WHEEL.cy + WHEEL.r + 20}" stroke="${COLORS.spoke}" stroke-width="5" stroke-linecap="round"/>`;
  // Outer ring.
  svg += `<circle cx="${WHEEL.cx}" cy="${WHEEL.cy}" r="${WHEEL.r}" fill="${COLORS.ringFill}" stroke="${COLORS.ringEdge}" stroke-width="3"/>`;
  // X-axis through the wheel (horizontal center line) — the "ground reference" for height.
  svg += `<line x1="${WHEEL.cx - WHEEL.r - 20}" y1="${WHEEL.cy}" x2="${WHEEL.cx + WHEEL.r + 20}" y2="${WHEEL.cy}" stroke="${COLORS.axis}" stroke-width="1" stroke-dasharray="3 3" opacity="0.6"/>`;
  return svg;
}

// Carriages and rider at angle θ. θ = 0 means rider on the right (3 o'clock).
function wheelDynamic(theta, show) {
  let svg = '';
  // Spokes and carriages.
  for (let i = 0; i < WHEEL.car; i++) {
    const a = theta + (i / WHEEL.car) * 2 * Math.PI;
    const cx = WHEEL.cx + WHEEL.r * Math.cos(a);
    const cy = WHEEL.cy - WHEEL.r * Math.sin(a); // SVG y inverted
    // Spoke from hub to carriage anchor.
    svg += `<line x1="${WHEEL.cx}" y1="${WHEEL.cy}" x2="${cx}" y2="${cy}" stroke="${COLORS.spoke}" stroke-width="1.5"/>`;
    // Carriage — small box hanging from anchor.
    const isRider = i === 0;
    const fill = isRider ? COLORS.riderHi : COLORS.carriage;
    const edge = isRider ? COLORS.riderRing : COLORS.carriageEdge;
    svg += `<rect x="${cx - 10}" y="${cy}" width="20" height="14" rx="3" fill="${fill}" stroke="${edge}" stroke-width="${isRider ? 2.5 : 1.5}"/>`;
    if (isRider) {
      // Rider dot.
      svg += `<circle cx="${cx}" cy="${cy + 7}" r="3" fill="${COLORS.rider}"/>`;
    }
  }
  // Hub.
  svg += `<circle cx="${WHEEL.cx}" cy="${WHEEL.cy}" r="6" fill="${COLORS.hub}"/>`;

  // Highlight rider position.
  const rx = WHEEL.cx + WHEEL.r * Math.cos(theta);
  const ry = WHEEL.cy - WHEEL.r * Math.sin(theta);
  // Vertical guide: rider down to horizontal axis (showing height).
  if (show === 'sin' || show === 'both') {
    svg += `<line x1="${rx}" y1="${ry}" x2="${rx}" y2="${WHEEL.cy}" stroke="${COLORS.sineCurve}" stroke-width="2" stroke-dasharray="4 3"/>`;
    svg += `<text x="${rx + 8}" y="${(ry + WHEEL.cy) / 2 + 4}" font-size="12" fill="${COLORS.sineCurve}" font-weight="700">sin θ</text>`;
  }
  if (show === 'cos' || show === 'both') {
    svg += `<line x1="${WHEEL.cx}" y1="${ry}" x2="${rx}" y2="${ry}" stroke="${COLORS.cosCurve}" stroke-width="2" stroke-dasharray="4 3"/>`;
    svg += `<text x="${(rx + WHEEL.cx) / 2}" y="${ry - 6}" font-size="12" fill="${COLORS.cosCurve}" font-weight="700" text-anchor="middle">cos θ</text>`;
  }
  return svg;
}

// Sine/cosine trace up to elapsed time t (in radians).
function trace(t, show) {
  let svg = '';
  if (show === 'sin' || show === 'both') {
    let d = `M ${projT(0)} ${projY(0)}`;
    const N = 200;
    for (let i = 1; i <= N; i++) {
      const tt = (i / N) * Math.min(t, GRAPH.tMax);
      d += ` L ${projT(tt)} ${projY(Math.sin(tt))}`;
    }
    svg += `<path d="${d}" fill="none" stroke="${COLORS.sineCurve}" stroke-width="2.5"/>`;
    // Current point.
    const tt = Math.min(t, GRAPH.tMax);
    svg += `<circle cx="${projT(tt)}" cy="${projY(Math.sin(tt))}" r="5" fill="${COLORS.sineCurve}" stroke="white" stroke-width="2"/>`;
  }
  if (show === 'cos' || show === 'both') {
    let d = `M ${projT(0)} ${projY(1)}`;
    const N = 200;
    for (let i = 1; i <= N; i++) {
      const tt = (i / N) * Math.min(t, GRAPH.tMax);
      d += ` L ${projT(tt)} ${projY(Math.cos(tt))}`;
    }
    svg += `<path d="${d}" fill="none" stroke="${COLORS.cosCurve}" stroke-width="2.5"/>`;
    const tt = Math.min(t, GRAPH.tMax);
    svg += `<circle cx="${projT(tt)}" cy="${projY(Math.cos(tt))}" r="5" fill="${COLORS.cosCurve}" stroke="white" stroke-width="2"/>`;
  }
  return svg;
}

// Horizontal "rail" from rider on the wheel across to the current point on the trace —
// drives home the visual coupling.
function projectionRail(theta, t, show) {
  let svg = '';
  const ry = WHEEL.cy - WHEEL.r * Math.sin(theta);
  if (show === 'sin' || show === 'both') {
    const tt = Math.min(t, GRAPH.tMax);
    const X = projT(tt);
    const Y = projY(Math.sin(tt));
    svg += `<line x1="${WHEEL.cx + WHEEL.r}" y1="${ry}" x2="${X}" y2="${Y}" stroke="${COLORS.sineCurve}" stroke-width="1.4" stroke-dasharray="3 3" opacity="0.7"/>`;
  }
  return svg;
}

function legend(show) {
  let svg = '';
  let y = GRAPH.y + 8;
  const x = GRAPH.x + 10;
  if (show === 'sin' || show === 'both') {
    svg += `<line x1="${x}" y1="${y}" x2="${x + 22}" y2="${y}" stroke="${COLORS.sineCurve}" stroke-width="2.5"/>`;
    svg += `<text x="${x + 28}" y="${y + 4}" font-size="12" fill="${COLORS.text}">height = sin θ</text>`;
    y += 18;
  }
  if (show === 'cos' || show === 'both') {
    svg += `<line x1="${x}" y1="${y}" x2="${x + 22}" y2="${y}" stroke="${COLORS.cosCurve}" stroke-width="2.5"/>`;
    svg += `<text x="${x + 28}" y="${y + 4}" font-size="12" fill="${COLORS.text}">x-pos = cos θ</text>`;
  }
  return svg;
}

export function mountFerrisWheel(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = {
    theta: 0,
    t: 0,
    speed: cfg.speed,
    show: cfg.show,
    running: cfg.running,
    lastTs: null,
  };

  target.innerHTML = `
    <div class="fw-wrap">
      <svg class="fw-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Ferris wheel and sine wave">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-fw-graph></g>
        <g data-fw-wheel-static></g>
        <g data-fw-wheel-dyn></g>
        <g data-fw-rail></g>
        <g data-fw-trace></g>
        <g data-fw-legend></g>
      </svg>
      <div class="fw-controls">
        <div class="fw-row">
          <button type="button" data-fw-toggle class="fw-btn">${state.running ? 'Pause' : 'Play'}</button>
          <button type="button" data-fw-reset class="fw-btn fw-btn-light">Reset</button>
          <span class="fw-readout" data-fw-readout></span>
        </div>
        <div class="fw-row">
          <label>Speed</label>
          <input type="range" data-fw-speed min="0.15" max="1.8" step="0.05" value="${state.speed}"/>
          <span class="val" data-fw-speedval>${fmt(state.speed, 2)}</span>
        </div>
        <div class="fw-row">
          <label>Show</label>
          <div class="fw-tabs">
            <button type="button" data-fw-show="sin" class="fw-tab${state.show === 'sin' ? ' active' : ''}">height (sin)</button>
            <button type="button" data-fw-show="cos" class="fw-tab${state.show === 'cos' ? ' active' : ''}">x-pos (cos)</button>
            <button type="button" data-fw-show="both" class="fw-tab${state.show === 'both' ? ' active' : ''}">both</button>
          </div>
        </div>
        <div class="fw-note">As the wheel turns, the highlighted rider's <strong>height</strong> traces a sine wave on the right. The wave is not abstract — it IS what the rider is doing.</div>
      </div>
    </div>
  `;

  const gGraph = target.querySelector('[data-fw-graph]');
  const gStatic = target.querySelector('[data-fw-wheel-static]');
  const gDyn = target.querySelector('[data-fw-wheel-dyn]');
  const gRail = target.querySelector('[data-fw-rail]');
  const gTrace = target.querySelector('[data-fw-trace]');
  const gLegend = target.querySelector('[data-fw-legend]');
  const readout = target.querySelector('[data-fw-readout]');
  const toggleBtn = target.querySelector('[data-fw-toggle]');
  const resetBtn = target.querySelector('[data-fw-reset]');

  gGraph.innerHTML = graphAxes();
  gStatic.innerHTML = wheelStatic();
  gLegend.innerHTML = legend(state.show);

  function renderDynamic() {
    gDyn.innerHTML = wheelDynamic(state.theta, state.show);
    gRail.innerHTML = projectionRail(state.theta, state.t, state.show);
    gTrace.innerHTML = trace(state.t, state.show);
    const sinV = Math.sin(state.theta);
    const cosV = Math.cos(state.theta);
    readout.innerHTML = `θ = ${fmt(state.theta, 2)} &nbsp; · &nbsp; sin θ = ${fmt(sinV, 2)} &nbsp; · &nbsp; cos θ = ${fmt(cosV, 2)}`;
  }
  renderDynamic();

  let rafId = null;
  function step(ts) {
    if (state.lastTs == null) state.lastTs = ts;
    const dt = (ts - state.lastTs) / 1000;
    state.lastTs = ts;
    if (state.running) {
      state.theta += state.speed * dt;
      state.t += state.speed * dt;
      if (state.t > GRAPH.tMax) {
        state.t = 0;
        // Reset trace; keep angle continuous.
      }
      renderDynamic();
    }
    rafId = requestAnimationFrame(step);
  }
  rafId = requestAnimationFrame(step);

  toggleBtn.addEventListener('click', () => {
    state.running = !state.running;
    state.lastTs = null;
    toggleBtn.textContent = state.running ? 'Pause' : 'Play';
  });
  resetBtn.addEventListener('click', () => {
    state.theta = 0;
    state.t = 0;
    state.lastTs = null;
    renderDynamic();
  });
  target.querySelector('[data-fw-speed]').addEventListener('input', (e) => {
    state.speed = parseFloat(e.target.value);
    target.querySelector('[data-fw-speedval]').textContent = fmt(state.speed, 2);
  });
  target.querySelectorAll('[data-fw-show]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.show = btn.dataset.fwShow;
      target.querySelectorAll('[data-fw-show]').forEach((b) => b.classList.toggle('active', b === btn));
      gLegend.innerHTML = legend(state.show);
      renderDynamic();
    });
  });

  // Cleanup when target is removed from DOM.
  const observer = new MutationObserver(() => {
    if (!document.body.contains(target)) {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
