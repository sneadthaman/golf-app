import { HoleResult, HoleScore, Press, SideStatus, Team } from "../types";

function getTeamNetBestBall(team: Team, holeScores: HoleScore[]): number {
  const teamScores = holeScores.filter((score) => team.playerIds.includes(score.playerId));
  if (teamScores.length === 0) {
    throw new Error(`No hole scores found for team ${team.id}`);
  }
  return Math.min(...teamScores.map((score) => score.netScore));
}

export function getHoleWinner(teamA: Team, teamB: Team, holeScores: HoleScore[]): HoleResult {
  const teamANet = getTeamNetBestBall(teamA, holeScores);
  const teamBNet = getTeamNetBestBall(teamB, holeScores);
  const roundId = holeScores[0]?.roundId ?? "round";
  const holeNumber = holeScores[0]?.holeNumber ?? 0;

  if (teamANet < teamBNet) {
    return {
      roundId,
      holeNumber,
      winningTeamId: teamA.id,
      losingTeamId: teamB.id,
      isHalved: false
    };
  }
  if (teamBNet < teamANet) {
    return {
      roundId,
      holeNumber,
      winningTeamId: teamB.id,
      losingTeamId: teamA.id,
      isHalved: false
    };
  }
  return {
    roundId,
    holeNumber,
    winningTeamId: null,
    losingTeamId: null,
    isHalved: true
  };
}

export type SideSelector = "front" | "back" | "overall" | { press: Press };

function holeInSide(holeNumber: number, side: SideSelector): boolean {
  if (typeof side === "object") {
    return holeNumber >= side.press.startingHole && holeNumber <= side.press.endingHole;
  }
  if (side === "front") return holeNumber >= 1 && holeNumber <= 9;
  if (side === "back") return holeNumber >= 10 && holeNumber <= 18;
  return holeNumber >= 1 && holeNumber <= 18;
}

export function calculateSideStatus(
  holeResults: HoleResult[],
  side: SideSelector,
  teamAId?: string,
  teamBId?: string
): SideStatus {
  const relevant = holeResults
    .filter((result) => holeInSide(result.holeNumber, side))
    .sort((a, b) => a.holeNumber - b.holeNumber);

  const ids = new Set<string>();
  for (const result of relevant) {
    if (result.winningTeamId) ids.add(result.winningTeamId);
    if (result.losingTeamId) ids.add(result.losingTeamId);
  }
  const discovered = [...ids];
  const resolvedTeamAId = teamAId ?? discovered[0];
  const resolvedTeamBId = teamBId ?? discovered[1];
  if (!resolvedTeamAId || !resolvedTeamBId) {
    return { teamAUp: 0, teamBUp: 0, state: "tied" };
  }

  let diff = 0;
  for (const result of relevant) {
    if (result.isHalved || !result.winningTeamId) continue;
    if (result.winningTeamId === resolvedTeamAId) diff += 1;
    if (result.winningTeamId === resolvedTeamBId) diff -= 1;
  }

  if (diff > 0) return { teamAUp: diff, teamBUp: 0, state: "teamAUp" };
  if (diff < 0) return { teamAUp: 0, teamBUp: Math.abs(diff), state: "teamBUp" };
  return { teamAUp: 0, teamBUp: 0, state: "tied" };
}
