// /simulations/:id — a single simulation. Reuses the lesson-renderer so
// simulation.json uses the same block schema (text / math / callout / widget).

import { renderHeader } from '../components/header.js';
import { loadSimulationIndex, loadSimulation } from '../catalog.js';
import { renderLesson as renderLessonBlocks } from '../lesson-renderer.js';
import { renderNotFound } from './not-found.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function renderSimulation(root, id) {
  let index = null;
  try {
    index = await loadSimulationIndex();
  } catch {
    // Non-fatal — the simulation body can still load.
  }

  const meta = (index?.simulations || []).find((s) => s.id === id) || null;
  if (!meta && index) return renderNotFound(root);

  const tags = (meta?.tags || []).length
    ? `<div class="blog-card-tags blog-post-tags">${meta.tags
        .map((t) => `<span class="blog-tag">${escapeHtml(t)}</span>`)
        .join('')}</div>`
    : '';

  root.innerHTML = `
    ${renderHeader({})}
    <main>
      <article class="lesson">
        <p class="proof-page-meta"><a href="#/simulations">← Simulations</a></p>
        <h1>${escapeHtml(meta?.title || 'Simulation')}</h1>
        ${tags}
        <div data-sim-body><p>Loading…</p></div>
        <div class="lesson-actions">
          <a class="btn" href="#/simulations">← All simulations</a>
        </div>
      </article>
    </main>
  `;

  const bodyEl = root.querySelector('[data-sim-body]');
  try {
    const sim = await loadSimulation(id);
    renderLessonBlocks(bodyEl, sim);
  } catch (err) {
    bodyEl.innerHTML = `<div class="block-callout"><strong>Error</strong>${escapeHtml(err.message)}</div>`;
  }
}
