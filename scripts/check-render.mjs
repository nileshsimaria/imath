// Headless render audit. Builds the site, serves dist/ via vite preview,
// then visits every leaf page in the catalog with chromium and reports:
//
//   [KATEX_ERROR]    KaTeX rendered a soft-error span (.katex-error)
//   [UNRENDERED]     A $...$ block leaked into DOM text — math didn't render
//   [JS_ERROR]       Uncaught exception on the page
//   [CONSOLE_ERROR]  console.error during page lifecycle
//   [LOAD_TIMEOUT]   Page never reached a renderable state
//
// For each leaf with a quiz, every question is clicked through so each one
// is rendered and inspected.
//
// Usage:
//   npm run build && npm run check:render
//   npm run check:render -- --fast   # render only Q1 of each quiz
//   npm run check:render -- --route /algebra-1/quadratics/quadratic-formula

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..');
const PORT = 4173;
const URL_BASE = `http://localhost:${PORT}/imath/`;

const FAST = process.argv.includes('--fast');
const ROUTE_FILTER = (() => {
  const i = process.argv.indexOf('--route');
  return i !== -1 ? process.argv[i + 1] : null;
})();

function leafSubtopics(node) {
  const out = [];
  if (!node) return out;
  if (node.path) out.push(node);
  if (Array.isArray(node.subtopics)) {
    for (const s of node.subtopics) out.push(...leafSubtopics(s));
  }
  return out;
}

function enumerateTargets(manifest) {
  const targets = [];
  for (const course of manifest.courses || []) {
    for (const topic of course.topics || []) {
      for (const leaf of leafSubtopics(topic)) {
        if (leaf.status === 'stub') continue;
        targets.push({
          courseId: course.id,
          topicId: topic.id,
          subtopicId: leaf.id,
          title: leaf.title,
          route: `/${course.id}/${topic.id}/${leaf.id}`,
        });
      }
    }
  }
  return targets;
}

async function startPreviewServer() {
  if (!existsSync(resolve(REPO, 'dist/index.html'))) {
    throw new Error('dist/ not found — run `npm run build` first');
  }
  const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: REPO,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolveReady, reject) => {
    let resolved = false;
    const onReady = () => { if (!resolved) { resolved = true; resolveReady(); } };
    proc.stdout.on('data', (d) => { if (d.toString().includes('Local:')) onReady(); });
    proc.stderr.on('data', () => {}); // keep stderr drained
    proc.on('exit', (code) => {
      if (!resolved) reject(new Error(`vite preview exited with code ${code}`));
    });
    setTimeout(() => { if (!resolved) reject(new Error('vite preview did not start within 15s')); }, 15000);
  });
  return proc;
}

