import { CourseHole, HoleScore, RoundPlayer } from "../types";

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

function strokeCountForReplayNine(handicap: number, holeNumber: number, holeHandicapIndex: number): number {
  if (handicap <= 0) return 0;
  const frontAllowance = Math.ceil(handicap / 2);
  const backAllowance = Math.floor(handicap / 2);
  const sideAllowance = holeNumber <= 9 ? frontAllowance : backAllowance;
  const fullRounds = Math.floor(sideAllowance / 9);
  const extra = sideAllowance % 9;
  return fullRounds + (holeHandicapIndex <= extra ? 1 : 0);
}

function isReplayNineIndexes(courseHoles: CourseHole[]): boolean {
  if (courseHoles.length !== 18) return false;
  const counts = new Map<number, number>();
  for (const hole of courseHoles) {
    counts.set(hole.handicapIndex, (counts.get(hole.handicapIndex) ?? 0) + 1);
  }
  for (let index = 1; index <= 9; index += 1) {
    if ((counts.get(index) ?? 0) !== 2) return false;
  }
  return true;
}

export function calculateNetScores(
  roundPlayers: RoundPlayer[],
  courseHoles: CourseHole[],
  grossScores: GrossScoreInput[],
  roundId = "round",
  options?: { handicapMode?: "standard18" | "split9_replay" }
): HoleScore[] {
  const roundPlayerByPlayerId = new Map(roundPlayers.map((roundPlayer) => [roundPlayer.playerId, roundPlayer]));
  const holeByNumber = new Map(courseHoles.map((hole) => [hole.holeNumber, hole]));
  const handicapMode = options?.handicapMode ?? (isReplayNineIndexes(courseHoles) ? "split9_replay" : "standard18");

  return grossScores.map((input) => {
    const roundPlayer = roundPlayerByPlayerId.get(input.playerId);
    const hole = holeByNumber.get(input.holeNumber);
    if (!roundPlayer) {
      throw new Error(`Missing roundPlayer strokesReceived for playerId: ${input.playerId}`);
    }
    if (!hole) {
      throw new Error(`Unknown hole number: ${input.holeNumber}`);
    }
    const strokesReceived =
      handicapMode === "split9_replay"
        ? strokeCountForReplayNine(roundPlayer.strokesReceived, input.holeNumber, hole.handicapIndex)
        : strokeCountForHole(roundPlayer.strokesReceived, hole.handicapIndex);
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
