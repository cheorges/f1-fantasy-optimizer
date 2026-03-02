# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
