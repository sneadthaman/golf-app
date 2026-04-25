import { JunkEvent, JunkType, LedgerEntry } from "../types";
import { makeLedgerId } from "./utils";

const junkPoints: Record<JunkType, number> = {
  net_birdie: 1,
  up_and_down_net_par: 1,
  sandy_net_par: 1,
  chip_in_net_par: 1,
  net_eagle: 3,
  hole_in_one: 10
};

export function evaluateJunkEvents(events: JunkEvent[]): LedgerEntry[] {
  return events.map((event) => {
    const points = event.points ?? junkPoints[event.type];
    const isHoleInOne = event.type === "hole_in_one";
    return {
      id: makeLedgerId("junk", event.holeNumber, event.teamId, event.playerId, event.type),
      roundId: event.roundId,
      holeNumber: event.holeNumber,
      type: isHoleInOne ? "hole_in_one" : "junk",
      teamId: event.teamId,
      playerId: event.playerId,
      points,
      description: `${event.type} on hole ${event.holeNumber}`
    };
  });
}
