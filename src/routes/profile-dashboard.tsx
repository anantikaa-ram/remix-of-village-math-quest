import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { useStudent } from "@/lib/store";
import { analyse } from "@/lib/ml";

export const Route = createFileRoute("/profile-dashboard")({
  head: () => ({
    meta: [
      { title: "Teacher Dashboard for My Profile — Numeria" },
      { name: "description", content: "Your strong topics, weak topics and the predicted score you'd get with your current knowledge." },
      { property: "og:title", content: "Teacher Dashboard — Numeria" },
      { property: "og:description", content: "Strengths, weaknesses and ML-predicted test score for a student." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfileDashboard,
});

const pct = (x: number) => `${Math.round(x * 100)}%`;

function ProfileDashboard() {
  const s = useStudent();
  if (s === undefined) return <Shell><p className="text-muted-foreground">Loading…</p></Shell>;
  const diag = s?.diagnostic?.interactions ?? [];
  const all = [...diag, ...(s?.practice ?? [])];
  if (!s || !all.length) return <Shell><p>No diagnostic yet. <Link to="/diagnostic" className="text-primary underline">Take it first</Link>.</p></Shell>;

  const a = analyse(all, diag);
  const sorted = [...a.topics].sort((x, y) => y.mastery - x.mastery);
  const strong = sorted.filter((t) => t.mastery >= 0.7);
  const weak = [...sorted].reverse().filter((t) => t.mastery < 0.45 || t.risk > 0.55);
  const predicted = a.topics.reduce((t, x) => t + x.pCorrectNext, 0) / Math.max(1, a.topics.length);

  return (
    <Shell>
      <div className="mb-6 flex gap-2 text-sm">
        <Link to="/results" className="rounded-full bg-muted px-4 py-1.5 font-semibold hover:bg-accent">← My profile</Link>
        <span className="rounded-full bg-primary px-4 py-1.5 font-semibold text-primary-foreground">Teacher dashboard</span>
      </div>
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Teacher dashboard</p>
      <h1 className="font-display text-4xl font-semibold">{s.avatar} {s.name} · {s.grade}</h1>

      <div className="mt-6 rounded-2xl bg-primary p-7 text-primary-foreground">
        <p className="text-sm uppercase tracking-[0.2em] opacity-80">Predicted test score with current knowledge</p>
        <p className="mt-2 font-display text-6xl font-semibold">{pct(predicted)}</p>
        <div className="mt-4 h-3 rounded-full bg-primary-foreground/25"><div className="h-full rounded-full bg-primary-foreground" style={{ width: pct(predicted) }} /></div>
        <p className="mt-2 text-sm opacity-85">Estimated by the trained ML model across all {a.topics.length} topics.</p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl bg-success/10 p-5">
          <h2 className="text-lg font-semibold text-success">Strong topics</h2>
          {strong.length ? strong.map((t) => (
            <div key={t.topic} className="mt-2 flex justify-between border-b border-border py-1"><span>{t.topic}</span><b>{pct(t.mastery)}</b></div>
          )) : <p className="mt-2 text-muted-foreground">None yet — keep practising.</p>}
        </section>
        <section className="rounded-2xl bg-destructive/10 p-5">
          <h2 className="text-lg font-semibold text-destructive">Weak topics</h2>
          {weak.length ? weak.map((t) => (
            <div key={t.topic} className="mt-2 flex justify-between border-b border-border py-1"><span>{t.topic}</span><span><b>{pct(t.mastery)}</b> <span className="text-xs text-muted-foreground">({pct(t.risk)} struggle risk)</span></span></div>
          )) : <p className="mt-2 text-muted-foreground">No weak topics.</p>}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Predicted score per topic</h2>
        <table className="mt-2 w-full text-sm">
          <tbody>
            {[...a.topics].sort((x, y) => x.pCorrectNext - y.pCorrectNext).map((t) => (
              <tr key={t.topic} className="border-t border-border"><td className="py-1.5">{t.topic}</td><td>mastery {pct(t.mastery)}</td><td className="text-right font-semibold">{pct(t.pCorrectNext)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </Shell>
  );
}
