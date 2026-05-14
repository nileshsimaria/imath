// /widgets — index of every interactive widget in the site, grouped by the
// course where it’s primarily used. Each entry shows the widget name (links
// to the first lesson using it), a one-line description, and chips for every
// lesson that uses it.

import { renderHeader } from '../components/header.js';
import { WIDGET_META, widgetDisplayName, widgetDescription } from '../widgets-catalog.js';

const BASE = import.meta.env.BASE_URL;
const V = `?v=${typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev'}`;

async function loadWidgetIndex() {
  const res = await fetch(`${BASE}content/widget-index.json${V}`);
  if (!res.ok) throw new Error(`widget-index.json not found (run \`npm run build:widget-index\`)`);
  return res.json();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function renderWidgets(root, catalog) {
  // Show header + a loading shell first so navigation feels instant.
  root.innerHTML = `
    ${renderHeader({})}
    <main>
      <section class="widgets-hero">
        <h1>Widgets</h1>
        <p class="widgets-hero-sub">Loading…</p>
      </section>
    </main>
  `;

  let index;
  try {
    index = await loadWidgetIndex();
  } catch (err) {
    root.innerHTML = `
      ${renderHeader({})}
      <main>
        <section class="widgets-hero">
          <h1>Widgets</h1>
          <p class="widgets-hero-sub">Couldn’t load the widget index: ${escapeHtml(err.message)}</p>
        </section>
      </main>
    `;
    return;
  }

  // Course display order — follows the same order as the home page.
  const courseOrder = catalog.courses.map((c) => c.id);
  const courseMeta = Object.fromEntries(catalog.courses.map((c) => [c.id, c]));

  // Group widget kinds by the courseId of the FIRST lesson that uses them.
  const byCourse = new Map(); // courseId -> [kind, ...]
  for (const [kind, usages] of Object.entries(index)) {
    if (!usages.length) continue;
    const primary = usages[0].courseId;
    if (!byCourse.has(primary)) byCourse.set(primary, []);
    byCourse.get(primary).push(kind);
  }
  // Sort widgets within each course alphabetically by display name.
  for (const arr of byCourse.values()) {
    arr.sort((a, b) => widgetDisplayName(a).localeCompare(widgetDisplayName(b)));
  }

  const totalKinds = Object.keys(index).length;
  const totalUsages = Object.values(index).reduce((s, arr) => s + arr.length, 0);

  let sectionsHtml = '';
  for (const courseId of courseOrder) {
    const kinds = byCourse.get(courseId);
    if (!kinds || !kinds.length) continue;
    const course = courseMeta[courseId];

    let rowsHtml = '';
    for (const kind of kinds) {
      const name = widgetDisplayName(kind);
      const description = widgetDescription(kind);
      const usages = index[kind];
      const first = usages[0];
      const firstHref = `#/${first.courseId}/${first.topicId}/${first.subtopicId}`;

      let chipsHtml = '';
      for (const u of usages) {
        const href = `#/${u.courseId}/${u.topicId}/${u.subtopicId}`;
        const label = u.subtopicTitle;
        const courseLabel = courseMeta[u.courseId]?.title || u.courseId;
        chipsHtml += `<a class="widget-chip" href="${href}" title="${escapeHtml(courseLabel)} · ${escapeHtml(u.topicTitle)}">${escapeHtml(label)}</a>`;
      }
      const usageCount = usages.length;
      rowsHtml += `
        <li class="widget-row">
          <a class="widget-name" href="${firstHref}">${escapeHtml(name)}</a>
          <span class="widget-count">${usageCount}×</span>
          <p class="widget-desc">${escapeHtml(description)}</p>
          <div class="widget-chips" aria-label="Lessons using this widget">${chipsHtml}</div>
        </li>`;
    }

    sectionsHtml += `
      <section class="widget-section">
        <h2 class="widget-section-title">
          <span class="widget-section-icon" style="background:${course?.tagBg || ''};color:${course?.tagColor || ''}">${course?.icon || '?'}</span>
          ${escapeHtml(course?.title || courseId)}
          <span class="widget-section-count">${kinds.length} widget${kinds.length === 1 ? '' : 's'}</span>
        </h2>
        <ul class="widget-list">${rowsHtml}</ul>
      </section>`;
  }

  root.innerHTML = `
    ${renderHeader({})}
    <main>
      <section class="widgets-hero">
        <h1>Widgets</h1>
        <p class="widgets-hero-sub">${totalKinds} interactive tools across ${totalUsages} lessons. Click a widget name to jump to its lesson, or pick another lesson chip.</p>
      </section>
      ${sectionsHtml}
    </main>
  `;
}
