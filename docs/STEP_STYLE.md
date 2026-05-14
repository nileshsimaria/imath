# Step-by-Step Solution Style Guide

This document describes how to write the `steps[]` array on a quiz question.
A good step-by-step does more than show the answer — it teaches the student
the *thinking pattern* so they can recognize and attack the next problem of
this kind on their own.

This guide is the **single source of truth** for the rewrite pass that
converted the Calculus I quizzes (and parts of pre-algebra and algebra-1) to
the thinking-style format. Use it for any future rewrite of an existing quiz,
or when authoring a new one.

---

## 1. The pedagogical goal

> Mechanical steps teach the student to *solve THIS problem*. Thinking steps
> teach them to *recognize and solve the next problem of this type*.

A reader who follows the steps should end up knowing:

1. **What kind of problem this is.** (Pattern recognition.)
2. **What standard recipe applies.** (Procedural knowledge.)
3. **Why each step works.** (Conceptual understanding.)
4. **What tricks are available.** (Tactical knowledge.)
5. **How to verify the answer.** (Self-checking.)

If a future student could read your steps and then solve a *similar but not
identical* problem on their own, you nailed it.

---

## 2. Structural rules

### Step array length

| Problem difficulty | Step count |
| --- | --- |
| Easy (single-formula plug-in) | 2–4 |
| Medium (multi-step calculation) | 4–6 |
| Hard (multi-stage reasoning) | 5–8 |

Going longer than 8 steps usually means you're padding. Cut.

### Step composition

- Each step starts with a **bold label** (`**...**`) that summarizes the
  step's role. Examples: `**Recognize the type.**`, `**Apply the recipe.**`,
  `**Sanity check.**`.
- Bold-label lengths: 2–6 words. Concise.
- After the label, write one or two sentences explaining the move. Include
  the math inline with `$...$` (KaTeX renders inline math in step text).
- Optional: use the `{ math: "..." }` form for a step that's purely a clean
  equation display. Mix freely with `{ text: "..." }`.

### What every step array should contain

- **At least one PATTERN-NAMING step** at or near the top. Tells the student
  what category of problem this is.
- **At least one WHY step** somewhere in the middle. Explains the
  motivation behind a key move, not just the move itself.
- **A SANITY CHECK** at the bottom when feasible. Verifies the answer by an
  independent method, OR notes a confirming intuition.

---

## 3. The thinking-step move vocabulary

Use these recurring "step types" as building blocks. Each implies a specific
flavor of explanation. Lifted directly from the Calc-I gold-standard rewrite.

| Move | When to use | Example label |
| --- | --- | --- |
| **Recognize the type** | First step on any problem with a recognizable category | `**Recognize the type.** A polynomial — differentiate term-by-term.` |
| **Set up / Identify** | Translating word problems or extracting variables | `**Set up.** Let parts be $x$ and $100 - x$.` |
| **Apply the recipe / formula** | Performing the canonical procedure | `**Apply power rule.** $\dfrac{d}{dx}(x^7) = 7 x^6$.` |
| **Reduce to one variable** | For optimization or related-rates problems | `**Reduce to one variable.** From the constraint, $y = \sqrt{R^2 - x^2}$.` |
| **The trick** | Calling out a clever technique | `**Trick — square it.** $A(x)$ has a square root; squaring kills it.` |
| **Why this works** | After a step that might surprise the reader | `**Why squaring is OK.** $A \geq 0$, so $A$ and $A^2$ share critical points.` |
| **Compute / Solve** | Final algebra | `**Solve.** $x = 5\sqrt{2}$.` |
| **Verify / Sanity check** | Final step, when possible | `**Sanity check.** Symmetric answer — both sides equal. ✓` |
| **Pattern lesson** | Generalize beyond this problem | `**Pattern.** Fixed-perimeter rectangle → max area → always a square.` |

---

## 4. What NOT to do

These are concrete anti-patterns from the original (mechanical) step style.
The whole point of the rewrite is to eliminate them.

### Anti-pattern: "Approach / Solution" duplication

```
[
  { "text": "**Approach.** Differentiate, set to zero, solve." },
  { "text": "Solve $2x - 4 = 0 \to x = 2$." },
  { "text": "**Solution.** $f'(x) = 2x - 4 = 0 \to x = 2$." }
]
```

The Approach line is a vague preview and the Solution line repeats it. Both
add noise without thinking-pattern content.

**Better:**

