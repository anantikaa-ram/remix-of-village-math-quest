import type { Difficulty, DomainId, Question } from "./questions";
import { featuresFor, predictStruggle } from "./struggle";

/** One telemetry event per diagnostic item. */
export interface Interaction {
  qid: string;
  domain: DomainId;
  topic: string;
  difficulty: Difficulty;
  correct: boolean;
  attempts: number;
  hintsUsed: number;
  timeMs: number;
}

export interface TopicProfile {
  topic: string;
  domain: DomainId;
  mastery: number; // 0..1
  pCorrectNext: number; // predicted P(correct) on next medium item
  risk: number; // struggle risk 0..1
  n: number;
}

export interface DomainProfile {
  domain: DomainId;
  mastery: number;
  avgTimeS: number;
  accuracy: number;
  hintRate: number;
  level: "Weak" | "Developing" | "Strong";
}

const DIFF_W: Record<Difficulty, number> = { easy: -1, medium: 0, hard: 1 };
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/**
 * Evidence score for a single response — a hand-tuned logistic model over
 * telemetry features (correctness, difficulty, first-try, hints, speed).
 */
function evidence(i: Interaction) {
  const speed = Math.min(i.timeMs / 1000, 90) / 30; // ~1 = 30s
  const z =
    (i.correct ? 2.2 : -1.8) +
    (i.correct ? 0.8 : 0.4) * DIFF_W[i.difficulty] -
    0.7 * (i.attempts - 1) -
    0.9 * i.hintsUsed -
    0.35 * Math.max(0, speed - 1);
  return sigmoid(z);
}

/**
 * Mastery = Bayesian-style evidence average; risk = trained logistic-regression
 * struggle model (see struggle.ts / scripts/train_model.py) on a medium item.
 */
export function analyse(interactions: Interaction[], diagnostic: Interaction[] = interactions) {
  const byTopic = new Map<string, Interaction[]>();
  for (const i of interactions) {
    const k = `${i.domain}::${i.topic}`;
    byTopic.set(k, [...(byTopic.get(k) ?? []), i]);
  }
  const topics: TopicProfile[] = [...byTopic.entries()].map(([k, list]) => {
    const [domain, topic] = k.split("::") as [DomainId, string];
    const sum = list.reduce((s, i) => s + evidence(i) * (1 + 0.3 * DIFF_W[i.difficulty] + 0.3), 0);
    const w = list.reduce((s, i) => s + (1 + 0.3 * DIFF_W[i.difficulty] + 0.3), 0);
    const mastery = (0.5 + sum) / (1 + w);
    const risk = predictStruggle(featuresFor(interactions, diagnostic, topic, "medium")).p;
    return { topic, domain, mastery, pCorrectNext: 1 - risk, risk, n: list.length };
  });

  const domainIds = [...new Set(interactions.map((i) => i.domain))];
  const domains: DomainProfile[] = domainIds.map((d) => {
    const list = interactions.filter((i) => i.domain === d);
    const t = topics.filter((x) => x.domain === d);
    const mastery = t.reduce((s, x) => s + x.mastery * x.n, 0) / t.reduce((s, x) => s + x.n, 0);
    return {
      domain: d,
      mastery,
      accuracy: list.filter((i) => i.correct).length / list.length,
      avgTimeS: list.reduce((s, i) => s + i.timeMs, 0) / list.length / 1000,
      hintRate: list.reduce((s, i) => s + i.hintsUsed, 0) / list.length,
      level: mastery < 0.45 ? "Weak" : mastery < 0.7 ? "Developing" : "Strong",
    };
  });

  const overall = domains.reduce((s, d) => s + d.mastery, 0) / Math.max(1, domains.length);
  return { topics, domains, overall };
}

export type Analysis = ReturnType<typeof analyse>;

export interface PathStep {
  topic: string;
  domain: DomainId;
  action: "Remediate" | "Practice" | "Challenge";
  difficulty: Difficulty;
  reason: string;
}

/** Recommendation engine: order by ML-predicted struggle risk, pick action from mastery. */
export function recommendPath(a: Analysis): PathStep[] {
  return [...a.topics]
    .sort((x, y) => (y.risk + 1 - y.mastery) - (x.risk + 1 - x.mastery)) // blend ML risk with observed mastery
    .map((t) => {
      const pct = Math.round(t.mastery * 100);
      if (t.mastery < 0.45)
        return { topic: t.topic, domain: t.domain, action: "Remediate", difficulty: "easy", reason: `Mastery ${pct}% · model predicts ${Math.round(t.risk*100)}% struggle risk — rebuild foundations.` };
      if (t.mastery < 0.7)
        return { topic: t.topic, domain: t.domain, action: "Practice", difficulty: "medium", reason: `Mastery ${pct}% · ${Math.round(t.risk*100)}% struggle risk — targeted practice.` };
      return { topic: t.topic, domain: t.domain, action: "Challenge", difficulty: "hard", reason: `Mastery ${pct}% · ${Math.round(t.risk*100)}% struggle risk — ready for stretch problems.` };
    });
}

export function rewardFor(interactions: Interaction[]) {
  const correct = interactions.filter((i) => i.correct).length;
  const xp = 100 + correct * 15;
  const coins = 50 + correct * 5;
  return { xp, coins };
}

export type { Question };
