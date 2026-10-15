import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Student } from "@/lib/store";
import { analyse } from "@/lib/ml";
import { structureById } from "@/lib/village";

export const Route = createFileRoute("/teacher")({
  head: () => ({
    meta: [
      { title: "Teacher Dashboard — Numeria" },
      { name: "description", content: "See each student's strong and weak maths topics and their ML-predicted test score." },
      { property: "og:title", content: "Teacher Dashboard — Numeria" },
      { property: "og:description", content: "Class-wide strengths, weaknesses and predicted scores." },
    ],
  }),
  component: TeacherPage,
});

type Klass = { id: string; name: string; code: string };
type Row = { id: string; s: Student | null };
const pct = (x: number) => `${Math.round(x * 100)}%`;
const makeCode = () => Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");

/** Predicted test score = mean model P(correct) on a medium item across the student's topics. */
function summarise(s: Student) {
  const diag = s.diagnostic?.interactions ?? [];
  const all = [...diag, ...(s.practice ?? [])];
  if (!all.length) return null;
  const a = analyse(all, diag);
  const sorted = [...a.topics].sort((x, y) => y.mastery - x.mastery);
  const predicted = a.topics.reduce((t, x) => t + x.pCorrectNext, 0) / Math.max(1, a.topics.length);
  return {
    a, predicted,
    strong: sorted.filter((t) => t.mastery >= 0.7),
    weak: [...sorted].reverse().filter((t) => t.mastery < 0.45 || t.risk > 0.55),
  };
}

function TeacherPage() {
  const auth = useAuth();
  const [classes, setClasses] = useState<Klass[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [newName, setNewName] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    const { data, error } = await supabase.from("classes").select("id,name,code").order("created_at");
    if (error) return setErr(error.message);
    setClasses(data ?? []);
    setActive((a) => a ?? data?.[0]?.id ?? null);
  }, []);

  useEffect(() => { if (auth.status === "signedIn") void loadClasses(); }, [auth.status, loadClasses]);

  useEffect(() => {
    if (!active) { setRows([]); return; }
    void (async () => {
      const { data: m } = await supabase.from("class_members").select("student_id").eq("class_id", active);
      const ids = (m ?? []).map((x) => x.student_id);
      if (!ids.length) return setRows([]);
      const { data: p } = await supabase.from("student_profiles").select("user_id,data").in("user_id", ids);
      setRows(ids.map((id) => ({ id, s: (p?.find((x) => x.user_id === id)?.data as unknown as Student) ?? null })));
    })();
  }, [active]);

  async function createClass() {
    if (!newName.trim() || !auth.userId) return;
    const { error } = await supabase.from("classes").insert({ name: newName.trim(), code: makeCode(), teacher_id: auth.userId });
    if (error) return setErr(error.message);
    setNewName(""); setActive(null); await loadClasses();
  }

  if (auth.status === "loading") return <Shell><p className="text-muted-foreground">Loading…</p></Shell>;
  if (auth.status === "signedOut") return <Shell><p>Please <Link to="/auth" className="text-primary underline">sign in</Link> to open the teacher dashboard.</p></Shell>;

  const current = classes.find((c) => c.id === active);
  const sums = rows.map((r) => ({ ...r, sum: r.s ? summarise(r.s) : null }));
  const scored = sums.filter((r) => r.sum);
  const classAvg = scored.length ? scored.reduce((t, r) => t + r.sum!.predicted, 0) / scored.length : null;

  return (
    <Shell>
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Teacher dashboard</p>
      <h1 className="font-display text-4xl font-semibold">Your classes</h1>
      {err && <p role="alert" className="mt-3 text-sm text-destructive">{err}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {classes.map((c) => (
          <button key={c.id} onClick={() => setActive(c.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${c.id === active ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{c.name}</button>
        ))}
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New class name"
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm" />
        <button onClick={() => void createClass()} className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-semibold text-secondary-foreground">+ Create class</button>
      </div>

      {current && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Stat label="Class join code" value={current.code} hint="Students enter this on their Profile page" />
            <Stat label="Students" value={String(rows.length)} />
            <Stat label="Avg predicted score" value={classAvg == null ? "—" : pct(classAvg)} hint="From the trained ML model" />
          </div>

          {rows.length === 0 ? (
            <p className="mt-8 rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
              No students yet. Share the code <b className="font-mono text-foreground">{current.code}</b> with your class.
            </p>
          ) : (
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {sums.map(({ id, s, sum }) => (
                <article key={id} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{s?.avatar ?? "🙂"}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{s?.name ?? "New student"}</p>
                      <p className="text-xs text-muted-foreground">{s ? `${s.grade} · ${s.villageName} · ${s.village?.length ?? 0} buildings` : "Hasn't set up a profile"}</p>
                    </div>
                    {sum && (
                      <div className="text-right">
                        <p className="font-display text-3xl text-primary">{pct(sum.predicted)}</p>
                        <p className="text-xs text-muted-foreground">predicted score</p>
                      </div>
                    )}
                  </div>
                  {!sum ? (
                    <p className="mt-4 text-sm text-muted-foreground">No diagnostic taken yet.</p>
                  ) : (
                    <>
                      <div className="mt-4 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: pct(sum.predicted) }} /></div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg bg-success/10 p-3">
                          <p className="font-semibold text-success">Strong</p>
                          {sum.strong.length ? sum.strong.map((t) => <p key={t.topic}>{t.topic} · {pct(t.mastery)}</p>) : <p className="text-muted-foreground">None yet</p>}
                        </div>
                        <div className="rounded-lg bg-destructive/10 p-3">
                          <p className="font-semibold text-destructive">Weak</p>
                          {sum.weak.length ? sum.weak.map((t) => <p key={t.topic}>{t.topic} · {pct(t.mastery)} <span className="text-xs text-muted-foreground">({pct(t.risk)} risk)</span></p>) : <p className="text-muted-foreground">None</p>}
                        </div>
                      </div>
                      <details className="mt-3 text-sm">
                        <summary className="cursor-pointer text-muted-foreground">Topic-by-topic predicted score</summary>
                        <table className="mt-2 w-full">
                          <tbody>
                            {[...sum.a.topics].sort((x, y) => x.pCorrectNext - y.pCorrectNext).map((t) => (
                              <tr key={t.topic} className="border-t border-border"><td className="py-1">{t.topic}</td><td>mastery {pct(t.mastery)}</td><td className="font-semibold">{pct(t.pCorrectNext)}</td></tr>
                            ))}
                          </tbody>
                        </table>
                        {!!s?.village?.length && <p className="mt-2 text-xs text-muted-foreground">Village: {s.village.map((v) => structureById(v.id)?.name ?? v.id).join(", ")}</p>}
                      </details>
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}
      {!classes.length && <p className="mt-8 text-muted-foreground">Create your first class to get a join code.</p>}
    </Shell>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-3xl font-mono">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
