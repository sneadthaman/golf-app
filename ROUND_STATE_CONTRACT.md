# Round State Contract (Mobile Freeze)

Version: `1`  
Effective date: `2026-04-27`

This document defines the canonical saved round snapshot payload shared by the web harness and mobile app.

## Root Payload

```ts
interface RoundSnapshotPayload {
  roundId: string;
  status: "active" | "complete";
  roundMetadata: RoundMetadata;
  players: Player[];
  teams: Team[];
  holeScores: HoleScore[];
  junkEvents: JunkEvent[];
  closestEventsPar3: ClosestEvent[];
  closestEventsPar5: ClosestEvent[];
  presses: Press[];
  finalLedger: LedgerEntry[];
}
```

## Round Metadata

```ts
interface RoundMetadata {
  schemaVersion: 1;
  courseId: string;
  courseName: string;
  teeBoxId: string;
  seed: number;
  lifecycleStatus: "in_progress" | "completed" | "abandoned";
  ownership: {
    ownerId: string;
    editorIds: string[];
    viewerIds: string[];
  };

  // Betting config used for this round
  settings: {
    crazyMode: boolean;
    frontValuePoints: number;
    backValuePoints: number;
    overallValuePoints: number;
    pressValuePoints: number;
    autoPressEnabled: boolean;
    junkEnabled: boolean;
  };

  bettingConfig: {
    points: {
      front: number;
      back: number;
      overall: number;
      press: number;
    };
    pointMultiplier: number;
    appliedPoints: {
      front: number;
      back: number;
      overall: number;
      press: number;
    };
    autoPressEnabled: boolean;
    junkEnabled: boolean;
    crazyMode: boolean;
  };

  // Course/tee/holes snapshot used by mobile and fallback hydration
  course: {
    id: string;
    name: string;
    teeBoxId: string;
    teeBoxName: string;
    holes: Array<{
      holeNumber: number;
      par: number;
      handicapIndex: number;
      yardageByTeeBox?: Record<string, number>;
    }>;
  };

  roundSetup: {
    points: {
      front: number;
      back: number;
      overall: number;
      press: number;
    };
    doubleGame: boolean;
  };

  // Future-safe extension point
  [key: string]: unknown;
}
```

## Players

```ts
interface Player {
  id: string;
  name: string;
  officialName?: string;
  displayName?: string;
  defaultStrokesReceived?: number;
  lastUsedStrokesReceived?: number;
}
```

## Teams

```ts
interface Team {
  id: "teamA" | "teamB" | string;
  name: string;
  playerIds: string[];
}
```

## Hole Scores

```ts
interface HoleScore {
  holeNumber: number;
  playerId: string;
  grossScore: number;
  strokesReceived: number;
  netScore: number;
}
```

## Junk Events

```ts
interface JunkEvent {
  holeNumber: number;
  playerId: string;
  teamId: string;
  type: string;
  points?: number;
}
```

## CP Events

`closestEventsPar3` and `closestEventsPar5` share this shape.

```ts
interface ClosestEvent {
  holeNumber: number;
  winnerPlayerId: string | null;
}
```

## Presses

```ts
interface Press {
  id: string;
  side: "front" | "back";
  startingHole: number;
  endingHole: number;
  teamThatWasDown: string;
  valuePoints: number;
  createdBy: string;
  triggerHole: number;
  sourceMatchId?: string;
  status: "active" | "settled";
}
```

## Ledger

```ts
interface LedgerEntry {
  holeNumber?: number;
  type: string;
  teamId: string;
  playerId?: string;
  points: number;
  description: string;
}
```

## Compatibility Rules

1. `roundMetadata.schemaVersion` is required for all newly saved snapshots and is currently `1`.
2. Missing `schemaVersion` in legacy snapshots is treated as compatible and normalized to `1` at load time.
3. Unknown fields must be preserved by consumers and ignored if unsupported.
4. Mobile should reject snapshots only when required root fields are missing or invalid.
