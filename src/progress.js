// Per-subtopic progress kept in localStorage.
// Shape: { "<courseId>/<topicId>/<subtopicId>": { lessonViewed: true, quizScore: 0.8, completedAt: 1700000000 } }

const KEY = 'imath:progress:v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // ignore quota / disabled storage
  }
}

export function getProgress(key) {
  return load()[key] || null;
}

export function getAllProgress() {
  return load();
}

export function markLessonViewed(key) {
  const data = load();
  data[key] = { ...(data[key] || {}), lessonViewed: true };
  save(data);
}

export function recordQuizScore(key, score, correct, total) {
  const data = load();
  const prev = data[key] || {};
  const best = Math.max(prev.quizScore || 0, score);
  data[key] = {
    ...prev,
    quizScore: best,
    quizCorrect: correct,
    quizTotal: total,
    completedAt: score >= 1 ? Date.now() : prev.completedAt,
  };
  save(data);
}
