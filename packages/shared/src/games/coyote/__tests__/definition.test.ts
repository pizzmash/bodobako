import { describe, expect, it } from 'vitest';
import { coyoteDefinition as def, getCoyoteLogEntries, getCoyotePlayerView } from '../definition.js';
import { createCoyoteState } from '../logic.js';

describe('Coyote validation and privacy', () => {
  it.each([null, [], {}, { type: 'bid', value: 1 }, ...[0, -1, 1.5, NaN, Infinity, '10', Number.MAX_SAFE_INTEGER + 1].map(value => ({ type: 'bid', value, expectedRevision: 0 })), { type: 'hack', expectedRevision: 0 }, { type: 'challenge', expectedRevision: -1 }])('rejects malformed move %j', raw => expect(def.parseMove!(raw)).toBeNull());
  it('rejects first challenge, wrong actor, old revision and non-increasing bids', () => {
    let s = createCoyoteState(['a', 'b'], () => 0);
    expect(def.validateMove(s, { type: 'challenge', expectedRevision: 0 }, 'a')).toBe(false);
    expect(def.validateMove(s, { type: 'bid', value: 10, expectedRevision: 0 }, 'b')).toBe(false);
    s = def.applyMove(s, { type: 'bid', value: 10, expectedRevision: 0 }, 'a');
    for (const value of [1, 10]) expect(def.validateMove(s, { type: 'bid', value, expectedRevision: 1 }, 'b')).toBe(false);
    expect(def.validateMove(s, { type: 'challenge', expectedRevision: 0 }, 'b')).toBe(false);
    const move = { type: 'challenge' as const, expectedRevision: 1 };
    s = def.applyMove(s, move, 'b');
    expect(def.validateMove(s, move, 'b')).toBe(false);
    expect(s.lives.a + s.lives.b).toBe(5);
  });
  it('allows bluffing at the numeric limit', () => {
    const s = createCoyoteState(['a', 'b'], () => 0);
    expect(def.validateMove(s, { type: 'bid', value: Number.MAX_SAFE_INTEGER, expectedRevision: 0 }, 'a')).toBe(true);
  });
  it('never transmits deck, IDs, self card or precomputed total; unknown viewer gets no cards', () => {
    const s = createCoyoteState(['a', 'b'], () => 0);
    for (const id of ['a', 'b']) {
      const view = getCoyotePlayerView(s, id);
      expect(view.hands[id]).toEqual({ hidden: true });
      expect(view.hands[id === 'a' ? 'b' : 'a']).not.toHaveProperty('hidden');
      const json = JSON.stringify(view);
      for (const card of [...s.deck, ...Object.values(s.hands)]) expect(json).not.toContain(card.id);
      expect(view).not.toHaveProperty('deck');
      expect(view).not.toHaveProperty('extraCard');
      expect(view.roundResult).toBeNull();
      expect(view).not.toHaveProperty('total');
    }
    expect(Object.values(getCoyotePlayerView(s, 'stranger').hands)).toEqual([{ hidden: true }, { hidden: true }]);
  });
  it('publishes results, exposes current discards equally, and restores on reconnect', () => {
    let s = createCoyoteState(['a', 'b'], () => 0);
    s = def.applyMove(s, { type: 'bid', value: 999, expectedRevision: 0 }, 'a');
    s = def.applyMove(s, { type: 'challenge', expectedRevision: 1 }, 'b');
    const result = getCoyotePlayerView(s, 'a');
    expect(result.hands.a).not.toHaveProperty('hidden');
    expect(result.roundResult).toEqual(getCoyotePlayerView(s, 'b').roundResult);
    const saved = JSON.parse(JSON.stringify(s));
    expect(getCoyotePlayerView(saved, 'a')).toEqual(result);
    expect(getCoyotePlayerView(s, 'stranger').roundResult).toBeNull();
    s = def.applyMove(s, { type: 'continue', expectedRevision: 2 }, def.getCurrentPlayerId(s));
    const view = getCoyotePlayerView(s, 'a');
    expect(view.roundResult).toBeNull();
    expect(view.hands.a).toEqual({ hidden: true });
    expect(view.discardCount).toBe(2);
    expect(view.discardCounts).toEqual(getCoyotePlayerView(s, 'b').discardCounts);
    expect(Object.values(view.discardCounts).reduce((a, b) => a + b, 0)).toBe(s.discard.length);
  });
  it('logs and turn lookup work with masked views', () => {
    const prev = createCoyoteState(['a', 'b'], () => 0);
    const next = def.applyMove(prev, { type: 'bid', value: 999, expectedRevision: 0 }, 'a');
    expect(getCoyoteLogEntries(getCoyotePlayerView(prev, 'a'), getCoyotePlayerView(next, 'a'))).toEqual(getCoyoteLogEntries(prev, next));
    expect(getCoyoteLogEntries(prev, prev)).toEqual([]);
  });
});
