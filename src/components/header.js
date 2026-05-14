// Renders the top header bar with logo, breadcrumbs, and search.

export function renderHeader({ courseTitle, courseId, topicTitle, subtopicTitle } = {}) {
  const crumbs = [];
  if (courseTitle) {
    crumbs.push(`<a href="#/${courseId}">${courseTitle}</a>`);
    if (topicTitle) crumbs.push(`<span>${topicTitle}</span>`);
    if (subtopicTitle) crumbs.push(`<span>${subtopicTitle}</span>`);
  }

  return `
    <header class="app-header">
      <div class="app-header-inner">
        <a class="logo" href="#/">
          <span class="logo-mark">∫</span>
          <span>iMath</span>
        </a>
        <nav class="app-nav" aria-label="Site sections">
          <a class="app-nav-link" href="#/widgets">Widgets</a>
          <a class="app-nav-link" href="#/blog">Blog</a>
        </nav>
        <div class="crumbs">
          ${crumbs.length ? crumbs.join('<span class="sep">/</span>') : ''}
        </div>
        <div class="search-wrapper" data-search-wrapper>
          <span class="search-icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            class="search-input"
            data-search-input
            placeholder="Search topics..."
            autocomplete="off"
            spellcheck="false"
            aria-label="Search topics"
          />
          <kbd class="search-kbd" aria-hidden="true">/</kbd>
          <div class="search-results" data-search-results hidden></div>
        </div>
      </div>
    </header>
  `;
}
