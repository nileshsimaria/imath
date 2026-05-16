// monty-hall — the Monty Hall problem, two ways. Top: play single rounds by
// hand (pick a door, the host reveals a goat, stay or switch). Bottom: let the
// computer play thousands of games and watch the switch win-rate settle on 2/3.

const TWO_THIRDS = 2 / 3;
const C = { switch: '#16a34a', stay: '#f43f5e' };

const randInt = (n) => Math.floor(Math.random() * n);
const thirdDoor = (a, b) => [0, 1, 2].find((d) => d !== a && d !== b);

export function mountMontyHall(target) {
  let game = null; // { car, pick, opened, final, phase: 'decide'|'result' }
  const manual = { switched: { played: 0, won: 0 }, stayed: { played: 0, won: 0 } };
  const sim = { games: 0, switchWins: 0, stayWins: 0, running: false, samples: [] };
  let rafId = null;

  target.innerHTML = `
    <div class="mh-wrap">
      <div class="mh-doors" data-mh-doors></div>
      <p class="mh-status" data-mh-status></p>
      <div class="mh-choice" data-mh-choice></div>
      <p class="mh-score" data-mh-score></p>

      <div class="mh-sim">
        <div class="mh-sim-head">Now let the computer play thousands of games</div>
        <div class="mc-stats" data-mh-stats></div>
        <svg class="mh-chart" viewBox="0 0 380 210" role="img" aria-label="Win rates converging">
          <g data-mh-chart></g>
        </svg>
        <div class="mc-controls">
          <button class="mc-btn mc-btn-run" data-mh-run>▶ Run</button>
          <button class="mc-btn" data-mh-add="100">+100 games</button>
          <button class="mc-btn" data-mh-add="1000">+1000</button>
          <button class="mc-btn mc-btn-reset" data-mh-reset>↺ Reset</button>
        </div>
      </div>
    </div>
  `;

  const doorsEl = target.querySelector('[data-mh-doors]');
  const statusEl = target.querySelector('[data-mh-status]');
  const choiceEl = target.querySelector('[data-mh-choice]');
  const scoreEl = target.querySelector('[data-mh-score]');
  const statsEl = target.querySelector('[data-mh-stats]');
  const chartG = target.querySelector('[data-mh-chart]');
  const runBtn = target.querySelector('[data-mh-run]');

  // ── manual game ──
  function renderDoors() {
    let html = '';
    for (let i = 0; i < 3; i++) {
      let face = '🚪', cls = 'mh-door';
      const open = game && (i === game.opened || game.phase === 'result');
      if (open) {
        const isCar = i === game.car;
        face = i === game.opened ? '🐐' : isCar ? '🚗' : '🐐';
        cls += ' mh-door-open';
      }
      if (game && i === game.pick) cls += ' mh-door-pick';
      if (game && game.phase === 'result' && i === game.final) cls += ' mh-door-final';
      const disabled = game ? 'disabled' : '';
      html += `<button class="${cls}" data-door="${i}" ${disabled}>
        <span class="mh-door-face">${face}</span>
        <span class="mh-door-label">Door ${i + 1}</span>
      </button>`;
    }
    doorsEl.innerHTML = html;
  }

  function renderStatus() {
    if (!game) {
      statusEl.textContent = 'Pick any door. One hides a car; the other two hide goats.';
      choiceEl.innerHTML = '';
    } else if (game.phase === 'decide') {
      const other = thirdDoor(game.pick, game.opened);
      statusEl.innerHTML = `You picked <strong>Door ${game.pick + 1}</strong>. The host opens <strong>Door ${game.opened + 1}</strong> and reveals a goat. Do you keep your door, or switch to Door ${other + 1}?`;
      choiceEl.innerHTML =
        `<button class="mh-btn-choice" data-choice="stay">Stay with Door ${game.pick + 1}</button>` +
        `<button class="mh-btn-choice mh-btn-switch" data-choice="switch">Switch to Door ${other + 1}</button>`;
    } else {
      const won = game.final === game.car;
      statusEl.innerHTML = won
        ? `🎉 You opened <strong>Door ${game.final + 1}</strong> and won the car!`
        : `🐐 You opened <strong>Door ${game.final + 1}</strong> and found a goat.`;
      choiceEl.innerHTML = `<button class="mh-btn-choice" data-choice="again">Play another round</button>`;
    }
  }

  function renderScore() {
    const s = manual.switched, t = manual.stayed;
    if (s.played + t.played === 0) { scoreEl.textContent = ''; return; }
    scoreEl.innerHTML = `Your rounds so far: switched <strong>${s.won}/${s.played}</strong> won, stayed <strong>${t.won}/${t.played}</strong> won.`;
  }

  function renderGame() {
    renderDoors();
    renderStatus();
    renderScore();
  }

  function startGame(pick) {
    const car = randInt(3);
    const opts = [0, 1, 2].filter((d) => d !== pick && d !== car);
    const opened = opts[randInt(opts.length)];
    game = { car, pick, opened, phase: 'decide' };
    renderGame();
  }

  function choose(kind) {
    if (kind === 'again') { game = null; renderGame(); return; }
    const switched = kind === 'switch';
    game.final = switched ? thirdDoor(game.pick, game.opened) : game.pick;
    game.phase = 'result';
    const bucket = switched ? manual.switched : manual.stayed;
    bucket.played++;
    if (game.final === game.car) bucket.won++;
    renderGame();
  }

  // ── computer simulation ──
  function addGames(k) {
    for (let i = 0; i < k; i++) {
      // switching wins exactly when the first pick was wrong.
      if (randInt(3) === randInt(3)) sim.stayWins++;
      else sim.switchWins++;
      sim.games++;
    }
    sim.samples.push(sim.switchWins / sim.games);
    if (sim.samples.length > 600) {
      sim.samples = sim.samples.filter((_, idx) => idx % 2 === 0);
    }
    renderSim();
  }

  function renderSim() {
    const g = sim.games;
    const sw = g ? (100 * sim.switchWins) / g : 0;
    const st = g ? (100 * sim.stayWins) / g : 0;
    statsEl.innerHTML = `
      <div class="mc-stat mh-stat-switch">
        <span class="mc-stat-val">${g ? sw.toFixed(1) + '%' : '·'}</span>
        <span class="mc-stat-label">switch wins</span>
      </div>
      <div class="mc-stat mh-stat-stay">
        <span class="mc-stat-val">${g ? st.toFixed(1) + '%' : '·'}</span>
        <span class="mc-stat-label">stay wins</span>
      </div>
      <div class="mc-stat">
        <span class="mc-stat-val">${g.toLocaleString()}</span>
        <span class="mc-stat-label">games played</span>
      </div>`;
    drawChart();
  }

  function drawChart() {
    const VW = 380, VH = 210, padL = 40, padR = 10, padT = 12, padB = 22;
    const plotW = VW - padL - padR, plotH = VH - padT - padB;
    const yOf = (v) => padT + plotH - v * plotH;          // v in 0..1
    const xOf = (i, n) => padL + (n <= 1 ? 0 : (i / (n - 1)) * plotW);

    let svg = '';
    for (const v of [0, 0.25, 0.5, 0.75, 1]) {
      const y = yOf(v);
      svg += `<line x1="${padL}" y1="${y}" x2="${VW - padR}" y2="${y}" stroke="#eef2f7" stroke-width="1"/>`;
      svg += `<text x="${padL - 6}" y="${y + 4}" font-size="10" fill="#94a3b8" text-anchor="end">${v * 100}%</text>`;
    }
    // reference lines at the true answers
    for (const [v, col] of [[TWO_THIRDS, C.switch], [1 / 3, C.stay]]) {
      const y = yOf(v);
      svg += `<line x1="${padL}" y1="${y}" x2="${VW - padR}" y2="${y}" stroke="${col}" stroke-width="1.3" stroke-dasharray="4 3" opacity="0.6"/>`;
    }
    svg += `<text x="${VW - padR}" y="${yOf(TWO_THIRDS) - 5}" font-size="10" fill="${C.switch}" text-anchor="end">switch → 66.7%</text>`;
    svg += `<text x="${VW - padR}" y="${yOf(1 / 3) + 14}" font-size="10" fill="${C.stay}" text-anchor="end">stay → 33.3%</text>`;
    // win-rate lines
    const s = sim.samples;
    if (s.length > 1) {
      const sw = s.map((v, i) => `${xOf(i, s.length).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');
      const st = s.map((v, i) => `${xOf(i, s.length).toFixed(1)},${yOf(1 - v).toFixed(1)}`).join(' ');
      svg += `<polyline points="${sw}" fill="none" stroke="${C.switch}" stroke-width="2"/>`;
      svg += `<polyline points="${st}" fill="none" stroke="${C.stay}" stroke-width="2"/>`;
    }
    chartG.innerHTML = svg;
  }

  function loop() {
    if (!sim.running) return;
    if (!target.isConnected) { sim.running = false; return; }
    addGames(300);
    rafId = requestAnimationFrame(loop);
  }

  function setRunning(on) {
    sim.running = on;
    runBtn.textContent = on ? '⏸ Pause' : '▶ Run';
    runBtn.classList.toggle('is-running', on);
    if (on) loop();
    else if (rafId) cancelAnimationFrame(rafId);
  }

  function resetSim() {
    setRunning(false);
    sim.games = 0; sim.switchWins = 0; sim.stayWins = 0; sim.samples = [];
    renderSim();
  }

  // ── events ──
  target.addEventListener('click', (e) => {
    const door = e.target.closest('[data-door]');
    if (door && !game) { startGame(Number(door.dataset.door)); return; }
    const choice = e.target.closest('[data-choice]');
    if (choice) { choose(choice.dataset.choice); return; }
    const add = e.target.closest('[data-mh-add]');
    if (add) { setRunning(false); addGames(parseInt(add.dataset.mhAdd, 10)); return; }
    if (e.target.closest('[data-mh-run]')) setRunning(!sim.running);
    if (e.target.closest('[data-mh-reset]')) resetSim();
  });

  renderGame();
  renderSim();
}
