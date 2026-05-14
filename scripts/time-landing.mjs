// Measures how long the course-card question counts take to appear on the
// landing page. The counts are populated asynchronously after page render;
// we wait for the "…" placeholder to be replaced.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const proc = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((r) => {
  proc.stdout.on('data', (d) => { if (d.toString().includes('Local:')) r(); });
});

const URL = 'http://localhost:4173/imath/#/';
const browser = await chromium.launch({ headless: true });
for (let trial = 1; trial <= 3; trial++) {
  // Fresh context to ensure cold HTTP cache each trial.
  const context = await browser.newContext();
  const page = await context.newPage();
  const t0 = Date.now();
  await page.goto(URL);
  await page.locator('[data-q-count]').first().waitFor({ state: 'visible' });
  // Wait until at least one count is no longer "…"
  await page.waitForFunction(() => {
    const els = document.querySelectorAll('[data-q-count]');
    return els.length > 0 && Array.from(els).every((el) => el.textContent !== '…');
  });
  const t1 = Date.now();
  console.log(`trial ${trial}: counts visible in ${t1 - t0} ms (cold cache)`);
  await context.close();
}
await browser.close();
proc.kill();