// Fish out unrendered math fragments. KaTeX renders `\$` as a literal `$`
// glyph in DOM text, so we must IGNORE text nodes inside `.katex` — their
// `$` characters are intentional dollar amounts, not unrendered delimiters.
// We only scan text nodes OUTSIDE rendered math.
async function checkPageForRenderIssues(page, route, issues) {
  const ke = await page.locator('.katex-error').count();
  if (ke) {
    issues.push({ kind: 'KATEX_ERROR', route, msg: `${ke} .katex-error element(s)` });
  }
  const matches = await page.evaluate(() => {
    const root = document.querySelector('main');
    if (!root) return [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const re = /\$[^\s$][^\n$]{0,80}\$/g;
    const out = [];
    let n;
    while ((n = walker.nextNode())) {
      const p = n.parentElement;
      if (!p) continue;
      if (p.closest('.katex')) continue;
      if (p.closest('code, pre')) continue;
      const m = n.nodeValue.match(re);
      if (!m) continue;
      for (const match of m) {
        const inner = match.slice(1, -1);
        // Real unrendered LaTeX has commands (\), scripts (^_), or groups ({}).
        // Without any of these, the match is almost certainly two adjacent
        // dollar amounts being accidentally paired by the regex.
        if (/[\\^_{]/.test(inner)) out.push(match);
      }
    }
    return out;
  });
  if (matches.length) {
    issues.push({
      kind: 'UNRENDERED',
      route,
      msg: `${matches.length} unrendered: ${matches[0].slice(0, 60)}`,
    });
  }
}

async function clickThroughQuiz(page, route, issues) {
  const SAFETY_LIMIT = 50;
  for (let i = 0; i < SAFETY_LIMIT; i++) {
    // Re-check render on the current question.
    await checkPageForRenderIssues(page, `${route} q${i + 1}`, issues);

    // Are we already at the summary?
    if (await page.locator('.quiz-summary').count()) return;

    // Find input affordance.
    const choiceCount = await page.locator('.quiz-choice').count();
    const inputCount = await page.locator('.quiz-input').count();

    if (choiceCount > 0) {
      await page.locator('.quiz-choice').first().click();
    } else if (inputCount > 0) {
      await page.locator('.quiz-input').fill('0');
      await page.locator('button[data-action="submit"]').click();
    } else {
      // Couldn't find a way to advance.
      issues.push({ kind: 'STUCK', route: `${route} q${i + 1}`, msg: 'no choice/input found' });
      return;
    }

    // After answering, a Next/See-results button appears. Click it.
    const advanced = await page
      .locator('button.btn-primary')
      .filter({ hasText: /Next question|See results/ })
      .first()
      .waitFor({ timeout: 5000 })
      .then(() => true)
      .catch(() => false);

    if (!advanced) {
      issues.push({ kind: 'STUCK', route: `${route} q${i + 1}`, msg: 'no Next button after answering' });
      return;
    }
    await page.locator('button.btn-primary').filter({ hasText: /Next question|See results/ }).first().click();

    if (FAST) return;
  }
}

async function main() {
  const manifest = JSON.parse(readFileSync(resolve(REPO, 'public/content/manifest.json'), 'utf8'));
  let targets = enumerateTargets(manifest);
  if (ROUTE_FILTER) {
    targets = targets.filter((t) => t.route === ROUTE_FILTER);
    if (!targets.length) {
      console.error(`No leaf matches --route ${ROUTE_FILTER}`);
      process.exit(2);
    }
  }

  console.log(`Starting preview server on :${PORT}…`);
  const server = await startPreviewServer();

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const issues = [];
  let currentRoute = null;

  page.on('pageerror', (err) => {
    issues.push({ kind: 'JS_ERROR', route: currentRoute, msg: err.message.slice(0, 200) });
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      issues.push({ kind: 'CONSOLE_ERROR', route: currentRoute, msg: msg.text().slice(0, 200) });
    }
  });

  console.log(`Visiting ${targets.length} leaf pages${FAST ? ' (fast: Q1 only)' : ''}…`);
  let n = 0;
  const t0 = Date.now();
  for (const t of targets) {
    n++;
    currentRoute = t.route;
    try {
      await page.goto(URL_BASE + '#' + t.route, { waitUntil: 'load', timeout: 15000 });
      // Wait for either the lesson article or an error screen.
      await page.locator('article.lesson, .error-screen').first().waitFor({ timeout: 15000 });
    } catch (err) {
      issues.push({ kind: 'LOAD_TIMEOUT', route: t.route, msg: err.message.slice(0, 200) });
      continue;
    }

    await checkPageForRenderIssues(page, t.route, issues);

    if (await page.locator('.quiz').count()) {
      await clickThroughQuiz(page, t.route, issues);
    }

    if (n % 10 === 0) {
      const dt = ((Date.now() - t0) / 1000).toFixed(0);
      process.stdout.write(`  ${n}/${targets.length} (${dt}s, ${issues.length} issues)\n`);
    }
  }

  await browser.close();
  server.kill();

  const byKind = {};
  for (const i of issues) byKind[i.kind] = (byKind[i.kind] || 0) + 1;
  const dt = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\nVisited ${targets.length} pages in ${dt}s.`);
  console.log(`Issues: ${issues.length}`, byKind);

  if (issues.length) {
    console.log('');
    const grouped = {};
    for (const i of issues) {
      const k = `${i.kind}\t${i.route || '<?>'}`;
      (grouped[k] = grouped[k] || []).push(i);
    }
    for (const k of Object.keys(grouped).sort()) {
      const [kind, route] = k.split('\t');
      console.log(`[${kind}] ${route}`);
      for (const i of grouped[k]) console.log(`  - ${i.msg}`);
    }
  }

  process.exit(issues.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
