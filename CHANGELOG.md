# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Unit test suite (Vitest) for the recommendation engine, name matching, value score, and cache
- Tests for the team-upgrade optimizer, retry logic, live-session detection, Fantasy feed field mapping, and the lap/sector/top-speed reducers
- Runtime validation of external feeds (OpenF1, F1 Fantasy, Ergast) with zod
- Reusable `CollapsibleSection` and `Pagination` components
- Shared `format` module for lap time, price, and price-change formatting
- Centralized API response types shared between routes and client

### Changed

- Unified the driver and constructor swap logic into a single shared module (previously duplicated four times)
- Recommendations are now computed client-side, so changing the budget no longer triggers a refetch
- `/api/drivers` now returns constructor analysis alongside drivers
- Centralized the `USE_MOCK_DATA` flag into a single config module
- Split the page into a `TrainingTab` component plus shared building blocks
- Renamed the cache eviction to reflect its actual soonest-to-expire behavior (previously mislabeled as LRU)
- The Team and Prices tabs now reuse the shared `CollapsibleSection` and `Pagination` components instead of hand-rolled copies
- External API calls are now bounded by a per-attempt request timeout so a hung upstream can't block a route
- The cache now purges expired entries before evicting to enforce its size cap
- Session info is fetched alongside laps and drivers in parallel rather than sequentially

### Fixed

- Mock mode now uses the same recommendation engine as production; constructor swaps were comparing best lap time instead of average, showing different results than the live app
- Driver matching now uses the three-letter acronym instead of last name, fixing mismatches on names with diacritics (e.g. Hülkenberg)
- Constructor matching reconciles sponsor-prefixed Fantasy names via a canonical alias map without falsely merging distinct teams
- External feeds now fail loudly on a shape change instead of silently producing `NaN`
- The current round now fails loudly on a calendar outage instead of silently serving season-opener prices, and an invalid player/round id is rejected rather than becoming `NaN`
- A future-only race weekend now returns no meeting (404) instead of an empty driver table
- The error banner clears on a successful refetch instead of persisting
- Removed the unused `/api/recommendations` route and a dead driver sort field
- Retry logic no longer swallows the final failed attempt
- Toast notification timer is cleared on unmount and no longer stacks
- Training round indicator shows the actual round instead of the internal meeting key

## [0.2.0] - 2026-03-13

### Added

- Prominent round indicator at the top of the Prices tab
- Collapsible sections for all data panels (Driver Table, Swap Recs, Prices)
- Column visibility toggle for Driver Table (S1/S2/S3, Top Speed, Price, Laps)
- Pagination for driver and constructor swap recommendations (10 per page)
- Driver filter on swap recommendations (filter by driverOut)
- Live-session handling with toast notification when OpenF1 returns 401

### Changed

- Constructor performance now uses average of both drivers instead of best driver only

## [0.1.0] - 2026-02-26

### Added

- F1 Fantasy Optimizer core functionality with data from OpenF1 API and F1 Fantasy Feed
- Driver performance table with FP1/FP2/FP3 lap times
- Constructor performance derived from best driver lap times per team
- Driver and constructor swap recommendations with budget awareness
- Prices tab showing driver and constructor fantasy prices
- Tab navigation between Performance and Prices views
- Info tooltips explaining data sources and swap recommendation logic
- Mobile-optimized responsive layout
- Mock data mode (`USE_MOCK_DATA=true`) for UI development without external APIs
- Dynamic version footer from package.json
- In-memory cache with 8-12h TTL and LRU eviction (max 100 entries)
- Retry logic for external API calls (3x with exponential backoff)
- CORS support with configurable `ALLOWED_ORIGIN` header
- Input validation for `session_key` and `budget` on API routes
- Multi-stage Dockerfile for production builds
- GitHub Actions workflow to publish Docker image to GHCR
- Project README with setup instructions

### Fixed

- Exact constructor name matching to prevent false matches between teams
- Tooltip clipping caused by overflow-hidden on containers
- Mobile tooltip positioning
- Various code review findings (error handling, type safety)
