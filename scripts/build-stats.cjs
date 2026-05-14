// Build-time stats: scan every quiz.json under public/content and emit
// public/content/stats.json with per-course question totals (and a few
// other simple aggregates). Used by the landing page so it doesn't have
// to fan out to ~154 quiz.json fetches just to display counts.
//
// Runs automatically before `npm run dev` and `npm run build` via the
// predev / prebuild scripts in package.json.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'public/content');
const MANIFEST = path.join(CONTENT, 'manifest.json');
const OUT = path.join(CONTENT, 'stats.json');

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

function leafSubtopics(node, out = []) {
  if (!node) return out;
  if (node.path) out.push(node);
  if (Array.isArray(node.subtopics)) for (const s of node.subtopics) leafSubtopics(s, out);
  return out;
}

const byCourse = {};
const byLeaf = {};
let total = 0;

for (const course of manifest.courses || []) {
  let courseSum = 0;
  for (const topic of course.topics || []) {
    for (const leaf of leafSubtopics(topic)) {
      if (leaf.status === 'stub') continue;
      const quizPath = path.join(CONTENT, leaf.path, 'quiz.json');
      if (!fs.existsSync(quizPath)) continue;
      let quiz;
      try {
        quiz = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
      } catch (err) {
        console.warn(`[stats] skip ${leaf.path}: ${err.message}`);
        continue;
      }
      const n = (quiz.questions || []).length;
      byLeaf[leaf.path] = n;
      courseSum += n;
    }
  }
  byCourse[course.id] = courseSum;
  total += courseSum;
}

fs.writeFileSync(OUT, JSON.stringify({ byCourse, byLeaf, total }, null, 2) + '\n');
console.log(`[stats] ${total} questions across ${Object.keys(byCourse).length} courses → ${path.relative(ROOT, OUT)}`);
