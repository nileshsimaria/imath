import katex from 'katex';

// Histogram widget for descriptive statistics.
//
// Takes a raw dataset and bins it into N intervals. Draws frequency
// bars with the modal class (tallest bar) highlighted. A side panel
// reports sample size, range, modal class, mean computed from class
// marks, and median class.
//
// A bin-count slider makes the bin-width trade-off visible:
//   too few bins → loses structure (everything blurred together)
//   too many bins → noisy histogram with sparse bars
// This is the exact intuition behind the "choose class width" question
// in the grouped-data lesson.
//
// Presets: test scores (symmetric), heights, waiting times (right-skewed),
// ages of a mixed population (bimodal).
//
// Config:
//   preset    key into PRESETS (default 'test-scores')
//   bins      starting bin count (default 8)

const SVG_W = 720;
const SVG_H = 360;
const PAD_L = 50;
const PAD_R = 30;
const PAD_TOP = 30;
const PAD_BOT = 60;
const PLOT_W = SVG_W - PAD_L - PAD_R;
const PLOT_H = SVG_H - PAD_TOP - PAD_BOT;

const COLORS = {
  bg: '#fafbfc',
  panel: '#ffffff',
  axis: '#1e293b',
  axisFaint: '#cbd5e1',
  bar: '#bfdbfe',
  barEdge: '#1e40af',
  modalBar: '#fca5a5',
  modalEdge: '#b91c1c',
  text: '#0f172a',
  textMuted: '#64748b',
};

const PRESETS = {
  'test-scores': {
    label: 'Test scores (50 students)',
    unit: 'points',
    data: [42, 55, 58, 62, 64, 65, 67, 68, 68, 70, 70, 71, 72, 72, 73, 74, 74, 75, 75, 75, 76, 76, 77, 77, 78, 78, 78, 79, 80, 80, 81, 81, 82, 82, 83, 84, 85, 85, 86, 87, 88, 88, 89, 90, 91, 92, 94, 95, 97, 99],
    note: 'Roughly symmetric, single-peaked. Modal class near the mean.',
  },
  heights: {
    label: 'Adult heights (50 people, cm)',
    unit: 'cm',
    data: [152, 156, 158, 160, 161, 162, 163, 164, 164, 165, 166, 166, 167, 167, 168, 168, 168, 169, 169, 169, 170, 170, 170, 170, 171, 171, 171, 172, 172, 173, 173, 174, 174, 175, 175, 176, 177, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 188, 190, 192],
    note: 'Approximately bell-shaped (normal). Cleanly unimodal.',
  },
  'waiting-times': {
    label: 'Waiting times (minutes)',
    unit: 'min',
    data: [1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 7, 7, 8, 9, 10, 11, 12, 13, 15, 18, 22, 28, 35, 42],
    note: 'Right-skewed. Long tail of long waits. Modal class on the LEFT.',
  },
  'mixed-ages': {
    label: 'Ages of a mixed group',
    unit: 'years',
    data: [5, 6, 7, 7, 8, 8, 9, 10, 10, 11, 12, 13, 30, 32, 33, 35, 35, 36, 37, 38, 39, 40, 42, 43, 45, 45, 47, 48, 50, 52, 55],
    note: 'Bimodal — two clusters (children and adults), no single "center".',
  },
};

const DEFAULTS = { preset: 'test-scores', bins: 8 };

const tex = (s) => {
  try { return katex.renderToString(s, { throwOnError: false }); }
  catch { return s; }
};

const fmt = (n, dp = 1) => {
  const v = Number(n);
  if (!isFinite(v)) return '—';
  if (Math.abs(v) < 1e-10) return '0';
  return parseFloat(v.toFixed(dp)).toString();
};

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

function makeBins(data, numBins) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min;
  // Choose nice bin width
  const rough = span / numBins;
  const width = niceStep(rough);
  const start = Math.floor(min / width) * width;
  const end = Math.ceil((max + width * 1e-9) / width) * width;
  const bins = [];
  for (let lo = start; lo < end; lo += width) {
    const hi = lo + width;
    bins.push({ lo, hi, count: 0, mark: (lo + hi) / 2 });
  }
  for (const v of data) {
    let idx = Math.floor((v - start) / width);
    // Right-most value falls in the last bin
    if (idx >= bins.length) idx = bins.length - 1;
    bins[idx].count += 1;
  }
  return { bins, width, start, end };
}

