// Speedometer-Odometer widget.
//
// A car drives along a road. The driver's foot controls a speed function
// v(t). The widget shows simultaneously, in real time:
//
//   - The car driving (animated).
//   - The speedometer reading (= v(t), the current speed).
//   - The odometer reading (= ∫₀ᵗ v(s) ds, the accumulated distance).
//   - A speed-vs-time graph with the area up to t filled in (that area
//     equals the odometer reading — the FTC made visible).
//   - A distance-vs-time graph with a slope indicator at t (slope =
//     speedometer reading — also the FTC).
//
// Pick a trip profile:
//   constant       v(t) = 18
//   accel          v(t) = 4 + 6t (ramps up)
//   accel-brake    triangle: accelerate then brake
//   stop-and-go    two pulses
//   highway        steady high, brief slow zone, steady high again
//
// Config:
//   profile: trip key (default 'accel-brake')
//   running: autoplay (default true)

const SVG_W = 760;
const SVG_H = 460;

// Road panel (top).
const ROAD = { x: 30, y: 30, w: SVG_W - 60, h: 90 };
// Two graph panels stacked beneath.
const G1 = { x: 80, y: 150, w: 640, h: 130 }; // speed vs t
const G2 = { x: 80, y: 310, w: 640, h: 130 }; // distance vs t

const COLORS = {
  road: '#475569',
  roadStripe: '#fde68a',
  car: '#dc2626',
  carWindow: '#bfdbfe',
  tire: '#1e293b',
  axis: '#475569',
  grid: '#eef2f7',
  speedCurve: '#2563eb',
  speedFill: '#bfdbfe',
  distCurve: '#16a34a',
  tangent: '#dc2626',
  marker: '#0f172a',
  text: '#0f172a',
  textMuted: '#64748b',
  bg: '#fafbfc',
  dialBg: '#ffffff',
  dialEdge: '#1e293b',
  dialNeedle: '#dc2626',
};

const PROFILES = {
  'constant':   { label: 'Steady cruise', tMax: 10, vMax: 24, v: (t) => 18 },
  'accel':      { label: 'Accelerating',  tMax: 10, vMax: 24, v: (t) => 3 + 1.8 * t },
  'accel-brake':{ label: 'Accel then brake', tMax: 10, vMax: 24,
                  v: (t) => t < 5 ? 4 * t : 4 * (10 - t) },
  'stop-and-go':{ label: 'Stop & go', tMax: 10, vMax: 24,
                  v: (t) => {
                    const u = t % 5;
                    return u < 2 ? 18 : (u < 3 ? 18 * (3 - u) : 0);
                  } },
  'highway':    { label: 'Highway w/ slow zone', tMax: 10, vMax: 24,
                  v: (t) => (t < 4 || t > 6) ? 22 : 8 },
};

const DEFAULTS = { profile: 'accel-brake', running: true };

function fmt(n, d = 1) { return parseFloat(Number(n).toFixed(d)).toString(); }

// Integrate v from 0 to t numerically (cached for the active profile).
function integrate(vFn, tMax, samples = 1000) {
  const dt = tMax / samples;
  const F = new Float64Array(samples + 1);
  let acc = 0;
  for (let i = 1; i <= samples; i++) {
    const a = vFn((i - 1) * dt);
    const b = vFn(i * dt);
    acc += 0.5 * (a + b) * dt; // trapezoidal
    F[i] = acc;
  }
  return { F, dt, samples, total: acc };
}

function lookup(F, dt, samples, t) {
  if (t <= 0) return 0;
  const i = Math.min(samples, Math.floor(t / dt));
  const frac = (t - i * dt) / dt;
  if (i >= samples) return F[samples];
  return F[i] + frac * (F[i + 1] - F[i]);
}

function projT(t, G, tMax) { return G.x + (t / tMax) * G.w; }
function projY(y, G, yMin, yMax) {
  return G.y + G.h - ((y - yMin) / (yMax - yMin)) * G.h;
}

