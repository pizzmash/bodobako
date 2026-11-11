export type BluffitMove =
  | { type: "bid" | "take"; value: number; round: number }
  | { type: "challenge"; target: string; round: number };

export interface Duel {
  round: number;
  attacker: string;
  defender: string;
  winner: string;
  prize: number;
  attack: number;
  defense: number;
}

interface Table {
  playerIds: string[];
  order: string[];
  round: number;
  phase: "bid" | "claim" | "finished";
  turn: number;
  market: number[];
  claims: Record<string, number>;
  lastAwards: { round: number; prizes: Record<string, number> } | null;
}

export interface BluffitState extends Table {
  hands: Record<string, number[]>;
  piles: Record<string, number[]>;
  bids: Record<string, number>;
  duels: Duel[];
}

export interface BluffitView extends Table {
  hand: number[];
  pile: number[];
  bid: number | null;
  ready: string[];
  tops: Record<string, number | null>;
  scores: Record<string, number> | null;
  duels: (Omit<Duel, "attack" | "defense"> & Partial<Pick<Duel, "attack" | "defense">>)[];
}
