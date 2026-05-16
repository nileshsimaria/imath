// /proofs — the Proofs Library. Browse every proof/derivation in the site,
// filterable by proof type. Each proof is its own destination (no quiz);
// cards link to /proofs/:id.

import katex from 'katex';
import { renderHeader } from '../components/header.js';
import { loadProofIndex } from '../catalog.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const tex = (s) => {
  try { return katex.renderToString(s, { throwOnError: false }); }
  catch { return escapeHtml(s); }
};

function proofCard(p) {
  return `
    <li class="proof-card" data-proof-type="${escapeHtml(p.proofType)}">
      <a class="proof-card-link" href="#/proofs/${encodeURIComponent(p.id)}">
        <div class="proof-card-top">
          <span class="proof-type-badge proof-type-${escapeHtml(p.proofType)}" data-type-label></span>
          <span class="proof-card-claim">${tex(p.claim || '')}</span>
        </div>
        <h3 class="proof-card-title">${escapeHtml(p.title)}</h3>
        <p class="proof-card-summary">${escapeHtml(p.summary || '')}</p>
        <div class="proof-card-foot">${escapeHtml(p.courseTitle || p.course)} · ${escapeHtml(p.topic || '')}</div>
      </a>
    </li>`;
}

export async function renderProofsIndex(root) {
  root.innerHTML = `
    ${renderHeader({})}
    <main>
      <section class="widgets-hero">
        <h1>Proofs</h1>
        <p class="widgets-hero-sub">Loading…</p>
      </section>
    </main>
  `;

  let index;
  try {
    index = await loadProofIndex();
  } catch (err) {
    root.querySelector('.widgets-hero-sub').textContent =
      `Couldn't load the proofs index: ${err.message}`;
    return;
  }

  const proofs = index.proofs || [];
  const typeNames = index.proofTypes || {};

  // Filter chips — "All" plus every proof type that actually appears.
  const usedTypes = [...new Set(proofs.map((p) => p.proofType))];
  const chips = ['all', ...usedTypes]
    .map((t, i) => {
      const label = t === 'all' ? 'All proofs' : (typeNames[t] || t);
      return `<button class="proof-chip ${i === 0 ? 'active' : ''}" data-filter="${escapeHtml(t)}">${escapeHtml(label)}</button>`;
    })
    .join('');

  // Group cards by course, preserving index order.
  const byCourse = new Map();
  for (const p of proofs) {
    if (!byCourse.has(p.course)) byCourse.set(p.course, { title: p.courseTitle || p.course, items: [] });
    byCourse.get(p.course).items.push(p);
  }
  let sections = '';
  for (const { title, items } of byCourse.values()) {
    sections += `
      <section class="proof-section">
        <h2 class="proof-section-title">${escapeHtml(title)}</h2>
        <ul class="proof-grid">${items.map(proofCard).join('')}</ul>
      </section>`;
  }

  root.innerHTML = `
    ${renderHeader({})}
    <main>
      <section class="widgets-hero">
        <h1>Proofs</h1>
        <p class="widgets-hero-sub">${proofs.length} visual, interactive walkthroughs of <em>why</em> the formulas are true — the most rewarding part of math. No quizzes here; just explore.</p>
        <div class="proof-filter">${chips}</div>
      </section>
      ${sections}
      <section class="proof-empty" data-proof-empty hidden>
        <p>No proofs of that type yet — more on the way.</p>
      </section>
    </main>
  `;

  // Fill in type badge labels from the index.
  for (const el of root.querySelectorAll('[data-type-label]')) {
    const card = el.closest('[data-proof-type]');
    const t = card?.dataset.proofType;
    el.textContent = typeNames[t] || t || '';
  }

  // Client-side filtering.
  const empty = root.querySelector('[data-proof-empty]');
  for (const btn of root.querySelectorAll('.proof-chip')) {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      root.querySelectorAll('.proof-chip').forEach((b) => b.classList.toggle('active', b === btn));
      let visible = 0;
      for (const card of root.querySelectorAll('.proof-card')) {
        const show = filter === 'all' || card.dataset.proofType === filter;
        card.hidden = !show;
        if (show) visible++;
      }
      for (const sec of root.querySelectorAll('.proof-section')) {
        sec.hidden = ![...sec.querySelectorAll('.proof-card')].some((c) => !c.hidden);
      }
      empty.hidden = visible > 0;
    });
  }
}
