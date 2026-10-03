import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { saveStudent, useStudent } from "@/lib/store";
import { analyse } from "@/lib/ml";
import { DOMAINS } from "@/lib/questions";
import { GRID_H, GRID_W, STRUCTURES, structureById, type Structure } from "@/lib/village";

export const Route = createFileRoute("/village")({
  head: () => ({
    meta: [
      { title: "Your village — Numeria" },
      { name: "description", content: "Spend coins earned from maths practice to build your village. Structures unlock as your mastery grows." },
      { property: "og:title", content: "Your village — Numeria" },
      { property: "og:description", content: "Build a village powered by your maths mastery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Village,
});

function Village() {
  const s = useStudent();
  const [sel, setSel] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const mastery = useMemo(() => {
    const all = [...(s?.diagnostic?.interactions ?? []), ...(s?.practice ?? [])];
    const m = new Map<string, number>();
    if (all.length) for (const t of analyse(all, s?.diagnostic?.interactions ?? []).topics) m.set(t.topic, t.mastery);
    return m;
  }, [s]);

  if (s === undefined) return <Shell><div /></Shell>;
  if (!s?.diagnostic) return <Shell><p>Finish the <Link to={s ? "/diagnostic" : "/onboarding"} className="text-primary underline">diagnostic</Link> to found your village.</p></Shell>;

  const placed = s.village ?? [];
  const unlocked = (st: Structure) => s.domains.includes(st.domain) && (mastery.get(st.topic) ?? 0) >= st.minMastery;
  const at = (x: number, y: number) => placed.find((p) => p.x === x && p.y === y);
  const selected = sel ? structureById(sel) : undefined;

  const clickTile = (x: number, y: number) => {
    const here = at(x, y);
    if (here) {
      if (sel === "__remove") {
        const st = structureById(here.id)!;
        const refund = Math.floor(st.cost / 2);
        saveStudent({ ...s, coins: s.coins + refund, village: placed.filter((p) => p !== here) });
        setMsg(`Demolished ${st.name}. Refunded ${refund} 🪙.`);
      }
      return;
    }
    if (!selected) return setMsg("Pick a structure first.");
    if (s.coins < selected.cost) return setMsg(`Not enough coins — ${selected.name} costs ${selected.cost} 🪙. Practise lessons to earn more!`);
    saveStudent({ ...s, coins: s.coins - selected.cost, village: [...placed, { x, y, id: selected.id }], badges: placed.length === 0 ? [...new Set([...s.badges, "Village Founder"])] : s.badges });
    setMsg(`Built ${selected.name}! −${selected.cost} 🪙`);
  };

  return (
    <Shell>
      <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Village</p>
      <h1 className="mt-1 font-display text-4xl font-semibold">{s.villageName}</h1>
      <p className="mt-2 text-muted-foreground">{placed.length} structures · {s.coins} 🪙 to spend. Higher mastery unlocks grander buildings.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="grid gap-1.5 rounded-2xl border border-border bg-success/10 p-3" style={{ gridTemplateColumns: `repeat(${GRID_W}, minmax(0, 1fr))` }}>
            {Array.from({ length: GRID_W * GRID_H }, (_, i) => {
              const x = i % GRID_W, y = Math.floor(i / GRID_W), p = at(x, y), st = p && structureById(p.id);
              return (
                <button key={i} aria-label={st ? st.name : `Empty plot ${x + 1},${y + 1}`} title={st?.name} onClick={() => clickTile(x, y)}
                  className={`flex aspect-square items-center justify-center rounded-lg text-3xl transition ${st ? "bg-card shadow-sm" : "bg-card/40 hover:bg-accent"} ${sel === "__remove" && st ? "hover:bg-destructive/20" : ""}`}>
                  {st?.glyph}
                </button>
              );
            })}
          </div>
          {msg && <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">{msg}</p>}
        </div>

        <aside className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-semibold">Build</p>
            <button onClick={() => setSel(sel === "__remove" ? null : "__remove")} className={`rounded-full px-3 py-1 text-xs font-semibold ${sel === "__remove" ? "bg-destructive text-destructive-foreground" : "bg-muted"}`}>Demolish (50% refund)</button>
          </div>
          {DOMAINS.filter((d) => s.domains.includes(d.id)).map((d) => (
            <div key={d.id} className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{d.glyph} {d.building}</p>
              <div className="space-y-2">
                {STRUCTURES.filter((st) => st.domain === d.id).map((st) => {
                  const ok = unlocked(st), m = Math.round((mastery.get(st.topic) ?? 0) * 100);
                  return (
                    <button key={st.id} disabled={!ok} onClick={() => setSel(st.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border-2 p-2.5 text-left transition ${sel === st.id ? "border-primary bg-accent/50" : "border-border"} ${ok ? "hover:border-primary/50" : "opacity-60"}`}>
                      <span className={`text-2xl ${ok ? "" : "grayscale"}`}>{ok ? st.glyph : "🔒"}</span>
                      <span className="flex-1">
                        <span className="block text-sm font-semibold">{st.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {ok ? `${st.topic} · mastery ${m}%` : `Needs ${Math.round(st.minMastery * 100)}% in ${st.topic} (now ${m}%)`}
                        </span>
                      </span>
                      <span className={`text-sm font-bold ${s.coins >= st.cost ? "" : "text-destructive"}`}>{st.cost}🪙</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>
      </div>
    </Shell>
  );
}
