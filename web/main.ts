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
import {
  PlayerSearchResult,
  RoundSnapshotPayload,
  SeasonJunkLeaderRow,
  SavedRoundSummary,
  getSeasonJunkLeaderboard,
  listSavedRoundSummaries,
  loadRoundSnapshot,
  searchPlayers,
  saveRoundNormalized,
  saveRoundSnapshot
} from "./persistence";

const seedInput = document.querySelector<HTMLInputElement>("#seed");
const handicapInput = document.querySelector<HTMLInputElement>("#handicap");
const teeBoxSelect = document.querySelector<HTMLSelectElement>("#teeBox");
const simulateBtn = document.querySelector<HTMLButtonElement>("#simulateBtn");
const saveRoundBtn = document.querySelector<HTMLButtonElement>("#saveRoundBtn");
const abandonRoundBtn = document.querySelector<HTMLButtonElement>("#abandonRoundBtn");
const playerQueryInput = document.querySelector<HTMLInputElement>("#playerQuery");
const searchPlayerBtn = document.querySelector<HTMLButtonElement>("#searchPlayerBtn");
const playerResultsSelect = document.querySelector<HTMLSelectElement>("#playerResults");
const assignPlayerSlotSelect = document.querySelector<HTMLSelectElement>("#assignPlayerSlot");
const assignPlayerBtn = document.querySelector<HTMLButtonElement>("#assignPlayerBtn");
const playerStatusEl = document.querySelector<HTMLElement>("#playerStatus");
const savedRoundsSelect = document.querySelector<HTMLSelectElement>("#savedRounds");
const refreshSavedRoundsBtn = document.querySelector<HTMLButtonElement>("#refreshSavedRoundsBtn");
const loadSavedRoundBtn = document.querySelector<HTMLButtonElement>("#loadSavedRoundBtn");
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
const savedRoundsStatusEl = document.querySelector<HTMLElement>("#savedRoundsStatus");
const player1NameInput = document.querySelector<HTMLInputElement>("#player1Name");
const player1DisplayInput = document.querySelector<HTMLInputElement>("#player1Display");
const player2NameInput = document.querySelector<HTMLInputElement>("#player2Name");
const player2DisplayInput = document.querySelector<HTMLInputElement>("#player2Display");
const player3NameInput = document.querySelector<HTMLInputElement>("#player3Name");
const player3DisplayInput = document.querySelector<HTMLInputElement>("#player3Display");
const player4NameInput = document.querySelector<HTMLInputElement>("#player4Name");
const player4DisplayInput = document.querySelector<HTMLInputElement>("#player4Display");
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
const seasonLeaderboardStatusEl = document.querySelector<HTMLElement>("#seasonLeaderboardStatus");
const seasonLeaderboardRowsEl = document.querySelector<HTMLElement>("#seasonLeaderboardRows");

if (
  !seedInput ||
  !handicapInput ||
  !teeBoxSelect ||
  !simulateBtn ||
  !saveRoundBtn ||
  !abandonRoundBtn ||
  !playerQueryInput ||
  !searchPlayerBtn ||
  !playerResultsSelect ||
  !assignPlayerSlotSelect ||
  !assignPlayerBtn ||
  !playerStatusEl ||
  !savedRoundsSelect ||
  !refreshSavedRoundsBtn ||
  !loadSavedRoundBtn ||
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
  !savedRoundsStatusEl ||
  !player1NameInput ||
  !player1DisplayInput ||
  !player2NameInput ||
  !player2DisplayInput ||
  !player3NameInput ||
  !player3DisplayInput ||
  !player4NameInput ||
  !player4DisplayInput ||
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
  !closestRowsEl ||
  !seasonLeaderboardStatusEl ||
  !seasonLeaderboardRowsEl
) {
  throw new Error("Missing required DOM elements");
}

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const runtimeEnv = env ?? {};
const hasSupabaseEnv = Boolean(
  (runtimeEnv.VITE_SUPABASE_URL ?? runtimeEnv.SUPABASE_URL) &&
    (runtimeEnv.VITE_SUPABASE_SERVICE_ROLE_KEY ??
      runtimeEnv.VITE_SUPABASE_ANON_KEY ??
      runtimeEnv.SUPABASE_SERVICE_ROLE_KEY)
);
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
    fullName: string;
    displayName: string;
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
const manualClosestEvents: Array<{ holeNumber: number; track: "par3" | "par5"; winnerPlayerId: string | null }> = [];
let latestRoundSnapshot: RoundSnapshotPayload | undefined;
let savedRoundSummaries: SavedRoundSummary[] = [];
let seasonJunkLeaders: SeasonJunkLeaderRow[] = [];
let playerSearchResults: PlayerSearchResult[] = [];
const selectedPlayerDbIdsBySlot: Array<string | undefined> = [undefined, undefined, undefined, undefined];
let autoSaveTimeoutHandle: number | undefined;
let autoSaveInFlight = false;
let autoSaveQueued = false;
let suppressAutoSave = false;

