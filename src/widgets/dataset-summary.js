import katex from 'katex';

// Dataset summary widget.
//
// Shows a small dataset as a dot plot on a number line and overlays
// the mean (blue), median (red), and mode(s) (green) as vertical
// dashed lines. A side panel lists computed statistics: n, mean,
// median, mode, min, max, range, Q1, Q3, IQR, SD, MAD.
//
// A preset dropdown lets students pick distributions of different
// shapes (symmetric, right-skewed, left-skewed, with-outlier,
// bimodal). Watching the three center markers drift as the shape
// changes is the pedagogical payoff — it makes the abstract
// claim "the mean follows the tail, the median doesn't" concrete.
//
// Config:
//   preset   key into PRESETS (default 'symmetric')

const SVG_W = 720;
const SVG_H = 300;
const PAD_L = 40;
const PAD_R = 30;
const PLOT_W = SVG_W - PAD_L - PAD_R;
const NL_Y = 240; // number-line baseline
const DOT_R = 8;
const DOT_GAP = 3;
const INDICATOR_TOP = 24;

const COLORS = {
  bg: '#fafbfc',
  axis: '#1e293b',
  dot: '#2563eb',
  dotEdge: '#1e3a8a',
  mean: '#2563eb',
  median: '#dc2626',
  mode: '#16a34a',
  text: '#0f172a',
  textMuted: '#64748b',
};

const PRESETS = {
  symmetric: {
    label: 'Symmetric',
    data: [2, 3, 4, 5, 5, 5, 6, 7, 8],
    note: 'Symmetric distribution. Mean, median, and mode all coincide near the center.',
  },
  'right-skew': {
    label: 'Right-skewed (long right tail)',
    data: [1, 2, 2, 3, 3, 3, 4, 5, 8, 12],
    note: 'Right-skewed. Mean is pulled toward the tail; mode stays at the peak. Order: mode < median < mean.',
  },
  'left-skew': {
    label: 'Left-skewed (long left tail)',
    data: [1, 5, 8, 9, 10, 11, 11, 11, 12, 12],
    note: 'Left-skewed. Mean is pulled toward the LEFT tail. Order: mean < median < mode.',
  },
  outlier: {
    label: 'With one outlier',
    data: [3, 4, 5, 5, 6, 6, 7, 30],
    note: 'One outlier (30) drags the mean far above the bulk. The median barely moves. Robust measures win here.',
  },
  bimodal: {
    label: 'Bimodal (two peaks)',
    data: [2, 2, 2, 3, 7, 8, 8, 8, 9],
    note: 'Two modes (2 and 8). The mean lands between the two peaks — at a value that no single observation hits.',
  },
};

const DEFAULTS = { preset: 'symmetric' };

const tex = (s) => {
  try { return katex.renderToString(s, { throwOnError: false }); }
  catch { return s; }
};

const fmt = (n, dp = 2) => {
  const v = Number(n);
  if (!isFinite(v)) return '—';
  if (Math.abs(v) < 1e-10) return '0';
  return parseFloat(v.toFixed(dp)).toString();
};

function computeStats(data) {
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((s, v) => s + v, 0);
  const mean = sum / n;
  const median = n % 2 === 1
    ? sorted[(n - 1) / 2]
    : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;

  // Modes (only meaningful if max count > 1)
  const counts = new Map();
  for (const v of sorted) counts.set(v, (counts.get(v) || 0) + 1);
  const maxCount = Math.max(...counts.values());
  const modes = maxCount > 1
    ? [...counts.entries()].filter(([, c]) => c === maxCount).map(([v]) => v)
    : [];

  // Quartiles via linear interpolation (position = q * (n - 1))
  const quantile = (q) => {
    const pos = q * (n - 1);
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (pos - lo) * (sorted[hi] - sorted[lo]);
  };
  const q1 = quantile(0.25);
  const q3 = quantile(0.75);

  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance);
  const mad = sorted.reduce((s, v) => s + Math.abs(v - mean), 0) / n;

  return {
    n, mean, median, modes, min: sorted[0], max: sorted[n - 1],
    range: sorted[n - 1] - sorted[0], q1, q3, iqr: q3 - q1, sd, mad,
    counts: [...counts.entries()].sort((a, b) => a[0] - b[0]),
  };
}

function niceStep(approx) {
  if (approx <= 0) return 1;
  const exp = Math.floor(Math.log10(approx));
  const base = Math.pow(10, exp);
  const r = approx / base;
  let f;
  if (r < 1.5) f = 1;
  else if (r < 3) f = 2;
  else if (r < 7) f = 5;
  else f = 10;
  return f * base;
}

