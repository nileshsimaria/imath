import katex from 'katex';

// compound-growth — compares simple vs compound interest period by period.
// Simple adds a fixed amount (linear); compound multiplies by (1+r)
// (exponential). Sliders drive the rate and number of periods.

const DEFAULTS = { principal: 100, rate: 8, periods: 12 };

const COLORS = { simple: '#0891b2', compound: '#4f46e5', axis: '#94a3b8', text: '#1e293b' };

const tex = (s, display = false) => {
  try { return katex.renderToString(s, { throwOnError: false, displayMode: display }); }
  catch { return s; }
};

export function mountCompoundGrowth(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = {
    rate: Math.max(1, Math.min(20, cfg.rate)),
    periods: Math.max(4, Math.min(15, cfg.periods)),
  };
  const P = cfg.principal;

  target.innerHTML = `
    <div class="cg-wrap">
      <svg class="cg-svg" viewBox="0 0 540 340" role="img" aria-label="Simple vs compound interest">
        <g data-cg-svg></g>
      </svg>
      <div class="cg-controls">
        <div class="cg-eq" data-cg-eq></div>
        <div class="cg-row">
          <label>rate</label>
          <input type="range" data-cg-rate min="1" max="20" step="1" value="${state.rate}"/>
          <span class="val" data-cg-rateval>${state.rate}%</span>
        </div>
        <div class="cg-row">
          <label>periods</label>
          <input type="range" data-cg-periods min="4" max="15" step="1" value="${state.periods}"/>
          <span class="val" data-cg-periodsval>${state.periods}</span>
        </div>
        <div class="cg-legend">
          <span><span class="cg-key" style="background:${COLORS.simple}"></span> simple: adds a fixed amount (a straight line)</span>
          <span><span class="cg-key" style="background:${COLORS.compound}"></span> compound: multiplies by $(1+r)$ (a curve)</span>
        </div>
      </div>
    </div>
  `;

  const svgG = target.querySelector('[data-cg-svg]');
  const eqBox = target.querySelector('[data-cg-eq]');

  function render() {
    const r = state.rate / 100;
    const n = state.periods;
    const VW = 540, VH = 340;
    const padL = 46, padR = 12, padTop = 16, padBottom = 46;
    const plotW = VW - padL - padR;
    const plotH = VH - padTop - padBottom;
    const baseY = padTop + plotH;

    const compound = (k) => P * Math.pow(1 + r, k);
    const simple = (k) => P * (1 + r * k);
    const maxVal = compound(n);
    const yOf = (v) => baseY - (v / maxVal) * plotH;

    const groupW = plotW / (n + 1);
    const barW = groupW * 0.32;

    let svg = '';
    // Axes.
    svg += `<line x1="${padL}" y1="${baseY}" x2="${padL + plotW}" y2="${baseY}" stroke="${COLORS.axis}" stroke-width="1.5"/>`;
    svg += `<line x1="${padL}" y1="${padTop}" x2="${padL}" y2="${baseY}" stroke="${COLORS.axis}" stroke-width="1.5"/>`;
    // Y gridlines / labels at 0, 25%, 50%, 75%, 100% of max.
    for (let g = 0; g <= 4; g++) {
      const v = (maxVal / 4) * g;
      const y = yOf(v);
      svg += `<line x1="${padL}" y1="${y}" x2="${padL + plotW}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`;
      svg += `<text x="${padL - 6}" y="${y + 4}" font-size="10" fill="${COLORS.text}" text-anchor="end">${Math.round(v)}</text>`;
    }
    // Bars.
    for (let k = 0; k <= n; k++) {
      const cx = padL + groupW * (k + 0.5);
      const sV = simple(k), cV = compound(k);
      const sY = yOf(sV), cY = yOf(cV);
      svg += `<rect x="${cx - barW - 1}" y="${sY}" width="${barW}" height="${baseY - sY}" fill="${COLORS.simple}"/>`;
      svg += `<rect x="${cx + 1}" y="${cY}" width="${barW}" height="${baseY - cY}" fill="${COLORS.compound}"/>`;
      svg += `<text x="${cx}" y="${baseY + 14}" font-size="10" fill="${COLORS.text}" text-anchor="middle">${k}</text>`;
    }
    svg += `<text x="${padL + plotW / 2}" y="${VH - 6}" font-size="11" fill="${COLORS.text}" text-anchor="middle" font-weight="600">periods</text>`;

    svgG.innerHTML = svg;

    const finalS = simple(n), finalC = compound(n);
    eqBox.innerHTML =
      `<div>${tex(`\\text{simple: } ${P}(1 + ${(r).toFixed(2)}\\times ${n}) = ${finalS.toFixed(0)}`)}</div>` +
      `<div>${tex(`\\text{compound: } ${P}(1 + ${(r).toFixed(2)})^{${n}} = ${finalC.toFixed(0)}`)}</div>`;
  }

  render();
  target.querySelector('[data-cg-rate]').addEventListener('input', (e) => {
    state.rate = parseInt(e.target.value, 10);
    target.querySelector('[data-cg-rateval]').textContent = `${state.rate}%`;
    render();
  });
  target.querySelector('[data-cg-periods]').addEventListener('input', (e) => {
    state.periods = parseInt(e.target.value, 10);
    target.querySelector('[data-cg-periodsval]').textContent = state.periods;
    render();
  });
}
