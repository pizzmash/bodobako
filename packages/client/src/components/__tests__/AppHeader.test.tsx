import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseRoom = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("../../context/RoomContext", () => ({
  useRoom: () => mockUseRoom(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

import { AppHeader } from "../AppHeader";

function baseRoomState() {
  return {
    room: {
      code: "ABCD",
      gameId: "othello",
      players: [
        { id: "p1", name: "Alice", userId: "u1" },
        { id: "p2", name: "Bob", userId: "u2" },
      ],
      hostId: "p1",
      status: "waiting" as const,
      gameState: null,
    },
    playerId: "p1",
    playerName: "Alice",
    setPlayerName: vi.fn(),
    gameState: null,
    gameResult: null,
    errorMsg: null,
    isCreatingRoom: false,
    creatingGameId: null,
    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    proceedLeave: vi.fn(),
    connectToRoom: vi.fn(),
    startGame: vi.fn(),
    sendMove: vi.fn(),
    clearError: vi.fn(),
  };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("AppHeader 参加者ポップオーバー", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("相手のみ申請時に承認ボタンを表示し、承認後は名前右にフレンドバッジを表示する", async () => {
    let approved = false;

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method ?? "GET";

      if (url.endsWith("/users/u1/profile")) return jsonResponse({ uid: "u1", displayName: "Alice", photoURL: "" });
      if (url.endsWith("/users/u2/profile")) return jsonResponse({ uid: "u2", displayName: "Bob", photoURL: "" });

      if (url.endsWith("/users/me/friends")) {
        return jsonResponse(approved ? [{ uid: "u2" }] : []);
      }
      if (url.endsWith("/users/me/followers")) {
        return jsonResponse([{ uid: "u2", isFollowing: approved }]);
      }

      if (url.endsWith("/users/me/friend-requests/u2/approve") && method === "POST") {
        approved = true;
        return jsonResponse({ ok: true });
      }

      return jsonResponse({ error: "not found" }, 404);
    });

    vi.stubGlobal("fetch", fetchMock);
    mockUseRoom.mockReturnValue(baseRoomState());
    mockUseAuth.mockReturnValue({
      firebaseUser: { uid: "u1", photoURL: null, displayName: "Alice" },
      idToken: "token",
    });

    render(<AppHeader onMenuClick={() => { /* noop */ }} />);

    fireEvent.click(screen.getByRole("button", { name: "Bob の情報を表示" }));

    await waitFor(() => {
      expect(screen.getByText("相手からフレンド申請が届いています")).toBeTruthy();
      expect(screen.getByRole("button", { name: "承認" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "承認" }));

    await waitFor(() => {
      expect(screen.getByText("フレンド")).toBeTruthy();
      expect(screen.queryByText("相手からフレンド申請が届いています")).toBeNull();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/users/me/friend-requests/u2/approve"),
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer token" },
      }),
    );
  });

  it("ログイン済みで参加者アイコンを開くたびに最新状況APIを再取得する", async () => {
    let friendsCalls = 0;
    let followersCalls = 0;
    let targetProfileCalls = 0;

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.endsWith("/users/u1/profile")) return jsonResponse({ uid: "u1", displayName: "Alice", photoURL: "" });
      if (url.endsWith("/users/u2/profile")) {
        targetProfileCalls += 1;
        return jsonResponse({ uid: "u2", displayName: "Bob", photoURL: "" });
      }
      if (url.endsWith("/users/me/friends")) {
        friendsCalls += 1;
        return jsonResponse([]);
      }
      if (url.endsWith("/users/me/followers")) {
        followersCalls += 1;
        return jsonResponse([]);
      }
      return jsonResponse({ error: "not found" }, 404);
    });

    vi.stubGlobal("fetch", fetchMock);
    mockUseRoom.mockReturnValue(baseRoomState());
    mockUseAuth.mockReturnValue({
      firebaseUser: { uid: "u1", photoURL: null, displayName: "Alice" },
      idToken: "token",
    });

    render(<AppHeader onMenuClick={() => { /* noop */ }} />);

    await waitFor(() => {
      expect(friendsCalls).toBeGreaterThan(0);
      expect(followersCalls).toBeGreaterThan(0);
    });

    const baseFriendsCalls = friendsCalls;
    const baseFollowersCalls = followersCalls;
    const baseProfileCalls = targetProfileCalls;

    const bobInfoButton = screen.getByRole("button", { name: "Bob の情報を表示" });

    fireEvent.click(bobInfoButton);
    await waitFor(() => {
      expect(friendsCalls).toBeGreaterThan(baseFriendsCalls);
      expect(followersCalls).toBeGreaterThan(baseFollowersCalls);
      expect(targetProfileCalls).toBeGreaterThan(baseProfileCalls);
    });

    const firstOpenFriendsCalls = friendsCalls;
    fireEvent.click(bobInfoButton);
    fireEvent.click(bobInfoButton);

    await waitFor(() => {
      expect(friendsCalls).toBeGreaterThan(firstOpenFriendsCalls);
    });
  });
});