import { RoundSnapshotPayload } from "./contract";

export interface LeaderboardRow {
  playerId: string;
  playerName: string;
  junkPoints: number;
}

export function buildSeasonLeaderboard(snapshots: RoundSnapshotPayload[]): LeaderboardRow[] {
  const totals = new Map<string, number>();
  const names = new Map<string, string>();

  for (const snapshot of snapshots) {
    if (snapshot.roundMetadata.lifecycleStatus === "abandoned") continue;
    for (const player of snapshot.players) {
      const playerId = String(player.id ?? "");
      if (!playerId) continue;
      names.set(playerId, String(player.name ?? playerId));
      if (!totals.has(playerId)) totals.set(playerId, 0);
    }
    for (const entry of snapshot.finalLedger) {
      const type = String(entry.type ?? "");
      if (type !== "junk" && type !== "hole_in_one" && type !== "closest_par3" && type !== "par5_carryover") {
        continue;
      }
      const playerId = typeof entry.playerId === "string" ? entry.playerId : "";
      const points = typeof entry.points === "number" ? entry.points : 0;
      if (!playerId) continue;
      totals.set(playerId, (totals.get(playerId) ?? 0) + points);
    }
  }

  return [...totals.entries()]
    .map(([playerId, junkPoints]) => ({
      playerId,
      playerName: names.get(playerId) ?? playerId,
      junkPoints
    }))
    .sort((a, b) => b.junkPoints - a.junkPoints || a.playerName.localeCompare(b.playerName));
}
