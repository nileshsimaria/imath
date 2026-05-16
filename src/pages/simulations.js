// /simulations — the Simulations hub. Interactive "learn by running it"
// experiments. A simple card grid; there will only ever be a modest number.

import { renderHeader } from '../components/header.js';
import { loadSimulationIndex } from '../catalog.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function renderSimulationsIndex(root) {
  root.innerHTML = `
    ${renderHeader({})}
    <main>
      <section class="widgets-hero">
        <h1>Simulations</h1>
        <p class="widgets-hero-sub">Loading…</p>
      </section>
    </main>
  `;

  let index;
  try {
    index = await loadSimulationIndex();
  } catch (err) {
    root.querySelector('.widgets-hero-sub').textContent =
      `Couldn't load the simulations index: ${err.message}`;
    return;
  }

  const sims = index.simulations || [];
  const cards = sims
    .map(
      (s) => `
      <li class="proof-card">
        <a class="proof-card-link" href="#/simulations/${encodeURIComponent(s.id)}">
          <h3 class="proof-card-title">${escapeHtml(s.title)}</h3>
          <p class="proof-card-summary">${escapeHtml(s.summary || '')}</p>
          <div class="blog-card-tags">
            ${(s.tags || []).map((t) => `<span class="blog-tag">${escapeHtml(t)}</span>`).join('')}
          </div>
        </a>
      </li>`,
    )
    .join('');

  root.innerHTML = `
    ${renderHeader({})}
    <main>
      <section class="widgets-hero">
        <h1>Simulations</h1>
        <p class="widgets-hero-sub">Interactive experiments where you learn a concept by running it yourself. Tweak the controls, throw the dice, and watch the maths happen.</p>
      </section>
      <section class="proof-section">
        <ul class="proof-grid">${cards}</ul>
      </section>
    </main>
  `;
}
