import { expect, test } from "@playwright/test";

type SnapshotRow = {
  round_id: string;
  status: string;
  round_metadata: Record<string, unknown>;
  players: Array<Record<string, unknown>>;
  teams: Array<Record<string, unknown>>;
  hole_scores: Array<Record<string, unknown>>;
  junk_events: Array<Record<string, unknown>>;
  closest_events_par3: Array<Record<string, unknown>>;
  closest_events_par5: Array<Record<string, unknown>>;
  presses: Array<Record<string, unknown>>;
  final_ledger: Array<Record<string, unknown>>;
  updated_at: string;
};

function parseRequestBody(requestBody: string | null): Array<Record<string, unknown>> {
  if (!requestBody) return [];
  const parsed = JSON.parse(requestBody) as unknown;
  if (Array.isArray(parsed)) return parsed as Array<Record<string, unknown>>;
  if (typeof parsed === "object" && parsed !== null) return [parsed as Record<string, unknown>];
  return [];
}

function makeUuid(seed: number): string {
  const hex = seed.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex.slice(-12)}`;
}

test.describe("Web UI flow", () => {
  test("search -> load selected -> saves recent", async ({ page }) => {
    await page.goto("/");

    await page.fill("#courseQuery", "simple");
    await page.click("#searchCourseBtn");

    await expect(page.locator("#courseStatus")).toContainText("Found 1 course(s)");
    await expect(page.locator("#courseResults option")).toContainText("Simple Par 72");

    await page.click("#loadCourseBtn");
    await expect(page.locator("#recentCourses option")).toContainText("Simple Par 72");
    await expect(page.locator("#summary")).toContainText("Simple Par 72");

    await page.fill("#seed", "99");
    await page.fill("#handicap", "8");
    await page.click("#simulateBtn");
    await expect(page.locator("#settlement")).toContainText("By Team");
    await expect(page.locator("#holeRows tr")).toHaveCount(18);
  });

  test("recent courses persist across reload", async ({ page }) => {
    await page.goto("/");

    await page.fill("#courseQuery", "simple");
    await page.click("#searchCourseBtn");
    await page.click("#loadCourseBtn");
    await expect(page.locator("#recentCourses option")).toContainText("Simple Par 72");

    await page.reload();
    await expect(page.locator("#recentCourses option")).toContainText("Simple Par 72");
  });

  test("no-results search shows clear error state", async ({ page }) => {
    await page.goto("/");

    await page.fill("#courseQuery", "this-course-does-not-exist");
    await page.click("#searchCourseBtn");

    await expect(page.locator("#courseStatus")).toContainText("No courses found");
    await expect(page.locator("#courseStatus")).toHaveClass(/error/);
    await expect(page.locator("#courseResults option")).toContainText("No results");
  });

  test("load more appends additional search results", async ({ page }) => {
    await page.goto("/");

    await page.fill("#courseQuery", "demo");
    await page.click("#searchCourseBtn");

    await expect(page.locator("#courseStatus")).toContainText("Tap Load More");
    await expect(page.locator("#courseResults option")).toHaveCount(8);
    await expect(page.locator("#loadMoreBtn")).toBeEnabled();

    await page.click("#loadMoreBtn");
    await expect(page.locator("#courseResults option")).toHaveCount(15);
  });

  test("simulation controls persist across reload", async ({ page }) => {
    await page.goto("/");

    await page.fill("#seed", "123");
    await page.fill("#handicap", "7");
    await page.selectOption("#teeBox", "gold");
    await page.click("#simulateBtn");

    await page.reload();

    await expect(page.locator("#seed")).toHaveValue("123");
    await expect(page.locator("#handicap")).toHaveValue("7");
    await expect(page.locator("#teeBox")).toHaveValue("gold");
  });

  test("manual junk entry updates running ledger", async ({ page }) => {
    await page.goto("/");

    await page.selectOption("#junkHole", "1");
    await page.selectOption("#junkPlayer", "p1");
    await page.selectOption("#junkType", "net_birdie");
    await page.click("#addJunkBtn");

    await expect(page.locator("#junkRows")).toContainText("net_birdie");
    await expect(page.locator("#ledgerRows")).toContainText("junk");
    await expect(page.locator("#ledgerRows")).toContainText("net_birdie on hole 1");
  });

  test("manual closest-to-pin entries update par3 and par5 tracks independently", async ({ page }) => {
    await page.goto("/");

    await page.selectOption("#closestTrack", "par3");
    await page.selectOption("#closestHole", "3");
    await page.selectOption("#closestWinner", { index: 1 });
    await page.click("#addClosestBtn");

    await page.selectOption("#closestTrack", "par5");
    await page.selectOption("#closestHole", "5");
    await page.selectOption("#closestWinner", { index: 2 });
    await page.click("#addClosestBtn");

    await expect(page.locator("#closestRows")).toContainText("PAR3");
    await expect(page.locator("#closestRows")).toContainText("PAR5");
    await expect(page.locator("#ledgerRows")).toContainText("closest_par3");
    await expect(page.locator("#ledgerRows")).toContainText("par5_carryover");
  });

  test("assign existing player -> save/load round -> season leaderboard crown", async ({ page }) => {
    const players = [
      { id: "11111111-1111-4111-8111-111111111111", display_name: "Sam Janvey" },
      { id: "22222222-2222-4222-8222-222222222222", display_name: "Chris Klein" }
    ];
    const snapshots: SnapshotRow[] = [];
    let nextId = 1;
    const playerUuidByExternal = new Map<string, string>();
    const teamUuidByRoundAndExternal = new Map<string, string>();
    const roundUuidByExternal = new Map<string, string>();

    await page.route("**/rest/v1/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const method = request.method();
      const path = url.pathname;
      const table = path.split("/").pop() ?? "";
      const select = url.searchParams.get("select") ?? "";
      const normalizedSelect = select.replace(/\s/g, "");
      const body = parseRequestBody(request.postData());
      const json = (value: unknown, status = 200) =>
        route.fulfill({ status, contentType: "application/json", body: JSON.stringify(value) });

      if (table === "players" && method === "GET") {
        const query =
          (url.searchParams.get("display_name") ??
            url.searchParams.get("or") ??
            "").toLowerCase();
        const cleaned = query
          .replace(/^ilike\./, "")
          .replace(/\*/g, "")
          .replace(/%/g, "")
          .replace(/^\./, "")
          .replace(/display_name\.ilike\./g, "")
          .replace(/first_name\.ilike\./g, "")
          .replace(/last_name\.ilike\./g, "")
          .replace(/,/g, " ")
          .trim();
        if (!cleaned) return json(players);
        const tokens = cleaned.split(/\s+/).filter(Boolean);
        const matches = players.filter((player) => {
          const haystack = player.display_name.toLowerCase();
          return tokens.some((token) => haystack.includes(token));
        });
        return json(matches);
      }

      if (table === "round_snapshots" && method === "POST") {
        for (const row of body) {
          const roundId = typeof row.round_id === "string" ? row.round_id : "";
          if (!roundId) continue;
          const idx = snapshots.findIndex((item) => item.round_id === roundId);
          const next: SnapshotRow = {
            round_id: roundId,
            status: typeof row.status === "string" ? row.status : "active",
            round_metadata: (row.round_metadata ?? {}) as Record<string, unknown>,
            players: (row.players ?? []) as Array<Record<string, unknown>>,
            teams: (row.teams ?? []) as Array<Record<string, unknown>>,
            hole_scores: (row.hole_scores ?? []) as Array<Record<string, unknown>>,
            junk_events: (row.junk_events ?? []) as Array<Record<string, unknown>>,
            closest_events_par3: (row.closest_events_par3 ?? []) as Array<Record<string, unknown>>,
            closest_events_par5: (row.closest_events_par5 ?? []) as Array<Record<string, unknown>>,
            presses: (row.presses ?? []) as Array<Record<string, unknown>>,
            final_ledger: (row.final_ledger ?? []) as Array<Record<string, unknown>>,
            updated_at: new Date().toISOString()
          };
          if (idx >= 0) snapshots[idx] = next;
          else snapshots.push(next);
        }
        return json([]);
      }

      if (table === "round_snapshots" && method === "GET") {
        const roundFilter = url.searchParams.get("round_id");
        if (roundFilter?.startsWith("eq.")) {
          const target = roundFilter.slice(3);
          const row = snapshots.find((item) => item.round_id === target);
          return json(row ?? {}, row ? 200 : 404);
        }
        if (select.includes("round_id,status,round_metadata,players,hole_scores,updated_at")) {
          return json(
            snapshots.map((row) => ({
              round_id: row.round_id,
              status: row.status,
              round_metadata: row.round_metadata,
              players: row.players,
              hole_scores: row.hole_scores,
              updated_at: row.updated_at
            }))
          );
        }
        if (select.includes("round_metadata,players,final_ledger")) {
          return json(
            snapshots.map((row) => ({
              round_metadata: row.round_metadata,
              players: row.players,
              final_ledger: row.final_ledger
            }))
          );
        }
        return json(snapshots);
      }

      if (table === "rounds" && method === "POST") {
        const row = body[0] ?? {};
        const externalRoundRef = typeof row.external_round_ref === "string" ? row.external_round_ref : "";
        if (externalRoundRef && !roundUuidByExternal.has(externalRoundRef)) {
          roundUuidByExternal.set(externalRoundRef, makeUuid(nextId++));
        }
        return json({ id: roundUuidByExternal.get(externalRoundRef) ?? makeUuid(nextId++) });
      }

      if (table === "players" && method === "POST") {
        if (normalizedSelect.includes("id,external_player_ref")) {
          return json(
            body.map((row) => {
              const externalRef = typeof row.external_player_ref === "string" ? row.external_player_ref : "";
              let id = externalRef && playerUuidByExternal.get(externalRef);
              if (!id) {
                id =
                  externalRef && /^[0-9a-f-]{36}$/i.test(externalRef)
                    ? externalRef
                    : makeUuid(nextId++);
              }
              if (externalRef) playerUuidByExternal.set(externalRef, id);
              return { id, external_player_ref: externalRef };
            })
          );
        }
        if (normalizedSelect.includes("id,first_name,last_name")) {
          return json(
            body.map((row) => {
              const firstName = String(row.first_name ?? "");
              const lastName = String(row.last_name ?? "");
              const key = `${firstName}::${lastName}`;
              let id = playerUuidByExternal.get(key);
              if (!id) {
                id = makeUuid(nextId++);
                playerUuidByExternal.set(key, id);
              }
              return { id, first_name: firstName, last_name: lastName };
            })
          );
        }
        if (normalizedSelect.includes("id")) {
          return json(
            body.map((row) => ({
              id:
                (typeof row.id === "string" && row.id) ||
                makeUuid(nextId++)
            }))
          );
        }
        return json([]);
      }

      if (table === "round_teams" && method === "POST") {
        if (normalizedSelect.includes("id,external_team_ref")) {
          return json(
            body.map((row) => {
              const roundId = String(row.round_id ?? "");
              const externalTeamRef = String(row.external_team_ref ?? "");
              const key = `${roundId}:${externalTeamRef}`;
              if (!teamUuidByRoundAndExternal.has(key)) {
                teamUuidByRoundAndExternal.set(key, makeUuid(nextId++));
              }
              return {
                id: teamUuidByRoundAndExternal.get(key),
                external_team_ref: externalTeamRef
              };
            })
          );
        }
        return json([]);
      }

      if (method === "DELETE") {
        return json([]);
      }

      if (method === "POST") {
        return json([]);
      }

      return json([]);
    });

    await page.goto("/");

    await page.fill("#playerQuery", "Sam");
    await page.click("#searchPlayerBtn");
    await expect(page.locator("#playerStatus")).toContainText("Found");
    await page.selectOption("#playerResults", "11111111-1111-4111-8111-111111111111");
    await page.selectOption("#assignPlayerSlot", "0");
    await page.click("#assignPlayerBtn");
    await expect(page.locator("#player1Name")).toHaveValue("Sam Janvey");

    await page.fill('input[data-hole="1"][data-player="11111111-1111-4111-8111-111111111111"]', "4");
    await page.fill('input[data-hole="1"][data-player="p2"]', "5");
    await page.fill('input[data-hole="1"][data-player="p3"]', "5");
    await page.fill('input[data-hole="1"][data-player="p4"]', "6");

    await page.selectOption("#junkHole", "1");
    await page.selectOption("#junkPlayer", "11111111-1111-4111-8111-111111111111");
    await page.selectOption("#junkType", "net_birdie");
    await page.click("#addJunkBtn");

    await page.selectOption("#closestTrack", "par3");
    await page.selectOption("#closestHole", "3");
    await page.selectOption("#closestWinner", "11111111-1111-4111-8111-111111111111");
    await page.click("#addClosestBtn");

    await page.click("#saveRoundBtn");
    await expect(page.locator("#saveStatus")).toContainText("Saved round");
    await expect(page.locator("#savedRounds option")).toHaveCount(1);

    await page.reload();
    await expect(page.locator("#savedRounds option")).toHaveCount(1);
    await page.click("#loadSavedRoundBtn");
    await expect(page.locator("#savedRoundsStatus")).toContainText("Loaded saved round");

    await expect(
      page.locator('input[data-hole="1"][data-player="11111111-1111-4111-8111-111111111111"]')
    ).toHaveValue("4");
    await expect(page.locator("#seasonLeaderboardRows")).toContainText("Sam Janvey");
    await expect(page.locator("#seasonLeaderboardRows")).toContainText("👑");
  });
});
