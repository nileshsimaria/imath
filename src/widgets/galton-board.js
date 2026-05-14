// Galton board (a.k.a. bean machine).
//
// Marbles drop from a single point. At each peg, they go left or right
// with 50/50 probability. After N rows of pegs, they land in one of
// N+1 bins. The histogram of bin counts CONVERGES to the binomial
// distribution C(N, k) / 2^N — which itself approximates a Gaussian.
//
// The widget animates marbles in flight, accumulates the histogram in
// real time, and overlays the theoretical binomial PMF so students can
// SEE the law of large numbers and the central limit theorem at play.
//
// Buttons:
//   Drop 1 / Drop 10 / Drop 100 / Drop 1000 (queue marbles for animation)
//   Reset
//
// Config:
//   rows: peg rows (default 12)

const SVG_W = 720;
const SVG_H = 460;

const COLORS = {
  peg: '#475569',
  marble: '#dc2626',
  bin: '#cbd5e1',
  binFill: '#3b82f6',
  binFillEdge: '#1e40af',
  theory: '#16a34a',
  text: '#0f172a',
  textMuted: '#64748b',
  bg: '#fafbfc',
};

const DEFAULTS = { rows: 12 };

// Layout: pegs arranged in a triangle on top half, bins on the bottom.
function layout(rows) {
  const topY = 20;
  const pegSpacingY = 22;
  const pegSpacingX = 26;
  const bottomY = topY + (rows + 1) * pegSpacingY;
  const histH = 130;
  const binsTopY = bottomY + 10;
  const binsBottomY = binsTopY + histH;
  // Center peg row k at row k=0..rows-1, with k+1 pegs.
  const centerX = SVG_W / 2;
  return { topY, pegSpacingY, pegSpacingX, bottomY, binsTopY, binsBottomY, histH, centerX };
}

function pegPos(row, col, L) {
  const y = L.topY + row * L.pegSpacingY;
  // Row r has r+1 pegs centered.
  const x = L.centerX + (col - row / 2) * L.pegSpacingX;
  return { x, y };
}

function binCenterX(bin, rows, L) {
  // After `rows` rows of pegs, marble settles into bin = number of "right" decisions, 0..rows.
  return L.centerX + (bin - rows / 2) * L.pegSpacingX;
}

function drawPegs(rows, L) {
  let svg = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= r; c++) {
      const { x, y } = pegPos(r, c, L);
      svg += `<circle cx="${x}" cy="${y}" r="2.5" fill="${COLORS.peg}"/>`;
    }
  }
  return svg;
}

function drawBins(rows, counts, L) {
  let svg = '';
  const maxCount = Math.max(1, ...counts);
  const binCount = rows + 1;
  const binW = L.pegSpacingX - 4;
  for (let i = 0; i < binCount; i++) {
    const cx = binCenterX(i, rows, L);
    // Bin outline.
    svg += `<rect x="${cx - binW / 2}" y="${L.binsTopY}" width="${binW}" height="${L.histH}" fill="none" stroke="${COLORS.bin}" stroke-width="1"/>`;
    // Fill proportional to count.
    const h = (counts[i] / maxCount) * (L.histH - 4);
    svg += `<rect x="${cx - binW / 2 + 1}" y="${L.binsTopY + L.histH - h - 2}" width="${binW - 2}" height="${h}" fill="${COLORS.binFill}" stroke="${COLORS.binFillEdge}" stroke-width="0.8"/>`;
    if (i % Math.max(1, Math.floor(rows / 12)) === 0 || i === rows) {
      svg += `<text x="${cx}" y="${L.binsBottomY + 14}" font-size="10" fill="${COLORS.textMuted}" text-anchor="middle">${i}</text>`;
    }
  }
  return svg;
}

function drawTheoryCurve(rows, total, L) {
  if (total === 0) return '';
  // Theoretical PMF: P(k) = C(n, k) / 2^n. Scale to histogram height using same maxCount estimation.
  // For visual overlay we scale by expected count = total * P(k).
  // Compute n choose k as floats (since n up to ~30).
  const n = rows;
  const log2 = Math.log(2);
  const lgnchoose = (k) => {
    let s = 0;
    for (let i = 1; i <= k; i++) s += Math.log(n - i + 1) - Math.log(i);
    return s;
  };
  const expected = new Array(n + 1);
  for (let k = 0; k <= n; k++) expected[k] = total * Math.exp(lgnchoose(k) - n * log2);
  // Scale to max bar height. Use max(expected, observed counts) — passed as max in drawBins.
  // Here we re-fetch from layout: use the same maxCount as drawBins by passing the observed list.
  // Approach: caller will pass max separately for alignment.
  return { expected };
}

