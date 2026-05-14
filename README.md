# iMath

Visual, interactive math for middle and high school students — with derivation-first practice. Static webapp built with vanilla JavaScript + [Vite](https://vitejs.dev/), [KaTeX](https://katex.org/), and SVG.

**Live at:** https://nileshsimaria.github.io/imath/

Deploys to any static host — GitHub Pages, Netlify, Vercel, Cloudflare Pages, S3, etc.

## What's inside

**155 subtopics across 7 courses**, **2,200+ quiz questions**, and **49 interactive widget kinds**. Search across the whole curriculum from any page.

| Course | Subtopics | Questions | Topics |
|---|---|---|---|
| Pre-Algebra | 20 | 286 | Integers, Fractions, Decimals & Percents, Ratios & Proportions, Coordinate Plane |
| Algebra I | 18 | 240 | Linear Equations, Inequalities, Systems, Polynomials, Quadratics, Identities & Factoring |
| Algebra II | 25 | 393 | Quadratics, Polynomials, Rationals, Exp/Log, Sequences & Pascal's Triangle, Conics |
| Geometry | 31 | 359 | Lines & Angles, Triangles, Quadrilaterals, Circles, Area & Volume, Transformations |
| Pre-Calculus | 21 | 290 | Functions, Trigonometry, Vectors & Polar, Complex Numbers, Limits |
| Calculus I | 25 | 354 | Limits, Derivatives & Differentiation Rules, Applications, Integrals |
| Statistics & Probability | 15 | 292 | Descriptive, Counting & Combinatorics, Probability, Distributions, Inference, Sampling |

Every subtopic has:
- A guided lesson with KaTeX-rendered math, callouts, tables, headings, and embedded interactive widgets.
- A multi-question quiz (multiple-choice, numeric, free-response) with progressive hints, written explanations, and an opt-in **step-by-step solution** on every question.
- Difficulty labels (easy / medium / hard) so students can filter the practice that's right for them.

### Pedagogy: derive, don't memorize

The step-by-step solutions don't just *state* identities — they derive them from first principles. Example: instead of "use $(x + 1/x)^2 = x^2 + 2 + 1/x^2$ as a formula", the solution expands the product, shows where the $+2$ comes from (the two cross terms $x \cdot 1/x$), and only then applies it. The aim is that students understand *why* a trick works, so they can re-derive it later.

This means many of the algebra and calculus quizzes — especially in `identities-factoring`, `polynomials-deep`, `sum-product-roots`, and `differentiation-rules` — read like compact, friendly olympiad coaching rather than rote drill.

## Features

- **Mixed practice** — every course, topic, and subtopic has a `/practice` route that shuffles all its questions into a single quiz. Filter by difficulty. A left-side question navigator shows every question as a tile (with difficulty tint and answered status), so students can pick and choose.
- **Deep links** — append `?q=N` to any lesson URL to open its quiz at question N (1-indexed). Useful for sharing a specific problem.
- **Step-by-step solutions** — toggle a derivation walkthrough on any question. Each step renders inline math, optional KaTeX-display equations, SVG diagrams, and even nested mini-widgets.
- **Search** — header search bar matches title, course/topic, and optional keyword tags. Press `/` from anywhere to focus it.
- **Progress tracking** — viewed lessons and best quiz scores saved in `localStorage`.
- **Widgets index** — `/widgets` lists every interactive widget with a thumbnail and a jump-to-lesson link.
- **Mobile responsive** — sliders and widgets work on touch; the practice page sidebar collapses above the quiz on narrow viewports.

## Quick start

```bash
npm install
npm run dev      # dev server (http://localhost:5173)
npm run build    # produces ./dist for deployment
npm run preview  # preview the production build at :4173
make check       # full test suite (render + interactive widget smoke tests)
```

## Project layout

```
imath/
├── index.html                          # Vite entry
├── vite.config.js                      # base path = /imath/ for GitHub Pages
├── public/
│   ├── favicon.svg
│   └── content/                        # all lessons & quizzes (plain JSON — no code)
│       ├── manifest.json               # course → topic → subtopic catalog
│       ├── stats.json                  # generated question counts (see make build)
│       ├── pre-algebra/                # 7 courses
│       ├── algebra-1/
│       ├── algebra-2/
│       ├── geometry/
│       ├── pre-calculus/
│       ├── calculus-1/
│       └── statistics/
└── src/
    ├── main.js                         # entry: boots router + search
    ├── router.js                       # tiny hash router with ?q=N query parsing
    ├── catalog.js                      # manifest + lesson/quiz loaders
    ├── progress.js                     # localStorage progress tracking
    ├── search.js                       # search index + DOM wiring
    ├── inline-text.js                  # mixed text + inline-math renderer
    ├── lesson-renderer.js              # renders lesson JSON blocks
    ├── quiz-engine.js                  # quiz UI: prompt, hints, steps, nav sidebar
    ├── widgets-catalog.js              # widget metadata for the /widgets index
    ├── styles.css                      # all CSS
    ├── components/
    │   └── header.js                   # logo, breadcrumbs, search input
    ├── pages/
    │   ├── landing.js
    │   ├── course.js
    │   ├── course-practice.js          # mixed practice with question-nav sidebar
    │   ├── lesson.js
    │   ├── widgets.js                  # /widgets index page
    │   └── not-found.js
    └── widgets/
        ├── registry.js                 # widget kind → mount fn (49 kinds registered)
        └── *.js                        # one file per widget kind
```

Curriculum lives entirely in `public/content/` — adding subtopics doesn't require touching JavaScript unless you also need a new widget kind.

## Adding a new subtopic (no code)

1. **Create the folder:**
   `public/content/<courseId>/<topicId>/<subtopicId>/`

2. **Write `lesson.json`:**
   ```json
   {
     "title": "Adding Fractions",
     "blocks": [
       { "type": "text", "md": [
         "### Section heading",
         "Some intro paragraph with $inline$ math.",
         "**Bold**, *italic*, `code` all work. Markdown **tables** work too:",
         "| Col A | Col B |",
         "|---|---|",
         "| row1 | row2 |"
       ]},
       { "type": "math", "tex": "\\frac{1}{2} + \\frac{1}{3} = \\frac{5}{6}" },
       { "type": "callout", "title": "Tip", "body": "Find a common denominator first." },
       { "type": "widget", "kind": "fraction-bars", "config": { "n1": 1, "d1": 2, "n2": 1, "d2": 3 } }
     ]
   }
   ```

   **Block types:** `text`, `math`, `callout`, `widget`. See `src/lesson-renderer.js` for the full schema.

3. **Write `quiz.json` (optional but recommended):**
   ```json
   {
     "questions": [
       {
         "id": "q1",
         "type": "multiple-choice",
         "promptTex": "\\text{What is } \\dfrac{1}{2} + \\dfrac{1}{3}?",
         "choices": ["$\\dfrac{1}{5}$", "$\\dfrac{5}{6}$", "$\\dfrac{2}{5}$"],
         "answerIndex": 1,
         "hints": ["Find a common denominator.", "LCD of 2 and 3 is 6."],
         "explanation": "$\\dfrac{3}{6} + \\dfrac{2}{6} = \\dfrac{5}{6}$.",
         "steps": [
           "**Find the LCD.** Multiply $2 \\cdot 3 = 6$ since they share no common factor.",
           "**Rewrite both fractions.** $\\dfrac{1}{2} = \\dfrac{3}{6}$, $\\dfrac{1}{3} = \\dfrac{2}{6}$.",
           "**Add.** $\\dfrac{3 + 2}{6} = \\dfrac{5}{6}$."
         ],
         "difficulty": "easy"
       }
     ]
   }
   ```

   **Question types:** `multiple-choice`, `numeric`, `free-response`.

   **Important fields:**
   - `prompt` (plain) or `promptTex` (KaTeX display math).
   - `hints: string[]` — revealed one at a time.
   - `explanation` (short answer-time blurb) or `explanationTex`.
   - `steps: string[] | StepObject[]` — derivation walkthrough. Each step is either a plain string (supports `**bold**`, `$inline math$`, `$$display math$$`) or an object `{ text?, math?, svg?, widget? }`.
   - `difficulty: "easy" | "medium" | "hard"` — drives badge color and mixed-practice filtering.

   **MC-specific:** `choices: string[]` (use `$...$` inline math; no `choicesTex` flag needed for mixed content) and `answerIndex: number`.

   **Numeric-specific:** `answer: number`, `tolerance: number` (default 0).

   See `STEP_STYLE.md` for the derivation-first writing pattern used across the curriculum.

4. **Register it in `public/content/manifest.json`:**
   ```json
   {
     "id": "adding-fractions",
     "title": "Adding Fractions",
     "path": "pre-algebra/fractions/adding-fractions",
     "keywords": ["common denominator", "LCD", "1/2 + 1/3"]
   }
   ```

   `keywords` powers cross-course search — a student typing "common denominator" or "LCD" will surface this lesson.

5. **Reload the dev server** — your subtopic is live.

## Available widgets

49 registered widget kinds — see the full catalog at `/widgets` on the live site or in `src/widgets-catalog.js`. Highlights:

| Category | Widgets |
|---|---|
| **Coordinate / graphing** | coordinate-plane, parabola, polynomial-graph, exp-graph, trig-graph, polar-point, parametric-equation |
| **Number / arithmetic** | number-line, fraction-bars, fraction-area, percent-grid, factor-tree, modular-clock, balance-scale |
| **Geometry** | angle, polygon, pythagorean, right-triangle, triangle-explorer, triangle-incircle, triangle-centers, iso-triangle, circle, circle-theorems, transformation, conic-section |
| **Trigonometry** | unit-circle, trig-graph, trig-equation, ferris-wheel |
| **Calculus** | derivative-explorer, riemann-sum, time-derivatives, growing-square, osculating-circle, shm, speedo-odo, trail-function |
| **Sequences / patterns** | sequence, pascals-triangle, fibonacci-spiral, fractal-explorer |
| **Statistics** | probability-sim, normal-distribution, galton-board, dataset-summary, histogram |
| **Algebra structure** | function-mapping, polynomial-area, vector-add |

**Adding a new widget kind:** drop a module in `src/widgets/` exporting a `mount(target, config)` function, register it in `src/widgets/registry.js`, and add metadata to `src/widgets-catalog.js` so the index page picks it up.

## Testing

```bash
make check
```

Runs the full suite:
- `check-math` — every quiz answer and `$math$` snippet must be parseable.
- `check-render` — every lesson page must render without leaking literal `$...$` markers.
- `scroll-check` — pages open at the top, not below the fold.
- `check-widgets` — Playwright drives 49 widgets, the quiz engine, the deep-link feature, the mixed-practice navigator, and the bold-across-math renderer. **54+ assertions**, headless Chromium.

CI runs the same checks on every push.

## Deploying

### GitHub Pages
Push to `main`. The included `.github/workflows/deploy.yml` builds and deploys to `https://<user>.github.io/imath/`.

One-time setup in repo settings: **Settings → Pages → Source: GitHub Actions**.

### Anywhere else
```bash
npm run build
# upload ./dist to your static host
```
For hosting at the domain root (not a `/imath/` sub-path):
```bash
VITE_BASE=/ npm run build
```
