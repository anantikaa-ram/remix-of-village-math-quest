import { useSyncExternalStore } from "react";
import type { DomainId } from "./questions";
import type { Interaction } from "./ml";

export interface Student {
  name: string;
  email: string;
  grade: string;
  villageName: string;
  avatar: string;
  domains: DomainId[];
  xp: number;
  coins: number;
  badges: string[];
  diagnostic?: { interactions: Interaction[]; completedAt: string };
  /** Practice telemetry, same shape as diagnostic, used to update mastery. */
  practice?: Interaction[];
  lessonsDone?: Record<string, { best: number; runs: number; stars: number }>;
}

const KEY = "mathvillage.student";
const listeners = new Set<() => void>();
let cache: Student | null | undefined;

function read(): Student | null {
  if (cache !== undefined) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    cache = null;
  }
  return cache ?? null;
}

export function saveStudent(s: Student | null) {
  cache = s;
  if (s) localStorage.setItem(KEY, JSON.stringify(s));
  else localStorage.removeItem(KEY);
  listeners.forEach((l) => l());
}

/** Returns undefined during SSR / before hydration, null if no student. */
export function useStudent(): Student | null | undefined {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    read,
    () => undefined,
  );
}
