import katex from 'katex';

// Number-line widget. Modes:
//   integer-arithmetic   start + add: shows arrow from start to start+add
//   decimal-marker       single draggable marker, displays value as decimal & fraction
//   inequality           boundary slider + op tabs: shows the solution region of x <op> b

const SVG_W = 700;
const SVG_H = 200;
const PAD_X = 40;

const COLORS = {
  axis: '#475569',
  tick: '#94a3b8',
  start: '#4f46e5',
  end: '#16a34a',
  arrowPos: '#16a34a',
  arrowNeg: '#dc2626',
  marker: '#7c3aed',
  text: '#1e293b',
};

const DEFAULTS = {
  mode: 'integer-arithmetic',
  min: -10,
  max: 10,
  start: 0,
  add: 5,
  initial: 0.5,    // for decimal-marker
  step: 0.1,       // for decimal-marker slider
  op: '>',         // for inequality: '<', '<=', '>', '>='
  boundary: 2,     // for inequality
  variable: 'x',   // for inequality
};

const tex = (s, display = false) => {
  try { return katex.renderToString(s, { throwOnError: false, displayMode: display }); }
  catch { return s; }
};

function makeProj(min, max) {
  const W = SVG_W - 2 * PAD_X;
  return (v) => PAD_X + ((v - min) / (max - min)) * W;
}

function drawAxis(min, max, sx, baseY) {
  let svg = `<line x1="${sx(min)}" y1="${baseY}" x2="${sx(max)}" y2="${baseY}" stroke="${COLORS.axis}" stroke-width="2"/>`;
  // Arrowheads on both ends
  svg += `<polygon points="${sx(min) - 8},${baseY} ${sx(min)},${baseY - 5} ${sx(min)},${baseY + 5}" fill="${COLORS.axis}"/>`;
  svg += `<polygon points="${sx(max) + 8},${baseY} ${sx(max)},${baseY - 5} ${sx(max)},${baseY + 5}" fill="${COLORS.axis}"/>`;
  for (let i = Math.ceil(min); i <= max; i++) {
    const x = sx(i);
    const isMajor = i % 5 === 0;
    svg += `<line x1="${x}" y1="${baseY - (isMajor ? 8 : 5)}" x2="${x}" y2="${baseY + (isMajor ? 8 : 5)}" stroke="${COLORS.tick}" stroke-width="1.5"/>`;
    if (isMajor) {
      svg += `<text x="${x}" y="${baseY + 24}" font-size="12" fill="${COLORS.text}" text-anchor="middle">${i}</text>`;
    }
  }
  return svg;
}

