// Pluggable widget registry. Add a new widget by registering a mount function here.

import katex from 'katex';

import { mountCoordinatePlane } from './coordinate-plane.js';
import { mountFractionBars } from './fraction-bars.js';
import { mountRightTriangle } from './right-triangle.js';
import { mountUnitCircle } from './unit-circle.js';
import { mountNumberLine } from './number-line.js';
import { mountPercentGrid } from './percent-grid.js';
import { mountFractionArea } from './fraction-area.js';
import { mountParabola } from './parabola.js';
import { mountPolynomialArea } from './polynomial-area.js';
import { mountPolynomialGraph } from './polynomial-graph.js';
import { mountExpGraph } from './exp-graph.js';
import { mountAngle } from './angle.js';
import { mountTriangleExplorer } from './triangle-explorer.js';
import { mountPythagorean } from './pythagorean.js';
import { mountPolygon } from './polygon.js';
import { mountCircleWidget } from './circle-widget.js';
import { mountVectorAdd } from './vector-add.js';
import { mountPolarPoint } from './polar-point.js';
import { mountTrigGraph } from './trig-graph.js';
import { mountSequence } from './sequence.js';
import { mountPascalsTriangle } from './pascals-triangle.js';
import { mountTrigEquation } from './trig-equation.js';
import { mountProbabilitySim } from './probability-sim.js';
import { mountNormalDistribution } from './normal-distribution.js';
import { mountDerivativeExplorer } from './derivative-explorer.js';
import { mountRiemannSum } from './riemann-sum.js';
import { mountFactorTree } from './factor-tree.js';
import { mountTrailFunction } from './trail-function.js';
import { mountFunctionMapping } from './function-mapping.js';
import { mountParametricEquation } from './parametric-equation.js';
import { mountFerrisWheel } from './ferris-wheel.js';
import { mountSpeedoOdo } from './speedo-odo.js';
import { mountBalanceScale } from './balance-scale.js';
import { mountGaltonBoard } from './galton-board.js';
import { mountTriangleIncircle } from './triangle-incircle.js';
import { mountIsoTriangle } from './iso-triangle.js';
import { mountTransformation } from './transformation.js';
import { mountCircleTheorems } from './circle-theorems.js';
import { mountTriangleCenters } from './triangle-centers.js';
import { mountModularClock } from './modular-clock.js';
import { mountConicSection } from './conic-section.js';
import { mountFibonacciSpiral } from './fibonacci-spiral.js';
import { mountFractalExplorer } from './fractal-explorer.js';
import { mountGrowingSquare } from './growing-square.js';
import { mountShm } from './shm.js';
import { mountTimeDerivatives } from './time-derivatives.js';
import { mountOsculatingCircle } from './osculating-circle.js';
import { mountDatasetSummary } from './dataset-summary.js';
import { mountHistogram } from './histogram.js';
import { mountStaircaseSum } from './staircase-sum.js';
import { mountDigitSum } from './digit-sum.js';
import { mountOddSquares } from './odd-squares.js';
import { mountCompoundGrowth } from './compound-growth.js';
import { mountExponentBlocks } from './exponent-blocks.js';
import { mountMonteCarloPi } from './monte-carlo-pi.js';
import { mountCircleSquareArea } from './circle-square-area.js';
import { mountMontyHall } from './monty-hall.js';

