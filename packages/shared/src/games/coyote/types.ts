export type CoyoteCardFace =
  | { kind: 'number'; value: -10 | -5 | 0 | 1 | 2 | 3 | 4 | 5 | 10 | 15 | 20 }
  | { kind: 'night' | 'double' | 'fox' | 'cave' };
export type CoyoteCard = CoyoteCardFace & { id: string };
export type CoyoteVisibleCard = CoyoteCardFace | { hidden: true };
export interface CoyoteBid { playerId: string; value: number }
export interface CoyoteRoundResult {
  cards: { playerId: string; card: CoyoteCardFace }[];
  extraCard: CoyoteCardFace | null;
  /** Index in cards followed by the optional extra card. Never an internal card ID. */
  foxTargetIndex: number | null;
  subtotal: number;
  multiplier: number;
  total: number;
  bid: CoyoteBid;
  challengerId: string;
  loserId: string;
  success: boolean;
  livesBefore: number;
  livesAfter: number;
  resetDeck: boolean;
}
export interface CoyotePublicState {
  rulesVersion: 'bodobako-coyote-v1';
  phase: 'bidding' | 'round_result' | 'finished';
  revision: number;
  roundNumber: number;
  playerIds: string[];
  lives: Record<string, number>;
  currentPlayerIndex: number;
  eliminatedPlayerIds: string[];
  lastBid: CoyoteBid | null;
  roundBids: CoyoteBid[];
  roundResult: CoyoteRoundResult | null;
  winnerId: string | null;
  shuffleCount: number;
}
export interface CoyoteState extends CoyotePublicState {
  deck: CoyoteCard[];
  discard: CoyoteCard[];
  hands: Record<string, CoyoteCard>;
  extraCard: CoyoteCard | null;
}
export interface CoyotePlayerView extends CoyotePublicState {
  hands: Record<string, CoyoteVisibleCard>;
  deckCount: number;
  discardCount: number;
  discardCounts: Record<string, number>;
}
export type CoyoteMove =
  | { type: 'bid'; value: number; expectedRevision: number }
  | { type: 'challenge'; expectedRevision: number }
  | { type: 'continue'; expectedRevision: number };
