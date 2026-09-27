export type Difficulty = "easy" | "medium" | "hard";
export type DomainId = "arithmetic" | "prealgebra" | "geometry" | "data";

export interface Question {
  id: string;
  domain: DomainId;
  topic: string;
  difficulty: Difficulty;
  prompt: string;
  options: string[];
  answer: number; // index
  hint: string;
}

export const DOMAINS: { id: DomainId; name: string; blurb: string; glyph: string; building: string }[] = [
  { id: "arithmetic", name: "Arithmetic & Number Operations", blurb: "Whole numbers, fractions, decimals, percentages.", glyph: "±", building: "Market Square" },
  { id: "prealgebra", name: "Pre-Algebra", blurb: "Expressions, equations, integers, ratios.", glyph: "x", building: "Scholar's Tower" },
  { id: "geometry", name: "Geometry", blurb: "Angles, area, perimeter, shapes.", glyph: "△", building: "Stone Mason" },
  { id: "data", name: "Data & Statistics", blurb: "Mean, median, probability, charts.", glyph: "σ", building: "Harvest Granary" },
];

const q = (id: string, domain: DomainId, topic: string, difficulty: Difficulty, prompt: string, options: string[], answer: number, hint: string): Question =>
  ({ id, domain, topic, difficulty, prompt, options, answer, hint });

export const QUESTIONS: Question[] = [
  // Arithmetic
  q("a1", "arithmetic", "Fractions", "easy", "1/2 + 1/4 = ?", ["2/6", "3/4", "1/6", "2/4"], 1, "Rewrite 1/2 as quarters."),
  q("a2", "arithmetic", "Decimals", "medium", "0.6 × 0.5 = ?", ["3.0", "0.03", "0.3", "0.11"], 2, "6 × 5 = 30, then count decimal places."),
  q("a3", "arithmetic", "Percentages", "hard", "A $80 item is discounted 15%, then taxed 10%. Final price?", ["$74.80", "$76.00", "$68.00", "$75.20"], 0, "80 × 0.85, then × 1.10."),
  q("a4", "arithmetic", "Order of Operations", "medium", "8 + 2 × (6 − 3)² = ?", ["90", "26", "98", "44"], 1, "Brackets, then powers, then multiply."),
  // Pre-algebra
  q("p1", "prealgebra", "Integers", "easy", "−7 + 12 = ?", ["−19", "5", "−5", "19"], 1, "Move 12 steps right from −7."),
  q("p2", "prealgebra", "Linear Equations", "medium", "Solve: 3x − 5 = 16", ["x = 7", "x = 3.67", "x = 11", "x = 21"], 0, "Add 5 to both sides, then divide by 3."),
  q("p3", "prealgebra", "Ratios", "medium", "Ratio of cats to dogs is 3 : 5. There are 40 animals. How many dogs?", ["15", "24", "25", "20"], 2, "8 parts total; each part is 5."),
  q("p4", "prealgebra", "Expressions", "hard", "Simplify: 2(3x − 4) − (x − 6)", ["5x − 2", "5x − 14", "7x − 2", "5x + 2"], 0, "Distribute the minus sign carefully."),
  // Geometry
  q("g1", "geometry", "Angles", "easy", "Two angles of a triangle are 50° and 60°. The third is?", ["80°", "70°", "90°", "60°"], 1, "Angles in a triangle sum to 180°."),
  q("g2", "geometry", "Area", "medium", "Area of a triangle with base 10 cm and height 6 cm?", ["60 cm²", "16 cm²", "30 cm²", "36 cm²"], 2, "½ × base × height."),
  q("g3", "geometry", "Circles", "hard", "Circumference of a circle with radius 7 (use π ≈ 22/7)?", ["44", "154", "22", "49"], 0, "C = 2πr."),
  q("g4", "geometry", "Pythagoras", "hard", "Right triangle legs 6 and 8. Hypotenuse?", ["14", "10", "12", "√48"], 1, "a² + b² = c²."),
  // Data
  q("d1", "data", "Mean", "easy", "Mean of 4, 8, 6, 10?", ["6", "7", "8", "28"], 1, "Sum then divide by count."),
  q("d2", "data", "Median", "medium", "Median of 3, 9, 1, 7, 5, 11?", ["5", "7", "6", "6.5"], 2, "Sort first; average the middle two."),
  q("d3", "data", "Probability", "medium", "A fair die is rolled. P(number > 4)?", ["1/2", "1/3", "2/3", "1/6"], 1, "Favourable outcomes: 5 and 6."),
  q("d4", "data", "Probability", "hard", "Two fair coins are flipped. P(at least one head)?", ["1/2", "1/4", "3/4", "2/3"], 2, "1 − P(no heads)."),
];

export function buildDiagnostic(domains: DomainId[]): Question[] {
  const rank = { easy: 0, medium: 1, hard: 2 };
  return QUESTIONS.filter((x) => domains.includes(x.domain)).sort(
    (a, b) => rank[a.difficulty] - rank[b.difficulty] || a.domain.localeCompare(b.domain),
  );
}
