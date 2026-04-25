import { simulateSameHandicapRound } from "../src";

function getArg(flag: string, fallback: string): string {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

const seed = Number(getArg("--seed", "42"));
const handicap = Number(getArg("--handicap", "12"));
const teeBoxId = getArg("--tee", "white");

const { round, ledger, settlement, holeBreakdown } = simulateSameHandicapRound({
  seed,
  handicap,
  teeBoxId,
  roundId: `sim-${seed}-${handicap}-${teeBoxId}`
});

const teamScores = round.teams.map((team) => {
  const holeWins = round.holeResults.filter((result) => result.winningTeamId === team.id).length;
  return { team, holeWins };
});

console.log(`Round ${round.id}`);
console.log(`Course: ${round.course?.name ?? round.courseId} (${round.teeBoxId ?? "n/a"})`);
const strokesByPlayer = new Map(round.roundPlayers.map((item) => [item.playerId, item.strokesReceived]));
console.log(
  `Players: ${round.players
    .map((player) => `${player.name} (${strokesByPlayer.get(player.id) ?? 0} strokes)`)
    .join(", ")}`
);
console.log("");
console.log("Hole wins:");
for (const row of teamScores) {
  console.log(`- ${row.team.name}: ${row.holeWins}`);
}
console.log("");
console.log("Hole-by-hole:");
const orderedPressIds = [...(round.presses ?? [])]
  .sort((a, b) => a.startingHole - b.startingHole || a.id.localeCompare(b.id))
  .map((press) => press.id);
for (const hole of holeBreakdown) {
  const winner = hole.isHalved ? "HALVED" : hole.winningTeamId ?? "none";
  const pressStates = orderedPressIds.length
    ? orderedPressIds
        .map((pressId, idx) => {
          const status = hole.pressStatusById[pressId] ?? "-";
          const started = hole.pressesCreated.includes(pressId) ? " (start)" : "";
          return `P${idx + 1} ${status}${started}`;
        })
        .join(" | ")
    : "no active presses";
  console.log(
    `- H${hole.holeNumber} (Par ${hole.par}) | A net ${hole.teamABestNet} vs B net ${hole.teamBBestNet} | winner ${winner} | front ${hole.frontStatus} | back ${hole.backStatus} | overall ${hole.overallStatus} | ${pressStates}`
  );
}
console.log("");
console.log("Ledger entries:");
for (const entry of ledger) {
  console.log(
    `- hole ${entry.holeNumber ?? "-"} | ${entry.type} | ${entry.teamId} | +${entry.points} | ${entry.description}`
  );
}
console.log("");
console.log("Simulated event counts:");
console.log(`- junk events: ${round.junkEvents.length}`);
console.log(`- closest-to-pin events (par 3): ${round.closestEvents.length}`);
console.log(`- par-5 carryover events: ${round.par5CarryoverEvents.length}`);
console.log(`- auto-presses created: ${round.presses?.length ?? 0}`);
console.log("");
console.log("Settlement by team:");
for (const [teamId, points] of Object.entries(settlement.byTeam)) {
  console.log(`- ${teamId}: ${points}`);
}
console.log("");
console.log("Settlement by player:");
for (const [playerId, points] of Object.entries(settlement.byPlayer)) {
  console.log(`- ${playerId}: ${points}`);
}
