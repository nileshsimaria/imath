// Tiny hash router. Patterns use `:name` for params.
// Routes:  '/'  '/:courseId'  '/:courseId/:topicId/:subtopicId'

function parsePattern(pattern) {
  const parts = pattern.split('/').filter(Boolean);
  return parts.map((p) => (p.startsWith(':') ? { param: p.slice(1) } : { literal: p }));
}

function matchRoute(routes, path) {
  const segments = path.split('/').filter(Boolean);
  for (const [pattern, handler] of Object.entries(routes)) {
    const parsed = parsePattern(pattern);
    if (parsed.length !== segments.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < parsed.length; i++) {
      const part = parsed[i];
      if (part.literal !== undefined) {
        if (part.literal !== segments[i]) { ok = false; break; }
      } else {
        params[part.param] = decodeURIComponent(segments[i]);
      }
    }
    if (ok) return { handler, params };
  }
  return null;
}

function parseQuery(qs) {
  const out = {};
  if (!qs) return out;
  for (const pair of qs.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const k = decodeURIComponent(eq < 0 ? pair : pair.slice(0, eq));
    const v = eq < 0 ? '' : decodeURIComponent(pair.slice(eq + 1));
    out[k] = v;
  }
  return out;
}

export function createRouter(routes, notFound) {
  function dispatch() {
    const raw = window.location.hash.replace(/^#/, '') || '/';
    const qIdx = raw.indexOf('?');
    const path = qIdx < 0 ? raw : raw.slice(0, qIdx);
    const query = parseQuery(qIdx < 0 ? '' : raw.slice(qIdx + 1));
    const match = matchRoute(routes, path);
    window.scrollTo(0, 0);
    if (match) match.handler(match.params, query);
    else notFound();
  }

  return {
    start() {
      window.addEventListener('hashchange', dispatch);
      dispatch();
    },
  };
}

export function navigate(path) {
  window.location.hash = path;
}