function arrow(x1, x2, y, color, label) {
  const isPositive = x2 >= x1;
  const arrowDir = isPositive ? '' : '-rev';
  const id = `nl-arrow${Math.random().toString(36).slice(2, 8)}${arrowDir}`;
  let svg = `<defs><marker id="${id}" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto"><polygon points="0 0, 6 3, 0 6" fill="${color}"/></marker></defs>`;
  svg += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${color}" stroke-width="2.5" marker-end="url(#${id})"/>`;
  const midX = (x1 + x2) / 2;
  svg += `<text x="${midX}" y="${y - 8}" font-size="13" fill="${color}" text-anchor="middle" font-weight="600">${label}</text>`;
  return svg;
}

function mountIntegerArithmetic(target, cfg) {
  const state = { start: cfg.start, add: cfg.add };
  const sx = makeProj(cfg.min, cfg.max);
  const baseY = 110;

  target.innerHTML = `
    <div class="nl-wrap">
      <svg class="nl-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Number line">
        <g data-nl-svg></g>
      </svg>
      <div class="nl-controls">
        <div class="nl-eq" data-nl-eq></div>
        <div class="nl-row">
          <label>start</label>
          <input type="range" data-nl-start min="${cfg.min}" max="${cfg.max}" step="1" value="${state.start}"/>
          <span class="val" data-nl-startval>${state.start}</span>
        </div>
        <div class="nl-row">
          <label>add</label>
          <input type="range" data-nl-add min="${cfg.min}" max="${cfg.max}" step="1" value="${state.add}"/>
          <span class="val" data-nl-addval>${state.add}</span>
        </div>
        <div class="nl-helper">Adding a positive number moves <strong style="color:${COLORS.arrowPos}">right</strong>; adding a negative number moves <strong style="color:${COLORS.arrowNeg}">left</strong>.</div>
      </div>
    </div>
  `;

  const svgG = target.querySelector('[data-nl-svg]');
  const eqBox = target.querySelector('[data-nl-eq]');

  function render() {
    let svg = drawAxis(cfg.min, cfg.max, sx, baseY);

    const startX = sx(state.start);
    const endVal = state.start + state.add;
    const clampedEnd = Math.max(cfg.min, Math.min(cfg.max, endVal));
    const endX = sx(clampedEnd);

    // Starting marker
    svg += `<circle cx="${startX}" cy="${baseY}" r="6" fill="${COLORS.start}" stroke="white" stroke-width="2"/>`;
    svg += `<text x="${startX}" y="${baseY + 50}" font-size="12" fill="${COLORS.start}" text-anchor="middle">start = ${state.start}</text>`;

    // Arrow showing the addition
    if (state.add !== 0 && endVal >= cfg.min && endVal <= cfg.max) {
      const color = state.add > 0 ? COLORS.arrowPos : COLORS.arrowNeg;
      svg += arrow(startX, endX, baseY - 36, color, `${state.add > 0 ? '+' : ''}${state.add}`);
    }

    // Ending marker
    if (endVal >= cfg.min && endVal <= cfg.max) {
      svg += `<circle cx="${endX}" cy="${baseY}" r="7" fill="${COLORS.end}" stroke="white" stroke-width="2"/>`;
      svg += `<text x="${endX}" y="${baseY - 12}" font-size="13" fill="${COLORS.end}" text-anchor="middle" font-weight="700">${endVal}</text>`;
    }

    svgG.innerHTML = svg;

    const opStr = state.add >= 0 ? `+ ${state.add}` : `- ${Math.abs(state.add)}`;
    eqBox.innerHTML = tex(`${state.start} ${opStr} = ${endVal}`);
  }

  render();
  target.querySelector('[data-nl-start]').addEventListener('input', (e) => {
    state.start = parseInt(e.target.value, 10);
    target.querySelector('[data-nl-startval]').textContent = state.start;
    render();
  });
  target.querySelector('[data-nl-add]').addEventListener('input', (e) => {
    state.add = parseInt(e.target.value, 10);
    target.querySelector('[data-nl-addval]').textContent = state.add;
    render();
  });
}

function mountDecimalMarker(target, cfg) {
  const state = { value: cfg.initial };
  const sx = makeProj(cfg.min, cfg.max);
  const baseY = 110;

  target.innerHTML = `
    <div class="nl-wrap">
      <svg class="nl-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Number line">
        <g data-nl-svg></g>
      </svg>
      <div class="nl-controls">
        <div class="nl-eq" data-nl-eq></div>
        <div class="nl-row">
          <label>value</label>
          <input type="range" data-nl-val min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${state.value}"/>
          <span class="val" data-nl-valval>${state.value.toFixed(2)}</span>
        </div>
        <div class="nl-helper">Slide the marker. The decimal value and (when applicable) its fraction equivalent update live.</div>
      </div>
    </div>
  `;

  const svgG = target.querySelector('[data-nl-svg]');
  const eqBox = target.querySelector('[data-nl-eq]');

  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; }
  function asFraction(decimal) {
    // Try to find a clean fraction up to denominator 100.
    const sign = decimal < 0 ? -1 : 1;
    const v = Math.abs(decimal);
    const whole = Math.floor(v);
    const frac = v - whole;
    if (Math.abs(frac) < 1e-9) return null;
    // Search for a fraction p/q close to frac
    for (let q = 1; q <= 100; q++) {
      const p = Math.round(frac * q);
      if (Math.abs(p / q - frac) < 1e-3) {
        const g = gcd(p, q);
        const num = (sign * (whole * q + p)) / g;
        const den = q / g;
        return [num, den];
      }
    }
    return null;
  }

  function render() {
    let svg = drawAxis(cfg.min, cfg.max, sx, baseY);
    // Sub-ticks at quarter intervals between integers (for decimal feel)
    for (let i = cfg.min; i < cfg.max; i++) {
      for (const offset of [0.25, 0.5, 0.75]) {
        const x = sx(i + offset);
        const sz = offset === 0.5 ? 4 : 3;
        svg += `<line x1="${x}" y1="${baseY - sz}" x2="${x}" y2="${baseY + sz}" stroke="${COLORS.tick}" stroke-width="0.8"/>`;
      }
    }
    const x = sx(state.value);
    svg += `<circle cx="${x}" cy="${baseY}" r="7" fill="${COLORS.marker}" stroke="white" stroke-width="2"/>`;
    svg += `<text x="${x}" y="${baseY - 14}" font-size="13" fill="${COLORS.marker}" text-anchor="middle" font-weight="600">${state.value.toFixed(2)}</text>`;
    svgG.innerHTML = svg;

    const frac = asFraction(state.value);
    let eqStr;
    if (frac) {
      const [num, den] = frac;
      eqStr = den === 1 ? `${num} = ${state.value.toFixed(2)}` : `\\dfrac{${num}}{${den}} = ${state.value.toFixed(2)}`;
    } else {
      eqStr = state.value.toFixed(2);
    }
    eqBox.innerHTML = tex(eqStr);
  }

  render();
  target.querySelector('[data-nl-val]').addEventListener('input', (e) => {
    state.value = parseFloat(e.target.value);
    target.querySelector('[data-nl-valval]').textContent = state.value.toFixed(2);
    render();
  });
}

