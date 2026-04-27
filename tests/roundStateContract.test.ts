import { beforeEach, describe, expect, test, vi } from "vitest";

type SnapshotRow = Record<string, unknown>;

const snapshotRows = new Map<string, SnapshotRow>();
const upsertedRows: SnapshotRow[] = [];

const mockClient = {
  from(table: string) {
    if (table !== "round_snapshots") {
      throw new Error(`Unexpected table in test mock: ${table}`);
    }

    return {
      async upsert(row: SnapshotRow) {
        const roundId = typeof row.round_id === "string" ? row.round_id : "";
        if (!roundId) {
          return { error: { message: "missing round_id" } };
        }
        upsertedRows.push(row);
        snapshotRows.set(roundId, row);
        return { error: null };
      },
      select(_columns: string) {
        return {
          eq(_column: string, value: string) {
            return {
              async single() {
                const data = snapshotRows.get(value);
                if (!data) {
                  return { data: null, error: { message: "not found" } };
                }
                return { data, error: null };
              }
            };
          }
        };
      }
    };
  }
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockClient)
}));

import {
  ROUND_STATE_SCHEMA_VERSION,
  normalizeRoundSnapshotPayload,
  loadRoundSnapshot,
  saveRoundSnapshot
} from "../web/persistence";

const ENV = {
  VITE_SUPABASE_URL: "https://example.supabase.co",
  VITE_SUPABASE_ANON_KEY: "test-key",
  VITE_ROUND_USER_ID: "owner-1"
};

function basePayload() {
  return {
    roundId: "round-123",
    status: "active" as const,
    roundMetadata: {
      courseId: "course-1",
      courseName: "Old Westbury",
      teeBoxId: "blue",
      schemaVersion: ROUND_STATE_SCHEMA_VERSION
    },
    players: [
      { id: "p1", name: "Sam Janvey", officialName: "Sam Janvey", displayName: "Sam" },
      { id: "p2", name: "Chris Klein", officialName: "Chris Klein", displayName: "Chris" }
    ],
    teams: [
      { id: "teamA", name: "Team A", playerIds: ["p1"] },
      { id: "teamB", name: "Team B", playerIds: ["p2"] }
    ],
    holeScores: [{ holeNumber: 1, playerId: "p1", grossScore: 4, strokesReceived: 0, netScore: 4 }],
    junkEvents: [{ holeNumber: 1, playerId: "p1", teamId: "teamA", type: "net_birdie" }],
    closestEventsPar3: [{ holeNumber: 3, winnerPlayerId: "p1" }],
    closestEventsPar5: [{ holeNumber: 5, winnerPlayerId: null }],
    presses: [
      {
        id: "press-1",
        side: "front",
        startingHole: 5,
        endingHole: 9,
        teamThatWasDown: "teamB",
        valuePoints: 1,
        createdBy: "auto",
        triggerHole: 4,
        status: "active"
      }
    ],
    finalLedger: [{ holeNumber: 1, type: "junk", teamId: "teamA", playerId: "p1", points: 1, description: "Birdie" }]
  };
}

describe("round state contract", () => {
  beforeEach(() => {
    snapshotRows.clear();
    upsertedRows.length = 0;
  });

  test("saved snapshot matches contract and stamps schemaVersion", async () => {
    const payload = basePayload();
    delete (payload.roundMetadata as Record<string, unknown>).schemaVersion;

    await saveRoundSnapshot(payload, ENV);

    expect(upsertedRows).toHaveLength(1);
    const saved = upsertedRows[0];
    expect(saved.round_id).toBe(payload.roundId);
    expect(saved.status).toBe(payload.status);
    expect(saved.round_metadata).toMatchObject({ schemaVersion: ROUND_STATE_SCHEMA_VERSION });
    expect(saved.round_metadata).toMatchObject({
      ownership: {
        ownerId: "owner-1",
        editorIds: [],
        viewerIds: []
      }
    });
    expect(saved.players).toEqual(payload.players);
    expect(saved.teams).toEqual(payload.teams);
    expect(saved.hole_scores).toEqual(payload.holeScores);
    expect(saved.junk_events).toEqual(payload.junkEvents);
    expect(saved.closest_events_par3).toEqual(payload.closestEventsPar3);
    expect(saved.closest_events_par5).toEqual(payload.closestEventsPar5);
    expect(saved.presses).toEqual(payload.presses);
    expect(saved.final_ledger).toEqual(payload.finalLedger);
  });

  test("loaded snapshot restores canonical state", async () => {
    const payload = basePayload();
    await saveRoundSnapshot(payload, ENV);

    const loaded = await loadRoundSnapshot(payload.roundId, ENV);
    expect(loaded).toEqual(
      normalizeRoundSnapshotPayload({
        ...payload,
        roundMetadata: {
          ...payload.roundMetadata,
          ownership: {
            ownerId: "owner-1",
            editorIds: [],
            viewerIds: []
          }
        }
      })
    );
  });

  test("legacy snapshots without schemaVersion still load", async () => {
    snapshotRows.set("legacy-1", {
      round_id: "legacy-1",
      status: "completed",
      round_metadata: {
        courseId: "legacy-course",
        courseName: "Legacy Course",
        teeBoxId: "white"
      },
      players: [{ id: "p1", name: "Legacy Player" }],
      teams: [{ id: "teamA", name: "Team A", playerIds: ["p1"] }],
      hole_scores: [{ holeNumber: 1, playerId: "p1", grossScore: 4, strokesReceived: 0, netScore: 4 }],
      junk_events: null,
      closest_events_par3: null,
      closest_events_par5: null,
      presses: null,
      final_ledger: null
    });

    const loaded = await loadRoundSnapshot("legacy-1", ENV);

    expect(loaded.status).toBe("complete");
    expect(loaded.roundMetadata.schemaVersion).toBe(ROUND_STATE_SCHEMA_VERSION);
    expect(loaded.junkEvents).toEqual([]);
    expect(loaded.closestEventsPar3).toEqual([]);
    expect(loaded.closestEventsPar5).toEqual([]);
    expect(loaded.presses).toEqual([]);
    expect(loaded.finalLedger).toEqual([]);
  });

  test("non-owner cannot overwrite an owned round", async () => {
    const payload = basePayload();
    await saveRoundSnapshot(payload, ENV);

    await expect(
      saveRoundSnapshot(
        { ...payload, status: "complete" },
        {
          ...ENV,
          VITE_ROUND_USER_ID: "viewer-2"
        }
      )
    ).rejects.toThrow("not editable");
  });

  test("viewer can load but cannot edit", async () => {
    snapshotRows.set("acl-1", {
      round_id: "acl-1",
      status: "active",
      round_metadata: {
        schemaVersion: 1,
        courseId: "c1",
        ownership: {
          ownerId: "owner-1",
          editorIds: ["editor-1"],
          viewerIds: ["viewer-1"]
        }
      },
      players: [{ id: "p1", name: "Player One" }],
      teams: [{ id: "teamA", name: "Team A", playerIds: ["p1"] }],
      hole_scores: [],
      junk_events: [],
      closest_events_par3: [],
      closest_events_par5: [],
      presses: [],
      final_ledger: []
    });

    const viewed = await loadRoundSnapshot("acl-1", {
      ...ENV,
      VITE_ROUND_USER_ID: "viewer-1"
    });
    expect(viewed.roundId).toBe("acl-1");

    await expect(
      saveRoundSnapshot(
        {
          ...basePayload(),
          roundId: "acl-1"
        },
        {
          ...ENV,
          VITE_ROUND_USER_ID: "viewer-1"
        }
      )
    ).rejects.toThrow("not editable");
  });
});
