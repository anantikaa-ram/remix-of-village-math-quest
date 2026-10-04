import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth, useStudent } from "@/lib/store";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Numeria" },
      { name: "description", content: "Sign in or create a free Numeria account to save your maths progress and village." },
      { property: "og:title", content: "Sign in — Numeria" },
      { property: "og:description", content: "Create a free account and keep your progress on any device." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const auth = useAuth();
  const s = useStudent();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (auth.status === "signedIn" && s !== undefined) nav({ to: s ? (s.diagnostic ? "/learn" : "/diagnostic") : "/onboarding", replace: true });
  }, [auth.status, s, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setInfo("");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Please enter a valid email address.");
    if (password.length < 6) return setErr("Your password needs at least 6 characters.");
    setBusy(true);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/auth" } });
      if (error) setErr(friendly(error.message));
      else if (!data.session) setInfo("Almost there! We've emailed you a link — click it to confirm your account, then come back to sign in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setErr(friendly(error.message));
    }
    setBusy(false);
  };

  const google = async () => {
    setErr("");
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) setErr("Google sign-in didn't work. Please try again.");
  };

  const input = "w-full rounded-lg border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring";
  return (
    <Shell>
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <h1 className="font-display text-3xl font-semibold">{mode === "signup" ? "Create your free account" : "Welcome back"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your progress, coins and village are saved to your account.</p>
        <button onClick={google} className="mt-6 w-full rounded-lg border border-border py-3 font-medium hover:bg-muted">Continue with Google</button>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or with email<span className="h-px flex-1 bg-border" /></div>
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm font-medium">Email<input className={`${input} mt-1`} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="block text-sm font-medium">Password<input className={`${input} mt-1`} type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {err && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
          {info && <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{info}</p>}
          <button disabled={busy} className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50">
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {mode === "signup" ? "Already have an account?" : "New to Numeria?"}{" "}
          <button onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setErr(""); setInfo(""); }} className="font-medium text-primary">
            {mode === "signup" ? "Sign in" : "Create one"}
          </button>
        </p>
      </div>
    </Shell>
  );
}

function friendly(m: string) {
  if (/invalid login/i.test(m)) return "That email and password don't match. Try again or create an account.";
  if (/already registered/i.test(m)) return "There's already an account with this email — try signing in.";
  if (/not confirmed/i.test(m)) return "Please confirm your email first — check your inbox for our link.";
  if (/pwned|leaked|weak/i.test(m)) return "That password is too easy to guess. Please choose another.";
  return m;
}
