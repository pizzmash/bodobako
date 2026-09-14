import { describe, expect, it } from 'vitest';
import { createCoyoteDeck } from '../cards.js';
import { calculateCoyote, continueCoyote, createCoyoteState, resolveCoyoteChallenge } from '../logic.js';
import { coyoteDefinition as def } from '../definition.js';
import type { CoyoteCardFace, CoyoteState } from '../types.js';
const n = (value: number) => ({ kind: 'number', value }) as CoyoteCardFace;
const special = (kind: 'fox' | 'double' | 'cave' | 'night'): CoyoteCardFace => ({ kind });

function inventory(state: CoyoteState) {
  const all = [...state.deck, ...state.discard, ...Object.values(state.hands), ...(state.extraCard ? [state.extraCard] : [])];
  expect(all).toHaveLength(36);
  expect(new Set(all.map(c => c.id)).size).toBe(36);
}
function fixture(faces: CoyoteCardFace[], deckSize?: number): CoyoteState {
  const state = createCoyoteState(faces.map((_, i) => `p${i}`), () => .5);
  const deck = createCoyoteDeck();
  state.hands = Object.fromEntries(faces.map((face, i) => {
    const index = deck.findIndex(c => c.kind === face.kind && (face.kind !== 'number' || (c.kind === 'number' && c.value === face.value)));
    return [`p${i}`, deck.splice(index, 1)[0]];
  }));
  state.deck = deckSize === undefined ? deck : deck.slice(0, deckSize);
  state.discard = deckSize === undefined ? [] : deck.slice(deckSize);
  state.currentPlayerIndex = 1;
  state.lastBid = { playerId: 'p0', value: 100 };
  return state;
}
describe('Coyote calculations', () => {
  it.each([
    [[n(10), n(5), n(-5)], 10],
    [[n(15), n(3), n(-5), special('double')], 26],
    [[n(10), n(10), n(3), special('fox')], 13],
    [[n(20), n(5), special('fox'), special('double')], 10],
    [[n(-10), n(-5), special('double')], -30],
    [[n(-10), special('fox')], -10],
  ] as [CoyoteCardFace[], number][])('resolves %j to %i', (cards, total) => expect(calculateCoyote(cards).total).toBe(total));
  it('zeroes only the first tied maximum', () => expect(calculateCoyote([n(10), n(10), special('fox')]).foxTargetIndex).toBe(0));
  it.each(['double', 'night', 'fox'] as const)('activates a cave-drawn %s', kind => {
    const state = fixture([n(5), special('cave')]);
    const i = state.deck.findIndex(c => c.kind === kind);
    state.deck.unshift(...state.deck.splice(i, 1));
    resolveCoyoteChallenge(state, 'p1');
    expect(state.roundResult?.total).toBe(kind === 'double' ? 10 : kind === 'fox' ? 0 : 5);
    expect(state.roundResult?.resetDeck).toBe(kind === 'night');
    inventory(state);
  });
  it('includes cave-drawn numbers in fox selection', () => {
    const state = fixture([n(5), special('cave'), special('fox')]);
    resolveCoyoteChallenge(state, 'p1'); // fresh deck starts with 20
    expect(state.roundResult?.total).toBe(5);
    expect(state.roundResult?.foxTargetIndex).toBe(3);
  });
  it('equal bids are safe', () => {
    const state = fixture([n(10), n(5)]);
    state.lastBid!.value = 15;
    resolveCoyoteChallenge(state, 'p1');
    expect(state.roundResult?.loserId).toBe('p1');
  });
});
describe('Coyote deck lifecycle', () => {
  it.each([2, 6, 10])('deals one of 36 unique cards to %i players', count => {
    const state = createCoyoteState(Array.from({ length: count }, (_, i) => String(i)));
    expect(Object.keys(state.hands)).toHaveLength(count);
    inventory(state);
  });
  it('refills before dealing when insufficient', () => {
    const state = fixture([n(1), n(2), n(3), n(4), n(5)], 3);
    resolveCoyoteChallenge(state, 'p1');
    continueCoyote(state, () => .5);
    expect(state.deck).toHaveLength(31);
    expect(state.discard).toHaveLength(0);
    expect(state.shuffleCount).toBe(1);
    inventory(state);
  });
  it('deals exactly the remaining cards without refilling', () => {
    const state = fixture([n(1), n(2)], 2);
    resolveCoyoteChallenge(state, 'p1');
    continueCoyote(state);
    expect(state.deck).toHaveLength(0);
    expect(state.shuffleCount).toBe(0);
    inventory(state);
  });
  it('refills a cave draw from discards without returning current hands', () => {
    const state = fixture([n(1), special('cave')], 0);
    const ids = Object.values(state.hands).map(c => c.id);
    resolveCoyoteChallenge(state, 'p1', () => .5);
    expect(ids).toEqual(Object.values(state.hands).map(c => c.id));
    expect(state.discard).toHaveLength(0);
    expect(state.deck).toHaveLength(33);
    expect(state.shuffleCount).toBe(1);
    inventory(state);
  });
  it('night returns all cards before the next round', () => {
    const state = fixture([n(1), special('night')], 5);
    resolveCoyoteChallenge(state, 'p1');
    continueCoyote(state);
    expect(state.deck).toHaveLength(34);
    expect(state.discard).toHaveLength(0);
    inventory(state);
  });
  it('completes 2/6/10-player matches with conservation, elimination and ranking', () => {
    for (const count of [2, 6, 10]) {
      let state = createCoyoteState(Array.from({ length: count }, (_, i) => `p${i}`));
      for (let step = 0; step < 100 && state.phase !== 'finished'; step++) {
        const actor = def.getCurrentPlayerId(state);
        const move = state.phase === 'round_result' ? { type: 'continue' as const, expectedRevision: state.revision } : state.lastBid ? { type: 'challenge' as const, expectedRevision: state.revision } : { type: 'bid' as const, value: 999, expectedRevision: state.revision };
        expect(def.validateMove(state, move, actor)).toBe(true);
        const previous = structuredClone(state);
        const old = state;
        state = def.applyMove(state, move, actor);
        expect(old).toEqual(previous);
        inventory(state);
      }
      expect(def.getStatus(state)).toBe('finished');
      expect(new Set(def.getRanking(state))).toHaveProperty('size', count);
      expect(def.getRanking(state)?.[0]).toBe(state.winnerId);
      expect(state.eliminatedPlayerIds).toHaveLength(count - 1);
    }
  });
});
