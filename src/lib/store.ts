import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  /** Placed village structures on the grid. */
  village?: { x: number; y: number; id: string }[];
}

type AuthState = { status: "loading" | "signedOut" | "signedIn"; userId: string | null; email: string | null };

const listeners = new Set<() => void>();
let auth: AuthState = { status: "loading", userId: null, email: null };
let student: Student | null | undefined = undefined;
let saveError: string | null = null;
let started = false;
const emit = () => listeners.forEach((l) => l());

async function loadProfile(userId: string) {
  const { data, error } = await supabase.from("student_profiles").select("data").eq("user_id", userId).maybeSingle();
  if (error) console.error(error);
  student = (data?.data as unknown as Student) ?? null;
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const apply = async (session: { user: { id: string; email?: string } } | null) => {
    if (!session) { auth = { status: "signedOut", userId: null, email: null }; student = null; emit(); return; }
    if (auth.userId === session.user.id && auth.status === "signedIn") return;
    auth = { status: "loading", userId: session.user.id, email: session.user.email ?? null }; emit();
    await loadProfile(session.user.id);
    auth = { ...auth, status: "signedIn" }; emit();
  };
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "INITIAL_SESSION" || event === "USER_UPDATED") void apply(session);
  });
}

/** Saves the student to the backend (optimistic local update). */
export function saveStudent(s: Student | null) {
  student = s; saveError = null; emit();
  if (!auth.userId || !s) return;
  void supabase.from("student_profiles").upsert({ user_id: auth.userId, data: s as never, updated_at: new Date().toISOString() })
    .then(({ error }) => { if (error) { saveError = "Couldn't save your progress — check your connection."; console.error(error); emit(); } });
}

export async function signOut() {
  await supabase.auth.signOut();
}

const subscribe = (l: () => void) => { start(); listeners.add(l); return () => listeners.delete(l); };

/** Returns undefined while loading / during SSR, null if signed out or no profile yet. */
export function useStudent(): Student | null | undefined {
  return useSyncExternalStore(subscribe, () => (auth.status === "loading" ? undefined : student ?? null), () => undefined);
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, () => auth, () => auth);
}

export function useSaveError() {
  return useSyncExternalStore(subscribe, () => saveError, () => null);
}
