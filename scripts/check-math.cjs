#!/usr/bin/env node
// Audit every TeX-bearing field across all quiz.json + lesson.json files
// and report content that may not render properly. Run with:
//
//   npm run check:math
//
// Three classes of issue are reported:
//
//   [PARSE]   KaTeX rejects the source.
//   [PATTERN] Math-like syntax in a field that won't be math-rendered
//             (e.g., "\frac" inside a non-choicesTex choice, or "\sin"
//             outside any $...$ block in a hint/step/explanation).
//   [BALANCE] Inline-text field has unbalanced $ delimiters or empty $$ pair.
//
// Exit code 0 always — this is a report, not a build gate.

const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '..');
const katex = require(path.join(REPO, 'node_modules/katex'));
const ROOT = path.join(REPO, 'public/content');

const issues = [];
function report(kind, file, locator, detail) {
  issues.push({ kind, file: path.relative(ROOT, file), locator, detail });
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name === 'quiz.json' || e.name === 'lesson.json') out.push(full);
  }
  return out;
}

function tryRenderTex(tex, displayMode) {
  try {
    katex.renderToString(tex, { throwOnError: true, displayMode });
    return null;
  } catch (err) {
    return err.message.split('\n')[0].slice(0, 200);
  }
}

const SENTINEL = '';
function extractInlineMath(text) {
  const segments = [];
  const escaped = text.replace(/\\\$/g, SENTINEL);
  const blockParts = escaped.split(/(\$\$[^$]+\$\$)/);
  for (const block of blockParts) {
    if (block.length > 4 && block.startsWith('$$') && block.endsWith('$$')) {
      const tex = block.slice(2, -2).replace(new RegExp(SENTINEL, 'g'), '\\$');
      segments.push({ mode: 'display', tex, raw: block });
      continue;
    }
    const inlineParts = block.split(/(\$[^$]+\$)/);
    for (const part of inlineParts) {
      if (part.length > 1 && part.startsWith('$') && part.endsWith('$')) {
        const tex = part.slice(1, -1).replace(new RegExp(SENTINEL, 'g'), '\\$');
        segments.push({ mode: 'inline', tex, raw: part });
      }
    }
  }
  return segments;
}

const MATH_CMDS = new Set([
  'frac', 'dfrac', 'tfrac', 'sqrt', 'cdot', 'times', 'div', 'pm', 'mp',
  'le', 'ge', 'ne', 'leq', 'geq', 'neq', 'approx', 'equiv',
  'sum', 'prod', 'int', 'lim', 'infty',
  'pi', 'theta', 'alpha', 'beta', 'gamma', 'delta', 'lambda', 'mu', 'sigma', 'omega', 'phi', 'rho', 'tau',
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'log', 'ln',
  'left', 'right', 'big', 'Big',
  'rightarrow', 'Rightarrow', 'leftarrow', 'to', 'mapsto', 'Longrightarrow',
  'angle', 'triangle', 'overline', 'underline', 'vec', 'hat', 'bar',
  'mathbb', 'mathcal', 'mathrm', 'text',
]);

