import { Course, createCourseProvider, createSimplePar72Course, simulateSameHandicapRound } from "../src";
import { CourseFlowController, formatCourseLabel } from "./courseFlow";

const seedInput = document.querySelector<HTMLInputElement>("#seed");
const handicapInput = document.querySelector<HTMLInputElement>("#handicap");
const teeBoxSelect = document.querySelector<HTMLSelectElement>("#teeBox");
const simulateBtn = document.querySelector<HTMLButtonElement>("#simulateBtn");
const holeHeaderRowEl = document.querySelector<HTMLElement>("#holeHeaderRow");
const summaryEl = document.querySelector<HTMLElement>("#summary");
const holeRowsEl = document.querySelector<HTMLElement>("#holeRows");
const courseRowsEl = document.querySelector<HTMLElement>("#courseRows");
const ledgerRowsEl = document.querySelector<HTMLElement>("#ledgerRows");
const settlementEl = document.querySelector<HTMLElement>("#settlement");
const courseQueryInput = document.querySelector<HTMLInputElement>("#courseQuery");
const searchCourseBtn = document.querySelector<HTMLButtonElement>("#searchCourseBtn");
const courseResultsSelect = document.querySelector<HTMLSelectElement>("#courseResults");
const loadMoreBtn = document.querySelector<HTMLButtonElement>("#loadMoreBtn");
const loadCourseBtn = document.querySelector<HTMLButtonElement>("#loadCourseBtn");
const recentCoursesSelect = document.querySelector<HTMLSelectElement>("#recentCourses");
const loadRecentBtn = document.querySelector<HTMLButtonElement>("#loadRecentBtn");
const clearRecentBtn = document.querySelector<HTMLButtonElement>("#clearRecentBtn");
const courseStatusEl = document.querySelector<HTMLElement>("#courseStatus");

if (
  !seedInput ||
  !handicapInput ||
  !teeBoxSelect ||
  !simulateBtn ||
  !holeHeaderRowEl ||
  !summaryEl ||
  !holeRowsEl ||
  !courseRowsEl ||
  !ledgerRowsEl ||
  !settlementEl ||
  !courseQueryInput ||
  !searchCourseBtn ||
  !courseResultsSelect ||
  !loadMoreBtn ||
  !loadCourseBtn ||
  !recentCoursesSelect ||
  !loadRecentBtn ||
  !clearRecentBtn ||
  !courseStatusEl
) {
  throw new Error("Missing required DOM elements");
}

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const { provider: courseProvider, source: providerSource } = createCourseProvider({
  golfCourseApiKey: env?.VITE_GOLFCOURSEAPI_KEY ?? env?.GOLFCOURSEAPI_KEY,
  golfCourseApiBaseUrl: env?.VITE_GOLFCOURSEAPI_BASE_URL ?? env?.GOLFCOURSEAPI_BASE_URL
});

const storage = typeof localStorage === "undefined" ? undefined : localStorage;
const SEARCH_MIN_CHARS = 4;
const SEARCH_DEBOUNCE_MS = 250;
const SEARCH_PAGE_SIZE = 8;
const SIMULATION_CONTROLS_STORAGE_KEY = "golf-app.simulation-controls.v1";
const courseFlow = new CourseFlowController({
  provider: courseProvider,
  storage,
  minSearchChars: SEARCH_MIN_CHARS,
  searchPageSize: SEARCH_PAGE_SIZE
});
courseFlow.initialize();

let currentCourse: Course = createSimplePar72Course();
let controlsBusy = false;
let searchDebounceHandle: number | undefined;

interface SimulationControlsState {
  seed: string;
  handicap: string;
  teeBoxId?: string;
}

function setCourseStatus(message: string, isError = false): void {
  courseStatusEl.textContent = message;
  courseStatusEl.classList.toggle("error", isError);
}

