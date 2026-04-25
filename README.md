# Golf Betting Engine (MVP)

Pure TypeScript betting engine for Nassau + junk + carryovers + presses, with a deterministic simulation harness.

## Commands

- `npm test` run unit tests
- `npm run build` type-check all TypeScript
- `npm run simulate -- --seed 42 --handicap 12 --tee white` run CLI simulation
- `npm run web` launch local UI at `http://localhost:5173`
  - includes hole-by-hole match state, ledger, junk/CP summaries, and auto-press visibility

## Course Fixture

- `createSimplePar72Course()` returns an 18-hole par-72 course
- Holes include:
  - `holeNumber`
  - `par`
  - `handicapIndex` (1-18)
  - `yardageByTeeBox`
- Tee boxes include:
  - `id`
  - `name`
  - `color`
  - `courseRating`
  - `slope`

## Simulation

- `simulateSameHandicapRound()` creates a deterministic 4-player (2v2) round
- Uses the same betting engine code path as app logic
- Supports `seed`, `handicap`, and `teeBoxId` options for repeatable runs
- Includes simulated:
  - hole-by-hole winner + running front/back/overall status
  - junk events
  - closest-to-pin (par 3 carryover) events
  - par-5 carryover events
  - auto-press generation
