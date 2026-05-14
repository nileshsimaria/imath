// Modular-arithmetic clock face.
//
// A clock with N positions labeled 0, 1, 2, ..., N-1. A pointer can step
// around — adding moves clockwise, subtracting moves counter-clockwise.
// After each step the pointer's position is the answer mod N.
//
// Modes:
//   step       Pick a starting number and add another to it. Watch the
//              pointer walk around. After arriving, you can keep adding
//              (or subtracting) to chain operations. Highlights how
//              modular arithmetic "wraps around."
//   multiply   Pick a, b, and modulus N. Step pointer through a·b mod N
//              by adding a, b times.
//   table      Render an addition (or multiplication) table mod N.
//   caesar     Shift letters of a short message by k (mod 26) to encode
//              and decode. Demonstrates the Caesar cipher.
//
// Config:
//   N:          modulus (default 12, the classic clock)
//   mode:       one of the above (default 'step')
//   start, add: initial values for step mode

const SVG_W = 460;
const SVG_H = 380;

const COLORS = {
  bg: '#fafbfc',
  face: '#fef3c7',
  faceEdge: '#1e293b',
  tick: '#1e293b',
  numLabel: '#0f172a',
  pointer: '#dc2626',
  trail: 'rgba(220, 38, 38, 0.35)',
  startMarker: '#16a34a',
  text: '#0f172a',
  textMuted: '#64748b',
};

const DEFAULTS = {
  N: 12,
  mode: 'step',
  start: 9,
  add: 7,
};

const CENTER = { x: 200, y: 200 };
const RADIUS = 140;
const TICK_R = 154;
const LABEL_R = 124;

function fmt(n) { return Number(n).toString(); }

// Position on the clock circle. Position 0 is at top; positions advance
// clockwise. This matches what most people expect from a "clock at noon."
function posCoord(p, N) {
  const theta = -Math.PI / 2 + (p / N) * 2 * Math.PI;
  return [CENTER.x + RADIUS * Math.cos(theta), CENTER.y + RADIUS * Math.sin(theta)];
}

function drawClockFace(N, startVal, currentVal) {
  let svg = '';
  svg += `<circle cx="${CENTER.x}" cy="${CENTER.y}" r="${RADIUS}" fill="${COLORS.face}" stroke="${COLORS.faceEdge}" stroke-width="2.5"/>`;
  for (let p = 0; p < N; p++) {
    const theta = -Math.PI / 2 + (p / N) * 2 * Math.PI;
    const x1 = CENTER.x + (RADIUS - 6) * Math.cos(theta);
    const y1 = CENTER.y + (RADIUS - 6) * Math.sin(theta);
    const x2 = CENTER.x + RADIUS * Math.cos(theta);
    const y2 = CENTER.y + RADIUS * Math.sin(theta);
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${COLORS.tick}" stroke-width="1.5"/>`;
    const lx = CENTER.x + LABEL_R * Math.cos(theta);
    const ly = CENTER.y + LABEL_R * Math.sin(theta);
    const color = p === currentVal ? COLORS.pointer : (p === startVal ? COLORS.startMarker : COLORS.numLabel);
    const weight = p === currentVal || p === startVal ? 700 : 500;
    svg += `<text x="${lx}" y="${ly + 5}" font-size="14" fill="${color}" text-anchor="middle" font-weight="${weight}">${p}</text>`;
  }
  // Pointer arrow.
  const [px, py] = posCoord(currentVal, N);
  svg += `<line x1="${CENTER.x}" y1="${CENTER.y}" x2="${px}" y2="${py}" stroke="${COLORS.pointer}" stroke-width="3" stroke-linecap="round"/>`;
  svg += `<circle cx="${CENTER.x}" cy="${CENTER.y}" r="6" fill="${COLORS.faceEdge}"/>`;
  // Start marker dot.
  const [sx, sy] = posCoord(startVal, N);
  svg += `<circle cx="${sx}" cy="${sy}" r="6" fill="none" stroke="${COLORS.startMarker}" stroke-width="2.5"/>`;
  return svg;
}