const registry = new Map();
registry.set('coordinate-plane', mountCoordinatePlane);
registry.set('fraction-bars', mountFractionBars);
registry.set('right-triangle', mountRightTriangle);
registry.set('unit-circle', mountUnitCircle);
registry.set('number-line', mountNumberLine);
registry.set('percent-grid', mountPercentGrid);
registry.set('fraction-area', mountFractionArea);
registry.set('parabola', mountParabola);
registry.set('polynomial-area', mountPolynomialArea);
registry.set('polynomial-graph', mountPolynomialGraph);
registry.set('exp-graph', mountExpGraph);
registry.set('angle', mountAngle);
registry.set('triangle-explorer', mountTriangleExplorer);
registry.set('pythagorean', mountPythagorean);
registry.set('polygon', mountPolygon);
registry.set('circle', mountCircleWidget);
registry.set('vector-add', mountVectorAdd);
registry.set('polar-point', mountPolarPoint);
registry.set('trig-graph', mountTrigGraph);
registry.set('sequence', mountSequence);
registry.set('pascals-triangle', mountPascalsTriangle);
registry.set('trig-equation', mountTrigEquation);
registry.set('probability-sim', mountProbabilitySim);
registry.set('normal-distribution', mountNormalDistribution);
registry.set('derivative-explorer', mountDerivativeExplorer);
registry.set('riemann-sum', mountRiemannSum);
registry.set('factor-tree', mountFactorTree);
registry.set('trail-function', mountTrailFunction);
registry.set('function-mapping', mountFunctionMapping);
registry.set('parametric-equation', mountParametricEquation);
registry.set('ferris-wheel', mountFerrisWheel);
registry.set('speedo-odo', mountSpeedoOdo);
registry.set('balance-scale', mountBalanceScale);
registry.set('galton-board', mountGaltonBoard);
registry.set('triangle-incircle', mountTriangleIncircle);
registry.set('iso-triangle', mountIsoTriangle);
registry.set('transformation', mountTransformation);
registry.set('circle-theorems', mountCircleTheorems);
registry.set('triangle-centers', mountTriangleCenters);
registry.set('modular-clock', mountModularClock);
registry.set('conic-section', mountConicSection);
registry.set('fibonacci-spiral', mountFibonacciSpiral);
registry.set('fractal-explorer', mountFractalExplorer);
registry.set('growing-square', mountGrowingSquare);
registry.set('shm', mountShm);
registry.set('time-derivatives', mountTimeDerivatives);
registry.set('osculating-circle', mountOsculatingCircle);
registry.set('dataset-summary', mountDatasetSummary);
registry.set('histogram', mountHistogram);
registry.set('staircase-sum', mountStaircaseSum);
registry.set('digit-sum', mountDigitSum);
registry.set('odd-squares', mountOddSquares);
registry.set('compound-growth', mountCompoundGrowth);
registry.set('exponent-blocks', mountExponentBlocks);
registry.set('monte-carlo-pi', mountMonteCarloPi);
registry.set('circle-square-area', mountCircleSquareArea);
registry.set('monty-hall', mountMontyHall);

// Render any $...$ math left in widget DOM. Widgets historically build HTML
// strings with raw "$x$" tokens that never reach KaTeX. Walk every text node
// after mount and render the math segments. Text-node values are decoded
// (`<` is `<`, not `&lt;`), so KaTeX gets clean input — unlike the previous
// `innerHTML.replace` approach which fed it `&lt;`.
function postRenderHelperMath(root) {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const targets = [];
  let node;
  while ((node = walker.nextNode())) {
    if (!/\$[^$\n]+\$/.test(node.nodeValue)) continue;
    // Skip text already inside a KaTeX render (its annotation/source spans).
    if (node.parentElement && node.parentElement.closest('.katex')) continue;
    targets.push(node);
  }
  for (const n of targets) {
    const span = root.ownerDocument.createElement('span');
    span.innerHTML = n.nodeValue.replace(/\$([^$\n]+)\$/g, (whole, inner) => {
      try { return katex.renderToString(inner, { throwOnError: false }); }
      catch { return whole; }
    });
    n.replaceWith(span);
  }
}

export function mountWidget(target, kind, config) {
  const fn = registry.get(kind);
  if (!fn) {
    target.innerHTML = `<em>Unknown widget: ${kind}</em>`;
    return;
  }
  try {
    fn(target, config);
    postRenderHelperMath(target);
  } catch (err) {
    console.error(err);
    target.innerHTML = `<em>Widget error: ${err.message}</em>`;
  }
}

export function registerWidget(kind, fn) {
  registry.set(kind, fn);
}
