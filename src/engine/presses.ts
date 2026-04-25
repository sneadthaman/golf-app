import { LedgerEntry, Press, Round, SideType } from "../types";
import { calculateSideStatus } from "./match";
import { makeLedgerId } from "./utils";

function sideWindow(side: SideType): [number, number] {
  if (side === "front") return [1, 9];
  if (side === "back") return [10, 18];
  return [1, 18];
}

function statusAtHole(round: Round, selector: "front" | "back" | { press: Press }, holeNumber: number) {
  const results = round.holeResults.filter((result) => result.holeNumber <= holeNumber);
  return calculateSideStatus(results, selector, round.teams[0]?.id, round.teams[1]?.id);
}

export function evaluateAutoPresses(round: Round, afterHoleNumber: number): Press[] {
  if (!round.settings.autoPressEnabled) return round.presses ?? [];
  if (afterHoleNumber < 1 || afterHoleNumber > 18) return round.presses ?? [];

  const side: "front" | "back" = afterHoleNumber <= 9 ? "front" : "back";
  const lastHoleOfSide = side === "front" ? 9 : 18;
  if (afterHoleNumber >= lastHoleOfSide) return round.presses ?? [];

  const existing = round.presses ? [...round.presses] : [];
  const candidates: Array<{ sourceMatchId: string; selector: "front" | "back" | { press: Press } }> = [
    { sourceMatchId: `main:${side}`, selector: side },
    ...existing
      .filter(
        (press) =>
          press.side === side &&
          press.startingHole <= afterHoleNumber &&
          press.endingHole >= afterHoleNumber
      )
      .map((press) => ({ sourceMatchId: press.id, selector: { press } as const }))
  ];

  const nextPresses = [...existing];
  for (const candidate of candidates) {
    const status = statusAtHole(round, candidate.selector, afterHoleNumber);
    const previousStatus = statusAtHole(round, candidate.selector, afterHoleNumber - 1);
    const triggerDownTeamId =
      status.state === "teamAUp"
        ? round.teams[1]?.id
        : status.state === "teamBUp"
          ? round.teams[0]?.id
          : null;
    const isTwoUp = status.teamAUp >= 2 || status.teamBUp >= 2;
    const wasTwoUp = previousStatus.teamAUp >= 2 || previousStatus.teamBUp >= 2;
    const enteredTriggerState = isTwoUp && (!wasTwoUp || previousStatus.state !== status.state);
    if (!enteredTriggerState || !triggerDownTeamId) continue;

    const duplicate = nextPresses.some(
      (press) =>
        press.side === side &&
        press.triggerHole === afterHoleNumber &&
        press.teamThatWasDown === triggerDownTeamId &&
        press.sourceMatchId === candidate.sourceMatchId
    );
    if (duplicate) continue;

    const createdPress: Press = {
      id: `${round.id}:${side}:press:${afterHoleNumber + 1}:${triggerDownTeamId}:${nextPresses.length + 1}`,
      roundId: round.id,
      side,
      startingHole: afterHoleNumber + 1,
      endingHole: lastHoleOfSide,
      teamThatWasDown: triggerDownTeamId,
      valuePoints: round.settings.pressValuePoints,
      createdBy: "auto",
      triggerHole: afterHoleNumber,
      sourceMatchId: candidate.sourceMatchId,
      status: "active"
    };
    nextPresses.push(createdPress);
  }

  return nextPresses;
}

export function evaluatePresses(round: Round): LedgerEntry[] {
  if (!round.presses?.length) return [];
  const entries: LedgerEntry[] = [];
  for (const press of round.presses) {
    const status = calculateSideStatus(round.holeResults, { press }, round.teams[0]?.id, round.teams[1]?.id);
    const winningTeamId =
      status.state === "teamAUp"
        ? round.teams[0]?.id
        : status.state === "teamBUp"
          ? round.teams[1]?.id
          : null;
    if (!winningTeamId) continue;
    entries.push({
      id: makeLedgerId("press_win", press.endingHole, winningTeamId, undefined, press.id),
      roundId: round.id,
      holeNumber: press.endingHole,
      type: "press_win",
      teamId: winningTeamId,
      points: press.valuePoints,
      description: `Press won (${press.side}) starting hole ${press.startingHole}`
    });
  }
  return entries;
}
