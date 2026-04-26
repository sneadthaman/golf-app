import { describe, expect, test } from "vitest";
import {
  calculateLedger,
  calculateNetScores,
  calculateSettlement,
  evaluateAutoPresses,
  evaluateClosestCarryovers,
  evaluateJunkEvents,
  evaluateMainBets,
  evaluatePresses,
  getHoleWinner,
  createSimplePar72Course,
  simulateSameHandicapRound,
  Round,
  Team
} from "../src";

const teamA: Team = { id: "teamA", name: "Team A", playerIds: ["p1", "p2"] };
const teamB: Team = { id: "teamB", name: "Team B", playerIds: ["p3", "p4"] };

const players = [
  { id: "p1", name: "P1", defaultStrokesReceived: 10, lastUsedStrokesReceived: 10 },
  { id: "p2", name: "P2", defaultStrokesReceived: 14, lastUsedStrokesReceived: 14 },
  { id: "p3", name: "P3", defaultStrokesReceived: 8, lastUsedStrokesReceived: 8 },
  { id: "p4", name: "P4", defaultStrokesReceived: 12, lastUsedStrokesReceived: 12 }
];
const roundPlayers = [
  { roundId: "r1", playerId: "p1", teamId: "teamA", strokesReceived: 10 },
  { roundId: "r1", playerId: "p2", teamId: "teamA", strokesReceived: 14 },
  { roundId: "r1", playerId: "p3", teamId: "teamB", strokesReceived: 8 },
  { roundId: "r1", playerId: "p4", teamId: "teamB", strokesReceived: 12 }
];

function buildCourseHoles() {
  return Array.from({ length: 18 }).map((_, idx) => {
    const holeNumber = idx + 1;
    const par3Holes = new Set([3, 7, 12, 16]);
    const par5Holes = new Set([5, 9, 13, 18]);
    const par = par3Holes.has(holeNumber) ? 3 : par5Holes.has(holeNumber) ? 5 : 4;
    return { holeNumber, par, handicapIndex: holeNumber };
  });
}

