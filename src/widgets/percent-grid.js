import katex from 'katex';

// Percent grid: 10x10 grid where each cell = 1%. Slider sets the percent shaded.
// Equation box shows the live link % = fraction = decimal.

const SVG = 400;
const PAD = 10;

const COLORS = {
  filled: '#4f46e5',
  empty: '#f8fafc',
  border: '#475569',
  divider: '#cbd5e1',
};

const DEFAULTS = {
  initial: 25,
};

const tex = (s) => {
  try { return katex.renderToString(s, { throwOnError: false }); }
  catch { return s; }
};

function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; }

function buildSvg(percent) {
  const inner = SVG - 2 * PAD;
  const cs = inner / 10;
  let svg = '';
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const idx = r * 10 + c;
      const filled = idx < percent;
      const x = PAD + c * cs;
      const y = PAD + r * cs;
      svg += `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" fill="${filled ? COLORS.filled : COLORS.empty}" stroke="${COLORS.divider}" stroke-width="1"/>`;
    }
  }
  svg += `<rect x="${PAD}" y="${PAD}" width="${inner}" height="${inner}" fill="none" stroke="${COLORS.border}" stroke-width="2"/>`;
  return svg;
}

function buildEqTex(percent) {
  const num = percent;
  const den = 100;
  const g = gcd(num, den) || 1;
  const simN = num / g;
  const simD = den / g;
  const decimal = (percent / 100).toFixed(2);
  // Show percent = num/den = simplified (if different) = decimal
  if (g === 1 || percent === 0) {
    return `${percent}\\% = \\dfrac{${num}}{${den}} = ${decimal}`;
  }
  return `${percent}\\% = \\dfrac{${num}}{${den}} = \\dfrac{${simN}}{${simD}} = ${decimal}`;
}

export function mountPercentGrid(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = { percent: Math.max(0, Math.min(100, cfg.initial)) };

  target.innerHTML = `
    <div class="pg-wrap">
      <svg class="pg-svg" viewBox="0 0 ${SVG} ${SVG}" role="img" aria-label="Percent grid">
        <g data-pg-svg></g>
      </svg>
      <div class="pg-controls">
        <div class="pg-eq" data-pg-eq></div>
        <div class="pg-row">
          <label>percent</label>
          <input type="range" data-pg-percent min="0" max="100" step="1" value="${state.percent}"/>
          <span class="val" data-pg-percentval>${state.percent}%</span>
        </div>
        <div class="pg-helper">Each cell is <strong>1%</strong> of the whole. The full grid (100 cells) is <strong>100%</strong>.</div>
      </div>
    </div>
  `;

  const svgG = target.querySelector('[data-pg-svg]');
  const eqBox = target.querySelector('[data-pg-eq]');

  function render() {
    svgG.innerHTML = buildSvg(state.percent);
    eqBox.innerHTML = tex(buildEqTex(state.percent));
  }

  render();
  target.querySelector('[data-pg-percent]').addEventListener('input', (e) => {
    state.percent = parseInt(e.target.value, 10);
    target.querySelector('[data-pg-percentval]').textContent = `${state.percent}%`;
    render();
  });
}