```
[
  { "text": "**Recognize the type.** Single-variable optimization → derivative = 0." },
  { "text": "**Differentiate.** $f'(x) = 2x - 4$." },
  { "text": "**Equate to zero and solve.** $2x - 4 = 0 \\Rightarrow x = 2$." },
  { "text": "**Classify with $f''$.** $f''(2) = 2 > 0$ → min." }
]
```

### Anti-pattern: bare arithmetic with no framing

```
[
  "Differentiate: $y' = 2x - 6$.",
  "Set $y' = 0$: $x = 3$.",
  "$y(3) = 1$."
]
```

No category named. No intuition. No why. The student reads it once, follows,
forgets — then can't solve a similar problem.

**Better:**

```
[
  "**Recognize the type.** Parabola → single extremum at the vertex.",
  "**Anticipate: max or min?** $x^2$ coefficient is positive → opens UP → MIN.",
  "**Differentiate.** $y' = 2x - 6$.",
  "**Equate to zero.** $x = 3$.",
  "**Plug back to find the value.** $y(3) = 1$."
]
```

### Anti-pattern: padding with restated definitions

```
"**Step 1: subtract 2x from both sides.** This is the property of equality.
The property of equality says that if $a = b$, then $a - c = b - c$ for any
$c$. Applying $c = 2x$..."
```

Two sentences of textbook recital before doing the thing. Just do the thing.
A one-line "WHY" later is enough.

---

## 5. Worked before/after examples

### Example A: easy — direct formula

**Before:**
```json
"steps": [
  "Power rule: $\\dfrac{d}{dx}(x^n) = n x^{n-1}$.",
  "Apply: $\\dfrac{d}{dx}(x^5) = 5 x^4$.",
  "At $x = 2$: $5 \\cdot 16 = 80$."
]
```

**After:**
```json
"steps": [
  "**Power rule pattern.** $\\dfrac{d}{dx}(x^n) = n\\,x^{n-1}$ — bring down, reduce by 1.",
  "**Apply with $n = 5$.** $\\dfrac{d}{dx}(x^5) = 5\\,x^4$.",
  "**Evaluate at $x = 2$.** $5 \\cdot 16 = 80$."
]
```

The "After" version is the same length but each step starts with a named
move. The first step turns from a statement into a recognizable PATTERN.

### Example B: medium — multi-step calculation

**Before:**
```json
"steps": [
  "$f'(x) = 6x^2 + 6x - 4$.",
  "At $x = 1$: $f'(1) = 6 + 6 - 4 = 8$."
]
```

**After:**
```json
"steps": [
  "**Polynomial → linearity → differentiate term-by-term.**",
  "**Each term.** $\\dfrac{d}{dx}(2x^3) = 6x^2$. $\\dfrac{d}{dx}(3x^2) = 6x$. $\\dfrac{d}{dx}(-4x) = -4$. $\\dfrac{d}{dx}(5) = 0$.",
  "**Reassemble.** $f'(x) = 6x^2 + 6x - 4$.",
  "**Evaluate.** At $x = 1$: $6 + 6 - 4 = 8$.",
  "**Constants vanish.** The $+5$ in the original $f$ disappears in $f'$ — that's why constants don't affect derivatives."
]
```

The pattern name ("polynomial → linearity") gives the student a recognizable
template. The last "Pattern lesson" step generalizes.

### Example C: hard — multi-stage reasoning (optimization)

**Before:**
```json
"steps": [
  "Diagonal = diameter = 10.",
  "$x^2 + y^2 = 100$.",
  "Maximize $A = xy$. Square it: $A^2 = x^2 (100 - x^2)$.",
  "$(A^2)' = 200x - 4x^3 = 4x(50 - x^2) = 0$.",
  "$x^2 = 50 \\Rightarrow x = 5\\sqrt{2}$.",
  "Other side: $5\\sqrt{2}$. Area = 50."
]
```

