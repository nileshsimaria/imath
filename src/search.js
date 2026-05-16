// Site search. Indexes three kinds of destination into one ranked list:
//   lesson  — a catalog subtopic (title + keywords)
//   proof   — an entry from the Proofs Library (title + summary + type)
//   blog    — a blog post (title + summary + tags)
// Lesson entries are built synchronously; proofs and blogs are fetched and
// appended a moment later (non-fatal if either fails to load).

import { leafSubtopics, loadProofIndex, loadBlogIndex } from './catalog.js';

const RESULT_LIMIT = 8;

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Build a uniform entry. `kind` is 'lesson' | 'proof' | 'blog'.
function makeEntry({ kind, href, title, ctx, keywords = '', isStub = false }) {
  return {
    kind,
    href,
    title,
    ctx,
    isStub,
    titleLower: title.toLowerCase(),
    ctxLower: ctx.toLowerCase(),
    kwLower: keywords.toLowerCase(),
  };
}

export function buildSearchIndex(catalog) {
  const entries = [];
  for (const course of catalog.courses || []) {
    for (const topic of course.topics || []) {
      for (const sub of leafSubtopics(topic)) {
        entries.push(
          makeEntry({
            kind: 'lesson',
            href: `#/${course.id}/${topic.id}/${sub.id}`,
            title: sub.title,
            ctx: `${course.title} · ${topic.title}`,
            keywords: (sub.keywords || []).join(' '),
            isStub: sub.status === 'stub',
          }),
        );
      }
    }
  }
  return entries;
}

function buildProofEntries(proofIndex) {
  return (proofIndex.proofs || []).map((p) =>
    makeEntry({
      kind: 'proof',
      href: `#/proofs/${p.id}`,
      title: p.title,
      ctx: `${p.courseTitle || p.course} · ${p.topic || 'Proof'}`,
      keywords: `${p.summary || ''} ${p.proofType || ''} proof`,
    }),
  );
}

function buildBlogEntries(blogIndex) {
  return (blogIndex.posts || []).map((post) =>
    makeEntry({
      kind: 'blog',
      href: `#/blog/${post.id}`,
      title: post.title,
      ctx: 'Blog',
      keywords: `${post.summary || ''} ${(post.tags || []).join(' ')}`,
    }),
  );
}

function score(entry, q) {
  const t = entry.titleLower;
  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  if (new RegExp('\\b' + escapeRegex(q)).test(t)) return 75;
  if (t.includes(q)) return 60;
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
    .sort((a, b) => b.s - a.s || a.entry.titleLower.localeCompare(b.entry.titleLower))
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

const KIND_LABEL = { proof: 'Proof', blog: 'Blog' };

function renderResults(box, results, query, activeIdx) {
  if (!results.length) {
    box.innerHTML = `<div class="search-empty">Nothing matches “${escapeHtml(query)}”.</div>`;
    box.hidden = false;
    return;
  }
  box.innerHTML = results
    .map((r, i) => {
      const stub = r.isStub ? '<span class="badge badge-stub">Coming soon</span>' : '';
      // Lessons stay unbadged (the default); proofs and blogs are tagged so a
      // mixed list stays scannable.
      const kindTag = KIND_LABEL[r.kind]
        ? `<span class="search-result-kind search-kind-${r.kind}">${KIND_LABEL[r.kind]}</span>`
        : '';
      const cls = i === activeIdx ? 'search-result active' : 'search-result';
      return `
        <a class="${cls}" href="${r.href}" data-result-idx="${i}">
          <div class="search-result-title">${highlight(r.title, query)}${kindTag}${stub}</div>
          <div class="search-result-ctx">${escapeHtml(r.ctx)}</div>
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

  // Augment the index with proofs and blog posts once they load. The closure
  // holds the same array reference, so `search()` picks them up automatically.
  loadProofIndex()
    .then((pi) => index.push(...buildProofEntries(pi)))
    .catch(() => {});
  loadBlogIndex()
    .then((bi) => index.push(...buildBlogEntries(bi)))
    .catch(() => {});

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
        window.location.hash = r.href;
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
