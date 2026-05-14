// Pan-balance widget for solving linear equations.
//
// Two pans on a balance. Left pan and right pan each hold some number
// of x-blocks and 1-weights. The current equation is shown live. The
// student applies operations to BOTH sides, watching the balance stay
// level the entire time. The point: "do the same to both sides" isn't
// a recipe — it's the only thing that preserves the equation.
//
// Operations available:
//   −1 both    remove one 1-weight from each side
//   +1 both    add one 1-weight to each side
//   −x both    remove one x-block from each side
//   ÷ 2 both   halve everything on both sides
//   reset      restore the starting equation
//
// Operations gracefully refuse if they'd produce negatives. Solution
// banner appears once the equation is of the form x = constant.
//
// Config:
//   start: { Lx, L1, Rx, R1 } — initial counts (defaults give 3x+2=x+8).
//   solution: optional integer; if omitted, computed from start.

const SVG_W = 720;
const SVG_H = 360;

const COLORS = {
  beam: '#1e293b',
  fulcrum: '#92400e',
  pan: '#94a3b8',
  panEdge: '#475569',
  xBlock: '#dc2626',
  xBlockEdge: '#7f1d1d',
  weight: '#facc15',
  weightEdge: '#a16207',
  text: '#0f172a',
  textMuted: '#64748b',
  bg: '#fafbfc',
  solved: '#16a34a',
};

const DEFAULTS = {
  start: { Lx: 3, L1: 2, Rx: 1, R1: 8 },
};

function value(side) {
  // For visualizing balance, treat x as the (true) solution value.
  return side.x * window.__balanceSolutionForDisplay + side.ones;
}

function blockSize(count) {
  // Adapt block size to count so we don't overflow the pan.
  if (count <= 5) return 38;
  if (count <= 8) return 30;
  if (count <= 12) return 24;
  return 18;
}

function drawPan(centerX, baseY, side, label, color, ringColor) {
  const xCount = side.x;
  const oneCount = side.ones;
  let svg = '';
  // Pan shape.
  svg += `<path d="M ${centerX - 90} ${baseY} Q ${centerX} ${baseY + 25} ${centerX + 90} ${baseY} L ${centerX + 75} ${baseY - 6} L ${centerX - 75} ${baseY - 6} Z" fill="${COLORS.pan}" stroke="${COLORS.panEdge}" stroke-width="2"/>`;
  // X-blocks: stack on left side of pan.
  const xs = blockSize(xCount);
  const cols = Math.min(4, Math.max(1, Math.ceil(xCount / 2)));
  const rows = Math.ceil(xCount / cols);
  for (let i = 0; i < xCount; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const bx = centerX - 70 + c * (xs + 4);
    const by = baseY - 12 - (r + 1) * (xs + 2);
    svg += `<rect x="${bx}" y="${by}" width="${xs}" height="${xs}" rx="4" fill="${COLORS.xBlock}" stroke="${COLORS.xBlockEdge}" stroke-width="1.5"/>`;
    svg += `<text x="${bx + xs / 2}" y="${by + xs / 2 + 4}" font-size="${xs * 0.55}" fill="white" text-anchor="middle" font-weight="700">x</text>`;
  }
  // 1-weights: small discs stacked on right side of pan.
  const ws = blockSize(oneCount) * 0.7;
  const wcols = Math.min(5, Math.max(1, Math.ceil(oneCount / 2)));
  for (let i = 0; i < oneCount; i++) {
    const r = Math.floor(i / wcols);
    const c = i % wcols;
    const wx = centerX + 8 + c * (ws + 3);
    const wy = baseY - 8 - (r + 1) * (ws + 2);
    svg += `<circle cx="${wx + ws / 2}" cy="${wy + ws / 2}" r="${ws / 2}" fill="${COLORS.weight}" stroke="${COLORS.weightEdge}" stroke-width="1.2"/>`;
    svg += `<text x="${wx + ws / 2}" y="${wy + ws / 2 + 3}" font-size="${ws * 0.55}" fill="${COLORS.text}" text-anchor="middle" font-weight="700">1</text>`;
  }
  // Side label.
  svg += `<text x="${centerX}" y="${baseY + 50}" font-size="14" fill="${COLORS.text}" text-anchor="middle" font-weight="700">${label}</text>`;
  return svg;
}

