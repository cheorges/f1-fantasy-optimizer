import type {
  DriverAnalysis,
  SwapRecommendation,
  ConstructorAnalysis,
  ConstructorSwapRecommendation,
  Meeting,
  Session,
  FantasyDriver,
  FantasyConstructor,
} from "./types";

const SESSION_NAME = "Practice 2";

const MOCK_DRIVERS: DriverAnalysis[] = [
  {
    driverNumber: 1, firstName: "Max", lastName: "Verstappen", nameAcronym: "VER",
    teamName: "Red Bull Racing", teamColour: "3671C6", headshotUrl: null,
    bestLapTime: 90.456, bestSectors: { sector1: 28.812, sector2: 33.201, sector3: 28.443 },
    topSpeed: 328, lapCount: 24, price: 30.5, priceChange: 0.3,
    selectedPercentage: 62.1, overallPoints: 187, valueScore: 0.362, sessionName: SESSION_NAME,
  },
  {
    driverNumber: 4, firstName: "Lando", lastName: "Norris", nameAcronym: "NOR",
    teamName: "McLaren", teamColour: "FF8000", headshotUrl: null,
    bestLapTime: 90.612, bestSectors: { sector1: 28.901, sector2: 33.198, sector3: 28.513 },
    topSpeed: 331, lapCount: 27, price: 26.0, priceChange: 0.5,
    selectedPercentage: 48.3, overallPoints: 156, valueScore: 0.424, sessionName: SESSION_NAME,
  },
  {
    driverNumber: 16, firstName: "Charles", lastName: "Leclerc", nameAcronym: "LEC",
    teamName: "Ferrari", teamColour: "E8002D", headshotUrl: null,
    bestLapTime: 90.789, bestSectors: { sector1: 28.956, sector2: 33.312, sector3: 28.521 },
    topSpeed: 330, lapCount: 22, price: 25.0, priceChange: -0.2,
    selectedPercentage: 41.7, overallPoints: 143, valueScore: 0.441, sessionName: SESSION_NAME,
  },
  {
    driverNumber: 44, firstName: "Lewis", lastName: "Hamilton", nameAcronym: "HAM",
    teamName: "Ferrari", teamColour: "E8002D", headshotUrl: null,
    bestLapTime: 90.923, bestSectors: { sector1: 29.012, sector2: 33.389, sector3: 28.522 },
    topSpeed: 329, lapCount: 25, price: 27.0, priceChange: -0.5,
    selectedPercentage: 38.9, overallPoints: 134, valueScore: 0.408, sessionName: SESSION_NAME,
  },
  {
    driverNumber: 63, firstName: "George", lastName: "Russell", nameAcronym: "RUS",
    teamName: "Mercedes", teamColour: "27F4D2", headshotUrl: null,
    bestLapTime: 91.034, bestSectors: { sector1: 29.102, sector2: 33.456, sector3: 28.476 },
    topSpeed: 327, lapCount: 26, price: 22.5, priceChange: 0.0,
    selectedPercentage: 35.2, overallPoints: 128, valueScore: 0.488, sessionName: SESSION_NAME,
  },
  {
    driverNumber: 81, firstName: "Oscar", lastName: "Piastri", nameAcronym: "PIA",
    teamName: "McLaren", teamColour: "FF8000", headshotUrl: null,
    bestLapTime: 91.201, bestSectors: { sector1: 29.189, sector2: 33.498, sector3: 28.514 },
    topSpeed: 330, lapCount: 23, price: 21.0, priceChange: 0.8,
    selectedPercentage: 33.1, overallPoints: 119, valueScore: 0.523, sessionName: SESSION_NAME,
  },
  {
    driverNumber: 14, firstName: "Fernando", lastName: "Alonso", nameAcronym: "ALO",
    teamName: "Aston Martin", teamColour: "229971", headshotUrl: null,
    bestLapTime: 91.345, bestSectors: { sector1: 29.234, sector2: 33.567, sector3: 28.544 },
    topSpeed: 325, lapCount: 28, price: 18.5, priceChange: -0.3,
    selectedPercentage: 22.4, overallPoints: 98, valueScore: 0.592, sessionName: SESSION_NAME,
  },
  {
    driverNumber: 30, firstName: "Liam", lastName: "Lawson", nameAcronym: "LAW",
    teamName: "Red Bull Racing", teamColour: "3671C6", headshotUrl: null,
    bestLapTime: 91.567, bestSectors: { sector1: 29.345, sector2: 33.612, sector3: 28.610 },
    topSpeed: 326, lapCount: 21, price: 14.0, priceChange: 0.2,
    selectedPercentage: 18.6, overallPoints: 72, valueScore: 0.782, sessionName: SESSION_NAME,
  },
  {
    driverNumber: 10, firstName: "Pierre", lastName: "Gasly", nameAcronym: "GAS",
    teamName: "Alpine", teamColour: "FF87BC", headshotUrl: null,
    bestLapTime: 91.678, bestSectors: { sector1: 29.401, sector2: 33.689, sector3: 28.588 },
    topSpeed: 324, lapCount: 25, price: 13.5, priceChange: 0.0,
    selectedPercentage: 15.3, overallPoints: 64, valueScore: 0.808, sessionName: SESSION_NAME,
  },
  {
    driverNumber: 18, firstName: "Lance", lastName: "Stroll", nameAcronym: "STR",
    teamName: "Aston Martin", teamColour: "229971", headshotUrl: null,
    bestLapTime: 91.890, bestSectors: { sector1: 29.501, sector2: 33.745, sector3: 28.644 },
    topSpeed: 323, lapCount: 22, price: 11.0, priceChange: -0.2,
    selectedPercentage: 10.5, overallPoints: 45, valueScore: 0.989, sessionName: SESSION_NAME,
  },
  {
    driverNumber: 12, firstName: "Andrea Kimi", lastName: "Antonelli", nameAcronym: "ANT",
    teamName: "Mercedes", teamColour: "27F4D2", headshotUrl: null,
    bestLapTime: 91.456, bestSectors: { sector1: 29.278, sector2: 33.601, sector3: 28.577 },
    topSpeed: 326, lapCount: 20, price: 15.0, priceChange: 0.4,
    selectedPercentage: 19.8, overallPoints: 76, valueScore: 0.729, sessionName: SESSION_NAME,
  },
  {
    driverNumber: 22, firstName: "Yuki", lastName: "Tsunoda", nameAcronym: "TSU",
    teamName: "RB", teamColour: "6692FF", headshotUrl: null,
    bestLapTime: 91.712, bestSectors: { sector1: 29.423, sector2: 33.701, sector3: 28.588 },
    topSpeed: 325, lapCount: 26, price: 12.0, priceChange: 0.1,
    selectedPercentage: 14.2, overallPoints: 58, valueScore: 0.908, sessionName: SESSION_NAME,
  },
  {
    driverNumber: 20, firstName: "Isack", lastName: "Hadjar", nameAcronym: "HAD",
    teamName: "RB", teamColour: "6692FF", headshotUrl: null,
    bestLapTime: 92.134, bestSectors: { sector1: 29.567, sector2: 33.823, sector3: 28.744 },
    topSpeed: 323, lapCount: 19, price: 8.5, priceChange: 0.0,
    selectedPercentage: 8.7, overallPoints: 32, valueScore: 1.278, sessionName: SESSION_NAME,
  },
  {
    driverNumber: 55, firstName: "Carlos", lastName: "Sainz", nameAcronym: "SAI",
    teamName: "Williams", teamColour: "64C4FF", headshotUrl: null,
    bestLapTime: 91.956, bestSectors: { sector1: 29.512, sector2: 33.789, sector3: 28.655 },
    topSpeed: 322, lapCount: 24, price: 16.5, priceChange: -0.4,
    selectedPercentage: 21.0, overallPoints: 87, valueScore: 0.660, sessionName: SESSION_NAME,
  },
  {
    driverNumber: 2, firstName: "Logan", lastName: "Sargeant", nameAcronym: "SAR",
    teamName: "Williams", teamColour: "64C4FF", headshotUrl: null,
    bestLapTime: 92.456, bestSectors: { sector1: 29.678, sector2: 33.912, sector3: 28.866 },
    topSpeed: 321, lapCount: 21, price: 7.0, priceChange: -0.1,
    selectedPercentage: 5.3, overallPoints: 18, valueScore: 1.546, sessionName: SESSION_NAME,
  },
  {
    driverNumber: 31, firstName: "Esteban", lastName: "Ocon", nameAcronym: "OCO",
    teamName: "Haas", teamColour: "B6BABD", headshotUrl: null,
    bestLapTime: 92.012, bestSectors: { sector1: 29.534, sector2: 33.801, sector3: 28.677 },
    topSpeed: 324, lapCount: 23, price: 10.5, priceChange: 0.0,
    selectedPercentage: 9.8, overallPoints: 41, valueScore: 1.035, sessionName: SESSION_NAME,
  },
  {
    driverNumber: 87, firstName: "Oliver", lastName: "Bearman", nameAcronym: "BEA",
    teamName: "Haas", teamColour: "B6BABD", headshotUrl: null,
    bestLapTime: 92.289, bestSectors: { sector1: 29.612, sector2: 33.878, sector3: 28.799 },
    topSpeed: 322, lapCount: 20, price: 8.0, priceChange: 0.2,
    selectedPercentage: 7.1, overallPoints: 27, valueScore: 1.354, sessionName: SESSION_NAME,
  },
  {
    driverNumber: 7, firstName: "Jack", lastName: "Doohan", nameAcronym: "DOO",
    teamName: "Alpine", teamColour: "FF87BC", headshotUrl: null,
    bestLapTime: 92.345, bestSectors: { sector1: 29.634, sector2: 33.889, sector3: 28.822 },
    topSpeed: 323, lapCount: 18, price: 7.5, priceChange: 0.0,
    selectedPercentage: 6.2, overallPoints: 22, valueScore: 1.443, sessionName: SESSION_NAME,
  },
  {
    driverNumber: 27, firstName: "Nico", lastName: "Huelkenberg", nameAcronym: "HUL",
    teamName: "Kick Sauber", teamColour: "52E252", headshotUrl: null,
    bestLapTime: 92.123, bestSectors: { sector1: 29.556, sector2: 33.834, sector3: 28.733 },
    topSpeed: 321, lapCount: 24, price: 9.0, priceChange: -0.3,
    selectedPercentage: 8.4, overallPoints: 35, valueScore: 1.207, sessionName: SESSION_NAME,
  },
  {
    driverNumber: 5, firstName: "Gabriel", lastName: "Bortoleto", nameAcronym: "BOR",
    teamName: "Kick Sauber", teamColour: "52E252", headshotUrl: null,
    bestLapTime: 92.567, bestSectors: { sector1: 29.712, sector2: 33.945, sector3: 28.910 },
    topSpeed: 320, lapCount: 17, price: 6.5, priceChange: 0.0,
    selectedPercentage: 4.8, overallPoints: 15, valueScore: 1.662, sessionName: SESSION_NAME,
  },
];

