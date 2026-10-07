import { useMemo, useState } from "react";
import { FEATURE_LABEL, MODEL, predictStruggle, type FeatureName } from "@/lib/struggle";

interface SliderDef {
  name: FeatureName;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

const SLIDERS: SliderDef[] = [
  { name: "diagnostic_baseline_score", min: 0, max: 1, step: 0.05, format: pct },
  { name: "difficulty_level", min: 1, max: 3, step: 1, format: (v) => ["", "Easy", "Medium", "Hard"][v]! },
  { name: "topic_historical_accuracy", min: 0, max: 1, step: 0.05, format: pct },
  { name: "recent_window_accuracy", min: 0, max: 1, step: 0.05, format: pct },
  { name: "current_streak", min: 0, max: 10, step: 1, format: (v) => `${v}` },
  { name: "consecutive_errors", min: 0, max: 8, step: 1, format: (v) => `${v}` },
  { name: "hints_used", min: 0, max: 5, step: 1, format: (v) => `${v}` },
  { name: "days_since_last_practice", min: 0, max: 14, step: 1, format: (v) => `${v}d` },
];

function defaults(): Record<FeatureName, number> {
  const f = {} as Record<FeatureName, number>;
  MODEL.features.forEach((name, k) => {
    f[name] = MODEL.mean[k] ?? 0;
  });
  return f;
}

/** Interactive what-if playground: drag telemetry sliders, watch the struggle prediction react live. */
export function WhatIfSimulator() {
  const [values, setValues] = useState<Record<FeatureName, number>>(defaults);

  const { p, contrib } = useMemo(() => predictStruggle(values), [values]);
  const top = useMemo(() => [...contrib].sort((a, b) => Math.abs(b.logit) - Math.abs(a.logit)).slice(0, 3), [contrib]);

  const verdict = p <= 0.35 ? "Comfort zone — likely fine" : p <= 0.6 ? "Productive struggle — good learning zone" : "High risk — the model would ease off";

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {SLIDERS.map((s) => (
            <div key={s.name} className="mb-4">
              <div className="mb-1 flex items-center justify-between text-sm">
                <label htmlFor={`whatif-${s.name}`}>{FEATURE_LABEL[s.name]}</label>
                <span className="font-mono text-xs text-muted-foreground">{s.format(values[s.name] ?? s.min)}</span>
              </div>
              <input
                id={`whatif-${s.name}`}
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={values[s.name]}
                onChange={(e) => setValues((v) => ({ ...v, [s.name]: Number(e.target.value) }))}
                className="w-full accent-primary"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setValues(defaults())}
            className="mt-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
          >
            Reset to average student
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-muted p-5 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Predicted struggle risk</p>
            <p className="mt-1 font-display text-5xl font-semibold">{pct(p)}</p>
            <p className={`mt-2 text-sm font-medium ${p <= 0.6 ? "text-success" : "text-destructive"}`}>{verdict}</p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-background">
              <div
                className={`h-full rounded-full transition-all ${p <= 0.35 ? "bg-success" : p <= 0.6 ? "bg-primary" : "bg-destructive"}`}
                style={{ width: pct(p) }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">The app picks the hardest difficulty keeping this at or under 60%.</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Biggest influences right now</p>
            {top.map((c) => (
              <div key={c.name} className="flex items-center justify-between py-1 text-sm">
                <span>{FEATURE_LABEL[c.name]}</span>
                <span className={c.logit > 0.02 ? "text-destructive" : c.logit < -0.02 ? "text-success" : "text-muted-foreground"}>
                  {c.logit > 0 ? "▲" : "▼"} {c.logit >= 0 ? "+" : ""}
                  {c.logit.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