function drawArcTrail(start, end, N) {
  // Trail showing the path from `start` to `end` going clockwise.
  if (start === end) return '';
  const steps = Math.abs((end - start + N) % N);
  if (steps === 0) return '';
  let d = '';
  const arcR = RADIUS + 18;
  const sTheta = -Math.PI / 2 + (start / N) * 2 * Math.PI;
  const eTheta = -Math.PI / 2 + ((start + steps) / N) * 2 * Math.PI;
  // Place each step as a tiny tick along the outer arc.
  let svg = '';
  for (let i = 0; i <= steps; i++) {
    const t = sTheta + (eTheta - sTheta) * (i / Math.max(1, steps));
    const x = CENTER.x + arcR * Math.cos(t);
    const y = CENTER.y + arcR * Math.sin(t);
    svg += `<circle cx="${x}" cy="${y}" r="3" fill="${COLORS.trail}"/>`;
  }
  // Big arc.
  const x0 = CENTER.x + arcR * Math.cos(sTheta);
  const y0 = CENTER.y + arcR * Math.sin(sTheta);
  const x1 = CENTER.x + arcR * Math.cos(eTheta);
  const y1 = CENTER.y + arcR * Math.sin(eTheta);
  const sweep = 1;
  const large = (Math.abs(eTheta - sTheta) > Math.PI) ? 1 : 0;
  svg += `<path d="M ${x0} ${y0} A ${arcR} ${arcR} 0 ${large} ${sweep} ${x1} ${y1}" fill="none" stroke="${COLORS.trail}" stroke-width="2"/>`;
  return svg;
}

function renderStep(state) {
  const N = state.N;
  const startVal = ((state.start % N) + N) % N;
  const currentVal = ((state.start + state.add) % N + N) % N;
  let svg = '';
  svg += drawArcTrail(startVal, currentVal, N);
  svg += drawClockFace(N, startVal, currentVal);
  return svg;
}

function renderTable(state) {
  // Render an addition table mod N as text/HTML (uses foreignObject for cell layout).
  // Keep N small (≤ 12) for legibility.
  const N = state.N;
  const cell = 28;
  const startX = 24, startY = 24;
  let svg = '';
  // Header row.
  for (let j = 0; j < N; j++) {
    svg += `<text x="${startX + (j + 1) * cell}" y="${startY + 10}" font-size="12" fill="${COLORS.textMuted}" text-anchor="middle" font-weight="700">${j}</text>`;
  }
  for (let i = 0; i < N; i++) {
    svg += `<text x="${startX + 6}" y="${startY + (i + 1) * cell + 10}" font-size="12" fill="${COLORS.textMuted}" text-anchor="start" font-weight="700">${i}</text>`;
    for (let j = 0; j < N; j++) {
      const v = state.op === 'multiply' ? (i * j) % N : (i + j) % N;
      const x = startX + (j + 1) * cell;
      const y = startY + (i + 1) * cell;
      const color = v === 0 ? COLORS.pointer : COLORS.numLabel;
      svg += `<rect x="${x - cell / 2 + 1}" y="${y - 2}" width="${cell - 2}" height="${cell - 2}" fill="white" stroke="#e2e8f0" stroke-width="1"/>`;
      svg += `<text x="${x}" y="${y + 13}" font-size="12" fill="${color}" text-anchor="middle">${v}</text>`;
    }
  }
  return svg;
}

