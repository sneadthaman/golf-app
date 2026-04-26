import {
  Course,
  Round,
  calculateLedger,
  calculateNetScores,
  calculateSettlement,
  calculateSideStatus,
  createCourseProvider,
  createSimplePar72Course,
  evaluateAutoPresses,
  getHoleWinner,
  JunkType
} from "../src";
import { CourseFlowController, formatCourseLabel } from "./courseFlow";
import { RoundSnapshotPayload, saveRoundNormalized, saveRoundSnapshot } from "./persistence";

const seedInput = document.querySelector<HTMLInputElement>("#seed");
const handicapInput = document.querySelector<HTMLInputElement>("#handicap");
const teeBoxSelect = document.querySelector<HTMLSelectElement>("#teeBox");
const simulateBtn = document.querySelector<HTMLButtonElement>("#simulateBtn");
const saveRoundBtn = document.querySelector<HTMLButtonElement>("#saveRoundBtn");
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
const saveStatusEl = document.querySelector<HTMLElement>("#saveStatus");
const player1NameInput = document.querySelector<HTMLInputElement>("#player1Name");
const player2NameInput = document.querySelector<HTMLInputElement>("#player2Name");
const player3NameInput = document.querySelector<HTMLInputElement>("#player3Name");
const player4NameInput = document.querySelector<HTMLInputElement>("#player4Name");
const player1TeamSelect = document.querySelector<HTMLSelectElement>("#player1Team");
const player2TeamSelect = document.querySelector<HTMLSelectElement>("#player2Team");
const player3TeamSelect = document.querySelector<HTMLSelectElement>("#player3Team");
const player4TeamSelect = document.querySelector<HTMLSelectElement>("#player4Team");
const player1StrokesInput = document.querySelector<HTMLInputElement>("#player1Strokes");
const player2StrokesInput = document.querySelector<HTMLInputElement>("#player2Strokes");
const player3StrokesInput = document.querySelector<HTMLInputElement>("#player3Strokes");
const player4StrokesInput = document.querySelector<HTMLInputElement>("#player4Strokes");
const frontPointsInput = document.querySelector<HTMLInputElement>("#frontPoints");
const backPointsInput = document.querySelector<HTMLInputElement>("#backPoints");
const overallPointsInput = document.querySelector<HTMLInputElement>("#overallPoints");
const pressPointsInput = document.querySelector<HTMLInputElement>("#pressPoints");
const doubleGameInput = document.querySelector<HTMLInputElement>("#doubleGame");
const applySetupBtn = document.querySelector<HTMLButtonElement>("#applySetupBtn");
const setupStatusEl = document.querySelector<HTMLElement>("#setupStatus");
const scoreHeaderP1El = document.querySelector<HTMLElement>("#scoreHeaderP1");
const scoreHeaderP2El = document.querySelector<HTMLElement>("#scoreHeaderP2");
const scoreHeaderP3El = document.querySelector<HTMLElement>("#scoreHeaderP3");
const scoreHeaderP4El = document.querySelector<HTMLElement>("#scoreHeaderP4");
const scoreEntryRowsEl = document.querySelector<HTMLElement>("#scoreEntryRows");
const junkHoleSelect = document.querySelector<HTMLSelectElement>("#junkHole");
const junkPlayerSelect = document.querySelector<HTMLSelectElement>("#junkPlayer");
const junkTypeSelect = document.querySelector<HTMLSelectElement>("#junkType");
const addJunkBtn = document.querySelector<HTMLButtonElement>("#addJunkBtn");
const junkStatusEl = document.querySelector<HTMLElement>("#junkStatus");
const junkRowsEl = document.querySelector<HTMLElement>("#junkRows");
const closestTrackSelect = document.querySelector<HTMLSelectElement>("#closestTrack");
const closestHoleSelect = document.querySelector<HTMLSelectElement>("#closestHole");
const closestWinnerSelect = document.querySelector<HTMLSelectElement>("#closestWinner");
const addClosestBtn = document.querySelector<HTMLButtonElement>("#addClosestBtn");
const closestStatusEl = document.querySelector<HTMLElement>("#closestStatus");
const closestRowsEl = document.querySelector<HTMLElement>("#closestRows");

