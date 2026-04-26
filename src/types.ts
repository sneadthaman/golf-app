export type SideType = "front" | "back" | "overall";

export interface Player {
  id: string;
  name: string;
  lastUsedStrokesReceived?: number;
  defaultStrokesReceived?: number;
}

export interface Team {
  id: string;
  name: string;
  playerIds: string[];
}

export interface CourseHole {
  holeNumber: number;
  par: number;
  handicapIndex: number;
  yardageByTeeBox?: Record<string, number>;
}

export interface TeeBox {
  id: string;
  name: string;
  color: string;
  courseRating: number;
  slope: number;
}

export interface Course {
  id: string;
  name: string;
  holes: CourseHole[];
  teeBoxes: TeeBox[];
  parTotal: number;
  handicapMode?: "standard18" | "split9_replay";
}

export interface RoundSettings {
  crazyMode: boolean;
  frontValuePoints: number;
  backValuePoints: number;
  overallValuePoints: number;
  pressValuePoints: number;
  autoPressEnabled: boolean;
  junkEnabled: boolean;
}

export interface Round {
  id: string;
  courseId: string;
  course?: Course;
  teeBoxId?: string;
  players: Player[];
  roundPlayers: RoundPlayer[];
  teams: Team[];
  courseHoles: CourseHole[];
  settings: RoundSettings;
  status: "active" | "complete";
  holeScores: HoleScore[];
  holeResults: HoleResult[];
  junkEvents: JunkEvent[];
  closestEvents: ClosestEvent[];
  par5CarryoverEvents: Par5CarryoverEvent[];
  presses?: Press[];
}

export interface RoundPlayer {
  roundId: string;
  playerId: string;
  teamId: string;
  strokesReceived: number;
}

export interface HoleScore {
  roundId: string;
  holeNumber: number;
  playerId: string;
  grossScore: number;
  netScore: number;
  strokesReceived: number;
}

export interface HoleResult {
  roundId: string;
  holeNumber: number;
  winningTeamId: string | null;
  losingTeamId: string | null;
  isHalved: boolean;
}

export type JunkType =
  | "net_birdie"
  | "up_and_down_net_par"
  | "sandy_net_par"
  | "chip_in_net_par"
  | "net_eagle"
  | "hole_in_one";

export interface JunkEvent {
  roundId: string;
  holeNumber: number;
  playerId: string;
  teamId: string;
  type: JunkType;
  points?: number;
}

export interface ClosestEvent {
  roundId: string;
  holeNumber: number;
  winnerPlayerId: string | null;
}

export interface Par5CarryoverEvent {
  roundId: string;
  holeNumber: number;
  winnerPlayerId: string | null;
}

export interface CarryoverState {
  par3ClosestBank: number;
  par5Bank: number;
}

export interface Press {
  id: string;
  roundId: string;
  side: "front" | "back";
  startingHole: number;
  endingHole: number;
  teamThatWasDown: string;
  valuePoints: number;
  createdBy: "auto";
  triggerHole: number;
  sourceMatchId?: string;
  status: "active" | "settled";
}

export type LedgerEntryType =
  | "front_win"
  | "back_win"
  | "overall_win"
  | "press_win"
  | "junk"
  | "closest_par3"
  | "par5_carryover"
  | "hole_in_one";

export interface LedgerEntry {
  id: string;
  roundId: string;
  holeNumber?: number;
  type: LedgerEntryType;
  teamId: string;
  playerId?: string;
  points: number;
  description: string;
}

export interface SideStatus {
  teamAUp: number;
  teamBUp: number;
  state: "teamAUp" | "teamBUp" | "tied";
}
