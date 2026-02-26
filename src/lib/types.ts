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
  date_start: string;
}

export interface Driver {
  driver_number: number;
  first_name: string;
  last_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  country_code: string;
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

export interface FantasyDriver {
  id: number;
  firstName: string;
  lastName: string;
  teamName: string;
  price: number;
  selectedPercentage: number;
  overallPoints: number;
  gamedayPoints: number;
  priceChange: number;
}

export interface FantasyConstructor {
  id: number;
  name: string;
  price: number;
  selectedPercentage: number;
  overallPoints: number;
  gamedayPoints: number;
  priceChange: number;
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
