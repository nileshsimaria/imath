// Fibonacci tiles + golden spiral.
//
// Build the classic Fibonacci-square spiral: start with two 1x1 squares,
// then add successively larger squares (2, 3, 5, 8, 13, ...) along a
// rotating direction, and trace a quarter-circle arc through each square
// to form the golden spiral.
//
// Sliders:
//   n: how many squares to draw (default 7 → through Fib(7) = 13)
//   show: 'spiral' | 'just-tiles' | 'tiles-and-numbers' | 'ratio'
//
// In 'ratio' mode we plot the ratio F_{n+1}/F_n converging toward φ.

const SVG_W = 540;
const SVG_H = 420;

const COLORS = {
  bg: '#fafbfc',
  tileEdge: '#1e293b',
  tileFill1: '#fef3c7',
  tileFill2: '#fde68a',
  spiral: '#dc2626',
  number: '#1e293b',
  ratioLine: '#4f46e5',
  phiLine: '#16a34a',
  text: '#0f172a',
  textMuted: '#64748b',
  grid: '#e2e8f0',
};

const DEFAULTS = {
  n: 7,
  show: 'spiral',
};

function fibs(n) {
  const a = [0, 1];
  for (let i = 2; i <= n; i++) a.push(a[i - 1] + a[i - 2]);
  return a;
}

const PHI = (1 + Math.sqrt(5)) / 2;

// Compute the placement of n Fibonacci squares spiraling counter-clockwise.
// Returns an array of {x, y, size, dir} describing each square's
// top-left corner and side length, plus the rotation direction (used for
// arcs). All units are "square units" with size = Fib(i).
function tilePlacement(n) {
  const F = fibs(n + 1); // F[i] = Fib(i)
  const tiles = [];
  if (n < 1) return tiles;
  // Start: place F(1) = 1 at origin.
  // Direction order: right, up, left, down, right, up, ... (counterclockwise spiral).
  // We track a "current top-left" but it's easier to track each square's bounds.
  let x = 0, y = 0; // top-left of the most recent square (which we treat as the seed)
  let s = F[1]; // size of most recent square = 1
  tiles.push({ x, y, size: s, dir: 0, value: F[1] });
  // Subsequent squares attach to the long edge of the growing rectangle.
  // Sequence: right, up, left, down, right, up, ...
  for (let i = 2; i <= n; i++) {
    const dir = (i - 2) % 4; // 0=right, 1=up, 2=left, 3=down
    const newSize = F[i];
    let nx, ny;
    // Bounding rectangle of the placed tiles so far:
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of tiles) {
      minX = Math.min(minX, t.x); minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + t.size); maxY = Math.max(maxY, t.y + t.size);
    }
    if (dir === 0) { // attach to the right
      nx = maxX; ny = minY;
    } else if (dir === 1) { // attach to the top
      nx = minX; ny = minY - newSize;
    } else if (dir === 2) { // attach to the left
      nx = minX - newSize; ny = minY;
    } else { // dir === 3: attach to the bottom
      nx = minX; ny = maxY;
    }
    tiles.push({ x: nx, y: ny, size: newSize, dir, value: F[i] });
  }
  return tiles;
}

function autoFit(tiles, vw, vh, pad = 24) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const t of tiles) {
    minX = Math.min(minX, t.x); minY = Math.min(minY, t.y);
    maxX = Math.max(maxX, t.x + t.size); maxY = Math.max(maxY, t.y + t.size);
  }
  const w = maxX - minX, h = maxY - minY;
  const scale = Math.min((vw - 2 * pad) / w, (vh - 2 * pad) / h);
  // Center.
  const offsetX = pad + (vw - 2 * pad - w * scale) / 2 - minX * scale;
  const offsetY = pad + (vh - 2 * pad - h * scale) / 2 - minY * scale;
  return { scale, offsetX, offsetY };
}

