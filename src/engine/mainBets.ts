import { LedgerEntry, Round } from "../types";
import { calculateSideStatus } from "./match";
import { makeLedgerId } from "./utils";

function adjustedMainValues(round: Round): { front: number; back: number; overall: number } {
  const multiplier = round.settings.crazyMode ? 2 : 1;
  return {
    front: round.settings.frontValuePoints * multiplier,
    back: round.settings.backValuePoints * multiplier,
    overall: round.settings.overallValuePoints * multiplier
  };
}

export function evaluateMainBets(round: Round): LedgerEntry[] {
  const values = adjustedMainValues(round);
  const teamA = round.teams[0];
  const teamB = round.teams[1];
  if (!teamA || !teamB) return [];

  const entries: LedgerEntry[] = [];
  const frontStatus = calculateSideStatus(round.holeResults.filter((result) => result.holeNumber <= 9), "front", teamA.id, teamB.id);
  if (frontStatus.state === "teamAUp") {
    entries.push({
      id: makeLedgerId("front_win", 9, teamA.id),
      roundId: round.id,
      holeNumber: 9,
      type: "front_win",
      teamId: teamA.id,
      points: values.front,
      description: "Front 9 won"
    });
  }
  if (frontStatus.state === "teamBUp") {
    entries.push({
      id: makeLedgerId("front_win", 9, teamB.id),
      roundId: round.id,
      holeNumber: 9,
      type: "front_win",
      teamId: teamB.id,
      points: values.front,
      description: "Front 9 won"
    });
  }

  const backStatus = calculateSideStatus(round.holeResults.filter((result) => result.holeNumber >= 10), "back", teamA.id, teamB.id);
  if (backStatus.state === "teamAUp") {
    entries.push({
      id: makeLedgerId("back_win", 18, teamA.id),
      roundId: round.id,
      holeNumber: 18,
      type: "back_win",
      teamId: teamA.id,
      points: values.back,
      description: "Back 9 won"
    });
  }
  if (backStatus.state === "teamBUp") {
    entries.push({
      id: makeLedgerId("back_win", 18, teamB.id),
      roundId: round.id,
      holeNumber: 18,
      type: "back_win",
      teamId: teamB.id,
      points: values.back,
      description: "Back 9 won"
    });
  }

  const overallStatus = calculateSideStatus(round.holeResults, "overall", teamA.id, teamB.id);
  if (overallStatus.state === "teamAUp") {
    entries.push({
      id: makeLedgerId("overall_win", 18, teamA.id),
      roundId: round.id,
      holeNumber: 18,
      type: "overall_win",
      teamId: teamA.id,
      points: values.overall,
      description: "Overall 18 won"
    });
  }
  if (overallStatus.state === "teamBUp") {
    entries.push({
      id: makeLedgerId("overall_win", 18, teamB.id),
      roundId: round.id,
      holeNumber: 18,
      type: "overall_win",
      teamId: teamB.id,
      points: values.overall,
      description: "Overall 18 won"
    });
  }

  return entries;
}
