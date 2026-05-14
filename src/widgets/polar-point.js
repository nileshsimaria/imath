import katex from 'katex';

// Polar coordinate plane. Concentric circles for r-rings, radial lines every
// 30°. A point at (r, θ) drawn from the origin. Sliders for r and θ. Live
// readout shows polar and Cartesian forms.

const SVG_W = 460;
const SVG_H = 460;
const CX = 230;
const CY = 230;
const SCALE = 32; // pixels per unit r

const COLORS = {
  ring: '#e2e8f0',
  ringStrong: '#cbd5e1',
  axis: '#94a3b8',
  radial: '#eef2f7',
  point: '#4f46e5',
  ray: '#7c3aed',
  text: '#475569',
  bg: '#fafbfc',
};

const DEFAULTS = {
  initialR: 4,
  initialTheta: 60,
  maxR: 6,
  rStep: 0.5,
  thetaStep: 5,
};

const tex = (s) => {
  try { return katex.renderToString(s, { throwOnError: false }); }
  catch { return s; }
};

const fmt = (n, dp = 2) => {
  const v = Number(n);
  if (Math.abs(v) < 1e-10) return '0';
  return parseFloat(v.toFixed(dp)).toString();
};

function buildSvg(r, thetaDeg, maxR) {
  const thetaRad = (thetaDeg * Math.PI) / 180;
  let svg = '';

  // Concentric circles for r values
  for (let rr = 1; rr <= maxR; rr++) {
    const radius = rr * SCALE;
    svg += `<circle cx="${CX}" cy="${CY}" r="${radius}" fill="none" stroke="${rr === maxR ? COLORS.ringStrong : COLORS.ring}" stroke-width="1"/>`;
  }
  // Radial lines every 30°
  for (let d = 0; d < 360; d += 30) {
    const rad = (d * Math.PI) / 180;
    const x2 = CX + maxR * SCALE * Math.cos(-rad);
    const y2 = CY + maxR * SCALE * Math.sin(-rad);
    svg += `<line x1="${CX}" y1="${CY}" x2="${x2}" y2="${y2}" stroke="${COLORS.radial}" stroke-width="1"/>`;
  }
  // Cartesian axes (stronger)
  svg += `<line x1="${CX - maxR * SCALE}" y1="${CY}" x2="${CX + maxR * SCALE}" y2="${CY}" stroke="${COLORS.axis}" stroke-width="1.5"/>`;
  svg += `<line x1="${CX}" y1="${CY - maxR * SCALE}" x2="${CX}" y2="${CY + maxR * SCALE}" stroke="${COLORS.axis}" stroke-width="1.5"/>`;
  // r-ring labels along the positive x-axis
  for (let rr = 1; rr <= maxR; rr++) {
    svg += `<text x="${CX + rr * SCALE}" y="${CY + 14}" font-size="10" fill="#64748b" text-anchor="middle">${rr}</text>`;
  }

  // The point
  const px = CX + r * SCALE * Math.cos(-thetaRad);
  const py = CY + r * SCALE * Math.sin(-thetaRad);
  // Ray from origin to point
  svg += `<line x1="${CX}" y1="${CY}" x2="${px}" y2="${py}" stroke="${COLORS.ray}" stroke-width="2.5"/>`;
  // Angle arc
  if (thetaDeg > 0 && thetaDeg < 360) {
    const arcR = 28;
    const arcEndX = CX + arcR * Math.cos(-thetaRad);
    const arcEndY = CY + arcR * Math.sin(-thetaRad);
    const largeArc = thetaDeg > 180 ? 1 : 0;
    svg += `<path d="M ${CX + arcR} ${CY} A ${arcR} ${arcR} 0 ${largeArc} 0 ${arcEndX} ${arcEndY}" stroke="${COLORS.ray}" stroke-width="1.5" fill="none"/>`;
  }
  // Point dot
  svg += `<circle cx="${px}" cy="${py}" r="7" fill="${COLORS.point}" stroke="white" stroke-width="2"/>`;
  // Label
  svg += `<text x="${px + 10}" y="${py - 12}" font-size="13" fill="${COLORS.point}" font-weight="700">(${fmt(r)}, ${thetaDeg}°)</text>`;
  return svg;
}

export function mountPolarPoint(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = { r: cfg.initialR, theta: cfg.initialTheta };

  target.innerHTML = `
    <div class="pp-wrap">
      <svg class="pp-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Polar plane">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-pp-svg></g>
      </svg>
      <div class="pp-controls">
        <div class="pp-readout" data-pp-readout></div>
        <div class="pp-row">
          <label>r</label>
          <input type="range" data-pp-r min="0" max="${cfg.maxR}" step="${cfg.rStep}" value="${state.r}"/>
          <span class="val" data-pp-rval>${fmt(state.r)}</span>
        </div>
        <div class="pp-row">
          <label>θ (degrees)</label>
          <input type="range" data-pp-theta min="0" max="360" step="${cfg.thetaStep}" value="${state.theta}"/>
          <span class="val" data-pp-thetaval>${state.theta}°</span>
        </div>
        <div class="pp-helper">In polar coordinates, $r$ is the distance from the origin and $\\theta$ is the angle from the positive x-axis (counterclockwise).</div>
      </div>
    </div>
  `;

  const helperEl = target.querySelector('.pp-helper');
  if (helperEl) helperEl.innerHTML = helperEl.innerHTML.replace(/\$([^$]+)\$/g, (_, t) => tex(t));

  const svgG = target.querySelector('[data-pp-svg]');
  const readoutBox = target.querySelector('[data-pp-readout]');

  function render() {
    svgG.innerHTML = buildSvg(state.r, state.theta, cfg.maxR);
    const rad = (state.theta * Math.PI) / 180;
    const x = state.r * Math.cos(rad);
    const y = state.r * Math.sin(rad);
    let html = '';
    html += `<div class="pp-readout-row"><span>polar</span><strong>$(r, \\theta) = (${fmt(state.r)}, ${state.theta}°)$</strong></div>`;
    html += `<div class="pp-readout-row"><span>Cartesian</span><strong>$(x, y) = (${fmt(x)}, ${fmt(y)})$</strong></div>`;
    html += `<div class="pp-readout-row"><span>x = r cos θ</span><strong>${fmt(state.r)} \\cdot ${fmt(Math.cos(rad), 3)} = ${fmt(x)}</strong></div>`;
    html += `<div class="pp-readout-row"><span>y = r sin θ</span><strong>${fmt(state.r)} \\cdot ${fmt(Math.sin(rad), 3)} = ${fmt(y)}</strong></div>`;
    readoutBox.innerHTML = html.replace(/\$([^$]+)\$/g, (_, t) => tex(t));
  }

  render();
  ['r', 'theta'].forEach((k) => {
    target.querySelector(`[data-pp-${k}]`).addEventListener('input', (e) => {
      state[k] = parseFloat(e.target.value);
      const display = k === 'theta' ? `${state[k]}°` : fmt(state[k]);
      target.querySelector(`[data-pp-${k}val]`).textContent = display;
      render();
    });
  });
}