function drawTheoryOverlay(rows, total, counts, L) {
  if (total === 0) return '';
  const { expected } = drawTheoryCurve(rows, total, L);
  const max = Math.max(1, ...counts, ...expected);
  let d = '';
  for (let k = 0; k <= rows; k++) {
    const cx = binCenterX(k, rows, L);
    const h = (expected[k] / max) * (L.histH - 4);
    const py = L.binsTopY + L.histH - h - 2;
    d += (k === 0 ? 'M' : 'L') + `${cx} ${py} `;
  }
  return `<path d="${d}" fill="none" stroke="${COLORS.theory}" stroke-width="2.5" stroke-dasharray="6 4" opacity="0.9"/>`;
}

function drawHeader(rows, total, counts, L) {
  let svg = '';
  // Funnel above the top peg.
  const top = pegPos(0, 0, L);
  svg += `<path d="M ${top.x - 30} ${L.topY - 18} L ${top.x + 30} ${L.topY - 18} L ${top.x + 8} ${L.topY - 4} L ${top.x - 8} ${L.topY - 4} Z" fill="${COLORS.bin}" stroke="${COLORS.text}" stroke-width="1"/>`;
  // Title with running stats.
  if (total > 0) {
    let mean = 0;
    for (let k = 0; k <= rows; k++) mean += k * counts[k];
    mean /= total;
    let varSum = 0;
    for (let k = 0; k <= rows; k++) varSum += counts[k] * (k - mean) ** 2;
    const sd = Math.sqrt(varSum / total);
    svg += `<text x="${SVG_W - 18}" y="22" font-size="12" fill="${COLORS.textMuted}" text-anchor="end">marbles: <tspan font-weight="700" fill="${COLORS.text}">${total}</tspan>  ·  mean: <tspan font-weight="700" fill="${COLORS.text}">${mean.toFixed(2)}</tspan>  ·  σ: <tspan font-weight="700" fill="${COLORS.text}">${sd.toFixed(2)}</tspan></text>`;
  }
  return svg;
}

