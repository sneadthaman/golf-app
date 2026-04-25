import { CourseHole, HoleScore, Player } from "../types";

export interface GrossScoreInput {
  holeNumber: number;
  playerId: string;
  grossScore: number;
}

function strokeCountForHole(handicap: number, holeHandicapIndex: number): number {
  if (handicap <= 0) return 0;
  const fullRounds = Math.floor(handicap / 18);
  const extra = handicap % 18;
  return fullRounds + (holeHandicapIndex <= extra ? 1 : 0);
}

export function calculateNetScores(
  players: Player[],
  courseHoles: CourseHole[],
  grossScores: GrossScoreInput[],
  roundId = "round"
): HoleScore[] {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const holeByNumber = new Map(courseHoles.map((hole) => [hole.holeNumber, hole]));

  return grossScores.map((input) => {
    const player = playerById.get(input.playerId);
    const hole = holeByNumber.get(input.holeNumber);
    if (!player) {
      throw new Error(`Unknown playerId: ${input.playerId}`);
    }
    if (!hole) {
      throw new Error(`Unknown hole number: ${input.holeNumber}`);
    }
    const strokesReceived = strokeCountForHole(player.handicap, hole.handicapIndex);
    return {
      roundId,
      holeNumber: input.holeNumber,
      playerId: input.playerId,
      grossScore: input.grossScore,
      strokesReceived,
      netScore: input.grossScore - strokesReceived
    };
  });
}