function buildSvg(stats) {
  // x-range with some padding
  const dataMin = stats.min;
  const dataMax = stats.max;
  const span = Math.max(dataMax - dataMin, 1);
  const xMin = dataMin - span * 0.08;
  const xMax = dataMax + span * 0.08;
  const proj = (x) => PAD_L + ((x - xMin) / (xMax - xMin)) * PLOT_W;

  let svg = `<rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>`;

  // Axis line
  svg += `<line x1="${PAD_L}" y1="${NL_Y}" x2="${PAD_L + PLOT_W}" y2="${NL_Y}" stroke="${COLORS.axis}" stroke-width="1.5"/>`;

  // Ticks at nice integer steps
  const tickStep = niceStep((xMax - xMin) / 10);
  const tickStart = Math.ceil(xMin / tickStep) * tickStep;
  for (let t = tickStart; t <= xMax; t += tickStep) {
    const px = proj(t);
    svg += `<line x1="${px}" y1="${NL_Y - 4}" x2="${px}" y2="${NL_Y + 4}" stroke="${COLORS.axis}" stroke-width="1"/>`;
    svg += `<text x="${px}" y="${NL_Y + 20}" font-size="11" fill="${COLORS.textMuted}" text-anchor="middle">${fmt(t, 1)}</text>`;
  }

  // Dots — stacked by frequency at each value
  for (const [val, cnt] of stats.counts) {
    const x = proj(val);
    for (let k = 0; k < cnt; k++) {
      const y = NL_Y - DOT_R - 4 - k * (2 * DOT_R + DOT_GAP);
      svg += `<circle cx="${x.toFixed(2)}" cy="${y}" r="${DOT_R}" fill="${COLORS.dot}" stroke="white" stroke-width="2"/>`;
    }
  }

  // Vertical lines for mean, median, modes — stagger labels vertically when
  // the markers are close horizontally to avoid overlap.
  const markers = [
    { value: stats.mean, color: COLORS.mean, label: `mean = ${fmt(stats.mean)}` },
    { value: stats.median, color: COLORS.median, label: `median = ${fmt(stats.median)}` },
    ...stats.modes.map((m) => ({ value: m, color: COLORS.mode, label: `mode = ${fmt(m)}` })),
  ];
  // Sort by x so we can stagger
  const placed = markers
    .map((m) => ({ ...m, x: proj(m.value) }))
    .sort((a, b) => a.x - b.x);
  const rowH = 16;
  const rows = [];
  for (const m of placed) {
    // Place this label at the lowest non-conflicting row
    let row = 0;
    while (rows[row] != null && m.x - rows[row] < 70) row++;
    rows[row] = m.x;
    m.labelY = INDICATOR_TOP + row * rowH;
  }
  for (const m of placed) {
    svg += `<line x1="${m.x.toFixed(2)}" y1="${m.labelY + 4}" x2="${m.x.toFixed(2)}" y2="${NL_Y}" stroke="${m.color}" stroke-width="2" stroke-dasharray="6 3" opacity="0.85"/>`;
    svg += `<text x="${m.x.toFixed(2)}" y="${m.labelY}" font-size="11" font-weight="700" fill="${m.color}" text-anchor="middle">${m.label}</text>`;
  }

  return svg;
}

function statsHtml(stats) {
  const modesStr = stats.modes.length
    ? stats.modes.map((m) => fmt(m)).join(', ')
    : 'none (no repeats)';
  return `
    <div class="ds-stats">
      <div class="ds-stat"><span class="ds-stat-label">n</span><span class="ds-stat-val">${stats.n}</span></div>
      <div class="ds-stat"><span class="ds-stat-label">mean</span><span class="ds-stat-val" style="color:#1e40af">${fmt(stats.mean)}</span></div>
      <div class="ds-stat"><span class="ds-stat-label">median</span><span class="ds-stat-val" style="color:#b91c1c">${fmt(stats.median)}</span></div>
      <div class="ds-stat"><span class="ds-stat-label">mode</span><span class="ds-stat-val" style="color:#15803d">${modesStr}</span></div>
      <div class="ds-stat"><span class="ds-stat-label">min</span><span class="ds-stat-val">${fmt(stats.min)}</span></div>
      <div class="ds-stat"><span class="ds-stat-label">max</span><span class="ds-stat-val">${fmt(stats.max)}</span></div>
      <div class="ds-stat"><span class="ds-stat-label">range</span><span class="ds-stat-val">${fmt(stats.range)}</span></div>
      <div class="ds-stat"><span class="ds-stat-label">Q1</span><span class="ds-stat-val">${fmt(stats.q1)}</span></div>
      <div class="ds-stat"><span class="ds-stat-label">Q3</span><span class="ds-stat-val">${fmt(stats.q3)}</span></div>
      <div class="ds-stat"><span class="ds-stat-label">IQR</span><span class="ds-stat-val">${fmt(stats.iqr)}</span></div>
      <div class="ds-stat"><span class="ds-stat-label">SD (pop)</span><span class="ds-stat-val">${fmt(stats.sd)}</span></div>
      <div class="ds-stat"><span class="ds-stat-label">MAD</span><span class="ds-stat-val">${fmt(stats.mad)}</span></div>
    </div>
  `;
}

export function mountDatasetSummary(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = {
    preset: PRESETS[cfg.preset] ? cfg.preset : 'symmetric',
  };

  const presetOpts = Object.entries(PRESETS)
    .map(([k, p]) => `<option value="${k}"${state.preset === k ? ' selected' : ''}>${p.label}</option>`)
    .join('');

  target.innerHTML = `
    <div class="ds-wrap">
      <svg class="ds-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Dataset dot plot with mean, median, mode">
      </svg>
      <div class="ds-controls">
        <div class="ds-row">
          <label>distribution</label>
          <select data-ds-preset>${presetOpts}</select>
        </div>
        <div class="ds-data" data-ds-data></div>
        <div data-ds-statspanel></div>
        <div class="ds-note" data-ds-note></div>
      </div>
    </div>
  `;

  const g = (sel) => target.querySelector(sel);
  // Render KaTeX in labels
  target.querySelectorAll('.ds-controls label').forEach((el) => {
    el.innerHTML = el.innerHTML.replace(/\$([^$]+)\$/g, (_, t) => tex(t));
  });

  function redraw() {
    const p = PRESETS[state.preset];
    const stats = computeStats(p.data);
    g('.ds-svg').innerHTML = buildSvg(stats);
    g('[data-ds-data]').innerHTML = `<strong>data:</strong> ${p.data.join(', ')}`;
    g('[data-ds-statspanel]').innerHTML = statsHtml(stats);
    g('[data-ds-note]').textContent = p.note;
  }

  redraw();

  g('[data-ds-preset]').addEventListener('change', (e) => {
    state.preset = e.target.value;
    redraw();
  });
}
