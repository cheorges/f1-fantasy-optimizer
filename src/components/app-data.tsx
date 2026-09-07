"use client";

import { createContext, useContext } from "react";
import type { Session, Meeting, FantasyDriver, FantasyConstructor } from "@/lib/types";
import type { StaleState } from "@/lib/live-session";

// Lives apart from AppShell so the shell and the components it renders don't import each other.
export interface AppData {
  meeting: Meeting | null;
  sessions: Session[];
  loadingSessions: boolean;
  priceDrivers: FantasyDriver[];
  priceConstructors: FantasyConstructor[];
  priceRound: number;
  loadingPrices: boolean;
  setError: (message: string | null) => void;
  // Set while /api/sessions is blocked, so the home page can explain what it is showing.
  staleSessions: StaleState | null;
  // Set while /api/drivers is blocked. A separate signal: a client that loaded before the
  // session started has this one set and `staleSessions` null.
  staleDrivers: StaleState | null;
  setStaleDrivers: (state: StaleState | null) => void;
}

export const AppDataContext = createContext<AppData | null>(null);

export function useAppData(): AppData {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData must be used inside AppShell");
  return context;
}

// True while any upstream is blocked by a running session.
export function isSessionRunning(data: AppData): boolean {
  return data.staleSessions !== null || data.staleDrivers !== null;
}
