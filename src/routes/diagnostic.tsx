import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { saveStudent, useStudent } from "@/lib/store";
import { buildDiagnostic, DOMAINS } from "@/lib/questions";
import { rewardFor, type Interaction } from "@/lib/ml";

export const Route = createFileRoute("/diagnostic")({
  head: () => ({
    meta: [
      { title: "Diagnostic test — Numeria" },
      { name: "description", content: "Multi-topic maths diagnostic measuring your baseline across difficulty levels." },
      { property: "og:title", content: "Diagnostic test — Numeria" },
      { property: "og:description", content: "Measure your baseline maths mastery." },
    ],
  }),
  component: Diagnostic,
});

const MAX_ATTEMPTS = 2;

function Diagnostic() {
  const s = useStudent();
  const nav = useNavigate();
  const qs = useMemo(() => (s ? buildDiagnostic(s.domains) : []), [s?.domains.join()]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [hint, setHint] = useState(false);
  const [done, setDone] = useState<"right" | "wrong" | null>(null);
  const [log, setLog] = useState<Interaction[]>([]);
  const start = useRef(Date.now());
  const [tick, setTick] = useState(0);

  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(t); }, []);

  if (s === undefined) return <Shell><div /></Shell>;
  if (!s) return <Shell><p>Please <Link to="/onboarding" className="text-primary underline">create a profile</Link> first.</p></Shell>;

  const q = qs[idx];
  const elapsed = Math.floor((Date.now() - start.current) / 1000);
  void tick;

  const submit = () => {
    if (picked === null || done) return;
    const a = attempts + 1;
    setAttempts(a);
    const correct = picked === q.answer;
    if (correct || a >= MAX_ATTEMPTS) {
      setDone(correct ? "right" : "wrong");
      setLog((l) => [...l, { qid: q.id, domain: q.domain, topic: q.topic, difficulty: q.difficulty, correct: correct && a === 1 ? true : correct, attempts: a, hintsUsed: hint ? 1 : 0, timeMs: Date.now() - start.current }]);
    } else {
      setDone(null);
      setPicked(null);
    }
  };

  const advance = () => {
    if (idx + 1 >= qs.length) {
      const { xp, coins } = rewardFor(log);
      saveStudent({ ...s, xp: s.xp + xp, coins: s.coins + coins, badges: [...new Set([...s.badges, "Cartographer of the Mind"])], diagnostic: { interactions: log, completedAt: new Date().toISOString() } });
      nav({ to: "/results" });
      return;
    }
    setIdx(idx + 1); setPicked(null); setAttempts(0); setHint(false); setDone(null);
    start.current = Date.now();
  };

  const dom = DOMAINS.find((d) => d.id === q.domain)!;
  const diffColor = { easy: "bg-success/15 text-success", medium: "bg-warning/20 text-warning-foreground", hard: "bg-destructive/15 text-destructive" }[q.difficulty];

  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>Question {idx + 1} of {qs.length}</span>
          <span className="font-mono">⏱ {elapsed}s</span>
        </div>
        <div className="mb-8 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${(idx / qs.length) * 100}%` }} />
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
          <div className="mb-5 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-muted px-3 py-1">{dom.glyph} {dom.name}</span>
            <span className="rounded-full bg-accent px-3 py-1 text-accent-foreground">{q.topic}</span>
            <span className={`rounded-full px-3 py-1 uppercase ${diffColor}`}>{q.difficulty}</span>
          </div>
          <p className="font-math text-2xl leading-snug md:text-3xl">{q.prompt}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {q.options.map((o, i) => {
              const state = done && i === q.answer ? "border-success bg-success/10" : done === "wrong" && i === picked ? "border-destructive bg-destructive/10" : picked === i ? "border-primary bg-accent/50" : "border-border hover:border-primary/50";
              return (
                <button key={i} disabled={!!done} onClick={() => setPicked(i)} className={`rounded-xl border-2 px-4 py-3 text-left font-math text-lg transition ${state}`}>
                  <span className="mr-3 font-sans text-sm text-muted-foreground">{"ABCD"[i]}</span>{o}
                </button>
              );
            })}
          </div>
          {hint && <p className="mt-5 rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">💡 {q.hint}</p>}
          {attempts > 0 && !done && <p className="mt-4 text-sm text-destructive">Not quite — one more try.</p>}
          {done && <p className={`mt-5 font-semibold ${done === "right" ? "text-success" : "text-destructive"}`}>{done === "right" ? "Correct! ✨" : `The answer is ${q.options[q.answer]}.`}</p>}
          <div className="mt-6 flex items-center justify-between">
            <button onClick={() => setHint(true)} disabled={hint || !!done} className="text-sm font-medium text-primary disabled:text-muted-foreground">Use a hint</button>
            {done ? (
              <button onClick={advance} className="rounded-lg bg-primary px-6 py-2.5 font-semibold text-primary-foreground">{idx + 1 >= qs.length ? "See my results" : "Next →"}</button>
            ) : (
              <button onClick={submit} disabled={picked === null} className="rounded-lg bg-primary px-6 py-2.5 font-semibold text-primary-foreground disabled:opacity-40">Check</button>
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">Tracking time, attempts, hints and correctness to build your baseline profile.</p>
      </div>
    </Shell>
  );
}
