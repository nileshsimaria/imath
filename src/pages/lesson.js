import { renderHeader } from '../components/header.js';
import { findCourse, findTopic, findSubtopic, isGroup, leafSubtopics, loadLesson, loadQuiz, loadProofIndex } from '../catalog.js';
import { renderLesson as renderLessonBlocks } from '../lesson-renderer.js';
import { mountQuiz } from '../quiz-engine.js';
import { markLessonViewed, getProgress } from '../progress.js';
import { renderNotFound } from './not-found.js';

function renderGroupOverview(root, course, topic, group) {
  const childrenHtml = (group.subtopics || [])
    .map((c) => {
      const key = `${course.id}/${topic.id}/${c.id}`;
      const prog = getProgress(key);
      let badge = '';
      if (c.status === 'stub') badge = '<span class="badge badge-stub">Coming soon</span>';
      else if (prog?.completedAt) badge = '<span class="badge badge-done">Completed</span>';
      else if (prog?.lessonViewed) badge = '<span class="badge">In progress</span>';
      return `
        <li>
          <a class="subtopic-link" href="#/${course.id}/${topic.id}/${c.id}">
            <span>${c.title}${badge}</span>
            <span class="arrow">→</span>
          </a>
        </li>`;
    })
    .join('');

  const hasQuiz = leafSubtopics(group).some((l) => l.status !== 'stub' && l.path);
  const practice = hasQuiz
    ? `<a class="btn btn-primary practice-cta" href="#/${course.id}/${topic.id}/${group.id}/practice">
         <span class="practice-cta-icon">⚡</span>
         <span>
           <span class="practice-cta-title">Practice all in ${group.title}</span>
           <span class="practice-cta-sub">Mixed shuffle from every subtopic in this section.</span>
         </span>
       </a>`
    : '';

  root.innerHTML = `
    ${renderHeader({ courseTitle: course.title, courseId: course.id, topicTitle: topic.title, subtopicTitle: group.title })}
    <main>
      <article class="lesson">
        <h1>${group.title}</h1>
        <p class="subtitle">${topic.title} · ${course.title}</p>
        ${practice}
        <ul class="subtopic-list group-overview">${childrenHtml}</ul>
        <div class="lesson-actions">
          <a class="btn" href="#/${course.id}">← Back to ${course.title}</a>
        </div>
      </article>
    </main>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Contextual entry point: when proofs are tagged to this subtopic, add a
// "Proofs" tab. The tab shows proof cards that link to the Proofs Library —
// proof content never mixes into the lesson or practice.
function mountProofsTab(root, proofs, typeNames) {
  const lessonBody = root.querySelector('[data-lesson-body]');
  const quizMount = root.querySelector('[data-quiz]');
  if (!lessonBody || !proofs.length) return;

  const tabs = document.createElement('div');
  tabs.className = 'lesson-tabs';
  tabs.innerHTML = `
    <button class="lesson-tab active" data-tab="lesson">Lesson</button>
    <button class="lesson-tab" data-tab="proofs">Proofs <span class="lesson-tab-count">${proofs.length}</span></button>
  `;
  lessonBody.parentNode.insertBefore(tabs, lessonBody);

  const panel = document.createElement('div');
  panel.className = 'proofs-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <p class="proofs-panel-intro">See <em>why</em> the rules in this lesson are true. These open in the Proofs Library.</p>
    <ul class="proof-grid">
      ${proofs.map((p) => `
        <li class="proof-card" data-proof-type="${escapeHtml(p.proofType)}">
          <a class="proof-card-link" href="#/proofs/${encodeURIComponent(p.id)}">
            <div class="proof-card-top">
              <span class="proof-type-badge proof-type-${escapeHtml(p.proofType)}">${escapeHtml(typeNames[p.proofType] || p.proofType)}</span>
            </div>
            <h3 class="proof-card-title">${escapeHtml(p.title)}</h3>
            <p class="proof-card-summary">${escapeHtml(p.summary || '')}</p>
          </a>
        </li>`).join('')}
    </ul>
  `;
  quizMount.parentNode.insertBefore(panel, quizMount.nextSibling);

  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.lesson-tab');
    if (!btn) return;
    const showProofs = btn.dataset.tab === 'proofs';
    tabs.querySelectorAll('.lesson-tab').forEach((b) => b.classList.toggle('active', b === btn));
    lessonBody.hidden = showProofs;
    quizMount.hidden = showProofs;
    panel.hidden = !showProofs;
  });
}

