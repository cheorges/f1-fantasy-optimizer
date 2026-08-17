export interface Session {
  session_key: number;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end: string;
  meeting_key: number;
  year: number;
  country_name: string;
  circuit_short_name: string;
}

export interface Lap {
  session_key: number;
  driver_number: number;
  lap_number: number;
  lap_duration: number | null;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  i1_speed: number | null;
  i2_speed: number | null;
  st_speed: number | null;
  is_pit_out_lap: boolean;
  date_start: string | null;
}

export interface Driver {
  driver_number: number;
  first_name: string;
  last_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  country_code: string | null;
  headshot_url: string | null;
  session_key: number;
}

export interface DriverPerformance {
  driver: Driver;
  bestLap: Lap | null;
  bestSectors: {
    sector1: number | null;
    sector2: number | null;
    sector3: number | null;
  };
  topSpeed: number | null;
  lapCount: number;
  sessionName: string;
}

export interface Meeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name: string;
  date_start: string;
  year: number;
  country_name: string;
  circuit_short_name: string;
}

// Direction the price is drifting, derived from price and ownership movement over the
// last few rounds. null means there isn't enough history yet to say anything.
export type PriceTrend = "up" | "down" | "flat";

export interface FantasyDriver {
  id: number;
  firstName: string;
  lastName: string;
  tla: string;
  teamName: string;
  price: number;
  selectedPercentage: number;
  overallPoints: number;
  gamedayPoints: number;
  priceChange: number;
  trend: PriceTrend | null;
}

export interface FantasyConstructor {
  id: number;
  name: string;
  price: number;
  selectedPercentage: number;
  overallPoints: number;
  gamedayPoints: number;
  priceChange: number;
  trend: PriceTrend | null;
}

export interface FantasyData {
  drivers: FantasyDriver[];
  constructors: FantasyConstructor[];
  round: number;
}

export interface DriverAnalysis {
  driverNumber: number;
  firstName: string;
  lastName: string;
  nameAcronym: string;
  teamName: string;
  teamColour: string;
  headshotUrl: string | null;
  bestLapTime: number | null;
  bestSectors: {
    sector1: number | null;
    sector2: number | null;
    sector3: number | null;
  };
  topSpeed: number | null;
  lapCount: number;
  price: number | null;
  priceChange: number | null;
  selectedPercentage: number | null;
  overallPoints: number | null;
  valueScore: number | null;
  sessionName: string;
}

export interface SwapRecommendation {
  driverOut: DriverAnalysis;
  driverIn: DriverAnalysis;
  timeDelta: number;
  priceDelta: number;
  valueScoreDelta: number;
  reason: string;
}

export interface ConstructorAnalysis {
  name: string;
  teamColour: string;
  bestLapTime: number | null;
  avgLapTime: number | null;
  drivers: string[];
  price: number | null;
  priceChange: number | null;
  selectedPercentage: number | null;
  overallPoints: number | null;
  valueScore: number | null;
}

export interface ConstructorSwapRecommendation {
  constructorOut: ConstructorAnalysis;
  constructorIn: ConstructorAnalysis;
  timeDelta: number;
  priceDelta: number;
  valueScoreDelta: number;
  reason: string;
}

export interface FantasyTeam {
  id: string;
  name: string;
  // Slot arrays: null means an empty slot, so clearing one doesn't shift the others.
  driverIds: (number | null)[];
  constructorIds: (number | null)[];
  // How much more the squad is worth today than what was actually paid for it. The app
  // only ever sees current prices, but the game's 100M cap applies to purchase prices —
  // so this is the one number it cannot derive and the user has to supply. Everything
  // else (effective spend, remaining budget) follows from it.
  budgetCorrection: number;
}

export interface TeamStore {
  // 3 since the correction replaced a stored "remaining budget", which meant something
  // else entirely and must not be read as a correction.
  version: 3;
  teams: FantasyTeam[];
  activeId: string;
}

export interface PointsSwapSuggestion {
  type: "driver" | "constructor";
  // `short` is the three-letter acronym for drivers, the plain name for constructors —
  // what the card shows on a phone, where a full name has nowhere to go.
  current: { id: number; name: string; short: string; teamName: string; price: number; overallPoints: number };
  upgrade: { id: number; name: string; short: string; teamName: string; price: number; overallPoints: number };
  pointsDelta: number;
  priceDelta: number;
  // Seconds the replacement was quicker in the practice session, when practice data is
  // included and both had a valid lap. Undefined otherwise — never zero as a stand-in.
  timeDelta?: number;
  // Why this entry is in the list at all. Points and seconds are not comparable, so the
  // reason is shown rather than folded into a single score.
  qualifiedBy: "points" | "pace" | "both";
}
