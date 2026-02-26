import { getOrFetch } from "./cache";
import type { FantasyDriver, FantasyConstructor, FantasyData } from "./types";

const FANTASY_FEED_URL = "https://fantasy.formula1.com/feeds/drivers";
const CALENDAR_URL = "https://api.jolpi.ca/ergast/f1/2026.json";
const CACHE_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

interface RawFantasyPlayer {
  PlayerId: string;
  Skill: number;
  PositionName: string;
  Value: number;
  TeamId: string;
  FUllName: string;
  DisplayName: string;
  TeamName: string;
  IsActive: string;
  DriverTLA: string;
  OverallPpints: string;
  GamedayPoints: string;
  SelectedPercentage: string;
  OldPlayerValue: number;
  FirstName: string;
  LastName: string;
}

interface RawFantasyResponse {
  Data: {
    Value: RawFantasyPlayer[];
  };
}

interface ErgastRace {
  round: string;
  date: string;
}

interface ErgastResponse {
  MRData: {
    RaceTable: {
      Races: ErgastRace[];
    };
  };
}

async function getCurrentRound(): Promise<number> {
  return getOrFetch(
    "fantasy:current-round",
    async () => {
      const response = await fetch(CALENDAR_URL);
      if (!response.ok) return 1;

      const data = (await response.json()) as ErgastResponse;
      const races = data.MRData.RaceTable.Races;
      const now = new Date();

      // Find the next upcoming or most recent race
      for (const race of races) {
        if (new Date(race.date) >= now) {
          return parseInt(race.round, 10);
        }
      }

      // If all races are past, return the last round
      const lastRace = races[races.length - 1];
      return lastRace ? parseInt(lastRace.round, 10) : 1;
    },
    CACHE_TTL_MS,
  );
}

function parseDriver(raw: RawFantasyPlayer): FantasyDriver {
  return {
    id: parseInt(raw.PlayerId, 10),
    firstName: raw.FirstName,
    lastName: raw.LastName,
    teamName: raw.TeamName,
    price: raw.Value,
    selectedPercentage: parseFloat(raw.SelectedPercentage),
    overallPoints: parseFloat(raw.OverallPpints),
    gamedayPoints: parseFloat(raw.GamedayPoints),
    priceChange: raw.Value - raw.OldPlayerValue,
  };
}

function parseConstructor(raw: RawFantasyPlayer): FantasyConstructor {
  return {
    id: parseInt(raw.PlayerId, 10),
    name: raw.FUllName,
    price: raw.Value,
    selectedPercentage: parseFloat(raw.SelectedPercentage),
    overallPoints: parseFloat(raw.OverallPpints),
    gamedayPoints: parseFloat(raw.GamedayPoints),
    priceChange: raw.Value - raw.OldPlayerValue,
  };
}

export async function getFantasyData(): Promise<FantasyData> {
  const round = await getCurrentRound();

  return getOrFetch(
    `fantasy:data:${round}`,
    async () => {
      const response = await fetch(`${FANTASY_FEED_URL}/${round}_en.json`);
      if (!response.ok) {
        throw new Error(`Fantasy API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as RawFantasyResponse;
      const players = data.Data.Value.filter((p) => p.IsActive === "1");

      const drivers = players.filter((p) => p.Skill === 1).map(parseDriver);
      const constructors = players.filter((p) => p.Skill === 2).map(parseConstructor);

      return { drivers, constructors, round };
    },
    CACHE_TTL_MS,
  );
}

export async function getDriverPrices(): Promise<Map<string, FantasyDriver>> {
  const data = await getFantasyData();
  const priceMap = new Map<string, FantasyDriver>();

  for (const driver of data.drivers) {
    // Map by last name (used for matching with OpenF1 data)
    priceMap.set(driver.lastName.toUpperCase(), driver);
  }

  return priceMap;
}

export async function getConstructorPrices(): Promise<Map<string, FantasyConstructor>> {
  const data = await getFantasyData();
  const priceMap = new Map<string, FantasyConstructor>();

  for (const constructor of data.constructors) {
    // Map by normalized name for matching with OpenF1 team names
    priceMap.set(constructor.name.toUpperCase(), constructor);
  }

  return priceMap;
}