function checkInlineText(text, file, locator) {
  if (text == null) return;
  const str = String(text);

  const unescaped = str.replace(/\\\$/g, '');
  const dollars = (unescaped.match(/\$/g) || []).length;
  if (dollars % 2 === 1) {
    report('BALANCE', file, locator, `odd number of $ delimiters (${dollars})`);
  }
  if (/\$\$\s*\$\$/.test(str)) {
    report('BALANCE', file, locator, 'empty $$...$$ block');
  }

  for (const seg of extractInlineMath(str)) {
    checkMathForBadEscape(seg.tex, file, locator);
    const err = tryRenderTex(seg.tex, seg.mode === 'display');
    if (err) {
      report('PARSE', file, locator, `${seg.mode} math: ${err}\n     source: ${seg.raw.slice(0, 120)}`);
    }
  }

  // Math syntax outside any $...$ block.
  const stripped = str
    .replace(/\\\$/g, '')
    .replace(/\$\$[^$]+\$\$/g, '')
    .replace(/\$[^$]+\$/g, '');
  const flagged = new Set();
  for (const c of stripped.match(/\\[a-zA-Z]+/g) || []) {
    if (MATH_CMDS.has(c.slice(1))) flagged.add(c);
  }
  if (/\^\{/.test(stripped) || /_\{/.test(stripped)) flagged.add('^{ or _{');
  if (flagged.size) {
    report('PATTERN', file, locator,
      `math-like syntax outside $...$: ${[...flagged].slice(0, 5).join(', ')}`);
  }
}

// Detect control chars (tab, newline, etc.) inside math segments — these
// arise when LaTeX commands like `\theta` are written with a single backslash
// in JSON source (parses to <TAB>+"heta"). KaTeX silently produces wrong
// output rather than erroring.
function checkMathForBadEscape(tex, file, locator) {
  if (/[\t\n\b\f]/.test(tex)) {
    const visible = tex.replace(/\t/g, '\\t').replace(/\n/g, '\\n').replace(/\b/g, '\\b').replace(/\f/g, '\\f');
    report('ESCAPE', file, locator,
      `math segment contains a control char — single-backslash LaTeX command? source: ${visible.slice(0, 100)}`);
  }
}

function checkQuiz(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const qs = data.questions || [];
  qs.forEach((q, i) => {
    const id = q.id || `q${i + 1}`;
    if (q.promptTex != null) {
      checkMathForBadEscape(q.promptTex, file, `${id}.promptTex`);
      const err = tryRenderTex(q.promptTex, true);
      if (err) report('PARSE', file, `${id}.promptTex`, err);
    }
    if (q.prompt != null) checkInlineText(q.prompt, file, `${id}.prompt`);
    if (q.explanationTex != null) {
      checkMathForBadEscape(q.explanationTex, file, `${id}.explanationTex`);
      const err = tryRenderTex(q.explanationTex, true);
      if (err) report('PARSE', file, `${id}.explanationTex`, err);
    }
    if (q.explanation != null) checkInlineText(q.explanation, file, `${id}.explanation`);
    (q.hints || []).forEach((h, j) => checkInlineText(h, file, `${id}.hints[${j}]`));
    (q.steps || []).forEach((s, j) => checkInlineText(s, file, `${id}.steps[${j}]`));

    if (Array.isArray(q.choices)) {
      const tex = q.choicesTex === true;
      q.choices.forEach((c, j) => {
        if (typeof c !== 'string') return;
        if (tex) {
          checkMathForBadEscape(c, file, `${id}.choices[${j}]`);
          const err = tryRenderTex(c, false);
          if (err) report('PARSE', file, `${id}.choices[${j}]`, `${err}\n     source: ${c.slice(0, 120)}`);
        } else {
          // Non-tex choices go through renderInline (supports $...$).
          checkInlineText(c, file, `${id}.choices[${j}]`);
        }
      });
    }

    if (q.answer != null && typeof q.answer === 'string' && /\$/.test(q.answer)) {
      report('PATTERN', file, `${id}.answer`,
        `answer string contains $ — answers render as plain text: ${q.answer.slice(0, 80)}`);
    }
  });
}

function checkLesson(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const blocks = data.blocks || [];
  blocks.forEach((b, i) => {
    const loc = `blocks[${i}].${b.type}`;
    switch (b.type) {
      case 'text': {
        const lines = Array.isArray(b.md) ? b.md : (b.md != null ? [b.md] : []);
        lines.forEach((line, j) => checkInlineText(line, file, `${loc}.md[${j}]`));
        break;
      }
      case 'math':
        if (b.tex != null) {
          checkMathForBadEscape(b.tex, file, `${loc}.tex`);
          const err = tryRenderTex(b.tex, true);
          if (err) report('PARSE', file, `${loc}.tex`, `${err}\n     source: ${b.tex.slice(0, 120)}`);
        }
        break;
      case 'callout':
        if (b.body != null) checkInlineText(b.body, file, `${loc}.body`);
        break;
    }
  });
}

const files = walk(ROOT);
let quizCount = 0, lessonCount = 0;
for (const f of files) {
  try {
    if (f.endsWith('quiz.json')) { checkQuiz(f); quizCount++; }
    else if (f.endsWith('lesson.json')) { checkLesson(f); lessonCount++; }
  } catch (err) {
    report('PARSE', f, '<file>', `failed to parse JSON: ${err.message}`);
  }
}

const byKind = { PARSE: 0, PATTERN: 0, BALANCE: 0, ESCAPE: 0 };
for (const i of issues) byKind[i.kind]++;

console.log(`Scanned ${quizCount} quiz files + ${lessonCount} lesson files.`);
console.log(`Issues: ${issues.length}  (PARSE: ${byKind.PARSE}, PATTERN: ${byKind.PATTERN}, BALANCE: ${byKind.BALANCE}, ESCAPE: ${byKind.ESCAPE})\n`);

const grouped = {};
for (const i of issues) {
  const key = `${i.kind}\t${i.file}`;
  (grouped[key] = grouped[key] || []).push(i);
}
for (const k of Object.keys(grouped).sort()) {
  const [kind, file] = k.split('\t');
  console.log(`[${kind}] ${file}`);
  for (const i of grouped[k]) console.log(`  - ${i.locator}: ${i.detail}`);
  console.log();
}
