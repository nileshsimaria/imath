import katex from 'katex';
import { recordQuizScore } from './progress.js';
import { renderInline } from './inline-text.js';
import { mountWidget } from './widgets/registry.js';

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function tex(s, display = false) {
  try {
    return katex.renderToString(s, { throwOnError: false, displayMode: display });
  } catch {
    return s;
  }
}

function renderPrompt(q) {
  const main = q.promptTex
    ? tex(q.promptTex, true)
    : `<div>${renderInline(q.prompt || '')}</div>`;
  const svg = q.promptSvg ? `<div class="quiz-prompt-svg">${q.promptSvg}</div>` : '';
  return main + svg;
}

function checkNumeric(q, raw) {
  const v = parseFloat(raw);
  if (Number.isNaN(v)) return { ok: false, parsed: null };
  const tol = q.tolerance ?? 0;
  return { ok: Math.abs(v - q.answer) <= tol, parsed: v };
}

function checkExact(q, raw) {
  const norm = (s) => String(s).trim().toLowerCase().replace(/\s+/g, '');
  const expected = Array.isArray(q.answer) ? q.answer : [q.answer];
  return { ok: expected.some((a) => norm(a) === norm(raw)), parsed: raw };
}

function renderStepBody(s, widgetQueue) {
  if (s == null) return '';
  if (typeof s === 'string') return renderInline(s);
  let html = '';
  if (s.text) html += `<div>${renderInline(s.text)}</div>`;
  if (s.math) html += `<div class="quiz-step-math">${tex(s.math, true)}</div>`;
  if (s.svg) html += `<div class="quiz-step-svg">${s.svg}</div>`;
  if (s.widget) {
    const idx = widgetQueue.length;
    widgetQueue.push(s.widget);
    html += `<div class="quiz-step-widget" data-mount-idx="${idx}"></div>`;
  }
  return html;
}

function attachStepsButton(controls, stepsBox, q) {
  if (!q.steps?.length) return;
  let stepsShown = false;
  const btn = document.createElement('button');
  btn.className = 'btn quiz-steps-btn';
  btn.type = 'button';
  btn.textContent = 'Show step-by-step solution';
  btn.addEventListener('click', () => {
    if (stepsShown) {
      stepsBox.innerHTML = '';
      stepsShown = false;
      btn.textContent = 'Show step-by-step solution';
      return;
    }
    const widgetQueue = [];
    const stepsHtml = q.steps
      .map(
        (s, i) =>
          `<li><span class="quiz-step-num">${i + 1}</span><div class="quiz-step-body">${renderStepBody(s, widgetQueue)}</div></li>`,
      )
      .join('');
    stepsBox.innerHTML = `
      <div class="quiz-steps">
        <h4>Step-by-step solution</h4>
        <ol>${stepsHtml}</ol>
      </div>`;
    widgetQueue.forEach((w, idx) => {
      const el = stepsBox.querySelector(`[data-mount-idx="${idx}"]`);
      if (el && w.kind) mountWidget(el, w.kind, w.config || {});
    });
    stepsShown = true;
    btn.textContent = 'Hide step-by-step solution';
  });
  controls.appendChild(btn);
}

