// Discrete function-mapping diagram (input set → output set with arrows).
//
// Modes:
//   function       — every input has exactly one outgoing arrow.
//   not-function   — one input has TWO outgoing arrows (violation).
//   injective      — function AND no two inputs share an output.
//   not-injective  — function but two inputs map to the same output.
//   surjective     — every output is hit by some input.
//   not-surjective — at least one output has no arrow into it.
//   bijective      — injective AND surjective.
//
// Each mode renders a small "verdict box" explaining what to look for.
//
// Config:
//   mode: one of the above (default 'function')
//   showVerdict: bool (default true)

const SVG_W = 540;
const SVG_H = 320;
const PAD = 24;

const COL_X = {
  left: 130,
  right: 410,
};

const COLORS = {
  set: '#f1f5f9',
  setEdge: '#cbd5e1',
  node: '#fff',
  nodeEdge: '#475569',
  arrow: '#4f46e5',
  arrowBad: '#dc2626',
  arrowGood: '#16a34a',
  highlight: '#fde68a',
  text: '#1e293b',
  textMuted: '#64748b',
};

// Each mode declares: label, inputs (array of element labels),
// outputs (array of element labels), arrows (array of [inputIdx, outputIdx]),
// optional violation highlight (badArrows array).
const MODES = {
  'function': {
    title: 'Function',
    subtitle: 'Every input has exactly one output.',
    inputs: ['a', 'b', 'c', 'd'],
    outputs: ['1', '2', '3', '4', '5'],
    arrows: [[0, 1], [1, 2], [2, 1], [3, 4]],
    verdict: {
      label: '✓ This IS a function',
      detail: 'Every element in the input set has exactly one arrow leaving it. Multiple inputs are allowed to share an output (here both **a** and **c** map to **2**); that does not break the function rule.',
      good: true,
    },
  },
  'not-function': {
    title: 'Not a Function',
    subtitle: 'Some input has more than one output.',
    inputs: ['a', 'b', 'c', 'd'],
    outputs: ['1', '2', '3', '4'],
    arrows: [[0, 1], [1, 0], [1, 2], [2, 3], [3, 0]],
    badArrows: [[1, 0], [1, 2]],
    verdict: {
      label: '✗ NOT a function',
      detail: 'The element **b** has TWO arrows leaving it (to 1 and to 3). A function must assign each input exactly one output — so this relation is not a function.',
      good: false,
    },
  },
  'injective': {
    title: 'Injective (one-to-one)',
    subtitle: 'No two inputs share an output.',
    inputs: ['a', 'b', 'c'],
    outputs: ['1', '2', '3', '4', '5'],
    arrows: [[0, 0], [1, 2], [2, 4]],
    verdict: {
      label: '✓ Injective',
      detail: 'Every input goes to a *different* output — no two arrows land on the same target. Some outputs (2, 4) have no incoming arrow, and that\'s fine for injectivity.',
      good: true,
    },
  },
  'not-injective': {
    title: 'Not Injective',
    subtitle: 'Two different inputs share the same output.',
    inputs: ['a', 'b', 'c', 'd'],
    outputs: ['1', '2', '3', '4'],
    arrows: [[0, 0], [1, 2], [2, 2], [3, 3]],
    badArrows: [[1, 2], [2, 2]],
    verdict: {
      label: '✗ NOT injective',
      detail: 'Both **b** and **c** map to **3**. Two different inputs share an output, so the function is not one-to-one.',
      good: false,
    },
  },
  'surjective': {
    title: 'Surjective (onto)',
    subtitle: 'Every output is hit by some input.',
    inputs: ['a', 'b', 'c', 'd', 'e'],
    outputs: ['1', '2', '3'],
    arrows: [[0, 0], [1, 0], [2, 1], [3, 2], [4, 2]],
    verdict: {
      label: '✓ Surjective',
      detail: 'Every element of the output set has at least one arrow coming in — no element is "left out". Multiple inputs can hit the same output (a, b both go to 1); that does not affect surjectivity.',
      good: true,
    },
  },
  'not-surjective': {
    title: 'Not Surjective',
    subtitle: 'Some output is never reached.',
    inputs: ['a', 'b', 'c'],
    outputs: ['1', '2', '3', '4'],
    arrows: [[0, 0], [1, 1], [2, 3]],
    badOutputs: [2],
    verdict: {
      label: '✗ NOT surjective',
      detail: 'The element **3** in the output set has no arrow pointing to it — no input maps there. So the function is not "onto".',
      good: false,
    },
  },
  'bijective': {
    title: 'Bijective (one-to-one AND onto)',
    subtitle: 'Every input hits a unique output, every output is hit.',
    inputs: ['a', 'b', 'c', 'd'],
    outputs: ['1', '2', '3', '4'],
    arrows: [[0, 1], [1, 3], [2, 0], [3, 2]],
    verdict: {
      label: '✓ Bijective',
      detail: 'Injective (no two inputs share an output) **and** surjective (every output is hit). A perfect pairing — every input has its own unique partner in the output set. Bijective functions have inverses.',
      good: true,
    },
  },
};