function drawTiles(tiles, fit, withNumbers) {
  let svg = '';
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    const fill = i % 2 === 0 ? COLORS.tileFill1 : COLORS.tileFill2;
    const x = t.x * fit.scale + fit.offsetX;
    const y = t.y * fit.scale + fit.offsetY;
    const s = t.size * fit.scale;
    svg += `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${fill}" stroke="${COLORS.tileEdge}" stroke-width="1.5"/>`;
    if (withNumbers) {
      const fs = Math.max(10, Math.min(36, s * 0.35));
      svg += `<text x="${x + s / 2}" y="${y + s / 2 + fs / 3}" font-size="${fs}" fill="${COLORS.number}" text-anchor="middle" font-weight="700">${t.value}</text>`;
    }
  }
  return svg;
}

function drawSpiralArcs(tiles, fit) {
  // Each square gets a quarter-circle arc from one corner to the opposite
  // diagonal corner, going in a consistent rotation direction.
  let svg = '';
  let pathD = '';
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    const x = t.x * fit.scale + fit.offsetX;
    const y = t.y * fit.scale + fit.offsetY;
    const s = t.size * fit.scale;
    // dir 0 (right): arc from bottom-left to top-right (with center bottom-right? no...)
    // Use SVG arc syntax. The spiral runs counter-clockwise globally.
    // Determine start, end based on dir:
    let start, end, large;
    if (t.dir === 0) {
      // Attached to the right; arc curls inward — from top-left → bottom-right? Let's pick:
      // start at bottom-left corner of this square; end at top-right corner;
      // arc center is at the bottom-right corner.
      start = [x, y + s];
      end = [x + s, y];
      // Sweep counterclockwise (sweep flag = 0).
      pathD += `M ${start[0]} ${start[1]} A ${s} ${s} 0 0 1 ${end[0]} ${end[1]} `;
    } else if (t.dir === 1) {
      // Attached above (top); spiral continues. Arc from bottom-right to top-left, center at bottom-left.
      start = [x + s, y + s];
      end = [x, y];
      pathD += `M ${start[0]} ${start[1]} A ${s} ${s} 0 0 1 ${end[0]} ${end[1]} `;
    } else if (t.dir === 2) {
      // Attached to the left. Arc from top-right to bottom-left, center at top-left.
      start = [x + s, y];
      end = [x, y + s];
      pathD += `M ${start[0]} ${start[1]} A ${s} ${s} 0 0 1 ${end[0]} ${end[1]} `;
    } else {
      // Attached below. Arc from top-left to bottom-right, center at top-right.
      start = [x, y];
      end = [x + s, y + s];
      pathD += `M ${start[0]} ${start[1]} A ${s} ${s} 0 0 1 ${end[0]} ${end[1]} `;
    }
  }
  svg += `<path d="${pathD}" fill="none" stroke="${COLORS.spiral}" stroke-width="2.5"/>`;
  return svg;
}

function drawRatioMode(n) {
  // Plot F_{i+1}/F_i for i = 1..n. Converges to PHI ≈ 1.618.
  const F = fibs(n + 1);
  const ratios = [];
  for (let i = 1; i < F.length - 1; i++) ratios.push({ i, r: F[i + 1] / F[i] });
  // Layout in left half of SVG; the formula visualization on right.
  const left = 50, right = SVG_W - 50, top = 60, bottom = SVG_H - 60;
  const w = right - left, h = bottom - top;
  let svg = '';
  // Axes.
  svg += `<line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" stroke="${COLORS.text}" stroke-width="1.5"/>`;
  svg += `<line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" stroke="${COLORS.text}" stroke-width="1.5"/>`;
  // PHI line.
  const phiY = bottom - ((PHI - 1) / 1.2) * h;
  svg += `<line x1="${left}" y1="${phiY}" x2="${right}" y2="${phiY}" stroke="${COLORS.phiLine}" stroke-width="2" stroke-dasharray="6 4"/>`;
  svg += `<text x="${right - 8}" y="${phiY - 6}" font-size="12" fill="${COLORS.phiLine}" text-anchor="end" font-weight="700">φ ≈ ${PHI.toFixed(4)}</text>`;
  // Plot points and connecting line.
  const N = ratios.length;
  if (N > 0) {
    let d = '';
    for (let i = 0; i < N; i++) {
      const x = left + (i / Math.max(1, N - 1)) * w;
      const y = bottom - ((ratios[i].r - 1) / 1.2) * h;
      d += (i === 0 ? 'M' : 'L') + ` ${x} ${y} `;
      svg += `<circle cx="${x}" cy="${y}" r="3" fill="${COLORS.ratioLine}"/>`;
      // Label every other ratio with value.
      if (i % Math.max(1, Math.floor(N / 8)) === 0 || i === N - 1) {
        svg += `<text x="${x}" y="${y - 8}" font-size="10" fill="${COLORS.ratioLine}" text-anchor="middle">${ratios[i].r.toFixed(3)}</text>`;
      }
    }
    svg += `<path d="${d}" fill="none" stroke="${COLORS.ratioLine}" stroke-width="1.8"/>`;
  }
  svg += `<text x="${(left + right) / 2}" y="${SVG_H - 16}" font-size="12" fill="${COLORS.textMuted}" text-anchor="middle">term number $n$</text>`;
  svg += `<text x="${left - 8}" y="${(top + bottom) / 2}" font-size="12" fill="${COLORS.textMuted}" text-anchor="middle" transform="rotate(-90 ${left - 8} ${(top + bottom) / 2})">$F_{n+1} / F_n$</text>`;
  return svg;
}

