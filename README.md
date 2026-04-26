# Golf Betting Engine

TypeScript betting engine + web harness for Nassau-style team games.

Current scope is a practical dev harness for validating game logic and persistence before mobile app work.

## What Works Now

- Course search/load from GolfCourseAPI (with recent courses)
- Round setup in UI:
  - course + tee selection
  - 4 players
  - 2v2 teams
  - manual strokes received
  - configurable front/back/overall/press values
  - double-game toggle
- Live score entry:
  - hole-by-hole gross scores
  - automatic net score calculation
  - running front/back/overall match status
  - auto-press generation and status
- Side games:
  - manual junk entry
  - closest-to-pin on par 3 and par 5
  - independent par 3/par 5 carryover banks
- Settlement display:
  - running ledger
  - by-team and by-player totals
- Persistence to Supabase from UI:
  - JSON snapshot (`round_snapshots`)
  - normalized tables (rounds, players, teams, scores, events, ledger)

## Stack

- TypeScript
- Vite
- Vitest
- Playwright
- Supabase

## Commands

- `npm run web` start local UI (default Vite port)
- `npm run web -- --host 127.0.0.1 --port 5174` start UI on fixed local port
- `npm test` run unit tests
- `npm run build` type-check project
- `npm run test:e2e` run Playwright tests
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

### Supabase (web save)

- `VITE_SUPABASE_URL` (or `SUPABASE_URL`)
- `VITE_SUPABASE_SERVICE_ROLE_KEY` (or `VITE_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`)

## Supabase Setup

1. Open `supabase/schema.sql` in Supabase SQL editor and run it.
2. If your project already has older schema versions, run the full file again.
   - It includes `alter table ... add column if not exists` for compatibility.
3. Optional: seed known course data.
   - `npm run seed-old-westbury`

### Tables Written by “Save Round to Supabase”

- Snapshot:
  - `round_snapshots`
- Normalized:
  - `rounds`
  - `players`
  - `round_teams`
  - `round_players`
  - `hole_scores`
  - `round_junk_events`
  - `round_closest_events`
  - `round_presses`
  - `ledger_entries`

## Project Layout

- `src/engine/*` core betting/settlement logic
- `src/simulation/*` deterministic simulation helpers
- `src/courseData/*` provider/caching/normalization layer
- `web/main.ts` browser harness UI logic
- `web/persistence.ts` Supabase save logic
- `supabase/schema.sql` database schema
- `tests/*` unit tests
- `e2e/*` Playwright flows

## Current Product Position

This browser UI is intentionally a developer harness to validate scoring rules and persistence.
It is not yet the final user-facing mobile UX.

## Next Work (High Level)

- Load/resume saved rounds in UI
- Saved rounds list/view
- Continue tightening API error states and edge handling
- Keep engine + persistence contract ready for mobile client integration
