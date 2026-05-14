// Per-course question counts. Read from public/content/stats.json, which is
// precomputed at build time by scripts/build-stats.cjs (auto-run via predev /
// prebuild). One small fetch instead of ~154 quiz.json round-trips.

const BASE = import.meta.env.BASE_URL;
const V = `?v=${typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev'}`;

let cache = null;

async function loadStats() {
  if (cache) return cache;
  const res = await fetch(`${BASE}content/stats.json${V}`);
  if (!res.ok) throw new Error(`stats.json not found (run \`npm run build:stats\`)`);
  cache = await res.json();
  return cache;
}

export async function getCourseQuestionCounts(_catalog) {
  const stats = await loadStats();
  return { ...stats.byCourse };
}
