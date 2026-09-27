import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { useStudent } from "@/lib/store";
import { DOMAINS } from "@/lib/questions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Numeria — Adaptive Maths Village" },
      { name: "description", content: "An ML-driven, gamified mathematics platform: diagnose, learn, and build your village." },
      { property: "og:title", content: "Numeria — Adaptive Maths Village" },
      { property: "og:description", content: "Diagnose, learn and build a village with adaptive, ML-powered maths." },
    ],
  }),
  component: Index,
});

const CYCLE = ["Onboard", "Diagnose", "Learn", "Play", "Assess", "Analyse", "Predict", "Adapt"];

function Index() {
  const s = useStudent();
  const next = !s ? "/onboarding" : s.diagnostic ? "/results" : "/diagnostic";
  const label = !s ? "Found your village" : s.diagnostic ? "View my learning path" : "Take the diagnostic";
  return (
    <Shell>
      <section className="grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Adaptive mathematics</p>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] md:text-6xl">
            Every problem you solve lays a <em className="text-primary">stone</em> in your village.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            A diagnostic test maps what you know. A learning model predicts what you're ready for next. Rewards build the town.
          </p>
          <Link to={next} className="mt-8 inline-flex rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-[var(--shadow-pop)] transition hover:translate-y-[-2px]">
            {label} →
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <p className="mb-4 font-display text-lg">The learning cycle</p>
          <ol className="grid grid-cols-2 gap-2">
            {CYCLE.map((c, i) => (
              <li key={c} className={`rounded-lg px-3 py-2 text-sm ${i < 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <span className="mr-2 font-mono opacity-70">{String(i + 1).padStart(2, "0")}</span>{c}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">Module 1 live: onboarding & diagnostic.</p>
        </div>
      </section>
      <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DOMAINS.map((d) => (
          <div key={d.id} className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent font-display text-xl text-accent-foreground">{d.glyph}</div>
            <p className="font-semibold">{d.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{d.blurb}</p>
            <p className="mt-3 text-xs font-medium text-primary">Unlocks: {d.building}</p>
          </div>
        ))}
      </section>
    </Shell>
  );
}
