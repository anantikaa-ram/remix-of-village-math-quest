import type { Difficulty, DomainId } from "./questions";

export interface PracticeItem {
  prompt: string;
  options: string[];
  answer: number;
  hint: string;
  explain: string;
}

export interface Lesson {
  slug: string;
  topic: string;
  domain: DomainId;
  concept: string;
  steps: string[];
  example: { problem: string; solution: string[] };
  gen: (d: Difficulty) => PracticeItem;
}

const r = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const frac = (n: number, d: number) => { const g = gcd(n, d); return d / g === 1 ? `${n / g}` : `${n / g}/${d / g}`; };
const scale = (d: Difficulty, e: number, m: number, h: number) => (d === "easy" ? e : d === "medium" ? m : h);

/** Build a 4-option multiple choice item with unique shuffled distractors. */
function mc(prompt: string, correct: string | number, wrong: (string | number)[], hint: string, explain: string): PracticeItem {
  const c = String(correct);
  const pool = [...new Set(wrong.map(String).filter((w) => w !== c))].slice(0, 3);
  let k = 1;
  while (pool.length < 3) { const w = String(Number(c) + k * (pool.length + 1)); if (!pool.includes(w) && w !== c && w !== "NaN") pool.push(w); else pool.push(`${c}·${k}`); k++; }
  const options = [c, ...pool].sort(() => Math.random() - 0.5);
  return { prompt, options, answer: options.indexOf(c), hint, explain };
}