function drawScale(state, solution) {
  const beamCenterX = SVG_W / 2;
  const beamY = 110;
  // Determine tilt for visual feedback (if pan A weight ≠ pan B weight at the displayed solution).
  // Here we always start balanced (true equation), so beam stays level — but if the user breaks it
  // by, say, subtracting only from one side (not supported), tilt would show. We keep beam level.
  const tilt = 0; // radians
  const halfW = 250;
  const leftX = beamCenterX - halfW;
  const rightX = beamCenterX + halfW;
  const leftY = beamY + halfW * Math.sin(tilt);
  const rightY = beamY - halfW * Math.sin(tilt);
  let svg = '';
  // Fulcrum.
  svg += `<polygon points="${beamCenterX},${beamY + 8} ${beamCenterX - 28},${beamY + 80} ${beamCenterX + 28},${beamY + 80}" fill="${COLORS.fulcrum}" stroke="${COLORS.text}" stroke-width="1.5"/>`;
  svg += `<rect x="${beamCenterX - 50}" y="${beamY + 80}" width="100" height="8" fill="${COLORS.text}"/>`;
  // Beam.
  svg += `<line x1="${leftX}" y1="${leftY}" x2="${rightX}" y2="${rightY}" stroke="${COLORS.beam}" stroke-width="6" stroke-linecap="round"/>`;
  svg += `<circle cx="${beamCenterX}" cy="${beamY}" r="6" fill="${COLORS.beam}"/>`;
  // Chains.
  svg += `<line x1="${leftX}" y1="${leftY}" x2="${leftX}" y2="${leftY + 60}" stroke="${COLORS.beam}" stroke-width="1.5"/>`;
  svg += `<line x1="${rightX}" y1="${rightY}" x2="${rightX}" y2="${rightY + 60}" stroke="${COLORS.beam}" stroke-width="1.5"/>`;
  // Pans.
  svg += drawPan(leftX, leftY + 60, state.L, 'LEFT', COLORS.xBlock, COLORS.xBlockEdge);
  svg += drawPan(rightX, rightY + 60, state.R, 'RIGHT', COLORS.xBlock, COLORS.xBlockEdge);
  return svg;
}

function equationStr(state) {
  const fmt = (xCount, ones) => {
    let s = '';
    if (xCount > 0) s += xCount === 1 ? 'x' : `${xCount}x`;
    if (xCount > 0 && ones > 0) s += ' + ';
    if (ones > 0 || xCount === 0) s += `${ones}`;
    return s;
  };
  return `${fmt(state.L.x, state.L.ones)} = ${fmt(state.R.x, state.R.ones)}`;
}

function isSolved(state) {
  // Solved when one side is "x" alone and the other is just a number.
  return (state.L.x === 1 && state.L.ones === 0 && state.R.x === 0)
      || (state.R.x === 1 && state.R.ones === 0 && state.L.x === 0);
}

function solvedValue(state) {
  if (state.L.x === 1 && state.L.ones === 0 && state.R.x === 0) return state.R.ones;
  if (state.R.x === 1 && state.R.ones === 0 && state.L.x === 0) return state.L.ones;
  return null;
}

function applyOp(state, op) {
  const L = { ...state.L }, R = { ...state.R };
  switch (op) {
    case 'minus-1':
      if (L.ones < 1 || R.ones < 1) return null;
      L.ones -= 1; R.ones -= 1; break;
    case 'plus-1':
      L.ones += 1; R.ones += 1; break;
    case 'minus-x':
      if (L.x < 1 || R.x < 1) return null;
      L.x -= 1; R.x -= 1; break;
    case 'halve':
      if (L.x % 2 !== 0 || L.ones % 2 !== 0 || R.x % 2 !== 0 || R.ones % 2 !== 0) return null;
      L.x /= 2; L.ones /= 2; R.x /= 2; R.ones /= 2; break;
    default: return null;
  }
  return { L, R };
}

