import { createClient } from "@supabase/supabase-js";

export interface RoundSnapshotPayload {
  roundId: string;
  status: "active" | "complete";
  roundMetadata: Record<string, unknown>;
  players: Array<Record<string, unknown>>;
  teams: Array<Record<string, unknown>>;
  holeScores: Array<Record<string, unknown>>;
  junkEvents: Array<Record<string, unknown>>;
  closestEventsPar3: Array<Record<string, unknown>>;
  closestEventsPar5: Array<Record<string, unknown>>;
  presses: Array<Record<string, unknown>>;
  finalLedger: Array<Record<string, unknown>>;
}

export interface SavedRoundSummary {
  roundId: string;
  updatedAt: string;
  courseName: string;
  playerNames: string[];
  holesCompleted: number;
  status: "in_progress" | "completed" | "abandoned";
}

export interface SeasonJunkLeaderRow {
  playerId: string;
  playerName: string;
  junkPoints: number;
}

export interface PlayerSearchResult {
  id: string;
  displayName: string;
}

interface SnapshotPlayer {
  id: string;
  name: string;
  officialName: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  defaultStrokesReceived?: number;
  lastUsedStrokesReceived?: number;
}

interface SnapshotTeam {
  id: string;
  name: string;
  playerIds?: string[];
}

interface SnapshotHoleScore {
  holeNumber: number;
  playerId: string;
  grossScore: number;
  strokesReceived: number;
  netScore: number;
}

interface SnapshotJunkEvent {
  holeNumber: number;
  playerId: string;
  teamId: string;
  type: string;
  points?: number;
}

interface SnapshotClosestEvent {
  holeNumber: number;
  winnerPlayerId: string | null;
}

interface SnapshotPress {
  id: string;
  side: "front" | "back";
  startingHole: number;
  endingHole: number;
  teamThatWasDown: string;
  valuePoints: number;
  createdBy: string;
  triggerHole: number;
  sourceMatchId?: string;
  status: "active" | "settled";
}

interface SnapshotLedgerEntry {
  holeNumber?: number;
  type: string;
  teamId: string;
  playerId?: string;
  points: number;
  description: string;
}

function requireEnv(value: string | undefined, name: string): string {
  const resolved = value?.trim();
  if (!resolved) {
    throw new Error(`Missing ${name}. Set it in .env (VITE_ prefixed for browser use).`);
  }
  return resolved;
}

function createSupabaseClient(env: Record<string, string | undefined>) {
  const url = requireEnv(env.VITE_SUPABASE_URL ?? env.SUPABASE_URL, "VITE_SUPABASE_URL");
  const key = requireEnv(
    env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY,
    "VITE_SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY"
  );
  return createClient(url, key, { auth: { persistSession: false } });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRecordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) && value.every((item) => typeof item === "object" && item !== null);
}

