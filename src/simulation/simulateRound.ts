import { calculateLedger } from "../engine/ledger";
import { calculateSideStatus, SideSelector } from "../engine/match";
import { getHoleWinner } from "../engine/match";
import { calculateNetScores, GrossScoreInput } from "../engine/net";
import { evaluateAutoPresses } from "../engine/presses";
import { calculateSettlement, SettlementResult } from "../engine/settlement";
import { ClosestEvent, Course, JunkEvent, LedgerEntry, Par5CarryoverEvent, Player, Round, RoundPlayer, SideStatus, Team } from "../types";
import { createSimplePar72Course } from "./courseFixtures";

function createRng(seed: number): () => number {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function scoreDeltaFromRoll(roll: number): number {
  if (roll < 0.08) return -1;
  if (roll < 0.56) return 0;
  if (roll < 0.9) return 1;
  return 2;
}

function simulationBias(holeNumber: number, teamId: string): number {
  if (holeNumber >= 1 && holeNumber <= 4) {
    return teamId === "teamA" ? -1 : 1;
  }
  if (holeNumber >= 10 && holeNumber <= 13) {
    return teamId === "teamB" ? -1 : 1;
  }
  return 0;
}

function simulateGrossScore(par: number, handicapIndex: number, holeNumber: number, teamId: string, rng: () => number): number {
  const delta = scoreDeltaFromRoll(rng());
  const difficultyAdjustment = handicapIndex <= 6 ? 1 : 0;
  const gross = par + delta + difficultyAdjustment + simulationBias(holeNumber, teamId);
  return Math.max(1, gross);
}

function getTeamBestNet(team: Team, scoresForHole: { playerId: string; netScore: number }[]): number {
  const teamScores = scoresForHole.filter((score) => team.playerIds.includes(score.playerId));
  return Math.min(...teamScores.map((score) => score.netScore));
}

function statusLabel(status: SideStatus): string {
  if (status.state === "teamAUp") return `Team A ${status.teamAUp} up`;
  if (status.state === "teamBUp") return `Team B ${status.teamBUp} up`;
  return "Tied";
}

function statusForSide(holeResults: Round["holeResults"], side: SideSelector): SideStatus {
  return calculateSideStatus(holeResults, side, "teamA", "teamB");
}

function buildJunkEvents(
  roundId: string,
  round: Pick<Round, "courseHoles" | "holeScores">,
  teamIdByPlayerId: Record<string, string>,
  rng: () => number
): JunkEvent[] {
  const holeByNumber = new Map(round.courseHoles.map((hole) => [hole.holeNumber, hole]));
  const events: JunkEvent[] = [];

  for (const score of round.holeScores) {
    const hole = holeByNumber.get(score.holeNumber);
    if (!hole) continue;
    const teamId = teamIdByPlayerId[score.playerId];
    if (!teamId) continue;

    if (score.grossScore === 1) {
      events.push({ roundId, holeNumber: score.holeNumber, playerId: score.playerId, teamId, type: "hole_in_one" });
      continue;
    }
    if (score.netScore <= hole.par - 2) {
      events.push({ roundId, holeNumber: score.holeNumber, playerId: score.playerId, teamId, type: "net_eagle" });
      continue;
    }
    if (score.netScore === hole.par - 1) {
      events.push({ roundId, holeNumber: score.holeNumber, playerId: score.playerId, teamId, type: "net_birdie" });
      continue;
    }
    if (score.netScore === hole.par) {
      const roll = rng();
      if (roll < 0.035) {
        events.push({ roundId, holeNumber: score.holeNumber, playerId: score.playerId, teamId, type: "up_and_down_net_par" });
      } else if (roll < 0.06) {
        events.push({ roundId, holeNumber: score.holeNumber, playerId: score.playerId, teamId, type: "sandy_net_par" });
      } else if (roll < 0.08) {
        events.push({ roundId, holeNumber: score.holeNumber, playerId: score.playerId, teamId, type: "chip_in_net_par" });
      }
    }
  }

  return events;
}

function buildClosestEvents(
  roundId: string,
  round: Pick<Round, "courseHoles">,
  teamIdByPlayerId: Record<string, string>,
  rng: () => number
): ClosestEvent[] {
  const players = Object.keys(teamIdByPlayerId);
  const events: ClosestEvent[] = [];

  for (const hole of round.courseHoles) {
    if (hole.par !== 3) continue;
    if (rng() < 0.2) {
      events.push({ roundId, holeNumber: hole.holeNumber, winnerTeamId: null });
      continue;
    }
    let winnerPlayer = players[0];
    let winnerDistance = Number.POSITIVE_INFINITY;
    for (const playerId of players) {
      const distanceFeet = rng() * 42 + 1;
      if (distanceFeet < winnerDistance) {
        winnerDistance = distanceFeet;
        winnerPlayer = playerId;
      }
    }
    events.push({ roundId, holeNumber: hole.holeNumber, winnerTeamId: teamIdByPlayerId[winnerPlayer] });
  }
  return events;
}

function buildPar5CarryoverEvents(
  roundId: string,
  round: Pick<Round, "courseHoles" | "holeResults">,
  rng: () => number
): Par5CarryoverEvent[] {
  const events: Par5CarryoverEvent[] = [];
  const resultByHole = new Map(round.holeResults.map((result) => [result.holeNumber, result]));
  for (const hole of round.courseHoles) {
    if (hole.par !== 5) continue;
    if (rng() < 0.25) {
      events.push({ roundId, holeNumber: hole.holeNumber, winnerTeamId: null });
      continue;
    }
    const result = resultByHole.get(hole.holeNumber);
    events.push({ roundId, holeNumber: hole.holeNumber, winnerTeamId: result?.winningTeamId ?? null });
  }
  return events;
}

export interface SameHandicapSimulationOptions {
  seed?: number;
  handicap?: number;
  teeBoxId?: string;
  roundId?: string;
  course?: Course;
  playerConfigs?: Array<{
    id: string;
    name: string;
    strokesReceived: number;
    teamId: "teamA" | "teamB";
  }>;
  settings?: Partial<Round["settings"]>;
  doubleGame?: boolean;
}

export interface SimulatedRoundResult {
  round: Round;
  ledger: LedgerEntry[];
  settlement: SettlementResult;
  holeBreakdown: Array<{
    holeNumber: number;
    par: number;
    teamABestNet: number;
    teamBBestNet: number;
    winningTeamId: string | null;
    isHalved: boolean;
    frontStatus: string;
    backStatus: string;
    overallStatus: string;
    pressesCreated: string[];
    pressStatusById: Record<string, string>;
  }>;
}

export function simulateSameHandicapRound(options: SameHandicapSimulationOptions = {}): SimulatedRoundResult {
  const course = options.course ?? createSimplePar72Course();
  const teeBoxId = options.teeBoxId ?? "white";
  const roundId = options.roundId ?? "sim-round-1";
  const handicap = options.handicap ?? 12;
  const rng = createRng(options.seed ?? 42);
  const playerConfigs =
    options.playerConfigs ??
    [
      { id: "p1", name: "Player 1", strokesReceived: handicap, teamId: "teamA" as const },
      { id: "p2", name: "Player 2", strokesReceived: handicap, teamId: "teamA" as const },
      { id: "p3", name: "Player 3", strokesReceived: handicap, teamId: "teamB" as const },
      { id: "p4", name: "Player 4", strokesReceived: handicap, teamId: "teamB" as const }
    ];

  const players: Player[] = playerConfigs.map((item) => ({
    id: item.id,
    name: item.name,
    defaultStrokesReceived: item.strokesReceived,
    lastUsedStrokesReceived: item.strokesReceived
  }));
  const teams: Team[] = [
    {
      id: "teamA",
      name: "Team A",
      playerIds: playerConfigs.filter((item) => item.teamId === "teamA").map((item) => item.id)
    },
    {
      id: "teamB",
      name: "Team B",
      playerIds: playerConfigs.filter((item) => item.teamId === "teamB").map((item) => item.id)
    }
  ];
  const roundPlayers: RoundPlayer[] = playerConfigs.map((item) => ({
    roundId,
    playerId: item.id,
    teamId: item.teamId,
    strokesReceived: item.strokesReceived
  }));
  const teamIdByPlayerId = playerConfigs.reduce<Record<string, string>>((acc, item) => {
    acc[item.id] = item.teamId;
    return acc;
  }, {});
  const pointMultiplier = options.doubleGame ? 2 : 1;
  const settings: Round["settings"] = {
    crazyMode: options.settings?.crazyMode ?? false,
    frontValuePoints: (options.settings?.frontValuePoints ?? 2) * pointMultiplier,
    backValuePoints: (options.settings?.backValuePoints ?? 3) * pointMultiplier,
    overallValuePoints: (options.settings?.overallValuePoints ?? 4) * pointMultiplier,
    pressValuePoints: (options.settings?.pressValuePoints ?? 1) * pointMultiplier,
    autoPressEnabled: options.settings?.autoPressEnabled ?? true,
    junkEnabled: options.settings?.junkEnabled ?? true
  };

  const grossInputs: GrossScoreInput[] = [];
  for (const hole of course.holes) {
    for (const player of playerConfigs) {
      grossInputs.push({
        holeNumber: hole.holeNumber,
        playerId: player.id,
        grossScore: simulateGrossScore(hole.par, hole.handicapIndex, hole.holeNumber, player.teamId, rng)
      });
    }
  }

  const holeScores = calculateNetScores(roundPlayers, course.holes, grossInputs, roundId, {
    handicapMode: course.handicapMode
  });
  const holeResults: Round["holeResults"] = [];
  const holeBreakdown: SimulatedRoundResult["holeBreakdown"] = [];
  let presses: Round["presses"] = [];

  for (const hole of course.holes) {
    const scoresForHole = holeScores.filter((score) => score.holeNumber === hole.holeNumber);
    const result = getHoleWinner(teams[0], teams[1], scoresForHole);
    holeResults.push(result);

    const existingPresses = presses ?? [];
    const withCurrentHole: Round = {
      id: roundId,
      courseId: course.id,
      course,
      teeBoxId,
      players,
      roundPlayers,
      teams,
      courseHoles: course.holes,
      settings,
      status: "active",
      holeScores,
      holeResults: [...holeResults],
      junkEvents: [],
      closestEvents: [],
      par5CarryoverEvents: [],
      presses: existingPresses
    };
    const nextPresses = evaluateAutoPresses(withCurrentHole, hole.holeNumber);
    const createdNow = nextPresses
      .filter((press) => !existingPresses.some((item) => item.id === press.id))
      .map((press) => press.id);
    presses = nextPresses;

    const frontStatus = statusForSide(holeResults, "front");
    const backStatus = statusForSide(holeResults, "back");
    const overallStatus = statusForSide(holeResults, "overall");
    const pressStatusById: Record<string, string> = {};
    for (const press of presses ?? []) {
      if (hole.holeNumber < press.startingHole || hole.holeNumber > press.endingHole) continue;
      const pressStatus = statusForSide(holeResults, { press });
      pressStatusById[press.id] = statusLabel(pressStatus);
    }
    holeBreakdown.push({
      holeNumber: hole.holeNumber,
      par: hole.par,
      teamABestNet: getTeamBestNet(teams[0], scoresForHole),
      teamBBestNet: getTeamBestNet(teams[1], scoresForHole),
      winningTeamId: result.winningTeamId,
      isHalved: result.isHalved,
      frontStatus: statusLabel(frontStatus),
      backStatus: statusLabel(backStatus),
      overallStatus: statusLabel(overallStatus),
      pressesCreated: createdNow,
      pressStatusById
    });
  }

  const junkEvents = buildJunkEvents(roundId, { courseHoles: course.holes, holeScores }, teamIdByPlayerId, rng);
  const closestEvents = buildClosestEvents(roundId, { courseHoles: course.holes }, teamIdByPlayerId, rng);
  const par5CarryoverEvents = buildPar5CarryoverEvents(roundId, { courseHoles: course.holes, holeResults }, rng);

  const round: Round = {
    id: roundId,
    courseId: course.id,
    course,
    teeBoxId,
    players,
    roundPlayers,
    teams,
    courseHoles: course.holes,
    settings,
    status: "complete",
    holeScores,
    holeResults,
    junkEvents,
    closestEvents,
    par5CarryoverEvents,
    presses
  };

  const ledger = calculateLedger(round);
  const settlement = calculateSettlement(ledger, round);
  return { round, ledger, settlement, holeBreakdown };
}
