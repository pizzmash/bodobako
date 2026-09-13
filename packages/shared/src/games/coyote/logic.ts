import { coyoteCardFace, createCoyoteDeck } from './cards.js';
import type { CoyoteCard, CoyoteCardFace, CoyoteRoundResult, CoyoteState } from './types.js';

export type CoyoteRandom = () => number;
const random: CoyoteRandom = () => crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000;
export function shuffleCoyote(cards: CoyoteCard[], rng: CoyoteRandom = random): CoyoteCard[] {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function nextCoyotePlayer(state: Pick<CoyoteState, 'playerIds' | 'lives'>, from: number): number {
  for (let step = 1; step <= state.playerIds.length; step++) {
    const index = (from + step) % state.playerIds.length;
    if (state.lives[state.playerIds[index]] > 0) return index;
  }
  throw new Error('No surviving player');
}
/** Uses resolved faces, including the cave draw, in fixed seat order. */
export function calculateCoyote(cards: CoyoteCardFace[]) {
  let foxTargetIndex: number | null = null;
  let max = 0;
  if (cards.some(card => card.kind === 'fox')) {
    cards.forEach((card, i) => {
      if (card.kind === 'number' && card.value > max) { max = card.value; foxTargetIndex = i; }
    });
  }
  const subtotal = cards.reduce((sum, card, i) => sum + (card.kind === 'number' && i !== foxTargetIndex ? card.value : 0), 0);
  const multiplier = cards.some(card => card.kind === 'double') ? 2 : 1;
  return { foxTargetIndex, subtotal, multiplier, total: subtotal * multiplier, resetDeck: cards.some(card => card.kind === 'night') };
}
function refill(state: CoyoteState, rng?: CoyoteRandom) {
  state.deck = shuffleCoyote([...state.deck, ...state.discard], rng);
  state.discard = [];
  state.shuffleCount++;
}
/** Called only after collecting the previous round, never partway through a deal. */
function deal(state: CoyoteState, rng?: CoyoteRandom) {
  const survivors = state.playerIds.filter(id => state.lives[id] > 0);
  if (state.deck.length < survivors.length) refill(state, rng);
  state.hands = Object.fromEntries(survivors.map(id => [id, state.deck.shift()!]));
}
export function createCoyoteState(playerIds: string[], rng: CoyoteRandom = random): CoyoteState {
  if (playerIds.length < 2 || playerIds.length > 10 || new Set(playerIds).size !== playerIds.length) throw new Error('Coyote needs 2–10 distinct players');
  const state: CoyoteState = {
    rulesVersion: 'bodobako-coyote-v1', phase: 'bidding', revision: 0, roundNumber: 1,
    playerIds: [...playerIds], lives: Object.fromEntries(playerIds.map(id => [id, 3])),
    currentPlayerIndex: Math.floor(rng() * playerIds.length), eliminatedPlayerIds: [],
    lastBid: null, roundBids: [], roundResult: null, winnerId: null, shuffleCount: 0,
    deck: shuffleCoyote(createCoyoteDeck(), rng), discard: [], hands: {}, extraCard: null,
  };
  deal(state, rng);
  return state;
}
export function resolveCoyoteChallenge(state: CoyoteState, challengerId: string, rng?: CoyoteRandom): void {
  const cards = state.playerIds.filter(id => state.hands[id]).map(playerId => ({ playerId, card: coyoteCardFace(state.hands[playerId]) }));
  if (cards.some(({ card }) => card.kind === 'cave')) {
    if (state.deck.length === 0) refill(state, rng);
    state.extraCard = state.deck.shift()!;
  }
  const extraCard = state.extraCard ? coyoteCardFace(state.extraCard) : null;
  const calculation = calculateCoyote([...cards.map(({ card }) => card), ...(extraCard ? [extraCard] : [])]);
  const bid = { ...state.lastBid! };
  const success = bid.value > calculation.total;
  const loserId = success ? bid.playerId : challengerId;
  const livesBefore = state.lives[loserId];
  const livesAfter = --state.lives[loserId];
  if (livesAfter === 0) state.eliminatedPlayerIds.push(loserId);
  const survivors = state.playerIds.filter(id => state.lives[id] > 0);
  state.winnerId = survivors.length === 1 ? survivors[0] : null;
  const loserIndex = state.playerIds.indexOf(loserId);
  state.currentPlayerIndex = livesAfter > 0 ? loserIndex : nextCoyotePlayer(state, loserIndex);
  const result: CoyoteRoundResult = { cards, extraCard, ...calculation, bid, challengerId, loserId, success, livesBefore, livesAfter };
  state.roundResult = result;
  state.phase = 'round_result';
}
export function continueCoyote(state: CoyoteState, rng?: CoyoteRandom): void {
  if (state.winnerId) { state.phase = 'finished'; return; }
  state.discard.push(...Object.values(state.hands), ...(state.extraCard ? [state.extraCard] : []));
  state.hands = {};
  state.extraCard = null;
  if (state.roundResult?.resetDeck) refill(state, rng);
  deal(state, rng);
  state.roundNumber++;
  state.lastBid = null;
  state.roundBids = [];
  state.roundResult = null;
  state.phase = 'bidding';
}