**After:**
```json
"steps": [
  "**Set up the problem.** Every optimization has two parts: an OBJECTIVE to maximize (area) and a CONSTRAINT linking the variables (rectangle must fit in the circle). Without the constraint we'd just make $x$ and $y$ huge — finding the constraint is the FIRST move.",
  "**Translate geometry to algebra.** Diagonal of the inscribed rectangle = diameter = 10. By Pythagoras: $x^2 + y^2 = 100$. That's our constraint.",
  "**Reduce to one variable.** Calculus's 'set derivative to zero' only works on a function of ONE variable. Solve constraint: $y = \\sqrt{100 - x^2}$. Now $A(x) = x\\sqrt{100 - x^2}$.",
  "**Trick — square it.** $A(x)$ has a square root; squaring kills it. $A^2 = x^2(100 - x^2) = 100x^2 - x^4$. (Valid because $A \\geq 0$, so $A$ and $A^2$ share critical points.)",
  "**Differentiate and equate to zero.** $(A^2)' = 200x - 4x^3 = 4x(50 - x^2) = 0$. So $x = 0$ (zero-width rectangle — minimum) or $x = 5\\sqrt{2}$.",
  "**Find the other dimension.** $y = \\sqrt{100 - 50} = 5\\sqrt{2} = x$. **It's a SQUARE.** (Optimal answers are often highly symmetric — sanity check passes.)",
  "**Compute the answer.** $A = 5\\sqrt{2} \\cdot 5\\sqrt{2} = 50$."
]
```

The "After" version teaches a UNIVERSAL recipe (constraint → reduce →
differentiate → solve → verify) that the student can apply to any
optimization problem, not just this one.

---

## 6. Subject-specific recurring patterns

These are the named "moves" that appear over and over. If your subject has
one of these, use the same vocabulary as the Calc I quizzes.

### Pre-algebra
- "Same-sign / different-sign rule" (integer arithmetic)
- "Separate sign from magnitude" (signed multiplication with many factors)
- "Rewrite reciprocals/roots as powers" (so the power rule applies)
- "Group by sign" (long signed sums)
- "Parts technique" (ratio problems → find one-part value)
- "Multiplier shortcut" (markup/discount → ×0.75 instead of two-step)

### Algebra-1 / Algebra-2
- "Three standard forms of a line" (slope-intercept / point-slope / standard)
- "$y - y_1 = m(x - x_1)$ — slope as conversion factor"
- "Cross-multiply test for proportions"
- "Difference of squares / cubes for factoring"
- "Discriminant test for solution count"
- "AM-GM for symmetric optimization" (e.g., $x + b/x$ minimum)

### Calculus
- "Recognize the type" (power rule, chain, product, quotient)
- "Outer × inner" for chain rule
- "Drop higher-order smalls" (Thompson-style geometric derivations)
- "Equate to zero" for max/min
- "Reduce to one variable" then differentiate (optimization)
- "5-step universal recipe" for related rates (draw / relate / differentiate /
  fill in values / solve)
- "Riemann sum → FTC" for integration
- "L'Hôpital only for 0/0 or ∞/∞"

### Geometry
- "Pythagoras for axis-aligned distances"
- "Similar triangles → corresponding ratios"
- "Inscribed angle = half central angle"
- "Sum of interior angles = $(n-2) \\cdot 180°$"

### Statistics
- "Define the random variable explicitly"
- "Add probabilities for mutually exclusive events; multiply for independent"
- "Z-score = (value - mean) / SD"
- "LLN vs CLT" distinction

---

## 7. The contributor checklist

Before committing a rewritten quiz file, verify:

- [ ] Every existing step block in the original file was rewritten (or
      deliberately left alone with a comment in the commit message saying why).
- [ ] Each new step starts with a **bold label** describing the step's role.
- [ ] At least ONE step names the problem type or pattern.
- [ ] At least ONE step explains the WHY of a non-obvious move (the "trick" or "why this works").
- [ ] A SANITY CHECK appears as the last step where feasible.
- [ ] No "Approach … Solution" 3-step pattern remains.
- [ ] No step is a verbatim repeat of a hint or explanation.
- [ ] The `prompt`, `hints`, `explanation`, and `answer` fields are
      bit-identical to the original. Only `steps[]` should change.
- [ ] JSON parses (`node -e 'JSON.parse(require("fs").readFileSync(f, "utf8"))'`)
      and `npm run build` is clean.

---

## 8. Worked exemplars

The 5 Calculus I "Calculus Made Easy" quizzes are the gold-standard
reference. When unsure how to structure a step array, copy the style from:

- `public/content/calculus-1/derivatives-concept/growing-square/quiz.json`
- `public/content/calculus-1/applications-derivatives/equating-to-zero/quiz.json`
- `public/content/calculus-1/differentiation-rules/where-e-comes-from/quiz.json`
- `public/content/calculus-1/integration/stacking-triangles/quiz.json`
- `public/content/calculus-1/differentiation-rules/sine-derivative-and-waves/quiz.json`

For subjects beyond calculus, also see:

- Pre-algebra: `public/content/pre-algebra/ratios-proportions/proportions/quiz.json`
- Algebra-1: `public/content/algebra-1/linear-equations/point-slope-form/quiz.json`