// ── Mode: inequality ────────────────────────────────
const OP_TEX = { '<': '<', '<=': '\\leq', '>': '>', '>=': '\\geq' };
const OP_LABEL = { '<': '&lt;', '<=': '≤', '>': '&gt;', '>=': '≥' };

function mountInequality(target, cfg) {
  const state = { op: cfg.op, boundary: cfg.boundary };
  const sx = makeProj(cfg.min, cfg.max);
  const baseY = 110;
  const variable = cfg.variable || 'x';

  target.innerHTML = `
    <div class="nl-wrap">
      <svg class="nl-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Inequality on a number line">
        <g data-nl-svg></g>
      </svg>
      <div class="nl-controls">
        <div class="nl-eq" data-nl-eq></div>
        <div class="nl-row">
          <label>op</label>
          <div class="nl-tabs" data-nl-ops>
            <button data-op="<" class="${state.op === '<' ? 'active' : ''}">&lt;</button>
            <button data-op="<=" class="${state.op === '<=' ? 'active' : ''}">≤</button>
            <button data-op=">" class="${state.op === '>' ? 'active' : ''}">&gt;</button>
            <button data-op=">=" class="${state.op === '>=' ? 'active' : ''}">≥</button>
          </div>
        </div>
        <div class="nl-row">
          <label>boundary</label>
          <input type="range" data-nl-bnd min="${cfg.min}" max="${cfg.max}" step="1" value="${state.boundary}"/>
          <span class="val" data-nl-bndval>${state.boundary}</span>
        </div>
        <div class="nl-helper">An <strong>open circle</strong> (○) means the boundary is <em>not</em> included (strict $\\lt$ or $\\gt$). A <strong>filled circle</strong> (●) means the boundary <em>is</em> included ($\\leq$ or $\\geq$).</div>
      </div>
    </div>
  `;
  // Math in helper text is rendered post-mount by registry.postRenderHelperMath.

  const svgG = target.querySelector('[data-nl-svg]');
  const eqBox = target.querySelector('[data-nl-eq]');
  const SHADE_COLOR = '#4f46e5';

  function render() {
    let svg = drawAxis(cfg.min, cfg.max, sx, baseY);
    const bx = sx(state.boundary);
    const isStrict = state.op === '<' || state.op === '>';
    const isLess = state.op === '<' || state.op === '<=';

    // Shaded ray from boundary to the appropriate end
    const endX = sx(isLess ? cfg.min : cfg.max);
    svg += `<line x1="${bx}" y1="${baseY}" x2="${endX}" y2="${baseY}" stroke="${SHADE_COLOR}" stroke-width="6" stroke-linecap="round" opacity="0.5"/>`;
    // Arrow at the end of the ray
    const arrowSize = 9;
    if (isLess) {
      svg += `<polygon points="${endX - arrowSize - 2},${baseY} ${endX + 2},${baseY - arrowSize} ${endX + 2},${baseY + arrowSize}" fill="${SHADE_COLOR}"/>`;
    } else {
      svg += `<polygon points="${endX + arrowSize + 2},${baseY} ${endX - 2},${baseY - arrowSize} ${endX - 2},${baseY + arrowSize}" fill="${SHADE_COLOR}"/>`;
    }
    // Boundary circle (open or filled)
    if (isStrict) {
      svg += `<circle cx="${bx}" cy="${baseY}" r="8" fill="white" stroke="${SHADE_COLOR}" stroke-width="2.5"/>`;
    } else {
      svg += `<circle cx="${bx}" cy="${baseY}" r="8" fill="${SHADE_COLOR}" stroke="white" stroke-width="2"/>`;
    }
    // Boundary label
    svg += `<text x="${bx}" y="${baseY - 18}" font-size="13" fill="${SHADE_COLOR}" text-anchor="middle" font-weight="700">${state.boundary}</text>`;

    svgG.innerHTML = svg;
    eqBox.innerHTML = tex(`${variable} ${OP_TEX[state.op]} ${state.boundary}`);
  }

  render();

  target.querySelectorAll('[data-op]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.op = btn.dataset.op;
      target.querySelectorAll('[data-op]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    });
  });
  target.querySelector('[data-nl-bnd]').addEventListener('input', (e) => {
    state.boundary = parseInt(e.target.value, 10);
    target.querySelector('[data-nl-bndval]').textContent = state.boundary;
    render();
  });
}

export function mountNumberLine(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  if (cfg.mode === 'decimal-marker') return mountDecimalMarker(target, cfg);
  if (cfg.mode === 'inequality') return mountInequality(target, cfg);
  return mountIntegerArithmetic(target, cfg);
}