function mapSnapshotStatus(value: unknown): RoundSnapshotPayload["status"] {
  if (value === "complete" || value === "completed") return "complete";
  return "active";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function splitRequiredFirstLastName(fullName: string): { firstName: string; lastName: string } | null {
  const normalized = fullName.trim().replace(/\s+/g, " ");
  if (!normalized) return null;
  const parts = normalized.split(" ");
  if (parts.length < 2) return null;
  const firstName = parts[0].trim();
  const lastName = parts.slice(1).join(" ").trim();
  if (!firstName || !lastName) return null;
  return { firstName, lastName };
}

function normalizeNamePart(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function playerNameKey(firstName: string, lastName: string): string {
  return `${normalizeNamePart(firstName)}::${normalizeNamePart(lastName)}`;
}

function mapDisplayStatus(rowStatus: unknown, roundMetadata: Record<string, unknown>): SavedRoundSummary["status"] {
  const lifecycleStatus = roundMetadata.lifecycleStatus;
  if (lifecycleStatus === "completed") return "completed";
  if (lifecycleStatus === "abandoned") return "abandoned";
  if (lifecycleStatus === "in_progress") return "in_progress";
  if (rowStatus === "complete") return "completed";
  return "in_progress";
}

function computeHolesCompleted(
  holeScores: Array<Record<string, unknown>>,
  playerCount: number
): number {
  if (!holeScores.length) return 0;
  if (playerCount <= 0) {
    return new Set(
      holeScores
        .map((item) => (typeof item.holeNumber === "number" ? item.holeNumber : null))
        .filter((value): value is number => value !== null)
    ).size;
  }
  const playersByHole = new Map<number, Set<string>>();
  for (const score of holeScores) {
    const holeNumber = typeof score.holeNumber === "number" ? score.holeNumber : null;
    const playerId = typeof score.playerId === "string" ? score.playerId : null;
    if (holeNumber === null || !playerId) continue;
    const existing = playersByHole.get(holeNumber) ?? new Set<string>();
    existing.add(playerId);
    playersByHole.set(holeNumber, existing);
  }
  let completed = 0;
  for (const players of playersByHole.values()) {
    if (players.size >= playerCount) completed += 1;
  }
  return completed;
}

function toPlayers(items: Array<Record<string, unknown>>): SnapshotPlayer[] {
  return items
    .map((item) => {
      const id = typeof item.id === "string" ? item.id : "";
      const name = typeof item.name === "string" ? item.name : "";
      if (!id || !name) return null;
      const officialName =
        typeof item.officialName === "string" && item.officialName ? item.officialName : name;
      const displayName =
        typeof item.displayName === "string" && item.displayName ? item.displayName : name;
      const split = splitRequiredFirstLastName(officialName) ?? undefined;
      return {
        id,
        name,
        officialName,
        displayName,
        firstName: split?.firstName,
        lastName: split?.lastName,
        defaultStrokesReceived:
          typeof item.defaultStrokesReceived === "number" ? item.defaultStrokesReceived : undefined,
        lastUsedStrokesReceived:
          typeof item.lastUsedStrokesReceived === "number" ? item.lastUsedStrokesReceived : undefined
      } as SnapshotPlayer;
    })
    .filter((item): item is SnapshotPlayer => item !== null);
}

function toTeams(items: Array<Record<string, unknown>>): SnapshotTeam[] {
  return items
    .map((item) => {
      const id = typeof item.id === "string" ? item.id : "";
      const name = typeof item.name === "string" ? item.name : "";
      if (!id || !name) return null;
      const playerIds = Array.isArray(item.playerIds)
        ? item.playerIds.filter((value): value is string => typeof value === "string")
        : undefined;
      return { id, name, playerIds };
    })
    .filter((item): item is SnapshotTeam => item !== null);
}

function toHoleScores(items: Array<Record<string, unknown>>): SnapshotHoleScore[] {
  return items
    .map((item) => {
      const holeNumber = typeof item.holeNumber === "number" ? item.holeNumber : NaN;
      const playerId = typeof item.playerId === "string" ? item.playerId : "";
      const grossScore = typeof item.grossScore === "number" ? item.grossScore : NaN;
      const strokesReceived = typeof item.strokesReceived === "number" ? item.strokesReceived : NaN;
      const netScore = typeof item.netScore === "number" ? item.netScore : NaN;
      if (
        !Number.isFinite(holeNumber) ||
        !playerId ||
        !Number.isFinite(grossScore) ||
        !Number.isFinite(strokesReceived) ||
        !Number.isFinite(netScore)
      ) {
        return null;
      }
      return { holeNumber, playerId, grossScore, strokesReceived, netScore };
    })
    .filter((item): item is SnapshotHoleScore => item !== null);
}

function toJunkEvents(items: Array<Record<string, unknown>>): SnapshotJunkEvent[] {
  return items
    .map((item) => {
      const holeNumber = typeof item.holeNumber === "number" ? item.holeNumber : NaN;
      const playerId = typeof item.playerId === "string" ? item.playerId : "";
      const teamId = typeof item.teamId === "string" ? item.teamId : "";
      const type = typeof item.type === "string" ? item.type : "";
      if (!Number.isFinite(holeNumber) || !playerId || !teamId || !type) return null;
      return {
        holeNumber,
        playerId,
        teamId,
        type,
        points: typeof item.points === "number" ? item.points : undefined
      };
    })
    .filter((item): item is SnapshotJunkEvent => item !== null);
}

function toClosestEvents(items: Array<Record<string, unknown>>): SnapshotClosestEvent[] {
  return items
    .map((item) => {
      const holeNumber = typeof item.holeNumber === "number" ? item.holeNumber : NaN;
      if (!Number.isFinite(holeNumber)) return null;
      const winnerPlayerId = typeof item.winnerPlayerId === "string" ? item.winnerPlayerId : null;
      return { holeNumber, winnerPlayerId };
    })
    .filter((item): item is SnapshotClosestEvent => item !== null);
}

function toPresses(items: Array<Record<string, unknown>>): SnapshotPress[] {
  return items
    .map((item) => {
      const id = typeof item.id === "string" ? item.id : "";
      const side = item.side === "front" || item.side === "back" ? item.side : null;
      const startingHole = typeof item.startingHole === "number" ? item.startingHole : NaN;
      const endingHole = typeof item.endingHole === "number" ? item.endingHole : NaN;
      const teamThatWasDown = typeof item.teamThatWasDown === "string" ? item.teamThatWasDown : "";
      const valuePoints = typeof item.valuePoints === "number" ? item.valuePoints : NaN;
      const createdBy = typeof item.createdBy === "string" ? item.createdBy : "";
      const triggerHole = typeof item.triggerHole === "number" ? item.triggerHole : NaN;
      const status = item.status === "active" || item.status === "settled" ? item.status : null;
      if (
        !id ||
        !side ||
        !Number.isFinite(startingHole) ||
        !Number.isFinite(endingHole) ||
        !teamThatWasDown ||
        !Number.isFinite(valuePoints) ||
        !createdBy ||
        !Number.isFinite(triggerHole) ||
        !status
      ) {
        return null;
      }
      return {
        id,
        side,
        startingHole,
        endingHole,
        teamThatWasDown,
        valuePoints,
        createdBy,
        triggerHole,
        sourceMatchId: typeof item.sourceMatchId === "string" ? item.sourceMatchId : undefined,
        status
      };
    })
    .filter((item): item is SnapshotPress => item !== null);
}

function toLedgerEntries(items: Array<Record<string, unknown>>): SnapshotLedgerEntry[] {
  return items
    .map((item) => {
      const type = typeof item.type === "string" ? item.type : "";
      const teamId = typeof item.teamId === "string" ? item.teamId : "";
      const points = typeof item.points === "number" ? item.points : NaN;
      const description = typeof item.description === "string" ? item.description : "";
      if (!type || !teamId || !Number.isFinite(points) || !description) return null;
      return {
        holeNumber: typeof item.holeNumber === "number" ? item.holeNumber : undefined,
        type,
        teamId,
        playerId: typeof item.playerId === "string" ? item.playerId : undefined,
        points,
        description
      };
    })
    .filter((item): item is SnapshotLedgerEntry => item !== null);
}

export async function saveRoundSnapshot(
  payload: RoundSnapshotPayload,
  env: Record<string, string | undefined>
): Promise<void> {
  const supabase = createSupabaseClient(env);
  const { error } = await supabase.from("round_snapshots").upsert(
    {
      round_id: payload.roundId,
      status: payload.status,
      round_metadata: payload.roundMetadata,
      players: payload.players,
      teams: payload.teams,
      hole_scores: payload.holeScores,
      junk_events: payload.junkEvents,
      closest_events_par3: payload.closestEventsPar3,
      closest_events_par5: payload.closestEventsPar5,
      presses: payload.presses,
      final_ledger: payload.finalLedger,
      updated_at: new Date().toISOString()
    },
    { onConflict: "round_id" }
  );
  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }
}

export async function listSavedRoundSummaries(
  env: Record<string, string | undefined>,
  limit = 20
): Promise<SavedRoundSummary[]> {
  const supabase = createSupabaseClient(env);
  const { data, error } = await supabase
    .from("round_snapshots")
    .select("round_id,status,round_metadata,players,hole_scores,updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) {
    throw new Error(`Supabase list round snapshots failed: ${error.message}`);
  }

  return (data ?? [])
    .map((row) => {
      const roundId = typeof row.round_id === "string" ? row.round_id : "";
      const updatedAt = typeof row.updated_at === "string" ? row.updated_at : "";
      const roundMetadata = isObject(row.round_metadata) ? row.round_metadata : {};
      const players = isRecordArray(row.players) ? row.players : [];
      const holeScores = isRecordArray(row.hole_scores) ? row.hole_scores : [];
      if (!roundId || !updatedAt) return null;
      const playerNames = players
        .map((item) => (typeof item.name === "string" ? item.name : ""))
        .filter((name) => name.length > 0);
      const courseName =
        typeof roundMetadata.courseName === "string" && roundMetadata.courseName
          ? roundMetadata.courseName
          : "Unknown course";
      return {
        roundId,
        updatedAt,
        courseName,
        playerNames,
        holesCompleted: computeHolesCompleted(holeScores, playerNames.length),
        status: mapDisplayStatus(row.status, roundMetadata)
      } as SavedRoundSummary;
    })
    .filter((item): item is SavedRoundSummary => item !== null);
}

export async function loadRoundSnapshot(
  roundId: string,
  env: Record<string, string | undefined>
): Promise<RoundSnapshotPayload> {
  const supabase = createSupabaseClient(env);
  const { data, error } = await supabase
    .from("round_snapshots")
    .select(
      "round_id,status,round_metadata,players,teams,hole_scores,junk_events,closest_events_par3,closest_events_par5,presses,final_ledger"
    )
    .eq("round_id", roundId)
    .single();
  if (error || !data) {
    throw new Error(`Supabase load round snapshot failed: ${error?.message ?? "not found"}`);
  }

  return {
    roundId: typeof data.round_id === "string" ? data.round_id : roundId,
    status: mapSnapshotStatus(data.status),
    roundMetadata: isObject(data.round_metadata) ? data.round_metadata : {},
    players: isRecordArray(data.players) ? data.players : [],
    teams: isRecordArray(data.teams) ? data.teams : [],
    holeScores: isRecordArray(data.hole_scores) ? data.hole_scores : [],
    junkEvents: isRecordArray(data.junk_events) ? data.junk_events : [],
    closestEventsPar3: isRecordArray(data.closest_events_par3) ? data.closest_events_par3 : [],
    closestEventsPar5: isRecordArray(data.closest_events_par5) ? data.closest_events_par5 : [],
    presses: isRecordArray(data.presses) ? data.presses : [],
    finalLedger: isRecordArray(data.final_ledger) ? data.final_ledger : []
  };
}

export async function searchPlayers(
  env: Record<string, string | undefined>,
  query: string,
  limit = 20
): Promise<PlayerSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const supabase = createSupabaseClient(env);
  const { data, error } = await supabase
    .from("players")
    .select("id,display_name,first_name,last_name")
    .or(`display_name.ilike.%${trimmed}%,first_name.ilike.%${trimmed}%,last_name.ilike.%${trimmed}%`)
    .order("display_name", { ascending: true })
    .limit(limit);
  if (error) {
    throw new Error(`Supabase player search failed: ${error.message}`);
  }
  return (data ?? [])
    .map((row) => ({
      id: typeof row.id === "string" ? row.id : "",
      displayName:
        typeof row.display_name === "string" && row.display_name
          ? row.display_name
          : `${typeof row.first_name === "string" ? row.first_name : ""} ${typeof row.last_name === "string" ? row.last_name : ""}`.trim()
    }))
    .filter((item) => item.id && item.displayName);
}

