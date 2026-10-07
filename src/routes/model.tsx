import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { WhatIfSimulator } from "@/components/WhatIfSimulator";
import { useStudent } from "@/lib/store";
import { analyse, recommendPath } from "@/lib/ml";
import { generateStory } from "@/lib/story.functions";
import { FEATURE_LABEL, featuresFor, MODEL, predictStruggle } from "@/lib/struggle";

export const Route = createFileRoute("/model")({
  head: () => ({
    meta: [
      { title: "The learning model — Numeria" },
      { name: "description", content: "How Numeria's struggle-prediction model was trained on 11,667 student responses, its accuracy, and why it makes each prediction." },
      { property: "og:title", content: "The learning model — Numeria" },
      { property: "og:description", content: "Training data, evaluation metrics and explanations for Numeria's adaptive maths model." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ModelPage,
});

const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;
const M = MODEL.metrics;

function ModelPage() {
  const s = useStudent();
  const [story, setStory] = useState<string | null>(null);
  const [storyState, setStoryState] = useState<"idle" | "loading" | "error">("idle");
  const coefs = MODEL.features.map((f, k) => ({ f, w: MODEL.coef[k]! })).sort((a, b) => Math.abs(b.w) - Math.abs(a.w));
  const maxW = Math.max(...coefs.map((c) => Math.abs(c.w)));
  const gbi = Object.entries(MODEL.gbImportance).sort((a, b) => b[1] - a[1]);
  const [[tn, fp], [fn, tp]] = MODEL.confusion as [[number, number], [number, number]];

  let explain: { topic: string; p: number; contrib: { name: string; value: number; logit: number }[] } | null = null;
  let analysis: ReturnType<typeof analyse> | null = null;
  let path: ReturnType<typeof recommendPath> = [];
  if (s?.diagnostic) {
    const hist = [...s.diagnostic.interactions, ...(s.practice ?? [])];
    analysis = analyse(hist, s.diagnostic.interactions);
    path = recommendPath(analysis);
    const top = path[0];
    if (top) explain = { topic: top.topic, ...predictStruggle(featuresFor(hist, s.diagnostic.interactions, top.topic, "medium")) };
  }

  const tellStory = async () => {
    if (!s || !analysis) return;
    setStoryState("loading");
    setStory(null);
    try {
      const byMastery = [...analysis.topics].sort((a, b) => b.mastery - a.mastery);
      const { story: text } = await generateStory({
        data: {
          name: s.name,
          villageName: s.villageName,
          grade: s.grade,
          xp: s.xp,
          coins: s.coins,
          badges: s.badges,
          overallMastery: analysis.overall,
          strongest: byMastery.slice(0, 3).map((t) => ({ topic: t.topic, mastery: t.mastery })),
          weakest: byMastery.slice(-3).reverse().map((t) => ({ topic: t.topic, mastery: t.mastery, risk: t.risk })),
          nextLesson: path[0] ? { topic: path[0].topic, action: path[0].action, reason: path[0].reason } : null,
          buildings: s.village?.length ?? 0,
          questionsAnswered: (s.diagnostic?.interactions.length ?? 0) + (s.practice?.length ?? 0),
        },
      });
      setStory(text);
      setStoryState("idle");
    } catch (e) {
      console.error(e);
      setStoryState("error");
    }
  };

  return (
    <Shell>
      <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Machine learning</p>
      <h1 className="mt-1 font-display text-4xl font-semibold">The struggle-prediction model</h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">
        A logistic-regression classifier predicts whether a student will struggle on their next question. It sets the lesson order,
        the practice difficulty and the "struggle risk" shown during practice.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Training rows", MODEL.data.rows.toLocaleString()],
          ["Students", String(MODEL.data.students)],
          ["Train / test split", `${MODEL.data.train.toLocaleString()} / ${MODEL.data.test.toLocaleString()}`],
          ["Struggle rate", pct(MODEL.data.struggleRate, 1)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border bg-card p-5"><p className="text-xs text-muted-foreground">{k}</p><p className="mt-1 font-display text-2xl">{v}</p></div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Split by student (no student appears in both sets) so test scores reflect unseen learners.</p>

      <h2 className="mt-10 mb-4 font-display text-2xl font-semibold">Evaluation on held-out students</h2>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card p-6">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="pb-2">Model</th><th>ROC AUC ↑</th><th>Accuracy ↑</th><th>Brier score ↓</th></tr></thead>
          <tbody>
            {([["Logistic regression (deployed)", M.logreg], ["Gradient boosting (comparison)", M.gboost], ["Baseline (always guess majority)", M.baseline]] as const).map(([n, m]) => (
              <tr key={n} className="border-t border-border"><td className="py-2 font-medium">{n}</td><td>{m.auc.toFixed(3)}</td><td>{pct(m.acc, 1)}</td><td>{m.brier.toFixed(3)}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">Logistic regression matched the more complex model, so it was deployed: it is simpler, runs instantly in the browser and every prediction can be explained.</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold">What drives struggle (coefficients)</h3>
          <p className="mb-4 text-xs text-muted-foreground">Standardised weights. Right = raises struggle risk; left = lowers it.</p>
          {coefs.map(({ f, w }) => (
            <div key={f} className="mb-2 grid grid-cols-[150px_1fr_48px] items-center gap-2 text-xs">
              <span>{FEATURE_LABEL[f]}</span>
              <div className="relative h-3 rounded bg-muted">
                <div className="absolute top-0 h-full w-px bg-border" style={{ left: "50%" }} />
                <div className={`absolute top-0 h-full rounded ${w > 0 ? "bg-destructive" : "bg-success"}`} style={{ left: w > 0 ? "50%" : `${50 - (Math.abs(w) / maxW) * 50}%`, width: `${(Math.abs(w) / maxW) * 50}%` }} />
              </div>
              <span className="text-right font-mono">{w.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold">Feature importance (gradient boosting)</h3>
          <p className="mb-4 text-xs text-muted-foreground">A second view from the comparison model.</p>
          {gbi.map(([f, v]) => (
            <div key={f} className="mb-2 grid grid-cols-[150px_1fr_48px] items-center gap-2 text-xs">
              <span>{FEATURE_LABEL[f]}</span>
              <div className="h-3 rounded bg-muted"><div className="h-full rounded bg-primary" style={{ width: `${(v / gbi[0]![1]) * 100}%` }} /></div>
              <span className="text-right font-mono">{pct(v)}</span>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold">Confusion matrix (threshold 0.5)</h3>
          <div className="mt-4 grid grid-cols-[auto_1fr_1fr] gap-2 text-center text-sm">
            <span /><span className="text-xs text-muted-foreground">Predicted OK</span><span className="text-xs text-muted-foreground">Predicted struggle</span>
            <span className="self-center text-xs text-muted-foreground">Actually OK</span><span className="rounded-lg bg-success/15 p-4 font-display text-xl">{tn}</span><span className="rounded-lg bg-destructive/10 p-4 font-display text-xl">{fp}</span>
            <span className="self-center text-xs text-muted-foreground">Actually struggled</span><span className="rounded-lg bg-destructive/10 p-4 font-display text-xl">{fn}</span><span className="rounded-lg bg-success/15 p-4 font-display text-xl">{tp}</span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Recall on struggles: {pct(tp / (tp + fn))} · Precision: {pct(tp / (tp + fp))}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold">Calibration</h3>
          <p className="mb-4 text-xs text-muted-foreground">When the model says X%, how often students really struggled.</p>
          {MODEL.calibration.map((b) => (
            <div key={b.pred} className="mb-2 grid grid-cols-[90px_1fr] items-center gap-2 text-xs">
              <span>Said {pct(b.pred)}</span>
              <div className="relative h-4 rounded bg-muted">
                <div className="h-full rounded bg-primary/70" style={{ width: pct(b.obs) }} />
                <span className="absolute inset-y-0 right-2 flex items-center">Real {pct(b.obs)} · n={b.n}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <h2 className="mt-10 mb-4 font-display text-2xl font-semibold">Model explanation for your next lesson</h2>
      {explain ? (
        <div className="rounded-2xl border border-border bg-card p-6">
          <p><b>{explain.topic}</b> — predicted struggle risk <b>{pct(explain.p)}</b> on a medium question.</p>
          <table className="mt-4 w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="pb-2">Your signal</th><th>Value</th><th>Effect on risk</th></tr></thead>
            <tbody>
              {[...explain.contrib].sort((a, b) => Math.abs(b.logit) - Math.abs(a.logit)).map((c) => (
                <tr key={c.name} className="border-t border-border">
                  <td className="py-2">{FEATURE_LABEL[c.name]}</td>
                  <td className="font-mono">{Number.isInteger(c.value) ? c.value : c.value.toFixed(2)}</td>
                  <td className={c.logit > 0.02 ? "text-destructive" : c.logit < -0.02 ? "text-success" : "text-muted-foreground"}>{c.logit > 0 ? "▲ raises" : "▼ lowers"} ({c.logit >= 0 ? "+" : ""}{c.logit.toFixed(2)})</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted-foreground"><Link to={s ? "/diagnostic" : "/onboarding"} className="text-primary underline">Take the diagnostic</Link> to see a personal explanation.</p>
      )}
    </Shell>
  );
}