function buildSvg(data, numBins) {
  const { bins, width, start, end } = makeBins(data, numBins);
  const maxCount = Math.max(1, ...bins.map((b) => b.count));
  const xL = PAD_L;
  const xR = PAD_L + PLOT_W;
  const yT = PAD_TOP;
  const yB = PAD_TOP + PLOT_H;
  const proj = (x) => xL + ((x - start) / (end - start)) * PLOT_W;
  const projY = (y) => yB - (y / maxCount) * PLOT_H;

  let svg = `<rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>`;

  // Y-axis with frequency ticks
  svg += `<line x1="${xL}" y1="${yT}" x2="${xL}" y2="${yB}" stroke="${COLORS.axis}" stroke-width="1.5"/>`;
  // Determine y ticks (integers)
  const yTickStep = Math.max(1, Math.ceil(maxCount / 6));
  for (let y = 0; y <= maxCount; y += yTickStep) {
    const py = projY(y);
    svg += `<line x1="${xL - 4}" y1="${py}" x2="${xL}" y2="${py}" stroke="${COLORS.axis}" stroke-width="1"/>`;
    svg += `<line x1="${xL}" y1="${py}" x2="${xR}" y2="${py}" stroke="${COLORS.axisFaint}" stroke-width="0.6" stroke-dasharray="2 3"/>`;
    svg += `<text x="${xL - 8}" y="${py + 4}" font-size="11" fill="${COLORS.textMuted}" text-anchor="end">${y}</text>`;
  }
  // Y-axis label
  svg += `<text x="${xL - 32}" y="${(yT + yB) / 2}" font-size="11" fill="${COLORS.textMuted}" text-anchor="middle" font-style="italic" transform="rotate(-90 ${xL - 32} ${(yT + yB) / 2})">frequency</text>`;

  // X-axis
  svg += `<line x1="${xL}" y1="${yB}" x2="${xR}" y2="${yB}" stroke="${COLORS.axis}" stroke-width="1.5"/>`;

  // Bars
  for (const b of bins) {
    const x = proj(b.lo);
    const w = proj(b.hi) - proj(b.lo) - 1; // tiny gap to show separation
    const y = projY(b.count);
    const h = yB - y;
    const isModal = b.count === maxCount && b.count > 0;
    const fill = isModal ? COLORS.modalBar : COLORS.bar;
    const stroke = isModal ? COLORS.modalEdge : COLORS.barEdge;
    svg += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="${fill}" stroke="${stroke}" stroke-width="${isModal ? 2 : 1}"/>`;
    if (b.count > 0) {
      svg += `<text x="${(x + w / 2).toFixed(2)}" y="${(y - 4).toFixed(2)}" font-size="10" fill="${isModal ? COLORS.modalEdge : COLORS.text}" font-weight="${isModal ? '700' : '500'}" text-anchor="middle">${b.count}</text>`;
    }
  }

  // X-axis tick labels at bin boundaries (skip if too cramped)
  const labelStep = Math.max(1, Math.ceil(bins.length / 8));
  for (let i = 0; i <= bins.length; i += labelStep) {
    const v = (i < bins.length) ? bins[i].lo : bins[bins.length - 1].hi;
    const px = proj(v);
    svg += `<line x1="${px.toFixed(2)}" y1="${yB}" x2="${px.toFixed(2)}" y2="${yB + 4}" stroke="${COLORS.axis}" stroke-width="1"/>`;
    svg += `<text x="${px.toFixed(2)}" y="${yB + 18}" font-size="11" fill="${COLORS.textMuted}" text-anchor="middle">${fmt(v, width >= 1 ? 0 : 1)}</text>`;
  }

  return { svg, bins, width };
}

function computeFromBins(bins) {
  const n = bins.reduce((s, b) => s + b.count, 0);
  if (n === 0) return null;
  const sumFx = bins.reduce((s, b) => s + b.count * b.mark, 0);
  const mean = sumFx / n;
  // Modal class: bin with max count (first if tie)
  const maxCount = Math.max(...bins.map((b) => b.count));
  const modal = bins.find((b) => b.count === maxCount);
  // Median class: first cumulative count >= n/2
  let cum = 0;
  let median = null;
  for (const b of bins) {
    cum += b.count;
    if (cum >= n / 2) { median = b; break; }
  }
  return { n, mean, modal, median, maxCount };
}

export function mountHistogram(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = {
    preset: PRESETS[cfg.preset] ? cfg.preset : 'test-scores',
    bins: Math.max(3, Math.min(20, +cfg.bins || 8)),
  };

  const presetOpts = Object.entries(PRESETS)
    .map(([k, p]) => `<option value="${k}"${state.preset === k ? ' selected' : ''}>${p.label}</option>`)
    .join('');

  target.innerHTML = `
    <div class="hg-wrap">
      <svg class="hg-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Histogram">
      </svg>
      <div class="hg-controls">
        <div class="hg-row">
          <label>dataset</label>
          <select data-hg-preset>${presetOpts}</select>
        </div>
        <div class="hg-row">
          <label>bins</label>
          <input type="range" data-hg-bins min="3" max="20" step="1" value="${state.bins}"/>
          <span class="val" data-hg-binsval>${state.bins}</span>
        </div>
        <div class="hg-readout" data-hg-readout></div>
        <div class="hg-note" data-hg-note></div>
      </div>
    </div>
  `;

  const g = (sel) => target.querySelector(sel);
  target.querySelectorAll('.hg-controls label').forEach((el) => {
    el.innerHTML = el.innerHTML.replace(/\$([^$]+)\$/g, (_, t) => tex(t));
  });

  function redraw() {
    const p = PRESETS[state.preset];
    const built = buildSvg(p.data, state.bins);
    g('.hg-svg').innerHTML = built.svg;
    const stats = computeFromBins(built.bins);
    if (stats) {
      const modalRange = `${fmt(stats.modal.lo)}–${fmt(stats.modal.hi)}`;
      const medianRange = `${fmt(stats.median.lo)}–${fmt(stats.median.hi)}`;
      g('[data-hg-readout]').innerHTML =
        `<span class="hg-stat"><span class="hg-stat-label">n</span> ${stats.n}</span>` +
        `<span class="hg-stat"><span class="hg-stat-label">bin width</span> ${fmt(built.width, 1)}</span>` +
        `<span class="hg-stat"><span class="hg-stat-label">mean (from marks)</span> ${fmt(stats.mean, 2)} ${p.unit}</span>` +
        `<span class="hg-stat" style="color:#b91c1c"><span class="hg-stat-label">modal class</span> ${modalRange}</span>` +
        `<span class="hg-stat"><span class="hg-stat-label">median class</span> ${medianRange}</span>`;
    }
    g('[data-hg-note]').textContent = p.note;
    g('[data-hg-binsval]').textContent = state.bins;
  }

  redraw();

  g('[data-hg-preset]').addEventListener('change', (e) => {
    state.preset = e.target.value;
    redraw();
  });
  g('[data-hg-bins]').addEventListener('input', (e) => {
    state.bins = parseInt(e.target.value, 10);
    redraw();
  });
}