export async function getSeasonJunkLeaderboard(
  env: Record<string, string | undefined>
): Promise<SeasonJunkLeaderRow[]> {
  const supabase = createSupabaseClient(env);
  const { data, error } = await supabase
    .from("round_snapshots")
    .select("round_metadata,players,final_ledger");
  if (error) {
    throw new Error(`Supabase leaderboard query failed: ${error.message}`);
  }

  const includeTypes = new Set(["junk", "hole_in_one", "closest_par3", "par5_carryover"]);
  const totalsByPlayerId = new Map<string, number>();
  const nameByPlayerId = new Map<string, string>();

  for (const row of data ?? []) {
    const metadata = isObject(row.round_metadata) ? row.round_metadata : {};
    if (metadata.lifecycleStatus === "abandoned") continue;
    const players = isRecordArray(row.players) ? row.players : [];
    for (const player of players) {
      const playerId = typeof player.id === "string" ? player.id : "";
      const playerName = typeof player.name === "string" ? player.name : "";
      if (!playerId) continue;
      if (playerName) nameByPlayerId.set(playerId, playerName);
      if (!totalsByPlayerId.has(playerId)) totalsByPlayerId.set(playerId, 0);
    }

    const ledger = isRecordArray(row.final_ledger) ? row.final_ledger : [];
    for (const entry of ledger) {
      const type = typeof entry.type === "string" ? entry.type : "";
      if (!includeTypes.has(type)) continue;
      const points = typeof entry.points === "number" ? entry.points : NaN;
      if (!Number.isFinite(points)) continue;
      const playerId = typeof entry.playerId === "string" ? entry.playerId : "";
      if (!playerId) continue;
      totalsByPlayerId.set(playerId, (totalsByPlayerId.get(playerId) ?? 0) + points);
    }
  }

  return [...totalsByPlayerId.entries()]
    .map(([playerId, junkPoints]) => ({
      playerId,
      playerName: nameByPlayerId.get(playerId) ?? playerId,
      junkPoints
    }))
    .sort((a, b) => b.junkPoints - a.junkPoints || a.playerName.localeCompare(b.playerName));
}

