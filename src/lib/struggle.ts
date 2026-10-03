import model from "./model.json";
import type { Difficulty } from "./questions";
import type { Interaction } from "./ml";

/** Logistic-regression struggle model trained offline on the student dataset (scripts/train_model.py). */
export const MODEL = model;
export type FeatureName = (typeof model.features)[number];

const DATASET_TOPIC: Record<string, string> = {
  Fractions: "arithmetic_fractions", Decimals: "arithmetic_decimals", Percentages: "arithmetic_percentages",
  "Order of Operations": "arithmetic_integers", Integers: "arithmetic_integers",
  "Linear Equations": "algebra_linear_equations", Ratios: "algebra_linear_equations", Expressions: "algebra_expressions",
  Angles: "geometry_angles", Area: "geometry_area_perimeter", Circles: "geometry_coordinate", Pythagoras: "geometry_triangles",
  Mean: "data_mean_median_mode", Median: "data_mean_median_mode", Probability: "data_probability",
};
const DIFF_LEVEL: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

export function topicBaseline(topic: string) {
  const b = model.topicBaseline as Record<string, number>;
  return b[DATASET_TOPIC[topic] ?? ""] ?? 0.44;
}

/** Build the dataset's feature vector for "this student, this topic, this difficulty, right now". */
export function featuresFor(history: Interaction[], diagnostic: Interaction[], topic: string, difficulty: Difficulty): Record<FeatureName, number> {
  const onTopic = history.filter((i) => i.topic === topic);
  const diagAcc = diagnostic.length ? diagnostic.filter((i) => i.correct).length / diagnostic.length : 0.6;
  const recent = history.slice(-10);
  let streak = 0, errors = 0;
  for (let k = history.length - 1; k >= 0 && history[k]!.correct; k--) streak++;
  for (let k = history.length - 1; k >= 0 && !history[k]!.correct; k--) errors++;
  return {
    difficulty_level: DIFF_LEVEL[difficulty],
    topic_historical_accuracy: onTopic.length ? onTopic.filter((i) => i.correct).length / onTopic.length : diagAcc,
    topic_attempts_count: Math.min(onTopic.length, 5),
    recent_window_accuracy: recent.length ? recent.filter((i) => i.correct).length / recent.length : diagAcc,
    current_streak: streak,
    consecutive_errors: errors,
    session_question_index: Math.min(history.length + 1, 25),
    days_since_last_practice: 0,
    topic_difficulty_baseline: topicBaseline(topic),
    diagnostic_baseline_score: diagAcc,
  };
}

/** P(struggle) plus each feature's contribution to the log-odds (for explanations). */
export function predictStruggle(f: Record<FeatureName, number>) {
  const contrib = model.features.map((name, k) => ({
    name, value: f[name as FeatureName], logit: ((model.coef[k] ?? 0) * (f[name as FeatureName] - (model.mean[k] ?? 0))) / (model.std[k] ?? 1),
  }));
  const z = model.intercept + contrib.reduce((s, c) => s + c.logit, 0);
  return { p: 1 / (1 + Math.exp(-z)), contrib };
}

/** Pick the hardest difficulty whose predicted struggle stays in the productive zone. */
export function chooseDifficulty(history: Interaction[], diagnostic: Interaction[], topic: string, maxStruggle = 0.6): Difficulty {
  const order: Difficulty[] = ["hard", "medium", "easy"];
  return order.find((d) => predictStruggle(featuresFor(history, diagnostic, topic, d)).p <= maxStruggle) ?? "easy";
}

export const FEATURE_LABEL: Record<string, string> = {
  difficulty_level: "Question difficulty", topic_historical_accuracy: "Past accuracy on topic", topic_attempts_count: "Times practised topic",
  recent_window_accuracy: "Recent accuracy (last 10)", current_streak: "Current correct streak", consecutive_errors: "Errors in a row",
  session_question_index: "Questions this session", days_since_last_practice: "Days since practice",
  topic_difficulty_baseline: "Topic's typical difficulty", diagnostic_baseline_score: "Diagnostic score",
};
