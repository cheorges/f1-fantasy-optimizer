import { z } from "zod";
import { getOrFetch } from "./cache";
import { fetchWithRetry } from "./http";
import { canonicalTeam } from "./team-names";
import type { FantasyDriver, FantasyConstructor, FantasyData } from "./types";

const FANTASY_FEED_URL = "https://fantasy.formula1.com/feeds/drivers";
const CURRENT_YEAR = new Date().getFullYear();
const CALENDAR_URL = `https://api.jolpi.ca/ergast/f1/${CURRENT_YEAR}.json`;
const CACHE_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

// Field names mirror the upstream feed's actual (typo'd) keys. zod fails loudly if the
// feed shape changes, instead of silently producing NaN downstream.
const RawFantasyPlayerSchema = z
  .object({
    PlayerId: z.string(),
    Skill: z.number(),
    Value: z.number(),
    FUllName: z.string(),
    TeamName: z.string(),
    IsActive: z.string(),
    DriverTLA: z.string(),
    OverallPpints: z.string(),
    GamedayPoints: z.string(),
    SelectedPercentage: z.string(),
    OldPlayerValue: z.number(),
    FirstName: z.string(),
    LastName: z.string(),
  })
  .passthrough();

const RawFantasyResponseSchema = z.object({
  Data: z.object({
    Value: z.array(RawFantasyPlayerSchema),
  }),
});

const ErgastResponseSchema = z.object({
  MRData: z.object({
    RaceTable: z.object({
      Races: z.array(z.object({ round: z.string(), date: z.string() })),
    }),
  }),
});

type RawFantasyPlayer = z.infer<typeof RawFantasyPlayerSchema>;

function toNumber(value: string): number {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function getCurrentRound(): Promise<number> {
  return getOrFetch(
    "fantasy:current-round",
    async () => {
      const response = await fetchWithRetry(CALENDAR_URL);
      if (!response.ok) return 1;

      const parsed = ErgastResponseSchema.safeParse(await response.json());
      if (!parsed.success) return 1;

      const races = parsed.data.MRData.RaceTable.Races;
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
    tla: raw.DriverTLA,
    teamName: raw.TeamName,
    price: raw.Value,
    selectedPercentage: toNumber(raw.SelectedPercentage),
    overallPoints: toNumber(raw.OverallPpints),
    gamedayPoints: toNumber(raw.GamedayPoints),
    priceChange: raw.Value - raw.OldPlayerValue,
  };
}

function parseConstructor(raw: RawFantasyPlayer): FantasyConstructor {
  return {
    id: parseInt(raw.PlayerId, 10),
    name: raw.FUllName,
    price: raw.Value,
    selectedPercentage: toNumber(raw.SelectedPercentage),
    overallPoints: toNumber(raw.OverallPpints),
    gamedayPoints: toNumber(raw.GamedayPoints),
    priceChange: raw.Value - raw.OldPlayerValue,
  };
}

export async function getFantasyData(): Promise<FantasyData> {
  const round = await getCurrentRound();

  return getOrFetch(
    `fantasy:data:${round}`,
    async () => {
      const response = await fetchWithRetry(`${FANTASY_FEED_URL}/${round}_en.json`);
      if (!response.ok) {
        throw new Error(`Fantasy API error: ${response.status} ${response.statusText}`);
      }

      const parsed = RawFantasyResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        throw new Error(`Fantasy feed shape changed: ${parsed.error.issues[0]?.message ?? "unknown"}`);
      }

      const players = parsed.data.Data.Value.filter((p) => p.IsActive === "1");
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

  // Keyed by three-letter acronym (TLA) — ASCII and stable, unlike last names which
  // diverge across feeds on diacritics (e.g. "Hülkenberg" vs "Hulkenberg").
  for (const driver of data.drivers) {
    priceMap.set(driver.tla.toUpperCase(), driver);
  }

  return priceMap;
}

export async function getConstructorPrices(): Promise<Map<string, FantasyConstructor>> {
  const data = await getFantasyData();
  const priceMap = new Map<string, FantasyConstructor>();

  for (const constructor of data.constructors) {
    priceMap.set(canonicalTeam(constructor.name), constructor);
  }

  return priceMap;
}
