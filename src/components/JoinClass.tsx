import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Lets a student join a teacher's class with a code, so the teacher can see their progress. */
export function JoinClass() {
  const [code, setCode] = useState("");
  const [classes, setClasses] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const load = async () => { const { data } = await supabase.rpc("my_classes"); setClasses((data ?? []).map((c) => c.name)); };
  useEffect(() => { void load(); }, []);
  async function join() {
    const { data, error } = await supabase.rpc("join_class", { _code: code });
    if (error) return setMsg(error.message);
    setMsg(`Joined ${data}!`); setCode(""); void load();
  }
  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-5">
      <p className="font-semibold">Join your teacher's class</p>
      <p className="text-xs text-muted-foreground">Your teacher will see your strengths, weak topics and predicted score.</p>
      <div className="mt-3 flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Class code" className="w-40 rounded-lg border border-input bg-background px-3 py-1.5 font-mono uppercase" />
        <button onClick={() => void join()} className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">Join</button>
      </div>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
      {classes.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Member of: {classes.join(", ")}</p>}
    </div>
  );
}
