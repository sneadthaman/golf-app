import { RoundSnapshotPayload } from "./contract";

export interface TeamSettlementRow {
  teamName: string;
  points: number;
  outcome: string;
}

export interface SettlementSummary {
  teamRows: TeamSettlementRow[];
  junkRows: Array<{ playerName: string; points: number }>;
  cpRows: Array<{ playerName: string; points: number }>;
  pressRows: string[];
  textMessage: string;
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function summarizeSettlement(snapshot: RoundSnapshotPayload): SettlementSummary {
  const teamNameById = new Map(snapshot.teams.map((team) => [String(team.id), String(team.name ?? team.id)]));
  const playerNameById = new Map(snapshot.players.map((player) => [String(player.id), String(player.name ?? player.id)]));

  const byTeam = new Map<string, number>();
  const junkByPlayer = new Map<string, number>();
  const cpByPlayer = new Map<string, number>();
  const pressRows: string[] = [];

  for (const row of snapshot.finalLedger) {
    const teamId = String(row.teamId ?? "");
    const points = toNumber(row.points);
    const type = String(row.type ?? "");
    if (teamId) byTeam.set(teamId, (byTeam.get(teamId) ?? 0) + points);

    if ((type === "junk" || type === "hole_in_one") && typeof row.playerId === "string") {
      junkByPlayer.set(row.playerId, (junkByPlayer.get(row.playerId) ?? 0) + points);
    }
    if ((type === "closest_par3" || type === "par5_carryover") && typeof row.playerId === "string") {
      cpByPlayer.set(row.playerId, (cpByPlayer.get(row.playerId) ?? 0) + points);
    }
    if (type === "press_win") {
      const hole = row.holeNumber ?? "-";
      const description = String(row.description ?? "Press win");
      pressRows.push(`Hole ${hole}: ${description} (+${points})`);
    }
  }

  const teamAId = String(snapshot.teams[0]?.id ?? "teamA");
  const teamBId = String(snapshot.teams[1]?.id ?? "teamB");
  const teamAName = teamNameById.get(teamAId) ?? "Team A";
  const teamBName = teamNameById.get(teamBId) ?? "Team B";
  const teamAScore = byTeam.get(teamAId) ?? 0;
  const teamBScore = byTeam.get(teamBId) ?? 0;

  const deltaA = teamAScore - teamBScore;
  const deltaB = -deltaA;

  const outcome = (delta: number): string => {
    if (delta > 0) return `wins ${delta} pt${delta === 1 ? "" : "s"}`;
    if (delta < 0) {
      const owed = Math.abs(delta);
      return `owes ${owed} pt${owed === 1 ? "" : "s"}`;
    }
    return "pushes";
  };

  const junkRows = [...junkByPlayer.entries()]
    .map(([playerId, points]) => ({ playerName: playerNameById.get(playerId) ?? playerId, points }))
    .sort((a, b) => b.points - a.points || a.playerName.localeCompare(b.playerName));

  const cpRows = [...cpByPlayer.entries()]
    .map(([playerId, points]) => ({ playerName: playerNameById.get(playerId) ?? playerId, points }))
    .sort((a, b) => b.points - a.points || a.playerName.localeCompare(b.playerName));

  const textMessage = [
    `${snapshot.roundMetadata.courseName} settlement`,
    `${teamAName} ${outcome(deltaA)}`,
    `${teamBName} ${outcome(deltaB)}`,
    `Junk: ${junkRows.length ? junkRows.map((row) => `${row.playerName}+${row.points}`).join(", ") : "None"}`,
    `CP: ${cpRows.length ? cpRows.map((row) => `${row.playerName}+${row.points}`).join(", ") : "None"}`,
    `Presses: ${pressRows.length ? pressRows.join(" | ") : "None"}`
  ].join("\n");

  return {
    teamRows: [
      { teamName: teamAName, points: teamAScore, outcome: outcome(deltaA) },
      { teamName: teamBName, points: teamBScore, outcome: outcome(deltaB) }
    ],
    junkRows,
    cpRows,
    pressRows,
    textMessage
  };
}