if (
  !seedInput ||
  !handicapInput ||
  !teeBoxSelect ||
  !simulateBtn ||
  !saveRoundBtn ||
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
  !courseStatusEl ||
  !saveStatusEl ||
  !player1NameInput ||
  !player2NameInput ||
  !player3NameInput ||
  !player4NameInput ||
  !player1TeamSelect ||
  !player2TeamSelect ||
  !player3TeamSelect ||
  !player4TeamSelect ||
  !player1StrokesInput ||
  !player2StrokesInput ||
  !player3StrokesInput ||
  !player4StrokesInput ||
  !frontPointsInput ||
  !backPointsInput ||
  !overallPointsInput ||
  !pressPointsInput ||
  !doubleGameInput ||
  !applySetupBtn ||
  !setupStatusEl ||
  !scoreHeaderP1El ||
  !scoreHeaderP2El ||
  !scoreHeaderP3El ||
  !scoreHeaderP4El ||
  !scoreEntryRowsEl ||
  !junkHoleSelect ||
  !junkPlayerSelect ||
  !junkTypeSelect ||
  !addJunkBtn ||
  !junkStatusEl ||
  !junkRowsEl ||
  !closestTrackSelect ||
  !closestHoleSelect ||
  !closestWinnerSelect ||
  !addClosestBtn ||
  !closestStatusEl ||
  !closestRowsEl
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

type SetupTeamId = "teamA" | "teamB";

interface RoundSetupState {
  players: Array<{
    id: string;
    name: string;
    teamId: SetupTeamId;
    strokesReceived: number;
  }>;
  points: {
    front: number;
    back: number;
    overall: number;
    press: number;
  };
  doubleGame: boolean;
}

interface ComputedHoleState {
  holeNumber: number;
  teamABestNet: number;
  teamBBestNet: number;
  winningTeamId: string | null;
  isHalved: boolean;
  frontStatus: string;
  backStatus: string;
  overallStatus: string;
  pressesCreated: string[];
  pressStatusById: Record<string, string>;
}

let roundSetup: RoundSetupState | undefined;
const scoreEntryValues = new Map<string, string>();
const manualJunkEvents: Array<{ holeNumber: number; playerId: string; type: JunkType }> = [];
const manualClosestEvents: Array<{ holeNumber: number; track: "par3" | "par5"; winnerTeamId: "teamA" | "teamB" | null }> = [];
let latestRoundSnapshot: RoundSnapshotPayload | undefined;

function setCourseStatus(message: string, isError = false): void {
  courseStatusEl.textContent = message;
  courseStatusEl.classList.toggle("error", isError);
}

function setSetupStatus(message: string, isError = false): void {
  setupStatusEl.textContent = message;
  setupStatusEl.classList.toggle("error", isError);
}

function setJunkStatus(message: string, isError = false): void {
  junkStatusEl.textContent = message;
  junkStatusEl.classList.toggle("error", isError);
}

function setSaveStatus(message: string, isError = false): void {
  saveStatusEl.textContent = message;
  saveStatusEl.classList.toggle("error", isError);
}

function setClosestStatus(message: string, isError = false): void {
  closestStatusEl.textContent = message;
  closestStatusEl.classList.toggle("error", isError);
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

function parsePositiveNumber(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseNonNegativeNumber(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function strokeCountForHole(handicap: number, holeHandicapIndex: number): number {
  if (handicap <= 0) return 0;
  const fullRounds = Math.floor(handicap / 18);
  const extra = handicap % 18;
  return fullRounds + (holeHandicapIndex <= extra ? 1 : 0);
}

function strokeCountForReplayNine(handicap: number, holeNumber: number, holeHandicapIndex: number): number {
  if (handicap <= 0) return 0;
  const frontAllowance = Math.ceil(handicap / 2);
  const backAllowance = Math.floor(handicap / 2);
  const sideAllowance = holeNumber <= 9 ? frontAllowance : backAllowance;
  const fullRounds = Math.floor(sideAllowance / 9);
  const extra = sideAllowance % 9;
  return fullRounds + (holeHandicapIndex <= extra ? 1 : 0);
}

function isReplayNineIndexes(course: Course): boolean {
  if (course.holes.length !== 18) return false;
  const counts = new Map<number, number>();
  for (const hole of course.holes) {
    counts.set(hole.handicapIndex, (counts.get(hole.handicapIndex) ?? 0) + 1);
  }
  for (let index = 1; index <= 9; index += 1) {
    if ((counts.get(index) ?? 0) !== 2) return false;
  }
  return true;
}

function scoreKey(holeNumber: number, playerId: string): string {
  return `${holeNumber}:${playerId}`;
}

function statusLabel(status: { state: "teamAUp" | "teamBUp" | "tied"; teamAUp: number; teamBUp: number }): string {
  if (status.state === "teamAUp") return `Team A ${status.teamAUp} up`;
  if (status.state === "teamBUp") return `Team B ${status.teamBUp} up`;
  return "Tied";
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

function collectRoundSetupFromInputs(): RoundSetupState | null {
  const players: RoundSetupState["players"] = [
    { id: "p1", name: player1NameInput.value.trim(), teamId: player1TeamSelect.value as SetupTeamId, strokesReceived: parseNonNegativeNumber(player1StrokesInput.value) ?? -1 },
    { id: "p2", name: player2NameInput.value.trim(), teamId: player2TeamSelect.value as SetupTeamId, strokesReceived: parseNonNegativeNumber(player2StrokesInput.value) ?? -1 },
    { id: "p3", name: player3NameInput.value.trim(), teamId: player3TeamSelect.value as SetupTeamId, strokesReceived: parseNonNegativeNumber(player3StrokesInput.value) ?? -1 },
    { id: "p4", name: player4NameInput.value.trim(), teamId: player4TeamSelect.value as SetupTeamId, strokesReceived: parseNonNegativeNumber(player4StrokesInput.value) ?? -1 }
  ];

  if (players.some((player) => player.name.length === 0)) {
    setSetupStatus("Each player must have a name.", true);
    return null;
  }
  if (players.some((player) => player.teamId !== "teamA" && player.teamId !== "teamB")) {
    setSetupStatus("Each player must be assigned to Team A or Team B.", true);
    return null;
  }
  if (players.some((player) => player.strokesReceived < 0)) {
    setSetupStatus("Player strokes must be 0 or higher.", true);
    return null;
  }

  const teamACount = players.filter((player) => player.teamId === "teamA").length;
  const teamBCount = players.filter((player) => player.teamId === "teamB").length;
  if (teamACount !== 2 || teamBCount !== 2) {
    setSetupStatus("Teams must be 2v2 (two players on Team A and two on Team B).", true);
    return null;
  }

  const front = parsePositiveNumber(frontPointsInput.value);
  const back = parsePositiveNumber(backPointsInput.value);
  const overall = parsePositiveNumber(overallPointsInput.value);
  const press = parsePositiveNumber(pressPointsInput.value);
  if (!front || !back || !overall || !press) {
    setSetupStatus("Front, back, overall, and press points must all be greater than 0.", true);
    return null;
  }

  return {
    players,
    points: { front, back, overall, press },
    doubleGame: doubleGameInput.checked
  };
}

function updateScoreEntryHeaders(): void {
  const players = roundSetup?.players;
  scoreHeaderP1El.textContent = players?.[0]?.name || "Player 1";
  scoreHeaderP2El.textContent = players?.[1]?.name || "Player 2";
  scoreHeaderP3El.textContent = players?.[2]?.name || "Player 3";
  scoreHeaderP4El.textContent = players?.[3]?.name || "Player 4";
}

function renderScoreEntryRows(): void {
  if (!roundSetup) return;
  const handicapMode =
    currentCourse.handicapMode ?? (isReplayNineIndexes(currentCourse) ? "split9_replay" : "standard18");
  const playerIds = roundSetup.players.map((player) => player.id);
  scoreEntryRowsEl.innerHTML = currentCourse.holes
    .map((hole) => {
      const cells = playerIds
        .map((playerId) => {
          const key = scoreKey(hole.holeNumber, playerId);
          const value = scoreEntryValues.get(key) ?? "";
          const player = roundSetup.players.find((item) => item.id === playerId);
          const strokesOnHole = player
            ? handicapMode === "split9_replay"
              ? strokeCountForReplayNine(player.strokesReceived, hole.holeNumber, hole.handicapIndex)
              : strokeCountForHole(player.strokesReceived, hole.handicapIndex)
            : 0;
          const marker =
            strokesOnHole > 0
              ? `<span class="stroke-marker" title="${strokesOnHole} stroke${strokesOnHole > 1 ? "s" : ""} on this hole">${strokesOnHole === 1 ? "*" : `*${strokesOnHole}`}</span>`
              : `<span class="stroke-marker empty"></span>`;
          return `<td><div class="score-cell">${marker}<input type="number" min="1" step="1" data-hole="${hole.holeNumber}" data-player="${playerId}" value="${value}" /></div></td>`;
        })
        .join("");
      return `<tr><td>${hole.holeNumber}</td><td>${hole.par}</td>${cells}</tr>`;
    })
    .join("");

  scoreEntryRowsEl.querySelectorAll<HTMLInputElement>("input[data-hole][data-player]").forEach((input) => {
    input.addEventListener("input", () => {
      const holeNumber = Number(input.dataset.hole);
      const playerId = input.dataset.player;
      if (!playerId || !Number.isFinite(holeNumber)) return;
      const key = scoreKey(holeNumber, playerId);
      const value = input.value.trim();
      if (!value) {
        scoreEntryValues.delete(key);
      } else {
        scoreEntryValues.set(key, value);
      }
      renderSimulation();
    });
  });
}

function populateJunkControls(): void {
  junkHoleSelect.replaceChildren();
  for (const hole of currentCourse.holes) {
    const option = document.createElement("option");
    option.value = String(hole.holeNumber);
    option.textContent = `Hole ${hole.holeNumber}`;
    junkHoleSelect.append(option);
  }

  junkPlayerSelect.replaceChildren();
  for (const player of roundSetup?.players ?? []) {
    const option = document.createElement("option");
    option.value = player.id;
    option.textContent = player.name;
    junkPlayerSelect.append(option);
  }
}

function renderJunkRows(): void {
  if (!roundSetup) {
    junkRowsEl.innerHTML = `<tr><td colspan="5">Apply round setup first.</td></tr>`;
    return;
  }
  if (!manualJunkEvents.length) {
    junkRowsEl.innerHTML = `<tr><td colspan="5">No junk events added yet.</td></tr>`;
    return;
  }

  const playerById = new Map(roundSetup.players.map((player) => [player.id, player]));
  junkRowsEl.innerHTML = manualJunkEvents
    .map((event, idx) => {
      const player = playerById.get(event.playerId);
      return `<tr><td>${event.holeNumber}</td><td>${escapeHtml(player?.name ?? event.playerId)}</td><td>${player?.teamId ?? "-"}</td><td>${event.type}</td><td><button type="button" data-junk-index="${idx}" class="secondary-btn">Remove</button></td></tr>`;
    })
    .join("");
}

function addManualJunkEvent(): void {
  if (!roundSetup) {
    setJunkStatus("Apply round setup before adding junk events.", true);
    return;
  }
  const holeNumber = Number(junkHoleSelect.value);
  const playerId = junkPlayerSelect.value;
  const type = junkTypeSelect.value as JunkType;
  if (!Number.isFinite(holeNumber) || holeNumber <= 0 || !playerId || !type) {
    setJunkStatus("Choose a valid hole, player, and junk type.", true);
    return;
  }
  const exists = manualJunkEvents.some(
    (event) => event.holeNumber === holeNumber && event.playerId === playerId && event.type === type
  );
  if (exists) {
    setJunkStatus("That junk event already exists.", true);
    return;
  }
  manualJunkEvents.push({ holeNumber, playerId, type });
  renderJunkRows();
  setJunkStatus(
    `Added ${type} for ${junkPlayerSelect.selectedOptions[0]?.textContent ?? playerId} on hole ${holeNumber}.`
  );
  renderSimulation();
}

function populateClosestHoleOptions(track: "par3" | "par5"): void {
  closestHoleSelect.replaceChildren();
  const parValue = track === "par3" ? 3 : 5;
  const holes = currentCourse.holes.filter((hole) => hole.par === parValue);
  for (const hole of holes) {
    const option = document.createElement("option");
    option.value = String(hole.holeNumber);
    option.textContent = `Hole ${hole.holeNumber}`;
    closestHoleSelect.append(option);
  }
}

function populateClosestControls(): void {
  const track = (closestTrackSelect.value as "par3" | "par5") || "par3";
  populateClosestHoleOptions(track);
}

function renderClosestRows(): void {
  if (!manualClosestEvents.length) {
    closestRowsEl.innerHTML = `<tr><td colspan="4">No closest-to-pin events added yet.</td></tr>`;
    return;
  }

  closestRowsEl.innerHTML = manualClosestEvents
    .map((event, idx) => {
      const resultLabel = event.winnerTeamId ? `${event.winnerTeamId} wins` : "Carry";
      return `<tr><td>${event.track.toUpperCase()}</td><td>${event.holeNumber}</td><td>${resultLabel}</td><td><button type="button" data-closest-index="${idx}" class="secondary-btn">Remove</button></td></tr>`;
    })
    .join("");
}

function addManualClosestEvent(): void {
  const track = closestTrackSelect.value as "par3" | "par5";
  const holeNumber = Number(closestHoleSelect.value);
  const winnerRaw = closestWinnerSelect.value;
  const winnerTeamId = winnerRaw === "carry" ? null : (winnerRaw as "teamA" | "teamB");

  if ((track !== "par3" && track !== "par5") || !Number.isFinite(holeNumber) || holeNumber <= 0) {
    setClosestStatus("Choose a valid track and hole.", true);
    return;
  }

  const hole = currentCourse.holes.find((item) => item.holeNumber === holeNumber);
  const expectedPar = track === "par3" ? 3 : 5;
  if (!hole || hole.par !== expectedPar) {
    setClosestStatus(`Selected hole must be a Par ${expectedPar}.`, true);
    return;
  }

  const exists = manualClosestEvents.some((event) => event.track === track && event.holeNumber === holeNumber);
  if (exists) {
    setClosestStatus(`An event for ${track.toUpperCase()} hole ${holeNumber} already exists.`, true);
    return;
  }

  manualClosestEvents.push({ holeNumber, track, winnerTeamId });
  renderClosestRows();
  setClosestStatus(
    winnerTeamId ? `Added ${track.toUpperCase()} hole ${holeNumber}: ${winnerTeamId} wins.` : `Added ${track.toUpperCase()} hole ${holeNumber}: carry.`
  );
  renderSimulation();
}

function applyRoundSetup(): boolean {
  const nextSetup = collectRoundSetupFromInputs();
  if (!nextSetup) return false;
  roundSetup = nextSetup;
  updateScoreEntryHeaders();
  renderScoreEntryRows();
  populateJunkControls();
  renderJunkRows();
  populateClosestControls();
  renderClosestRows();
  const multiplierLabel = nextSetup.doubleGame ? " (double game)" : "";
  setSetupStatus(
    `Setup applied: Team A (${nextSetup.players
      .filter((item) => item.teamId === "teamA")
      .map((item) => item.name)
      .join(", ")}) vs Team B (${nextSetup.players
      .filter((item) => item.teamId === "teamB")
      .map((item) => item.name)
      .join(", ")})${multiplierLabel}.`
  );
  return true;
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
    scoreEntryValues.clear();
    manualJunkEvents.length = 0;
    manualClosestEvents.length = 0;
    renderScoreEntryRows();
    populateJunkControls();
    renderJunkRows();
    populateClosestControls();
    renderClosestRows();
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
    scoreEntryValues.clear();
    manualJunkEvents.length = 0;
    manualClosestEvents.length = 0;
    renderScoreEntryRows();
    populateJunkControls();
    renderJunkRows();
    populateClosestControls();
    renderClosestRows();
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
  if (!roundSetup && !applyRoundSetup()) {
    setCourseStatus("Apply a valid round setup before running simulation.", true);
    return;
  }
  if (!roundSetup) {
    setCourseStatus("Round setup is not available.", true);
    return;
  }

  persistSimulationControls();
  const seed = Number(seedInput.value || "42");
  const teeBoxId = teeBoxSelect.value;
  const teeBox = currentCourse.teeBoxes.find((item) => item.id === teeBoxId);

  const players = roundSetup.players.map((item) => ({
    id: item.id,
    name: item.name,
    defaultStrokesReceived: item.strokesReceived,
    lastUsedStrokesReceived: item.strokesReceived
  }));
  const teams = [
    { id: "teamA", name: "Team A", playerIds: roundSetup.players.filter((item) => item.teamId === "teamA").map((item) => item.id) },
    { id: "teamB", name: "Team B", playerIds: roundSetup.players.filter((item) => item.teamId === "teamB").map((item) => item.id) }
  ];
  const pointMultiplier = roundSetup.doubleGame ? 2 : 1;
  const settings = {
    crazyMode: false,
    frontValuePoints: roundSetup.points.front * pointMultiplier,
    backValuePoints: roundSetup.points.back * pointMultiplier,
    overallValuePoints: roundSetup.points.overall * pointMultiplier,
    pressValuePoints: roundSetup.points.press * pointMultiplier,
    autoPressEnabled: true,
    junkEnabled: true
  };

  const roundId = `manual-${seed}-${teeBoxId}`;
  const roundPlayers = roundSetup.players.map((item) => ({
    roundId,
    playerId: item.id,
    teamId: item.teamId,
    strokesReceived: item.strokesReceived
  }));
  const teamIdByPlayerId = new Map(roundSetup.players.map((item) => [item.id, item.teamId]));
  const junkEvents = manualJunkEvents
    .filter((event) => teamIdByPlayerId.has(event.playerId))
    .map((event) => ({
      roundId,
      holeNumber: event.holeNumber,
      playerId: event.playerId,
      teamId: teamIdByPlayerId.get(event.playerId)!,
      type: event.type
    }));
  const closestEvents = manualClosestEvents
    .filter((event) => event.track === "par3")
    .map((event) => ({
      roundId,
      holeNumber: event.holeNumber,
      winnerTeamId: event.winnerTeamId
    }));
  const par5CarryoverEvents = manualClosestEvents
    .filter((event) => event.track === "par5")
    .map((event) => ({
      roundId,
      holeNumber: event.holeNumber,
      winnerTeamId: event.winnerTeamId
    }));

  const completedHoleNumbers = currentCourse.holes
    .map((hole) => hole.holeNumber)
    .filter((holeNumber) =>
      roundSetup.players.every((player) => {
        const value = scoreEntryValues.get(scoreKey(holeNumber, player.id));
        const gross = value ? Number(value) : NaN;
        return Number.isFinite(gross) && gross > 0;
      })
    );

  const grossInputs = completedHoleNumbers.flatMap((holeNumber) =>
    roundSetup.players.map((player) => ({
      holeNumber,
      playerId: player.id,
      grossScore: Number(scoreEntryValues.get(scoreKey(holeNumber, player.id)))
    }))
  );

  const holeScores = calculateNetScores(roundPlayers, currentCourse.holes, grossInputs, roundId, {
    handicapMode: currentCourse.handicapMode
  });
  const holeScoresByHole = new Map<number, typeof holeScores>();
  for (const score of holeScores) {
    const existing = holeScoresByHole.get(score.holeNumber) ?? [];
    existing.push(score);
    holeScoresByHole.set(score.holeNumber, existing);
  }

  const holeResults: Round["holeResults"] = [];
  const holeStateByNumber = new Map<number, ComputedHoleState>();
  let presses: Round["presses"] = [];

  for (const holeNumber of completedHoleNumbers) {
    const scoresForHole = holeScoresByHole.get(holeNumber) ?? [];
    if (!scoresForHole.length) continue;

    const result = getHoleWinner(teams[0], teams[1], scoresForHole);
    holeResults.push(result);

    const existingPresses = presses ?? [];
    const runningRound: Round = {
      id: roundId,
      courseId: currentCourse.id,
      course: currentCourse,
      teeBoxId,
      players,
      roundPlayers,
      teams,
      courseHoles: currentCourse.holes,
      settings,
      status: "active",
      holeScores,
      holeResults: [...holeResults],
      junkEvents,
      closestEvents,
      par5CarryoverEvents,
      presses: existingPresses
    };
    const nextPresses = evaluateAutoPresses(runningRound, holeNumber);
    const createdNow = nextPresses
      .filter((press) => !existingPresses.some((item) => item.id === press.id))
      .map((press) => press.id);
    presses = nextPresses;

    const frontStatus = calculateSideStatus(holeResults, "front", teams[0].id, teams[1].id);
    const backStatus = calculateSideStatus(holeResults, "back", teams[0].id, teams[1].id);
    const overallStatus = calculateSideStatus(holeResults, "overall", teams[0].id, teams[1].id);

    const teamABestNet = Math.min(
      ...scoresForHole.filter((score) => teams[0].playerIds.includes(score.playerId)).map((score) => score.netScore)
    );
    const teamBBestNet = Math.min(
      ...scoresForHole.filter((score) => teams[1].playerIds.includes(score.playerId)).map((score) => score.netScore)
    );

    const pressStatusById: Record<string, string> = {};
    for (const press of presses ?? []) {
      if (holeNumber < press.startingHole || holeNumber > press.endingHole) continue;
      const pressStatus = calculateSideStatus(holeResults, { press }, teams[0].id, teams[1].id);
      pressStatusById[press.id] = statusLabel(pressStatus);
    }

    holeStateByNumber.set(holeNumber, {
      holeNumber,
      teamABestNet,
      teamBBestNet,
      winningTeamId: result.winningTeamId,
      isHalved: result.isHalved,
      frontStatus: statusLabel(frontStatus),
      backStatus: statusLabel(backStatus),
      overallStatus: statusLabel(overallStatus),
      pressesCreated: createdNow,
      pressStatusById
    });
  }

  const round: Round = {
    id: roundId,
    courseId: currentCourse.id,
    course: currentCourse,
    teeBoxId,
    players,
    roundPlayers,
    teams,
    courseHoles: currentCourse.holes,
    settings,
    status: completedHoleNumbers.length === currentCourse.holes.length ? "complete" : "active",
    holeScores,
    holeResults,
    junkEvents,
    closestEvents,
    par5CarryoverEvents,
    presses
  };

  latestRoundSnapshot = {
    roundId: round.id,
    status: round.status,
    roundMetadata: {
      courseId: currentCourse.id,
      courseName: currentCourse.name,
      teeBoxId,
      seed,
      settings: round.settings
    },
    players: round.players as unknown as Array<Record<string, unknown>>,
    teams: round.teams as unknown as Array<Record<string, unknown>>,
    holeScores: round.holeScores as unknown as Array<Record<string, unknown>>,
    junkEvents: round.junkEvents as unknown as Array<Record<string, unknown>>,
    closestEventsPar3: round.closestEvents as unknown as Array<Record<string, unknown>>,
    closestEventsPar5: round.par5CarryoverEvents as unknown as Array<Record<string, unknown>>,
    presses: (round.presses ?? []) as unknown as Array<Record<string, unknown>>,
    finalLedger: [] as Array<Record<string, unknown>>
  };

  const ledger = calculateLedger(round);
  latestRoundSnapshot.finalLedger = ledger as unknown as Array<Record<string, unknown>>;
  const settlement = calculateSettlement(ledger, round);

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
    <div><strong>Holes Entered:</strong> ${completedHoleNumbers.length}/${currentCourse.holes.length}</div>
    <div><strong>Hole Wins:</strong> Team A ${teamAHoleWins}, Team B ${teamBHoleWins}, Halved ${halvedHoles}</div>
    <div><strong>Manual Junk Events:</strong> ${junkEvents.length}</div>
    <div><strong>Manual CP Events:</strong> Par 3 ${closestEvents.length}, Par 5 ${par5CarryoverEvents.length}</div>
    <div><strong>Ledger Points:</strong> Junk ${junkPoints}, CP ${cpPoints}, Press ${pressPoints}</div>
    <div><strong>Players:</strong> ${round.players
      .map((player) => `${player.name} (${strokesByPlayer.get(player.id) ?? 0} strokes)`)
      .join(", ")}</div>
    <div><strong>Main Bet Points:</strong> Front ${round.settings.frontValuePoints}, Back ${round.settings.backValuePoints}, Overall ${round.settings.overallValuePoints}, Press ${round.settings.pressValuePoints}</div>
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

  holeRowsEl.innerHTML = currentCourse.holes
    .map((hole) => {
      const state = holeStateByNumber.get(hole.holeNumber);
      const winner = !state ? "-" : state.isHalved ? "HALVED" : state.winningTeamId ?? "-";
      const pressCells = pressIds
        .map((pressId) => {
          const status = state?.pressStatusById[pressId] ?? "-";
          const started = state?.pressesCreated.includes(pressId) ? " (start)" : "";
          return `<td>${escapeHtml(`${status}${started}`)}</td>`;
        })
        .join("");
      return `<tr><td>${hole.holeNumber}</td><td>${hole.par}</td><td>${state?.teamABestNet ?? "-"}</td><td>${state?.teamBBestNet ?? "-"}</td><td>${winner}</td><td>${state?.frontStatus ?? "-"}</td><td>${state?.backStatus ?? "-"}</td><td>${state?.overallStatus ?? "-"}</td>${pressCells}</tr>`;
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
    : `<tr><td colspan="5">No ledger entries yet. Enter scores hole-by-hole to build running results.</td></tr>`;

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
saveRoundBtn.addEventListener("click", async () => {
  if (!latestRoundSnapshot) {
    setSaveStatus("Run simulation or enter scores first so there is a round to save.", true);
    return;
  }
  saveRoundBtn.disabled = true;
  setSaveStatus("Saving round to Supabase (snapshot + normalized tables)...");
  try {
    const runtimeEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
    await saveRoundSnapshot(
      latestRoundSnapshot,
      runtimeEnv
    );
    await saveRoundNormalized(latestRoundSnapshot, runtimeEnv);
    setSaveStatus(`Saved round ${latestRoundSnapshot.roundId} to Supabase (snapshot + normalized records).`);
  } catch (error) {
    setSaveStatus(error instanceof Error ? error.message : String(error), true);
  } finally {
    saveRoundBtn.disabled = false;
  }
});
applySetupBtn.addEventListener("click", () => {
  if (applyRoundSetup()) {
    renderSimulation();
  }
});
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
addJunkBtn.addEventListener("click", () => {
  addManualJunkEvent();
});
junkRowsEl.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  const button = target.closest<HTMLButtonElement>("button[data-junk-index]");
  if (!button) return;
  const idx = Number(button.dataset.junkIndex);
  if (!Number.isFinite(idx) || idx < 0 || idx >= manualJunkEvents.length) return;
  manualJunkEvents.splice(idx, 1);
  renderJunkRows();
  setJunkStatus("Removed junk event.");
  renderSimulation();
});
closestTrackSelect.addEventListener("change", () => {
  populateClosestHoleOptions(closestTrackSelect.value as "par3" | "par5");
});
addClosestBtn.addEventListener("click", () => {
  addManualClosestEvent();
});
closestRowsEl.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  const button = target.closest<HTMLButtonElement>("button[data-closest-index]");
  if (!button) return;
  const idx = Number(button.dataset.closestIndex);
  if (!Number.isFinite(idx) || idx < 0 || idx >= manualClosestEvents.length) return;
  manualClosestEvents.splice(idx, 1);
  renderClosestRows();
  setClosestStatus("Removed closest-to-pin event.");
  renderSimulation();
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
applyRoundSetup();
populateCourseResults();
populateRecentCourses();
populateJunkControls();
renderJunkRows();
populateClosestControls();
renderClosestRows();
setControlsBusy(false);

if (providerSource === "golfcourseapi") {
  setCourseStatus("Live provider enabled. Search and load a course from GolfCourseAPI.");
} else {
  setCourseStatus(
    `Mock provider active. Type ${SEARCH_MIN_CHARS}+ chars to search. Set VITE_GOLFCOURSEAPI_KEY to enable live course search/load.`
  );
}

renderSimulation();