function nextOpHint(state) {
  // Suggest a productive next move.
  if (isSolved(state)) return null;
  // If both sides have ones and at least one common x-block, remove an x first.
  if (state.L.x >= 1 && state.R.x >= 1) return { op: 'minus-x', label: 'Try: − x from both sides' };
  // If both sides have ones, subtract one.
  if (state.L.ones >= 1 && state.R.ones >= 1) return { op: 'minus-1', label: 'Try: − 1 from both sides' };
  // Otherwise consider halving if all even.
  if (state.L.x % 2 === 0 && state.L.ones % 2 === 0 && state.R.x % 2 === 0 && state.R.ones % 2 === 0
      && (state.L.x > 1 || state.R.x > 1)) {
    return { op: 'halve', label: 'Try: ÷ 2 on both sides' };
  }
  return null;
}

export function mountBalanceScale(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const startState = {
    L: { x: cfg.start.Lx, ones: cfg.start.L1 },
    R: { x: cfg.start.Rx, ones: cfg.start.R1 },
  };
  // Compute solution: Lx·x + L1 = Rx·x + R1 → x = (R1 - L1) / (Lx - Rx).
  const solution = (startState.R.ones - startState.L.ones) / (startState.L.x - startState.R.x);
  if (!Number.isFinite(solution) || Math.abs(solution - Math.round(solution)) > 1e-9 || solution < 0) {
    throw new Error('balance-scale needs a non-negative integer solution');
  }
  window.__balanceSolutionForDisplay = solution; // used only by drawing helpers if visualizing tilt

  let state = JSON.parse(JSON.stringify(startState));
  const history = [];

  target.innerHTML = `
    <div class="bs-wrap">
      <svg class="bs-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Pan balance for solving an equation">
        <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${COLORS.bg}"/>
        <g data-bs-scale></g>
        <g data-bs-banner></g>
      </svg>
      <div class="bs-eq" data-bs-eq></div>
      <div class="bs-controls">
        <div class="bs-row">
          <button type="button" class="bs-btn" data-bs-op="minus-1">−1 both</button>
          <button type="button" class="bs-btn" data-bs-op="plus-1">+1 both</button>
          <button type="button" class="bs-btn" data-bs-op="minus-x">−x both</button>
          <button type="button" class="bs-btn" data-bs-op="halve">÷ 2 both</button>
          <button type="button" class="bs-btn bs-btn-light" data-bs-undo>Undo</button>
          <button type="button" class="bs-btn bs-btn-light" data-bs-reset>Reset</button>
        </div>
        <div class="bs-hint" data-bs-hint></div>
        <div class="bs-note">Each operation must be applied to <strong>both sides</strong>. As long as you do, the scale stays balanced — that is what "an equation" means. Your goal is to leave just <em>x</em> alone on one side.</div>
      </div>
    </div>
  `;

  const gScale = target.querySelector('[data-bs-scale]');
  const gBanner = target.querySelector('[data-bs-banner]');
  const eqBox = target.querySelector('[data-bs-eq]');
  const hintBox = target.querySelector('[data-bs-hint]');

  function render() {
    gScale.innerHTML = drawScale(state, solution);
    eqBox.innerHTML = equationStr(state);
    const hint = nextOpHint(state);
    if (isSolved(state)) {
      gBanner.innerHTML = `<rect x="${SVG_W / 2 - 140}" y="${SVG_H - 50}" width="280" height="36" rx="18" fill="${COLORS.solved}" opacity="0.9"/><text x="${SVG_W / 2}" y="${SVG_H - 26}" font-size="18" fill="white" text-anchor="middle" font-weight="700">Solved!  x = ${solvedValue(state)}</text>`;
      hintBox.innerHTML = `<strong>Done.</strong> The equation is now <code>x = ${solvedValue(state)}</code>.`;
    } else {
      gBanner.innerHTML = '';
      hintBox.innerHTML = hint ? hint.label : '';
    }
  }
  render();

  target.querySelectorAll('[data-bs-op]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const op = btn.dataset.bsOp;
      const next = applyOp(state, op);
      if (next == null) {
        btn.classList.add('bs-shake');
        setTimeout(() => btn.classList.remove('bs-shake'), 300);
        return;
      }
      history.push(JSON.parse(JSON.stringify(state)));
      state = next;
      render();
    });
  });
  target.querySelector('[data-bs-undo]').addEventListener('click', () => {
    if (!history.length) return;
    state = history.pop();
    render();
  });
  target.querySelector('[data-bs-reset]').addEventListener('click', () => {
    state = JSON.parse(JSON.stringify(startState));
    history.length = 0;
    render();
  });
}
