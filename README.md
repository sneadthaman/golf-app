# Golf Betting Engine

TypeScript betting engine + web harness for Nassau-style team games.

The app is currently a development harness to validate scoring logic, persistence, and season tracking before mobile app build-out.

## Current Capabilities

- Course search/load from GolfCourseAPI
- Round setup:
  - course + tee selection
  - 4 players
  - 2v2 teams
  - manual strokes received
  - configurable front/back/overall/press values
  - double-game toggle
- Player identity workflow:
  - DB player search + assignment to a player slot
  - required official first + last name for identity
  - optional round display alias (example: official `Sam Janvey`, display `SJ`)
- Live scoring:
  - hole-by-hole gross score entry
  - automatic net score calculation
  - running front/back/overall status
  - auto-press generation and tracking
- Side games:
  - manual junk entry
  - closest-to-pin for par 3 and par 5
  - independent carryover banks for par 3 vs par 5
  - CP is awarded to individual players (not teams)
- Persistence + recovery:
  - manual save + autosave
  - saved rounds list (status/date/course/players/holes completed)
  - load/resume saved rounds from snapshots
  - mark round abandoned
  - snapshot contract versioning (`schemaVersion`)
  - ownership ACL (`owner/editor/viewer`) enforced on save/load/list
- Season tracking:
  - season junk leaderboard from saved snapshots
  - includes junk + CP points
  - crown icon for current #1 (Junk King)
- Settlement UX:
  - simplified team owes/wins summary
  - player junk totals
  - CP winners
  - press results collapsed by default
  - copy/share settlement summary
  - text-message export format

## Mobile (Expo) Scaffold

- React Native Expo app scaffold is in `mobile-expo/`
- Implemented mobile harness flows:
  - Create round
  - Resume round
  - Score round
  - Settlement view
  - Season leaderboard
- Mobile currently persists snapshots locally via AsyncStorage, with contract-compatible shape and ACL checks.

Run:

- `cd mobile-expo`
- `npm install`
- `npm run start`

Optional identity override for ownership testing:

- `EXPO_PUBLIC_ROUND_USER_ID=sam-device npm run start`

## Stack

- TypeScript
- Vite
- Vitest
- Playwright
- Supabase

## Commands

- `npm run web` start local UI (default Vite port)
- `npm run web -- --host 127.0.0.1 --port 5174` start local UI on fixed port
- `npm run build` type-check project
- `npm test` run unit tests
- `npm run test:e2e` run Playwright E2E tests
- `npm run simulate -- --seed 42 --handicap 12 --tee white` run CLI simulation
- `npm run fetch-course -- --search "Old Westbury Golf & Country Club"` fetch/normalize live course
- `npm run seed-old-westbury` seed reference course data into Supabase

## Environment Variables

### Course API

- `VITE_GOLFCOURSEAPI_KEY` (preferred for browser)
- `GOLFCOURSEAPI_KEY` (also supported)
- optional base URL overrides:
  - `VITE_GOLFCOURSEAPI_BASE_URL`
  - `GOLFCOURSEAPI_BASE_URL`

### Supabase

- `VITE_SUPABASE_URL` (or `SUPABASE_URL`)
- `VITE_SUPABASE_SERVICE_ROLE_KEY` (or `VITE_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`)

## Supabase Setup

1. Run `supabase/schema.sql` in Supabase SQL editor.
2. If your project already has older schema versions, re-run the full file.
   - It contains compatibility-safe `alter table ... add column if not exists` statements.
3. If you have historical duplicate player rows, run `supabase/dedupe_players.sql`.
4. Optional: `npm run seed-old-westbury`.

## Data Written by Save/Autosave

### Snapshot table

- `round_snapshots`
  - metadata includes `schemaVersion` and `ownership`

### Normalized tables

- `rounds`
- `players`
- `round_teams`
- `round_players`
- `hole_scores`
- `round_junk_events`
- `round_closest_events`
- `round_presses`
- `ledger_entries`

## Player Identity Model

- Identity key: `players.first_name + players.last_name`
- Display aliases are round-level and do not change canonical player identity.
- DB-assigned players use their existing UUID for season continuity.

## Project Layout

- `src/engine/*` core betting and settlement logic
- `src/simulation/*` deterministic simulation helpers
- `src/courseData/*` course provider + cache + normalization layer
- `web/main.ts` browser harness UI logic
- `web/persistence.ts` Supabase save/load/search/leaderboard logic
- `supabase/schema.sql` schema
- `supabase/dedupe_players.sql` one-time dedupe/migration script
- `tests/*` unit tests
- `e2e/*` Playwright E2E coverage

## Next Priorities

- Wire mobile storage adapter from AsyncStorage to Supabase snapshots
- Add mobile auth/session identity integration
- Expand mobile scoring parity with full engine rules
