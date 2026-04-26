import { CarryoverState, ClosestEvent, CourseHole, LedgerEntry, Par5CarryoverEvent } from "../types";
import { makeLedgerId } from "./utils";

const defaultCarryoverState: CarryoverState = {
  par3ClosestBank: 1,
  par5Bank: 1
};

export interface CarryoverEvaluationInput {
  courseHoles: CourseHole[];
  closestEvents: ClosestEvent[];
  par5CarryoverEvents: Par5CarryoverEvent[];
  teamIdByPlayerId: Map<string, string>;
  roundId: string;
  state?: CarryoverState;
}

export interface CarryoverEvaluationResult {
  entries: LedgerEntry[];
  state: CarryoverState;
}

export function evaluateClosestCarryovers(input: CarryoverEvaluationInput): CarryoverEvaluationResult {
  const holeByNumber = new Map(input.courseHoles.map((hole) => [hole.holeNumber, hole]));
  const state: CarryoverState = input.state
    ? { ...input.state }
    : { ...defaultCarryoverState };
  const entries: LedgerEntry[] = [];

  const sortedClosest = [...input.closestEvents].sort((a, b) => a.holeNumber - b.holeNumber);
  for (const event of sortedClosest) {
    const hole = holeByNumber.get(event.holeNumber);
    if (!hole || hole.par !== 3) continue;
    if (event.winnerPlayerId) {
      const teamId = input.teamIdByPlayerId.get(event.winnerPlayerId);
      if (!teamId) continue;
      entries.push({
        id: makeLedgerId("closest_par3", event.holeNumber, teamId, event.winnerPlayerId),
        roundId: input.roundId,
        holeNumber: event.holeNumber,
        type: "closest_par3",
        teamId,
        playerId: event.winnerPlayerId,
        points: state.par3ClosestBank,
        description: `Par 3 closest carryover won on hole ${event.holeNumber}`
      });
      state.par3ClosestBank = 1;
    } else {
      state.par3ClosestBank += 1;
    }
  }

  const sortedPar5 = [...input.par5CarryoverEvents].sort((a, b) => a.holeNumber - b.holeNumber);
  for (const event of sortedPar5) {
    const hole = holeByNumber.get(event.holeNumber);
    if (!hole || hole.par !== 5) continue;
    if (event.winnerPlayerId) {
      const teamId = input.teamIdByPlayerId.get(event.winnerPlayerId);
      if (!teamId) continue;
      entries.push({
        id: makeLedgerId("par5_carryover", event.holeNumber, teamId, event.winnerPlayerId),
        roundId: input.roundId,
        holeNumber: event.holeNumber,
        type: "par5_carryover",
        teamId,
        playerId: event.winnerPlayerId,
        points: state.par5Bank,
        description: `Par 5 carryover won on hole ${event.holeNumber}`
      });
      state.par5Bank = 1;
    } else {
      state.par5Bank += 1;
    }
  }

  return { entries, state };
}
