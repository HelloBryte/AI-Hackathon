// Course structure modelled on Exhibit 2 (Mathematical Methods Units 3&4).
// The real progress sheet tracks 202 core points; this prototype uses 99 so the
// demo stays readable. Nothing in the logic depends on the count.

const MODULES = [
  {
    id: 1, name: 'Functions, relations and graphs', points: [
      ['1.1', 'Set notation, domain and range'],
      ['1.2', 'Function notation and implied domain'],
      ['1.3', 'Hybrid (piecewise) functions'],
      ['1.4', 'Odd and even functions'],
      ['1.5.1', 'Composite functions: existence'],
      ['1.5.2', 'Composite functions: rule and domain'],
      ['1.6.1', 'Inverse functions: one-to-one condition'],
      ['1.6.2', 'Inverse functions: rule and graph'],
      ['1.7', 'Sum, difference and product of functions'],
      ['1.8.1', 'Power functions: positive integer powers'],
      ['1.8.2', 'Power functions: negative and rational powers'],
      ['1.9', 'Modelling with functions'],
    ],
  },
  {
    id: 2, name: 'Polynomials', points: [
      ['2.1', 'Polynomial division'],
      ['2.2', 'Remainder and factor theorems'],
      ['2.3', 'Solving cubic equations'],
      ['2.4.1', 'Cubic graphs: stationary point of inflection form'],
      ['2.4.2', 'Cubic graphs: general sketching'],
      ['2.5', 'Quartic functions'],
      ['2.6', 'Finding polynomial rules from graphs'],
      ['2.7', 'Simultaneous equations with parameters'],
      ['2.8', 'Families of polynomials'],
    ],
  },
  {
    id: 3, name: 'Transformations', points: [
      ['3.1.1', 'Translations'],
      ['3.1.2', 'Dilations from the axes'],
      ['3.1.3', 'Reflections in the axes'],
      ['3.2', 'Combinations of transformations (mapping notation)'],
      ['3.3', 'Finding the transformation from two rules'],
      ['3.4', 'Matrix form of transformations'],
      ['3.5', 'Transformations of inverse functions'],
    ],
  },
  {
    id: 4, name: 'Exponential and logarithmic functions', points: [
      ['4.1', 'Index laws'],
      ['4.2', 'Exponential functions and graphs'],
      ['4.3', 'Logarithm laws'],
      ['4.4', 'Solving exponential equations'],
      ['4.5', 'Logarithmic functions and graphs'],
      ['4.6', 'Inverses of exponential functions'],
      ['4.7', 'Exponential modelling'],
    ],
  },
  {
    id: 5, name: 'Circular functions', points: [
      ['5.1', 'Unit circle and exact values'],
      ['5.2', 'Symmetry properties'],
      ['5.3.1', 'Sine and cosine graphs: amplitude and period'],
      ['5.3.2', 'Sine and cosine graphs: transformations'],
      ['5.4', 'Solving trigonometric equations'],
      ['5.5', 'Tangent function and graph'],
      ['5.6', 'General solutions'],
      ['5.7', 'Modelling with circular functions'],
    ],
  },
  {
    id: 6, name: 'Differentiation', points: [
      ['6.1', 'Limits and continuity'],
      ['6.2', 'Differentiation from first principles'],
      ['6.3', 'Derivatives of polynomials and powers'],
      ['6.4.1', 'Chain rule'],
      ['6.4.2', 'Product rule'],
      ['6.4.3', 'Quotient rule'],
      ['6.5', 'Derivatives of exponential and log functions'],
      ['6.6', 'Derivatives of circular functions'],
      ['6.7', 'Differentiability'],
    ],
  },
  {
    id: 7, name: 'Applications of differentiation', points: [
      ['7.1', 'Tangents and normals'],
      ['7.2', 'Rates of change'],
      ['7.3', 'Stationary points'],
      ['7.4', 'Strictly increasing and decreasing functions'],
      ['7.5.1', 'Curve sketching'],
      ['7.5.2', 'Points of inflection (second derivative)'],
      ['7.6', 'Absolute maximum and minimum'],
      ['7.7', 'Optimisation problems'],
      ['7.8', "Newton's method"],
      ['7.9', 'Linear approximation'],
    ],
  },
  {
    id: 8, name: 'Integration', points: [
      ['8.1', 'Antiderivatives of polynomials'],
      ['8.2', 'Antiderivatives of exponential and circular functions'],
      ['8.3', 'Antiderivatives of 1/(ax+b)'],
      ['8.4', 'Integration by recognition'],
      ['8.5', 'Definite integrals'],
      ['8.6.1', 'Fundamental theorem of calculus'],
      ['8.6.2', 'Properties of definite integrals'],
      ['8.7.1', 'Area under a curve'],
      ['8.7.2', 'Signed area (regions below the axis)'],
      ['8.8.1', 'Area between two curves'],
      ['8.8.2', 'Area between curves: finding intersections'],
      ['8.9.1', 'Average value of a function'],
      ['8.9.2', 'Trapezium rule approximation'],
      ['8.9.3', 'Kinematics applications'],
    ],
  },
  {
    id: 9, name: 'Discrete random variables', points: [
      ['9.1', 'Conditional probability and independence'],
      ['9.2', 'Discrete probability distributions'],
      ['9.3', 'Expected value'],
      ['9.4', 'Variance and standard deviation'],
      ['9.5', 'Linear transformations of random variables'],
      ['9.6', 'Sampling with and without replacement'],
    ],
  },
  {
    id: 10, name: 'Binomial distribution', points: [
      ['10.1', 'Bernoulli trials'],
      ['10.2', 'Binomial probabilities'],
      ['10.3', 'Mean and variance of a binomial'],
      ['10.4', 'Finding n or p'],
      ['10.5', 'Binomial applications'],
    ],
  },
  {
    id: 11, name: 'Continuous random variables and the normal distribution', points: [
      ['11.1', 'Probability density functions'],
      ['11.2', 'Mean and median of a continuous random variable'],
      ['11.3', 'Variance of a continuous random variable'],
      ['11.4', 'The standard normal distribution'],
      ['11.5', 'Normal probabilities with CAS'],
      ['11.6', 'Inverse normal problems'],
      ['11.7', 'Normal distribution applications'],
    ],
  },
  {
    id: 12, name: 'Statistical inference', points: [
      ['12.1', 'Populations and samples'],
      ['12.2', 'Sample proportions'],
      ['12.3', 'Distribution of sample proportions'],
      ['12.4', 'Approximate confidence intervals for p'],
      ['12.5', 'Interpreting confidence intervals'],
    ],
  },
];

