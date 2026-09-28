import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { saveStudent, useStudent } from "@/lib/store";
import { analyse, recommendPath, type Interaction } from "@/lib/ml";
import { lessonBySlug, PRACTICE_LEN, type PracticeItem } from "@/lib/curriculum";
import type { Difficulty } from "@/lib/questions";

export const Route = createFileRoute("/learn/$slug")({
  loader: ({ params }) => {
    const l = lessonBySlug(params.slug);
    if (!l) throw notFound();
    return { topic: l.topic, concept: l.concept };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Lesson not found — Numeria" }, { name: "robots", content: "noindex" }] };
    const t = `${loaderData.topic} lesson — Numeria`;
    return { meta: [
      { title: t }, { name: "description", content: loaderData.concept },
      { property: "og:title", content: t }, { property: "og:description", content: loaderData.concept },
      { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" },
    ] };
  },
  notFoundComponent: LessonNotFound,
  component: LessonPage,
});

function LessonNotFound() {
  return <Shell><p>Lesson not found. <Link to="/learn" className="text-primary underline">Back to curriculum</Link></p></Shell>;
}

const UP: Record<Difficulty, Difficulty> = { easy: "medium", medium: "hard", hard: "hard" };
const DOWN: Record<Difficulty, Difficulty> = { easy: "easy", medium: "easy", hard: "medium" };

function LessonPage() {
  const { slug } = Route.useParams();
  const lesson = lessonBySlug(slug)!;
  const s = useStudent();
  const [phase, setPhase] = useState<"learn" | "practice" | "done">("learn");
  const [revealed, setRevealed] = useState(1);
  const [result, setResult] = useState<Result | null>(null);

  const startDiff = useMemo<Difficulty>(() => {
    if (!s?.diagnostic) return "easy";
    const p = recommendPath(analyse([...s.diagnostic.interactions, ...(s.practice ?? [])])).find((x) => x.topic === lesson.topic);
    return p?.difficulty ?? "easy";
  }, [s, lesson.topic]);

  if (s === undefined) return <Shell><div /></Shell>;
  if (!s) return <Shell><p>Please <Link to="/onboarding" className="text-primary underline">create a profile</Link> first.</p></Shell>;

  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <Link to="/learn" className="text-sm text-muted-foreground hover:text-primary">← Curriculum</Link>
        <h1 className="mt-2 font-display text-4xl font-semibold">{lesson.topic}</h1>
        <div className="mt-4 flex gap-2 text-xs font-semibold">
          {(["learn", "practice", "done"] as const).map((p, i) => (
            <span key={p} className={`rounded-full px-3 py-1 ${phase === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}. {p === "learn" ? "Learn" : p === "practice" ? "Practice" : "Reward"}</span>
          ))}
        </div>

        {phase === "learn" && (
          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Key idea</p>
              <p className="mt-2 text-lg">{lesson.concept}</p>
              <ol className="mt-4 list-decimal space-y-1 pl-5 text-muted-foreground">{lesson.steps.map((x) => <li key={x}>{x}</li>)}</ol>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Worked example</p>
              <p className="mt-2 font-math text-2xl">{lesson.example.problem}</p>
              <ol className="mt-3 space-y-2">
                {lesson.example.solution.slice(0, revealed).map((x, i) => (
                  <li key={i} className="rounded-lg bg-secondary px-3 py-2 font-math text-secondary-foreground">{i + 1}. {x}</li>
                ))}
              </ol>
              {revealed < lesson.example.solution.length ? (
                <button onClick={() => setRevealed(revealed + 1)} className="mt-3 text-sm font-medium text-primary">Show next step →</button>
              ) : <p className="mt-3 text-sm text-success">Example complete ✓</p>}
            </div>
            <button onClick={() => setPhase("practice")} className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground">
              Start practice ({PRACTICE_LEN} questions · starting {startDiff})
            </button>
          </div>
        )}

        {phase === "practice" && <Practice key={slug} startDiff={startDiff} onDone={(log) => {
          const correct = log.filter((x) => x.correct && x.attempts === 1).length;
          const stars = correct >= 5 ? 3 : correct >= 4 ? 2 : correct >= 2 ? 1 : 0;
          const prev = s.lessonsDone?.[slug];
          const xp = 20 + correct * 10, coins = 10 + stars * 5;
          saveStudent({
            ...s, xp: s.xp + xp, coins: s.coins + coins,
            badges: stars === 3 ? [...new Set([...s.badges, `${lesson.topic} Master`])] : s.badges,
            practice: [...(s.practice ?? []), ...log],
            lessonsDone: { ...s.lessonsDone, [slug]: { best: Math.max(prev?.best ?? 0, correct), runs: (prev?.runs ?? 0) + 1, stars: Math.max(prev?.stars ?? 0, stars) } },
          });
          setResult({ correct, stars, xp, coins });
          setPhase("done");
        }} lessonSlug={slug} />}

        {phase === "done" && result && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
            <p className="text-5xl tracking-widest text-warning">{"★".repeat(result.stars)}<span className="text-muted">{"★".repeat(3 - result.stars)}</span></p>
            <p className="mt-3 font-display text-2xl font-semibold">{result.correct} / {PRACTICE_LEN} first-try correct</p>
            <div className="mt-4 flex justify-center gap-3">
              <span className="rounded-lg bg-accent px-4 py-2 font-bold">+{result.xp} XP</span>
              <span className="rounded-lg bg-secondary px-4 py-2 font-bold">+{result.coins} 🪙</span>
            </div>
            {result.stars === 3 && <p className="mt-3 text-sm font-semibold text-success">🏅 Badge earned: {lesson.topic} Master</p>}
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={() => { setRevealed(1); setPhase("practice"); }} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium">Practice again</button>
              <Link to="/learn" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Next lesson →</Link>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );

}

type Result = { correct: number; stars: number; xp: number; coins: number };

function Practice({ startDiff, onDone, lessonSlug }: { startDiff: Difficulty; onDone: (log: Interaction[]) => void; lessonSlug: string }) {
  const lesson = lessonBySlug(lessonSlug)!;
  const [diff, setDiff] = useState<Difficulty>(startDiff);
  const [item, setItem] = useState<PracticeItem>(() => lesson.gen(startDiff));
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [hint, setHint] = useState(false);
  const [done, setDone] = useState<"right" | "wrong" | null>(null);
  const [log, setLog] = useState<Interaction[]>([]);
  const t0 = useRef(Date.now());

  const check = () => {
    if (picked === null || done) return;
    const a = attempts + 1; setAttempts(a);
    const ok = picked === item.answer;
    if (ok || a >= 2) {
      setDone(ok ? "right" : "wrong");
      setLog((l) => [...l, { qid: `${lessonSlug}-${idx}`, domain: lesson.domain, topic: lesson.topic, difficulty: diff, correct: ok, attempts: a, hintsUsed: hint ? 1 : 0, timeMs: Date.now() - t0.current }]);
    } else setPicked(null);
  };

  const next = () => {
    if (idx + 1 >= PRACTICE_LEN) return onDone(log);
    // adaptive difficulty: step up on a clean first-try, step down on a miss
    const nd = done === "right" && attempts === 1 && !hint ? UP[diff] : done === "wrong" ? DOWN[diff] : diff;
    setDiff(nd); setItem(lesson.gen(nd)); setIdx(idx + 1);
    setPicked(null); setAttempts(0); setHint(false); setDone(null); t0.current = Date.now();
  };

  const diffColor = { easy: "bg-success/15 text-success", medium: "bg-warning/20 text-warning-foreground", hard: "bg-destructive/15 text-destructive" }[diff];

  return (
    <div className="mt-6">
      <div className="mb-3 flex justify-between text-sm text-muted-foreground">
        <span>Question {idx + 1} of {PRACTICE_LEN}</span>
        <span className={`rounded-full px-3 py-0.5 text-xs font-semibold uppercase ${diffColor}`}>{diff}</span>
      </div>
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${(idx / PRACTICE_LEN) * 100}%` }} /></div>
      <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <p className="font-math text-2xl leading-snug md:text-3xl">{item.prompt}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {item.options.map((o, i) => {
            const st = done && i === item.answer ? "border-success bg-success/10" : done === "wrong" && i === picked ? "border-destructive bg-destructive/10" : picked === i ? "border-primary bg-accent/50" : "border-border hover:border-primary/50";
            return <button key={i} disabled={!!done} onClick={() => setPicked(i)} className={`rounded-xl border-2 px-4 py-3 text-left font-math text-lg transition ${st}`}><span className="mr-3 font-sans text-sm text-muted-foreground">{"ABCD"[i]}</span>{o}</button>;
          })}
        </div>
        {hint && !done && <p className="mt-5 rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">💡 {item.hint}</p>}
        {attempts > 0 && !done && <p className="mt-4 text-sm text-destructive">Not quite — one more try.</p>}
        {done && (
          <div className={`mt-5 rounded-lg p-3 text-sm ${done === "right" ? "bg-success/10" : "bg-destructive/10"}`}>
            <p className={`font-semibold ${done === "right" ? "text-success" : "text-destructive"}`}>{done === "right" ? "Correct! ✨" : `The answer is ${item.options[item.answer]}.`}</p>
            <p className="mt-1 font-math">{item.explain}</p>
          </div>
        )}
        <div className="mt-6 flex items-center justify-between">
          <button onClick={() => setHint(true)} disabled={hint || !!done} className="text-sm font-medium text-primary disabled:text-muted-foreground">Use a hint</button>
          {done
            ? <button onClick={next} className="rounded-lg bg-primary px-6 py-2.5 font-semibold text-primary-foreground">{idx + 1 >= PRACTICE_LEN ? "Finish" : "Next →"}</button>
            : <button onClick={check} disabled={picked === null} className="rounded-lg bg-primary px-6 py-2.5 font-semibold text-primary-foreground disabled:opacity-40">Check</button>}
        </div>
      </div>
    </div>
  );
}
