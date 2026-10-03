import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Shell } from "@/components/Shell";
import { useStudent } from "@/lib/store";
import { DOMAINS } from "@/lib/questions";
import { analyse, recommendPath } from "@/lib/ml";
import { lessonByTopic, LESSONS } from "@/lib/curriculum";

export const Route = createFileRoute("/learn/")({
  head: () => ({
    meta: [
      { title: "Curriculum & lessons — Numeria" },
      { name: "description", content: "Your personalised maths curriculum, ordered by what you need most." },
      { property: "og:title", content: "Curriculum & lessons — Numeria" },
      { property: "og:description", content: "Interactive maths lessons tailored to your diagnostic results." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Learn,
});

const actionCls = { Remediate: "bg-destructive/15 text-destructive", Practice: "bg-warning/20 text-warning-foreground", Challenge: "bg-success/15 text-success" };

function Learn() {
  const s = useStudent();
  const all = useMemo(() => [...(s?.diagnostic?.interactions ?? []), ...(s?.practice ?? [])], [s]);
  if (s === undefined) return <Shell><div /></Shell>;
  if (!s?.diagnostic) return <Shell><p>Take the <Link to={s ? "/diagnostic" : "/onboarding"} className="text-primary underline">diagnostic</Link> first so we can tailor your lessons.</p></Shell>;

  const a = analyse(all, s.diagnostic.interactions);
  const path = recommendPath(a);
  const next = path[0];
  const done = s.lessonsDone ?? {};

  return (
    <Shell>
      <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Curriculum</p>
      <h1 className="mt-1 font-display text-4xl font-semibold">Your lessons, {s.name}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">Ordered by predicted struggle risk. Mastery updates after every practice session.</p>

      {next && (() => { const l = lessonByTopic(next.topic)!; return (
        <Link to="/learn/$slug" params={{ slug: l.slug }} className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-primary p-6 text-primary-foreground">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80">Up next · {next.action}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{next.topic}</p>
            <p className="text-sm opacity-85">{next.reason}</p>
          </div>
          <span className="rounded-lg bg-primary-foreground px-5 py-2.5 font-semibold text-primary">Start lesson →</span>
        </Link>
      ); })()}

      {DOMAINS.filter((d) => s.domains.includes(d.id)).map((d) => (
        <section key={d.id} className="mt-10">
          <h2 className="mb-4 font-display text-xl font-semibold">{d.glyph} {d.name} <span className="text-sm font-normal text-muted-foreground">· {d.building}</span></h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LESSONS.filter((l) => l.domain === d.id).map((l) => {
              const t = a.topics.find((x) => x.topic === l.topic);
              const p = path.find((x) => x.topic === l.topic);
              const m = t ? Math.round(t.mastery * 100) : 0;
              const st = done[l.slug]?.stars ?? 0;
              return (
                <Link key={l.slug} to="/learn/$slug" params={{ slug: l.slug }} className="rounded-xl border border-border bg-card p-5 transition hover:border-primary">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{l.topic}</p>
                    {p && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${actionCls[p.action]}`}>{p.action}</span>}
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${m}%` }} /></div>
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>Mastery {m}%</span>
                    <span>{"★".repeat(st)}{"☆".repeat(3 - st)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </Shell>
  );
}
