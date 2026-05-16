import katex from 'katex';

// monte-carlo-pi — throw random "darts" at a square with an inscribed circle.
// The fraction landing inside the circle approaches pi/4, so 4 x that fraction
// estimates pi. Full user control: step, batch, auto-run with speed, reset.

const SIZE = 340;       // canvas pixel size (square)
const PAD = 6;          // inset so the circle stroke isn't clipped
const TRUE_PI = Math.PI;

const COLORS = {
  inside: '#16a34a',
  outside: '#f43f5e',
  circle: '#4f46e5',
  square: '#cbd5e1',
};

const tex = (s, display = false) => {
  try { return katex.renderToString(s, { throwOnError: false, displayMode: display }); }
  catch { return s; }
};

export function mountMonteCarloPi(target) {
  const W = SIZE;
  const cx = W / 2, cy = W / 2, r = W / 2 - PAD;
  const r2 = r * r;
  const state = { total: 0, inside: 0, running: false, speed: 50, samples: [] };
  let rafId = null;

  target.innerHTML = `
    <div class="mc-wrap">
      <div class="mc-top">
        <div class="mc-board">
          <canvas class="mc-canvas" width="${W}" height="${W}"></canvas>
        </div>
        <div class="mc-chart">
          <div class="mc-chart-title">π estimate as darts pile up</div>
          <svg class="mc-chart-svg" viewBox="0 0 380 250" role="img" aria-label="Convergence of the estimate">
            <g data-mc-chart></g>
          </svg>
        </div>
      </div>

      <div class="mc-stats">
        <div class="mc-stat mc-stat-hero">
          <span class="mc-stat-val" data-mc-pi>·</span>
          <span class="mc-stat-label">π estimate</span>
        </div>
        <div class="mc-stat">
          <span class="mc-stat-val" data-mc-total>0</span>
          <span class="mc-stat-label">darts thrown</span>
        </div>
        <div class="mc-stat">
          <span class="mc-stat-val" data-mc-inside>0</span>
          <span class="mc-stat-label">inside circle</span>
        </div>
        <div class="mc-stat">
          <span class="mc-stat-val" data-mc-err>·</span>
          <span class="mc-stat-label">error vs π</span>
        </div>
      </div>

      <div class="mc-formula" data-mc-formula></div>

      <div class="mc-controls">
        <button class="mc-btn mc-btn-run" data-mc-run>▶ Run</button>
        <button class="mc-btn" data-mc-add="1">+1 dart</button>
        <button class="mc-btn" data-mc-add="100">+100</button>
        <button class="mc-btn" data-mc-add="1000">+1000</button>
        <button class="mc-btn mc-btn-reset" data-mc-reset>↺ Reset</button>
        <div class="mc-speed">
          <label>speed</label>
          <input type="range" data-mc-speed min="5" max="300" step="5" value="${state.speed}"/>
          <span class="val" data-mc-speedval>${state.speed}/frame</span>
        </div>
      </div>
    </div>
  `;

  const canvas = target.querySelector('.mc-canvas');
  const ctx = canvas.getContext('2d');
  const chartG = target.querySelector('[data-mc-chart]');
  const runBtn = target.querySelector('[data-mc-run]');
  const elPi = target.querySelector('[data-mc-pi]');
  const elTotal = target.querySelector('[data-mc-total]');
  const elInside = target.querySelector('[data-mc-inside]');
  const elErr = target.querySelector('[data-mc-err]');
  const elFormula = target.querySelector('[data-mc-formula]');

  function drawBoard() {
    ctx.clearRect(0, 0, W, W);
    ctx.strokeStyle = COLORS.square;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(PAD, PAD, W - 2 * PAD, W - 2 * PAD);
    ctx.strokeStyle = COLORS.circle;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  function estimate() {
    return state.total ? (4 * state.inside) / state.total : null;
  }

  function addPoints(k) {
    for (let i = 0; i < k; i++) {
      const x = PAD + Math.random() * (W - 2 * PAD);
      const y = PAD + Math.random() * (W - 2 * PAD);
      const isIn = (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r2;
      if (isIn) state.inside++;
      state.total++;
      ctx.fillStyle = isIn ? COLORS.inside : COLORS.outside;
      ctx.beginPath();
      ctx.arc(x, y, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
    // Record a convergence sample; downsample to keep the array bounded
    // while preserving the overall shape (including the early wild swings).
    state.samples.push(estimate());
    if (state.samples.length > 600) {
      state.samples = state.samples.filter((_, idx) => idx % 2 === 0);
    }
    refresh();
  }

  function refresh() {
    const est = estimate();
    elTotal.textContent = state.total.toLocaleString();
    elInside.textContent = state.inside.toLocaleString();
    elPi.textContent = est === null ? '·' : est.toFixed(4);
    elErr.textContent = est === null ? '·' : Math.abs(est - TRUE_PI).toFixed(4);
    elFormula.innerHTML = tex(
      est === null
        ? '\\pi \\approx 4 \\times \\dfrac{\\text{inside}}{\\text{total}}'
        : `\\pi \\approx 4 \\times \\dfrac{${state.inside}}{${state.total}} = ${est.toFixed(4)}`,
      true,
    );
    drawChart();
  }

  // A "nice" round number near `x` (1, 2, 5 x 10^k) for gridline spacing.
  function niceStep(range) {
    const raw = range / 4;
    const exp = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / exp;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * exp;
  }

  function drawChart() {
    const VW = 380, VH = 250, padL = 46, padR = 10, padT = 14, padB = 24;
    const plotW = VW - padL - padR, plotH = VH - padT - padB;
    const s = state.samples;

    // Auto-zoom the y-axis. Range is taken from the RECENT samples (plus the
    // true-π line) so that as the estimate settles, the view zooms in and the
    // small wiggles stay readable instead of being squashed into a thin band.
    let lo, hi;
    if (s.length < 2) {
      lo = 2; hi = 4;
    } else {
      const recent = s.slice(Math.floor(s.length * 0.4));
      lo = Math.min(TRUE_PI, ...recent);
      hi = Math.max(TRUE_PI, ...recent);
      const mid = (lo + hi) / 2;
      const span = Math.max(hi - lo, 0.15);   // don't over-zoom once converged
      lo = mid - span / 2;
      hi = mid + span / 2;
      const pad = (hi - lo) * 0.2;
      lo -= pad; hi += pad;
    }
    const yOf = (v) => padT + plotH - ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * plotH;
    const xOf = (i, n) => padL + (n <= 1 ? 0 : (i / (n - 1)) * plotW);

    let svg = '';
    // y gridlines at nice round values
    const step = niceStep(hi - lo);
    const decimals = step >= 1 ? 0 : Math.max(0, -Math.floor(Math.log10(step)));
    for (let g = Math.ceil(lo / step) * step; g <= hi; g += step) {
      const y = yOf(g);
      svg += `<line x1="${padL}" y1="${y}" x2="${VW - padR}" y2="${y}" stroke="#eef2f7" stroke-width="1"/>`;
      svg += `<text x="${padL - 6}" y="${y + 4}" font-size="11" fill="#94a3b8" text-anchor="end">${g.toFixed(decimals)}</text>`;
    }
    // true pi reference line
    const yPi = yOf(TRUE_PI);
    svg += `<line x1="${padL}" y1="${yPi}" x2="${VW - padR}" y2="${yPi}" stroke="${COLORS.circle}" stroke-width="1.5" stroke-dasharray="5 3"/>`;
    svg += `<text x="${VW - padR}" y="${yPi - 5}" font-size="11" fill="${COLORS.circle}" text-anchor="end">true π = 3.14159</text>`;
    // estimate polyline
    if (s.length > 1) {
      const pts = s.map((v, i) => `${xOf(i, s.length).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');
      svg += `<polyline points="${pts}" fill="none" stroke="${COLORS.inside}" stroke-width="2"/>`;
    } else if (s.length === 1) {
      svg += `<circle cx="${padL}" cy="${yOf(s[0])}" r="2.5" fill="${COLORS.inside}"/>`;
    }
    chartG.innerHTML = svg;
  }

  function loop() {
    if (!state.running) return;
    if (!canvas.isConnected) { state.running = false; return; } // page navigated away
    addPoints(state.speed);
    rafId = requestAnimationFrame(loop);
  }

  function setRunning(on) {
    state.running = on;
    runBtn.textContent = on ? '⏸ Pause' : '▶ Run';
    runBtn.classList.toggle('is-running', on);
    if (on) loop();
    else if (rafId) cancelAnimationFrame(rafId);
  }

  function reset() {
    setRunning(false);
    state.total = 0;
    state.inside = 0;
    state.samples = [];
    drawBoard();
    refresh();
  }

  // ── wire controls ──
  runBtn.addEventListener('click', () => setRunning(!state.running));
  target.querySelectorAll('[data-mc-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setRunning(false);
      addPoints(parseInt(btn.dataset.mcAdd, 10));
    });
  });
  target.querySelector('[data-mc-reset]').addEventListener('click', reset);
  target.querySelector('[data-mc-speed]').addEventListener('input', (e) => {
    state.speed = parseInt(e.target.value, 10);
    target.querySelector('[data-mc-speedval]').textContent = `${state.speed}/frame`;
  });

  drawBoard();
  refresh();
}