function generateDriverSwaps(drivers: DriverAnalysis[], budget: number): SwapRecommendation[] {
  const withData = drivers.filter((d) => d.bestLapTime !== null && d.price !== null);
  const recs: SwapRecommendation[] = [];

  for (const out of withData) {
    for (const into of withData) {
      if (out.driverNumber === into.driverNumber) continue;
      const priceDelta = into.price! - out.price!;
      if (into.bestLapTime! >= out.bestLapTime!) continue;
      if (priceDelta > budget) continue;

      const timeDelta = out.bestLapTime! - into.bestLapTime!;
      const valueScoreDelta = (into.valueScore ?? 0) - (out.valueScore ?? 0);

      let reason: string;
      if (priceDelta <= 0) {
        reason = `${into.nameAcronym} is ${timeDelta.toFixed(3)}s faster and ${Math.abs(priceDelta).toFixed(1)}M cheaper`;
      } else if (priceDelta <= 0.5) {
        reason = `${into.nameAcronym} is ${timeDelta.toFixed(3)}s faster at similar price (+${priceDelta.toFixed(1)}M)`;
      } else {
        reason = `${into.nameAcronym} is ${timeDelta.toFixed(3)}s faster for +${priceDelta.toFixed(1)}M`;
      }

      recs.push({ driverOut: out, driverIn: into, timeDelta, priceDelta, valueScoreDelta, reason });
    }
  }

  return recs.sort((a, b) => {
    if (Math.abs(a.timeDelta - b.timeDelta) > 0.01) return b.timeDelta - a.timeDelta;
    return b.valueScoreDelta - a.valueScoreDelta;
  });
}

