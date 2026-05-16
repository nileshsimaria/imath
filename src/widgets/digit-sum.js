import katex from 'katex';

// digit-sum — shows why a number splits into a "pile of 9s" plus its digit
// sum, making the divisibility-by-3-and-9 test visible. Type any number.

const DEFAULTS = { number: 738 };
const PLACE_NAMES = ['ones', 'tens', 'hundreds', 'thousands', 'ten-thousands', 'hundred-thousands'];

const tex = (s, display = false) => {
  try { return katex.renderToString(s, { throwOnError: false, displayMode: display }); }
  catch { return s; }
};

export function mountDigitSum(target, userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const state = { number: Math.abs(Math.trunc(cfg.number)) || 0 };

  target.innerHTML = `
    <div class="digitsum-wrap">
      <div class="digitsum-row">
        <label for="ds-input">Try any number:</label>
        <input id="ds-input" type="number" data-ds-input min="0" max="999999" value="${state.number}"/>
      </div>
      <div class="digitsum-digits" data-ds-digits></div>
      <div class="digitsum-split" data-ds-split></div>
      <div class="digitsum-verdict" data-ds-verdict></div>
    </div>
  `;

  const digitsEl = target.querySelector('[data-ds-digits]');
  const splitEl = target.querySelector('[data-ds-split]');
  const verdictEl = target.querySelector('[data-ds-verdict]');

  function render() {
    const n = state.number;
    const digits = String(n).split('').map(Number);
    const places = digits.length;
    const digitSum = digits.reduce((a, d) => a + d, 0);
    const ninesPile = n - digitSum;

    // Digit boxes with place-value labels.
    digitsEl.innerHTML = digits
      .map((d, i) => {
        const place = places - 1 - i;
        return `<div class="digitsum-cell">
          <div class="digitsum-box">${d}</div>
          <div class="digitsum-place">${PLACE_NAMES[place] || `10^${place}`}</div>
        </div>`;
      })
      .join('');

    // The split: (multiple of 9) + (digit sum).
    splitEl.innerHTML = `
      <div class="digitsum-pile digitsum-pile-nines">
        <div class="digitsum-pile-val">${ninesPile.toLocaleString()}</div>
        <div class="digitsum-pile-label">built from 9s, 99s, 999s…<br/><strong>always divisible by 9 &amp; 3</strong></div>
      </div>
      <div class="digitsum-plus">+</div>
      <div class="digitsum-pile digitsum-pile-sum">
        <div class="digitsum-pile-val">${digitSum}</div>
        <div class="digitsum-pile-label">the digit sum<br/><strong>${digits.join(' + ')}</strong></div>
      </div>
      <div class="digitsum-eq">${tex(`= ${n.toLocaleString()}`)}</div>
    `;

    // Verdict badges — the whole number's divisibility matches the digit sum's.
    const by9 = digitSum % 9 === 0 && n > 0;
    const by3 = digitSum % 3 === 0 && n > 0;
    const badge = (label, ok) =>
      `<span class="digitsum-badge ${ok ? 'is-yes' : 'is-no'}">${ok ? '✓' : '✗'} ${label}</span>`;
    verdictEl.innerHTML = `
      <p>Digit sum is <strong>${digitSum}</strong>, so ${n.toLocaleString()} is:</p>
      <div class="digitsum-badges">
        ${badge('divisible by 3', by3)}
        ${badge('divisible by 9', by9)}
      </div>
    `;
  }

  render();
  target.querySelector('[data-ds-input]').addEventListener('input', (e) => {
    let v = parseInt(e.target.value, 10);
    if (!Number.isFinite(v) || v < 0) v = 0;
    if (v > 999999) v = 999999;
    state.number = v;
    render();
  });
}
