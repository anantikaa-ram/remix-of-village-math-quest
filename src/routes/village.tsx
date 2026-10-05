import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Coins, Hammer, LockKeyhole, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
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
  const selected = sel && sel !== "__remove" ? structureById(sel) : undefined;
  const selectedIsAffordable = selected ? s.coins >= selected.cost : false;
  const maxPlots = GRID_W * GRID_H;

  const clickTile = (x: number, y: number) => {
    const here = at(x, y);
    if (here) {
      if (sel === "__remove") {
        const st = structureById(here.id);
        if (!st) return;
        const refund = Math.floor(st.cost / 2);
        saveStudent({ ...s, coins: s.coins + refund, village: placed.filter((p) => p !== here) });
        setMsg(`Demolished ${st.name}. Refunded ${refund} 🪙.`);
      }
      return;
    }
    if (sel === "__remove") return setMsg("Choose a building on the map to demolish it.");
    if (!selected) return setMsg("Choose a building from the catalog first.");
    if (s.coins < selected.cost) return setMsg(`Not enough coins — ${selected.name} costs ${selected.cost} 🪙. Practise lessons to earn more!`);
    saveStudent({ ...s, coins: s.coins - selected.cost, village: [...placed, { x, y, id: selected.id }], badges: placed.length === 0 ? [...new Set([...s.badges, "Village Founder"])] : s.badges });
    setMsg(`Built ${selected.name}! −${selected.cost} 🪙`);
  };

  return (
    <Shell>
      <section className="village-heading">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">My village</p>
          <h1 className="mt-1 font-display text-4xl font-semibold sm:text-5xl">{s.villageName}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Turn your maths progress into a village of your own. Master topics to unlock special buildings.</p>
        </div>
        <div className="village-summary" aria-label={`${s.coins} coins and ${placed.length} structures`}>
          <div className="village-summary__icon"><Coins aria-hidden="true" /></div>
          <div><span>Ready to spend</span><strong>{s.coins} coins</strong></div>
          <div className="village-summary__divider" />
          <div><span>Village size</span><strong>{placed.length} / {maxPlots}</strong></div>
        </div>
      </section>

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-label="Village map" className="min-w-0">
          <div className="village-map">
            <div className="village-map__topbar">
              <div>
                <span className="village-map__eyebrow">Build mode</span>
                <strong>{sel === "__remove" ? "Choose a building to remove" : selected ? `Placing ${selected.name}` : "Choose a building from the catalog"}</strong>
              </div>
              {sel && (
                <Button variant="secondary" size="sm" onClick={() => { setSel(null); setMsg(null); }}>
                  <RotateCcw aria-hidden="true" /> Cancel
                </Button>
              )}
            </div>
            <div className="village-terrain" aria-hidden="true">
              <span className="village-cloud village-cloud--one" />
              <span className="village-cloud village-cloud--two" />
              <span className="village-stream" />
              <span className="village-path village-path--one" />
              <span className="village-path village-path--two" />
            </div>
            <div className="village-grid" style={{ gridTemplateColumns: `repeat(${GRID_W}, minmax(0, 1fr))` }}>
            {Array.from({ length: GRID_W * GRID_H }, (_, i) => {
              const x = i % GRID_W, y = Math.floor(i / GRID_W), p = at(x, y), st = p && structureById(p.id);
                const removalTarget = sel === "__remove" && st;
              return (
                  <button key={i} aria-label={st ? `${st.name} at plot ${x + 1}, ${y + 1}` : `Empty plot ${x + 1}, ${y + 1}`} title={st?.name} onClick={() => clickTile(x, y)}
                    className={`village-plot ${st ? "village-plot--built" : "village-plot--empty"} ${removalTarget ? "village-plot--remove" : ""}`}>
                    {st ? <><span className="village-building" aria-hidden="true">{st.glyph}</span><span className="village-building__label">{st.name}</span></> : <span className="village-plot__plus" aria-hidden="true">+</span>}
                  </button>
              );
            })}
            </div>
            <div className="village-map__legend">
              <span><i className="village-key village-key--empty" /> Empty plot</span>
              <span><i className="village-key village-key--built" /> Built</span>
              <span><Sparkles aria-hidden="true" /> {placed.length ? `${placed.length} structures make your village unique` : "Your first building earns a badge"}</span>
            </div>
          </div>
          {msg && <p role="status" className="village-message">{msg}</p>}
        </section>

        <aside className="village-catalog">
          <div className="village-catalog__header">
            <div>
              <span className="village-catalog__eyebrow"><Hammer aria-hidden="true" /> Builder's catalog</span>
              <h2 className="font-display text-2xl font-semibold">Choose a building</h2>
            </div>
            <span className="village-coin-pill"><Coins aria-hidden="true" /> {s.coins}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Pick an unlocked building, then choose an empty plot.</p>

          <Button
            variant={sel === "__remove" ? "destructive" : "outline"}
            className="mt-4 w-full justify-start"
            onClick={() => { setSel(sel === "__remove" ? null : "__remove"); setMsg(sel === "__remove" ? null : "Demolish mode is on. Choose a building on the map."); }}
          >
            <Trash2 aria-hidden="true" /> {sel === "__remove" ? "Exit demolish mode" : "Demolish a building"}
            <span className="ml-auto text-xs opacity-75">50% refund</span>
          </Button>

          {DOMAINS.filter((d) => s.domains.includes(d.id)).map((d) => (
            <section key={d.id} className="village-domain">
              <div className="village-domain__title"><span>{d.glyph}</span><div><strong>{d.building}</strong><small>{d.name}</small></div></div>
              <div className="space-y-2">
                {STRUCTURES.filter((st) => st.domain === d.id).map((st) => {
                  const ok = unlocked(st), m = Math.round((mastery.get(st.topic) ?? 0) * 100), affordable = s.coins >= st.cost;
                  return (
                    <Button key={st.id} variant="ghost" disabled={!ok} onClick={() => { setSel(st.id); setMsg(affordable ? `Selected ${st.name}. Choose an empty plot.` : `${st.name} costs ${st.cost} coins. Keep learning to earn more.`); }}
                      className={`village-choice ${sel === st.id ? "village-choice--selected" : ""} ${ok && !affordable ? "village-choice--unaffordable" : ""}`}>
                      <span className={`village-choice__glyph ${ok ? "" : "village-choice__glyph--locked"}`}>{ok ? st.glyph : <LockKeyhole aria-hidden="true" />}</span>
                      <span className="village-choice__body">
                        <span className="village-choice__name">{st.name}</span>
                        <span className="village-choice__meta">{st.topic} · {m}% mastery</span>
                        {!ok && <span className="village-choice__progress"><i style={{ width: `${Math.min(100, m / st.minMastery)}%` }} /></span>}
                        {!ok && <span className="village-choice__lock">Unlocks at {Math.round(st.minMastery * 100)}%</span>}
                      </span>
                      <span className={`village-choice__cost ${affordable ? "" : "village-choice__cost--short"}`}><Coins aria-hidden="true" /> {st.cost}</span>
                    </Button>
                  );
                })}
              </div>
            </section>
          ))}

          {selected && (
            <div className={`village-selection ${selectedIsAffordable ? "" : "village-selection--warning"}`}>
              <span className="text-3xl">{selected.glyph}</span>
              <div className="min-w-0"><strong>{selected.name}</strong><p>{selectedIsAffordable ? "Ready to place on any empty plot." : `You need ${selected.cost - s.coins} more coins.`}</p></div>
            </div>
          )}
        </aside>
      </div>
    </Shell>
  );
}
