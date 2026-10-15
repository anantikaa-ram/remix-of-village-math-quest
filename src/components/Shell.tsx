import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { signOut, useAuth, useSaveError, useStudent } from "@/lib/store";

export function Shell({ children }: { children: ReactNode }) {
  const s = useStudent();
  const auth = useAuth();
  const saveErr = useSaveError();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link to="/" className="font-display text-xl font-semibold tracking-tight">
            Numeria<span className="text-primary">.</span>
          </Link>
          {s ? (
            <div className="flex items-center gap-4 text-sm">
              <Link to="/teacher" className="font-medium hover:text-primary" activeProps={{ className: "text-primary" }}>Teacher</Link>
              <Link to="/model" className="font-medium hover:text-primary" activeProps={{ className: "text-primary" }}>Model</Link>
              {s.diagnostic && <Link to="/learn" className="font-medium hover:text-primary" activeProps={{ className: "text-primary" }}>Learn</Link>}
              {s.diagnostic && <Link to="/village" className="font-medium hover:text-primary" activeProps={{ className: "text-primary" }}>Village</Link>}
              {s.diagnostic && <Link to="/results" className="font-medium hover:text-primary" activeProps={{ className: "text-primary" }}>Profile</Link>}
              <span className="rounded-full bg-accent px-3 py-1 font-medium text-accent-foreground">⚡ {s.xp} XP</span>
              <span className="rounded-full bg-secondary px-3 py-1 font-medium text-secondary-foreground">🪙 {s.coins}</span>
              <span className="text-2xl" title={s.name}>{s.avatar}</span>
              <button onClick={() => void signOut()} className="text-xs text-muted-foreground hover:text-foreground">Sign out</button>
            </div>
          ) : auth.status === "signedIn" ? (
            <div className="flex items-center gap-4 text-sm"><Link to="/teacher" className="font-medium">Teacher</Link><button onClick={() => void signOut()} className="text-sm text-muted-foreground">Sign out</button></div>
          ) : auth.status === "signedOut" ? (
            <Link to="/auth" className="text-sm font-medium text-primary">Sign in</Link>
          ) : null}
        </div>
      </header>
      {saveErr && <p role="alert" className="bg-destructive/10 py-2 text-center text-sm text-destructive">{saveErr}</p>}
      <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>
    </div>
  );
}
