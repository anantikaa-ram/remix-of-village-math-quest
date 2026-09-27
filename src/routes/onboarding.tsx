import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { saveStudent } from "@/lib/store";
import { DOMAINS, type DomainId } from "@/lib/questions";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Create your profile — Numeria" },
      { name: "description", content: "Register, set up your student profile and choose your maths domains." },
      { property: "og:title", content: "Create your profile — Numeria" },
      { property: "og:description", content: "Set up your student profile and village." },
    ],
  }),
  component: Onboarding,
});

const AVATARS = ["🦊", "🐢", "🦉", "🐉", "🐧", "🦁", "🐼", "🧙"];
const GRADES = ["Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"];

function Onboarding() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ name: "", email: "", password: "", grade: "Grade 7", villageName: "", avatar: "🦊" });
  const [domains, setDomains] = useState<DomainId[]>(DOMAINS.map((d) => d.id));
  const [err, setErr] = useState("");

  const next = () => {
    setErr("");
    if (step === 0) {
      if (!f.name.trim() || !/^\S+@\S+\.\S+$/.test(f.email) || f.password.length < 6)
        return setErr("Enter your name, a valid email and a password of 6+ characters.");
    }
    if (step === 1 && !f.villageName.trim()) return setErr("Give your village a name.");
    if (step === 2) {
      if (!domains.length) return setErr("Pick at least one domain.");
      saveStudent({ name: f.name.trim(), email: f.email, grade: f.grade, villageName: f.villageName.trim(), avatar: f.avatar, domains, xp: 0, coins: 0, badges: [] });
      return nav({ to: "/diagnostic" });
    }
    setStep(step + 1);
  };

  const input = "w-full rounded-lg border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring";
  return (
    <Shell>
      <div className="mx-auto max-w-xl">
        <div className="mb-8 flex gap-2">
          {["Account", "Profile", "Course"].map((l, i) => (
            <div key={l} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
              <p className={`mt-2 text-xs font-medium ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{l}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
          {step === 0 && (
            <div className="space-y-4">
              <h1 className="font-display text-3xl font-semibold">Create your account</h1>
              <p className="text-sm text-muted-foreground">Simulated sign-up — saved on this device only.</p>
              <input className={input} placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              <input className={input} placeholder="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
              <input className={input} placeholder="Password" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            </div>
          )}
          {step === 1 && (
            <div className="space-y-5">
              <h1 className="font-display text-3xl font-semibold">Your student profile</h1>
              <div>
                <p className="mb-2 text-sm font-medium">Curriculum level</p>
                <div className="flex flex-wrap gap-2">
                  {GRADES.map((g) => (
                    <button key={g} onClick={() => setF({ ...f, grade: g })} className={`rounded-full border px-4 py-1.5 text-sm ${f.grade === g ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{g}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Choose an avatar</p>
                <div className="grid grid-cols-8 gap-2">
                  {AVATARS.map((a) => (
                    <button key={a} onClick={() => setF({ ...f, avatar: a })} className={`aspect-square rounded-lg text-2xl ${f.avatar === a ? "bg-accent ring-2 ring-primary" : "bg-muted"}`}>{a}</button>
                  ))}
                </div>
              </div>
              <input className={input} placeholder="Village name (e.g. Pythagoria)" value={f.villageName} onChange={(e) => setF({ ...f, villageName: e.target.value })} />
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <h1 className="font-display text-3xl font-semibold">Mathematics course</h1>
              <p className="text-sm text-muted-foreground">Select the domains for your diagnostic.</p>
              {DOMAINS.map((d) => {
                const on = domains.includes(d.id);
                return (
                  <button key={d.id} onClick={() => setDomains(on ? domains.filter((x) => x !== d.id) : [...domains, d.id])}
                    className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${on ? "border-primary bg-accent/50" : "border-border"}`}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-card font-display text-xl">{d.glyph}</span>
                    <span className="flex-1"><span className="block font-semibold">{d.name}</span><span className="text-sm text-muted-foreground">{d.blurb}</span></span>
                    <span className={`h-5 w-5 rounded border-2 ${on ? "border-primary bg-primary" : "border-border"}`} />
                  </button>
                );
              })}
            </div>
          )}
          {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
          <div className="mt-8 flex justify-between">
            <button disabled={step === 0} onClick={() => setStep(step - 1)} className="text-sm font-medium text-muted-foreground disabled:opacity-0">← Back</button>
            <button onClick={next} className="rounded-lg bg-primary px-6 py-2.5 font-semibold text-primary-foreground">{step === 2 ? "Start diagnostic" : "Continue"}</button>
          </div>
        </div>
      </div>
    </Shell>
  );
}
