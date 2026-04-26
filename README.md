# Golf Betting Engine (MVP)

Pure TypeScript betting engine for Nassau + junk + carryovers + presses, with a deterministic simulation harness.

## Commands

- `npm test` run unit tests
- `npm run build` type-check all TypeScript
- `npm run simulate -- --seed 42 --handicap 12 --tee white` run CLI simulation
- `npm run fetch-course -- --search "Old Westbury Golf & Country Club"` fetch and normalize a live GolfCourseAPI course
- `npm run seed-old-westbury` upsert Old Westbury facility/course/tee/hole data into Supabase
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

## Handicap MVP Rule

- No GHIN/USGA lookup in app.
- Store manual `strokesReceived` per player at round level (`RoundPlayer`).
- Net score uses per-round strokes and hole handicap index:
  - Example: 4 strokes -> 1 stroke on holes indexed 1-4.
  - Example: 20 strokes -> 1 stroke on all 18 + extra on indexes 1-2.

## Course Data Provider Layer

- `CourseProvider` abstraction in `src/courseData`
  - `searchCourses(query)`
  - `getCourse(courseId)`
- Included implementations:
  - `MockCourseProvider` for local/dev data
  - `ApiCourseProvider` scaffold for future API integration
  - `GolfCourseApiProvider` for `https://api.golfcourseapi.com` (`Authorization: Key <API_KEY>`)
  - `CachedCourseProvider` with `InMemoryCourseCache`
- `normalizeExternalCourse()` validates and maps external payloads into the internal `Course` model.
- Set `GOLFCOURSEAPI_KEY` before live fetches:
  - `export GOLFCOURSEAPI_KEY=your_key_here`

## Supabase setup

1. Run `supabase/schema.sql` in your Supabase SQL editor.
2. Set env vars:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GOLFCOURSEAPI_KEY`
3. Seed Old Westbury data:
   - `npm run seed-old-westbury`

The seed script upserts these Old Westbury Golf & Country Club course IDs:
- `6760`
- `6770`
- `6847`
- `7316` (Bluegrass/Overlook)
- `7339` (Woods/Bluegrass)
- `7626` (Overlook/Woods)

## Next Up (Prioritized)

- [ ] Move incremental loading from client-side slicing to provider-backed paging (true API pagination)
- [ ] Add structured API error UI states (auth, rate-limit, timeout, no-results) with targeted recovery actions
- [ ] Add E2E CI job (Playwright) gated on PRs with artifact upload on failure
- [ ] Add “Clear search/results” and keyboard-first interactions for faster dev-harness use
- [ ] Define mobile app integration contract (shared search/load state model + API surface)

## Live Course UI Setup

- For local UI live course search/load, set either:
  - `VITE_GOLFCOURSEAPI_KEY` (standard Vite style), or
  - `GOLFCOURSEAPI_KEY` (now supported directly)
- Optional base URL override:
  - `VITE_GOLFCOURSEAPI_BASE_URL` or `GOLFCOURSEAPI_BASE_URL`
  - defaults to `https://api.golfcourseapi.com`
- Start the app:
  - `npm run web -- --host 127.0.0.1 --port 5174`