function setCourseStatus(message: string, isError = false): void {
  courseStatusEl.textContent = message;
  courseStatusEl.classList.toggle("error", isError);
}

function setSetupStatus(message: string, isError = false): void {
  setupStatusEl.textContent = message;
  setupStatusEl.classList.toggle("error", isError);
}

function setPlayerStatus(message: string, isError = false): void {
  playerStatusEl.textContent = message;
  playerStatusEl.classList.toggle("error", isError);
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

function setSavedRoundsStatus(message: string, isError = false): void {
  savedRoundsStatusEl.textContent = message;
  savedRoundsStatusEl.classList.toggle("error", isError);
}

function setSeasonLeaderboardStatus(message: string, isError = false): void {
  seasonLeaderboardStatusEl.textContent = message;
  seasonLeaderboardStatusEl.classList.toggle("error", isError);
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
  searchPlayerBtn.disabled = isBusy;
  playerResultsSelect.disabled = isBusy || playerSearchResults.length === 0;
  assignPlayerSlotSelect.disabled = isBusy;
  assignPlayerBtn.disabled = isBusy || playerSearchResults.length === 0 || !playerResultsSelect.value;
  abandonRoundBtn.disabled = isBusy;
  refreshSavedRoundsBtn.disabled = isBusy;
  savedRoundsSelect.disabled = isBusy || savedRoundSummaries.length === 0;
  loadSavedRoundBtn.disabled = isBusy || savedRoundSummaries.length === 0 || !savedRoundsSelect.value;
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

function hasFirstAndLastName(name: string): boolean {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length >= 2;
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

function formatSavedRoundLabel(item: SavedRoundSummary): string {
  const updated = new Date(item.updatedAt);
  const updatedLabel = Number.isNaN(updated.getTime())
    ? item.updatedAt
    : updated.toLocaleString(undefined, {
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
  const playersLabel = item.playerNames.join("/") || "Players unknown";
  const statusLabel =
    item.status === "completed" ? "completed" : item.status === "abandoned" ? "abandoned" : "in-progress";
  return `${updatedLabel} | ${item.courseName} | ${playersLabel} | ${item.holesCompleted} holes | ${statusLabel}`;
}

function fallbackPlayerId(_name: string, slotIndex: number): string {
  return `p${slotIndex + 1}`;
}

function populatePlayerResults(): void {
  playerResultsSelect.replaceChildren();
  if (!playerSearchResults.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No players";
    playerResultsSelect.append(option);
    setControlsBusy(controlsBusy);
    return;
  }
  for (const player of playerSearchResults) {
    const option = document.createElement("option");
    option.value = player.id;
    option.textContent = player.displayName;
    playerResultsSelect.append(option);
  }
  setControlsBusy(controlsBusy);
}

async function runPlayerSearch(query: string): Promise<void> {
  if (!hasSupabaseEnv) {
    setPlayerStatus("Supabase env not configured for player search.", true);
    return;
  }
  const trimmed = query.trim();
  if (!trimmed) {
    playerSearchResults = [];
    populatePlayerResults();
    setPlayerStatus("Enter a player name to search.", true);
    return;
  }

  searchPlayerBtn.disabled = true;
  setPlayerStatus("Searching players...");
  try {
    playerSearchResults = await searchPlayers(runtimeEnv, trimmed, 20);
    populatePlayerResults();
    if (!playerSearchResults.length) {
      setPlayerStatus(`No players found for "${trimmed}".`, true);
      return;
    }
    setPlayerStatus(`Found ${playerSearchResults.length} player(s). Select one and assign to a slot.`);
  } catch (error) {
    playerSearchResults = [];
    populatePlayerResults();
    setPlayerStatus(error instanceof Error ? error.message : String(error), true);
  } finally {
    searchPlayerBtn.disabled = false;
  }
}

function assignSelectedPlayerToSlot(): void {
  const playerId = playerResultsSelect.value;
  const slotIndex = Number(assignPlayerSlotSelect.value);
  if (!playerId || !Number.isFinite(slotIndex) || slotIndex < 0 || slotIndex > 3) {
    setPlayerStatus("Select a player and slot first.", true);
    return;
  }
  const player = playerSearchResults.find((item) => item.id === playerId);
  if (!player) {
    setPlayerStatus("Selected player not found in current results.", true);
    return;
  }

  const nameInputs = [player1NameInput, player2NameInput, player3NameInput, player4NameInput];
  const displayInputs = [player1DisplayInput, player2DisplayInput, player3DisplayInput, player4DisplayInput];
  selectedPlayerDbIdsBySlot[slotIndex] = player.id;
  nameInputs[slotIndex].value = player.displayName;
  displayInputs[slotIndex].value = player.displayName;
  setPlayerStatus(`Assigned ${player.displayName} to Player ${slotIndex + 1}.`);
  if (roundSetup && applyRoundSetup()) {
    renderSimulation();
  }
}

function renderSeasonLeaderboard(): void {
  if (!seasonJunkLeaders.length) {
    seasonLeaderboardRowsEl.innerHTML = `<tr><td colspan="3">No season junk points yet.</td></tr>`;
    return;
  }
  seasonLeaderboardRowsEl.innerHTML = seasonJunkLeaders
    .map((leader, idx) => {
      const crown = idx === 0 ? " 👑" : "";
      return `<tr><td>${idx + 1}</td><td>${escapeHtml(`${leader.playerName}${crown}`)}</td><td>${leader.junkPoints}</td></tr>`;
    })
    .join("");
}

function populateSavedRounds(): void {
  savedRoundsSelect.replaceChildren();
  if (!savedRoundSummaries.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No saved rounds";
    savedRoundsSelect.append(option);
    loadSavedRoundBtn.disabled = true;
    return;
  }
  for (const round of savedRoundSummaries) {
    const option = document.createElement("option");
    option.value = round.roundId;
    option.textContent = formatSavedRoundLabel(round);
    savedRoundsSelect.append(option);
  }
  loadSavedRoundBtn.disabled = false;
}

async function persistCurrentRound(mode: "manual" | "auto"): Promise<void> {
  if (!hasSupabaseEnv) {
    throw new Error("Supabase env not configured (VITE_SUPABASE_URL + key required).");
  }
  if (!latestRoundSnapshot) {
    if (mode === "manual") {
      throw new Error("Run simulation or enter scores first so there is a round to save.");
    }
    return;
  }
  await saveRoundSnapshot(latestRoundSnapshot, runtimeEnv);
  await saveRoundNormalized(latestRoundSnapshot, runtimeEnv);
}

async function saveRoundManually(): Promise<void> {
  if (!hasSupabaseEnv) {
    setSaveStatus("Supabase env not configured for saving.", true);
    return;
  }
  saveRoundBtn.disabled = true;
  setSaveStatus("Saving round to Supabase (snapshot + normalized tables)...");
  try {
    await persistCurrentRound("manual");
    setSaveStatus(`Saved round ${latestRoundSnapshot?.roundId ?? ""} to Supabase (snapshot + normalized records).`);
    await refreshSavedRounds();
    await refreshSeasonLeaderboard();
  } catch (error) {
    setSaveStatus(error instanceof Error ? error.message : String(error), true);
  } finally {
    saveRoundBtn.disabled = false;
  }
}

async function markRoundAbandoned(): Promise<void> {
  if (!hasSupabaseEnv) {
    setSaveStatus("Supabase env not configured for saving.", true);
    return;
  }
  if (!latestRoundSnapshot) {
    setSaveStatus("Run simulation or enter scores first so there is a round to update.", true);
    return;
  }
  if (latestRoundSnapshot.status === "complete") {
    setSaveStatus("Completed rounds cannot be marked abandoned.", true);
    return;
  }

  latestRoundSnapshot.roundMetadata = {
    ...latestRoundSnapshot.roundMetadata,
    lifecycleStatus: "abandoned"
  };

  abandonRoundBtn.disabled = true;
  setSaveStatus(`Marking round ${latestRoundSnapshot.roundId} as abandoned...`);
  try {
    await persistCurrentRound("manual");
    setSaveStatus(`Round ${latestRoundSnapshot.roundId} marked abandoned.`);
    await refreshSavedRounds();
    await refreshSeasonLeaderboard();
  } catch (error) {
    setSaveStatus(error instanceof Error ? error.message : String(error), true);
  } finally {
    abandonRoundBtn.disabled = false;
  }
}

function queueAutoSave(): void {
  if (suppressAutoSave || !latestRoundSnapshot || !hasSupabaseEnv) return;
  if (autoSaveTimeoutHandle) {
    clearTimeout(autoSaveTimeoutHandle);
  }
  autoSaveTimeoutHandle = window.setTimeout(() => {
    autoSaveTimeoutHandle = undefined;
    void flushAutoSave();
  }, 600);
}

async function flushAutoSave(): Promise<void> {
  if (!latestRoundSnapshot || suppressAutoSave) return;
  if (autoSaveInFlight) {
    autoSaveQueued = true;
    return;
  }
  autoSaveInFlight = true;
  try {
    await persistCurrentRound("auto");
    setSaveStatus(`Auto-saved ${latestRoundSnapshot.roundId}.`);
    await refreshSavedRounds();
    await refreshSeasonLeaderboard();
  } catch (error) {
    setSaveStatus(`Auto-save failed: ${error instanceof Error ? error.message : String(error)}`, true);
  } finally {
    autoSaveInFlight = false;
    if (autoSaveQueued) {
      autoSaveQueued = false;
      void flushAutoSave();
    }
  }
}

async function refreshSavedRounds(): Promise<void> {
  if (!hasSupabaseEnv) {
    savedRoundSummaries = [];
    populateSavedRounds();
    setSavedRoundsStatus("Supabase env not configured for saved rounds.");
    return;
  }
  refreshSavedRoundsBtn.disabled = true;
  try {
    savedRoundSummaries = await listSavedRoundSummaries(runtimeEnv);
    populateSavedRounds();
    const count = savedRoundSummaries.length;
    setSavedRoundsStatus(count ? `Loaded ${count} saved round${count === 1 ? "" : "s"}.` : "No saved rounds found.");
  } catch (error) {
    populateSavedRounds();
    setSavedRoundsStatus(error instanceof Error ? error.message : String(error), true);
  } finally {
    refreshSavedRoundsBtn.disabled = false;
  }
}

async function refreshSeasonLeaderboard(): Promise<void> {
  if (!hasSupabaseEnv) {
    seasonJunkLeaders = [];
    renderSeasonLeaderboard();
    setSeasonLeaderboardStatus("Supabase env not configured for leaderboard.");
    return;
  }
  try {
    seasonJunkLeaders = await getSeasonJunkLeaderboard(runtimeEnv);
    renderSeasonLeaderboard();
    setSeasonLeaderboardStatus(
      seasonJunkLeaders.length
        ? `Season leaderboard updated (${seasonJunkLeaders.length} players).`
        : "No season junk points yet."
    );
  } catch (error) {
    seasonJunkLeaders = [];
    renderSeasonLeaderboard();
    setSeasonLeaderboardStatus(error instanceof Error ? error.message : String(error), true);
  }
}

function toRecordArray(items: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return Array.isArray(items) ? items.filter((item) => typeof item === "object" && item !== null) : [];
}

async function applySavedRoundSnapshot(snapshot: RoundSnapshotPayload): Promise<void> {
  const metadata = snapshot.roundMetadata;
  const courseId = typeof metadata.courseId === "string" ? metadata.courseId : "";
  const teeBoxId = typeof metadata.teeBoxId === "string" ? metadata.teeBoxId : undefined;
  const seedValue = typeof metadata.seed === "number" ? String(metadata.seed) : typeof metadata.seed === "string" ? metadata.seed : "42";
  seedInput.value = seedValue;

  if (!courseId) {
    throw new Error("Saved round is missing courseId metadata.");
  }

  setCourseStatus("Loading course for saved round...");
  const loadedCourse = await courseProvider.getCourse(courseId);
  currentCourse = loadedCourse;
  populateTeeBoxes(currentCourse, teeBoxId);
  populateRecentCourses();
  setCourseStatus(`Loaded ${currentCourse.name} from saved round.`);

  const playersRaw = toRecordArray(snapshot.players).slice(0, 4);
  const teamsRaw = toRecordArray(snapshot.teams);
  if (playersRaw.length !== 4) {
    throw new Error("Saved round must include exactly 4 players.");
  }

  const teamByPlayerId = new Map<string, SetupTeamId>();
  for (const team of teamsRaw) {
    const teamId = team.id === "teamA" || team.id === "teamB" ? (team.id as SetupTeamId) : null;
    const playerIds = Array.isArray(team.playerIds) ? team.playerIds : [];
    if (!teamId) continue;
    for (const playerId of playerIds) {
      if (typeof playerId === "string") {
        teamByPlayerId.set(playerId, teamId);
      }
    }
  }

  const playerNameInputs = [player1NameInput, player2NameInput, player3NameInput, player4NameInput];
  const playerDisplayInputs = [player1DisplayInput, player2DisplayInput, player3DisplayInput, player4DisplayInput];
  const playerTeamInputs = [player1TeamSelect, player2TeamSelect, player3TeamSelect, player4TeamSelect];
  const playerStrokeInputs = [player1StrokesInput, player2StrokesInput, player3StrokesInput, player4StrokesInput];

  for (let i = 0; i < playersRaw.length; i += 1) {
    const player = playersRaw[i];
    const playerId = typeof player.id === "string" ? player.id : `p${i + 1}`;
    const playerName =
      typeof player.officialName === "string" && player.officialName
        ? player.officialName
        : typeof player.name === "string"
          ? player.name
          : `Player ${i + 1}`;
    const playerDisplayName =
      typeof player.displayName === "string" && player.displayName
        ? player.displayName
        : typeof player.name === "string" && player.name
          ? player.name
          : playerName;
    const strokes =
      typeof player.lastUsedStrokesReceived === "number"
        ? player.lastUsedStrokesReceived
        : typeof player.defaultStrokesReceived === "number"
          ? player.defaultStrokesReceived
          : 0;
    playerNameInputs[i].value = playerName;
    playerDisplayInputs[i].value = playerDisplayName;
    playerTeamInputs[i].value = teamByPlayerId.get(playerId) ?? (i < 2 ? "teamA" : "teamB");
    playerStrokeInputs[i].value = String(strokes);
    selectedPlayerDbIdsBySlot[i] = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(playerId)
      ? playerId
      : undefined;
  }

  const settings =
    typeof metadata.settings === "object" && metadata.settings !== null
      ? (metadata.settings as Record<string, unknown>)
      : {};
  const roundSetupMeta =
    typeof metadata.roundSetup === "object" && metadata.roundSetup !== null
      ? (metadata.roundSetup as Record<string, unknown>)
      : {};
  const pointsMeta =
    typeof roundSetupMeta.points === "object" && roundSetupMeta.points !== null
      ? (roundSetupMeta.points as Record<string, unknown>)
      : {};

  const frontPoints = typeof pointsMeta.front === "number" ? pointsMeta.front : Number(settings.frontValuePoints ?? 2);
  const backPoints = typeof pointsMeta.back === "number" ? pointsMeta.back : Number(settings.backValuePoints ?? 3);
  const overallPoints =
    typeof pointsMeta.overall === "number" ? pointsMeta.overall : Number(settings.overallValuePoints ?? 4);
  const pressPoints = typeof pointsMeta.press === "number" ? pointsMeta.press : Number(settings.pressValuePoints ?? 1);
  frontPointsInput.value = String(Number.isFinite(frontPoints) && frontPoints > 0 ? frontPoints : 2);
  backPointsInput.value = String(Number.isFinite(backPoints) && backPoints > 0 ? backPoints : 3);
  overallPointsInput.value = String(Number.isFinite(overallPoints) && overallPoints > 0 ? overallPoints : 4);
  pressPointsInput.value = String(Number.isFinite(pressPoints) && pressPoints > 0 ? pressPoints : 1);
  doubleGameInput.checked = roundSetupMeta.doubleGame === true;

  scoreEntryValues.clear();
  for (const score of toRecordArray(snapshot.holeScores)) {
    const holeNumber = typeof score.holeNumber === "number" ? score.holeNumber : NaN;
    const playerId = typeof score.playerId === "string" ? score.playerId : "";
    const grossScore = typeof score.grossScore === "number" ? score.grossScore : NaN;
    if (!Number.isFinite(holeNumber) || !playerId || !Number.isFinite(grossScore) || grossScore <= 0) continue;
    scoreEntryValues.set(scoreKey(holeNumber, playerId), String(grossScore));
  }

  manualJunkEvents.length = 0;
  for (const junk of toRecordArray(snapshot.junkEvents)) {
    const holeNumber = typeof junk.holeNumber === "number" ? junk.holeNumber : NaN;
    const playerId = typeof junk.playerId === "string" ? junk.playerId : "";
    const type = typeof junk.type === "string" ? junk.type : "";
    if (!Number.isFinite(holeNumber) || !playerId || !type) continue;
    manualJunkEvents.push({ holeNumber, playerId, type: type as JunkType });
  }

  manualClosestEvents.length = 0;
  for (const event of toRecordArray(snapshot.closestEventsPar3)) {
    const holeNumber = typeof event.holeNumber === "number" ? event.holeNumber : NaN;
    const winnerPlayerId = typeof event.winnerPlayerId === "string" ? event.winnerPlayerId : null;
    if (!Number.isFinite(holeNumber)) continue;
    manualClosestEvents.push({ holeNumber, track: "par3", winnerPlayerId });
  }
  for (const event of toRecordArray(snapshot.closestEventsPar5)) {
    const holeNumber = typeof event.holeNumber === "number" ? event.holeNumber : NaN;
    const winnerPlayerId = typeof event.winnerPlayerId === "string" ? event.winnerPlayerId : null;
    if (!Number.isFinite(holeNumber)) continue;
    manualClosestEvents.push({ holeNumber, track: "par5", winnerPlayerId });
  }

  if (!applyRoundSetup()) {
    throw new Error("Failed to apply saved round setup.");
  }
  renderSimulation();
  setSaveStatus(`Loaded saved round ${snapshot.roundId}.`);
}

async function loadSelectedSavedRound(): Promise<void> {
  if (!hasSupabaseEnv) {
    setSavedRoundsStatus("Supabase env not configured for loading.", true);
    return;
  }
  const roundId = savedRoundsSelect.value;
  if (!roundId) {
    setSavedRoundsStatus("Select a saved round first.", true);
    return;
  }
  loadSavedRoundBtn.disabled = true;
  setSavedRoundsStatus(`Loading saved round ${roundId}...`);
  suppressAutoSave = true;
  try {
    const snapshot = await loadRoundSnapshot(roundId, runtimeEnv);
    await applySavedRoundSnapshot(snapshot);
    setSavedRoundsStatus(`Loaded saved round ${roundId}.`);
  } catch (error) {
    setSavedRoundsStatus(error instanceof Error ? error.message : String(error), true);
  } finally {
    suppressAutoSave = false;
    loadSavedRoundBtn.disabled = false;
  }
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
    {
      id: selectedPlayerDbIdsBySlot[0] ?? fallbackPlayerId(player1NameInput.value, 0),
      fullName: player1NameInput.value.trim(),
      displayName: player1DisplayInput.value.trim() || player1NameInput.value.trim(),
      teamId: player1TeamSelect.value as SetupTeamId,
      strokesReceived: parseNonNegativeNumber(player1StrokesInput.value) ?? -1
    },
    {
      id: selectedPlayerDbIdsBySlot[1] ?? fallbackPlayerId(player2NameInput.value, 1),
      fullName: player2NameInput.value.trim(),
      displayName: player2DisplayInput.value.trim() || player2NameInput.value.trim(),
      teamId: player2TeamSelect.value as SetupTeamId,
      strokesReceived: parseNonNegativeNumber(player2StrokesInput.value) ?? -1
    },
    {
      id: selectedPlayerDbIdsBySlot[2] ?? fallbackPlayerId(player3NameInput.value, 2),
      fullName: player3NameInput.value.trim(),
      displayName: player3DisplayInput.value.trim() || player3NameInput.value.trim(),
      teamId: player3TeamSelect.value as SetupTeamId,
      strokesReceived: parseNonNegativeNumber(player3StrokesInput.value) ?? -1
    },
    {
      id: selectedPlayerDbIdsBySlot[3] ?? fallbackPlayerId(player4NameInput.value, 3),
      fullName: player4NameInput.value.trim(),
      displayName: player4DisplayInput.value.trim() || player4NameInput.value.trim(),
      teamId: player4TeamSelect.value as SetupTeamId,
      strokesReceived: parseNonNegativeNumber(player4StrokesInput.value) ?? -1
    }
  ];

  if (players.some((player) => player.fullName.length === 0)) {
    setSetupStatus("Each player must have a name.", true);
    return null;
  }
  if (players.some((player) => !hasFirstAndLastName(player.fullName))) {
    setSetupStatus("Each player must have first and last name (e.g. Sam Janvey).", true);
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
  scoreHeaderP1El.textContent = players?.[0]?.displayName || "Player 1";
  scoreHeaderP2El.textContent = players?.[1]?.displayName || "Player 2";
  scoreHeaderP3El.textContent = players?.[2]?.displayName || "Player 3";
  scoreHeaderP4El.textContent = players?.[3]?.displayName || "Player 4";
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
    option.textContent = player.displayName;
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
      return `<tr><td>${event.holeNumber}</td><td>${escapeHtml(player?.displayName ?? event.playerId)}</td><td>${player?.teamId ?? "-"}</td><td>${event.type}</td><td><button type="button" data-junk-index="${idx}" class="secondary-btn">Remove</button></td></tr>`;
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
  closestWinnerSelect.replaceChildren();
  const carryOption = document.createElement("option");
  carryOption.value = "carry";
  carryOption.textContent = "No Winner (Carry)";
  closestWinnerSelect.append(carryOption);
  for (const player of roundSetup?.players ?? []) {
    const option = document.createElement("option");
    option.value = player.id;
    option.textContent = `${player.displayName} (${player.teamId})`;
    closestWinnerSelect.append(option);
  }
}

function renderClosestRows(): void {
  if (!manualClosestEvents.length) {
    closestRowsEl.innerHTML = `<tr><td colspan="4">No closest-to-pin events added yet.</td></tr>`;
    return;
  }

  closestRowsEl.innerHTML = manualClosestEvents
    .map((event, idx) => {
      const playerName =
        event.winnerPlayerId && roundSetup
          ? (roundSetup.players.find((player) => player.id === event.winnerPlayerId)?.displayName ?? event.winnerPlayerId)
          : null;
      const resultLabel = playerName ? `${playerName} wins` : "Carry";
      return `<tr><td>${event.track.toUpperCase()}</td><td>${event.holeNumber}</td><td>${resultLabel}</td><td><button type="button" data-closest-index="${idx}" class="secondary-btn">Remove</button></td></tr>`;
    })
    .join("");
}

function addManualClosestEvent(): void {
  const track = closestTrackSelect.value as "par3" | "par5";
  const holeNumber = Number(closestHoleSelect.value);
  const winnerRaw = closestWinnerSelect.value;
  const winnerPlayerId = winnerRaw === "carry" ? null : winnerRaw;

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

  manualClosestEvents.push({ holeNumber, track, winnerPlayerId });
  renderClosestRows();
  setClosestStatus(
    winnerPlayerId
      ? `Added ${track.toUpperCase()} hole ${holeNumber}: ${closestWinnerSelect.selectedOptions[0]?.textContent ?? winnerPlayerId} wins.`
      : `Added ${track.toUpperCase()} hole ${holeNumber}: carry.`
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
      .map((item) => item.displayName)
      .join(", ")}) vs Team B (${nextSetup.players
      .filter((item) => item.teamId === "teamB")
      .map((item) => item.displayName)
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
    name: item.displayName,
    officialName: item.fullName,
    displayName: item.displayName,
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
      winnerPlayerId: event.winnerPlayerId
    }));
  const par5CarryoverEvents = manualClosestEvents
    .filter((event) => event.track === "par5")
    .map((event) => ({
      roundId,
      holeNumber: event.holeNumber,
      winnerPlayerId: event.winnerPlayerId
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
      settings: round.settings,
      lifecycleStatus: round.status === "complete" ? "completed" : "in_progress",
      roundSetup: {
        points: { ...roundSetup.points },
        doubleGame: roundSetup.doubleGame
      }
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
  const cpPoints = ledger
    .filter((entry) => entry.type === "closest_par3" || entry.type === "par5_carryover")
    .reduce((sum, entry) => sum + entry.points, 0);
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

  queueAutoSave();
}

simulateBtn.addEventListener("click", renderSimulation);
saveRoundBtn.addEventListener("click", async () => {
  await saveRoundManually();
});
abandonRoundBtn.addEventListener("click", () => {
  void markRoundAbandoned();
});
applySetupBtn.addEventListener("click", () => {
  if (applyRoundSetup()) {
    renderSimulation();
  }
});
seedInput.addEventListener("input", persistSimulationControls);
handicapInput.addEventListener("input", persistSimulationControls);
teeBoxSelect.addEventListener("change", persistSimulationControls);
searchPlayerBtn.addEventListener("click", () => {
  void runPlayerSearch(playerQueryInput.value);
});
playerQueryInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void runPlayerSearch(playerQueryInput.value);
  }
});
playerResultsSelect.addEventListener("change", () => {
  setControlsBusy(controlsBusy);
});
assignPlayerBtn.addEventListener("click", () => {
  assignSelectedPlayerToSlot();
});
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
refreshSavedRoundsBtn.addEventListener("click", () => {
  void refreshSavedRounds();
  void refreshSeasonLeaderboard();
});
savedRoundsSelect.addEventListener("change", () => {
  setControlsBusy(controlsBusy);
});
loadSavedRoundBtn.addEventListener("click", () => {
  void loadSelectedSavedRound();
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
  populateClosestControls();
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
populatePlayerResults();
populateSavedRounds();
setControlsBusy(false);

if (providerSource === "golfcourseapi") {
  setCourseStatus("Live provider enabled. Search and load a course from GolfCourseAPI.");
} else {
  setCourseStatus(
    `Mock provider active. Type ${SEARCH_MIN_CHARS}+ chars to search. Set VITE_GOLFCOURSEAPI_KEY to enable live course search/load.`
  );
}

renderSimulation();
void refreshSavedRounds();
void refreshSeasonLeaderboard();
