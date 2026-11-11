import { expect, it } from "vitest";
import { applyMove, createInitialState, getPlayerView, getRanking, validateMove } from "../logic.js";
import type { BluffitMove } from "../types.js";

it.each([2, 3, 4, 5, 6])("plays all eleven rounds with %i seats", (count) => {
  const ids = Array.from({ length: count }, (_, i) => String(i));
  let state = createInitialState(ids);
  for (let round = 1; round <= 11; round++) {
    for (const id of ids) {
      const value = getPlayerView(state, id).hand[0];
      const bid = { type: "bid", round, value } as const;
      expect(validateMove(state, bid, id)).toBe(true);
      state = applyMove(state, bid, id);
    }
    for (const id of state.order) {
      const take = { type: "take", round, value: state.market[0] } as const;
      expect(validateMove(state, take, id)).toBe(true);
      state = applyMove(state, take, id);
    }
  }
  expect(state.phase).toBe("finished");
  expect(state.market).toEqual([]);
  for (const id of ids) expect(state.piles[id]).toHaveLength(10);
});

it("resolves equal bids for the challenger and permits challenging the new owner", () => {
  let s = createInitialState(["a", "b", "c"]);
  s.order = ["a", "b", "c"];
  s.market = [9, 7, 3];
  const play = (id: string, m: BluffitMove) => {
    expect(validateMove(s, m, id)).toBe(true);
    s = applyMove(s, m, id);
  };
  const before = s;
  for (const id of s.order) play(id, { type: "bid", value: id === "c" ? 2 : 5, round: 1 });
  expect(before.hands.a).toHaveLength(10);
  expect(validateMove(s, { type: "take", value: 9, round: 1 }, "b")).toBe(false);
  play("a", { type: "take", value: 9, round: 1 });
  play("b", { type: "challenge", target: "a", round: 1 });
  expect(s.claims).toEqual({ b: 9 });
  expect(getPlayerView(s, "c").duels[0]).not.toHaveProperty("attack");
  expect(getPlayerView(s, "a").duels[0].defense).toBe(5);
  play("c", { type: "challenge", target: "b", round: 1 });
  expect(s.order[0]).toBe("b");
  expect(s.piles).toEqual({ a: [], b: [9], c: [] });
  expect([...s.market].sort()).toEqual([2, 5, 5]);
  expect(validateMove(s, { type: "bid", value: 3, round: 1 }, "a")).toBe(false);
});

it("skips ineligible finalists, spends exactly one duplicate, supports shared victory", () => {
  let s = createInitialState(["a", "b", "c"]);
  Object.assign(s, {
    round: 10,
    phase: "claim",
    turn: 2,
    order: ["b", "c", "a"],
    market: [3],
    claims: { b: 3, c: 1 },
    bids: { a: 4, b: 4, c: 1 },
    piles: { a: [4], b: [4], c: [] },
  });
  s = applyMove(s, { type: "take", value: 3, round: 10 }, "a");
  expect(s.order).toEqual(["b", "a"]);
  expect(validateMove(s, { type: "bid", value: 1, round: 11 }, "c")).toBe(false);
  for (const id of s.order) s = applyMove(s, { type: "bid", value: 3, round: 11 }, id);
  expect(getPlayerView(s, "c").tops.a).toBe(3);
  for (const id of s.order) s = applyMove(s, { type: "take", value: 4, round: 11 }, id);
  expect(s.phase).toBe("finished");
  expect(getPlayerView(s, "c").scores).toEqual({ a: 8, b: 8, c: 1 });
  expect(getRanking(s)?.slice(0, 2).sort()).toEqual(["a", "b"]);
  s.piles.c = [8];
  expect(getRanking(s)).toBeNull();
});
