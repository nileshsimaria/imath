import katex from 'katex';

// Interactive prime-factor-tree widget.
//
// Modes:
//   - 'single'  (default)  — pick one number, see its factor tree
//   - 'compare'            — pick two numbers, see both trees side-by-side
//                            with GCD/LCM derived from min/max prime exponents

const COLORS = {
  composite: '#3b82f6',
  compositeText: '#ffffff',
  prime: '#f59e0b',           // prime not shared with all other trees
  primeText: '#ffffff',
  primeShared: '#10b981',     // prime that appears in ALL compared trees
  line: '#94a3b8',
};

const NODE_R = 20;
const ROW_H = 64;
const LEAF_GAP = 52;

const tex = (s, display = false) => {
  try { return katex.renderToString(s, { throwOnError: false, displayMode: display }); }
  catch { return s; }
};

function isPrime(n) {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i * i <= n; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

function smallestPrimeFactor(n) {
  if (n % 2 === 0) return 2;
  for (let i = 3; i * i <= n; i += 2) {
    if (n % i === 0) return i;
  }
  return n;
}

function buildTree(n) {
  if (n < 2 || isPrime(n)) return { value: n, prime: true, children: [] };
  const p = smallestPrimeFactor(n);
  return { value: n, prime: false, children: [buildTree(p), buildTree(n / p)] };
}

function primeFactors(n) {
  const out = {};
  let m = n;
  while (m > 1) {
    const p = smallestPrimeFactor(m);
    out[p] = (out[p] || 0) + 1;
    m /= p;
  }
  return out;
}

function factorizationTex(factors) {
  const keys = Object.keys(factors).map(Number).sort((a, b) => a - b);
  if (!keys.length) return '1';
  return keys.map(p => factors[p] === 1 ? `${p}` : `${p}^{${factors[p]}}`).join(' \\cdot ');
}

// Bottom-up layout: leaves get assigned x left-to-right, internals are
// centered above their children.
function layoutTree(root) {
  let nextLeafX = 0;
  function place(node, depth) {
    node.depth = depth;
    if (!node.children.length) {
      node.x = nextLeafX;
      nextLeafX += LEAF_GAP;
    } else {
      for (const c of node.children) place(c, depth + 1);
      node.x = (node.children[0].x + node.children[node.children.length - 1].x) / 2;
    }
  }
  place(root, 0);
  return nextLeafX || LEAF_GAP;
}

function maxDepth(node) {
  if (!node.children.length) return 0;
  return 1 + Math.max(...node.children.map(maxDepth));
}

function flatten(node, out = []) {
  out.push(node);
  for (const c of node.children) flatten(c, out);
  return out;
}

function renderTreeSvg(root, sharedPrimes = null) {
  const totalLeafSpan = layoutTree(root);
  const depth = maxDepth(root);
  const width = Math.max(totalLeafSpan + LEAF_GAP, 160);
  const height = (depth + 1) * ROW_H + 20;
  const offsetX = (width - totalLeafSpan + LEAF_GAP) / 2 - LEAF_GAP / 2;

  const nodes = flatten(root);
  const lines = [];
  const circles = [];
  for (const n of nodes) {
    const px = n.x + offsetX;
    const py = n.depth * ROW_H + NODE_R + 10;
    for (const c of n.children) {
      const cx = c.x + offsetX;
      const cy = c.depth * ROW_H + NODE_R + 10;
      lines.push(`<line x1="${px}" y1="${py + NODE_R - 2}" x2="${cx}" y2="${cy - NODE_R + 2}" stroke="${COLORS.line}" stroke-width="2"/>`);
    }
    const isShared = n.prime && sharedPrimes && sharedPrimes.has(n.value);
    const fill = !n.prime ? COLORS.composite : isShared ? COLORS.primeShared : COLORS.prime;
    const tcolor = n.prime ? COLORS.primeText : COLORS.compositeText;
    circles.push(`<circle cx="${px}" cy="${py}" r="${NODE_R}" fill="${fill}" stroke="white" stroke-width="2"/>`);
    circles.push(`<text x="${px}" y="${py + 5}" text-anchor="middle" fill="${tcolor}" font-weight="700" font-size="14">${n.value}</text>`);
  }
  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMin meet" style="max-width: 100%; height: auto; display: block">
    ${lines.join('')}${circles.join('')}
  </svg>`;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function renderSingle(target, cfg, state) {
  const tree = buildTree(state.n);
  const svg = renderTreeSvg(tree);
  const factors = primeFactors(state.n);
  const isPrimeNum = Object.keys(factors).length === 1 && Object.values(factors)[0] === 1;

  target.innerHTML = `
    <div class="ft-widget">
      <div class="ft-controls">
        <label>Number: <strong data-ft-num>${state.n}</strong></label>
        <input type="range" min="${cfg.min}" max="${cfg.max}" step="1" value="${state.n}" data-ft-slider/>
        <input type="number" min="${cfg.min}" max="${cfg.max}" step="1" value="${state.n}" data-ft-input class="ft-num"/>
      </div>
      <div class="ft-tree">${svg}</div>
      <div class="ft-readout">
        <div class="ft-row"><span>Prime factorization</span><strong>${tex(`${state.n} = ${factorizationTex(factors)}`)}</strong></div>
        ${isPrimeNum ? `<div class="ft-note">${state.n} is <strong>prime</strong> — its tree is a single leaf.</div>` : ''}
      </div>
      <div class="ft-helper">
        <span class="ft-legend ft-legend-comp"></span> composite (split it)
        &nbsp;&nbsp;
        <span class="ft-legend ft-legend-prime"></span> prime (done)
      </div>
    </div>
  `;

  const slider = target.querySelector('[data-ft-slider]');
  const numInput = target.querySelector('[data-ft-input]');
  function update(v) {
    state.n = clamp(parseInt(v) || cfg.min, cfg.min, cfg.max);
    renderSingle(target, cfg, state);
  }
  slider.addEventListener('input', (e) => update(e.target.value));
  numInput.addEventListener('change', (e) => update(e.target.value));
}

function renderCompare(target, cfg, state) {
  const nums = state.nums;
  const factorMaps = nums.map(primeFactors);
  const trees = nums.map(buildTree);

  // Union of primes across all numbers
  const allPrimeSet = new Set();
  for (const f of factorMaps) for (const k of Object.keys(f)) allPrimeSet.add(Number(k));
  const allPrimes = [...allPrimeSet].sort((a, b) => a - b);

  // Shared primes = appear in ALL numbers (these contribute to GCD)
  const sharedSet = new Set(
    allPrimes.filter(p => factorMaps.every(f => (f[p] || 0) > 0)),
  );

  let gcd = 1, lcm = 1;
  const expHeaders = nums.map(n => `<th>exp in $${n}$</th>`).join('');
  const tableRows = allPrimes.map(p => {
    const exps = factorMaps.map(f => f[p] || 0);
    const minE = Math.min(...exps);
    const maxE = Math.max(...exps);
    gcd *= Math.pow(p, minE);
    lcm *= Math.pow(p, maxE);
    const expCells = exps.map(e => `<td>${tex(`${e}`)}</td>`).join('');
    return `<tr>
      <td>${tex(`${p}`)}</td>
      ${expCells}
      <td class="ft-min">${tex(`${minE}`)}</td>
      <td class="ft-max">${tex(`${maxE}`)}</td>
    </tr>`;
  }).join('');

  // Slider controls — one per number, labeled by the variable letter
  const labels = ['a', 'b', 'c', 'd'];
  const sliderControls = nums.map((n, i) => `
    <div>
      <label>$${labels[i]}$ = <strong>${n}</strong></label>
      <input type="range" min="${cfg.min}" max="${cfg.max}" step="1" value="${n}" data-ft-slider="${i}"/>
    </div>
  `).join('');

  // Tree halves
  const halves = nums.map((n, i) => `
    <div class="ft-pair-half">
      <h4>${tex(`${labels[i]} = ${n}`)}</h4>
      <div class="ft-tree">${renderTreeSvg(trees[i], sharedSet)}</div>
      <div class="ft-fact">${tex(`${n} = ${factorizationTex(factorMaps[i])}`)}</div>
    </div>
  `).join('');

  const productExpr = nums.map(String).join(' \\cdot ');
  const productValue = nums.reduce((a, b) => a * b, 1);

  // Identity row only makes sense for 2 numbers
  const identityRow = nums.length === 2
    ? `<div class="ft-row"><span>Identity</span><strong>${tex(`\\gcd \\cdot \\mathrm{lcm} = ${gcd} \\cdot ${lcm} = ${gcd * lcm} = ${productExpr}`)}</strong></div>`
    : `<div class="ft-row"><span>Note</span><strong style="font-weight:400">${tex(`\\gcd \\cdot \\mathrm{lcm} \\neq ${productExpr}`)} for $\\geq 3$ numbers — the identity only holds for two.</strong></div>`;

  target.innerHTML = `
    <div class="ft-widget">
      <div class="ft-controls ft-controls-pair ft-controls-${nums.length}">
        ${sliderControls}
      </div>
      <div class="ft-pair ft-pair-${nums.length}">
        ${halves}
      </div>
      <div class="ft-readme">
        <strong style="color:var(--text)">How to read this:</strong>
        <span class="ft-legend ft-legend-shared"></span> <strong>green</strong> primes appear in <strong>every</strong> tree → take the <strong style="color:#047857">smaller</strong> count for GCD.
        &nbsp;
        <span class="ft-legend ft-legend-prime"></span> <strong>orange</strong> primes appear in only some trees → they only count for LCM.
      </div>
      <table class="ft-table">
        <thead>
          <tr><th>prime</th>${expHeaders}<th class="ft-min">min (GCD)</th><th class="ft-max">max (LCM)</th></tr>
        </thead>
        <tbody>${tableRows || `<tr><td colspan="${nums.length + 3}">no primes</td></tr>`}</tbody>
      </table>
      <div class="ft-readout">
        <div class="ft-row"><span>GCD</span><strong>${tex(`\\gcd(${nums.join(', ')}) = ${gcd}`)}</strong></div>
        <div class="ft-row"><span>LCM</span><strong>${tex(`\\mathrm{lcm}(${nums.join(', ')}) = ${lcm}`)}</strong></div>
        ${identityRow}
      </div>
    </div>
  `;

  target.querySelectorAll('[data-ft-slider]').forEach((el) => {
    el.addEventListener('input', (e) => {
      const i = Number(el.dataset.ftSlider);
      state.nums[i] = clamp(parseInt(e.target.value), cfg.min, cfg.max);
      renderCompare(target, cfg, state);
    });
  });
}

export function mountFactorTree(target, userConfig = {}) {
  const cfg = {
    mode: 'single',
    n: 60,
    nums: null,
    a: 12,
    b: 18,
    min: 2,
    max: 200,
    ...userConfig,
  };
  if (cfg.mode === 'compare') {
    // Accept either explicit nums array or legacy a, b
    const nums = Array.isArray(cfg.nums) && cfg.nums.length >= 2
      ? cfg.nums.slice()
      : [cfg.a, cfg.b];
    renderCompare(target, cfg, { nums });
  } else {
    renderSingle(target, cfg, { n: cfg.n });
  }
}
