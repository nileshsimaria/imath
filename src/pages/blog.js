// /blog — listing of posts, newest first.

import { renderHeader } from '../components/header.js';
import { loadBlogIndex } from '../catalog.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  // Expecting YYYY-MM-DD. Render as "May 14, 2026" without pulling in a date lib.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return escapeHtml(iso || '');
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const [, y, mm, dd] = m;
  return `${months[parseInt(mm,10)-1]} ${parseInt(dd,10)}, ${y}`;
}

export async function renderBlogIndex(root) {
  root.innerHTML = `
    ${renderHeader({})}
    <main>
      <section class="hero">
        <h1>iMath Blog</h1>
        <p>Short, friendly explainers of the concepts students get stuck on most.</p>
      </section>
      <div data-blog-list><p>Loading…</p></div>
    </main>
  `;

  const listEl = root.querySelector('[data-blog-list]');

  let index;
  try {
    index = await loadBlogIndex();
  } catch (err) {
    listEl.innerHTML = `<div class="block-callout"><strong>Error</strong>${escapeHtml(err.message)}</div>`;
    return;
  }

  const posts = (index.posts || [])
    .slice()
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  if (!posts.length) {
    listEl.innerHTML = `<p>No posts yet. Check back soon.</p>`;
    return;
  }

  listEl.innerHTML = `
    <ul class="blog-list">
      ${posts
        .map((p) => {
          const tags = (p.tags || [])
            .map((t) => `<span class="blog-tag">${escapeHtml(t)}</span>`)
            .join('');
          return `
            <li class="blog-card">
              <a class="blog-card-link" href="#/blog/${encodeURIComponent(p.id)}">
                <div class="blog-card-date">${formatDate(p.date)}</div>
                <h2 class="blog-card-title">${escapeHtml(p.title)}</h2>
                <p class="blog-card-summary">${escapeHtml(p.summary || '')}</p>
                <div class="blog-card-tags">${tags}</div>
              </a>
            </li>`;
        })
        .join('')}
    </ul>
  `;
}