function roadAndCar(distance, totalDist) {
  let svg = '';
  // Road.
  svg += `<rect x="${ROAD.x}" y="${ROAD.y}" width="${ROAD.w}" height="${ROAD.h}" fill="${COLORS.road}" rx="6"/>`;
  // Dashed center line.
  const stripeY = ROAD.y + ROAD.h / 2;
  for (let x = ROAD.x + 10; x < ROAD.x + ROAD.w; x += 24) {
    svg += `<rect x="${x}" y="${stripeY - 2}" width="12" height="4" fill="${COLORS.roadStripe}"/>`;
  }
  // Distance ticks above road.
  for (let i = 0; i <= 10; i++) {
    const X = ROAD.x + (i / 10) * ROAD.w;
    svg += `<line x1="${X}" y1="${ROAD.y - 4}" x2="${X}" y2="${ROAD.y}" stroke="${COLORS.text}" stroke-width="1"/>`;
    svg += `<text x="${X}" y="${ROAD.y - 8}" font-size="10" fill="${COLORS.textMuted}" text-anchor="middle">${fmt(totalDist * i / 10, 0)}</text>`;
  }
  // Car position.
  const carPct = Math.min(1, distance / totalDist);
  const carX = ROAD.x + carPct * (ROAD.w - 60);
  const carY = stripeY - 20;
  svg += carBody(carX, carY);
  return svg;
}

function carBody(x, y) {
  return `
    <g>
      <rect x="${x + 8}" y="${y - 8}" width="38" height="18" rx="4" fill="${COLORS.car}" stroke="${COLORS.dialEdge}" stroke-width="1.2"/>
      <rect x="${x}" y="${y}" width="56" height="20" rx="4" fill="${COLORS.car}" stroke="${COLORS.dialEdge}" stroke-width="1.2"/>
      <rect x="${x + 12}" y="${y - 5}" width="14" height="10" rx="2" fill="${COLORS.carWindow}"/>
      <rect x="${x + 28}" y="${y - 5}" width="14" height="10" rx="2" fill="${COLORS.carWindow}"/>
      <circle cx="${x + 12}" cy="${y + 22}" r="6" fill="${COLORS.tire}"/>
      <circle cx="${x + 44}" cy="${y + 22}" r="6" fill="${COLORS.tire}"/>
    </g>
  `;
}

function dial(cx, cy, r, value, vMax, label, unit) {
  // Semicircular dial with a sweeping needle.
  const startA = Math.PI;
  const endA = 0;
  const frac = Math.max(0, Math.min(1, value / vMax));
  const needleA = startA + frac * (endA - startA);
  const nx = cx + r * 0.82 * Math.cos(needleA);
  const ny = cy - r * 0.82 * Math.sin(needleA);
  let svg = '';
  // Background arc.
  svg += `<path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}" fill="${COLORS.dialBg}" stroke="${COLORS.dialEdge}" stroke-width="2"/>`;
  // Tick marks.
  for (let i = 0; i <= 6; i++) {
    const a = startA + (i / 6) * (endA - startA);
    const x1 = cx + (r - 4) * Math.cos(a);
    const y1 = cy - (r - 4) * Math.sin(a);
    const x2 = cx + r * Math.cos(a);
    const y2 = cy - r * Math.sin(a);
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${COLORS.dialEdge}" stroke-width="1.2"/>`;
  }
  // Needle.
  svg += `<line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="${COLORS.dialNeedle}" stroke-width="3" stroke-linecap="round"/>`;
  svg += `<circle cx="${cx}" cy="${cy}" r="4" fill="${COLORS.dialEdge}"/>`;
  // Numeric readout.
  svg += `<text x="${cx}" y="${cy + 20}" font-size="14" fill="${COLORS.text}" text-anchor="middle" font-weight="700">${fmt(value, 1)} ${unit}</text>`;
  svg += `<text x="${cx}" y="${cy + 36}" font-size="11" fill="${COLORS.textMuted}" text-anchor="middle">${label}</text>`;
  return svg;
}