export function mountQuiz(container, quiz, progressKey, options = {}) {
  const questions = quiz.questions || [];
  const startIndex =
    Number.isFinite(options.startIndex) &&
    options.startIndex >= 0 &&
    options.startIndex < questions.length
      ? options.startIndex
      : 0;
  const showQuestionList = !!options.showQuestionList && questions.length > 1;
  const state = {
    index: startIndex,
    correct: 0,
    skipped: 0,
    hintsUsed: 0,
    answered: new Array(questions.length).fill(null),
  };

  // Layout: with sidebar nav, container holds an aside + content div.
  // Without nav, container itself is the content area.
  let contentEl;
  let navEl = null;
  if (showQuestionList) {
    container.classList.add('quiz-with-nav');
    container.innerHTML = `
      <aside class="quiz-nav" data-quiz-nav></aside>
      <div class="quiz-content" data-quiz-content></div>
    `;
    contentEl = container.querySelector('[data-quiz-content]');
    navEl = container.querySelector('[data-quiz-nav]');
  } else {
    contentEl = container;
  }

  if (startIndex > 0) {
    requestAnimationFrame(() => container.scrollIntoView({ behavior: 'auto', block: 'start' }));
  }

  function renderNav() {
    if (!navEl) return;
    const items = questions
      .map((q, i) => {
        const status = state.answered[i];
        const diff = q.difficulty || 'easy';
        const classes = ['quiz-nav-item', `diff-${diff}`];
        if (i === state.index) classes.push('current');
        if (status === true) classes.push('correct');
        else if (status === false) classes.push('incorrect');
        else if (status === 'skipped') classes.push('skipped');
        const icon = status === true ? '✓' : status === false ? '✗' : status === 'skipped' ? '–' : '';
        return `<button class="${classes.join(' ')}" data-nav-idx="${i}" title="Question ${i + 1}${q.difficulty ? ' · ' + q.difficulty : ''}"><span class="quiz-nav-num">${i + 1}</span>${icon ? `<span class="quiz-nav-status">${icon}</span>` : ''}</button>`;
      })
      .join('');
    const answered = state.answered.filter((a) => a !== null && a !== 'skipped').length;
    navEl.innerHTML = `
      <div class="quiz-nav-header">
        <span>Questions</span>
        <span class="quiz-nav-count">${answered}/${questions.length}</span>
      </div>
      <div class="quiz-nav-legend">
        <span><i class="quiz-nav-swatch diff-easy"></i>Easy</span>
        <span><i class="quiz-nav-swatch diff-medium"></i>Med</span>
        <span><i class="quiz-nav-swatch diff-hard"></i>Hard</span>
      </div>
      <div class="quiz-nav-list">${items}</div>
    `;
    navEl.querySelectorAll('[data-nav-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.navIdx);
        if (idx === state.index) return;
        state.index = idx;
        renderQuestion();
      });
    });
  }

  function renderReviewMode(q, prevAnswer) {
    const total = questions.length;
    const diffBadge = q.difficulty
      ? `<span class="diff-badge diff-badge-${q.difficulty}">${q.difficulty}</span>`
      : '';
    const promptHtml = renderPrompt(q);

    let statusLabel, statusClass;
    if (prevAnswer === true) { statusLabel = 'You answered this correctly'; statusClass = 'correct'; }
    else if (prevAnswer === false) { statusLabel = 'You answered this incorrectly'; statusClass = 'incorrect'; }
    else { statusLabel = 'You skipped this question'; statusClass = 'incorrect'; }

    const correctAns =
      q.type === 'multiple-choice'
        ? (q.choicesTex ? tex(q.choices[q.answerIndex]) : renderInline(q.choices[q.answerIndex]))
        : renderInline(String(Array.isArray(q.answer) ? q.answer[0] : q.answer));
    const explanationHtml = q.explanation
      ? (q.explanationTex ? tex(q.explanationTex, true) : renderInline(q.explanation))
      : '';

    contentEl.innerHTML = `
      <div class="quiz-header">
        <h2>Quick check</h2>
        <span class="quiz-progress">Question ${state.index + 1} of ${total}${diffBadge ? ' · ' + diffBadge : ''}</span>
      </div>
      <div class="quiz-prompt">${promptHtml}</div>
      <div class="quiz-feedback ${statusClass}">
        <h4>${statusLabel}</h4>
        <div style="margin-top:6px"><em>Correct answer:</em> ${correctAns}</div>
        ${explanationHtml ? `<div style="margin-top:6px">${explanationHtml}</div>` : ''}
      </div>
      <div class="quiz-controls" data-controls></div>
      <div data-steps></div>
    `;
    const controls = contentEl.querySelector('[data-controls]');
    const stepsBox = contentEl.querySelector('[data-steps]');
    attachStepsButton(controls, stepsBox, q);

    // Find next unanswered (after current, then wrap)
    let nextIdx = -1;
    for (let i = state.index + 1; i < questions.length; i++) {
      if (state.answered[i] === null) { nextIdx = i; break; }
    }
    if (nextIdx === -1) {
      for (let i = 0; i < state.index; i++) {
        if (state.answered[i] === null) { nextIdx = i; break; }
      }
    }
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-primary';
    if (nextIdx === -1) {
      nextBtn.textContent = 'See results';
      nextBtn.addEventListener('click', () => renderSummary());
    } else {
      nextBtn.textContent = 'Next unanswered →';
      nextBtn.addEventListener('click', () => {
        state.index = nextIdx;
        renderQuestion();
      });
    }
    controls.appendChild(nextBtn);

    renderNav();
  }

  function renderSummary() {
    const total = questions.length;
    // Score is over questions actually attempted (skipped don't count against you).
    const attempted = total - state.skipped;
    const score = attempted ? state.correct / attempted : 0;
    recordQuizScore(progressKey, score, state.correct, attempted);
    const pct = Math.round(score * 100);
    const skippedNote = state.skipped > 0
      ? `<p class="quiz-skipped-note">${state.skipped} skipped</p>`
      : '';
    const blurb = attempted === 0
      ? 'You skipped every question — no score recorded.'
      : pct >= 80 ? 'Great work!'
      : pct >= 50 ? 'Solid effort. Review the hints and try again.'
      : 'Take another pass through the lesson, then retry.';
    contentEl.innerHTML = `
      <div class="quiz-summary">
        <h3>Quiz complete</h3>
        <div class="score">${state.correct} / ${attempted}</div>
        <p>${attempted ? `${pct}% — ` : ''}${blurb}</p>
        ${skippedNote}
        <button class="btn btn-primary" data-action="retry">Try again</button>
      </div>
    `;
    contentEl.querySelector('[data-action="retry"]').addEventListener('click', () => {
      state.index = 0;
      state.correct = 0;
      state.skipped = 0;
      state.hintsUsed = 0;
      state.answered = new Array(questions.length).fill(null);
      renderQuestion();
    });
    renderNav();
  }

  function renderQuestion() {
    const q = questions[state.index];
    if (!q) return renderSummary();

    // If this question was already answered or skipped, show the review view.
    if (state.answered[state.index] !== null) {
      return renderReviewMode(q, state.answered[state.index]);
    }

    const promptHtml = renderPrompt(q);
    const total = questions.length;
    let inputHtml = '';

    if (q.type === 'multiple-choice') {
      inputHtml = `<div class="quiz-choices">${q.choices
        .map(
          (c, i) =>
            `<button class="quiz-choice" data-choice="${i}">
               <span class="marker">${String.fromCharCode(65 + i)}</span>
               <span>${q.choicesTex ? tex(c) : renderInline(c)}</span>
             </button>`,
        )
        .join('')}</div>`;
    } else if (q.type === 'numeric') {
      inputHtml = `
        <input type="text" inputmode="decimal" class="quiz-input" placeholder="Enter a number" autocomplete="off" />
        <div class="quiz-controls"><button class="btn btn-primary" data-action="submit">Check</button></div>`;
    } else {
      // free-response (string match)
      inputHtml = `
        <input type="text" class="quiz-input" placeholder="Type your answer" autocomplete="off" />
        <div class="quiz-controls"><button class="btn btn-primary" data-action="submit">Check</button></div>`;
    }

    const diffBadge = q.difficulty
      ? `<span class="diff-badge diff-badge-${q.difficulty}">${q.difficulty}</span>`
      : '';
    contentEl.innerHTML = `
      <div class="quiz-header">
        <h2>Quick check</h2>
        <span class="quiz-progress">Question ${state.index + 1} of ${total}${diffBadge ? ' · ' + diffBadge : ''}</span>
      </div>
      <div class="quiz-prompt">${promptHtml}</div>
      ${inputHtml}
      <div class="quiz-controls" data-controls></div>
      <div data-feedback></div>
      <div data-hints></div>
      <div data-steps></div>
    `;

    const controls = contentEl.querySelector('[data-controls]');
    const feedback = contentEl.querySelector('[data-feedback]');
    const hintsBox = contentEl.querySelector('[data-hints]');
    const stepsBox = contentEl.querySelector('[data-steps]');

    let revealedHints = 0;
    let answered = false;
    let topicHintShown = false;

    function showTopicHintButton() {
      if (!q.topicHint) return;
      const btn = document.createElement('button');
      btn.className = 'btn quiz-topic-btn';
      btn.type = 'button';
      btn.textContent = 'Reveal topic';
      btn.addEventListener('click', () => {
        if (topicHintShown) return;
        topicHintShown = true;
        const div = document.createElement('div');
        div.className = 'quiz-topic-hint';
        const { title, href } = q.topicHint;
        div.innerHTML = `<strong>From</strong>${
          href
            ? `<a href="${href}" target="_blank" rel="noopener">${escapeAttr(title)}</a>`
            : escapeAttr(title)
        }`;
        hintsBox.prepend(div);
        btn.remove();
      });
      controls.appendChild(btn);
    }

    function showSkipButton() {
      const isLast = state.index === questions.length - 1;
      const btn = document.createElement('button');
      btn.className = 'btn quiz-skip-btn';
      btn.type = 'button';
      btn.textContent = isLast ? 'Skip → see results' : 'Skip →';
      btn.title = 'Skip this question without answering';
      btn.addEventListener('click', () => {
        if (answered) return;
        state.skipped++;
        state.answered[state.index] = 'skipped';
        state.index++;
        renderQuestion();
      });
      controls.appendChild(btn);
    }

    function showStepsButton() {
      attachStepsButton(controls, stepsBox, q);
    }

    function showHintButton() {
      if (!q.hints?.length) return;
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = revealedHints === 0 ? 'Show hint' : 'Show next hint';
      btn.addEventListener('click', () => {
        if (revealedHints >= q.hints.length) return;
        const div = document.createElement('div');
        div.className = 'quiz-hint';
        div.innerHTML = `<strong>Hint ${revealedHints + 1}</strong>${renderInline(q.hints[revealedHints])}`;
        hintsBox.appendChild(div);
        revealedHints++;
        state.hintsUsed++;
        if (revealedHints >= q.hints.length) btn.remove();
        else btn.textContent = 'Show next hint';
      });
      controls.appendChild(btn);
    }

    function showFeedback(ok, message) {
      feedback.innerHTML = `
        <div class="quiz-feedback ${ok ? 'correct' : 'incorrect'}">
          <h4>${ok ? 'Correct' : 'Not quite'}</h4>
          <div>${message || ''}</div>
        </div>`;
    }

    function nextButton() {
      const next = document.createElement('button');
      next.className = 'btn btn-primary';
      const isLast = state.index === questions.length - 1;
      next.textContent = isLast ? 'See results' : 'Next question';
      next.addEventListener('click', () => {
        state.index++;
        renderQuestion();
      });
      controls.innerHTML = '';
      controls.appendChild(next);
    }

    function commit(ok) {
      answered = true;
      if (ok) state.correct++;
      state.answered[state.index] = ok;
      const explanation = q.explanation
        ? (q.explanationTex ? tex(q.explanationTex, true) : renderInline(q.explanation))
        : '';
      const correctAnsHtml =
        !ok && q.type === 'multiple-choice'
          ? `<div style="margin-top:6px"><em>Correct answer:</em> ${
              q.choicesTex ? tex(q.choices[q.answerIndex]) : renderInline(q.choices[q.answerIndex])
            }</div>`
          : !ok
          ? `<div style="margin-top:6px"><em>Correct answer:</em> ${
              Array.isArray(q.answer) ? q.answer[0] : q.answer
            }</div>`
          : '';
      showFeedback(ok, explanation + correctAnsHtml);
      nextButton();
      renderNav();
    }

    if (q.type === 'multiple-choice') {
      const choiceEls = contentEl.querySelectorAll('.quiz-choice');
      choiceEls.forEach((el) => {
        el.addEventListener('click', () => {
          if (answered) return;
          const i = Number(el.dataset.choice);
          const ok = i === q.answerIndex;
          choiceEls.forEach((c) => (c.disabled = true));
          el.classList.add(ok ? 'correct' : 'incorrect');
          if (!ok) choiceEls[q.answerIndex]?.classList.add('correct');
          commit(ok);
        });
      });
      showTopicHintButton();
      showHintButton();
      showStepsButton();
      showSkipButton();
    } else {
      const input = contentEl.querySelector('.quiz-input');
      const submit = contentEl.querySelector('[data-action="submit"]');
      const handleSubmit = () => {
        if (answered) return;
        const raw = input.value;
        if (!raw.trim()) return;
        const result = q.type === 'numeric' ? checkNumeric(q, raw) : checkExact(q, raw);
        input.disabled = true;
        commit(result.ok);
      };
      submit.addEventListener('click', handleSubmit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSubmit();
      });
      showTopicHintButton();
      showHintButton();
      showStepsButton();
      showSkipButton();
      // preventScroll keeps the page anchored at the lesson on initial render.
      // Without it, focusing an input below the fold scrolls the user past
      // the lesson straight to the quiz. The user still gets keyboard focus
      // for typing answers — just no surprise scroll.
      input.focus({ preventScroll: true });
    }

    renderNav();
  }

  renderQuestion();
}
