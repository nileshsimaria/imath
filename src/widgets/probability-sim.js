import katex from 'katex';

// Probability simulator. Modes: 'coin', 'die', 'spinner'.
// Lets students roll/flip many times and watch empirical probability
// converge toward the theoretical value.
//
// Config:
//   mode: 'coin' | 'die' | 'spinner' (default 'coin')
//   sections: array of strings (only for spinner mode; e.g., ['red','blue','green'])
//   trials: array of preset trial-count buttons (default [1, 10, 100, 1000])

const COLORS_PALETTE = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#7c3aed', '#0ea5e9', '#84cc16', '#f43f5e'];

const DEFAULTS = {
  mode: 'coin',
  trials: [1, 10, 100, 1000],
};

const tex = (s, display = false) => {
  try { return katex.renderToString(s, { throwOnError: false, displayMode: display }); }
  catch { return s; }
};

function modeSetup(state) {
  if (state.mode === 'coin') {
    return {
      title: 'Coin Flip',
      outcomes: ['H', 'T'],
      labels: { H: 'Heads', T: 'Tails' },
    };
  }
  if (state.mode === 'die') {
    return {
      title: 'Six-Sided Die',
      outcomes: ['1', '2', '3', '4', '5', '6'],
      labels: { '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6' },
    };
  }
  // spinner
  const sections = state.sections || ['A', 'B', 'C'];
  const labels = {};
  sections.forEach((s) => { labels[s] = s; });
  return { title: 'Spinner', outcomes: sections, labels };
}

function runTrials(state, n) {
  const { outcomes } = modeSetup(state);
  for (let i = 0; i < n; i++) {
    const k = Math.floor(Math.random() * outcomes.length);
    const o = outcomes[k];
    state.counts[o] = (state.counts[o] || 0) + 1;
  }
  state.total += n;
}

function reset(state) {
  state.counts = {};
  const { outcomes } = modeSetup(state);
  for (const o of outcomes) state.counts[o] = 0;
  state.total = 0;
}

function drawChart(state) {
  const setup = modeSetup(state);
  const { outcomes, labels } = setup;
  const n = outcomes.length;
  const W = 460;
  const H = 240;
  const padLeft = 36;
  const padBottom = 30;
  const padTop = 14;
  const padRight = 14;
  const barAreaW = W - padLeft - padRight;
  const barAreaH = H - padTop - padBottom;
  const barW = (barAreaW / n) * 0.7;
  const gap = (barAreaW / n) * 0.15;

  const maxCount = Math.max(1, ...outcomes.map((o) => state.counts[o] || 0));
  // Round max up to a 'nice' value for axis
  const niceMax = niceCeil(maxCount);

  let svg = `<svg class="ps-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${setup.title} results">`;
  // x-axis
  svg += `<line x1="${padLeft}" y1="${H - padBottom}" x2="${W - padRight}" y2="${H - padBottom}" stroke="#cbd5e1" stroke-width="1.5"/>`;
  // y-axis
  svg += `<line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${H - padBottom}" stroke="#cbd5e1" stroke-width="1.5"/>`;

  // y ticks (5)
  for (let i = 0; i <= 5; i++) {
    const v = (niceMax / 5) * i;
    const y = H - padBottom - (i / 5) * barAreaH;
    svg += `<line x1="${padLeft - 4}" y1="${y}" x2="${padLeft}" y2="${y}" stroke="#94a3b8" stroke-width="1"/>`;
    svg += `<text x="${padLeft - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="#475569">${Math.round(v)}</text>`;
  }

  // bars
  outcomes.forEach((o, i) => {
    const c = state.counts[o] || 0;
    const cx = padLeft + (i + 0.5) * (barAreaW / n);
    const x = cx - barW / 2;
    const h = (c / niceMax) * barAreaH;
    const y = H - padBottom - h;
    const color = COLORS_PALETTE[i % COLORS_PALETTE.length];
    svg += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="${color}" rx="3"/>`;
    svg += `<text x="${cx}" y="${H - padBottom + 16}" text-anchor="middle" font-size="11" font-weight="600" fill="#475569">${labels[o]}</text>`;
    // count label above bar
    if (c > 0) {
      svg += `<text x="${cx}" y="${y - 4}" text-anchor="middle" font-size="11" font-weight="600" fill="${color}">${c}</text>`;
    }
  });

  svg += '</svg>';
  return svg;
}

function niceCeil(n) {
  if (n <= 1) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(n)));
  const norm = n / mag;
  let nice;
  if (norm <= 1) nice = 1;
  else if (norm <= 2) nice = 2;
  else if (norm <= 5) nice = 5;
  else nice = 10;
  return nice * mag;
}

function readouts(state) {
  const setup = modeSetup(state);
  const { outcomes, labels } = setup;
  const theoretical = 1 / outcomes.length;
  const rows = outcomes
    .map((o, i) => {
      const color = COLORS_PALETTE[i % COLORS_PALETTE.length];
      const c = state.counts[o] || 0;
      const empP = state.total > 0 ? (c / state.total) : 0;
      return `<tr>
        <td><span class="ps-dot" style="background:${color}"></span> ${labels[o]}</td>
        <td>${c}</td>
        <td>${empP.toFixed(3)}</td>
        <td>${theoretical.toFixed(3)}</td>
      </tr>`;
    })
    .join('');

  return `
    <div class="ps-rdo-row"><span>Total trials</span><strong>${state.total}</strong></div>
    <table class="ps-table">
      <thead><tr><th>Outcome</th><th>Count</th><th>Empirical</th><th>Theoretical</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="ps-helper">As you do more trials, empirical probability typically gets closer to theoretical (the <em>law of large numbers</em>).</div>
  `;
}

export function mountProbabilitySim(target, userConfig = {}) {
  const state = { ...DEFAULTS, ...userConfig, counts: {}, total: 0 };
  reset(state);

  const setup = modeSetup(state);
  const trialButtons = state.trials
    .map((n) => `<button class="btn ps-trial-btn" data-ps-trials="${n}">Run ${n.toLocaleString()}</button>`)
    .join('');

  target.innerHTML = `
    <div class="ps-wrap">
      <div data-ps-chart></div>
      <div class="ps-controls">
        <div class="ps-title">${setup.title} simulator</div>
        <div data-ps-readouts></div>
        <div class="ps-buttons">
          ${trialButtons}
          <button class="btn ps-reset-btn" data-ps-reset>Reset</button>
        </div>
      </div>
    </div>
  `;

  const chartSlot = target.querySelector('[data-ps-chart]');
  const readoutsEl = target.querySelector('[data-ps-readouts]');

  function render() {
    chartSlot.innerHTML = drawChart(state);
    readoutsEl.innerHTML = readouts(state);
  }

  target.querySelectorAll('[data-ps-trials]').forEach((btn) => {
    btn.addEventListener('click', () => {
      runTrials(state, parseInt(btn.dataset.psTrials, 10));
      render();
    });
  });
  target.querySelector('[data-ps-reset]').addEventListener('click', () => {
    reset(state);
    render();
  });

  render();
}