function speedGraph(vFn, profile, t) {
  const tMax = profile.tMax, vMax = profile.vMax;
  let svg = '';
  // Box + grid.
  svg += `<rect x="${G1.x}" y="${G1.y}" width="${G1.w}" height="${G1.h}" fill="white" stroke="${COLORS.axis}" stroke-width="1.5"/>`;
  // Curve.
  let d = `M ${projT(0, G1, tMax)} ${projY(vFn(0), G1, 0, vMax)}`;
  const N = 240;
  for (let i = 1; i <= N; i++) {
    const tt = (i / N) * tMax;
    d += ` L ${projT(tt, G1, tMax)} ${projY(vFn(tt), G1, 0, vMax)}`;
  }
  svg += `<path d="${d}" fill="none" stroke="${COLORS.speedCurve}" stroke-width="2.5"/>`;
  // Fill area up to t — the integral.
  let fillD = `M ${projT(0, G1, tMax)} ${projY(0, G1, 0, vMax)}`;
  const Nf = 200;
  for (let i = 0; i <= Nf; i++) {
    const tt = (i / Nf) * Math.min(t, tMax);
    fillD += ` L ${projT(tt, G1, tMax)} ${projY(vFn(tt), G1, 0, vMax)}`;
  }
  fillD += ` L ${projT(Math.min(t, tMax), G1, tMax)} ${projY(0, G1, 0, vMax)} Z`;
  svg += `<path d="${fillD}" fill="${COLORS.speedFill}" opacity="0.7"/>`;
  // Current vertical marker.
  const tt = Math.min(t, tMax);
  const X = projT(tt, G1, tMax);
  svg += `<line x1="${X}" y1="${G1.y}" x2="${X}" y2="${G1.y + G1.h}" stroke="${COLORS.marker}" stroke-width="1.5"/>`;
  svg += `<circle cx="${X}" cy="${projY(vFn(tt), G1, 0, vMax)}" r="5" fill="${COLORS.speedCurve}" stroke="white" stroke-width="2"/>`;
  // Y axis labels.
  for (const v of [0, vMax / 2, vMax]) {
    const Y = projY(v, G1, 0, vMax);
    svg += `<text x="${G1.x - 6}" y="${Y + 4}" font-size="11" fill="${COLORS.textMuted}" text-anchor="end">${fmt(v, 0)}</text>`;
  }
  svg += `<text x="${G1.x + G1.w / 2}" y="${G1.y - 6}" font-size="12" fill="${COLORS.text}" text-anchor="middle" font-weight="600">speed v(t)  —  shaded area = distance traveled</text>`;
  return svg;
}

function distGraph(vFn, F, dt, samples, profile, t) {
  const tMax = profile.tMax;
  const sMax = F[samples];
  let svg = '';
  svg += `<rect x="${G2.x}" y="${G2.y}" width="${G2.w}" height="${G2.h}" fill="white" stroke="${COLORS.axis}" stroke-width="1.5"/>`;
  // Distance curve s(t) = ∫₀ᵗ v.
  let d = `M ${projT(0, G2, tMax)} ${projY(0, G2, 0, sMax)}`;
  const N = 240;
  for (let i = 1; i <= N; i++) {
    const tt = (i / N) * tMax;
    d += ` L ${projT(tt, G2, tMax)} ${projY(lookup(F, dt, samples, tt), G2, 0, sMax)}`;
  }
  svg += `<path d="${d}" fill="none" stroke="${COLORS.distCurve}" stroke-width="2.5"/>`;
  // Current point + tangent.
  const tt = Math.min(t, tMax);
  const X = projT(tt, G2, tMax);
  const s = lookup(F, dt, samples, tt);
  const Y = projY(s, G2, 0, sMax);
  svg += `<line x1="${X}" y1="${G2.y}" x2="${X}" y2="${G2.y + G2.h}" stroke="${COLORS.marker}" stroke-width="1.5"/>`;
  // Tangent: slope = v(tt). Draw a short line segment with that slope.
  const slope = vFn(tt);
  const halfWidthT = tMax * 0.06;
  const tA = Math.max(0, tt - halfWidthT);
  const tB = Math.min(tMax, tt + halfWidthT);
  const sA = s - slope * (tt - tA);
  const sB = s + slope * (tB - tt);
  svg += `<line x1="${projT(tA, G2, tMax)}" y1="${projY(sA, G2, 0, sMax)}" x2="${projT(tB, G2, tMax)}" y2="${projY(sB, G2, 0, sMax)}" stroke="${COLORS.tangent}" stroke-width="2.5"/>`;
  svg += `<circle cx="${X}" cy="${Y}" r="5" fill="${COLORS.distCurve}" stroke="white" stroke-width="2"/>`;
  // Y axis labels.
  for (const v of [0, sMax / 2, sMax]) {
    const Y2 = projY(v, G2, 0, sMax);
    svg += `<text x="${G2.x - 6}" y="${Y2 + 4}" font-size="11" fill="${COLORS.textMuted}" text-anchor="end">${fmt(v, 0)}</text>`;
  }
  // X labels (time) — shared with speed graph but draw on lower graph.
  for (let i = 0; i <= profile.tMax; i += 2) {
    const X2 = projT(i, G2, tMax);
    svg += `<text x="${X2}" y="${G2.y + G2.h + 16}" font-size="11" fill="${COLORS.textMuted}" text-anchor="middle">${i}</text>`;
  }
  svg += `<text x="${G2.x + G2.w / 2}" y="${G2.y - 6}" font-size="12" fill="${COLORS.text}" text-anchor="middle" font-weight="600">distance s(t)  —  red slope = current speed</text>`;
  svg += `<text x="${G2.x + G2.w / 2}" y="${G2.y + G2.h + 32}" font-size="11" fill="${COLORS.textMuted}" text-anchor="middle" font-style="italic">time (seconds)</text>`;
  return svg;
}

