import { ROUND_STATE_SCHEMA_VERSION, RoundSnapshotPayload } from "./contract";

type CreateRoundInput = {
  currentUserId: string;
  courseName: string;
  teeBoxId: string;
  playerNames: string[];
};

type HoleInput = {
  playerId: string;
  grossScore: number;
};

function makeRoundId(): string {
  return `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createRoundSnapshot(input: CreateRoundInput): RoundSnapshotPayload {
  const players = input.playerNames.slice(0, 4).map((name, idx) => {
    const id = `p${idx + 1}`;
    return {
      id,
      name: name.trim() || `Player ${idx + 1}`,
      officialName: name.trim() || `Player ${idx + 1}`,
      displayName: name.trim() || `P${idx + 1}`,
      defaultStrokesReceived: 0,
      lastUsedStrokesReceived: 0
    };
  });

  while (players.length < 4) {
    const idx = players.length;
    players.push({
      id: `p${idx + 1}`,
      name: `Player ${idx + 1}`,
      officialName: `Player ${idx + 1}`,
      displayName: `P${idx + 1}`,
      defaultStrokesReceived: 0,
      lastUsedStrokesReceived: 0
    });
  }

  return {
    roundId: makeRoundId(),
    status: "active",
    roundMetadata: {
      schemaVersion: ROUND_STATE_SCHEMA_VERSION,
      courseId: input.courseName.trim().toLowerCase().replace(/\s+/g, "-") || "manual-course",
      courseName: input.courseName.trim() || "Manual Course",
      teeBoxId: input.teeBoxId.trim() || "white",
      lifecycleStatus: "in_progress",
      ownership: {
        ownerId: input.currentUserId,
        editorIds: [],
        viewerIds: []
      }
    },
    players,
    teams: [
      { id: "teamA", name: "Team A", playerIds: ["p1", "p2"] },
      { id: "teamB", name: "Team B", playerIds: ["p3", "p4"] }
    ],
    holeScores: [],
    junkEvents: [],
    closestEventsPar3: [],
    closestEventsPar5: [],
    presses: [],
    finalLedger: []
  };
}

function holeKey(holeNumber: number, playerId: string): string {
  return `${holeNumber}:${playerId}`;
}

function hasAllHoleScores(snapshot: RoundSnapshotPayload, holeNumber: number): boolean {
  const players = snapshot.players.map((player) => String(player.id ?? "")).filter(Boolean);
  if (!players.length) return false;
  const set = new Set(
    snapshot.holeScores
      .filter((row) => Number(row.holeNumber) === holeNumber)
      .map((row) => String(row.playerId ?? ""))
      .filter(Boolean)
  );
  return players.every((playerId) => set.has(playerId));
}

function rebuildLedger(snapshot: RoundSnapshotPayload): Array<Record<string, unknown>> {
  const scoreMap = new Map<string, number>();
  for (const score of snapshot.holeScores) {
    const holeNumber = Number(score.holeNumber);
    const playerId = String(score.playerId ?? "");
    const gross = Number(score.grossScore);
    if (!Number.isFinite(holeNumber) || !playerId || !Number.isFinite(gross)) continue;
    scoreMap.set(holeKey(holeNumber, playerId), gross);
  }

  const teamA = snapshot.teams.find((team) => String(team.id) === "teamA");
  const teamB = snapshot.teams.find((team) => String(team.id) === "teamB");
  const teamAPlayers = Array.isArray(teamA?.playerIds) ? teamA.playerIds.map(String) : [];
  const teamBPlayers = Array.isArray(teamB?.playerIds) ? teamB.playerIds.map(String) : [];

  const ledger: Array<Record<string, unknown>> = [];

  for (let holeNumber = 1; holeNumber <= 18; holeNumber += 1) {
    if (!hasAllHoleScores(snapshot, holeNumber)) continue;
    const aScores = teamAPlayers.map((playerId) => scoreMap.get(holeKey(holeNumber, playerId))).filter((v): v is number => v !== undefined);
    const bScores = teamBPlayers.map((playerId) => scoreMap.get(holeKey(holeNumber, playerId))).filter((v): v is number => v !== undefined);
    if (!aScores.length || !bScores.length) continue;

    const bestA = Math.min(...aScores);
    const bestB = Math.min(...bScores);

    if (bestA === bestB) continue;

    const winningTeamId = bestA < bestB ? "teamA" : "teamB";
    ledger.push({
      id: `overall_win:${holeNumber}:${winningTeamId}`,
      holeNumber,
      type: "overall_win",
      teamId: winningTeamId,
      points: 1,
      description: `Hole ${holeNumber} best-ball win`
    });
  }

  return ledger;
}

export function applyHoleScores(
  snapshot: RoundSnapshotPayload,
  holeNumber: number,
  inputs: HoleInput[]
): RoundSnapshotPayload {
  const kept = snapshot.holeScores.filter((row) => Number(row.holeNumber) !== holeNumber);
  const nextScores = [
    ...kept,
    ...inputs
      .filter((item) => Number.isFinite(item.grossScore) && item.grossScore > 0)
      .map((item) => ({
        holeNumber,
        playerId: item.playerId,
        grossScore: Math.round(item.grossScore),
        strokesReceived: 0,
        netScore: Math.round(item.grossScore)
      }))
  ];

  const roundWithScores: RoundSnapshotPayload = {
    ...snapshot,
    holeScores: nextScores
  };

  const allComplete = Array.from({ length: 18 }, (_, idx) => idx + 1).every((hole) => hasAllHoleScores(roundWithScores, hole));
  const nextStatus: RoundSnapshotPayload["status"] = allComplete ? "complete" : "active";

  return {
    ...roundWithScores,
    status: nextStatus,
    roundMetadata: {
      ...roundWithScores.roundMetadata,
      lifecycleStatus: nextStatus === "complete" ? "completed" : "in_progress"
    },
    finalLedger: rebuildLedger(roundWithScores)
  };
}