function renderCaesar(state) {
  // Show a circle of letters A-Z with the shift applied.
  const N = 26;
  const k = ((state.shift % 26) + 26) % 26;
  let svg = '';
  svg += `<circle cx="${CENTER.x}" cy="${CENTER.y}" r="${RADIUS}" fill="${COLORS.face}" stroke="${COLORS.faceEdge}" stroke-width="2"/>`;
  svg += `<circle cx="${CENTER.x}" cy="${CENTER.y}" r="${RADIUS - 32}" fill="white" stroke="${COLORS.faceEdge}" stroke-width="1.5"/>`;
  for (let i = 0; i < N; i++) {
    const theta = -Math.PI / 2 + (i / N) * 2 * Math.PI;
    // Outer ring: plaintext letter A+i.
    const xo = CENTER.x + (RADIUS - 14) * Math.cos(theta);
    const yo = CENTER.y + (RADIUS - 14) * Math.sin(theta);
    svg += `<text x="${xo}" y="${yo + 4}" font-size="12" fill="${COLORS.text}" text-anchor="middle" font-weight="600">${String.fromCharCode(65 + i)}</text>`;
    // Inner ring: ciphertext letter A + ((i+k) mod 26).
    const ci = (i + k) % 26;
    const xi = CENTER.x + (RADIUS - 50) * Math.cos(theta);
    const yi = CENTER.y + (RADIUS - 50) * Math.sin(theta);
    svg += `<text x="${xi}" y="${yi + 4}" font-size="11" fill="${COLORS.pointer}" text-anchor="middle" font-weight="700">${String.fromCharCode(65 + ci)}</text>`;
  }
  svg += `<text x="${CENTER.x}" y="${CENTER.y - 8}" font-size="13" fill="${COLORS.textMuted}" text-anchor="middle">shift</text>`;
  svg += `<text x="${CENTER.x}" y="${CENTER.y + 10}" font-size="16" fill="${COLORS.pointer}" text-anchor="middle" font-weight="700">+${k}</text>`;
  return svg;
}

function caesarTransform(text, shift) {
  return text.split('').map(ch => {
    if (/[A-Z]/.test(ch)) {
      const i = ch.charCodeAt(0) - 65;
      return String.fromCharCode(65 + ((i + shift) % 26 + 26) % 26);
    }
    if (/[a-z]/.test(ch)) {
      const i = ch.charCodeAt(0) - 97;
      return String.fromCharCode(97 + ((i + shift) % 26 + 26) % 26);
    }
    return ch;
  }).join('');
}

