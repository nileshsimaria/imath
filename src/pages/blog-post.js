// /blog/:slug — single blog post. Reuses the lesson-renderer so post JSON
// uses the same block schema as lesson.json (text / math / callout / widget).

import { renderHeader } from '../components/header.js';
import { loadBlogIndex, loadBlogPost } from '../catalog.js';
import { renderLesson as renderLessonBlocks } from '../lesson-renderer.js';
import { renderNotFound } from './not-found.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return escapeHtml(iso || '');
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const [, y, mm, dd] = m;
  return `${months[parseInt(mm,10)-1]} ${parseInt(dd,10)}, ${y}`;
}

export async function renderBlogPost(root, slug) {
  // Look up the metadata first so we can show date/tags in the header.
  let meta = null;
  try {
    const index = await loadBlogIndex();
    meta = (index.posts || []).find((p) => p.id === slug) || null;
  } catch {
    // Non-fatal — we can still try to load the post by slug.
  }

  if (!meta) return renderNotFound(root);

  root.innerHTML = `
    ${renderHeader({})}
    <main>
      <article class="lesson blog-post">
        <p class="blog-post-meta">
          <a href="#/blog">← Blog</a>
          <span class="blog-post-meta-sep">·</span>
          <span class="blog-post-date">${formatDate(meta.date)}</span>
        </p>
        <h1>${escapeHtml(meta.title)}</h1>
        ${(meta.tags || []).length
          ? `<div class="blog-card-tags blog-post-tags">${meta.tags
              .map((t) => `<span class="blog-tag">${escapeHtml(t)}</span>`)
              .join('')}</div>`
          : ''}
        <div data-blog-body><p>Loading…</p></div>
        <div class="lesson-actions">
          <a class="btn" href="#/blog">← All posts</a>
        </div>
      </article>
    </main>
  `;

  const bodyEl = root.querySelector('[data-blog-body]');
  try {
    const post = await loadBlogPost(slug);
    renderLessonBlocks(bodyEl, post);
  } catch (err) {
    bodyEl.innerHTML = `<div class="block-callout"><strong>Error</strong>${escapeHtml(err.message)}</div>`;
  }
}