// Flat list: [{ id: '8.6.2', module: 8, title: '...' }, ...]
const POINTS = [];
for (const m of MODULES) {
  for (const [id, title] of m.points) POINTS.push({ id, module: m.id, title });
}

// Test papers. Module Test 8A mirrors Exhibit 1 question-for-question.
// "A"/"B" suffixes are paper versions; a Retest uses a different version.
const TESTS = [
  {
    id: 'MT8A', name: 'Module Test 8A', kind: 'module', module: 8, timeLimitMin: 50,
    questions: [
      { q: '1', point: '8.1', marks: 2 },
      { q: '2', point: '8.2', marks: 2 },
      { q: '3', point: '8.4', marks: 3 },
      { q: '4', point: '8.5', marks: 2 },
      { q: '5', point: '8.6.2', marks: 3 },
      { q: '6a', point: '8.7.1', marks: 2 },
      { q: '6b', point: '8.7.2', marks: 2 },
      { q: '7', point: '8.8.1', marks: 3 },
      { q: '8', point: '8.8.2', marks: 4 },
      { q: '9', point: '8.9.1', marks: 3 },
      { q: '10', point: '8.9.2', marks: 3 },
      { q: '11', point: '8.9.3', marks: 4 },
    ],
  },
  {
    id: 'MT6B', name: 'Module Test 6B (Retest)', kind: 'module', module: 6, timeLimitMin: 45,
    questions: [
      { q: '1', point: '6.1', marks: 2 },
      { q: '2', point: '6.2', marks: 3 },
      { q: '3', point: '6.3', marks: 2 },
      { q: '4a', point: '6.4.1', marks: 2 },
      { q: '4b', point: '6.4.2', marks: 3 },
      { q: '5', point: '6.4.3', marks: 3 },
      { q: '6', point: '6.5', marks: 3 },
      { q: '7', point: '6.6', marks: 3 },
      { q: '8', point: '6.6', marks: 4 },
      { q: '9', point: '6.7', marks: 3 },
    ],
  },
  {
    id: 'MT7A', name: 'Module Test 7A', kind: 'module', module: 7, timeLimitMin: 50,
    questions: [
      { q: '1', point: '7.1', marks: 3 },
      { q: '2', point: '7.2', marks: 3 },
      { q: '3', point: '7.3', marks: 3 },
      { q: '4', point: '7.4', marks: 2 },
      { q: '5a', point: '7.5.1', marks: 3 },
      { q: '5b', point: '7.5.2', marks: 2 },
      { q: '6', point: '7.6', marks: 3 },
      { q: '7', point: '7.7', marks: 5 },
      { q: '8', point: '7.8', marks: 3 },
      { q: '9', point: '7.9', marks: 3 },
    ],
  },
  {
    id: 'MT5B', name: 'Module Test 5B (Retest)', kind: 'module', module: 5, timeLimitMin: 45,
    questions: [
      { q: '1', point: '5.1', marks: 2 },
      { q: '2', point: '5.2', marks: 2 },
      { q: '3', point: '5.3.1', marks: 3 },
      { q: '4', point: '5.3.2', marks: 3 },
      { q: '5', point: '5.4', marks: 4 },
      { q: '6', point: '5.5', marks: 2 },
      { q: '7', point: '5.6', marks: 4 },
      { q: '8', point: '5.7', marks: 4 },
    ],
  },
  {
    id: 'VCAA23E1', name: 'VCAA 2023 Exam 1 (mock)', kind: 'vcaa', module: null, timeLimitMin: 60,
    questions: [
      { q: '1a', point: '6.4.2', marks: 1 },
      { q: '1b', point: '6.4.3', marks: 2 },
      { q: '2', point: '8.5', marks: 3 },
      { q: '3', point: '4.4', marks: 3 },
      { q: '4', point: '5.4', marks: 4 },
      { q: '5a', point: '9.3', marks: 2 },
      { q: '5b', point: '9.4', marks: 3 },
      { q: '6', point: '7.1', marks: 4 },
      { q: '7', point: '1.5.2', marks: 4 },
      { q: '8', point: '8.8.1', marks: 5 },
      { q: '9a', point: '11.2', marks: 4 },
      { q: '9b', point: '7.7', marks: 5 },
    ],
  },
];

module.exports = { MODULES, POINTS, TESTS };