function buildHoleResults(winByHole: Record<number, "A" | "B" | "H">, roundId = "r1") {
  return Array.from({ length: 18 }).map((_, idx) => {
    const holeNumber = idx + 1;
    const winner = winByHole[holeNumber] ?? "H";
    if (winner === "A") {
      return {
        roundId,
        holeNumber,
        winningTeamId: teamA.id,
        losingTeamId: teamB.id,
        isHalved: false
      };
    }
    if (winner === "B") {
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
  });
}

function baseRound(overrides?: Partial<Round>): Round {
  return {
    id: "r1",
    courseId: "course1",
    players,
    roundPlayers,
    teams: [teamA, teamB],
    courseHoles: buildCourseHoles(),
    settings: {
      crazyMode: false,
      frontValuePoints: 2,
      backValuePoints: 3,
      overallValuePoints: 4,
      pressValuePoints: 1,
      autoPressEnabled: true,
      junkEnabled: true
    },
    status: "active",
    holeScores: [],
    holeResults: buildHoleResults({}),
    junkEvents: [],
    closestEvents: [],
    par5CarryoverEvents: [],
    presses: [],
    ...overrides
  };
}

describe("engine primitives", () => {
  test("calculateNetScores assigns strokes by handicap index", () => {
    const holes = buildCourseHoles();
    const scores = calculateNetScores(
      [
        { roundId: "r1", playerId: "p1", teamId: "teamA", strokesReceived: 20 },
        { roundId: "r1", playerId: "p2", teamId: "teamB", strokesReceived: 5 }
      ],
      holes,
      [
        { holeNumber: 1, playerId: "p1", grossScore: 5 },
        { holeNumber: 1, playerId: "p2", grossScore: 5 }
      ],
      "r1"
    );
    const p1 = scores.find((score) => score.playerId === "p1");
    const p2 = scores.find((score) => score.playerId === "p2");
    expect(p1?.strokesReceived).toBe(2);
    expect(p1?.netScore).toBe(3);
    expect(p2?.strokesReceived).toBe(1);
    expect(p2?.netScore).toBe(4);
  });

  test("calculateNetScores splits strokes across nines for replayed 9-hole ranking", () => {
    const replayHoles = Array.from({ length: 18 }).map((_, idx) => ({
      holeNumber: idx + 1,
      par: 4,
      handicapIndex: (idx % 9) + 1
    }));
    const scores = calculateNetScores(
      [{ roundId: "r1", playerId: "p1", teamId: "teamA", strokesReceived: 5 }],
      replayHoles,
      Array.from({ length: 18 }).map((_, idx) => ({
        holeNumber: idx + 1,
        playerId: "p1",
        grossScore: 4
      })),
      "r1",
      { handicapMode: "split9_replay" }
    );
    const frontStrokes = scores.filter((score) => score.holeNumber <= 9).reduce((sum, score) => sum + score.strokesReceived, 0);
    const backStrokes = scores.filter((score) => score.holeNumber >= 10).reduce((sum, score) => sum + score.strokesReceived, 0);
    expect(frontStrokes).toBe(3);
    expect(backStrokes).toBe(2);
  });

  test("getHoleWinner supports best-ball comparison", () => {
    const result = getHoleWinner(teamA, teamB, [
      { roundId: "r1", holeNumber: 1, playerId: "p1", grossScore: 5, netScore: 4, strokesReceived: 1 },
      { roundId: "r1", holeNumber: 1, playerId: "p2", grossScore: 6, netScore: 5, strokesReceived: 1 },
      { roundId: "r1", holeNumber: 1, playerId: "p3", grossScore: 5, netScore: 5, strokesReceived: 0 },
      { roundId: "r1", holeNumber: 1, playerId: "p4", grossScore: 6, netScore: 6, strokesReceived: 0 }
    ]);
    expect(result.winningTeamId).toBe(teamA.id);
  });
});

describe("nassau scenarios", () => {
  test("1) Front 9 tie awards no front points", () => {
    const round = baseRound({
      holeResults: buildHoleResults({
        1: "A",
        2: "B",
        3: "A",
        4: "B",
        5: "A",
        6: "B",
        7: "A",
        8: "B"
      })
    });
    const entries = evaluateMainBets(round);
    expect(entries.find((entry) => entry.type === "front_win")).toBeUndefined();
  });

  test("2) Crazy Mode doubles front/back/overall only", () => {
    const round = baseRound({
      settings: {
        ...baseRound().settings,
        crazyMode: true
      },
      holeResults: buildHoleResults({
        1: "A",
        2: "A",
        3: "A",
        5: "A",
        10: "A",
        11: "A",
        12: "A"
      }),
      junkEvents: [{ roundId: "r1", holeNumber: 2, playerId: "p1", teamId: "teamA", type: "net_birdie" }],
      presses: [
        {
          id: "press-1",
          roundId: "r1",
          side: "front",
          startingHole: 5,
          endingHole: 9,
          teamThatWasDown: "teamB",
          valuePoints: 1,
          createdBy: "auto",
          triggerHole: 4,
          status: "active"
        }
      ]
    });
    const ledger = calculateLedger(round);
    const front = ledger.find((entry) => entry.type === "front_win");
    const back = ledger.find((entry) => entry.type === "back_win");
    const overall = ledger.find((entry) => entry.type === "overall_win");
    const junk = ledger.find((entry) => entry.type === "junk");
    const press = ledger.find((entry) => entry.type === "press_win");

    expect(front?.points).toBe(4);
    expect(back?.points).toBe(6);
    expect(overall?.points).toBe(8);
    expect(junk?.points).toBe(1);
    expect(press?.points).toBe(1);
  });

  test("3) Net Eagle awards 3 points", () => {
    const entries = evaluateJunkEvents([
      { roundId: "r1", holeNumber: 5, playerId: "p1", teamId: "teamA", type: "net_eagle" }
    ]);
    expect(entries[0].points).toBe(3);
  });

  test("4) Hole in One awards 10 points", () => {
    const entries = evaluateJunkEvents([
      { roundId: "r1", holeNumber: 7, playerId: "p2", teamId: "teamA", type: "hole_in_one" }
    ]);
    expect(entries[0].points).toBe(10);
    expect(entries[0].type).toBe("hole_in_one");
  });

  test("5) Par 3 closest carryover increments and resets", () => {
    const result = evaluateClosestCarryovers({
      roundId: "r1",
      courseHoles: buildCourseHoles(),
      teamIdByPlayerId: new Map([
        ["p1", "teamA"],
        ["p2", "teamA"],
        ["p3", "teamB"],
        ["p4", "teamB"]
      ]),
      closestEvents: [
        { roundId: "r1", holeNumber: 3, winnerPlayerId: null },
        { roundId: "r1", holeNumber: 7, winnerPlayerId: "p1" }
      ],
      par5CarryoverEvents: []
    });
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].points).toBe(2);
    expect(result.state.par3ClosestBank).toBe(1);
  });

  test("6) Par 5 carryover increments independently of Par 3", () => {
    const result = evaluateClosestCarryovers({
      roundId: "r1",
      courseHoles: buildCourseHoles(),
      teamIdByPlayerId: new Map([
        ["p1", "teamA"],
        ["p2", "teamA"],
        ["p3", "teamB"],
        ["p4", "teamB"]
      ]),
      closestEvents: [{ roundId: "r1", holeNumber: 3, winnerPlayerId: null }],
      par5CarryoverEvents: [
        { roundId: "r1", holeNumber: 5, winnerPlayerId: null },
        { roundId: "r1", holeNumber: 9, winnerPlayerId: "p3" }
      ]
    });
    const par5 = result.entries.find((entry) => entry.type === "par5_carryover");
    expect(par5?.points).toBe(2);
    expect(result.state.par5Bank).toBe(1);
    expect(result.state.par3ClosestBank).toBe(2);
  });

  test("7) Auto press creates front-side press when side reaches 2-up", () => {
    const round = baseRound({
      holeResults: buildHoleResults({
        1: "A",
        2: "B",
        3: "A",
        4: "A"
      })
    });
    const presses = evaluateAutoPresses(round, 4);
    expect(presses).toHaveLength(1);
    expect(presses[0].side).toBe("front");
    expect(presses[0].startingHole).toBe(5);
    expect(presses[0].endingHole).toBe(9);
    expect(presses[0].teamThatWasDown).toBe("teamB");
    expect(presses[0].valuePoints).toBe(1);
  });

  test("8) Multiple presses can coexist and score independently", () => {
    let round = baseRound({
      holeResults: buildHoleResults({
        1: "A",
        2: "A",
        3: "H",
        4: "H",
        5: "B",
        6: "A",
        7: "A",
        8: "B",
        9: "A"
      }),
      presses: []
    });

    round = { ...round, presses: evaluateAutoPresses(round, 2) };
    round = { ...round, presses: evaluateAutoPresses(round, 6) };

    expect(round.presses).toHaveLength(2);
    const pressEntries = evaluatePresses(round);
    expect(pressEntries).toHaveLength(2);
    expect(pressEntries.every((entry) => entry.points === 1)).toBe(true);
  });

  test("press can spawn from a press when that press reaches 2-up", () => {
    let round = baseRound({
      holeResults: buildHoleResults({
        1: "A",
        2: "A",
        3: "B",
        4: "B"
      }),
      presses: []
    });

    round = { ...round, presses: evaluateAutoPresses(round, 2) };
    expect(round.presses).toHaveLength(1);
    expect(round.presses?.[0].startingHole).toBe(3);
    expect(round.presses?.[0].teamThatWasDown).toBe("teamB");

    round = { ...round, presses: evaluateAutoPresses(round, 3) };
    expect(round.presses).toHaveLength(1);

    round = { ...round, presses: evaluateAutoPresses(round, 4) };
    expect(round.presses).toHaveLength(2);
    const nestedPress = round.presses?.[1];
    expect(nestedPress?.startingHole).toBe(5);
    expect(nestedPress?.endingHole).toBe(9);
    expect(nestedPress?.teamThatWasDown).toBe("teamA");
    expect(nestedPress?.sourceMatchId).toBe(round.presses?.[0].id);
  });

  test("9) Front press does not continue into hole 10", () => {
    const round = baseRound({
      holeResults: buildHoleResults({
        8: "A",
        9: "H",
        10: "A"
      }),
      presses: [
        {
          id: "front-press",
          roundId: "r1",
          side: "front",
          startingHole: 8,
          endingHole: 9,
          teamThatWasDown: "teamB",
          valuePoints: 1,
          createdBy: "auto",
          triggerHole: 7,
          status: "active"
        }
      ]
    });
    const pressEntries = evaluatePresses(round);
    expect(pressEntries).toHaveLength(1);
    expect(pressEntries[0].holeNumber).toBe(9);
  });

  test("10) Overall is separate from front/back and spans all 18", () => {
    const round = baseRound({
      holeResults: buildHoleResults({
        1: "A",
        3: "A",
        5: "A",
        10: "B",
        12: "B"
      })
    });
    const entries = evaluateMainBets(round);
    const front = entries.find((entry) => entry.type === "front_win");
    const back = entries.find((entry) => entry.type === "back_win");
    const overall = entries.find((entry) => entry.type === "overall_win");
    expect(front?.teamId).toBe("teamA");
    expect(back?.teamId).toBe("teamB");
    expect(overall?.teamId).toBe("teamA");
  });
});

