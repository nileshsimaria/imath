import katex from 'katex';

// exponent-blocks — makes the exponent rules visual by drawing each power as
// a row of factor blocks. Modes:
//   product   a^m · a^n  — count m blocks then n blocks
//   power     (a^m)^n    — n rows of m blocks (a grid)
//   quotient  a^m / a^n  — cancel matching blocks top and bottom
//   pattern   a ladder showing each step down divides by a (a^0, a^-n)

const DEFAULTS = { mode: 'product', a: 2, m: 3, n: 2 };
const MIN = 1, MAX = 6;

const tex = (s, display = false) => {
  try { return katex.renderToString(s, { throwOnError: false, displayMode: display }); }
  catch { return s; }
};

const clamp = (v) => Math.max(MIN, Math.min(MAX, v));

function blocks(count, cls, crossed = 0) {
  let s = '';
  for (let i = 0; i < count; i++) {
    const x = i < crossed ? ' eb-crossed' : '';
    s += `<span class="eb-block ${cls}${x}">a</span>`;
  }
  return s;
}

// ── product / power / quotient share one shell with m, n sliders ──
function mountRule(target, cfg) {
  const mode = cfg.mode;
  const state = { m: clamp(cfg.m), n: clamp(cfg.n) };

  target.innerHTML = `
    <div class="eb-wrap">
      <div class="eb-stage" data-eb-stage></div>
      <div class="eb-controls">
        <div class="eb-eq" data-eb-eq></div>
        <div class="eb-row">
          <label>m</label>
          <input type="range" data-eb-m min="${MIN}" max="${MAX}" step="1" value="${state.m}"/>
          <span class="val" data-eb-mv>${state.m}</span>
        </div>
        <div class="eb-row">
          <label>n</label>
          <input type="range" data-eb-n min="${MIN}" max="${MAX}" step="1" value="${state.n}"/>
          <span class="val" data-eb-nv>${state.n}</span>
        </div>
        <div class="eb-helper" data-eb-help></div>
      </div>
    </div>
  `;

  const stage = target.querySelector('[data-eb-stage]');
  const eqBox = target.querySelector('[data-eb-eq]');
  const help = target.querySelector('[data-eb-help]');

  function render() {
    const { m, n } = state;
    if (mode === 'product') {
      stage.innerHTML = `
        <div class="eb-line">
          <span class="eb-tag">a<sup>${m}</sup></span>
          <span class="eb-blocks">${blocks(m, 'eb-a')}</span>
          <span class="eb-op">×</span>
          <span class="eb-tag">a<sup>${n}</sup></span>
          <span class="eb-blocks">${blocks(n, 'eb-b')}</span>
        </div>
        <div class="eb-line eb-result">
          <span class="eb-tag">a<sup>${m + n}</sup></span>
          <span class="eb-blocks">${blocks(m, 'eb-a')}${blocks(n, 'eb-b')}</span>
        </div>`;
      eqBox.innerHTML = tex(`a^{${m}} \\cdot a^{${n}} = a^{${m}+${n}} = a^{${m + n}}`, true);
      help.innerHTML = `Push the two rows together and count: ${m} copies of $a$ beside ${n} copies of $a$ is ${m + n} copies in all.`;
    } else if (mode === 'power') {
      let rows = '';
      for (let i = 0; i < n; i++) {
        rows += `<div class="eb-line"><span class="eb-blocks">${blocks(m, i % 2 ? 'eb-b' : 'eb-a')}</span></div>`;
      }
      stage.innerHTML = `
        <div class="eb-gridlabel">${n} copies of <span class="eb-tag">a<sup>${m}</sup></span></div>
        <div class="eb-grid">${rows}</div>`;
      eqBox.innerHTML = tex(`(a^{${m}})^{${n}} = a^{${m}\\times${n}} = a^{${m * n}}`, true);
      help.innerHTML = `$(a^{${m}})^{${n}}$ is ${n} stacked rows of ${m} blocks. A grid of ${m}×${n} holds ${m * n} blocks.`;
    } else {
      // quotient
      const k = Math.min(m, n);
      const diff = m - n;
      stage.innerHTML = `
        <div class="eb-fraction">
          <div class="eb-blocks">${blocks(m, 'eb-a', k)}</div>
          <div class="eb-fbar"></div>
          <div class="eb-blocks">${blocks(n, 'eb-b', k)}</div>
        </div>
        <div class="eb-line eb-result">
          <span class="eb-tag">${diff >= 0 ? `a<sup>${diff}</sup>` : `1 / a<sup>${-diff}</sup>`}</span>
          <span class="eb-blocks">${diff > 0 ? blocks(diff, 'eb-a') : diff < 0 ? blocks(-diff, 'eb-b') : '<span class="eb-one">1</span>'}</span>
        </div>`;
      eqBox.innerHTML = tex(`\\dfrac{a^{${m}}}{a^{${n}}} = a^{${m}-${n}} = a^{${diff}}`, true);
      help.innerHTML = `Each $a$ on top cancels an $a$ on the bottom (${k} cancelled). Whatever is left over is the answer.`;
    }
  }

  render();
  target.querySelector('[data-eb-m]').addEventListener('input', (e) => {
    state.m = clamp(parseInt(e.target.value, 10));
    target.querySelector('[data-eb-mv]').textContent = state.m;
    render();
  });
  target.querySelector('[data-eb-n]').addEventListener('input', (e) => {
    state.n = clamp(parseInt(e.target.value, 10));
    target.querySelector('[data-eb-nv]').textContent = state.n;
    render();
  });
}

// ── pattern mode: the ladder of powers stepping down by ÷ a ──
function mountPattern(target, cfg) {
  const state = { a: Math.max(2, Math.min(5, cfg.a || 2)) };

  target.innerHTML = `
    <div class="eb-wrap">
      <div class="eb-ladder" data-eb-ladder></div>
      <div class="eb-controls">
        <div class="eb-row">
          <label>a</label>
          <input type="range" data-eb-a min="2" max="5" step="1" value="${state.a}"/>
          <span class="val" data-eb-av>${state.a}</span>
        </div>
        <div class="eb-helper">Each step down divides by $a$. The pattern does not stop at $a^1$: it forces $a^0 = 1$, and then the negative powers.</div>
      </div>
    </div>
  `;

  const ladder = target.querySelector('[data-eb-ladder]');

  function valueTex(a, k) {
    if (k > 0) return `${Math.pow(a, k)}`;
    if (k === 0) return '1';
    return `\\dfrac{1}{${Math.pow(a, -k)}}`;
  }

  function render() {
    const a = state.a;
    let html = '';
    for (let k = 4; k >= -3; k--) {
      const cls = k === 0 ? 'is-zero' : k < 0 ? 'is-neg' : '';
      html += `<div class="eb-ladder-row ${cls}">${tex(`a^{${k}} = ${valueTex(a, k)}`)}</div>`;
      if (k > -3) html += `<div class="eb-ladder-arrow">÷ a</div>`;
    }
    ladder.innerHTML = html;
  }

  render();
  target.querySelector('[data-eb-a]').addEventListener('input', (e) => {
    state.a = parseInt(e.target.value, 10);
    target.querySelector('[data-eb-av]').textContent = state.a;
    render();
  });
}

export function mountExponentBlocks(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  if (cfg.mode === 'pattern') return mountPattern(target, cfg);
  return mountRule(target, cfg);
}