function nodeY(i, n) {
  const top = 56;
  const bot = SVG_H - 56;
  if (n === 1) return (top + bot) / 2;
  return top + (i / (n - 1)) * (bot - top);
}

function setBox(x, items, labelText) {
  const top = 30;
  const bot = SVG_H - 20;
  let svg = `<rect x="${x - 38}" y="${top}" width="76" height="${bot - top}" rx="38" fill="${COLORS.set}" stroke="${COLORS.setEdge}" stroke-width="1.5"/>`;
  svg += `<text x="${x}" y="${top - 8}" font-size="13" fill="${COLORS.textMuted}" text-anchor="middle" font-style="italic">${labelText}</text>`;
  for (let i = 0; i < items.length; i++) {
    const cy = nodeY(i, items.length);
    svg += `<circle cx="${x}" cy="${cy}" r="16" fill="${COLORS.node}" stroke="${COLORS.nodeEdge}" stroke-width="1.5"/>`;
    svg += `<text x="${x}" y="${cy + 5}" font-size="14" fill="${COLORS.text}" text-anchor="middle" font-weight="600">${items[i]}</text>`;
  }
  return svg;
}

function highlightOutputs(badOutputs, outputs) {
  if (!badOutputs) return '';
  let svg = '';
  for (const i of badOutputs) {
    const cy = nodeY(i, outputs.length);
    svg += `<circle cx="${COL_X.right}" cy="${cy}" r="22" fill="none" stroke="${COLORS.arrowBad}" stroke-width="2.5" stroke-dasharray="4 3"/>`;
  }
  return svg;
}

function arrowPath(x1, y1, x2, y2) {
  // Slight curve so overlapping arrows are distinguishable.
  const dy = y2 - y1;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2 + dy * 0.05;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

function eqPair(a, b) {
  return (p) => p[0] === a[0] && p[1] === a[1] && b ? true : (p[0] === a[0] && p[1] === a[1]);
}

function isBad(pair, badArrows) {
  if (!badArrows) return false;
  return badArrows.some(([i, o]) => i === pair[0] && o === pair[1]);
}

function svgArrowDefs() {
  return `
    <defs>
      <marker id="fm-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="${COLORS.arrow}"/>
      </marker>
      <marker id="fm-arr-bad" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="${COLORS.arrowBad}"/>
      </marker>
    </defs>`;
}

function renderMode(modeKey) {
  const m = MODES[modeKey] || MODES['function'];
  let svg = `<svg viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="${m.title}">`;
  svg += svgArrowDefs();
  svg += setBox(COL_X.left, m.inputs, 'Input set (X)');
  svg += setBox(COL_X.right, m.outputs, 'Output set (Y)');
  svg += highlightOutputs(m.badOutputs, m.outputs);

  for (const arr of m.arrows) {
    const [iIdx, oIdx] = arr;
    const y1 = nodeY(iIdx, m.inputs.length);
    const y2 = nodeY(oIdx, m.outputs.length);
    const x1 = COL_X.left + 16;
    const x2 = COL_X.right - 16;
    const bad = isBad(arr, m.badArrows);
    const stroke = bad ? COLORS.arrowBad : COLORS.arrow;
    const marker = bad ? 'fm-arr-bad' : 'fm-arr';
    svg += `<path d="${arrowPath(x1, y1, x2, y2)}" fill="none" stroke="${stroke}" stroke-width="2.5" opacity="0.9" marker-end="url(#${marker})"/>`;
  }

  svg += '</svg>';
  return { svg, mode: m };
}

const DEFAULTS = { mode: 'function', showVerdict: true };

export function mountFunctionMapping(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = { mode: cfg.mode };

  // Mode picker: show buttons for all 7 modes so students can flip
  // between cases on the same page.
  const modeKeys = Object.keys(MODES);
  const tabs = modeKeys.map(k =>
    `<button type="button" data-fm-mode="${k}" class="fm-tab${k === state.mode ? ' active' : ''}">${MODES[k].title}</button>`
  ).join('');

  target.innerHTML = `
    <div class="fm-wrap">
      <div class="fm-tabs">${tabs}</div>
      <div class="fm-stage" data-fm-stage></div>
      <div class="fm-verdict" data-fm-verdict></div>
    </div>
  `;

  const stage = target.querySelector('[data-fm-stage]');
  const verdictBox = target.querySelector('[data-fm-verdict]');

  function render() {
    const { svg, mode } = renderMode(state.mode);
    stage.innerHTML = svg;
    if (cfg.showVerdict) {
      verdictBox.className = 'fm-verdict ' + (mode.verdict.good ? 'good' : 'bad');
      verdictBox.innerHTML = `
        <div class="fm-verdict-head">${mode.verdict.label}</div>
        <div class="fm-verdict-body">${mode.verdict.detail.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</div>
      `;
    } else {
      verdictBox.innerHTML = '';
    }
  }

  render();

  target.querySelectorAll('[data-fm-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.fmMode;
      target.querySelectorAll('[data-fm-mode]').forEach((b) => b.classList.toggle('active', b === btn));
      render();
    });
  });
}
