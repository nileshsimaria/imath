import katex from 'katex';

// odd-squares — visual proof that 1 + 3 + 5 + ... + (2n-1) = n^2.
// Each odd number is an L-shaped "gnomon" layer; n layers tile an n x n
// square. A slider drives n.

const DEFAULTS = { n: 5, min: 1, max: 10 };

// One distinct tint per layer, cycled.
const PALETTE = [
  '#4f46e5', '#0891b2', '#16a34a', '#ca8a04', '#dc2626',
  '#7c3aed', '#db2777', '#0d9488', '#65a30d', '#ea580c',
];

const tex = (s, display = false) => {
  try { return katex.renderToString(s, { throwOnError: false, displayMode: display }); }
  catch { return s; }
};

export function mountOddSquares(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = { n: Math.max(cfg.min, Math.min(cfg.max, cfg.n)) };

  target.innerHTML = `
    <div class="oddsq-wrap">
      <svg class="oddsq-svg" viewBox="0 0 360 360" role="img" aria-label="Odd numbers tiling a square">
        <g data-oddsq-svg></g>
      </svg>
      <div class="oddsq-controls">
        <div class="oddsq-eq" data-oddsq-eq></div>
        <div class="oddsq-row">
          <label>n</label>
          <input type="range" data-oddsq-n min="${cfg.min}" max="${cfg.max}" step="1" value="${state.n}"/>
          <span class="val" data-oddsq-nval>${state.n}</span>
        </div>
        <div class="oddsq-layers" data-oddsq-layers></div>
        <div class="oddsq-helper">Each L-shaped layer holds the next odd number of cells. Stacked, the $n$ layers fill an $n\\times n$ square.</div>
      </div>
    </div>
  `;

  const svgG = target.querySelector('[data-oddsq-svg]');
  const eqBox = target.querySelector('[data-oddsq-eq]');
  const layersBox = target.querySelector('[data-oddsq-layers]');

  function render() {
    const n = state.n;
    const VW = 360, pad = 16;
    const cell = (VW - 2 * pad) / n;
    const ox = pad, oy = pad;

    let svg = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const layer = Math.max(r, c);            // 0-indexed layer
        const color = PALETTE[layer % PALETTE.length];
        svg += `<rect x="${ox + c * cell}" y="${oy + r * cell}" `
          + `width="${cell}" height="${cell}" fill="${color}" `
          + `stroke="#ffffff" stroke-width="1.5"/>`;
      }
    }
    svgG.innerHTML = svg;

    // Layer-by-layer odd-number chips.
    layersBox.innerHTML = Array.from({ length: n }, (_, i) => {
      const odd = 2 * i + 1;
      return `<span class="oddsq-chip" style="background:${PALETTE[i % PALETTE.length]}">${odd}</span>`;
    }).join('<span class="oddsq-plus">+</span>');

    const terms = Array.from({ length: n }, (_, i) => 2 * i + 1).join('+');
    eqBox.innerHTML = tex(`${terms} = ${n}^2 = ${n * n}`, true);
  }

  render();
  target.querySelector('[data-oddsq-n]').addEventListener('input', (e) => {
    state.n = parseInt(e.target.value, 10);
    target.querySelector('[data-oddsq-nval]').textContent = state.n;
    render();
  });
}
