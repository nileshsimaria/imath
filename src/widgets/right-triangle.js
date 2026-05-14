import katex from 'katex';

// Interactive right triangle. Slider sets angle θ; sides scale so the
// hypotenuse stays at the configured length. SOHCAHTOA readouts update live.

const SVG_W = 600;
const SVG_H = 380;
const COLORS = {
  hyp: '#4f46e5',
  adj: '#10b981',
  opp: '#7c3aed',
  angle: '#ef4444',
  text: '#1e293b',
  fill: '#eef2ff',
};

const DEFAULTS = {
  initialAngle: 30,
  hypotenuse: 10,
  minAngle: 5,
  maxAngle: 85,
  step: 1,
};

const tex = (s, display = false) => {
  try { return katex.renderToString(s, { throwOnError: false, displayMode: display }); }
  catch { return s; }
};

const fmt = (n, dp = 3) => {
  const v = Number(n);
  if (Math.abs(v) < 1e-10) return '0';
  return parseFloat(v.toFixed(dp)).toString();
};

function drawTriangle(angleDeg, hyp) {
  const rad = (angleDeg * Math.PI) / 180;
  const adj = hyp * Math.cos(rad);
  const opp = hyp * Math.sin(rad);

  const maxAdjPx = 420;
  const maxOppPx = 240;
  // Scale so the largest side fills its allowance.
  const scale = Math.min(maxAdjPx / Math.max(adj, 0.01), maxOppPx / Math.max(opp, 0.01));
  const pxAdj = adj * scale;
  const pxOpp = opp * scale;

  const padX = 80;
  const baseY = 320;
  const A = { x: padX, y: baseY };                     // angle θ here (bottom-left)
  const B = { x: padX + pxAdj, y: baseY };             // right angle here (bottom-right)
  const C = { x: padX + pxAdj, y: baseY - pxOpp };     // top-right

  const pathD = `M ${A.x} ${A.y} L ${B.x} ${B.y} L ${C.x} ${C.y} Z`;

  // Right-angle indicator
  const ra = 14;
  const raPath = `M ${B.x - ra} ${B.y} L ${B.x - ra} ${B.y - ra} L ${B.x} ${B.y - ra}`;

  // Angle θ arc
  const arcR = 36;
  const arcEndX = A.x + arcR * Math.cos(rad);
  const arcEndY = A.y - arcR * Math.sin(rad);
  const angleArc = `M ${A.x + arcR} ${A.y} A ${arcR} ${arcR} 0 0 0 ${arcEndX} ${arcEndY}`;

  // Label positions
  const adjMid = { x: (A.x + B.x) / 2, y: B.y + 22 };
  const oppMid = { x: B.x + 14, y: (B.y + C.y) / 2 };
  const hypMid = { x: (A.x + C.x) / 2 - 10, y: (A.y + C.y) / 2 - 10 };

  let svg = '';
  svg += `<path d="${pathD}" fill="${COLORS.fill}" stroke="none"/>`;
  svg += `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="${COLORS.adj}" stroke-width="3"/>`;
  svg += `<line x1="${B.x}" y1="${B.y}" x2="${C.x}" y2="${C.y}" stroke="${COLORS.opp}" stroke-width="3"/>`;
  svg += `<line x1="${A.x}" y1="${A.y}" x2="${C.x}" y2="${C.y}" stroke="${COLORS.hyp}" stroke-width="3"/>`;
  svg += `<path d="${raPath}" stroke="#64748b" stroke-width="1.5" fill="none"/>`;
  svg += `<path d="${angleArc}" stroke="${COLORS.angle}" stroke-width="2" fill="none"/>`;
  svg += `<text x="${A.x + arcR + 18}" y="${A.y - 14}" font-size="18" font-style="italic" fill="${COLORS.angle}" font-weight="500">θ = ${angleDeg}°</text>`;
  svg += `<text x="${adjMid.x}" y="${adjMid.y}" font-size="13" fill="${COLORS.adj}" text-anchor="middle" font-weight="500">adjacent = ${fmt(adj, 2)}</text>`;
  svg += `<text x="${oppMid.x}" y="${oppMid.y}" font-size="13" fill="${COLORS.opp}" text-anchor="start" dominant-baseline="middle" font-weight="500">opposite = ${fmt(opp, 2)}</text>`;
  svg += `<text x="${hypMid.x}" y="${hypMid.y}" font-size="13" fill="${COLORS.hyp}" text-anchor="end" dominant-baseline="middle" font-weight="500">hypotenuse = ${fmt(hyp, 2)}</text>`;

  return svg;
}

export function mountRightTriangle(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = { angle: cfg.initialAngle, hyp: cfg.hypotenuse };

  target.innerHTML = `
    <div class="rt-wrap">
      <svg class="rt-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Right triangle">
        <g data-rt-svg></g>
      </svg>
      <div class="rt-controls">
        <div class="rt-row">
          <label>angle <em>θ</em></label>
          <input type="range" data-rt-angle min="${cfg.minAngle}" max="${cfg.maxAngle}" step="${cfg.step}" value="${state.angle}"/>
          <span class="val" data-rt-angleval>${state.angle}°</span>
        </div>
        <div class="rt-formula" data-rt-sin></div>
        <div class="rt-formula" data-rt-cos></div>
        <div class="rt-formula" data-rt-tan></div>
        <div class="rt-helper">SOHCAHTOA — Sine = Opposite / Hypotenuse, Cosine = Adjacent / Hypotenuse, Tangent = Opposite / Adjacent.</div>
      </div>
    </div>
  `;

  const svgG = target.querySelector('[data-rt-svg]');
  const sinBox = target.querySelector('[data-rt-sin]');
  const cosBox = target.querySelector('[data-rt-cos]');
  const tanBox = target.querySelector('[data-rt-tan]');

  function render() {
    svgG.innerHTML = drawTriangle(state.angle, state.hyp);
    const rad = (state.angle * Math.PI) / 180;
    const sinV = Math.sin(rad);
    const cosV = Math.cos(rad);
    const tanV = Math.tan(rad);
    const opp = state.hyp * sinV;
    const adj = state.hyp * cosV;

    sinBox.innerHTML = tex(`\\sin\\theta = \\dfrac{\\text{opp}}{\\text{hyp}} = \\dfrac{${fmt(opp, 2)}}{${fmt(state.hyp, 2)}} = ${fmt(sinV)}`);
    cosBox.innerHTML = tex(`\\cos\\theta = \\dfrac{\\text{adj}}{\\text{hyp}} = \\dfrac{${fmt(adj, 2)}}{${fmt(state.hyp, 2)}} = ${fmt(cosV)}`);
    tanBox.innerHTML = tex(`\\tan\\theta = \\dfrac{\\text{opp}}{\\text{adj}} = \\dfrac{${fmt(opp, 2)}}{${fmt(adj, 2)}} = ${fmt(tanV)}`);
  }

  render();

  target.querySelector('[data-rt-angle]').addEventListener('input', (e) => {
    state.angle = parseInt(e.target.value, 10);
    target.querySelector('[data-rt-angleval]').textContent = `${state.angle}°`;
    render();
  });
}