export function mountGaltonBoard(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const rows = cfg.rows;
  const L = layout(rows);
  const counts = new Array(rows + 1).fill(0);
  let total = 0;
  const flying = []; // active marbles: { row, col, x, y, vy, decisions: [], targetBin }

  target.innerHTML = `
    <div class="gb-wrap">
      <svg class="gb-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Galton board">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-gb-header></g>
        <g data-gb-pegs></g>
        <g data-gb-bins></g>
        <g data-gb-theory></g>
        <g data-gb-marbles></g>
      </svg>
      <div class="gb-controls">
        <div class="gb-row">
          <button type="button" class="gb-btn" data-gb-drop="1">Drop 1</button>
          <button type="button" class="gb-btn" data-gb-drop="10">Drop 10</button>
          <button type="button" class="gb-btn" data-gb-drop="100">Drop 100</button>
          <button type="button" class="gb-btn" data-gb-drop="1000">Drop 1000</button>
          <button type="button" class="gb-btn gb-btn-light" data-gb-reset>Reset</button>
        </div>
        <div class="gb-row">
          <label><input type="checkbox" data-gb-theory-toggle checked/> show theoretical bell curve</label>
        </div>
        <div class="gb-note">Each marble bounces left or right at each peg with 50/50 probability. After many drops, the histogram converges to the <em>binomial distribution</em>, which approaches a <em>normal (bell) curve</em>. That is the Central Limit Theorem in action.</div>
      </div>
    </div>
  `;

  const gPegs = target.querySelector('[data-gb-pegs]');
  const gBins = target.querySelector('[data-gb-bins]');
  const gTheory = target.querySelector('[data-gb-theory]');
  const gMarbles = target.querySelector('[data-gb-marbles]');
  const gHeader = target.querySelector('[data-gb-header]');
  const theoryToggle = target.querySelector('[data-gb-theory-toggle]');

  gPegs.innerHTML = drawPegs(rows, L);

  function renderHist() {
    gBins.innerHTML = drawBins(rows, counts, L);
    gTheory.innerHTML = theoryToggle.checked ? drawTheoryOverlay(rows, total, counts, L) : '';
    gHeader.innerHTML = drawHeader(rows, total, counts, L);
  }
  renderHist();

  // Queue marbles for animation. To handle "Drop 1000" smoothly, we
  // group accounting: animate a limited cap concurrently, finalize the
  // rest instantly into the histogram so the user sees immediate effect
  // but still has cute physics for the first few.
  const ANIMATE_CAP = 60;
  let queued = 0;

  function dropMany(n) {
    // Animate up to ANIMATE_CAP; instantly account the rest.
    const animateN = Math.min(n, Math.max(0, ANIMATE_CAP - flying.length));
    for (let i = 0; i < animateN; i++) {
      flying.push(spawnMarble());
    }
    const instant = n - animateN;
    for (let i = 0; i < instant; i++) {
      const bin = simulateOne();
      counts[bin] += 1; total += 1;
    }
    renderHist();
  }

  function simulateOne() {
    let bin = 0;
    for (let r = 0; r < rows; r++) if (Math.random() < 0.5) bin++;
    return bin;
  }

  function spawnMarble() {
    const decisions = [];
    for (let r = 0; r < rows; r++) decisions.push(Math.random() < 0.5 ? 0 : 1); // 0 = left, 1 = right
    const targetBin = decisions.reduce((s, d) => s + d, 0);
    return {
      row: 0,
      step: 0,
      decisions,
      targetBin,
      // Animated x,y; start above the top peg.
      x: L.centerX,
      y: L.topY - 20,
      vx: 0,
      vy: 60,
      phase: 'fall',  // 'fall' (between rows) | 'done' (counted)
    };
  }

  function step(dt) {
    for (let i = flying.length - 1; i >= 0; i--) {
      const m = flying[i];
      if (m.phase === 'fall') {
        // Determine next peg row to target.
        if (m.step < rows) {
          // Path: marble falls to peg at row=m.step, col=m.colTarget (depends on prior decisions).
          // We compute its current target peg from decisions[0..step-1] (col = number of rights so far).
          const col = m.decisions.slice(0, m.step).reduce((s, d) => s + d, 0);
          const target = pegPos(m.step, col, L);
          // Move toward target.
          const dx = target.x - m.x;
          const dy = target.y - m.y;
          const dist = Math.hypot(dx, dy);
          const speed = 220;
          if (dist < speed * dt) {
            m.x = target.x;
            m.y = target.y;
            // Apply decision: shift sideways for the next peg.
            const dec = m.decisions[m.step];
            // Nudge so the marble visibly leans before settling on next.
            m.step += 1;
          } else {
            m.x += (dx / dist) * speed * dt;
            m.y += (dy / dist) * speed * dt;
          }
        } else {
          // Below pegs, fall into bin.
          const bx = binCenterX(m.targetBin, rows, L);
          const dx = bx - m.x;
          const dy = (L.binsBottomY - 6) - m.y;
          const dist = Math.hypot(dx, dy);
          const speed = 280;
          if (dist < speed * dt) {
            m.x = bx;
            m.y = L.binsBottomY - 6;
            counts[m.targetBin] += 1; total += 1;
            m.phase = 'done';
            flying.splice(i, 1);
          } else {
            m.x += (dx / dist) * speed * dt;
            m.y += (dy / dist) * speed * dt;
          }
        }
      }
    }
    // Draw marbles.
    let svg = '';
    for (const m of flying) {
      svg += `<circle cx="${m.x}" cy="${m.y}" r="3.5" fill="${COLORS.marble}" stroke="#7f1d1d" stroke-width="1"/>`;
    }
    gMarbles.innerHTML = svg;
    if (flying.length === 0 && queued === 0) {
      // Histogram already current — no need to repaint every frame.
    } else {
      renderHist();
    }
  }

  let rafId = null;
  let lastTs = null;
  function loop(ts) {
    if (lastTs == null) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    step(dt);
    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);

  target.querySelectorAll('[data-gb-drop]').forEach((btn) => {
    btn.addEventListener('click', () => {
      dropMany(parseInt(btn.dataset.gbDrop, 10));
    });
  });
  target.querySelector('[data-gb-reset]').addEventListener('click', () => {
    counts.fill(0);
    total = 0;
    flying.length = 0;
    renderHist();
    gMarbles.innerHTML = '';
  });
  theoryToggle.addEventListener('change', renderHist);

  // Cleanup.
  const observer = new MutationObserver(() => {
    if (!document.body.contains(target)) {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
