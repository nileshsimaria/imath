import { renderHeader } from '../components/header.js';
import { findCourse, isLeaf, isGroup, leafSubtopics } from '../catalog.js';
import { getProgress } from '../progress.js';
import { renderNotFound } from './not-found.js';

function renderLeaf(course, topic, leaf) {
  const key = `${course.id}/${topic.id}/${leaf.id}`;
  const prog = getProgress(key);
  let badge = '';
  if (leaf.status === 'stub') badge = '<span class="badge badge-stub">Coming soon</span>';
  else if (prog?.completedAt) badge = '<span class="badge badge-done">Completed</span>';
  else if (prog?.lessonViewed) badge = '<span class="badge">In progress</span>';

  return `
    <li>
      <a class="subtopic-link" href="#/${course.id}/${topic.id}/${leaf.id}">
        <span>${leaf.title}${badge}</span>
        <span class="arrow">→</span>
      </a>
    </li>`;
}

function renderGroup(course, topic, group) {
  const childrenHtml = (group.subtopics || [])
    .map((c) => renderNode(course, topic, c))
    .join('');
  const leafCount = leafSubtopics(group).length;
  const meta = `<span class="topic-meta">${leafCount} subtopic${leafCount === 1 ? '' : 's'}</span>`;
  const hasQuiz = leafSubtopics(group).some((l) => l.status !== 'stub' && l.path);
  const practice = hasQuiz
    ? `<a class="btn topic-practice" href="#/${course.id}/${topic.id}/${group.id}/practice">
         <span class="topic-practice-icon">⚡</span>
         <span>Practice all in ${group.title}</span>
       </a>`
    : '';

  return `
    <li>
      <details class="subgroup">
        <summary>
          <span class="subgroup-title">${group.title}</span>
          ${meta}
        </summary>
        <ul class="subtopic-list">${childrenHtml}</ul>
        ${practice}
      </details>
    </li>`;
}

function renderNode(course, topic, node) {
  if (isGroup(node)) return renderGroup(course, topic, node);
  if (isLeaf(node) || node.status === 'stub') return renderLeaf(course, topic, node);
  return '';
}

export function renderCourse(root, catalog, courseId) {
  const course = findCourse(catalog, courseId);
  if (!course) return renderNotFound(root);

  const topics = (course.topics || [])
    .map((topic) => {
      const childrenHtml = (topic.subtopics || [])
        .map((s) => renderNode(course, topic, s))
        .join('');

      const leafCount = leafSubtopics(topic).length;
      const meta = `<span class="topic-meta">${leafCount} subtopic${leafCount === 1 ? '' : 's'}</span>`;
      const topicHasQuiz = leafSubtopics(topic).some((s) => s.status !== 'stub' && s.path);
      const topicPractice = topicHasQuiz
        ? `<a class="btn topic-practice" href="#/${course.id}/${topic.id}/practice">
             <span class="topic-practice-icon">⚡</span>
             <span>Practice all in ${topic.title}</span>
           </a>`
        : '';

      return `
        <details class="topic">
          <summary>
            <h2>${topic.title}</h2>
            ${meta}
          </summary>
          <ul class="subtopic-list">${childrenHtml}</ul>
          ${topicPractice}
        </details>`;
    })
    .join('');

  const hasAnyQuiz = (course.topics || []).some(
    (t) => leafSubtopics(t).some((s) => s.status !== 'stub' && s.path),
  );
  const practiceCta = hasAnyQuiz
    ? `<a class="btn btn-primary practice-cta" href="#/${course.id}/practice">
         <span class="practice-cta-icon">⚡</span>
         <span>
           <span class="practice-cta-title">Practice all questions</span>
           <span class="practice-cta-sub">Mixed shuffle from every subtopic — for students who already know the concepts.</span>
         </span>
       </a>`
    : '';

  root.innerHTML = `
    ${renderHeader({ courseTitle: course.title, courseId: course.id })}
    <main>
      <div class="course-header">
        <h1>${course.title}</h1>
        <p>${course.description || ''}</p>
        ${practiceCta}
      </div>
      ${topics || '<div class="empty-state">No topics yet.</div>'}
    </main>
  `;
}
