// /proofs/:id — a single proof. Reuses the lesson-renderer so proof.json uses
// the same block schema (text / math / callout / widget). Deliberately has no
// quiz: proofs are for understanding, not drilling.

import { renderHeader } from '../components/header.js';
import { loadProofIndex, loadProof } from '../catalog.js';
import { renderLesson as renderLessonBlocks } from '../lesson-renderer.js';
import { renderNotFound } from './not-found.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function renderProof(root, id) {
  let index = null;
  try {
    index = await loadProofIndex();
  } catch {
    // Non-fatal — proof body can still load.
  }

  const proofs = index?.proofs || [];
  const typeNames = index?.proofTypes || {};
  const meta = proofs.find((p) => p.id === id) || null;
  if (!meta && index) return renderNotFound(root);

  // "Next proof" — wrap around the list so the walk never dead-ends.
  let nextLink = '';
  if (meta && proofs.length > 1) {
    const i = proofs.findIndex((p) => p.id === id);
    const next = proofs[(i + 1) % proofs.length];
    nextLink = `<a class="btn btn-primary" href="#/proofs/${encodeURIComponent(next.id)}">Next proof: ${escapeHtml(next.title)} →</a>`;
  }

  const typeLabel = meta ? (typeNames[meta.proofType] || meta.proofType) : '';
  const prereqs = (meta?.prerequisites || []).length
    ? `<div class="proof-prereqs"><strong>Assumes you know:</strong> ${meta.prerequisites.map(escapeHtml).join(' · ')}</div>`
    : '';

  root.innerHTML = `
    ${renderHeader({})}
    <main>
      <article class="lesson proof-page">
        <p class="proof-page-meta">
          <a href="#/proofs">← Proofs</a>
          ${meta ? `<span class="proof-page-meta-sep">·</span><span class="proof-type-badge proof-type-${escapeHtml(meta.proofType)}">${escapeHtml(typeLabel)}</span>` : ''}
        </p>
        <h1>${escapeHtml(meta?.title || 'Proof')}</h1>
        ${prereqs}
        <div data-proof-body><p>Loading…</p></div>
        <div class="lesson-actions proof-page-actions">
          <a class="btn" href="#/proofs">← All proofs</a>
          ${nextLink}
        </div>
      </article>
    </main>
  `;

  const bodyEl = root.querySelector('[data-proof-body]');
  try {
    const proof = await loadProof(id);
    renderLessonBlocks(bodyEl, proof);
  } catch (err) {
    bodyEl.innerHTML = `<div class="block-callout"><strong>Error</strong>${escapeHtml(err.message)}</div>`;
  }
}
