// /contact — a plain contact page. We show the email address and let the
// reader use whatever they prefer to send mail.

import { renderHeader } from '../components/header.js';

const EMAIL = 'nileshsimaria@gmail.com';

export function renderContact(root) {
  root.innerHTML = `
    ${renderHeader({})}
    <main>
      <article class="lesson">
        <h1>Contact</h1>
        <p class="subtitle">Feedback, questions &amp; corrections</p>
        <div class="block-text">
          <p>iMath is a work in progress, and it gets better when readers tell us what is unclear, what is missing, or what is wrong. We would genuinely love to hear from you.</p>
          <p>Please get in touch if you:</p>
          <ul>
            <li>spotted a mistake in a lesson, a proof, or a practice question,</li>
            <li>have a question about a topic,</li>
            <li>want to suggest a topic or a feature.</li>
          </ul>
        </div>
        <a class="contact-email" href="mailto:${EMAIL}">✉&nbsp;&nbsp;${EMAIL}</a>
        <div class="block-callout">
          <strong>Reporting a correction?</strong>
          Mentioning the page title, or pasting its link, helps us find and fix it fast.
        </div>
      </article>
    </main>
  `;
}
