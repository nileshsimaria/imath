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

// When a proof uses `##` section headings (rendered as <h3>), add a compact
// "in this proof" nav above the body that scrolls to each section. Proofs
// with fewer than two such headings get no nav.
function addSectionNav(bodyEl) {
  const headings = [...bodyEl.querySelectorAll('h3')];
  if (headings.length < 2) return;
  headings.forEach((h, i) => { h.id = `proof-sec-${i}`; });
  const nav = document.createElement('nav');
  nav.className = 'proof-toc';
  nav.innerHTML = `
    <span class="proof-toc-label">In this proof</span>
    <ol class="proof-toc-list">
      ${headings
        .map((h, i) => `<li><a href="#" data-sec="${i}">${escapeHtml(h.textContent)}</a></li>`)
        .join('')}
    </ol>`;
  bodyEl.parentNode.insertBefore(nav, bodyEl);
  nav.addEventListener('click', (e) => {
    const a = e.target.closest('[data-sec]');
    if (!a) return;
    e.preventDefault();
    headings[Number(a.dataset.sec)].scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
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
    addSectionNav(bodyEl);
  } catch (err) {
    bodyEl.innerHTML = `<div class="block-callout"><strong>Error</strong>${escapeHtml(err.message)}</div>`;
  }
}
