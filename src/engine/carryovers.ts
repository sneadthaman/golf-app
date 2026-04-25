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
    if (event.winnerTeamId) {
      entries.push({
        id: makeLedgerId("closest_par3", event.holeNumber, event.winnerTeamId),
        roundId: input.roundId,
        holeNumber: event.holeNumber,
        type: "closest_par3",
        teamId: event.winnerTeamId,
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
    if (event.winnerTeamId) {
      entries.push({
        id: makeLedgerId("par5_carryover", event.holeNumber, event.winnerTeamId),
        roundId: input.roundId,
        holeNumber: event.holeNumber,
        type: "par5_carryover",
        teamId: event.winnerTeamId,
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
