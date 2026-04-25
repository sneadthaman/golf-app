export function makeLedgerId(
  type: string,
  holeNumber: number,
  teamId: string,
  playerId?: string,
  suffix?: string
): string {
  const parts = [type, String(holeNumber), teamId];
  if (playerId) parts.push(playerId);
  if (suffix) parts.push(suffix);
  return parts.join(":");
}
