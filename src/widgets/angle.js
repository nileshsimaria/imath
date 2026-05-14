import katex from 'katex';

// Interactive angle: a vertex with two rays. Slider sets the angle (0-360°).
// Classifies as acute / right / obtuse / straight / reflex.

const SVG_W = 460;
const SVG_H = 380;
const CX = 230;
const CY = 220;
const R = 140;

const COLORS = {
  ray: '#475569',
  arc: '#4f46e5',
  vertex: '#1e293b',
  text: '#475569',
  bg: '#fafbfc',
};

const TYPE_COLORS = {
  acute: '#16a34a',
  right: '#7c3aed',
  obtuse: '#ea580c',
  straight: '#dc2626',
  reflex: '#0891b2',
};

const DEFAULTS = {
  initialAngle: 60,
  minAngle: 0,
  maxAngle: 360,
  step: 1,
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

function classify(angle) {
  if (angle === 0) return { name: 'zero angle', color: COLORS.text };
  if (angle < 90) return { name: 'acute', color: TYPE_COLORS.acute };
  if (angle === 90) return { name: 'right', color: TYPE_COLORS.right };
  if (angle < 180) return { name: 'obtuse', color: TYPE_COLORS.obtuse };
  if (angle === 180) return { name: 'straight', color: TYPE_COLORS.straight };
  if (angle < 360) return { name: 'reflex', color: TYPE_COLORS.reflex };
  return { name: 'full angle', color: COLORS.text };
}

function buildSvg(angle) {
  const rad = (angle * Math.PI) / 180;
  const x2 = CX + R * Math.cos(-rad);
  const y2 = CY + R * Math.sin(-rad);
  let svg = '';

  // Static reference ray (horizontal, to the right)
  svg += `<line x1="${CX}" y1="${CY}" x2="${CX + R}" y2="${CY}" stroke="${COLORS.ray}" stroke-width="2.5"/>`;
  // Rotating ray
  svg += `<line x1="${CX}" y1="${CY}" x2="${x2}" y2="${y2}" stroke="${COLORS.ray}" stroke-width="2.5"/>`;

  // Arc (counterclockwise from 0 to angle)
  if (angle > 0 && angle < 360) {
    const arcR = 50;
    const arcEndX = CX + arcR * Math.cos(-rad);
    const arcEndY = CY + arcR * Math.sin(-rad);
    const largeArc = angle > 180 ? 1 : 0;
    svg += `<path d="M ${CX + arcR} ${CY} A ${arcR} ${arcR} 0 ${largeArc} 0 ${arcEndX} ${arcEndY}" stroke="${COLORS.arc}" stroke-width="2.5" fill="${COLORS.arc}" fill-opacity="0.12"/>`;
  } else if (angle === 360) {
    svg += `<circle cx="${CX}" cy="${CY}" r="50" fill="${COLORS.arc}" fill-opacity="0.12" stroke="${COLORS.arc}" stroke-width="2"/>`;
  }

  // Right-angle square indicator at exactly 90°
  if (angle === 90) {
    svg += `<path d="M ${CX + 20} ${CY} L ${CX + 20} ${CY - 20} L ${CX} ${CY - 20}" stroke="${COLORS.arc}" stroke-width="1.5" fill="none"/>`;
  }

  // Vertex dot
  svg += `<circle cx="${CX}" cy="${CY}" r="4" fill="${COLORS.vertex}"/>`;

  // Angle label
  const labelRad = -rad / 2;
  const labelR = 78;
  const lx = CX + labelR * Math.cos(labelRad);
  const ly = CY + labelR * Math.sin(labelRad);
  svg += `<text x="${lx}" y="${ly}" font-size="16" fill="${COLORS.arc}" text-anchor="middle" dominant-baseline="middle" font-style="italic" font-weight="600">${angle}°</text>`;
  return svg;
}

export function mountAngle(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = { angle: cfg.initialAngle };

  target.innerHTML = `
    <div class="ang-wrap">
      <svg class="ang-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Angle">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-ang-svg></g>
      </svg>
      <div class="ang-controls">
        <div class="ang-readout" data-ang-readout></div>
        <div class="ang-row">
          <label>angle</label>
          <input type="range" data-ang-angle min="${cfg.minAngle}" max="${cfg.maxAngle}" step="${cfg.step}" value="${state.angle}"/>
          <span class="val" data-ang-angleval>${state.angle}°</span>
        </div>
        <div class="ang-helper">An <strong>acute</strong> angle is less than 90°. A <strong>right</strong> angle is exactly 90°. An <strong>obtuse</strong> angle is between 90° and 180°. A <strong>straight</strong> angle is 180°. A <strong>reflex</strong> angle is greater than 180°.</div>
      </div>
    </div>
  `;

  const svgG = target.querySelector('[data-ang-svg]');
  const readoutBox = target.querySelector('[data-ang-readout]');

  function render() {
    svgG.innerHTML = buildSvg(state.angle);
    const cls = classify(state.angle);
    const radians = ((state.angle * Math.PI) / 180);
    let html = '';
    html += `<div class="ang-readout-row"><span>type</span><strong style="color:${cls.color}">${cls.name}</strong></div>`;
    html += `<div class="ang-readout-row"><span>degrees</span><strong>${state.angle}°</strong></div>`;
    html += `<div class="ang-readout-row"><span>radians</span><strong>${fmt(radians, 3)}</strong></div>`;
    if (state.angle > 0 && state.angle <= 90) {
      html += `<div class="ang-readout-row"><span>complement</span><strong>${fmt(90 - state.angle)}°</strong></div>`;
    }
    if (state.angle > 0 && state.angle <= 180) {
      html += `<div class="ang-readout-row"><span>supplement</span><strong>${fmt(180 - state.angle)}°</strong></div>`;
    }
    readoutBox.innerHTML = html;
  }

  render();
  target.querySelector('[data-ang-angle]').addEventListener('input', (e) => {
    state.angle = parseInt(e.target.value, 10);
    target.querySelector('[data-ang-angleval]').textContent = `${state.angle}°`;
    render();
  });
}
