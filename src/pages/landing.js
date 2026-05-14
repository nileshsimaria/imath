import { renderHeader } from '../components/header.js';
import { getCourseQuestionCounts } from '../stats.js';

export function renderLanding(root, catalog) {
  const courses = catalog.courses
    .map(
      (c) => `
      <a class="course-card" href="#/${c.id}">
        <div class="course-card-tag" style="background:${c.tagBg || ''};color:${c.tagColor || ''}">${c.icon || c.title[0]}</div>
        <h3>${c.title}</h3>
        <p>${c.description || ''}</p>
        <div class="course-card-stats" data-stats="${c.id}">
          <span class="course-card-q-count" data-q-count="${c.id}">…</span> practice questions
        </div>
      </a>`,
    )
    .join('');

  root.innerHTML = `
    ${renderHeader({})}
    <main>
      <section class="hero">
        <h1>Play with the math. Practice the math.</h1>
        <p>Middle and high school math — visualized so you see WHY, and practiced with step-by-step derivations. Every identity earned, no memorized tricks.</p>
      </section>
      <div class="section-label">Courses</div>
      <div class="course-grid">${courses}</div>
      <a class="landing-blog-cta" href="#/blog">
        <span class="landing-blog-cta-label">From the blog</span>
        <span class="landing-blog-cta-title">Short, friendly explainers of the concepts students get stuck on most.</span>
        <span class="landing-blog-cta-arrow">Read posts →</span>
      </a>
    </main>
  `;

  // Populate question counts asynchronously. Browser HTTP cache + the build-id
  // query string make this essentially instant after the first visit.
  getCourseQuestionCounts(catalog)
    .then((counts) => {
      for (const [courseId, n] of Object.entries(counts)) {
        const el = document.querySelector(`[data-q-count="${courseId}"]`);
        if (el) el.textContent = n.toLocaleString();
      }
    })
    .catch(() => {
      // Hide the stats line if we couldn't compute them.
      document.querySelectorAll('.course-card-stats').forEach((el) => { el.style.display = 'none'; });
    });
}