export async function renderLesson(root, catalog, params, query = {}) {
  const { courseId, topicId, subtopicId } = params;
  const course = findCourse(catalog, courseId);
  const topic = findTopic(course, topicId);
  const subtopic = findSubtopic(topic, subtopicId);
  if (!course || !topic || !subtopic) return renderNotFound(root);

  // If the URL targets a group (no lesson page), render a "table of contents".
  if (isGroup(subtopic) && !subtopic.path) {
    return renderGroupOverview(root, course, topic, subtopic);
  }

  const progressKey = `${course.id}/${topic.id}/${subtopic.id}`;

  // If subtopic is a stub, show a friendly placeholder.
  if (subtopic.status === 'stub') {
    root.innerHTML = `
      ${renderHeader({ courseTitle: course.title, courseId: course.id, topicTitle: topic.title, subtopicTitle: subtopic.title })}
      <main>
        <article class="lesson">
          <h1>${subtopic.title}</h1>
          <p class="subtitle">${topic.title} · ${course.title}</p>
          <div class="block-callout">
            <strong>Coming soon</strong>
            This subtopic is in the works. The lesson and quiz will appear here when they're ready.
          </div>
          <div class="lesson-actions">
            <a class="btn" href="#/${course.id}">← Back to ${course.title}</a>
          </div>
        </article>
      </main>
    `;
    return;
  }

  const path = subtopic.path; // e.g., "algebra-1/linear-equations/slope-intercept-form"

  // Render shell first so the user sees something while content loads.
  root.innerHTML = `
    ${renderHeader({ courseTitle: course.title, courseId: course.id, topicTitle: topic.title, subtopicTitle: subtopic.title })}
    <main>
      <article class="lesson">
        <h1>${subtopic.title}</h1>
        <p class="subtitle">${topic.title} · ${course.title}</p>
        <div data-lesson-body><p>Loading…</p></div>
        <div data-quiz></div>
        <div class="lesson-actions">
          <a class="btn" href="#/${course.id}">← Back to ${course.title}</a>
        </div>
      </article>
    </main>
  `;

  const lessonBody = root.querySelector('[data-lesson-body]');
  const quizMount = root.querySelector('[data-quiz]');

  try {
    const [lesson, quiz, proofIndex] = await Promise.all([
      loadLesson(path),
      loadQuiz(path),
      loadProofIndex().catch(() => null), // non-fatal: proofs are optional
    ]);
    renderLessonBlocks(lessonBody, lesson);
    markLessonViewed(progressKey);

    if (proofIndex) {
      const matches = (proofIndex.proofs || []).filter((p) =>
        (p.relatedSubtopics || []).includes(progressKey),
      );
      mountProofsTab(root, matches, proofIndex.proofTypes || {});
    }

    if (quiz && quiz.questions?.length) {
      const quizContainer = document.createElement('section');
      quizContainer.className = 'quiz';
      quizMount.appendChild(quizContainer);
      const qParam = parseInt(query.q, 10);
      const startIndex =
        Number.isFinite(qParam) && qParam >= 1 && qParam <= quiz.questions.length
          ? qParam - 1
          : 0;
      mountQuiz(quizContainer, quiz, progressKey, { startIndex });
    }
  } catch (err) {
    lessonBody.innerHTML = `<div class="block-callout"><strong>Error</strong>${err.message}</div>`;
  }
}