describe("ledger and settlement determinism", () => {
  test("calculateLedger is deterministic and calculateSettlement aggregates", () => {
    const round = baseRound({
      holeResults: buildHoleResults({ 1: "A", 2: "A", 3: "A", 10: "B" }),
      junkEvents: [{ roundId: "r1", holeNumber: 2, playerId: "p1", teamId: "teamA", type: "net_birdie" }]
    });
    const ledgerA = calculateLedger(round);
    const ledgerB = calculateLedger(round);
    expect(ledgerA).toEqual(ledgerB);

    const settlement = calculateSettlement(ledgerA, round);
    expect(settlement.byTeam.teamA).toBeGreaterThan(0);
    expect(settlement.byPlayer.p1).toBeGreaterThan(0);
  });
});

describe("course fixtures and simulation", () => {
  test("simple par-72 course includes hole difficulty, tee boxes, rating, and slope", () => {
    const course = createSimplePar72Course();
    expect(course.holes).toHaveLength(18);
    expect(course.parTotal).toBe(72);
    expect(course.teeBoxes).toHaveLength(3);
    expect(course.teeBoxes.every((tee) => tee.courseRating > 0 && tee.slope > 0)).toBe(true);

    const handicapIndexes = course.holes.map((hole) => hole.handicapIndex).sort((a, b) => a - b);
    expect(handicapIndexes).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
  });

  test("simulateSameHandicapRound creates deterministic 4-player baseline", () => {
    const simulationA = simulateSameHandicapRound({ seed: 1234, handicap: 10, teeBoxId: "white", roundId: "sim-a" });
    const simulationB = simulateSameHandicapRound({ seed: 1234, handicap: 10, teeBoxId: "white", roundId: "sim-a" });

    expect(simulationA.round.players).toHaveLength(4);
    expect(new Set(simulationA.round.roundPlayers.map((item) => item.strokesReceived))).toEqual(new Set([10]));
    expect(simulationA.round.holeScores).toHaveLength(72);
    expect(simulationA.round.holeResults).toHaveLength(18);
    expect(simulationA.holeBreakdown).toHaveLength(18);
    expect(simulationA.round.course?.parTotal).toBe(72);
    expect(simulationA.round.teeBoxId).toBe("white");
    expect(simulationA.round.closestEvents).toHaveLength(4);
    expect(simulationA.round.par5CarryoverEvents).toHaveLength(4);
    expect(simulationA.holeBreakdown[0].overallStatus.length).toBeGreaterThan(0);
    expect(typeof simulationA.holeBreakdown[0].pressStatusById).toBe("object");

    expect(simulationA.ledger).toEqual(simulationB.ledger);
    expect(simulationA.settlement).toEqual(simulationB.settlement);
    expect(simulationA.holeBreakdown).toEqual(simulationB.holeBreakdown);
    expect(simulationA.round.presses).toEqual(simulationB.round.presses);
  });
});
