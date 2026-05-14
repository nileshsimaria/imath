import katex from 'katex';

// Two-vector addition. Vector u and v drawn from the origin; v is also drawn
// at the head of u (head-to-tail) and the resulting sum u + v is drawn from
// origin to the end of that translated v. Sliders for components.

const SVG_W = 540;
const SVG_H = 460;
const PAD = 30;
const SCALE = 28; // pixels per unit
const ORIGIN = { x: 270, y: 230 };

const COLORS = {
  u: '#4f46e5',
  v: '#10b981',
  sum: '#dc2626',
  axis: '#cbd5e1',
  axisStrong: '#94a3b8',
  grid: '#eef2f7',
  text: '#475569',
  bg: '#fafbfc',
};

const DEFAULTS = {
  ux: 3, uy: 1,
  vx: 1, vy: 3,
  range: [-6, 6],
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

const sx = (x) => ORIGIN.x + x * SCALE;
const sy = (y) => ORIGIN.y - y * SCALE;

function gridAndAxes() {
  let svg = '';
  for (let i = -7; i <= 7; i++) {
    const X = sx(i);
    const Y = sy(i);
    svg += `<line x1="${X}" y1="${PAD}" x2="${X}" y2="${SVG_H - PAD}" stroke="${i === 0 ? COLORS.axisStrong : COLORS.grid}" stroke-width="${i === 0 ? 1.5 : 1}"/>`;
    svg += `<line x1="${PAD}" y1="${Y}" x2="${SVG_W - PAD}" y2="${Y}" stroke="${i === 0 ? COLORS.axisStrong : COLORS.grid}" stroke-width="${i === 0 ? 1.5 : 1}"/>`;
  }
  for (let i = -6; i <= 6; i++) {
    if (i === 0 || i % 2 !== 0) continue;
    svg += `<text x="${sx(i)}" y="${sy(0) + 14}" font-size="11" fill="#64748b" text-anchor="middle">${i}</text>`;
    svg += `<text x="${sx(0) - 6}" y="${sy(i) + 4}" font-size="11" fill="#64748b" text-anchor="end">${i}</text>`;
  }
  return svg;
}

function vectorArrow(fromX, fromY, toX, toY, color, label, opacity = 1) {
  const id = `arrow-${color.replace('#', '')}-${Math.random().toString(36).slice(2, 6)}`;
  let svg = `<defs><marker id="${id}" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><polygon points="0 0, 7 3, 0 6" fill="${color}"/></marker></defs>`;
  svg += `<line x1="${sx(fromX)}" y1="${sy(fromY)}" x2="${sx(toX)}" y2="${sy(toY)}" stroke="${color}" stroke-width="3" marker-end="url(#${id})" opacity="${opacity}"/>`;
  if (label) {
    const mx = (fromX + toX) / 2;
    const my = (fromY + toY) / 2;
    svg += `<text x="${sx(mx) + 8}" y="${sy(my) - 8}" font-size="14" fill="${color}" font-style="italic" font-weight="700">${label}</text>`;
  }
  return svg;
}

export function mountVectorAdd(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = { ux: cfg.ux, uy: cfg.uy, vx: cfg.vx, vy: cfg.vy };

  target.innerHTML = `
    <div class="va-wrap">
      <svg class="va-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Vector addition">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-va-svg></g>
      </svg>
      <div class="va-controls">
        <div class="va-readout" data-va-readout></div>
        <div class="va-group" style="border-color:${COLORS.u}">
          <div class="va-group-title" style="color:${COLORS.u}">vector u</div>
          <div class="va-row">
            <label>x-component</label>
            <input type="range" data-va-ux min="${cfg.range[0]}" max="${cfg.range[1]}" step="${cfg.step}" value="${state.ux}"/>
            <span class="val" data-va-uxval>${state.ux}</span>
          </div>
          <div class="va-row">
            <label>y-component</label>
            <input type="range" data-va-uy min="${cfg.range[0]}" max="${cfg.range[1]}" step="${cfg.step}" value="${state.uy}"/>
            <span class="val" data-va-uyval>${state.uy}</span>
          </div>
        </div>
        <div class="va-group" style="border-color:${COLORS.v}">
          <div class="va-group-title" style="color:${COLORS.v}">vector v</div>
          <div class="va-row">
            <label>x-component</label>
            <input type="range" data-va-vx min="${cfg.range[0]}" max="${cfg.range[1]}" step="${cfg.step}" value="${state.vx}"/>
            <span class="val" data-va-vxval>${state.vx}</span>
          </div>
          <div class="va-row">
            <label>y-component</label>
            <input type="range" data-va-vy min="${cfg.range[0]}" max="${cfg.range[1]}" step="${cfg.step}" value="${state.vy}"/>
            <span class="val" data-va-vyval>${state.vy}</span>
          </div>
        </div>
        <div class="va-helper">The dashed arrow shows <strong>v</strong> drawn from the head of <strong>u</strong> — that's why the sum <strong style="color:${COLORS.sum}">u + v</strong> reaches the same endpoint. Add components to add vectors.</div>
      </div>
    </div>
  `;

  const svgG = target.querySelector('[data-va-svg]');
  const readoutBox = target.querySelector('[data-va-readout]');

  function render() {
    const { ux, uy, vx, vy } = state;
    const sumX = ux + vx;
    const sumY = uy + vy;
    let svg = gridAndAxes();
    // u from origin
    svg += vectorArrow(0, 0, ux, uy, COLORS.u, 'u');
    // v from origin (solid)
    svg += vectorArrow(0, 0, vx, vy, COLORS.v, 'v');
    // v from head of u (dashed-style — using opacity)
    svg += vectorArrow(ux, uy, sumX, sumY, COLORS.v, '', 0.5);
    // sum from origin
    svg += vectorArrow(0, 0, sumX, sumY, COLORS.sum, 'u + v');
    svgG.innerHTML = svg;

    const magU = Math.hypot(ux, uy);
    const magV = Math.hypot(vx, vy);
    const magSum = Math.hypot(sumX, sumY);
    const angU = (Math.atan2(uy, ux) * 180) / Math.PI;
    const angV = (Math.atan2(vy, vx) * 180) / Math.PI;
    const angSum = (Math.atan2(sumY, sumX) * 180) / Math.PI;

    let html = '';
    html += `<div class="va-readout-row"><span style="color:${COLORS.u}">u</span><strong>$\\langle ${ux}, ${uy} \\rangle$, $|\\mathbf{u}| = ${fmt(magU)}$, $\\theta = ${fmt(angU, 1)}°$</strong></div>`;
    html += `<div class="va-readout-row"><span style="color:${COLORS.v}">v</span><strong>$\\langle ${vx}, ${vy} \\rangle$, $|\\mathbf{v}| = ${fmt(magV)}$, $\\theta = ${fmt(angV, 1)}°$</strong></div>`;
    html += `<div class="va-readout-row"><span style="color:${COLORS.sum}">u + v</span><strong>$\\langle ${sumX}, ${sumY} \\rangle$, $|\\mathbf{u + v}| = ${fmt(magSum)}$</strong></div>`;
    readoutBox.innerHTML = html.replace(/\$([^$]+)\$/g, (_, t) => tex(t));
  }

  render();
  ['ux', 'uy', 'vx', 'vy'].forEach((k) => {
    target.querySelector(`[data-va-${k}]`).addEventListener('input', (e) => {
      state[k] = parseInt(e.target.value, 10);
      target.querySelector(`[data-va-${k}val]`).textContent = state[k];
      render();
    });
  });
}
