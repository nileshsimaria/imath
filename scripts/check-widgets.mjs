// Interactive widget smoke test.
//
// For each interactive widget, this script:
//   1. Loads the lesson page that embeds it.
//   2. Captures the rendered SVG/state BEFORE touching any control.
//   3. Operates a control (dropdown, slider, checkbox, button).
//   4. Re-captures the state and verifies it CHANGED.
//
// Without this kind of test, silent failures (e.g. addEventListener on the
// wrong element due to a duplicate data-* attribute) sneak through static +
// render checks because the page renders fine — it just doesn't react.
//
// Usage:
//   npm run build && node scripts/check-widgets.mjs
//   node scripts/check-widgets.mjs --keep-server   # don't shut down preview at end
//   node scripts/check-widgets.mjs --headed        # show the browser window

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..');
const PORT = 4173;
const URL_BASE = `http://localhost:${PORT}/imath/`;

const HEADED = process.argv.includes('--headed');

// Each test: load `route`, then run `interact(page)` which should produce
// an array of {label, before, after} entries. The check passes if every
// before/after pair is different.
const TESTS = [
  {
    name: 'osculating-circle',
    route: '/calculus-1/applications-derivatives/curvature',
    async interact(page) {
      const results = [];
      const widget = page.locator('.osc-wrap');
      await widget.waitFor({ state: 'visible', timeout: 5000 });

      // Test 1: curve dropdown switches the diagram
      const svg = widget.locator('.osc-svg');
      const beforeCurve = await svg.innerHTML();
      await widget.locator('[data-osc-curve-select]').selectOption('cubic');
      await page.waitForTimeout(150);
      const afterCurve = await svg.innerHTML();
      results.push({ label: 'curve dropdown changes diagram', before: beforeCurve, after: afterCurve });

      // Test 2: x slider moves the point
      const beforeX = await svg.innerHTML();
      const xSlider = widget.locator('[data-osc-x]');
      await xSlider.evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, '-1.5');
      await page.waitForTimeout(80);
      const afterX = await svg.innerHTML();
      results.push({ label: 'x slider moves the point', before: beforeX, after: afterX });

      // Test 3: R readout updates
      const beforeR = await widget.locator('[data-osc-readout] .r-R').textContent();
      await widget.locator('[data-osc-curve-select]').selectOption('circle-top');
      await page.waitForTimeout(150);
      const afterR = await widget.locator('[data-osc-readout] .r-R').textContent();
      results.push({ label: 'R readout updates for "circle-top" (should read R = 2)', before: beforeR, after: afterR, mustContain: '2' });

      return results;
    },
  },
  {
    name: 'galton-board',
    route: '/statistics/probability/galton-board-clt',
    async interact(page) {
      const results = [];
      const widget = page.locator('.gb-wrap');
      await widget.waitFor({ state: 'visible', timeout: 5000 });

      // Drop marbles first — the theory overlay is suppressed when total === 0
      const beforeDrop = await widget.locator('[data-gb-bins]').innerHTML();
      await widget.locator('[data-gb-drop="100"]').click();
      await page.waitForTimeout(2500);
      const afterDrop = await widget.locator('[data-gb-bins]').innerHTML();
      results.push({ label: 'dropping marbles updates the bins', before: beforeDrop, after: afterDrop });

      // Theory overlay should now be present (checkbox starts checked)
      const theoryAfterDrop = await widget.locator('[data-gb-theory]').innerHTML();
      results.push({ label: 'theory overlay renders after marbles dropped (checkbox is on)', before: '', after: theoryAfterDrop, mustHaveContent: true });

      // Toggle the checkbox off — overlay should clear
      const toggle = widget.locator('[data-gb-theory-toggle]');
      await toggle.uncheck();
      await page.waitForTimeout(100);
      const afterUncheck = await widget.locator('[data-gb-theory]').innerHTML();
      results.push({ label: 'theory overlay clears when toggle unchecked', before: theoryAfterDrop, after: afterUncheck });

      // Toggle back on — overlay should return
      await toggle.check();
      await page.waitForTimeout(100);
      const afterRecheck = await widget.locator('[data-gb-theory]').innerHTML();
      results.push({ label: 'theory overlay returns when toggle re-checked', before: afterUncheck, after: afterRecheck });

      return results;
    },
  },
  {
    name: 'time-derivatives',
    route: '/calculus-1/derivatives-concept/velocity-acceleration',
    async interact(page) {
      const results = [];
      const widget = page.locator('.tdv-wrap');
      await widget.waitFor({ state: 'visible', timeout: 5000 });

      const svg = widget.locator('.tdv-svg');

      // Profile dropdown changes the curves
      const beforeProf = await svg.innerHTML();
      await widget.locator('[data-tdv-profile]').selectOption('oscillation');
      await page.waitForTimeout(150);
      const afterProf = await svg.innerHTML();
      results.push({ label: 'motion-profile dropdown changes the plots', before: beforeProf, after: afterProf });

      // Time slider moves the cursor
      const beforeT = await svg.innerHTML();
      const tSlider = widget.locator('[data-tdv-t]');
      await tSlider.evaluate((el) => {
        el.value = (parseFloat(el.max) * 0.7).toString();
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.waitForTimeout(80);
      const afterT = await svg.innerHTML();
      results.push({ label: 'time slider moves the cursor', before: beforeT, after: afterT });

      return results;
    },
  },
  {
    name: 'growing-square',
    route: '/calculus-1/derivatives-concept/growing-square',
    async interact(page) {
      const results = [];
      const widget = page.locator('.gs-wrap');
      await widget.waitFor({ state: 'visible', timeout: 5000 });

      // x slider
      const beforeX = await widget.locator('[data-gs-shapes]').innerHTML();
      const xSlider = widget.locator('[data-gs-x]');
      await xSlider.evaluate((el) => {
        el.value = (parseFloat(el.max) * 0.4).toString();
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.waitForTimeout(80);
      const afterX = await widget.locator('[data-gs-shapes]').innerHTML();
      results.push({ label: 'x slider redraws the square', before: beforeX, after: afterX });

      // Drop corner checkbox
      const beforeDrop = await widget.locator('[data-gs-shapes]').innerHTML();
      const dropToggle = widget.locator('[data-gs-drop]');
      const isChecked = await dropToggle.isChecked();
      if (isChecked) await dropToggle.uncheck();
      else await dropToggle.check();
      await page.waitForTimeout(80);
      const afterDrop = await widget.locator('[data-gs-shapes]').innerHTML();
      results.push({ label: 'drop-corner toggle updates the diagram', before: beforeDrop, after: afterDrop });

      return results;
    },
  },
  {
    name: 'shm',
    route: '/calculus-1/differentiation-rules/sine-derivative-and-waves',
    async interact(page) {
      const results = [];
      const widget = page.locator('.shm-wrap');
      await widget.waitFor({ state: 'visible', timeout: 5000 });

      const aSlider = widget.locator('[data-shm-a]');
      const beforeA = await widget.locator('[data-shm-curves]').innerHTML();
      await aSlider.evaluate((el) => {
        el.value = '1.2';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.waitForTimeout(80);
      const afterA = await widget.locator('[data-shm-curves]').innerHTML();
      results.push({ label: 'amplitude slider changes curves', before: beforeA, after: afterA });

      const beforeShow = await widget.locator('[data-shm-curves]').innerHTML();
      await widget.locator('[data-shm-show]').selectOption('pos');
      await page.waitForTimeout(100);
      const afterShow = await widget.locator('[data-shm-curves]').innerHTML();
      results.push({ label: 'show-mode dropdown changes curves', before: beforeShow, after: afterShow });

      return results;
    },
  },
  {
    name: 'riemann-sum',
    route: '/calculus-1/integration/riemann-sums',
    async interact(page) {
      const results = [];
      const widget = page.locator('.rs-wrap').first();
      await widget.waitFor({ state: 'visible', timeout: 5000 });
      const svg = widget.locator('svg').first();

      // Function selector buttons (three buttons with data-rs-func)
      const beforeFunc = await svg.innerHTML();
      await widget.locator('[data-rs-func]').nth(1).click();
      await page.waitForTimeout(120);
      const afterFunc = await svg.innerHTML();
      results.push({ label: 'function-selector button changes the plot', before: beforeFunc, after: afterFunc });

      // n (number of rectangles) slider
      const beforeN = await svg.innerHTML();
      await widget.locator('[data-rs-n]').evaluate((el) => {
        el.value = '40';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.waitForTimeout(100);
      const afterN = await svg.innerHTML();
      results.push({ label: 'n slider changes the rectangle count', before: beforeN, after: afterN });

      // Type buttons (left / mid / right)
      const beforeType = await svg.innerHTML();
      await widget.locator('[data-rs-type]').nth(2).click();
      await page.waitForTimeout(100);
      const afterType = await svg.innerHTML();
      results.push({ label: 'sample-type button changes the rectangles', before: beforeType, after: afterType });

      return results;
    },
  },
  {
    name: 'derivative-explorer',
    route: '/calculus-1/derivatives-concept/definition-and-tangent',
    async interact(page) {
      const results = [];
      const widget = page.locator('.de-wrap').first();
      await widget.waitFor({ state: 'visible', timeout: 5000 });
      const svg = widget.locator('svg').first();

      // Function selector
      const beforeFunc = await svg.innerHTML();
      await widget.locator('[data-de-func]').nth(1).click();
      await page.waitForTimeout(120);
      const afterFunc = await svg.innerHTML();
      results.push({ label: 'function-selector changes the curve', before: beforeFunc, after: afterFunc });

      // x0 slider
      const beforeX = await svg.innerHTML();
      await widget.locator('[data-de-x0]').evaluate((el) => {
        const cur = parseFloat(el.value);
        const next = cur + (parseFloat(el.max) - parseFloat(el.min)) * 0.2;
        el.value = next.toString();
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.waitForTimeout(80);
      const afterX = await svg.innerHTML();
      results.push({ label: 'x0 slider moves the tangent point', before: beforeX, after: afterX });

      return results;
    },
  },
  {
    name: 'conic-section',
    route: '/algebra-2/conics/ellipse',
    async interact(page) {
      const results = [];
      const widget = page.locator('.cn-wrap').first();
      await widget.waitFor({ state: 'visible', timeout: 5000 });
      const svg = widget.locator('svg').first();

      // Mode tabs (circle / ellipse / parabola / hyperbola). The ellipse lesson
      // mounts with mode=ellipse, so click a tab that is definitely different.
      const beforeMode = await svg.innerHTML();
      await widget.locator('[data-cn-mode="hyperbola"]').click();
      await page.waitForTimeout(200);
      const afterMode = await svg.innerHTML();
      results.push({ label: 'mode tab switches the conic type (ellipse → hyperbola)', before: beforeMode, after: afterMode });

      return results;
    },
  },
  {
    name: 'ferris-wheel',
    route: '/pre-calculus/trigonometry/sine-from-rotation',
    async interact(page) {
      const results = [];
      const widget = page.locator('.fw-wrap').first();
      await widget.waitFor({ state: 'visible', timeout: 5000 });

      // Wait a tick to let the animation update the graph
      const trace = widget.locator('[data-fw-trace]');
      const t1 = await trace.innerHTML();
      await page.waitForTimeout(700);
      const t2 = await trace.innerHTML();
      results.push({ label: 'animation updates the trace over time', before: t1, after: t2 });

      // Reset button — should clear or visibly change the trace
      await widget.locator('[data-fw-reset]').click();
      await page.waitForTimeout(150);
      const t3 = await trace.innerHTML();
      results.push({ label: 'reset button changes the trace', before: t2, after: t3 });

      return results;
    },
  },
  {
    name: 'dataset-summary',
    route: '/statistics/descriptive/measures-of-center',
    async interact(page) {
      const results = [];
      const widget = page.locator('.ds-wrap').first();
      await widget.waitFor({ state: 'visible', timeout: 5000 });
      const svg = widget.locator('.ds-svg');
      const before = await svg.innerHTML();
      await widget.locator('[data-ds-preset]').selectOption('outlier');
      await page.waitForTimeout(150);
      const after = await svg.innerHTML();
      results.push({ label: 'preset dropdown updates the dot plot', before, after });
      const stats = await widget.locator('[data-ds-statspanel]').innerHTML();
      results.push({ label: 'stats panel renders', before: '', after: stats, mustHaveContent: stats.length > 0 });
      return results;
    },
  },
  {
    name: 'histogram',
    route: '/statistics/descriptive/data-displays',
    async interact(page) {
      const results = [];
      const widget = page.locator('.hg-wrap').first();
      await widget.waitFor({ state: 'visible', timeout: 5000 });
      const svg = widget.locator('.hg-svg');
      const before = await svg.innerHTML();
      await widget.locator('[data-hg-preset]').selectOption('waiting-times');
      await page.waitForTimeout(120);
      const after = await svg.innerHTML();
      results.push({ label: 'preset dropdown changes the histogram', before, after });
      const beforeBins = await svg.innerHTML();
      await widget.locator('[data-hg-bins]').evaluate((el) => {
        el.value = '15';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.waitForTimeout(80);
      const afterBins = await svg.innerHTML();
      results.push({ label: 'bin-count slider changes the bars', before: beforeBins, after: afterBins });
      return results;
    },
  },
  {
    name: 'pages open at top (no surprise scroll)',
    route: '/calculus-1/applications-derivatives/curvature',
    skipUnrenderedScan: true,
    async interact(page) {
      const results = [];
      // Sample a mix: lesson with MC q1 (curvature), lesson with numeric q1
      // (triangle-properties — exposed the input.focus() scroll bug), and the
      // widgets index page.
      const probes = [
        '/calculus-1/applications-derivatives/curvature',
        '/geometry/triangles/triangle-properties',
        '/widgets',
        '/',
      ];
      for (const route of probes) {
        await page.goto(`${URL_BASE}#${route}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(400);
        const y = await page.evaluate(() => window.scrollY);
        results.push({ label: `opens at scrollY≈0 for ${route}`, before: '', after: `scrollY=${y}`, mustHaveContent: y <= 5 });
      }
      return results;
    },
  },
  {
    name: 'bold across inline math (renderInline regression)',
    route: '/calculus-1/differentiation-rules/sine-derivative-and-waves',
    skipUnrenderedScan: true,
    async interact(page) {
      const results = [];
      await page.locator('.quiz').waitFor({ state: 'visible', timeout: 5000 });
      // q9 (id) — the SHM question. Skip questions until we get there.
      // q9 is the 9th question, so skip 8 times.
      for (let i = 0; i < 8; i++) {
        const skipBtn = page.locator('.quiz-skip-btn').first();
        if (await skipBtn.count() === 0) break;
        await skipBtn.click();
        await page.waitForTimeout(60);
      }
      // Open the step-by-step solution
      const stepsBtn = page.locator('.quiz-steps-btn').first();
      await stepsBtn.click();
      await page.waitForTimeout(150);
      // Expected: step containing 'Compute the argument' should be wrapped in <strong>
      const steps = page.locator('.quiz-steps li');
      const stepCount = await steps.count();
      let foundBoldArg = false;
      for (let i = 0; i < stepCount; i++) {
        const html = await steps.nth(i).innerHTML();
        if (html.includes('<strong>Compute the argument')) {
          foundBoldArg = true;
          break;
        }
      }
      results.push({
        label: 'step "**Compute the argument at $t = π/8$.**" renders bold even with inline math inside',
        before: '',
        after: foundBoldArg ? 'wrapped in <strong>' : 'no <strong> wrapper found',
        mustHaveContent: foundBoldArg,
      });
      // Also verify no literal "**" leaks anywhere in the steps
      const stepsHtml = await page.locator('.quiz-steps').first().innerHTML();
      const stars = (stepsHtml.match(/\*\*/g) || []).length;
      results.push({
        label: 'no literal "**" markers leak in the rendered steps',
        before: '',
        after: `${stars} occurrences of "**" in steps HTML`,
        mustHaveContent: stars === 0,
      });
      return results;
    },
  },
  {
    name: 'mixed practice question nav',
    route: '/algebra-1/identities-factoring/algebraic-identities/practice',
    skipUnrenderedScan: true,
    async interact(page) {
      const results = [];
      await page.locator('.quiz').waitFor({ state: 'visible', timeout: 5000 });
      await page.waitForTimeout(500);

      // 1. Sidebar exists with one item per question
      const navItemCount = await page.locator('.quiz-nav-item').count();
      results.push({
        label: 'nav lists every question (~28 items for algebra-1 algebraic-identities)',
        before: '',
        after: `${navItemCount} items`,
        mustHaveContent: navItemCount >= 20,
      });

      // 2. The FIRST question is marked current at start
      const firstClasses = await page.locator('.quiz-nav-item').first().getAttribute('class');
      results.push({
        label: 'question 1 is the current item on load',
        before: '',
        after: firstClasses || '',
        mustContain: 'current',
      });

      // 3. Click on the 5th nav item → quiz jumps to question 5
      const beforeProgress = await page.locator('.quiz-progress').first().textContent();
      await page.locator('.quiz-nav-item').nth(4).click();
      await page.waitForTimeout(200);
      const afterProgress = await page.locator('.quiz-progress').first().textContent();
      results.push({
        label: 'clicking nav item 5 advances quiz to question 5',
        before: beforeProgress || '',
        after: afterProgress || '',
        mustContain: 'Question 5 of',
      });

      // 4. Item 5 is now marked current; item 1 is not
      const fifthClasses = await page.locator('.quiz-nav-item').nth(4).getAttribute('class');
      results.push({
        label: 'nav item 5 is now current',
        before: '',
        after: fifthClasses || '',
        mustContain: 'current',
      });

      return results;
    },
  },
  {
    name: 'quiz deep-link ?q=N',
    route: '/algebra-1/identities-factoring/algebraic-identities',
    skipUnrenderedScan: true,
    async interact(page) {
      const results = [];

      // Without ?q, quiz starts at question 1.
      await page.goto(`${URL_BASE}#/algebra-1/identities-factoring/algebraic-identities`, { waitUntil: 'networkidle' });
      await page.locator('.quiz').waitFor({ state: 'visible', timeout: 5000 });
      await page.waitForTimeout(200);
      const startProgress = await page.locator('.quiz-progress').first().textContent();
      results.push({
        label: 'no ?q → starts at Question 1',
        before: '',
        after: startProgress || '',
        mustContain: 'Question 1 of',
      });

      // With ?q=23, quiz should jump to question 23.
      await page.goto(`${URL_BASE}#/algebra-1/identities-factoring/algebraic-identities?q=23`, { waitUntil: 'networkidle' });
      await page.locator('.quiz').waitFor({ state: 'visible', timeout: 5000 });
      await page.waitForTimeout(200);
      const deepProgress = await page.locator('.quiz-progress').first().textContent();
      results.push({
        label: '?q=23 → jumps to Question 23',
        before: '',
        after: deepProgress || '',
        mustContain: 'Question 23 of',
      });

      // Out-of-range ?q falls back to question 1.
      await page.goto(`${URL_BASE}#/algebra-1/identities-factoring/algebraic-identities?q=9999`, { waitUntil: 'networkidle' });
      await page.locator('.quiz').waitFor({ state: 'visible', timeout: 5000 });
      await page.waitForTimeout(200);
      const fallbackProgress = await page.locator('.quiz-progress').first().textContent();
      results.push({
        label: '?q=9999 (out of range) → falls back to Question 1',
        before: '',
        after: fallbackProgress || '',
        mustContain: 'Question 1 of',
      });

      return results;
    },
  },
  {
    name: '/widgets index page',
    route: '/widgets',
    skipUnrenderedScan: true,
    async interact(page) {
      const results = [];
      await page.locator('.widgets-hero h1').waitFor({ state: 'visible', timeout: 5000 });

      // The index should render at least one section and many widget rows
      const sectionCount = await page.locator('.widget-section').count();
      results.push({ label: 'index renders sections grouped by course', before: '', after: `${sectionCount} sections`, mustHaveContent: sectionCount > 0 });

      const rowCount = await page.locator('.widget-row').count();
      results.push({ label: 'index lists every registered widget (>=40 rows)', before: '', after: `${rowCount} rows`, mustHaveContent: rowCount >= 40 });

      // The header "Widgets" nav link should be present and clickable from elsewhere
      // Navigate to home, then click Widgets in the header
      await page.goto(`${URL_BASE}#/`);
      await page.locator('.course-grid').waitFor({ state: 'visible', timeout: 5000 });
      const navLink = page.locator('.app-nav-link', { hasText: 'Widgets' });
      const navHref = await navLink.getAttribute('href');
      results.push({ label: 'header has Widgets nav link with href=#/widgets', before: '', after: navHref || '', mustContain: '/widgets' });
      await navLink.click();
      await page.locator('.widgets-hero h1').waitFor({ state: 'visible', timeout: 5000 });

      // Clicking a widget name should navigate to a lesson page
      const firstRow = page.locator('.widget-row').first();
      const firstName = firstRow.locator('.widget-name');
      const firstHref = await firstName.getAttribute('href');
      results.push({ label: 'each widget name has a lesson href', before: '', after: firstHref || '', mustContain: '#/' });
      await firstName.click();
      await page.locator('main h1').first().waitFor({ state: 'visible', timeout: 5000 });
      const landedHash = await page.evaluate(() => location.hash);
      const onLesson = landedHash.startsWith('#/') && landedHash.split('/').filter(Boolean).length >= 3;
      results.push({ label: 'clicking a widget name navigates to its lesson', before: '', after: landedHash, mustHaveContent: onLesson });

      return results;
    },
  },
];

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
    proc.stderr.on('data', () => {});
    proc.on('exit', (code) => { if (!resolved) reject(new Error(`vite preview exited with code ${code}`)); });
    setTimeout(() => { if (!resolved) reject(new Error('vite preview did not start within 15s')); }, 15000);
  });
  return proc;
}

async function main() {
  const previewProc = await startPreviewServer();
  console.log(`Preview server up on :${PORT}. Running widget smoke tests…\n`);

  const browser = await chromium.launch({ headless: !HEADED });
  const context = await browser.newContext();
  const page = await context.newPage();

  let totalPass = 0;
  let totalFail = 0;
  const failures = [];

  for (const test of TESTS) {
    process.stdout.write(`${test.name.padEnd(22)}`);
    try {
      const url = `${URL_BASE}#${test.route}`;
      await page.goto(url, { waitUntil: 'networkidle' });
      const results = await test.interact(page);

      // After every interaction batch, scan for unrendered $...$ math. The
      // page-load render check only catches initial mount; widgets that
      // regenerate readout HTML on user interaction (without re-invoking
      // KaTeX) leak literal $ characters at this stage. Skip the scroll-
      // probe test, which navigates across many pages and would re-trigger
      // the main page's render check anyway.
      if (!test.skipUnrenderedScan) {
        const stray = await page.evaluate(() => {
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
            // Context that strongly implies math: form labels and the widget
            // readout boxes. In those contexts even a bare $h$ is unrendered
            // math, not a dollar amount.
            const inMathContext = p.closest('label, [data-cn-readout], [data-osc-readout], .widget-row');
            for (const match of m) {
              const inner = match.slice(1, -1);
              if (/[\\^_{]/.test(inner) || inMathContext) out.push(match);
            }
          }
          return out;
        });
        results.push({
          label: 'no unrendered $...$ math after interaction',
          before: 'clean',
          after: stray.length ? `${stray.length} unrendered: ${stray.slice(0, 3).join(', ')}` : 'clean',
          mustContain: 'clean',
        });
      }

      let testFailed = false;
      const lines = [];
      for (const r of results) {
        let pass;
        if (r.mustContain != null) {
          pass = r.after && r.after.includes(r.mustContain);
        } else if (r.mustHaveContent) {
          pass = r.after && r.after.length > 0;
        } else {
          pass = r.before !== r.after;
        }
        if (pass) {
          totalPass++;
          lines.push(`  ✓ ${r.label}`);
        } else {
          totalFail++;
          testFailed = true;
          const preview = (s) => (s || '').replace(/\s+/g, ' ').slice(0, 60);
          lines.push(`  ✗ ${r.label}`);
          lines.push(`      before: "${preview(r.before)}…"`);
          lines.push(`      after:  "${preview(r.after)}…"`);
          if (r.mustContain) lines.push(`      mustContain: "${r.mustContain}"`);
          failures.push(`${test.name}: ${r.label}`);
        }
      }
      console.log(testFailed ? '  FAIL' : '  OK');
      for (const line of lines) console.log(line);
    } catch (err) {
      console.log('  ERROR');
      console.log(`  ${err.message}`);
      totalFail++;
      failures.push(`${test.name}: ${err.message}`);
    }
  }

  await browser.close();
  if (!process.argv.includes('--keep-server')) previewProc.kill();

  console.log(`\nResult: ${totalPass} passed, ${totalFail} failed.`);
  if (totalFail) {
    console.log('Failures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