const MOCK_CONSTRUCTORS: ConstructorAnalysis[] = [
  { name: "Red Bull Racing", teamColour: "3671C6", bestLapTime: 90.456, avgLapTime: 91.012, drivers: ["VER", "LAW"], price: 32.0, priceChange: 0.5, selectedPercentage: 55.2, overallPoints: 245, valueScore: 0.346 },
  { name: "McLaren", teamColour: "FF8000", bestLapTime: 90.612, avgLapTime: 90.907, drivers: ["NOR", "PIA"], price: 28.5, priceChange: 0.8, selectedPercentage: 47.8, overallPoints: 218, valueScore: 0.388 },
  { name: "Ferrari", teamColour: "E8002D", bestLapTime: 90.789, avgLapTime: 90.856, drivers: ["LEC", "HAM"], price: 30.0, priceChange: -0.3, selectedPercentage: 43.1, overallPoints: 201, valueScore: 0.367 },
  { name: "Mercedes", teamColour: "27F4D2", bestLapTime: 91.034, avgLapTime: 91.245, drivers: ["RUS", "ANT"], price: 24.0, priceChange: 0.2, selectedPercentage: 36.4, overallPoints: 172, valueScore: 0.458 },
  { name: "Aston Martin", teamColour: "229971", bestLapTime: 91.345, avgLapTime: 91.618, drivers: ["ALO", "STR"], price: 18.0, priceChange: -0.2, selectedPercentage: 19.5, overallPoints: 112, valueScore: 0.609 },
  { name: "Alpine", teamColour: "FF87BC", bestLapTime: 91.678, avgLapTime: 92.012, drivers: ["GAS", "DOO"], price: 12.5, priceChange: 0.0, selectedPercentage: 11.3, overallPoints: 65, valueScore: 0.873 },
  { name: "RB", teamColour: "6692FF", bestLapTime: 91.712, avgLapTime: 91.923, drivers: ["TSU", "HAD"], price: 11.0, priceChange: 0.1, selectedPercentage: 10.1, overallPoints: 58, valueScore: 0.990 },
  { name: "Williams", teamColour: "64C4FF", bestLapTime: 91.956, avgLapTime: 92.206, drivers: ["SAI", "SAR"], price: 14.0, priceChange: -0.3, selectedPercentage: 13.7, overallPoints: 78, valueScore: 0.778 },
  { name: "Haas", teamColour: "B6BABD", bestLapTime: 92.012, avgLapTime: 92.151, drivers: ["OCO", "BEA"], price: 9.5, priceChange: 0.1, selectedPercentage: 7.9, overallPoints: 42, valueScore: 1.144 },
  { name: "Kick Sauber", teamColour: "52E252", bestLapTime: 92.123, avgLapTime: 92.345, drivers: ["HUL", "BOR"], price: 8.0, priceChange: -0.1, selectedPercentage: 5.6, overallPoints: 31, valueScore: 1.358 },
];

