import katex from 'katex';

// circle-square-area — a labelled diagram of a circle inscribed in a square,
// used to show why the dart fraction approaches pi/4. Static (no controls):
// its whole job is to make the area comparison visible.

const tex = (s, display = false) => {
  try { return katex.renderToString(s, { throwOnError: false, displayMode: display }); }
  catch { return s; }
};

const C = {
  inside: '#16a34a',
  insideFill: '#dcfce7',
  outsideFill: '#ffe4e6',
  square: '#64748b',
  text: '#1e293b',
  dim: '#475569',
};

export function mountCircleSquareArea(target) {
  // Square spans x,y in [110,330]; circle is inscribed (radius 110).
  const x0 = 110, y0 = 34, side = 220;
  const cx = x0 + side / 2, cy = y0 + side / 2, r = side / 2;

  const svg = `
    <svg class="csa-svg" viewBox="0 0 440 332" role="img"
         aria-label="A circle inscribed in a square">
      <!-- square (its corners, outside the circle, stay rose) -->
      <rect x="${x0}" y="${y0}" width="${side}" height="${side}"
            fill="${C.outsideFill}" stroke="${C.square}" stroke-width="2"/>
      <!-- inscribed circle -->
      <circle cx="${cx}" cy="${cy}" r="${r}"
              fill="${C.insideFill}" stroke="${C.inside}" stroke-width="2.5"/>

      <!-- radius marker -->
      <line x1="${cx}" y1="${cy}" x2="${cx + r}" y2="${cy}"
            stroke="${C.inside}" stroke-width="2"/>
      <circle cx="${cx}" cy="${cy}" r="3.5" fill="${C.inside}"/>
      <text x="${cx + r / 2}" y="${cy - 8}" font-size="16" font-style="italic"
            fill="${C.inside}" text-anchor="middle" font-weight="700">r</text>

      <!-- side = 2r dimension under the square -->
      <line x1="${x0}" y1="${y0 + side + 20}" x2="${x0 + side}" y2="${y0 + side + 20}"
            stroke="${C.dim}" stroke-width="1.5"/>
      <line x1="${x0}" y1="${y0 + side + 14}" x2="${x0}" y2="${y0 + side + 26}"
            stroke="${C.dim}" stroke-width="1.5"/>
      <line x1="${x0 + side}" y1="${y0 + side + 14}" x2="${x0 + side}" y2="${y0 + side + 26}"
            stroke="${C.dim}" stroke-width="1.5"/>
      <text x="${cx}" y="${y0 + side + 42}" font-size="15" fill="${C.dim}"
            text-anchor="middle" font-weight="700">side = 2r</text>

      <!-- area labels -->
      <text x="${cx}" y="${y0 - 12}" font-size="14" fill="${C.square}"
            text-anchor="middle" font-weight="600">square area = (2r)² = 4r²</text>
      <text x="${cx}" y="${cy - r / 2 + 4}" font-size="15" fill="${C.inside}"
            text-anchor="middle" font-weight="700">circle area = πr²</text>
      <text x="${x0 + 30}" y="${y0 + 24}" font-size="12" fill="#e11d48"
            text-anchor="middle">corner</text>
    </svg>
  `;

  target.innerHTML = `
    <div class="csa-wrap">
      ${svg}
      <div class="csa-caption">
        <p>Divide the circle's area by the square's area. The $r^2$ cancels, leaving a pure number:</p>
        <div class="csa-eq">${tex('\\frac{\\text{circle}}{\\text{square}} = \\frac{\\pi r^2}{4r^2} = \\frac{\\pi}{4} \\approx 0.785', true)}</div>
        <p>So no matter how big the circle is, it always fills about <strong>78.5%</strong> of the square.</p>
      </div>
    </div>
  `;
}
