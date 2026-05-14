import katex from 'katex';

// Unit circle widget. Modes:
//   default       circle with angle, point P = (cos θ, sin θ), projections onto axes.
//   with-wave     above PLUS a linked sine-or-cosine wave plot with the current θ marked.
//
// Config:
//   mode: 'default' | 'with-wave'
//   curve: 'sin' | 'cos' (only used in with-wave)
//   initialAngle: degrees (0..360)
//   showArcLength: boolean — highlights arc from 0 to θ in red (= θ when read in radians).
//   step: slider step in degrees

const SVG_H = 460;
const CY = 230;
const COLORS = {
  circle: '#94a3b8',
  axis: '#cbd5e1',
  radius: '#4f46e5',
  point: '#4f46e5',
  cos: '#10b981',
  sin: '#7c3aed',
  arc: '#ef4444',
  wave: '#4f46e5',
  waveCos: '#10b981',
  text: '#475569',
  special: '#94a3b8',
};

const DEFAULTS = {
  mode: 'default',
  curve: 'sin',
  initialAngle: 30,
  showArcLength: false,
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

// Format a degree value to its closest "pretty" radian fraction of π, if it's a special angle.
function radTex(deg) {
  // Map common angles to nice fractions.
  const reduced = ((deg % 360) + 360) % 360;
  const map = {
    0: '0', 30: '\\dfrac{\\pi}{6}', 45: '\\dfrac{\\pi}{4}', 60: '\\dfrac{\\pi}{3}',
    90: '\\dfrac{\\pi}{2}', 120: '\\dfrac{2\\pi}{3}', 135: '\\dfrac{3\\pi}{4}', 150: '\\dfrac{5\\pi}{6}',
    180: '\\pi', 210: '\\dfrac{7\\pi}{6}', 225: '\\dfrac{5\\pi}{4}', 240: '\\dfrac{4\\pi}{3}',
    270: '\\dfrac{3\\pi}{2}', 300: '\\dfrac{5\\pi}{3}', 315: '\\dfrac{7\\pi}{4}', 330: '\\dfrac{11\\pi}{6}',
  };
  if (map[reduced] !== undefined) return map[reduced];
  return `${fmt((reduced * Math.PI) / 180, 3)}`;
}

function drawCircle(state, layout) {
  const { CX, R } = layout;
  const angleDeg = state.angle;
  const rad = (angleDeg * Math.PI) / 180;
  const px = CX + R * Math.cos(rad);
  const py = CY - R * Math.sin(rad);

  let svg = '';

  // Axes
  const axL = CX - R - 30;
  const axR = CX + R + 30;
  const axT = CY - R - 30;
  const axB = CY + R + 30;
  svg += `<line x1="${axL}" y1="${CY}" x2="${axR}" y2="${CY}" stroke="${COLORS.axis}" stroke-width="1.5"/>`;
  svg += `<line x1="${CX}" y1="${axT}" x2="${CX}" y2="${axB}" stroke="${COLORS.axis}" stroke-width="1.5"/>`;
  svg += `<text x="${axR + 4}" y="${CY + 4}" font-size="11" fill="${COLORS.text}">x</text>`;
  svg += `<text x="${CX + 4}" y="${axT - 4}" font-size="11" fill="${COLORS.text}">y</text>`;
  svg += `<text x="${CX + R + 2}" y="${CY + 14}" font-size="10" fill="${COLORS.text}">1</text>`;
  svg += `<text x="${CX - R - 12}" y="${CY + 14}" font-size="10" fill="${COLORS.text}">-1</text>`;
  svg += `<text x="${CX + 4}" y="${CY - R + 4}" font-size="10" fill="${COLORS.text}">1</text>`;
  svg += `<text x="${CX + 4}" y="${CY + R + 4}" font-size="10" fill="${COLORS.text}">-1</text>`;

  // Unit circle
  svg += `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${COLORS.circle}" stroke-width="1.5"/>`;

  // Special angle ticks
  const specials = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
  for (const d of specials) {
    const r = (d * Math.PI) / 180;
    const x1 = CX + (R - 5) * Math.cos(r);
    const y1 = CY - (R - 5) * Math.sin(r);
    const x2 = CX + R * Math.cos(r);
    const y2 = CY - R * Math.sin(r);
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${COLORS.special}" stroke-width="1"/>`;
  }

  // Optional arc length highlight (= θ in radians on a unit circle)
  if (state.showArcLength && angleDeg > 0) {
    const startX = CX + R;
    const startY = CY;
    const largeArc = angleDeg > 180 ? 1 : 0;
    svg += `<path d="M ${startX} ${startY} A ${R} ${R} 0 ${largeArc} 0 ${px} ${py}" stroke="${COLORS.arc}" stroke-width="3" fill="none"/>`;
  }

  // Inner angle arc (always shown)
  const arcR = 28;
  const arcEndX = CX + arcR * Math.cos(rad);
  const arcEndY = CY - arcR * Math.sin(rad);
  if (angleDeg > 0) {
    const largeArc = angleDeg > 180 ? 1 : 0;
    svg += `<path d="M ${CX + arcR} ${CY} A ${arcR} ${arcR} 0 ${largeArc} 0 ${arcEndX} ${arcEndY}" stroke="${COLORS.arc}" stroke-width="2" fill="none"/>`;
  }

  // Projections (sin = vertical from P down to x-axis; cos = horizontal from origin to P-foot)
  // Horizontal segment along x-axis from origin to (px, CY) — represents cos θ
  svg += `<line x1="${CX}" y1="${CY}" x2="${px}" y2="${CY}" stroke="${COLORS.cos}" stroke-width="3.5"/>`;
  // Vertical segment from (px, CY) up/down to P — represents sin θ
  svg += `<line x1="${px}" y1="${CY}" x2="${px}" y2="${py}" stroke="${COLORS.sin}" stroke-width="3.5"/>`;

  // Radius
  svg += `<line x1="${CX}" y1="${CY}" x2="${px}" y2="${py}" stroke="${COLORS.radius}" stroke-width="2"/>`;

  // Point P
  svg += `<circle cx="${px}" cy="${py}" r="7" fill="${COLORS.point}" stroke="white" stroke-width="2" data-uc-handle style="cursor:grab"/>`;

  // Coordinates label
  const labelOffset = px > CX ? 14 : -14;
  const labelAnchor = px > CX ? 'start' : 'end';
  svg += `<text x="${px + labelOffset}" y="${py - 12}" font-size="13" fill="${COLORS.point}" text-anchor="${labelAnchor}" font-weight="500">(${fmt(Math.cos(rad), 2)}, ${fmt(Math.sin(rad), 2)})</text>`;

  return { svg, point: { x: px, y: py }, rad };
}

function drawWave(state, layout) {
  const { WAVE_LEFT, WAVE_W, WAVE_AMP } = layout;
  const angleDeg = state.angle;
  const curve = state.curve === 'cos' ? Math.cos : Math.sin;
  const color = state.curve === 'cos' ? COLORS.waveCos : COLORS.wave;

  const ax = (deg) => WAVE_LEFT + (deg / 360) * WAVE_W;
  const ay = (val) => CY - val * WAVE_AMP;

  let svg = '';

  // Axes
  svg += `<line x1="${WAVE_LEFT}" y1="${CY}" x2="${WAVE_LEFT + WAVE_W}" y2="${CY}" stroke="${COLORS.axis}" stroke-width="1.5"/>`;
  svg += `<line x1="${WAVE_LEFT}" y1="${CY - WAVE_AMP - 10}" x2="${WAVE_LEFT}" y2="${CY + WAVE_AMP + 10}" stroke="${COLORS.axis}" stroke-width="1.5"/>`;
  // x-ticks at 90, 180, 270, 360
  for (const d of [90, 180, 270, 360]) {
    const x = ax(d);
    svg += `<line x1="${x}" y1="${CY - 4}" x2="${x}" y2="${CY + 4}" stroke="${COLORS.special}" stroke-width="1"/>`;
    svg += `<text x="${x}" y="${CY + 18}" font-size="10" fill="${COLORS.text}" text-anchor="middle">${d}°</text>`;
  }
  // y-ticks
  svg += `<text x="${WAVE_LEFT - 6}" y="${ay(1) + 4}" font-size="10" fill="${COLORS.text}" text-anchor="end">1</text>`;
  svg += `<text x="${WAVE_LEFT - 6}" y="${ay(-1) + 4}" font-size="10" fill="${COLORS.text}" text-anchor="end">-1</text>`;

  // Wave path
  let path = '';
  for (let d = 0; d <= 360; d += 1) {
    const x = ax(d);
    const y = ay(curve((d * Math.PI) / 180));
    path += (d === 0 ? 'M' : 'L') + ` ${x} ${y} `;
  }
  svg += `<path d="${path}" stroke="${color}" stroke-width="2.5" fill="none"/>`;

  // Current angle marker on wave
  const x = ax(angleDeg);
  const y = ay(curve((angleDeg * Math.PI) / 180));
  svg += `<line x1="${x}" y1="${CY - WAVE_AMP - 5}" x2="${x}" y2="${CY + WAVE_AMP + 5}" stroke="${COLORS.special}" stroke-width="1" stroke-dasharray="3 3"/>`;
  svg += `<circle cx="${x}" cy="${y}" r="6" fill="${color}" stroke="white" stroke-width="2"/>`;

  return { svg, wavePoint: { x, y } };
}

function drawConnector(circlePoint, wavePoint) {
  // Dotted horizontal line from circle point to wave point at the same y.
  return `<line x1="${circlePoint.x}" y1="${circlePoint.y}" x2="${wavePoint.x}" y2="${wavePoint.y}" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="3 3"/>`;
}

function buildSvg(state, layout) {
  const circle = drawCircle(state, layout);
  let svg = circle.svg;
  if (state.mode === 'with-wave') {
    const wave = drawWave(state, layout);
    svg += wave.svg;
    svg += drawConnector(circle.point, wave.wavePoint);
  }
  return svg;
}

function readouts(state) {
  const rad = (state.angle * Math.PI) / 180;
  const sinV = Math.sin(rad);
  const cosV = Math.cos(rad);
  const tanV = Math.abs(Math.cos(rad)) < 1e-10 ? null : Math.tan(rad);

  const angleTex = state.angle % 1 === 0
    ? `${state.angle}°`
    : `${fmt(state.angle, 1)}°`;
  const radDisplay = radTex(state.angle);

  let html = `
    <div class="uc-readout">
      <div class="uc-readout-row"><span>angle</span><strong>${angleTex} = ${tex(radDisplay)} rad</strong></div>
      <div class="uc-readout-row"><span style="color:${COLORS.cos}">cos θ (x-coord)</span><strong>${fmt(cosV)}</strong></div>
      <div class="uc-readout-row"><span style="color:${COLORS.sin}">sin θ (y-coord)</span><strong>${fmt(sinV)}</strong></div>
      <div class="uc-readout-row"><span>tan θ</span><strong>${tanV === null ? 'undefined' : fmt(tanV)}</strong></div>
    </div>
  `;
  if (state.showArcLength) {
    html += `<div class="uc-helper">The red arc has length <strong>${fmt(rad, 3)}</strong> — that's exactly θ measured in <em>radians</em>. Arc length on a unit circle equals the angle in radians.</div>`;
  }
  return html;
}

export function mountUnitCircle(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = {
    angle: cfg.initialAngle,
    mode: cfg.mode,
    curve: cfg.curve,
    showArcLength: cfg.showArcLength,
  };

  const showWave = state.mode === 'with-wave';
  const SVG_W = showWave ? 900 : 460;
  const layout = showWave
    ? { CX: 200, R: 130, WAVE_LEFT: 420, WAVE_W: 440, WAVE_AMP: 130 }
    : { CX: 230, R: 160 };

  const curveSwitch = showWave
    ? `
      <div class="uc-row">
        <label>show</label>
        <div class="uc-tabs">
          <button class="${state.curve === 'sin' ? 'active' : ''}" data-uc-curve="sin">sin θ</button>
          <button class="${state.curve === 'cos' ? 'active' : ''}" data-uc-curve="cos">cos θ</button>
        </div>
      </div>`
    : '';

  target.innerHTML = `
    <div class="uc-wrap">
      <svg class="uc-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Unit circle">
        <g data-uc-svg></g>
      </svg>
      <div class="uc-controls">
        <div data-uc-readouts></div>
        <div class="uc-row">
          <label>angle <em>θ</em></label>
          <input type="range" data-uc-angle min="0" max="360" step="${cfg.step}" value="${state.angle}"/>
          <span class="val" data-uc-angleval>${state.angle}°</span>
        </div>
        ${curveSwitch}
        <div class="uc-helper">${showWave ? 'Drag the slider or the point on the circle. The wave traces the y-coordinate (or x-coordinate) of the point as θ sweeps around.' : 'Drag the point around the circle, or use the slider. Tick marks show common angles.'}</div>
      </div>
    </div>
  `;

  const svgEl = target.querySelector('svg');
  const svgG = target.querySelector('[data-uc-svg]');
  const readoutsEl = target.querySelector('[data-uc-readouts]');

  function render() {
    svgG.innerHTML = buildSvg(state, layout);
    readoutsEl.innerHTML = readouts(state);
    bindDrag();
  }

  function bindDrag() {
    const handle = svgEl.querySelector('[data-uc-handle]');
    if (!handle) return;
    let dragging = false;
    handle.addEventListener('pointerdown', (e) => {
      dragging = true;
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const rect = svgEl.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * SVG_W;
      const py = ((e.clientY - rect.top) / rect.height) * SVG_H;
      const dx = px - layout.CX;
      const dy = -(py - CY);
      let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (deg < 0) deg += 360;
      state.angle = Math.round(deg);
      target.querySelector('[data-uc-angle]').value = state.angle;
      target.querySelector('[data-uc-angleval]').textContent = `${state.angle}°`;
      render();
    });
    handle.addEventListener('pointerup', (e) => {
      dragging = false;
      try { handle.releasePointerCapture(e.pointerId); } catch {}
    });
  }

  target.querySelector('[data-uc-angle]').addEventListener('input', (e) => {
    state.angle = parseInt(e.target.value, 10);
    target.querySelector('[data-uc-angleval]').textContent = `${state.angle}°`;
    render();
  });

  if (showWave) {
    target.querySelectorAll('[data-uc-curve]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.curve = btn.dataset.ucCurve;
        target.querySelectorAll('[data-uc-curve]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        render();
      });
    });
  }

  render();
}
