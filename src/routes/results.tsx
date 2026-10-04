import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { Shell } from "@/components/Shell";
import { saveStudent, signOut, useStudent } from "@/lib/store";
import { DOMAINS } from "@/lib/questions";
import { analyse, recommendPath, rewardFor } from "@/lib/ml";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Your baseline & learning path — Numeria" },
      { name: "description", content: "Topic-by-topic mastery, ML predictions and your personalised learning path." },
      { property: "og:title", content: "Your baseline & learning path — Numeria" },
      { property: "og:description", content: "See your mastery profile and recommended path." },
    ],
  }),
  component: Results,
});

const pct = (x: number) => `${Math.round(x * 100)}%`;

function Results() {
  const s = useStudent();
  const nav = useNavigate();
  const inter = s?.diagnostic?.interactions;
  const a = useMemo(() => (inter ? analyse([...inter, ...(s?.practice ?? [])], inter) : null), [inter]);
  if (s === undefined) return <Shell><div /></Shell>;
  if (!s || !a || !inter) return <Shell><p>No diagnostic yet. <Link to={s ? "/diagnostic" : "/onboarding"} className="text-primary underline">Start here</Link>.</p></Shell>;

  const path = recommendPath(a);
  const reward = rewardFor(inter);
  const strong = a.topics.filter((t) => t.mastery >= 0.7);
  const weak = a.topics.filter((t) => t.mastery < 0.45);
  const name = (id: string) => DOMAINS.find((d) => d.id === id)!;
  const levelCls = { Weak: "text-destructive", Developing: "text-warning-foreground", Strong: "text-success" };
  const actionCls = { Remediate: "bg-destructive/15 text-destructive", Practice: "bg-warning/20 text-warning-foreground", Challenge: "bg-success/15 text-success" };

  return (
    <Shell>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-primary p-7 text-primary-foreground lg:col-span-2">
          <p className="text-sm uppercase tracking-[0.2em] opacity-80">{s.avatar} {s.name} · {s.grade}</p>
          <h1 className="mt-2 font-display text-4xl font-semibold">Baseline mastery: {pct(a.overall)}</h1>
          <p className="mt-2 opacity-85">The village of <b>{s.villageName}</b> has been mapped. Here is where your journey begins.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <p className="font-display text-lg">Rewards earned</p>
          <div className="mt-3 flex gap-3">
            <div className="flex-1 rounded-lg bg-accent p-3 text-center"><p className="text-2xl font-bold">+{reward.xp}</p><p className="text-xs">XP</p></div>
            <div className="flex-1 rounded-lg bg-secondary p-3 text-center"><p className="text-2xl font-bold">+{reward.coins}</p><p className="text-xs">Coins</p></div>
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-dashed border-primary p-3">
            <span className="text-3xl">🧭</span>
            <div><p className="text-sm font-semibold">Cartographer of the Mind</p><p className="text-xs text-muted-foreground">First diagnostic complete</p></div>
          </div>
        </div>
      </div>

      <h2 className="mt-10 mb-4 font-display text-2xl font-semibold">Domain profile</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {a.domains.map((d) => (
          <div key={d.domain} className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm font-semibold">{name(d.domain).glyph} {name(d.domain).name}</p>
            <p className="mt-2 font-display text-3xl">{pct(d.mastery)}</p>
            <p className={`text-sm font-semibold ${levelCls[d.level]}`}>{d.level}</p>
            <div className="mt-3 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: pct(d.mastery) }} /></div>
            <dl className="mt-3 grid grid-cols-3 gap-1 text-xs text-muted-foreground">
              <div><dt>Accuracy</dt><dd className="font-semibold text-foreground">{pct(d.accuracy)}</dd></div>
              <div><dt>Avg time</dt><dd className="font-semibold text-foreground">{d.avgTimeS.toFixed(1)}s</dd></div>
              <div><dt>Hints/q</dt><dd className="font-semibold text-foreground">{d.hintRate.toFixed(2)}</dd></div>
            </dl>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-semibold">Topic predictions</h2>
          <p className="mb-4 text-xs text-muted-foreground">Mastery estimate · P(correct) and struggle risk from the trained model</p>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="pb-2">Topic</th><th>Mastery</th><th>P(correct)</th><th>Risk</th></tr></thead>
            <tbody>
              {[...a.topics].sort((x, y) => x.mastery - y.mastery).map((t) => (
                <tr key={t.domain + t.topic} className="border-t border-border">
                  <td className="py-2 font-medium">{t.topic}</td>
                  <td>{pct(t.mastery)}</td>
                  <td>{pct(t.pCorrectNext)}</td>
                  <td><span className={t.risk > 0.55 ? "font-semibold text-destructive" : t.risk > 0.3 ? "text-warning-foreground" : "text-success"}>{pct(t.risk)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-success/10 p-3"><p className="font-semibold text-success">Strong</p><p>{strong.map((t) => t.topic).join(", ") || "—"}</p></div>
            <div className="rounded-lg bg-destructive/10 p-3"><p className="font-semibold text-destructive">Needs work</p><p>{weak.map((t) => t.topic).join(", ") || "—"}</p></div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-semibold">Your learning path</h2>
          <p className="mb-4 text-xs text-muted-foreground">Ordered by predicted struggle risk</p>
          <ol className="space-y-3">
            {path.map((p, i) => (
              <li key={p.domain + p.topic} className="flex gap-4">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-sm ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{i + 1}</span>
                <div className="flex-1 border-b border-border pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{p.topic}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${actionCls[p.action]}`}>{p.action}</span>
                    <span className="text-xs uppercase text-muted-foreground">{p.difficulty}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{p.reason}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/learn" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Start my lessons →</Link>
        <button onClick={() => { const { diagnostic: _d, ...rest } = s; saveStudent(rest); nav({ to: "/diagnostic" }); }} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium">Retake diagnostic</button>
        <button onClick={async () => { await signOut(); nav({ to: "/" }); }} className="rounded-lg px-5 py-2.5 text-sm font-medium text-muted-foreground">Sign out</button>
      </div>
    </Shell>
  );
}
