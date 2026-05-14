// Display metadata for each registered widget kind, keyed by the same string
// used in lesson.json `kind` fields and the widget registry. The
// `name` is shown in the /widgets index; the `description` is a single
// short sentence (under ~14 words) summarizing what the widget does.
//
// If a widget is missing from this map, the /widgets page falls back to
// title-casing the kind. Add new entries here when you register a widget.

export const WIDGET_META = {
  'angle': {
    name: 'Angle',
    description: 'Drag an angle to read degrees, radians, and reference quadrant.',
  },
  'balance-scale': {
    name: 'Balance scale',
    description: 'See an equation as a balanced scale; apply operations to both sides at once.',
  },
  'circle': {
    name: 'Circle',
    description: 'Sliders for radius and sector angle; live circumference, area, and arc length.',
  },
  'circle-theorems': {
    name: 'Circle theorems',
    description: 'Move points on a circle to explore inscribed angle, tangent, and power-of-a-point.',
  },
  'conic-section': {
    name: 'Conic sections',
    description: 'Tabs for circle, ellipse, parabola, and hyperbola; live equation and graph.',
  },
  'dataset-summary': {
    name: 'Dataset summary',
    description: 'Dot plot with mean / median / mode overlay; live full stats panel. Pick distribution shape from the dropdown.',
  },
  'histogram': {
    name: 'Histogram',
    description: 'Configurable bins on a raw dataset; modal class highlighted; mean from class marks shown.',
  },
  'coordinate-plane': {
    name: 'Coordinate plane',
    description: 'Drag points or slide parameters; see lines in slope-intercept, point-slope, and standard form.',
  },
  'derivative-explorer': {
    name: 'Derivative explorer',
    description: 'Move a point on f(x); the tangent line shows the slope = f′(x).',
  },
  'exp-graph': {
    name: 'Exponential & log grapher',
    description: 'Plot y = aˣ and y = log_b(x); explore base, growth, asymptotes.',
  },
  'factor-tree': {
    name: 'Factor tree',
    description: 'Pick a number; watch its prime factorization tree build up. Compare multiple trees for GCD/LCM.',
  },
  'ferris-wheel': {
    name: 'Ferris wheel',
    description: 'A wheel turns; the rider’s height vs. time traces a sine wave in real time.',
  },
  'fibonacci-spiral': {
    name: 'Fibonacci spiral',
    description: 'Stack squares of Fibonacci sizes; the quarter-circle arcs become the golden spiral.',
  },
  'fractal-explorer': {
    name: 'Fractal explorer',
    description: 'Iterate Koch snowflake, Sierpiński triangle, and other self-similar shapes.',
  },
  'fraction-area': {
    name: 'Fraction area',
    description: 'Visualize fractions as shaded area in rectangles or circles.',
  },
  'fraction-bars': {
    name: 'Fraction bars',
    description: 'Compare fractions side by side as horizontal bars.',
  },
  'function-mapping': {
    name: 'Function mapping',
    description: 'Show domain → range arrows; test injective, surjective, and bijective by eye.',
  },
  'galton-board': {
    name: 'Galton board',
    description: 'Drop marbles through pegs; histogram converges to the normal (bell) curve — CLT in action.',
  },
  'growing-square': {
    name: 'Growing square',
    description: 'Grow a square by dx and watch d(x²)/dx = 2x fall out geometrically (Calculus Made Easy, Ch 4).',
  },
  'iso-triangle': {
    name: 'Isosceles triangle',
    description: 'Drag the apex; see the base angles stay equal, plus altitude and bisector overlays.',
  },
  'modular-clock': {
    name: 'Modular clock',
    description: 'A clock face for arithmetic mod N — add, multiply, walk around the dial.',
  },
  'normal-distribution': {
    name: 'Normal distribution',
    description: 'Adjust μ and σ; shade a region; read off the probability (area under the curve).',
  },
  'number-line': {
    name: 'Number line',
    description: 'Add, subtract, or compare integers visually on a number line.',
  },
  'osculating-circle': {
    name: 'Osculating circle',
    description: 'Drag a point along a curve; the best-fit kissing circle resizes — its radius = curvature⁻¹ (Calculus Made Easy, Ch 12).',
  },
  'parabola': {
    name: 'Parabola',
    description: 'Sliders for a, b, c (or vertex form); live vertex, roots, axis of symmetry.',
  },
  'parametric-equation': {
    name: 'Parametric curves',
    description: 'Plot (x(t), y(t)) — circles, Lissajous figures, cycloids.',
  },
  'pascals-triangle': {
    name: 'Pascal’s triangle',
    description: 'Hover any cell to see binomial-coefficient values, row sums, and hidden patterns.',
  },
  'percent-grid': {
    name: 'Percent grid',
    description: 'A 10 × 10 grid; shade cells to see percent as parts-per-hundred.',
  },
  'polar-point': {
    name: 'Polar point',
    description: 'Drag a point; toggle between Cartesian and polar coordinates.',
  },
  'polygon': {
    name: 'Polygon',
    description: 'Pick a side count; read interior angles, exterior angles, and total.',
  },
  'polynomial-area': {
    name: 'Polynomial area',
    description: 'Visualize (a + b)² and related identities as rectangular dissections.',
  },
  'polynomial-graph': {
    name: 'Polynomial graph',
    description: 'Plot a polynomial; show roots, derivative critical points, and end behavior.',
  },
  'probability-sim': {
    name: 'Probability sim',
    description: 'Roll dice or flip coins many times; watch frequency converge to theoretical probability.',
  },
  'pythagorean': {
    name: 'Pythagorean',
    description: 'A right triangle with squares on each side; the area of the largest square equals the other two combined.',
  },
  'riemann-sum': {
    name: 'Riemann sum',
    description: 'Approximate ∫f(x)dx with left, right, or midpoint rectangles; slide n to watch the error shrink.',
  },
  'right-triangle': {
    name: 'Right triangle',
    description: 'Adjust the angle; read sin, cos, tan from the side ratios.',
  },
  'sequence': {
    name: 'Sequence',
    description: 'Arithmetic, geometric, Fibonacci, and recursive sequences; plot terms or partial sums.',
  },
  'shm': {
    name: 'Simple harmonic motion',
    description: 'Animated mass on a spring with position, velocity, acceleration curves — shows y″ = −ω²y.',
  },
  'speedo-odo': {
    name: 'Speedometer + odometer',
    description: 'Drive a car along a velocity profile; speedometer + odometer demonstrate the FTC in real time.',
  },
  'time-derivatives': {
    name: 'Time derivatives',
    description: 'Position, velocity, acceleration as three stacked plots with a shared time cursor (Calculus Made Easy, Ch 8).',
  },
  'trail-function': {
    name: 'Trail function',
    description: 'A hiker walks a trail; trail height vs. distance is the function — drag the probe to read values.',
  },
  'transformation': {
    name: 'Transformation',
    description: 'Translate, rotate, reflect, or scale a shape; pre-image and image side by side.',
  },
  'triangle-centers': {
    name: 'Triangle centers',
    description: 'Drag the vertices; toggle centroid, circumcenter, orthocenter, incenter, and the Euler line.',
  },
  'triangle-explorer': {
    name: 'Triangle explorer',
    description: 'Drag vertices; live side lengths, angles, area, perimeter, and triangle classification.',
  },
  'triangle-incircle': {
    name: 'Triangle incircle',
    description: 'Construct the incircle from the angle bisectors; animate the bisectors growing.',
  },
  'trig-equation': {
    name: 'Trig equation',
    description: 'Solve sin/cos/tan equations visually; see every solution as a horizontal-line intersection.',
  },
  'trig-graph': {
    name: 'Trig graph',
    description: 'Plot sin, cos, tan with amplitude, period, phase shift, and vertical shift sliders.',
  },
  'unit-circle': {
    name: 'Unit circle',
    description: 'Drag the angle; read sin θ, cos θ, tan θ from the rotating point on the unit circle.',
  },
  'vector-add': {
    name: 'Vector addition',
    description: 'Drag two vectors; see the head-to-tail sum and the parallelogram rule.',
  },
};

// Pretty-print a widget kind that's missing from the metadata above.
export function widgetDisplayName(kind) {
  if (WIDGET_META[kind]) return WIDGET_META[kind].name;
  return kind.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function widgetDescription(kind) {
  return (WIDGET_META[kind] && WIDGET_META[kind].description) || '';
}
