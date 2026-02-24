import { describe, expect, it } from "vitest";
import { canInviteWithFriendRelations } from "../UserRegistry.js";

describe("invite rules", () => {
  it("相互フレンドのときのみ招待可能", () => {
    expect(canInviteWithFriendRelations(true, true)).toBe(true);
  });

  it("片方向フレンドでは招待不可（inviter -> invited のみ）", () => {
    expect(canInviteWithFriendRelations(true, false)).toBe(false);
  });

  it("片方向フレンドでは招待不可（invited -> inviter のみ）", () => {
    expect(canInviteWithFriendRelations(false, true)).toBe(false);
  });

  it("フレンド関係がない場合は招待不可", () => {
    expect(canInviteWithFriendRelations(false, false)).toBe(false);
  });
});