function setControlsBusy(isBusy: boolean): void {
  controlsBusy = isBusy;
  const searchResults = courseFlow.getSearchResults();
  const recentCourses = courseFlow.getRecentCourses();
  const hasMoreSearchResults = courseFlow.hasMoreSearchResults();

  searchCourseBtn.disabled = isBusy;
  courseResultsSelect.disabled = isBusy || searchResults.length === 0;
  loadCourseBtn.disabled = isBusy || searchResults.length === 0 || !courseResultsSelect.value;
  loadMoreBtn.disabled = isBusy || !hasMoreSearchResults;
  recentCoursesSelect.disabled = isBusy || recentCourses.length === 0;
  loadRecentBtn.disabled = isBusy || recentCourses.length === 0 || !recentCoursesSelect.value;
  clearRecentBtn.disabled = isBusy || recentCourses.length === 0;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function readSimulationControls(): SimulationControlsState | undefined {
  if (!storage) return undefined;
  try {
    const raw = storage.getItem(SIMULATION_CONTROLS_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return undefined;
    const item = parsed as Record<string, unknown>;
    const seed = typeof item.seed === "string" ? item.seed : undefined;
    const handicap = typeof item.handicap === "string" ? item.handicap : undefined;
    const teeBoxId = typeof item.teeBoxId === "string" ? item.teeBoxId : undefined;
    if (!seed || !handicap) return undefined;
    return { seed, handicap, ...(teeBoxId ? { teeBoxId } : {}) };
  } catch {
    return undefined;
  }
}

function persistSimulationControls(): void {
  if (!storage) return;
  try {
    const payload: SimulationControlsState = {
      seed: seedInput.value || "42",
      handicap: handicapInput.value || "12",
      ...(teeBoxSelect.value ? { teeBoxId: teeBoxSelect.value } : {})
    };
    storage.setItem(SIMULATION_CONTROLS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage write failures.
  }
}

function applyInitialSimulationControls(): void {
  const saved = readSimulationControls();
  if (!saved) return;
  seedInput.value = saved.seed;
  handicapInput.value = saved.handicap;
  populateTeeBoxes(currentCourse, saved.teeBoxId);
}

function populateTeeBoxes(course: Course, preferredTeeBoxId?: string): void {
  teeBoxSelect.replaceChildren();
  for (const teeBox of course.teeBoxes) {
    const option = document.createElement("option");
    option.value = teeBox.id;
    option.textContent = `${teeBox.name} (Rating ${teeBox.courseRating}, Slope ${teeBox.slope})`;
    teeBoxSelect.append(option);
  }

  const selected =
    (preferredTeeBoxId && course.teeBoxes.some((item) => item.id === preferredTeeBoxId) && preferredTeeBoxId) ||
    course.teeBoxes[0]?.id ||
    "";
  teeBoxSelect.value = selected;
}

function populateCourseResults(): void {
  const results = courseFlow.getSearchResults();
  courseResultsSelect.replaceChildren();

  if (!results.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No results";
    courseResultsSelect.append(option);
    setControlsBusy(controlsBusy);
    return;
  }

  for (const result of results) {
    const option = document.createElement("option");
    option.value = result.id;
    option.textContent = formatCourseLabel(result);
    courseResultsSelect.append(option);
  }

  setControlsBusy(controlsBusy);
}

function populateRecentCourses(): void {
  const recentCourses = courseFlow.getRecentCourses();
  recentCoursesSelect.replaceChildren();

  if (!recentCourses.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No recent courses";
    recentCoursesSelect.append(option);
    setControlsBusy(controlsBusy);
    return;
  }

  for (const course of recentCourses) {
    const option = document.createElement("option");
    option.value = course.id;
    option.textContent = formatCourseLabel(course);
    recentCoursesSelect.append(option);
  }

  setControlsBusy(controlsBusy);
}

async function runCourseSearch(query: string): Promise<void> {
  const trimmed = query.trim();
  const shouldQueryProvider = trimmed.length >= SEARCH_MIN_CHARS;
  if (shouldQueryProvider) {
    setControlsBusy(true);
    setCourseStatus("Searching courses...");
  }

  const outcome = await courseFlow.searchCourses(query);
  populateCourseResults();
  setControlsBusy(false);
  setCourseStatus(outcome.message, !outcome.ok);
}

function loadMoreResults(): void {
  const outcome = courseFlow.loadMoreSearchResults();
  populateCourseResults();
  setControlsBusy(false);
  setCourseStatus(outcome.message, !outcome.ok);
}

async function loadSelectedCourse(): Promise<void> {
  setControlsBusy(true);
  setCourseStatus("Loading selected course...");

  const outcome = await courseFlow.loadCourseFromSearch(courseResultsSelect.value);
  if (outcome.ok && outcome.course) {
    currentCourse = outcome.course;
    const saved = readSimulationControls();
    populateTeeBoxes(currentCourse, saved?.teeBoxId);
    renderSimulation();
    populateRecentCourses();
    setControlsBusy(false);
    setCourseStatus(outcome.message);
    return;
  }

  setControlsBusy(false);
  setCourseStatus(outcome.message, true);
}

async function loadRecentCourse(): Promise<void> {
  setControlsBusy(true);
  setCourseStatus("Loading recent course...");

  const outcome = await courseFlow.loadCourseFromRecent(recentCoursesSelect.value);
  if (outcome.ok && outcome.course) {
    currentCourse = outcome.course;
    const saved = readSimulationControls();
    populateTeeBoxes(currentCourse, saved?.teeBoxId);
    renderSimulation();
    populateRecentCourses();
    setControlsBusy(false);
    setCourseStatus(outcome.message);
    return;
  }

  setControlsBusy(false);
  setCourseStatus(outcome.message, true);
}

function renderSimulation(): void {
  persistSimulationControls();
  const seed = Number(seedInput.value || "42");
  const handicap = Number(handicapInput.value || "12");
  const teeBoxId = teeBoxSelect.value;
  const teeBox = currentCourse.teeBoxes.find((item) => item.id === teeBoxId);

  const { round, ledger, settlement, holeBreakdown } = simulateSameHandicapRound({
    seed,
    handicap,
    teeBoxId,
    course: currentCourse,
    roundId: `sim-${seed}-${handicap}-${teeBoxId}`
  });

  const halvedHoles = round.holeResults.filter((hole) => hole.isHalved).length;
  const teamAHoleWins = round.holeResults.filter((hole) => hole.winningTeamId === "teamA").length;
  const teamBHoleWins = round.holeResults.filter((hole) => hole.winningTeamId === "teamB").length;
  const junkPoints = ledger
    .filter((entry) => entry.type === "junk" || entry.type === "hole_in_one")
    .reduce((sum, entry) => sum + entry.points, 0);
  const cpPoints = ledger.filter((entry) => entry.type === "closest_par3").reduce((sum, entry) => sum + entry.points, 0);
  const pressPoints = ledger.filter((entry) => entry.type === "press_win").reduce((sum, entry) => sum + entry.points, 0);
  const strokesByPlayer = new Map(round.roundPlayers.map((item) => [item.playerId, item.strokesReceived]));
  summaryEl.innerHTML = `
    <div><strong>Course:</strong> ${escapeHtml(currentCourse.name)} (${escapeHtml(teeBox?.name ?? teeBoxId)})</div>
    <div><strong>Par Total:</strong> ${currentCourse.parTotal}</div>
    <div><strong>Hole Wins:</strong> Team A ${teamAHoleWins}, Team B ${teamBHoleWins}, Halved ${halvedHoles}</div>
    <div><strong>Sim Events:</strong> Junk ${round.junkEvents.length}, CP ${round.closestEvents.length}, Par5 Carryover ${round.par5CarryoverEvents.length}, Auto Presses ${round.presses?.length ?? 0}</div>
    <div><strong>Ledger Points:</strong> Junk ${junkPoints}, CP ${cpPoints}, Press ${pressPoints}</div>
    <div><strong>Players:</strong> ${round.players.map((player) => `${player.name} (${strokesByPlayer.get(player.id) ?? 0} strokes)`).join(", ")}</div>
  `;

  const pressIds = [...(round.presses ?? [])]
    .sort((a, b) => a.startingHole - b.startingHole || a.id.localeCompare(b.id))
    .map((press) => press.id);
  const pressHeaderCells = pressIds.map((_, idx) => `<th>Press ${idx + 1}</th>`).join("");
  holeHeaderRowEl.innerHTML = `
    <th>Hole</th>
    <th>Par</th>
    <th>A Net</th>
    <th>B Net</th>
    <th>Winner</th>
    <th>Front</th>
    <th>Back</th>
    <th>Overall</th>
    ${pressHeaderCells}
  `;

  holeRowsEl.innerHTML = holeBreakdown
    .map((hole) => {
      const winner = hole.isHalved ? "HALVED" : hole.winningTeamId ?? "-";
      const pressCells = pressIds
        .map((pressId) => {
          const status = hole.pressStatusById[pressId] ?? "-";
          const started = hole.pressesCreated.includes(pressId) ? " (start)" : "";
          return `<td>${escapeHtml(`${status}${started}`)}</td>`;
        })
        .join("");
      return `<tr><td>${hole.holeNumber}</td><td>${hole.par}</td><td>${hole.teamABestNet}</td><td>${hole.teamBBestNet}</td><td>${winner}</td><td>${hole.frontStatus}</td><td>${hole.backStatus}</td><td>${hole.overallStatus}</td>${pressCells}</tr>`;
    })
    .join("");

  courseRowsEl.innerHTML = currentCourse.holes
    .map((hole) => {
      const yardage = hole.yardageByTeeBox?.[teeBoxId] ?? "-";
      return `<tr><td>${hole.holeNumber}</td><td>${hole.par}</td><td>${hole.handicapIndex}</td><td>${yardage}</td></tr>`;
    })
    .join("");

  ledgerRowsEl.innerHTML = ledger.length
    ? ledger
        .map(
          (entry) =>
            `<tr><td>${entry.holeNumber ?? "-"}</td><td>${entry.type}</td><td>${entry.teamId}</td><td>+${entry.points}</td><td>${escapeHtml(entry.description)}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="5">No ledger entries for this simulation.</td></tr>`;

  const byTeamHtml = Object.entries(settlement.byTeam)
    .map(([teamId, points]) => `<li>${teamId}: ${points}</li>`)
    .join("");
  const byPlayerHtml = Object.entries(settlement.byPlayer)
    .map(([playerId, points]) => `<li>${playerId}: ${points}</li>`)
    .join("");
  settlementEl.innerHTML = `
    <div class="settlement-grid">
      <div>
        <h3>By Team</h3>
        <ul>${byTeamHtml}</ul>
      </div>
      <div>
        <h3>By Player</h3>
        <ul>${byPlayerHtml}</ul>
      </div>
    </div>
  `;
}

simulateBtn.addEventListener("click", renderSimulation);
seedInput.addEventListener("input", persistSimulationControls);
handicapInput.addEventListener("input", persistSimulationControls);
teeBoxSelect.addEventListener("change", persistSimulationControls);
searchCourseBtn.addEventListener("click", () => {
  void runCourseSearch(courseQueryInput.value);
});
loadMoreBtn.addEventListener("click", () => {
  loadMoreResults();
});
courseResultsSelect.addEventListener("change", () => {
  setControlsBusy(controlsBusy);
});
loadCourseBtn.addEventListener("click", () => {
  void loadSelectedCourse();
});
recentCoursesSelect.addEventListener("change", () => {
  setControlsBusy(controlsBusy);
});
loadRecentBtn.addEventListener("click", () => {
  void loadRecentCourse();
});
clearRecentBtn.addEventListener("click", () => {
  courseFlow.clearRecentCourses();
  populateRecentCourses();
  setControlsBusy(false);
  setCourseStatus("Cleared recent courses.");
});
courseQueryInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    if (searchDebounceHandle) {
      clearTimeout(searchDebounceHandle);
      searchDebounceHandle = undefined;
    }
    void runCourseSearch(courseQueryInput.value);
  }
});
courseQueryInput.addEventListener("input", () => {
  if (searchDebounceHandle) {
    clearTimeout(searchDebounceHandle);
  }
  searchDebounceHandle = window.setTimeout(() => {
    searchDebounceHandle = undefined;
    void runCourseSearch(courseQueryInput.value);
  }, SEARCH_DEBOUNCE_MS);
});

populateTeeBoxes(currentCourse, "white");
applyInitialSimulationControls();
populateCourseResults();
populateRecentCourses();
setControlsBusy(false);

if (providerSource === "golfcourseapi") {
  setCourseStatus("Live provider enabled. Search and load a course from GolfCourseAPI.");
} else {
  setCourseStatus(
    `Mock provider active. Type ${SEARCH_MIN_CHARS}+ chars to search. Set VITE_GOLFCOURSEAPI_KEY to enable live course search/load.`
  );
}

renderSimulation();
