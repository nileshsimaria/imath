import { renderHeader } from '../components/header.js';

export function renderNotFound(root) {
  root.innerHTML = `
    ${renderHeader({})}
    <main>
      <div class="empty-state">
        <h1>Not found</h1>
        <p>That topic doesn't exist (yet).</p>
        <p><a href="#/">← Back to home</a></p>
      </div>
    </main>
  `;
}
