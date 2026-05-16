// /proofs — the Proofs Library, a two-pane directory. Left: a course rail
// with proof counts. Right: compact proof rows for the selected course,
// grouped by topic, with a proof-type filter. Built to scale to 150+ proofs.

import { renderHeader } from '../components/header.js';
import { loadProofIndex } from '../catalog.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

  // Group proofs by course, preserving first-seen order.
  const courses = new Map(); // courseId -> { title, items: [] }
  for (const p of proofs) {
    if (!courses.has(p.course)) {
      courses.set(p.course, { id: p.course, title: p.courseTitle || p.course, items: [] });
    }
    courses.get(p.course).items.push(p);
  }
  const courseList = [...courses.values()];

  // Left rail.
  const railHtml = courseList
    .map(
      (c, i) => `
      <button class="proofs-rail-item ${i === 0 ? 'active' : ''}" data-course="${escapeHtml(c.id)}">
        <span class="proofs-rail-name">${escapeHtml(c.title)}</span>
        <span class="proofs-rail-count">${c.items.length}</span>
      </button>`,
    )
    .join('');

  root.innerHTML = `
    ${renderHeader({})}
    <main>
      <section class="widgets-hero">
        <h1>Proofs</h1>
        <p class="widgets-hero-sub">${proofs.length} visual, interactive walkthroughs of <em>why</em> the formulas are true. No quizzes here; just explore.</p>
      </section>
      <div class="proofs-layout">
        <nav class="proofs-rail" aria-label="Courses" data-proofs-rail>${railHtml}</nav>
        <div class="proofs-main" data-proofs-main></div>
      </div>
    </main>
  `;

  const mainEl = root.querySelector('[data-proofs-main]');

  // Render one course's proofs into the right pane, grouped by topic.
  function renderCourse(courseId) {
    const course = courses.get(courseId);
    if (!course) return;

    // Group this course's proofs by topic (first-seen order).
    const topics = new Map();
    for (const p of course.items) {
      const t = p.topic || 'Other';
      if (!topics.has(t)) topics.set(t, []);
      topics.get(t).push(p);
    }

    // Type-filter chips: "All" + every type used in this course.
    const usedTypes = [...new Set(course.items.map((p) => p.proofType))];
    const chips = ['all', ...usedTypes]
      .map(
        (t, i) =>
          `<button class="proof-chip ${i === 0 ? 'active' : ''}" data-filter="${escapeHtml(t)}">${escapeHtml(t === 'all' ? 'All' : typeNames[t] || t)}</button>`,
      )
      .join('');

    let topicsHtml = '';
    for (const [topicName, items] of topics) {
      const rows = items
        .map(
          (p) => `
          <li class="proof-row" data-proof-type="${escapeHtml(p.proofType)}">
            <a class="proof-row-link" href="#/proofs/${encodeURIComponent(p.id)}">
              <span class="proof-row-text">
                <span class="proof-row-title">${escapeHtml(p.title)}</span>
                <span class="proof-row-summary">${escapeHtml(p.summary || '')}</span>
              </span>
              <span class="proof-type-badge proof-type-${escapeHtml(p.proofType)}">${escapeHtml(typeNames[p.proofType] || p.proofType)}</span>
            </a>
          </li>`,
        )
        .join('');
      topicsHtml += `
        <section class="proof-topic">
          <h3 class="proof-topic-title">${escapeHtml(topicName)}</h3>
          <ul class="proof-rows">${rows}</ul>
        </section>`;
    }

    mainEl.innerHTML = `
      <div class="proofs-course-head">
        <h2>${escapeHtml(course.title)} <span class="proofs-course-count">· ${course.items.length} proof${course.items.length === 1 ? '' : 's'}</span></h2>
      </div>
      <div class="proof-filter">${chips}</div>
      ${topicsHtml}
      <p class="proof-empty" data-proof-empty hidden>No proofs of that type in this course yet.</p>
    `;

    // Wire the type filter for this course.
    const empty = mainEl.querySelector('[data-proof-empty]');
    for (const btn of mainEl.querySelectorAll('.proof-chip')) {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        mainEl.querySelectorAll('.proof-chip').forEach((b) => b.classList.toggle('active', b === btn));
        let visible = 0;
        for (const row of mainEl.querySelectorAll('.proof-row')) {
          const show = filter === 'all' || row.dataset.proofType === filter;
          row.hidden = !show;
          if (show) visible++;
        }
        for (const sec of mainEl.querySelectorAll('.proof-topic')) {
          sec.hidden = ![...sec.querySelectorAll('.proof-row')].some((r) => !r.hidden);
        }
        empty.hidden = visible > 0;
      });
    }
  }

  // Rail selection.
  for (const btn of root.querySelectorAll('.proofs-rail-item')) {
    btn.addEventListener('click', () => {
      root.querySelectorAll('.proofs-rail-item').forEach((b) => b.classList.toggle('active', b === btn));
      renderCourse(btn.dataset.course);
      mainEl.scrollIntoView({ block: 'nearest' });
    });
  }

  if (courseList.length) renderCourse(courseList[0].id);
}
