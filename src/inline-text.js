import katex from 'katex';

// Mixed text + inline-math renderer. Used wherever a string can contain
// $...$ math segments interleaved with plain text + lightweight markdown
// (**bold**, *italic*, `code`).
//
// Bold can span math: `**before $x^2$ after**` must wrap the whole phrase.
// Strategy: pull math out into placeholder tokens, run markdown on the
// placeholder text as one continuous string, then substitute math back in.

export function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Use `\$` in lesson text to insert a literal $ (e.g., dollar amounts like
// "\\$1000" in JSON -> "\$1000" in memory -> "$1000" in output). Without
// this escape, an unbalanced bare $ accidentally opens a math span and KaTeX
// renders the whole following paragraph as garbled math.
//
// We pre-process by replacing every `\$` with a private-use sentinel char
// (U+E000) so the math-splitting regexes don't see it. After splitting, we
// restore: in plain text -> literal `$`; in math content -> `\$` (KaTeX's own
// escape for a dollar sign).
const ESC_CHAR = String.fromCharCode(0xE000);
const ESC_RE = new RegExp(ESC_CHAR, 'g');

function preEscape(s) { return s.replace(/\\\$/g, ESC_CHAR); }
function postEscapeText(s) { return s.replace(ESC_RE, '$'); }
function postEscapeMath(s) { return s.replace(ESC_RE, '\\$'); }

export function renderInline(text) {
  if (text == null) return '';
  // 1. Pull every $$display$$ and $inline$ math span into numbered placeholders
  //    so the markdown pass can run on one continuous text string.
  // 2. Apply HTML escaping + markdown (bold/italic/code). Placeholders use
  //    control chars (\x01...\x02), invisible to escapeHtml and the markdown
  //    regexes, so they survive unchanged.
  // 3. Substitute the rendered math back in.
  const escaped = preEscape(String(text));
  const mathSegments = [];
  const withPlaceholders = escaped.replace(/\$\$[^$]+\$\$|\$[^$]+\$/g, (m) => {
    const idx = mathSegments.length;
    mathSegments.push(m);
    return `\x01${idx}\x02`;
  });
  const formatted = escapeHtml(postEscapeText(withPlaceholders))
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  return formatted.replace(/\x01(\d+)\x02/g, (_, idxStr) => {
    const seg = mathSegments[Number(idxStr)];
    const isDisplay = seg.startsWith('$$');
    const inner = seg.slice(isDisplay ? 2 : 1, isDisplay ? -2 : -1);
    const tex = postEscapeMath(inner);
    try {
      return katex.renderToString(tex, { throwOnError: false, displayMode: isDisplay });
    } catch {
      return `<code>${escapeHtml(tex)}</code>`;
    }
  });
}
