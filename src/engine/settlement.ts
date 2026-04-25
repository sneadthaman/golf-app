import { LedgerEntry, Round, Team } from "../types";

export interface SettlementResult {
  byTeam: Record<string, number>;
  byPlayer: Record<string, number>;
}

function pointsPerPlayerForTeam(team: Team, points: number): number {
  if (!team.playerIds.length) return 0;
  return points / team.playerIds.length;
}

export function calculateSettlement(ledger: LedgerEntry[], round: Round): SettlementResult {
  const byTeam: Record<string, number> = {};
  const byPlayer: Record<string, number> = {};
  for (const team of round.teams) {
    byTeam[team.id] = 0;
    for (const playerId of team.playerIds) {
      byPlayer[playerId] = 0;
    }
  }
  const teamById = new Map(round.teams.map((team) => [team.id, team]));

  for (const entry of ledger) {
    byTeam[entry.teamId] = (byTeam[entry.teamId] ?? 0) + entry.points;
    const team = teamById.get(entry.teamId);
    if (!team) continue;
    if (entry.playerId) {
      byPlayer[entry.playerId] = (byPlayer[entry.playerId] ?? 0) + entry.points;
      continue;
    }
    const perPlayer = pointsPerPlayerForTeam(team, entry.points);
    for (const playerId of team.playerIds) {
      byPlayer[playerId] = (byPlayer[playerId] ?? 0) + perPlayer;
    }
  }
  return { byTeam, byPlayer };
}
