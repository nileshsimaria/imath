// Build-time index: scan every lesson.json under public/content and emit
// public/content/widget-index.json mapping each widget kind to the lessons
// that use it.
//
// Runs automatically before `npm run dev` and `npm run build` via the
// predev / prebuild scripts in package.json. Safe to re-run any time.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'public/content');
const MANIFEST = path.join(CONTENT, 'manifest.json');
const OUT = path.join(CONTENT, 'widget-index.json');

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

function leafSubtopics(node, out = []) {
  if (!node) return out;
  if (node.path) out.push(node);
  if (Array.isArray(node.subtopics)) for (const s of node.subtopics) leafSubtopics(s, out);
  return out;
}

const index = {}; // kind -> [{ courseId, courseTitle, topicId, topicTitle, subtopicId, subtopicTitle }]

for (const course of manifest.courses || []) {
  for (const topic of course.topics || []) {
    for (const leaf of leafSubtopics(topic)) {
      if (leaf.status === 'stub') continue;
      const lessonPath = path.join(CONTENT, leaf.path, 'lesson.json');
      if (!fs.existsSync(lessonPath)) continue;
      let lesson;
      try {
        lesson = JSON.parse(fs.readFileSync(lessonPath, 'utf8'));
      } catch (err) {
        console.warn(`[widget-index] skip ${leaf.path}: ${err.message}`);
        continue;
      }
      const kinds = new Set();
      for (const block of lesson.blocks || []) {
        if (block && block.type === 'widget' && block.kind) kinds.add(block.kind);
      }
      for (const kind of kinds) {
        if (!index[kind]) index[kind] = [];
        index[kind].push({
          courseId: course.id,
          courseTitle: course.title,
          topicId: topic.id,
          topicTitle: topic.title,
          subtopicId: leaf.id,
          subtopicTitle: leaf.title,
        });
      }
    }
  }
}

fs.writeFileSync(OUT, JSON.stringify(index, null, 2) + '\n');
const totalLessons = Object.values(index).reduce((s, arr) => s + arr.length, 0);
console.log(`[widget-index] ${Object.keys(index).length} widget kinds across ${totalLessons} lesson usages → ${path.relative(ROOT, OUT)}`);