export function mountModularClock(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = {
    mode: cfg.mode,
    N: cfg.N,
    start: cfg.start,
    add: cfg.add,
    op: 'add', // for table mode
    shift: 3,
    message: 'HELLO',
  };

  function buildControls() {
    const tabs = `
      <button type="button" class="mc-tab${state.mode === 'step' ? ' active' : ''}" data-mc-mode="step">Step</button>
      <button type="button" class="mc-tab${state.mode === 'table' ? ' active' : ''}" data-mc-mode="table">Table</button>
      <button type="button" class="mc-tab${state.mode === 'caesar' ? ' active' : ''}" data-mc-mode="caesar">Caesar Cipher</button>
    `;
    let modeControls = '';
    if (state.mode === 'step') {
      modeControls = `
        <div class="mc-row"><label>Modulus N</label><input type="range" data-mc-N min="3" max="24" step="1" value="${state.N}"/><span data-mc-Nval>${state.N}</span></div>
        <div class="mc-row"><label>Start</label><input type="range" data-mc-start min="0" max="${state.N - 1}" step="1" value="${Math.min(state.start, state.N - 1)}"/><span data-mc-startval>${((state.start % state.N) + state.N) % state.N}</span></div>
        <div class="mc-row"><label>Add</label><input type="range" data-mc-add min="-${state.N}" max="${2 * state.N}" step="1" value="${state.add}"/><span data-mc-addval>${state.add >= 0 ? '+' : ''}${state.add}</span></div>
      `;
    }
    if (state.mode === 'table') {
      modeControls = `
        <div class="mc-row"><label>Modulus N</label><input type="range" data-mc-N min="3" max="12" step="1" value="${state.N}"/><span data-mc-Nval>${state.N}</span></div>
        <div class="mc-row"><label>Operation</label>
          <button type="button" class="mc-tab${state.op === 'add' ? ' active' : ''}" data-mc-op="add">addition</button>
          <button type="button" class="mc-tab${state.op === 'multiply' ? ' active' : ''}" data-mc-op="multiply">multiplication</button>
        </div>
      `;
    }
    if (state.mode === 'caesar') {
      modeControls = `
        <div class="mc-row"><label>Shift</label><input type="range" data-mc-shift min="-25" max="25" step="1" value="${state.shift}"/><span data-mc-shiftval>${state.shift >= 0 ? '+' : ''}${state.shift}</span></div>
        <div class="mc-row"><label>Message</label><input type="text" data-mc-msg value="${state.message}" maxlength="24"/></div>
        <div class="mc-cipher" data-mc-cipher></div>
      `;
    }
    return `<div class="mc-tabs">${tabs}</div>${modeControls}`;
  }

  target.innerHTML = `
    <div class="mc-wrap">
      <svg class="mc-svg" viewBox="0 0 ${state.mode === 'table' ? 380 : SVG_W} ${SVG_H}" role="img" aria-label="Modular arithmetic clock">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-mc-stage></g>
      </svg>
      <div class="mc-controls" data-mc-controls></div>
      <div class="mc-readout" data-mc-readout></div>
    </div>
  `;

  const stage = target.querySelector('[data-mc-stage]');
  const controls = target.querySelector('[data-mc-controls]');
  const readout = target.querySelector('[data-mc-readout]');

  function render() {
    if (state.mode === 'step') {
      stage.innerHTML = renderStep(state);
      const startVal = ((state.start % state.N) + state.N) % state.N;
      const endVal = ((state.start + state.add) % state.N + state.N) % state.N;
      readout.innerHTML = `<strong>${startVal} + (${state.add}) ≡ ${endVal} (mod ${state.N})</strong>`;
    } else if (state.mode === 'table') {
      stage.innerHTML = renderTable(state);
      readout.innerHTML = `<strong>${state.op === 'multiply' ? 'Multiplication' : 'Addition'} table mod ${state.N}.</strong> Each entry = $(i\\;${state.op === 'multiply' ? '\\cdot' : '+'}\\;j)\\;\\bmod\\;${state.N}$.`;
    } else if (state.mode === 'caesar') {
      stage.innerHTML = renderCaesar(state);
      const enc = caesarTransform(state.message, state.shift);
      const cipherEl = target.querySelector('[data-mc-cipher]');
      if (cipherEl) cipherEl.innerHTML = `Plaintext: <code>${state.message}</code><br/>Ciphertext: <code>${enc}</code>`;
      readout.innerHTML = `<strong>Caesar shift by ${state.shift}.</strong> Each letter becomes the letter $${state.shift} \\bmod 26$ positions later in the alphabet.`;
    }
    bind();
  }

  function bind() {
    controls.innerHTML = buildControls();
    controls.querySelectorAll('[data-mc-mode]').forEach((btn) => {
      btn.addEventListener('click', () => { state.mode = btn.dataset.mcMode; render(); });
    });
    controls.querySelectorAll('[data-mc-op]').forEach((btn) => {
      btn.addEventListener('click', () => { state.op = btn.dataset.mcOp; render(); });
    });
    const N = controls.querySelector('[data-mc-N]');
    if (N) N.addEventListener('input', (e) => { state.N = +e.target.value; if (state.start >= state.N) state.start = state.N - 1; render(); });
    const start = controls.querySelector('[data-mc-start]');
    if (start) start.addEventListener('input', (e) => { state.start = +e.target.value; render(); });
    const add = controls.querySelector('[data-mc-add]');
    if (add) add.addEventListener('input', (e) => { state.add = +e.target.value; render(); });
    const shift = controls.querySelector('[data-mc-shift]');
    if (shift) shift.addEventListener('input', (e) => { state.shift = +e.target.value; render(); });
    const msg = controls.querySelector('[data-mc-msg]');
    if (msg) msg.addEventListener('input', (e) => { state.message = e.target.value.toUpperCase().replace(/[^A-Z ]/g, ''); render(); });
  }

  render();
}