export const LESSONS: Lesson[] = [
  {
    slug: "fractions", topic: "Fractions", domain: "arithmetic",
    concept: "To add fractions, they must share the same denominator (bottom number).",
    steps: ["Find a common denominator (the LCM of both bottoms).", "Rewrite each fraction with that denominator.", "Add the numerators; keep the denominator.", "Simplify."],
    example: { problem: "1/3 + 1/6", solution: ["Common denominator: 6", "1/3 = 2/6", "2/6 + 1/6 = 3/6", "= 1/2"] },
    gen: (d) => {
      const b1 = r(2, scale(d, 4, 6, 9)), b2 = b1 * r(1, scale(d, 2, 3, 3)) + (d === "hard" ? 1 : 0);
      const a1 = r(1, b1 - 1), a2 = r(1, b2 - 1), L = (b1 * b2) / gcd(b1, b2);
      const n = a1 * (L / b1) + a2 * (L / b2);
      return mc(`${a1}/${b1} + ${a2}/${b2} = ?`, frac(n, L), [`${a1 + a2}/${b1 + b2}`, frac(n + 1, L), frac(a1 * a2, b1 * b2)], `Use denominator ${L}.`, `${a1}/${b1} + ${a2}/${b2} = ${n}/${L} = ${frac(n, L)}`);
    },
  },
  {
    slug: "decimals", topic: "Decimals", domain: "arithmetic",
    concept: "Multiply decimals as whole numbers, then place the decimal point by counting decimal places.",
    steps: ["Ignore the points and multiply.", "Count total decimal places in both factors.", "Move the point that many places left."],
    example: { problem: "0.4 × 0.3", solution: ["4 × 3 = 12", "2 decimal places in total", "= 0.12"] },
    gen: (d) => {
      const a = r(2, 9), b = r(2, scale(d, 9, 9, 19));
      const p = d === "easy" ? 1 : 2, v = (a * b) / 10 ** p;
      const fmt = (x: number) => String(+x.toFixed(4));
      return mc(`${fmt(a / 10)} × ${fmt(b / 10 ** (p - 1))} = ?`, fmt(v), [fmt(v * 10), fmt(v / 10), fmt((a + b) / 10)], `${a} × ${b} = ${a * b}, then count places.`, `${a * b} with ${p} decimal place(s) → ${fmt(v)}`);
    },
  },
  {
    slug: "percentages", topic: "Percentages", domain: "arithmetic",
    concept: "A percentage is a number out of 100. x% of N = N × x/100.",
    steps: ["Convert the percent to a decimal (÷100).", "Multiply by the amount.", "For a discount, subtract from the original (or multiply by 1 − rate)."],
    example: { problem: "20% off $50", solution: ["20% = 0.20", "50 × 0.20 = 10", "50 − 10 = $40"] },
    gen: (d) => {
      const p = r(1, 9) * scale(d, 10, 5, 5), n = r(2, 20) * 10;
      const v = (n * p) / 100;
      if (d === "hard") return mc(`$${n} is reduced by ${p}%. New price?`, `$${n - v}`, [`$${v}`, `$${n - p}`, `$${n + v}`], "Find the discount first.", `${p}% of ${n} = ${v}; ${n} − ${v} = ${n - v}`);
      return mc(`${p}% of ${n} = ?`, v, [v * 10, n - p, v + p], `${p}% = ${p / 100}`, `${n} × ${p / 100} = ${v}`);
    },
  },
  {
    slug: "order-of-operations", topic: "Order of Operations", domain: "arithmetic",
    concept: "BIDMAS: Brackets, Indices, Division/Multiplication (left→right), Addition/Subtraction (left→right).",
    steps: ["Work inside brackets.", "Evaluate powers.", "Multiply/divide left to right.", "Add/subtract left to right."],
    example: { problem: "3 + 4 × 2²", solution: ["2² = 4", "4 × 4 = 16", "3 + 16 = 19"] },
    gen: (d) => {
      const a = r(2, 9), b = r(2, 5), c = r(1, 4);
      if (d === "easy") return mc(`${a} + ${b} × ${c} = ?`, a + b * c, [(a + b) * c, a * b + c, a + b + c], "Multiply first.", `${b}×${c}=${b * c}; ${a}+${b * c}=${a + b * c}`);
      const e = r(1, 3), v = a + b * (c + e) ** 2;
      return mc(`${a} + ${b} × (${c} + ${e})² = ?`, v, [(a + b) * (c + e) ** 2, a + (b * (c + e)) ** 2, a + b * (c + e) * 2], "Brackets, then the power.", `(${c + e})²=${(c + e) ** 2}; ×${b}=${b * (c + e) ** 2}; +${a}=${v}`);
    },
  },
  {
    slug: "integers", topic: "Integers", domain: "prealgebra",
    concept: "Integers include negatives. On a number line, adding moves right; subtracting moves left.",
    steps: ["Start at the first number.", "Adding a positive → move right; a negative → move left.", "Subtracting a negative is the same as adding."],
    example: { problem: "−4 − (−9)", solution: ["−(−9) = +9", "−4 + 9 = 5"] },
    gen: (d) => {
      const a = -r(1, scale(d, 10, 15, 30)), b = r(1, scale(d, 15, 20, 30)) * (d === "easy" ? 1 : -1);
      const show = (x: number) => (x < 0 ? `(${"−"}${-x})` : `${x}`);
      const v = d === "hard" ? a - b : a + b;
      const m = (x: number) => (x < 0 ? `−${-x}` : `${x}`);
      return mc(`${m(a)} ${d === "hard" ? "−" : "+"} ${show(b)} = ?`, m(v), [m(-v), m(v + 2), m(a - (d === "hard" ? -b : b))], "Picture a number line.", `Result: ${m(v)}`);
    },
  },
  {
    slug: "linear-equations", topic: "Linear Equations", domain: "prealgebra",
    concept: "Solve for x by doing the same operation to both sides until x is alone.",
    steps: ["Undo addition/subtraction.", "Undo multiplication/division.", "Check by substituting back."],
    example: { problem: "2x + 3 = 11", solution: ["2x = 8", "x = 4", "Check: 2·4+3 = 11 ✓"] },
    gen: (d) => {
      const x = r(1, 12), a = r(2, scale(d, 3, 6, 9)), b = r(1, 20), c = a * x + b;
      return mc(`Solve: ${a}x + ${b} = ${c}`, `x = ${x}`, [`x = ${x + 1}`, `x = ${(c + b) / a}`.replace(/\.(\d{2})\d+/, ".$1"), `x = ${c - b}`], `Subtract ${b}, then divide by ${a}.`, `${a}x = ${c - b} → x = ${x}`);
    },
  },
  {
    slug: "ratios", topic: "Ratios", domain: "prealgebra",
    concept: "A ratio a : b splits a total into a + b equal parts.",
    steps: ["Add the ratio parts.", "Divide the total by that sum to get one part.", "Multiply by the share you need."],
    example: { problem: "Share 30 in ratio 2 : 3", solution: ["5 parts", "30 ÷ 5 = 6", "2×6 = 12, 3×6 = 18"] },
    gen: (d) => {
      const a = r(1, 5), b = r(a + 1, scale(d, 6, 8, 11)), k = r(2, scale(d, 5, 8, 12)), t = (a + b) * k;
      return mc(`Red : blue = ${a} : ${b}. Total ${t}. How many blue?`, b * k, [a * k, t - b, b * (k + 1)], `${a + b} parts in total.`, `${t} ÷ ${a + b} = ${k}; ${b} × ${k} = ${b * k}`);
    },
  },
  {
    slug: "expressions", topic: "Expressions", domain: "prealgebra",
    concept: "Simplify by expanding brackets and collecting like terms.",
    steps: ["Multiply each term inside the bracket by the outside factor.", "Watch the sign before a bracket.", "Combine x terms and constants separately."],
    example: { problem: "3(x + 2) − x", solution: ["3x + 6 − x", "= 2x + 6"] },
    gen: () => {
      const a = r(2, 5), b = r(1, 6), c = r(1, 5);
      const k = a - 1, n = -a * b + c;
      const e = (p: number, q: number) => `${p}x ${q < 0 ? "−" : "+"} ${Math.abs(q)}`;
      return mc(`Simplify: ${a}(x − ${b}) − (x − ${c})`, e(k, n), [e(k, -a * b - c), e(a + 1, n), e(k, -b + c)], "The minus flips both signs in the second bracket.", `${a}x − ${a * b} − x + ${c} = ${e(k, n)}`);
    },
  },
  {
    slug: "angles", topic: "Angles", domain: "geometry",
    concept: "Angles in a triangle sum to 180°; on a straight line, 180°; around a point, 360°.",
    steps: ["Identify which rule applies.", "Add the known angles.", "Subtract from the total."],
    example: { problem: "Triangle with 40° and 75°", solution: ["40 + 75 = 115", "180 − 115 = 65°"] },
    gen: (d) => {
      if (d === "hard") { const a = r(40, 120), b = r(40, 100), c = r(30, 80); return mc(`Angles around a point: ${a}°, ${b}°, ${c}° and x. Find x.`, `${360 - a - b - c}°`, [`${180 - a}°`, `${360 - a - b}°`, `${370 - a - b - c}°`], "Around a point = 360°.", `360 − ${a + b + c} = ${360 - a - b - c}°`); }
      const a = r(30, 80), b = r(30, 80);
      return mc(`A triangle has angles ${a}° and ${b}°. The third?`, `${180 - a - b}°`, [`${360 - a - b}°`, `${190 - a - b}°`, `${a + b}°`], "Sum is 180°.", `180 − ${a + b} = ${180 - a - b}°`);
    },
  },
  {
    slug: "area", topic: "Area", domain: "geometry",
    concept: "Rectangle: A = l × w. Triangle: A = ½ × b × h.",
    steps: ["Pick the right formula.", "Substitute the measurements.", "Include square units."],
    example: { problem: "Triangle b = 8, h = 5", solution: ["½ × 8 × 5", "= 20 cm²"] },
    gen: (d) => {
      const b = r(2, 12) * 2, h = r(3, 12);
      if (d === "easy") return mc(`Rectangle ${b} cm × ${h} cm. Area?`, `${b * h} cm²`, [`${2 * (b + h)} cm²`, `${(b * h) / 2} cm²`, `${b + h} cm²`], "l × w", `${b} × ${h} = ${b * h}`);
      return mc(`Triangle base ${b} cm, height ${h} cm. Area?`, `${(b * h) / 2} cm²`, [`${b * h} cm²`, `${b + h} cm²`, `${(b * h) / 2 + h} cm²`], "½ × b × h", `½ × ${b} × ${h} = ${(b * h) / 2}`);
    },
  },
  {
    slug: "circles", topic: "Circles", domain: "geometry",
    concept: "Circumference C = 2πr. Area A = πr². Use π ≈ 22/7 when r is a multiple of 7.",
    steps: ["Find the radius (half the diameter).", "Choose C or A.", "Substitute and simplify."],
    example: { problem: "C when r = 14", solution: ["2 × 22/7 × 14", "= 88"] },
    gen: (d) => {
      const rr = 7 * r(1, 3);
      if (d === "hard") return mc(`Area of a circle, r = ${rr} (π ≈ 22/7)?`, (22 * rr * rr) / 7, [(44 * rr) / 7, 2 * rr * rr, (22 * rr) / 7], "A = πr²", `22/7 × ${rr}² = ${(22 * rr * rr) / 7}`);
      return mc(`Circumference, r = ${rr} (π ≈ 22/7)?`, (44 * rr) / 7, [(22 * rr) / 7, (22 * rr * rr) / 7, 2 * rr], "C = 2πr", `2 × 22/7 × ${rr} = ${(44 * rr) / 7}`);
    },
  },
  {
    slug: "pythagoras", topic: "Pythagoras", domain: "geometry",
    concept: "In a right triangle, a² + b² = c², where c is the hypotenuse.",
    steps: ["Square both legs.", "Add them.", "Take the square root."],
    example: { problem: "Legs 5 and 12", solution: ["25 + 144 = 169", "√169 = 13"] },
    gen: () => {
      const [a, b, c] = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]][r(0, 3)]!, k = r(1, 3);
      return mc(`Right triangle legs ${a * k} and ${b * k}. Hypotenuse?`, c * k, [(a + b) * k, c * k + 1, b * k + 1], "a² + b² = c²", `${(a * k) ** 2} + ${(b * k) ** 2} = ${(c * k) ** 2}; √ = ${c * k}`);
    },
  },
  {
    slug: "mean", topic: "Mean", domain: "data",
    concept: "Mean = sum of values ÷ number of values.",
    steps: ["Add all values.", "Count them.", "Divide."],
    example: { problem: "3, 5, 10", solution: ["Sum = 18", "Count = 3", "Mean = 6"] },
    gen: (d) => {
      const n = scale(d, 3, 4, 5), m = r(3, 12), xs = Array.from({ length: n - 1 }, () => r(1, 20));
      xs.push(m * n - xs.reduce((s, x) => s + x, 0));
      const sum = m * n;
      return mc(`Mean of ${xs.join(", ")}?`, m, [sum, m + 1, Math.round(sum / (n + 1))], "Sum ÷ count", `${sum} ÷ ${n} = ${m}`);
    },
  },
  {
    slug: "median", topic: "Median", domain: "data",
    concept: "Median is the middle value when data is sorted. For an even count, average the two middle values.",
    steps: ["Sort the values.", "Find the middle position.", "If two middles, average them."],
    example: { problem: "8, 2, 6, 4", solution: ["Sorted: 2, 4, 6, 8", "(4 + 6) ÷ 2 = 5"] },
    gen: (d) => {
      const n = d === "easy" ? 5 : 6, xs = Array.from({ length: n }, () => r(1, 30));
      const s = [...xs].sort((a, b) => a - b);
      const med = n % 2 ? s[2]! : (s[2]! + s[3]!) / 2;
      return mc(`Median of ${xs.join(", ")}?`, med, [xs[Math.floor(n / 2)]!, s[3]!, +(xs.reduce((a, b) => a + b, 0) / n).toFixed(1)], "Sort first!", `Sorted: ${s.join(", ")} → ${med}`);
    },
  },
  {
    slug: "probability", topic: "Probability", domain: "data",
    concept: "P(event) = favourable outcomes ÷ total outcomes. P(at least one) = 1 − P(none).",
    steps: ["List the sample space.", "Count favourable outcomes.", "Divide and simplify."],
    example: { problem: "P(even) on a die", solution: ["Even: 2, 4, 6 → 3", "3/6 = 1/2"] },
    gen: (d) => {
      if (d === "hard") { const n = r(2, 3); return mc(`${n} fair coins are flipped. P(at least one head)?`, frac(2 ** n - 1, 2 ** n), [frac(1, 2 ** n), "1/2", frac(n, 2 ** n)], "1 − P(all tails)", `1 − 1/${2 ** n} = ${frac(2 ** n - 1, 2 ** n)}`); }
      const k = r(1, 5);
      return mc(`A fair die is rolled. P(number > ${k})?`, frac(6 - k, 6), [frac(k, 6), frac(6 - k + 1, 6), `1/${6 - k}`], `Count numbers above ${k}.`, `${6 - k} of 6 → ${frac(6 - k, 6)}`);
    },
  },
];

export const lessonBySlug = (slug: string) => LESSONS.find((l) => l.slug === slug);
export const lessonByTopic = (topic: string) => LESSONS.find((l) => l.topic === topic);

export const PRACTICE_LEN = 5;
