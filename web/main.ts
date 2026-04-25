import { createSimplePar72Course, simulateSameHandicapRound } from "../src";

const seedInput = document.querySelector<HTMLInputElement>("#seed");
const handicapInput = document.querySelector<HTMLInputElement>("#handicap");
const teeBoxSelect = document.querySelector<HTMLSelectElement>("#teeBox");
const simulateBtn = document.querySelector<HTMLButtonElement>("#simulateBtn");
const holeHeaderRowEl = document.querySelector<HTMLElement>("#holeHeaderRow");
const summaryEl = document.querySelector<HTMLElement>("#summary");
const holeRowsEl = document.querySelector<HTMLElement>("#holeRows");
const courseRowsEl = document.querySelector<HTMLElement>("#courseRows");
const ledgerRowsEl = document.querySelector<HTMLElement>("#ledgerRows");
const settlementEl = document.querySelector<HTMLElement>("#settlement");

if (
  !seedInput ||
  !handicapInput ||
  !teeBoxSelect ||
  !simulateBtn ||
  !holeHeaderRowEl ||
  !summaryEl ||
  !holeRowsEl ||
  !courseRowsEl ||
  !ledgerRowsEl ||
  !settlementEl
) {
  throw new Error("Missing required DOM elements");
}

const course = createSimplePar72Course();
for (const teeBox of course.teeBoxes) {
  const option = document.createElement("option");
  option.value = teeBox.id;
  option.textContent = `${teeBox.name} (Rating ${teeBox.courseRating}, Slope ${teeBox.slope})`;
  teeBoxSelect.append(option);
}
teeBoxSelect.value = "white";

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderSimulation() {
  const seed = Number(seedInput.value || "42");
  const handicap = Number(handicapInput.value || "12");
  const teeBoxId = teeBoxSelect.value;
  const teeBox = course.teeBoxes.find((item) => item.id === teeBoxId);

  const { round, ledger, settlement, holeBreakdown } = simulateSameHandicapRound({
    seed,
    handicap,
    teeBoxId,
    course,
    roundId: `sim-${seed}-${handicap}-${teeBoxId}`
  });

  const halvedHoles = round.holeResults.filter((hole) => hole.isHalved).length;
  const teamAHoleWins = round.holeResults.filter((hole) => hole.winningTeamId === "teamA").length;
  const teamBHoleWins = round.holeResults.filter((hole) => hole.winningTeamId === "teamB").length;
  const junkPoints = ledger.filter((entry) => entry.type === "junk" || entry.type === "hole_in_one").reduce((sum, entry) => sum + entry.points, 0);
  const cpPoints = ledger.filter((entry) => entry.type === "closest_par3").reduce((sum, entry) => sum + entry.points, 0);
  const pressPoints = ledger.filter((entry) => entry.type === "press_win").reduce((sum, entry) => sum + entry.points, 0);
  summaryEl.innerHTML = `
    <div><strong>Course:</strong> ${escapeHtml(course.name)} (${escapeHtml(teeBox?.name ?? teeBoxId)})</div>
    <div><strong>Par Total:</strong> ${course.parTotal}</div>
    <div><strong>Hole Wins:</strong> Team A ${teamAHoleWins}, Team B ${teamBHoleWins}, Halved ${halvedHoles}</div>
    <div><strong>Sim Events:</strong> Junk ${round.junkEvents.length}, CP ${round.closestEvents.length}, Par5 Carryover ${round.par5CarryoverEvents.length}, Auto Presses ${round.presses?.length ?? 0}</div>
    <div><strong>Ledger Points:</strong> Junk ${junkPoints}, CP ${cpPoints}, Press ${pressPoints}</div>
    <div><strong>Players:</strong> ${round.players.map((player) => `${player.name} (${player.handicap})`).join(", ")}</div>
  `;

  const pressIds = [...(round.presses ?? [])]
    .sort((a, b) => a.startingHole - b.startingHole || a.id.localeCompare(b.id))
    .map((press) => press.id);
  const pressHeaderCells = pressIds.map((_, idx) => `<th>Press ${idx + 1}</th>`).join("");
  holeHeaderRowEl.innerHTML = `
    <th>Hole</th>
    <th>Par</th>
    <th>A Net</th>
    <th>B Net</th>
    <th>Winner</th>
    <th>Front</th>
    <th>Back</th>
    <th>Overall</th>
    ${pressHeaderCells}
  `;

  holeRowsEl.innerHTML = holeBreakdown
    .map((hole) => {
      const winner = hole.isHalved ? "HALVED" : hole.winningTeamId ?? "-";
      const pressCells = pressIds
        .map((pressId) => {
          const status = hole.pressStatusById[pressId] ?? "-";
          const started = hole.pressesCreated.includes(pressId) ? " (start)" : "";
          return `<td>${escapeHtml(`${status}${started}`)}</td>`;
        })
        .join("");
      return `<tr><td>${hole.holeNumber}</td><td>${hole.par}</td><td>${hole.teamABestNet}</td><td>${hole.teamBBestNet}</td><td>${winner}</td><td>${hole.frontStatus}</td><td>${hole.backStatus}</td><td>${hole.overallStatus}</td>${pressCells}</tr>`;
    })
    .join("");

  courseRowsEl.innerHTML = course.holes
    .map((hole) => {
      const yardage = hole.yardageByTeeBox?.[teeBoxId] ?? "-";
      return `<tr><td>${hole.holeNumber}</td><td>${hole.par}</td><td>${hole.handicapIndex}</td><td>${yardage}</td></tr>`;
    })
    .join("");

  ledgerRowsEl.innerHTML = ledger.length
    ? ledger
        .map(
          (entry) =>
            `<tr><td>${entry.holeNumber ?? "-"}</td><td>${entry.type}</td><td>${entry.teamId}</td><td>+${entry.points}</td><td>${escapeHtml(entry.description)}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="5">No ledger entries for this simulation.</td></tr>`;

  const byTeamHtml = Object.entries(settlement.byTeam)
    .map(([teamId, points]) => `<li>${teamId}: ${points}</li>`)
    .join("");
  const byPlayerHtml = Object.entries(settlement.byPlayer)
    .map(([playerId, points]) => `<li>${playerId}: ${points}</li>`)
    .join("");
  settlementEl.innerHTML = `
    <div class="settlement-grid">
      <div>
        <h3>By Team</h3>
        <ul>${byTeamHtml}</ul>
      </div>
      <div>
        <h3>By Player</h3>
        <ul>${byPlayerHtml}</ul>
      </div>
    </div>
  `;
}

simulateBtn.addEventListener("click", renderSimulation);
renderSimulation();
