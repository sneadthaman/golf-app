import { LedgerEntry, Round } from "../types";
import { evaluateClosestCarryovers } from "./carryovers";
import { evaluateJunkEvents } from "./junk";
import { evaluateMainBets } from "./mainBets";
import { evaluatePresses } from "./presses";

export function calculateLedger(round: Round): LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  entries.push(...evaluateMainBets(round));
  if (round.settings.junkEnabled) {
    entries.push(...evaluateJunkEvents(round.junkEvents));
    entries.push(
      ...evaluateClosestCarryovers({
        roundId: round.id,
        courseHoles: round.courseHoles,
        closestEvents: round.closestEvents,
        par5CarryoverEvents: round.par5CarryoverEvents
      }).entries
    );
  }
  entries.push(...evaluatePresses(round));
  return entries.sort((a, b) => {
    const holeA = a.holeNumber ?? 99;
    const holeB = b.holeNumber ?? 99;
    if (holeA !== holeB) return holeA - holeB;
    return a.id.localeCompare(b.id);
  });
}
