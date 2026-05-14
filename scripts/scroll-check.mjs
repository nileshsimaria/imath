// Probe every leaf page to verify it opens scrolled to the top (no surprise
// scroll into the quiz / a focused input). Reports any page where scrollY > 0
// after settle.

import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..');
const manifest = JSON.parse(readFileSync(resolve(REPO, 'public/content/manifest.json'), 'utf8'));

function leafSubtopics(node, out = []) {
  if (!node) return out;
  if (node.path) out.push(node);
  if (Array.isArray(node.subtopics)) for (const s of node.subtopics) leafSubtopics(s, out);
  return out;
}

const routes = [];
for (const course of manifest.courses || []) {
  for (const topic of course.topics || []) {
    for (const leaf of leafSubtopics(topic)) {
      if (leaf.status === 'stub') continue;
      routes.push(`/${course.id}/${topic.id}/${leaf.id}`);
    }
  }
}
routes.push('/', '/widgets');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const offenders = [];
for (const r of routes) {
  await page.goto(`http://localhost:4173/imath/#${r}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  const y = await page.evaluate(() => window.scrollY);
  if (y > 5) offenders.push({ route: r, scrollY: y });
}
await browser.close();

console.log(`Scanned ${routes.length} pages.`);
if (offenders.length === 0) {
  console.log('All pages open at the top ✓');
} else {
  console.log(`${offenders.length} page(s) auto-scrolled:`);
  for (const o of offenders) console.log(`  scrollY=${o.scrollY}  ${o.route}`);
  process.exit(1);
}
