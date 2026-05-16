import katex from 'katex';

// staircase-sum — visual proof that 1 + 2 + ... + n = n(n+1)/2.
// Two interlocking staircases of squares fill an n × (n+1) rectangle, so one
// staircase is exactly half of it. A slider drives n.

const DEFAULTS = { n: 6, min: 1, max: 12 };

const COLORS = {
  stair: '#4f46e5',     // the "real" staircase, 1+2+...+n
  mirror: '#f9a8d4',    // the rotated copy that completes the rectangle
  grid: '#ffffff',
  text: '#1e293b',
};

const tex = (s, display = false) => {
  try { return katex.renderToString(s, { throwOnError: false, displayMode: display }); }
  catch { return s; }
};

export function mountStaircaseSum(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = { n: Math.max(cfg.min, Math.min(cfg.max, cfg.n)) };

  target.innerHTML = `
    <div class="staircase-wrap">
      <svg class="staircase-svg" viewBox="0 0 520 380" role="img" aria-label="Staircase sum proof">
        <g data-stair-svg></g>
      </svg>
      <div class="staircase-controls">
        <div class="staircase-eq" data-stair-eq></div>
        <div class="staircase-row">
          <label>n</label>
          <input type="range" data-stair-n min="${cfg.min}" max="${cfg.max}" step="1" value="${state.n}"/>
          <span class="val" data-stair-nval>${state.n}</span>
        </div>
        <div class="staircase-legend">
          <span><span class="staircase-key" style="background:${COLORS.stair}"></span> the staircase: $1+2+\\cdots+n$</span>
          <span><span class="staircase-key" style="background:${COLORS.mirror}"></span> a rotated copy with the same number of squares</span>
        </div>
        <div class="staircase-helper">Together the two staircases tile a solid $n \\times (n{+}1)$ rectangle, so one staircase is half of it.</div>
      </div>
    </div>
  `;

  const svgG = target.querySelector('[data-stair-svg]');
  const eqBox = target.querySelector('[data-stair-eq]');

  function render() {
    const n = state.n;
    const cols = n;
    const rows = n + 1;
    const VW = 520, VH = 380;
    const padX = 30, padTop = 20, padBottom = 56;
    const cell = Math.min((VW - 2 * padX) / cols, (VH - padTop - padBottom) / rows);
    const gridW = cell * cols;
    const gridH = cell * rows;
    const ox = (VW - gridW) / 2;
    const oy = padTop;

    let svg = '';
    for (let i = 0; i < cols; i++) {
      const c = i + 1;                 // column number 1..n
      for (let r = 0; r < rows; r++) {
        // bottom c rows are the staircase; the rest is the mirrored copy.
        const isStair = r >= rows - c;
        const x = ox + i * cell;
        const y = oy + r * cell;
        svg += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" `
          + `fill="${isStair ? COLORS.stair : COLORS.mirror}" `
          + `stroke="${COLORS.grid}" stroke-width="1.5"/>`;
      }
    }
    // Dimension labels.
    svg += `<text x="${ox + gridW / 2}" y="${oy + gridH + 26}" font-size="14" `
      + `fill="${COLORS.text}" text-anchor="middle" font-weight="700">width = n = ${n}</text>`;
    svg += `<text x="${ox - 12}" y="${oy + gridH / 2}" font-size="14" `
      + `fill="${COLORS.text}" text-anchor="middle" font-weight="700" `
      + `transform="rotate(-90 ${ox - 12} ${oy + gridH / 2})">height = n+1 = ${n + 1}</text>`;

    svgG.innerHTML = svg;

    const S = (n * (n + 1)) / 2;
    eqBox.innerHTML = tex(
      `1+2+\\cdots+${n} = \\frac{${n}\\times ${n + 1}}{2} = \\frac{${n * (n + 1)}}{2} = ${S}`,
      true,
    );
  }

  render();
  target.querySelector('[data-stair-n]').addEventListener('input', (e) => {
    state.n = parseInt(e.target.value, 10);
    target.querySelector('[data-stair-nval]').textContent = state.n;
    render();
  });
}
