import { expect, it } from "vitest";
import { getGameDefinition } from "../../index.js";
import { getPlayerView } from "../logic.js";

it("registers the game, rejects malformed inputs and restores only the viewer's secrets", () => {
  const d = getGameDefinition("bluffit");
  for (const raw of [
    null,
    {},
    { type: "bid", value: 1.5, round: 1 },
    { type: "take", value: 11, round: 1 },
    { type: "challenge", target: 1, round: 1 },
  ])
    expect(d.parseMove!(raw)).toBeNull();
  const move = d.parseMove!({ type: "bid", value: 7, round: 1 })!;
  const before = d.createInitialState(["a", "b"]);
  expect(d.validateMove(before, move, "outsider")).toBe(false);
  const after = d.applyMove(before, move, "a");
  expect(d.validateMove(after, move, "a")).toBe(false);
  const mine = getPlayerView(JSON.parse(JSON.stringify(after)), "a");
  const other = getPlayerView(after, "b");
  expect(mine.bid).toBe(7);
  expect(mine.hand).not.toContain(7);
  expect(other.bid).toBeNull();
  expect(other.ready).toEqual(["a"]);
  for (const key of ["hands", "bids", "piles"]) expect(other).not.toHaveProperty(key);
});
