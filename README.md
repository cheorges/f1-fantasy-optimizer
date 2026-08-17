# F1 Fantasy Team Optimizer

Combines F1 practice session data (FP1/FP2/FP3) with official F1 Fantasy prices to show
which swaps actually buy you pace, and where prices are heading. Built for the phone.

## What it does

**Home** — every driver ranked by practice pace, with sector times, top speed, price and a
value score. The heading names the session and the circuit the ranking is based on, so it is
never ambiguous which data you are looking at. Below it you pick one driver or constructor
and a budget (0.1M–15M), and get the entries that would replace them within it, sorted by
biggest lap-time gain. Only entries with at least one affordable quicker replacement are
offered. Nothing is refetched while you drag — the swaps are computed in the browser.

**Teams** — enter up to three fantasy teams (5 drivers + 2 constructors each), name them,
and give each its own budget correction (see [Budget correction](#budget-correction)). Each
team gets its own upgrade suggestions, ranked by season points gained, and a switch that
folds practice pace into the same list. Teams are saved in the browser and survive a reload.

**Prices** — current prices for all drivers and constructors, with the change since the last
round, ownership, points, and a trend indicator. See [Price trend](#price-trend) for what
that indicator can and cannot tell you.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To open it on your phone, bind to all interfaces and use your machine's LAN address
(`ipconfig getifaddr en0` on macOS, `hostname -I` on Linux):

```bash
npm run dev -- -H 0.0.0.0
```

To work on the UI without touching the external APIs — no rate limits, no live-session
outages, and the price trend column exercised across all of its states:

```bash
USE_MOCK_DATA=true npm run dev
```

### Tests and linting

```bash
npm test        # Vitest, unit tests for the lib layer
npm run lint    # ESLint (next/core-web-vitals + next/typescript)
npm run build   # production build
```

### Docker

Build and run the production image:

```bash
docker build -t f1-fantasy .
docker run -p 3000:3000 f1-fantasy
```

With environment variables:

```bash
docker run -p 3000:3000 \
  -e ALLOWED_ORIGIN=https://example.com \
  f1-fantasy
```

`docker-compose.yml` is the deployment that actually runs, pulling the published image from
`ghcr.io/cheorges/f1-fantasy-optimizer`. Images are built by a `v*` tag only — a merge to
`main` deploys nothing.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `USE_MOCK_DATA` | Use fake data for UI development | `false` |
| `ALLOWED_ORIGIN` | CORS allowed origin for API routes | `http://localhost:3000` |

## How it works

A single Next.js app — no separate backend, no database. Three routes share one client
provider that lives in the layout, so session and price data are fetched once per page load
rather than once per navigation.

### Data sources

| Source | Used for |
|--------|----------|
| [OpenF1](https://openf1.org) | Practice sessions, lap times, sector times, speed traps |
| F1 Fantasy feed | Driver and constructor prices, ownership, points |
| [Jolpica](https://api.jolpi.ca) (Ergast mirror) | Race calendar, to resolve the current round |

All three are free tiers. Requests get up to three attempts, retrying 5xx and network
failures with exponential backoff and bounding each attempt at 10s, and responses are held
in an in-memory cache (8 hours; past Fantasy
rounds for 30 days, since the feed freezes them; 100 entries max). The cache is per process
and does not survive a restart — that is deliberate, the data is cheap to refetch.

Feeds are validated with zod and fail loudly on a shape change rather than silently
producing `NaN`. One consequence worth knowing: OpenF1 returns HTTP 401 while a session is
live, which the app surfaces as a short notice instead of an error.

### Budget correction

The game's 100M cap applies to what you **paid** for your squad. The app only ever sees
today's prices, and the difference between the two is the value your drivers have gained
since you bought them — invisible from the outside. A squad reading 107.5M here can still
have budget free in the official app.

So each team carries one number you enter yourself: how much more the squad is worth today
than what was paid for it. Everything else follows from it.

```
Market value (app computes)   $107.5M
Budget correction (you)        - $8.9M
──────────────────────────────────────
Effective spend                 $98.6M / $100M
Remaining budget (app)           $1.4M   → filters the suggestions
```

It is a property of the team, not of a moment, so it stays valid while you swap drivers
around — unlike a remaining-budget figure, which goes stale the instant anything changes.
Teams saved before this existed carry a remaining budget instead, which is a different
quantity and cannot be converted, so it is dropped: **the correction has to be entered once
per team.**

### Price trend

The trend column is **an estimate, not a forecast.**

Fantasy prices move on net transfers, and the feed publishes no transfer numbers. What it
does publish is a per-round archive that never changes once written, so a price and
ownership history can be reconstructed from the feed alone. The trend compares the current
round against two rounds back and uses two proxies: which way the price moved, and which way
ownership moved.

Neither signal may contradict the other. If they disagree, or if neither moved, it reads as
stable. A signal standing still does not veto the one that moved — ownership is published as
a whole percent, so small shifts show up as no change at all. With fewer than three rounds of
history there is no trend, shown as a dash.

### Not modelled

The value score is `1000 / (lapTime × price)` — pace per dollar, nothing else. Season points,
ownership and the feed's own value-for-money figure are deliberately left out of it. Practice
pace also says nothing about race pace, fuel loads, or engine modes, so treat the swap
recommendations as one input rather than an answer.

Points and lap times are never combined into a single score either. Doing so needs an
exchange rate between a championship point and a tenth of a second, and nothing in the app
can justify one — but it would silently decide the whole ordering. The team suggestions
therefore sort points upgrades by points gained, then the pace-only cases by time gained,
and state on each row which of the two put it there.

## Tech Stack

- [Next.js](https://nextjs.org) 16
- TypeScript (strict)
- React 19
- Tailwind CSS 4
- [zod](https://zod.dev) for feed validation
- [Vitest](https://vitest.dev) for tests
