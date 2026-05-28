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
