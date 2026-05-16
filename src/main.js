import 'katex/dist/katex.min.css';
import './styles.css';

import { createRouter } from './router.js';
import { loadCatalog } from './catalog.js';
import { setupSearch } from './search.js';
import { renderLanding } from './pages/landing.js';
import { renderCourse } from './pages/course.js';
import { renderCoursePractice } from './pages/course-practice.js';
import { renderLesson } from './pages/lesson.js';
import { renderWidgets } from './pages/widgets.js';
import { renderProofsIndex } from './pages/proofs.js';
import { renderProof } from './pages/proof.js';
import { renderContact } from './pages/contact.js';
import { renderSimulationsIndex } from './pages/simulations.js';
import { renderSimulation } from './pages/simulation.js';
import { renderBlogIndex } from './pages/blog.js';
import { renderBlogPost } from './pages/blog-post.js';
import { renderNotFound } from './pages/not-found.js';

const root = document.getElementById('app');

async function boot() {
  const catalog = await loadCatalog();
  setupSearch(catalog);

  const router = createRouter({
    '/': () => renderLanding(root, catalog),
    '/widgets': () => renderWidgets(root, catalog),
    '/proofs': () => renderProofsIndex(root),
    '/proofs/:id': ({ id }) => renderProof(root, id),
    '/simulations': () => renderSimulationsIndex(root),
    '/simulations/:id': ({ id }) => renderSimulation(root, id),
    '/blog': () => renderBlogIndex(root),
    '/contact': () => renderContact(root),
    '/blog/:slug': ({ slug }) => renderBlogPost(root, slug),
    '/:courseId': ({ courseId }) => renderCourse(root, catalog, courseId),
    '/:courseId/practice': ({ courseId }) => renderCoursePractice(root, catalog, courseId),
    '/:courseId/:topicId/practice': ({ courseId, topicId }) =>
      renderCoursePractice(root, catalog, courseId, topicId),
    '/:courseId/:topicId/:subtopicId/practice': ({ courseId, topicId, subtopicId }) =>
      renderCoursePractice(root, catalog, courseId, topicId, subtopicId),
    '/:courseId/:topicId/:subtopicId': (params, query) => renderLesson(root, catalog, params, query),
  }, () => renderNotFound(root));

  router.start();
}

boot().catch((err) => {
  console.error(err);
  root.innerHTML = `<div class="error-screen">
    <h1>Something went wrong</h1>
    <pre>${String(err.message || err)}</pre>
  </div>`;
});
