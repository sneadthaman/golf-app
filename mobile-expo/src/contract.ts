export const ROUND_STATE_SCHEMA_VERSION = 1;

export type RoundStatus = "active" | "complete";

export interface RoundOwnership {
  ownerId: string;
  editorIds: string[];
  viewerIds: string[];
}

export interface RoundMetadata {
  schemaVersion: number;
  courseId: string;
  courseName: string;
  teeBoxId: string;
  seed?: number;
  lifecycleStatus: "in_progress" | "completed" | "abandoned";
  ownership: RoundOwnership;
  settings?: Record<string, unknown>;
  bettingConfig?: Record<string, unknown>;
  course?: Record<string, unknown>;
  roundSetup?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface RoundSnapshotPayload {
  roundId: string;
  status: RoundStatus;
  roundMetadata: RoundMetadata;
  players: Array<Record<string, unknown>>;
  teams: Array<Record<string, unknown>>;
  holeScores: Array<Record<string, unknown>>;
  junkEvents: Array<Record<string, unknown>>;
  closestEventsPar3: Array<Record<string, unknown>>;
  closestEventsPar5: Array<Record<string, unknown>>;
  presses: Array<Record<string, unknown>>;
  finalLedger: Array<Record<string, unknown>>;
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    : [];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

export function normalizeSnapshot(snapshot: RoundSnapshotPayload): RoundSnapshotPayload {
  const metadata = asObject(snapshot.roundMetadata);
  const ownershipRaw = asObject(metadata.ownership);

  const ownerId =
    typeof ownershipRaw.ownerId === "string" && ownershipRaw.ownerId.trim().length > 0
      ? ownershipRaw.ownerId.trim()
      : "local-device";

  const roundMetadata: RoundMetadata = {
    ...metadata,
    schemaVersion:
      typeof metadata.schemaVersion === "number" && Number.isInteger(metadata.schemaVersion) && metadata.schemaVersion > 0
        ? metadata.schemaVersion
        : ROUND_STATE_SCHEMA_VERSION,
    courseId: typeof metadata.courseId === "string" ? metadata.courseId : "",
    courseName: typeof metadata.courseName === "string" ? metadata.courseName : "Unknown course",
    teeBoxId: typeof metadata.teeBoxId === "string" ? metadata.teeBoxId : "",
    lifecycleStatus:
      metadata.lifecycleStatus === "completed" || metadata.lifecycleStatus === "abandoned"
        ? metadata.lifecycleStatus
        : "in_progress",
    ownership: {
      ownerId,
      editorIds: asStringArray(ownershipRaw.editorIds).filter((id) => id !== ownerId),
      viewerIds: asStringArray(ownershipRaw.viewerIds).filter((id) => id !== ownerId)
    }
  };

  return {
    roundId: typeof snapshot.roundId === "string" ? snapshot.roundId : "",
    status: snapshot.status === "complete" ? "complete" : "active",
    roundMetadata,
    players: asRecordArray(snapshot.players),
    teams: asRecordArray(snapshot.teams),
    holeScores: asRecordArray(snapshot.holeScores),
    junkEvents: asRecordArray(snapshot.junkEvents),
    closestEventsPar3: asRecordArray(snapshot.closestEventsPar3),
    closestEventsPar5: asRecordArray(snapshot.closestEventsPar5),
    presses: asRecordArray(snapshot.presses),
    finalLedger: asRecordArray(snapshot.finalLedger)
  };
}

export function canView(snapshot: RoundSnapshotPayload, currentUserId: string): boolean {
  const ownership = snapshot.roundMetadata.ownership;
  return (
    currentUserId === ownership.ownerId ||
    ownership.editorIds.includes(currentUserId) ||
    ownership.viewerIds.includes(currentUserId)
  );
}

export function canEdit(snapshot: RoundSnapshotPayload, currentUserId: string): boolean {
  const ownership = snapshot.roundMetadata.ownership;
  return currentUserId === ownership.ownerId || ownership.editorIds.includes(currentUserId);
}