export async function saveRoundNormalized(
  payload: RoundSnapshotPayload,
  env: Record<string, string | undefined>
): Promise<void> {
  const supabase = createSupabaseClient(env);
  const roundMetadata = isObject(payload.roundMetadata) ? payload.roundMetadata : {};
  const settings = isObject(roundMetadata.settings) ? roundMetadata.settings : {};
  const courseExternalRef =
    typeof roundMetadata.courseId === "string" && roundMetadata.courseId ? roundMetadata.courseId : null;
  const courseName =
    typeof roundMetadata.courseName === "string" && roundMetadata.courseName ? roundMetadata.courseName : null;
  const teeBoxExternalRef =
    typeof roundMetadata.teeBoxId === "string" && roundMetadata.teeBoxId ? roundMetadata.teeBoxId : null;

  const { data: roundRow, error: roundError } = await supabase
    .from("rounds")
    .upsert(
      {
        external_round_ref: payload.roundId,
        status: payload.status,
        settings,
        course_external_ref: courseExternalRef,
        course_name: courseName,
        tee_box_external_ref: teeBoxExternalRef,
        updated_at: new Date().toISOString()
      },
      { onConflict: "external_round_ref" }
    )
    .select("id")
    .single();
  if (roundError || !roundRow?.id) {
    throw new Error(`Supabase rounds upsert failed: ${roundError?.message ?? "missing round id"}`);
  }
  const roundDbId = roundRow.id as string;

  const players = toPlayers(payload.players);
  if (!players.length) {
    throw new Error("No players available to persist.");
  }
  const playerIdByExternalId = new Map<string, string>();
  const linkedPlayers = players.filter((player) => isUuid(player.id));
  const externalPlayers = players.filter((player) => !isUuid(player.id));

  if (linkedPlayers.length) {
    const { data: linkedRows, error: linkedError } = await supabase
      .from("players")
      .upsert(
        linkedPlayers.map((player) => ({
          id: player.id,
          first_name: player.firstName ?? null,
          last_name: player.lastName ?? null,
          display_name: player.officialName,
          default_strokes_received: player.defaultStrokesReceived ?? null,
          last_used_strokes_received: player.lastUsedStrokesReceived ?? null,
          updated_at: new Date().toISOString()
        })),
        { onConflict: "id" }
      )
      .select("id");
    if (linkedError) {
      throw new Error(`Supabase linked players upsert failed: ${linkedError.message}`);
    }
    for (const row of linkedRows ?? []) {
      if (typeof row.id === "string") {
        playerIdByExternalId.set(row.id, row.id);
      }
    }
  }

  if (externalPlayers.length) {
    const invalid = externalPlayers.find((player) => !player.firstName || !player.lastName);
    if (invalid) {
      throw new Error(
        `Player "${invalid.officialName}" must include first and last name (e.g. "Sam Janvey") before saving.`
      );
    }
    const { data: playerRows, error: playerError } = await supabase
      .from("players")
      .upsert(
        externalPlayers.map((player) => ({
          first_name: normalizeNamePart(player.firstName!),
          last_name: normalizeNamePart(player.lastName!),
          external_player_ref: `name:${playerNameKey(player.firstName!, player.lastName!)}`,
          display_name: player.officialName,
          default_strokes_received: player.defaultStrokesReceived ?? null,
          last_used_strokes_received: player.lastUsedStrokesReceived ?? null,
          updated_at: new Date().toISOString()
        })),
        { onConflict: "first_name,last_name" }
      )
      .select("id, first_name, last_name");
    if (playerError) {
      throw new Error(`Supabase players upsert failed: ${playerError.message}`);
    }
    const playerIdByNameKey = new Map<string, string>();
    for (const row of playerRows ?? []) {
      if (
        typeof row.id === "string" &&
        typeof row.first_name === "string" &&
        typeof row.last_name === "string"
      ) {
        playerIdByNameKey.set(playerNameKey(row.first_name, row.last_name), row.id);
      }
    }
    for (const player of externalPlayers) {
      const dbId = playerIdByNameKey.get(playerNameKey(player.firstName!, player.lastName!));
      if (dbId) {
        playerIdByExternalId.set(player.id, dbId);
      }
    }
  }
  for (const player of players) {
    if (!playerIdByExternalId.has(player.id)) {
      throw new Error(`Missing persisted player id for external player ${player.id}.`);
    }
  }

  const { error: deleteLedgerError } = await supabase.from("ledger_entries").delete().eq("round_id", roundDbId);
  if (deleteLedgerError) throw new Error(`Failed clearing prior ledger entries: ${deleteLedgerError.message}`);
  const { error: deleteHoleScoresError } = await supabase.from("hole_scores").delete().eq("round_id", roundDbId);
  if (deleteHoleScoresError) throw new Error(`Failed clearing prior hole scores: ${deleteHoleScoresError.message}`);
  const { error: deleteClosestError } = await supabase
    .from("round_closest_events")
    .delete()
    .eq("round_id", roundDbId);
  if (deleteClosestError) throw new Error(`Failed clearing prior closest events: ${deleteClosestError.message}`);
  const { error: deleteJunkError } = await supabase.from("round_junk_events").delete().eq("round_id", roundDbId);
  if (deleteJunkError) throw new Error(`Failed clearing prior junk events: ${deleteJunkError.message}`);
  const { error: deletePressesError } = await supabase.from("round_presses").delete().eq("round_id", roundDbId);
  if (deletePressesError) throw new Error(`Failed clearing prior presses: ${deletePressesError.message}`);
  const { error: deleteRoundPlayersError } = await supabase
    .from("round_players")
    .delete()
    .eq("round_id", roundDbId);
  if (deleteRoundPlayersError) {
    throw new Error(`Failed clearing prior round players: ${deleteRoundPlayersError.message}`);
  }
  const { error: deleteRoundTeamsError } = await supabase.from("round_teams").delete().eq("round_id", roundDbId);
  if (deleteRoundTeamsError) throw new Error(`Failed clearing prior round teams: ${deleteRoundTeamsError.message}`);

  const teams = toTeams(payload.teams);
  if (!teams.length) {
    throw new Error("No teams available to persist.");
  }
  const { data: teamRows, error: teamError } = await supabase
    .from("round_teams")
    .upsert(
      teams.map((team) => ({
        round_id: roundDbId,
        external_team_ref: team.id,
        name: team.name,
        updated_at: new Date().toISOString()
      })),
      { onConflict: "round_id,external_team_ref" }
    )
    .select("id, external_team_ref");
  if (teamError) {
    throw new Error(`Supabase round teams upsert failed: ${teamError.message}`);
  }
  const teamIdByExternalId = new Map<string, string>();
  for (const row of teamRows ?? []) {
    if (typeof row.external_team_ref === "string" && typeof row.id === "string") {
      teamIdByExternalId.set(row.external_team_ref, row.id);
    }
  }
  for (const team of teams) {
    if (!teamIdByExternalId.has(team.id)) {
      throw new Error(`Missing persisted team id for external team ${team.id}.`);
    }
  }

  const teamExternalByPlayerExternal = new Map<string, string>();
  for (const team of teams) {
    for (const playerId of team.playerIds ?? []) {
      teamExternalByPlayerExternal.set(playerId, team.id);
    }
  }
  const defaultStrokesByPlayerExternal = new Map<string, number>();
  for (const player of players) {
    defaultStrokesByPlayerExternal.set(
      player.id,
      player.lastUsedStrokesReceived ?? player.defaultStrokesReceived ?? 0
    );
  }
  const roundPlayerRows = players.map((player) => {
    const teamExternal = teamExternalByPlayerExternal.get(player.id);
    const playerDbId = playerIdByExternalId.get(player.id);
    if (!teamExternal || !playerDbId) {
      throw new Error(`Cannot map player ${player.id} to team/player IDs.`);
    }
    const teamDbId = teamIdByExternalId.get(teamExternal);
    if (!teamDbId) {
      throw new Error(`Cannot map team ${teamExternal} for player ${player.id}.`);
    }
    return {
      round_id: roundDbId,
      player_id: playerDbId,
      team_id: teamDbId,
      strokes_received: defaultStrokesByPlayerExternal.get(player.id) ?? 0,
      updated_at: new Date().toISOString()
    };
  });
  if (roundPlayerRows.length) {
    const { error: roundPlayersError } = await supabase.from("round_players").insert(roundPlayerRows);
    if (roundPlayersError) {
      throw new Error(`Supabase round players insert failed: ${roundPlayersError.message}`);
    }
  }

  const holeScores = toHoleScores(payload.holeScores);
  if (holeScores.length) {
    const { error: holeScoresError } = await supabase.from("hole_scores").insert(
      holeScores.map((score) => {
        const playerDbId = playerIdByExternalId.get(score.playerId);
        if (!playerDbId) {
          throw new Error(`Cannot map player ${score.playerId} for hole scores.`);
        }
        return {
          round_id: roundDbId,
          hole_number: score.holeNumber,
          player_id: playerDbId,
          gross_score: score.grossScore,
          strokes_received: score.strokesReceived,
          net_score: score.netScore,
          updated_at: new Date().toISOString()
        };
      })
    );
    if (holeScoresError) {
      throw new Error(`Supabase hole scores insert failed: ${holeScoresError.message}`);
    }
  }

  const junkEvents = toJunkEvents(payload.junkEvents);
  if (junkEvents.length) {
    const { error: junkEventsError } = await supabase.from("round_junk_events").insert(
      junkEvents.map((event) => {
        const playerDbId = playerIdByExternalId.get(event.playerId);
        const teamDbId = teamIdByExternalId.get(event.teamId);
        if (!playerDbId || !teamDbId) {
          throw new Error(`Cannot map junk event ids for hole ${event.holeNumber}.`);
        }
        return {
          round_id: roundDbId,
          hole_number: event.holeNumber,
          player_id: playerDbId,
          team_id: teamDbId,
          event_type: event.type,
          points: event.points ?? null,
          payload: {
            source_team_id: event.teamId,
            source_player_id: event.playerId
          },
          updated_at: new Date().toISOString()
        };
      })
    );
    if (junkEventsError) {
      throw new Error(`Supabase junk events insert failed: ${junkEventsError.message}`);
    }
  }

  const closestEventsPar3 = toClosestEvents(payload.closestEventsPar3);
  const closestEventsPar5 = toClosestEvents(payload.closestEventsPar5);
  const closestRows = [
    ...closestEventsPar3.map((event) => ({ ...event, track: "par3" as const })),
    ...closestEventsPar5.map((event) => ({ ...event, track: "par5" as const }))
  ];
  if (closestRows.length) {
    const { error: closestEventsError } = await supabase.from("round_closest_events").insert(
      closestRows.map((event) => ({
        round_id: roundDbId,
        hole_number: event.holeNumber,
        track: event.track,
        winner_player_id: event.winnerPlayerId ? (playerIdByExternalId.get(event.winnerPlayerId) ?? null) : null,
        winner_team_id: event.winnerPlayerId
          ? (() => {
              const sourceTeamExternal = teamExternalByPlayerExternal.get(event.winnerPlayerId);
              return sourceTeamExternal ? (teamIdByExternalId.get(sourceTeamExternal) ?? null) : null;
            })()
          : null,
        payload: {
          source_winner_player_id: event.winnerPlayerId
        },
        updated_at: new Date().toISOString()
      }))
    );
    if (closestEventsError) {
      throw new Error(`Supabase closest events insert failed: ${closestEventsError.message}`);
    }
  }

  const presses = toPresses(payload.presses);
  if (presses.length) {
    const { error: pressesError } = await supabase.from("round_presses").insert(
      presses.map((press) => {
        const teamDbId = teamIdByExternalId.get(press.teamThatWasDown);
        if (!teamDbId) {
          throw new Error(`Cannot map press team ${press.teamThatWasDown}.`);
        }
        return {
          round_id: roundDbId,
          external_press_ref: press.id,
          side: press.side,
          starting_hole: press.startingHole,
          ending_hole: press.endingHole,
          team_that_was_down_id: teamDbId,
          value_points: press.valuePoints,
          created_by: press.createdBy,
          trigger_hole: press.triggerHole,
          source_match_id: press.sourceMatchId ?? null,
          status: press.status,
          payload: {
            source_team_that_was_down: press.teamThatWasDown
          },
          updated_at: new Date().toISOString()
        };
      })
    );
    if (pressesError) {
      throw new Error(`Supabase presses insert failed: ${pressesError.message}`);
    }
  }

  const ledgerEntries = toLedgerEntries(payload.finalLedger);
  if (ledgerEntries.length) {
    const { error: ledgerError } = await supabase.from("ledger_entries").insert(
      ledgerEntries.map((entry) => ({
        round_id: roundDbId,
        hole_number: entry.holeNumber ?? null,
        entry_type: entry.type,
        team_id: teamIdByExternalId.get(entry.teamId) ?? null,
        player_id: entry.playerId ? (playerIdByExternalId.get(entry.playerId) ?? null) : null,
        points: entry.points,
        description: entry.description,
        payload: {
          source_team_id: entry.teamId,
          source_player_id: entry.playerId ?? null
        }
      }))
    );
    if (ledgerError) {
      throw new Error(`Supabase ledger entries insert failed: ${ledgerError.message}`);
    }
  }
}
