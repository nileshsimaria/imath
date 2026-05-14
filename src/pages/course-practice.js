import { renderHeader } from '../components/header.js';
import { findCourse, findTopic, findSubtopic, leafSubtopics, loadQuiz } from '../catalog.js';
import { mountQuiz } from '../quiz-engine.js';
import { renderNotFound } from './not-found.js';

const BASE = import.meta.env.BASE_URL;

function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function gatherFromNode(course, topic, node) {
  const leaves = leafSubtopics(node).filter((s) => s.status !== 'stub' && s.path);
  const tasks = leaves.map((sub) =>
    loadQuiz(sub.path)
      .then((quiz) => {
        if (!quiz?.questions?.length) return [];
        const href = `${BASE}#/${course.id}/${topic.id}/${sub.id}`;
        return quiz.questions.map((q) => ({
          ...q,
          topicHint: { title: sub.title, href },
        }));
      })
      .catch(() => []),
  );
  const groups = await Promise.all(tasks);
  return groups.flat();
}

async function gatherFromCourse(course) {
  const groups = await Promise.all(
    (course.topics || []).map((t) => gatherFromNode(course, t, t)),
  );
  return groups.flat();
}

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const DIFF_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

function countByDifficulty(questions) {
  // Untagged questions are silently treated as easy by filterByActive (below),
  // so count them as easy here too. Otherwise the pills sum to less than the
  // total and the user wonders where the missing questions went.
  const counts = { easy: 0, medium: 0, hard: 0 };
  for (const q of questions) {
    const d = DIFFICULTIES.includes(q.difficulty) ? q.difficulty : 'easy';
    counts[d]++;
  }
  return counts;
}

function filterByActive(questions, active) {
  return questions.filter((q) => {
    const d = DIFFICULTIES.includes(q.difficulty) ? q.difficulty : 'easy';
    return active[d];
  });
}

function renderFilterUI(counts, active) {
  const pills = DIFFICULTIES.map((d) => {
    const isOn = active[d];
    const count = counts[d];
    return `<button class="diff-pill diff-pill-${d}${isOn ? ' active' : ''}" data-diff="${d}">
      <span class="diff-check">${isOn ? '✓' : ''}</span>
      <span>${DIFF_LABELS[d]}</span>
      <span class="diff-count">${count}</span>
    </button>`;
  }).join('');
  const total = DIFFICULTIES.reduce((s, d) => s + (active[d] ? counts[d] : 0), 0);
  return `
    <div class="diff-filter">
      <span class="diff-filter-label">Filter by difficulty:</span>
      <div class="diff-pills">${pills}</div>
      <span class="diff-active-count">${total} question${total === 1 ? '' : 's'} selected</span>
    </div>
  `;
}

export async function renderCoursePractice(root, catalog, courseId, topicId = null, subtopicId = null) {
  const course = findCourse(catalog, courseId);
  if (!course) return renderNotFound(root);

  let topic = null;
  let node = null;
  if (topicId) {
    topic = findTopic(course, topicId);
    if (!topic) return renderNotFound(root);
    if (subtopicId) {
      node = findSubtopic(topic, subtopicId);
      if (!node) return renderNotFound(root);
    } else {
      node = topic;
    }
  }

  const scopeTitle = node ? node.title : course.title;
  const subtitle = node
    ? `All quiz questions from <strong>${node.title}</strong>, shuffled. Click <em>Reveal topic</em> if you want a hint about which subtopic a question came from.`
    : `All quiz questions across every subtopic, shuffled. Click <em>Reveal topic</em> if you want a hint about which subtopic a question came from.`;
  const progressKey = node
    ? `${course.id}/${topic.id}/${node.id}/_practice`
    : `${course.id}/_practice`;
  const backHref = `#/${course.id}`;

  root.innerHTML = `
    ${renderHeader({
      courseTitle: course.title,
      courseId: course.id,
      topicTitle: node ? `${node.title} · Mixed practice` : 'Mixed practice',
    })}
    <main>
      <article class="lesson lesson-wide">
        <h1>Mixed practice — ${scopeTitle}</h1>
        <p class="subtitle">${subtitle}</p>
        <div data-filter></div>
        <div data-practice><p>Loading questions…</p></div>
        <div class="lesson-actions">
          <a class="btn" href="${backHref}">← Back to ${course.title}</a>
        </div>
      </article>
    </main>
  `;

  const filterMount = root.querySelector('[data-filter]');
  const mount = root.querySelector('[data-practice]');

  let allQuestions;
  try {
    allQuestions = node
      ? await gatherFromNode(course, topic, node)
      : await gatherFromCourse(course);
  } catch (err) {
    mount.innerHTML = `<div class="block-callout"><strong>Error</strong>${err.message}</div>`;
    return;
  }

  if (!allQuestions.length) {
    mount.innerHTML = `<div class="block-callout"><strong>No questions yet</strong>${
      node ? 'This section has no quizzes available to practice.' : 'This course has no quizzes available to practice.'
    }</div>`;
    return;
  }

  const counts = countByDifficulty(allQuestions);
  const active = { easy: true, medium: true, hard: true };

  function refresh() {
    filterMount.innerHTML = renderFilterUI(counts, active);
    filterMount.querySelectorAll('[data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const d = btn.dataset.diff;
        active[d] = !active[d];
        // Don't allow deselecting all — keep at least one on.
        if (!active.easy && !active.medium && !active.hard) {
          active[d] = true;
          return;
        }
        refresh();
      });
    });

    const filtered = filterByActive(allQuestions, active);
    if (!filtered.length) {
      mount.innerHTML = `<div class="block-callout"><strong>No questions match this filter</strong>Toggle a difficulty back on.</div>`;
      return;
    }
    const shuffled = shuffle(filtered);
    const container = document.createElement('section');
    container.className = 'quiz';
    mount.innerHTML = '';
    mount.appendChild(container);
    mountQuiz(container, { questions: shuffled }, progressKey, { showQuestionList: true });
  }

  refresh();
}
