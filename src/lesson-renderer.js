import katex from 'katex';
import { mountWidget } from './widgets/registry.js';
import { renderInline, escapeHtml } from './inline-text.js';

// Convert a sequence of "| col | col |" rows into an HTML table.
// rows[0] is the header; rows[1..] are body rows. The separator
// (|---|---|) is stripped by the caller before we get here.
function renderMarkdownTable(rows) {
  const parseRow = (row) => {
    // Strip outer | and split. Empty leading/trailing slots from "|x|y|" are
    // removed; interior cells preserved (including empty ones for skipped
    // columns).
    const cells = row.split('|');
    if (cells.length && cells[0].trim() === '') cells.shift();
    if (cells.length && cells[cells.length - 1].trim() === '') cells.pop();
    return cells.map((c) => c.trim());
  };
  const headerCells = parseRow(rows[0]);
  const bodyRows = rows.slice(1).map(parseRow);
  const thead =
    '<thead><tr>' +
    headerCells.map((c) => `<th>${renderInline(c)}</th>`).join('') +
    '</tr></thead>';
  const tbody =
    '<tbody>' +
    bodyRows
      .map(
        (row) =>
          '<tr>' + row.map((c) => `<td>${renderInline(c)}</td>`).join('') + '</tr>',
      )
      .join('') +
    '</tbody>';
  return `<table class="md-table">${thead}${tbody}</table>`;
}

// Walk a list of lines, grouping them into paragraphs, headings, and tables.
// Tables look like:
//   | A | B |
//   |---|---|
//   | 1 | 2 |
// (Two or more header-then-separator lines starting with `|`.)
function renderTextLines(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    if (raw == null) { i++; continue; }
    const line = String(raw).trim();
    if (!line) { i++; continue; }

    // Heading.
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = Math.min(6, headingMatch[1].length + 1);
      out.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
      i++;
      continue;
    }

    // Table: a row starting with '|' followed by a separator row (|---|...).
    const nextLine = i + 1 < lines.length ? String(lines[i + 1] || '').trim() : '';
    if (line.startsWith('|') && /^\|\s*:?-+/.test(nextLine)) {
      const tableRows = [line];
      let j = i + 2; // skip the separator
      while (j < lines.length) {
        const r = String(lines[j] || '').trim();
        if (!r.startsWith('|')) break;
        tableRows.push(r);
        j++;
      }
      out.push(renderMarkdownTable(tableRows));
      i = j;
      continue;
    }

    // Unordered list: one or more consecutive lines starting with '- ', '* ',
    // or '+ '. Without this, a leading '-' renders as a literal hyphen, which
    // visually merges with adjacent math (e.g., '- $5^{-1}$' looks like one
    // continuous expression).
    const listMatch = line.match(/^[-*+]\s+(.+)$/);
    if (listMatch) {
      const items = [listMatch[1]];
      let j = i + 1;
      while (j < lines.length) {
        const r = String(lines[j] || '').trim();
        const m = r.match(/^[-*+]\s+(.+)$/);
        if (!m) break;
        items.push(m[1]);
        j++;
      }
      out.push(
        '<ul>' + items.map((it) => `<li>${renderInline(it)}</li>`).join('') + '</ul>',
      );
      i = j;
      continue;
    }

    out.push(`<p>${renderInline(line)}</p>`);
    i++;
  }
  return out.join('');
}

function renderTextBlock(block) {
  const lines = Array.isArray(block.md) ? block.md : [block.md];
  return `<div class="block-text">${renderTextLines(lines)}</div>`;
}

function renderMathBlock(block) {
  let html;
  try {
    html = katex.renderToString(block.tex, { throwOnError: false, displayMode: true });
  } catch {
    html = `<code>${escapeHtml(block.tex)}</code>`;
  }
  return `<div class="block-math">${html}</div>`;
}

function renderCalloutBlock(block) {
  const title = block.title ? `<strong>${renderInline(block.title)}</strong>` : '';
  const body = block.body || '';
  // If the body contains newlines, route through the line-based renderer so
  // markdown tables and paragraph breaks inside callouts work too. Otherwise
  // (single-line callout) keep the original inline-only path to avoid an
  // unnecessary <p> wrapper.
  const bodyHtml = body.includes('\n')
    ? renderTextLines(body.split('\n'))
    : renderInline(body);
  // Optional `variant` (e.g. "spotlight") adds a styling class for callouts
  // that should stand out from the ordinary ones.
  const variant = block.variant ? String(block.variant).replace(/[^a-z-]/gi, '') : '';
  const cls = variant ? `block-callout block-callout-${variant}` : 'block-callout';
  return `<div class="${cls}">${title}${bodyHtml}</div>`;
}

function renderWidgetBlock(_block, idx) {
  return `<div class="block-widget" data-widget-mount="${idx}"></div>`;
}

export function renderLesson(container, lesson) {
  const blocks = lesson.blocks || [];
  const widgetBlocks = [];

  const html = blocks
    .map((block, i) => {
      switch (block.type) {
        case 'text':    return renderTextBlock(block);
        case 'math':    return renderMathBlock(block);
        case 'callout': return renderCalloutBlock(block);
        case 'widget':
          widgetBlocks.push({ idx: i, block });
          return renderWidgetBlock(block, i);
        default:
          return `<div class="block-text"><em>Unknown block: ${escapeHtml(block.type)}</em></div>`;
      }
    })
    .join('');

  container.innerHTML = html;

  for (const { idx, block } of widgetBlocks) {
    const target = container.querySelector(`[data-widget-mount="${idx}"]`);
    if (target) mountWidget(target, block.kind, block.config || {});
  }
}