export function mountSpeedoOdo(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = {
    profile: cfg.profile,
    t: 0,
    running: cfg.running,
    lastTs: null,
  };

  // Build profile buttons.
  const tabs = Object.entries(PROFILES).map(([k, p]) =>
    `<button type="button" data-so-prof="${k}" class="so-tab${k === state.profile ? ' active' : ''}">${p.label}</button>`
  ).join('');

  target.innerHTML = `
    <div class="so-wrap">
      <svg class="so-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Speed and distance simultaneously">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-so-road></g>
        <g data-so-dials></g>
        <g data-so-speed></g>
        <g data-so-dist></g>
      </svg>
      <div class="so-controls">
        <div class="so-row">
          <button type="button" data-so-toggle class="so-btn">${state.running ? 'Pause' : 'Play'}</button>
          <button type="button" data-so-reset class="so-btn so-btn-light">Reset</button>
        </div>
        <div class="so-row">
          <label>Trip</label>
          <div class="so-tabs">${tabs}</div>
        </div>
        <div class="so-note">Top graph: speed at each instant. <strong>Shaded area</strong> up to time $t$ = total distance — that's an <em>integral</em>. Bottom graph: cumulative distance. <strong>Red slope</strong> at $t$ = current speed — that's a <em>derivative</em>. Two graphs, one motion, two directions of the Fundamental Theorem.</div>
      </div>
    </div>
  `;

  const gRoad = target.querySelector('[data-so-road]');
  const gDials = target.querySelector('[data-so-dials]');
  const gSpeed = target.querySelector('[data-so-speed]');
  const gDist = target.querySelector('[data-so-dist]');

  let cache = null;
  function reload() {
    const profile = PROFILES[state.profile];
    cache = { profile, ...integrate(profile.v, profile.tMax) };
  }
  reload();

  function render() {
    const { profile, F, dt, samples, total } = cache;
    const tt = Math.min(state.t, profile.tMax);
    const v = profile.v(tt);
    const s = lookup(F, dt, samples, tt);
    gRoad.innerHTML = roadAndCar(s, total);
    gDials.innerHTML = ''; // dials drawn inline-stacked, see below
    // Add two dials beside the road (right-side region).
    const dialsSvg = dial(SVG_W - 90, ROAD.y + ROAD.h + 24, 24, v, profile.vMax, 'speedometer', 'm/s')
      + dial(SVG_W - 90, ROAD.y + ROAD.h + 82, 24, s, total, 'odometer', 'm');
    gDials.innerHTML = dialsSvg;
    gSpeed.innerHTML = speedGraph(profile.v, profile, tt);
    gDist.innerHTML = distGraph(profile.v, F, dt, samples, profile, tt);
  }
  render();

  let rafId = null;
  function step(ts) {
    if (state.lastTs == null) state.lastTs = ts;
    const dt = (ts - state.lastTs) / 1000;
    state.lastTs = ts;
    if (state.running) {
      state.t += dt;
      const tMax = cache.profile.tMax;
      if (state.t >= tMax) {
        state.t = tMax;
        state.running = false;
        const btn = target.querySelector('[data-so-toggle]');
        if (btn) btn.textContent = 'Play';
      }
      render();
    }
    rafId = requestAnimationFrame(step);
  }
  rafId = requestAnimationFrame(step);

  target.querySelector('[data-so-toggle]').addEventListener('click', (e) => {
    if (state.t >= cache.profile.tMax) state.t = 0;
    state.running = !state.running;
    state.lastTs = null;
    e.target.textContent = state.running ? 'Pause' : 'Play';
  });
  target.querySelector('[data-so-reset]').addEventListener('click', () => {
    state.t = 0;
    state.lastTs = null;
    render();
  });
  target.querySelectorAll('[data-so-prof]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.profile = btn.dataset.soProf;
      state.t = 0;
      state.lastTs = null;
      reload();
      target.querySelectorAll('[data-so-prof]').forEach((b) => b.classList.toggle('active', b === btn));
      render();
    });
  });

  // Cleanup.
  const observer = new MutationObserver(() => {
    if (!document.body.contains(target)) {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