export function mountFibonacciSpiral(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = { n: cfg.n, show: cfg.show };

  const tabs = [['spiral', 'Spiral'], ['tiles-and-numbers', 'Numbered Tiles'], ['just-tiles', 'Just Tiles'], ['ratio', 'Ratio → φ']];
  const tabsHtml = tabs.map(([k, l]) => `<button type="button" class="fs-tab${state.show === k ? ' active' : ''}" data-fs-show="${k}">${l}</button>`).join('');

  target.innerHTML = `
    <div class="fs-wrap">
      <svg class="fs-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Fibonacci spiral">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-fs-stage></g>
      </svg>
      <div class="fs-controls">
        <div class="fs-tabs">${tabsHtml}</div>
        <div class="fs-row"><label>Terms $n$</label><input type="range" data-fs-n min="2" max="12" step="1" value="${state.n}"/><span data-fs-nval>${state.n}</span></div>
        <div class="fs-sequence" data-fs-seq></div>
        <div class="fs-readout" data-fs-readout></div>
      </div>
    </div>
  `;

  const stage = target.querySelector('[data-fs-stage]');
  const seqBox = target.querySelector('[data-fs-seq]');
  const ro = target.querySelector('[data-fs-readout]');

  function render() {
    const F = fibs(state.n + 1);
    seqBox.innerHTML = `<strong>Sequence:</strong> ${F.slice(1).join(', ')}`;
    if (state.show === 'ratio') {
      stage.innerHTML = drawRatioMode(state.n);
      const lastRatio = state.n >= 2 ? (F[state.n] / F[state.n - 1]).toFixed(6) : '—';
      ro.innerHTML = `<div>Latest ratio: <strong>${lastRatio}</strong></div><div>Convergence target: <strong>φ = ${PHI.toFixed(6)}</strong></div>`;
    } else {
      const tiles = tilePlacement(state.n);
      const fit = autoFit(tiles, SVG_W, SVG_H);
      let s = drawTiles(tiles, fit, state.show !== 'just-tiles');
      if (state.show === 'spiral') s += drawSpiralArcs(tiles, fit);
      stage.innerHTML = s;
      const last = F[state.n] || 0;
      ro.innerHTML = `<div>$F_{${state.n}} = ${last}$.</div><div>Each square has side equal to the corresponding Fibonacci number.</div>`;
    }
  }
  render();

  target.querySelectorAll('[data-fs-show]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.show = btn.dataset.fsShow;
      target.querySelectorAll('[data-fs-show]').forEach((b) => b.classList.toggle('active', b === btn));
      render();
    });
  });
  target.querySelector('[data-fs-n]').addEventListener('input', (e) => {
    state.n = +e.target.value;
    target.querySelector('[data-fs-nval]').textContent = state.n;
    render();
  });
}
