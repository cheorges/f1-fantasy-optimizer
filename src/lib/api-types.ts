import type {
  Session,
  Meeting,
  FantasyDriver,
  FantasyConstructor,
  DriverAnalysis,
  ConstructorAnalysis,
} from "./types";

export interface SessionsResponse {
  meeting: Meeting;
  sessions: Session[];
}

export interface PricesResponse {
  drivers: FantasyDriver[];
  constructors: FantasyConstructor[];
  round: number;
}

export interface DriversResponse {
  drivers: DriverAnalysis[];
  constructors: ConstructorAnalysis[];
}

// Shallow guards for reading these back out of the browser cache. They check the shape the
// UI actually walks, not every field — a version bump in browser-cache.ts is what protects
// against a changed inner shape.
export function isSessionsResponse(value: unknown): value is SessionsResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.meeting === "object" && v.meeting !== null && Array.isArray(v.sessions);
}

export function isDriversResponse(value: unknown): value is DriversResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.drivers) && Array.isArray(v.constructors);
}
