// Loads the content manifest and provides lookup helpers.

const BASE = import.meta.env.BASE_URL;

// Cache-buster: __BUILD_ID__ is replaced at build time by Vite (see
// vite.config.js). A new build → new query string → browsers fetch fresh
// content. Within one build, the URL stays stable so HTTP caching still works.
const V = `?v=${typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev'}`;

export async function loadCatalog() {
  const res = await fetch(`${BASE}content/manifest.json${V}`);
  if (!res.ok) throw new Error(`Failed to load manifest.json: ${res.status}`);
  return res.json();
}

export function findCourse(catalog, courseId) {
  return catalog.courses.find((c) => c.id === courseId) ?? null;
}

export function findTopic(course, topicId) {
  return course?.topics?.find((t) => t.id === topicId) ?? null;
}

// Subtopics can nest: a subtopic is either a leaf (with `path`) or a group
// (with its own `subtopics` array). Search for the id at any depth.
export function findSubtopic(topic, subtopicId) {
  if (!topic?.subtopics) return null;
  for (const s of topic.subtopics) {
    if (s.id === subtopicId) return s;
    if (s.subtopics) {
      const nested = findSubtopic(s, subtopicId);
      if (nested) return nested;
    }
  }
  return null;
}

export function isGroup(node) {
  return Array.isArray(node?.subtopics) && node.subtopics.length > 0;
}

export function isLeaf(node) {
  return Boolean(node?.path);
}

// Walk a node (topic / group / leaf) and return every leaf descendant.
export function leafSubtopics(node) {
  const out = [];
  if (!node) return out;
  if (isLeaf(node)) out.push(node);
  if (Array.isArray(node.subtopics)) {
    for (const s of node.subtopics) out.push(...leafSubtopics(s));
  }
  return out;
}

export async function loadLesson(path) {
  const res = await fetch(`${BASE}content/${path}/lesson.json${V}`);
  if (!res.ok) throw new Error(`Lesson not found: ${path}`);
  return res.json();
}

export async function loadQuiz(path) {
  const res = await fetch(`${BASE}content/${path}/quiz.json${V}`);
  if (!res.ok) return null; // quiz is optional
  return res.json();
}

// Proofs are their own content collection (not nested under a course/subtopic)
// so a single proof can relate to several subtopics across courses. The index
// carries metadata; each proof's blocks live in proofs/<id>/proof.json.
export async function loadProofIndex() {
  const res = await fetch(`${BASE}content/proofs/index.json${V}`);
  if (!res.ok) throw new Error(`Failed to load proofs index: ${res.status}`);
  return res.json();
}

export async function loadProof(id) {
  const res = await fetch(`${BASE}content/proofs/${id}/proof.json${V}`);
  if (!res.ok) throw new Error(`Proof not found: ${id}`);
  return res.json();
}

export async function loadBlogIndex() {
  const res = await fetch(`${BASE}content/blog/index.json${V}`);
  if (!res.ok) throw new Error(`Failed to load blog index: ${res.status}`);
  return res.json();
}

export async function loadBlogPost(slug) {
  const res = await fetch(`${BASE}content/blog/${slug}/lesson.json${V}`);
  if (!res.ok) throw new Error(`Blog post not found: ${slug}`);
  return res.json();
}
