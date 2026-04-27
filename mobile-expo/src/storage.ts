import AsyncStorage from "@react-native-async-storage/async-storage";
import { canView, normalizeSnapshot, RoundSnapshotPayload } from "./contract";

const SNAPSHOT_INDEX_KEY = "golf-mobile.snapshots.index.v1";
const snapshotKey = (roundId: string) => `golf-mobile.snapshot.${roundId}`;

async function getIndex(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(SNAPSHOT_INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function setIndex(roundIds: string[]): Promise<void> {
  await AsyncStorage.setItem(SNAPSHOT_INDEX_KEY, JSON.stringify([...new Set(roundIds)]));
}

export async function saveSnapshot(snapshot: RoundSnapshotPayload): Promise<void> {
  const normalized = normalizeSnapshot(snapshot);
  await AsyncStorage.setItem(snapshotKey(normalized.roundId), JSON.stringify(normalized));
  const current = await getIndex();
  const next = [normalized.roundId, ...current.filter((item) => item !== normalized.roundId)];
  await setIndex(next);
}

export async function loadSnapshot(roundId: string): Promise<RoundSnapshotPayload | null> {
  const raw = await AsyncStorage.getItem(snapshotKey(roundId));
  if (!raw) return null;
  try {
    return normalizeSnapshot(JSON.parse(raw) as RoundSnapshotPayload);
  } catch {
    return null;
  }
}

export async function listSnapshots(currentUserId: string): Promise<RoundSnapshotPayload[]> {
  const index = await getIndex();
  const rows = await Promise.all(index.map((roundId) => loadSnapshot(roundId)));
  return rows
    .filter((row): row is RoundSnapshotPayload => row !== null)
    .filter((row) => canView(row, currentUserId))
    .sort((a, b) => b.roundId.localeCompare(a.roundId));
}

export async function removeSnapshot(roundId: string): Promise<void> {
  await AsyncStorage.removeItem(snapshotKey(roundId));
  const next = (await getIndex()).filter((item) => item !== roundId);
  await setIndex(next);
}
