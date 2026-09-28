import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useStudent } from "@/lib/store";

export function Shell({ children }: { children: ReactNode }) {
  const s = useStudent();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link to="/" className="font-display text-xl font-semibold tracking-tight">
            Numeria<span className="text-primary">.</span>
          </Link>
          {s ? (
            <div className="flex items-center gap-4 text-sm">
              {s.diagnostic && <Link to="/learn" className="font-medium hover:text-primary" activeProps={{ className: "text-primary" }}>Learn</Link>}
              {s.diagnostic && <Link to="/results" className="font-medium hover:text-primary" activeProps={{ className: "text-primary" }}>Profile</Link>}
              <span className="rounded-full bg-accent px-3 py-1 font-medium text-accent-foreground">⚡ {s.xp} XP</span>
              <span className="rounded-full bg-secondary px-3 py-1 font-medium text-secondary-foreground">🪙 {s.coins}</span>
              <span className="text-2xl" title={s.name}>{s.avatar}</span>
            </div>
          ) : (
            <Link to="/onboarding" className="text-sm font-medium text-primary">Sign in</Link>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>
    </div>
  );
}