function generateConstructorSwaps(constructors: ConstructorAnalysis[], budget: number): ConstructorSwapRecommendation[] {
  const withData = constructors.filter((c) => c.bestLapTime !== null && c.price !== null);
  const recs: ConstructorSwapRecommendation[] = [];

  for (const out of withData) {
    for (const into of withData) {
      if (out.name === into.name) continue;
      const priceDelta = into.price! - out.price!;
      if (into.bestLapTime! >= out.bestLapTime!) continue;
      if (priceDelta > budget) continue;

      const timeDelta = out.bestLapTime! - into.bestLapTime!;
      const valueScoreDelta = (into.valueScore ?? 0) - (out.valueScore ?? 0);

      let reason: string;
      if (priceDelta <= 0) {
        reason = `${into.name} is ${timeDelta.toFixed(3)}s faster and ${Math.abs(priceDelta).toFixed(1)}M cheaper`;
      } else if (priceDelta <= 0.5) {
        reason = `${into.name} is ${timeDelta.toFixed(3)}s faster at similar price (+${priceDelta.toFixed(1)}M)`;
      } else {
        reason = `${into.name} is ${timeDelta.toFixed(3)}s faster for +${priceDelta.toFixed(1)}M`;
      }

      recs.push({ constructorOut: out, constructorIn: into, timeDelta, priceDelta, valueScoreDelta, reason });
    }
  }

  return recs.sort((a, b) => {
    if (Math.abs(a.timeDelta - b.timeDelta) > 0.01) return b.timeDelta - a.timeDelta;
    return b.valueScoreDelta - a.valueScoreDelta;
  });
}

