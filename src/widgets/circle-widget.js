import katex from 'katex';

// Circle widget. Slider for radius. Optional sector (with angle slider).
// Live readout of diameter, circumference, area, and (when enabled) sector
// angle, arc length, and sector area.

const SVG_W = 460;
const SVG_H = 420;
const CX = 230;
const CY = 220;

const COLORS = {
  fill: '#eef2ff',
  stroke: '#4f46e5',
  radius: '#dc2626',
  diameter: '#16a34a',
  sector: '#fcd34d',
  sectorStroke: '#b45309',
  center: '#1e293b',
  text: '#1e293b',
  bg: '#fafbfc',
};

const DEFAULTS = {
  initialRadius: 5,
  minRadius: 1,
  maxRadius: 10,
  showSector: false,
  initialSectorAngle: 90,
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

function buildSvg(state, showSector) {
  const PX_PER_UNIT = 14;
  const r = state.radius * PX_PER_UNIT;
  let svg = '';

  // Sector wedge (if enabled, drawn first so it sits behind the circle outline)
  if (showSector) {
    const ang = state.sectorAngle;
    const angRad = (ang * Math.PI) / 180;
    const x2 = CX + r * Math.cos(-angRad);
    const y2 = CY + r * Math.sin(-angRad);
    const largeArc = ang > 180 ? 1 : 0;
    svg += `<path d="M ${CX} ${CY} L ${CX + r} ${CY} A ${r} ${r} 0 ${largeArc} 0 ${x2} ${y2} Z" fill="${COLORS.sector}" fill-opacity="0.7" stroke="${COLORS.sectorStroke}" stroke-width="1.5"/>`;
  }

  // Full circle
  svg += `<circle cx="${CX}" cy="${CY}" r="${r}" fill="${showSector ? 'none' : COLORS.fill}" stroke="${COLORS.stroke}" stroke-width="2.5"/>`;

  // Diameter (horizontal through center)
  svg += `<line x1="${CX - r}" y1="${CY}" x2="${CX + r}" y2="${CY}" stroke="${COLORS.diameter}" stroke-width="2" stroke-dasharray="6 4"/>`;
  svg += `<text x="${CX}" y="${CY + 16}" font-size="12" fill="${COLORS.diameter}" text-anchor="middle" font-weight="600">d = ${fmt(2 * state.radius)}</text>`;

  // Radius from center to right
  svg += `<line x1="${CX}" y1="${CY}" x2="${CX + r}" y2="${CY - 0.001}" stroke="${COLORS.radius}" stroke-width="2.5"/>`;
  svg += `<text x="${CX + r / 2}" y="${CY - 8}" font-size="12" fill="${COLORS.radius}" text-anchor="middle" font-weight="700">r = ${fmt(state.radius)}</text>`;

  // Center dot
  svg += `<circle cx="${CX}" cy="${CY}" r="3.5" fill="${COLORS.center}"/>`;

  return svg;
}

export function mountCircleWidget(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = { radius: cfg.initialRadius, sectorAngle: cfg.initialSectorAngle };
  const showSector = !!cfg.showSector;

  const sectorControl = showSector ? `
    <div class="cw-row">
      <label>sector angle</label>
      <input type="range" data-cw-sector min="0" max="360" step="5" value="${state.sectorAngle}"/>
      <span class="val" data-cw-sectorval>${state.sectorAngle}°</span>
    </div>
  ` : '';

  target.innerHTML = `
    <div class="cw-wrap">
      <svg class="cw-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Circle">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-cw-svg></g>
      </svg>
      <div class="cw-controls">
        <div class="cw-readout" data-cw-readout></div>
        <div class="cw-row">
          <label>radius <em>r</em></label>
          <input type="range" data-cw-r min="${cfg.minRadius}" max="${cfg.maxRadius}" step="0.5" value="${state.radius}"/>
          <span class="val" data-cw-rval>${fmt(state.radius)}</span>
        </div>
        ${sectorControl}
      </div>
    </div>
  `;

  const svgG = target.querySelector('[data-cw-svg]');
  const readoutBox = target.querySelector('[data-cw-readout]');

  function render() {
    svgG.innerHTML = buildSvg(state, showSector);
    const r = state.radius;
    const d = 2 * r;
    const circ = 2 * Math.PI * r;
    const area = Math.PI * r * r;
    let html = '';
    html += `<div class="cw-readout-row"><span>diameter</span><strong>$d = 2r = ${fmt(d)}$</strong></div>`;
    html += `<div class="cw-readout-row"><span>circumference</span><strong>$C = 2\\pi r = ${fmt(circ)}$</strong></div>`;
    html += `<div class="cw-readout-row"><span>area</span><strong>$A = \\pi r^2 = ${fmt(area)}$</strong></div>`;
    if (showSector) {
      const ang = state.sectorAngle;
      const arcLen = (ang / 360) * circ;
      const sectorArea = (ang / 360) * area;
      html += `<div class="cw-readout-row"><span>arc length</span><strong>$\\dfrac{${ang}}{360} \\cdot C = ${fmt(arcLen)}$</strong></div>`;
      html += `<div class="cw-readout-row"><span>sector area</span><strong>$\\dfrac{${ang}}{360} \\cdot A = ${fmt(sectorArea)}$</strong></div>`;
    }
    readoutBox.innerHTML = html.replace(/\$([^$]+)\$/g, (_, t) => tex(t));
  }

  render();
  target.querySelector('[data-cw-r]').addEventListener('input', (e) => {
    state.radius = parseFloat(e.target.value);
    target.querySelector('[data-cw-rval]').textContent = fmt(state.radius);
    render();
  });
  if (showSector) {
    target.querySelector('[data-cw-sector]').addEventListener('input', (e) => {
      state.sectorAngle = parseInt(e.target.value, 10);
      target.querySelector('[data-cw-sectorval]').textContent = `${state.sectorAngle}°`;
      render();
    });
  }
}
