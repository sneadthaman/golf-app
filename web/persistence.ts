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

interface SnapshotPlayer {
  id: string;
  name: string;
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
  winnerTeamId: string | null;
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

function toPlayers(items: Array<Record<string, unknown>>): SnapshotPlayer[] {
  return items
    .map((item) => {
      const id = typeof item.id === "string" ? item.id : "";
      const name = typeof item.name === "string" ? item.name : "";
      if (!id || !name) return null;
      return {
        id,
        name,
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
      const winnerTeamId = typeof item.winnerTeamId === "string" ? item.winnerTeamId : null;
      return { holeNumber, winnerTeamId };
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
  const { data: playerRows, error: playerError } = await supabase
    .from("players")
    .upsert(
      players.map((player) => ({
        external_player_ref: player.id,
        display_name: player.name,
        default_strokes_received: player.defaultStrokesReceived ?? null,
        last_used_strokes_received: player.lastUsedStrokesReceived ?? null,
        updated_at: new Date().toISOString()
      })),
      { onConflict: "external_player_ref" }
    )
    .select("id, external_player_ref");
  if (playerError) {
    throw new Error(`Supabase players upsert failed: ${playerError.message}`);
  }
  const playerIdByExternalId = new Map<string, string>();
  for (const row of playerRows ?? []) {
    if (typeof row.external_player_ref === "string" && typeof row.id === "string") {
      playerIdByExternalId.set(row.external_player_ref, row.id);
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
        winner_team_id: event.winnerTeamId ? (teamIdByExternalId.get(event.winnerTeamId) ?? null) : null,
        payload: {
          source_winner_team_id: event.winnerTeamId
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