export const MOCK_MEETING: Meeting = {
  meeting_key: 9999,
  meeting_name: "Bahrain Grand Prix",
  meeting_official_name: "Formula 1 Gulf Air Bahrain Grand Prix 2026",
  date_start: "2026-03-06",
  year: 2026,
  country_name: "Bahrain",
  circuit_short_name: "Sakhir",
};

export const MOCK_SESSIONS: Session[] = [
  { session_key: 9001, session_name: "Practice 1", session_type: "Practice", date_start: "2026-03-06T11:30:00", date_end: "2026-03-06T12:30:00", meeting_key: 9999, year: 2026, country_name: "Bahrain", circuit_short_name: "Sakhir" },
  { session_key: 9002, session_name: "Practice 2", session_type: "Practice", date_start: "2026-03-06T15:00:00", date_end: "2026-03-06T16:00:00", meeting_key: 9999, year: 2026, country_name: "Bahrain", circuit_short_name: "Sakhir" },
  { session_key: 9003, session_name: "Practice 3", session_type: "Practice", date_start: "2026-03-07T12:30:00", date_end: "2026-03-07T13:30:00", meeting_key: 9999, year: 2026, country_name: "Bahrain", circuit_short_name: "Sakhir" },
];

export function getMockDrivers(): DriverAnalysis[] {
  return MOCK_DRIVERS;
}

export function getMockRecommendations(budget: number) {
  return {
    budget,
    recommendations: generateDriverSwaps(MOCK_DRIVERS, budget),
    constructorRecommendations: generateConstructorSwaps(MOCK_CONSTRUCTORS, budget),
  };
}

export const MOCK_PRICES: { drivers: FantasyDriver[]; constructors: FantasyConstructor[]; round: number } = {
  round: 1,
  drivers: MOCK_DRIVERS.map((d, i) => ({
    id: i + 1,
    firstName: d.firstName,
    lastName: d.lastName,
    teamName: d.teamName,
    price: d.price!,
    selectedPercentage: d.selectedPercentage!,
    overallPoints: d.overallPoints!,
    gamedayPoints: 0,
    priceChange: d.priceChange!,
  })),
  constructors: MOCK_CONSTRUCTORS.map((c, i) => ({
    id: 100 + i,
    name: c.name,
    price: c.price!,
    selectedPercentage: c.selectedPercentage!,
    overallPoints: c.overallPoints!,
    gamedayPoints: 0,
    priceChange: c.priceChange!,
  })),
};
