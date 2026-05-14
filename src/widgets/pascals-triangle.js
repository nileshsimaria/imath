import katex from 'katex';

// Pascal's triangle widget. Renders the first N rows, shows C(n, k) as the
// cell labels, and lets the student click a cell to see:
//   - the binomial coefficient formula and value
//   - the row's (a + b)^n expansion with that term highlighted
//
// Config:
//   rows: number of rows to display (default 8, max 14)
//   highlight: { n, k } — initially-selected cell

const COLORS = {
  cell: '#eef2ff',
  cellBorder: '#c7d2fe',
  cellText: '#1e1b4b',
  hover: '#a5b4fc',
  selected: '#4f46e5',
  selectedText: '#ffffff',
  // Highlight the path of the chosen cell from the apex (sum of two parents).
  path: '#fef3c7',
  pathBorder: '#facc15',
};

const DEFAULTS = {
  rows: 8,
  highlight: { n: 4, k: 2 },
};

const tex = (s, display = false) => {
  try { return katex.renderToString(s, { throwOnError: false, displayMode: display }); }
  catch { return s; }
};

function buildPascal(rows) {
  const out = [];
  for (let n = 0; n < rows; n++) {
    const row = [1];
    for (let k = 1; k < n; k++) {
      row.push(out[n - 1][k - 1] + out[n - 1][k]);
    }
    if (n > 0) row.push(1);
    out.push(row);
  }
  return out;
}

function expansionTex(n, kSel = -1) {
  // Build (a + b)^n = sum_k C(n,k) a^(n-k) b^k. Highlight selected term.
  if (n === 0) return '(a + b)^{0} = 1';
  const tri = buildPascal(n + 1)[n];
  const parts = [];
  for (let k = 0; k <= n; k++) {
    const c = tri[k];
    let term = '';
    if (c !== 1 || (k > 0 && k < n)) term += `${c}\\,`;
    else if (c === 1) term += '';
    const aPow = n - k;
    const bPow = k;
    if (aPow > 0) term += `a${aPow > 1 ? `^{${aPow}}` : ''}`;
    if (bPow > 0) term += `b${bPow > 1 ? `^{${bPow}}` : ''}`;
    if (term === '') term = '1';
    if (k === kSel) term = `\\boxed{${term}}`;
    parts.push(term);
  }
  return `(a + b)^{${n}} = ${parts.join(' + ')}`;
}

function readout(state) {
  const { n, k } = state.selected;
  const tri = buildPascal(n + 1);
  const value = tri[n][k];
  return `
    <div class="pt-rdo">
      <div class="pt-rdo-row"><span>row ${tex('n')}</span><strong>${n}</strong></div>
      <div class="pt-rdo-row"><span>column ${tex('k')}</span><strong>${k}</strong></div>
      <div class="pt-rdo-row"><span>${tex('\\binom{n}{k}')}</span><strong>${value}</strong></div>
    </div>
    <div class="pt-formula">
      ${tex(`\\binom{${n}}{${k}} = \\dfrac{${n}!}{${k}!\\,(${n}-${k})!} = ${value}`, true)}
    </div>
    <div class="pt-formula">
      ${tex(expansionTex(n, k), true)}
    </div>
  `;
}

function buildSvg(state) {
  const N = state.rows;
  const cellW = 44;
  const cellH = 36;
  const W = N * cellW + 40;
  const H = N * cellH + 40;
  const tri = buildPascal(N);

  let svg = `<svg class="pt-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Pascal's triangle">`;
  for (let n = 0; n < N; n++) {
    const row = tri[n];
    const offset = (W - row.length * cellW) / 2;
    for (let k = 0; k < row.length; k++) {
      const cx = offset + k * cellW + cellW / 2;
      const cy = 20 + n * cellH + cellH / 2;
      const isSel = n === state.selected.n && k === state.selected.k;
      const fill = isSel ? COLORS.selected : COLORS.cell;
      const textColor = isSel ? COLORS.selectedText : COLORS.cellText;
      svg += `<g data-pt-cell="${n},${k}" style="cursor:pointer">`;
      svg += `<circle cx="${cx}" cy="${cy}" r="${cellH / 2 - 2}" fill="${fill}" stroke="${COLORS.cellBorder}" stroke-width="1.5"/>`;
      svg += `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="13" font-weight="600" fill="${textColor}">${row[k]}</text>`;
      svg += `</g>`;
    }
  }
  svg += '</svg>';
  return svg;
}

export function mountPascalsTriangle(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = {
    rows: Math.min(14, Math.max(2, cfg.rows)),
    selected: { ...cfg.highlight },
  };
  // Clamp initial selection to valid bounds.
  state.selected.n = Math.min(state.selected.n, state.rows - 1);
  state.selected.k = Math.min(state.selected.k, state.selected.n);

  target.innerHTML = `
    <div class="pt-wrap">
      <div data-pt-svg></div>
      <div class="pt-controls">
        <div data-pt-readouts></div>
        <div class="pt-row">
          <label>rows shown</label>
          <input type="range" data-pt-rows min="3" max="14" step="1" value="${state.rows}"/>
          <span class="val" data-pt-rows-val>${state.rows}</span>
        </div>
        <div class="pt-helper">Click any cell to see ${tex('\\binom{n}{k}')} and the term it contributes to ${tex('(a + b)^n')}.</div>
      </div>
    </div>
  `;

  const svgSlot = target.querySelector('[data-pt-svg]');
  const readoutsEl = target.querySelector('[data-pt-readouts]');

  function bindCells() {
    target.querySelectorAll('[data-pt-cell]').forEach((g) => {
      g.addEventListener('click', () => {
        const [n, k] = g.dataset.ptCell.split(',').map(Number);
        state.selected = { n, k };
        render();
      });
    });
  }

  function render() {
    svgSlot.innerHTML = buildSvg(state);
    readoutsEl.innerHTML = readout(state);
    // KaTeX inside the helper line (uses inline $ fences).
    const helper = target.querySelector('.pt-helper');
    if (helper) {
      helper.innerHTML = helper.innerHTML.replace(
        /\$([^$]+)\$/g,
        (_, m) => tex(m, false),
      );
    }
    bindCells();
  }

  target.querySelector('[data-pt-rows]').addEventListener('input', (e) => {
    state.rows = parseInt(e.target.value, 10);
    target.querySelector('[data-pt-rows-val]').textContent = state.rows;
    if (state.selected.n >= state.rows) state.selected.n = state.rows - 1;
    if (state.selected.k > state.selected.n) state.selected.k = state.selected.n;
    render();
  });

  render();
}
