// Searches the catalog by subtopic title, with course/topic context and
// optional `keywords` field on each subtopic for synonyms ("quadratic formula"
// can be tagged with "x = (-b ± √...)/2a", "discriminant", etc.).

import { leafSubtopics } from './catalog.js';

const RESULT_LIMIT = 8;

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildSearchIndex(catalog) {
  const entries = [];
  for (const course of catalog.courses || []) {
    for (const topic of course.topics || []) {
      for (const sub of leafSubtopics(topic)) {
        const keywords = (sub.keywords || []).join(' ');
        entries.push({
          courseId: course.id,
          courseTitle: course.title,
          topicId: topic.id,
          topicTitle: topic.title,
          subtopicId: sub.id,
          subtopicTitle: sub.title,
          isStub: sub.status === 'stub',
          subLower: sub.title.toLowerCase(),
          ctxLower: `${course.title} ${topic.title}`.toLowerCase(),
          kwLower: keywords.toLowerCase(),
        });
      }
    }
  }
  return entries;
}

function score(entry, q) {
  const sub = entry.subLower;
  if (sub === q) return 100;
  if (sub.startsWith(q)) return 90;
  if (new RegExp('\\b' + escapeRegex(q)).test(sub)) return 75;
  if (sub.includes(q)) return 60;
  if (entry.ctxLower.includes(q)) return 40;
  if (entry.kwLower && entry.kwLower.includes(q)) return 30;
  return 0;
}

export function search(index, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return index
    .map((e) => ({ entry: e, s: score(e, q) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || a.entry.subLower.localeCompare(b.entry.subLower))
    .slice(0, RESULT_LIMIT)
    .map((r) => r.entry);
}

// ── DOM wiring ──────────────────────────────────────
// Document-level listeners survive page re-renders. The header just needs
// to include `[data-search-wrapper]` containing `[data-search-input]` and
// `[data-search-results]`.

function isEditable(el) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const t = el.tagName;
  return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT';
}

function highlight(text, query) {
  if (!query) return escapeHtml(text);
  const re = new RegExp(`(${escapeRegex(query)})`, 'ig');
  return escapeHtml(text).replace(re, '<mark>$1</mark>');
}

function renderResults(box, results, query, activeIdx) {
  if (!results.length) {
    box.innerHTML = `<div class="search-empty">No topics match “${escapeHtml(query)}”.</div>`;
    box.hidden = false;
    return;
  }
  box.innerHTML = results
    .map((r, i) => {
      const stub = r.isStub ? '<span class="badge badge-stub">Coming soon</span>' : '';
      const cls = i === activeIdx ? 'search-result active' : 'search-result';
      return `
        <a class="${cls}"
           href="#/${r.courseId}/${r.topicId}/${r.subtopicId}"
           data-result-idx="${i}">
          <div class="search-result-title">${highlight(r.subtopicTitle, query)}${stub}</div>
          <div class="search-result-ctx">${escapeHtml(r.courseTitle)} · ${escapeHtml(r.topicTitle)}</div>
        </a>`;
    })
    .join('');
  box.hidden = false;
}

function getRefs(input) {
  const wrap = input.closest('[data-search-wrapper]');
  return {
    wrap,
    box: wrap?.querySelector('[data-search-results]'),
  };
}

function closeBox(input) {
  const { box } = getRefs(input);
  if (box) {
    box.hidden = true;
    box.innerHTML = '';
  }
}

export function setupSearch(catalog) {
  const index = buildSearchIndex(catalog);
  const state = { results: [], activeIdx: -1, query: '' };

  document.addEventListener('input', (e) => {
    if (!e.target.matches('[data-search-input]')) return;
    const input = e.target;
    state.query = input.value;
    if (!state.query.trim()) {
      state.results = [];
      state.activeIdx = -1;
      closeBox(input);
      return;
    }
    state.results = search(index, state.query);
    state.activeIdx = -1;
    const { box } = getRefs(input);
    if (box) renderResults(box, state.results, state.query, state.activeIdx);
  });

  document.addEventListener('keydown', (e) => {
    const focused = document.activeElement;
    const isSearchFocused = focused?.matches?.('[data-search-input]');

    // Global '/' shortcut focuses the search input (unless typing elsewhere).
    if (e.key === '/' && !isEditable(focused)) {
      e.preventDefault();
      document.querySelector('[data-search-input]')?.focus();
      return;
    }

    if (!isSearchFocused) return;

    if (e.key === 'Escape') {
      focused.value = '';
      state.results = [];
      state.activeIdx = -1;
      closeBox(focused);
      focused.blur();
      return;
    }

    if (state.results.length === 0) return;
    const { box } = getRefs(focused);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      state.activeIdx = (state.activeIdx + 1) % state.results.length;
      if (box) renderResults(box, state.results, state.query, state.activeIdx);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      state.activeIdx = (state.activeIdx - 1 + state.results.length) % state.results.length;
      if (box) renderResults(box, state.results, state.query, state.activeIdx);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = state.results[state.activeIdx >= 0 ? state.activeIdx : 0];
      if (r) {
        window.location.hash = `/${r.courseId}/${r.topicId}/${r.subtopicId}`;
        focused.value = '';
        focused.blur();
        state.results = [];
        state.activeIdx = -1;
        closeBox(focused);
      }
    }
  });

  // Click outside closes the dropdown.
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-search-wrapper]')) return;
    document.querySelectorAll('[data-search-input]').forEach((inp) => closeBox(inp));
  });
}
