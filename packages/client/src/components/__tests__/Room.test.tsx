import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockUseRoom = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("../../context/RoomContext", () => ({
  useRoom: () => mockUseRoom(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

import { Room } from "../Room";

function baseRoomState() {
  return {
    room: {
      code: "ABCD",
      gameId: "othello",
      players: [
        { id: "p1", name: "Alice", userId: "uid-1" },
        { id: "p2", name: "Bob", userId: "uid-2" },
      ],
      hostId: "p1",
      status: "waiting" as const,
      gameState: null,
    },
    playerId: "p1",
    startGame: vi.fn(),
    leaveRoom: vi.fn(),
    isCreatingRoom: false,
    creatingGameId: null,
  };
}

describe("Room 招待UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ホストは招待ボタンを表示し、未ログイン時は無効", () => {
    mockUseRoom.mockReturnValue(baseRoomState());
    mockUseAuth.mockReturnValue({ idToken: null });

    render(<Room />);

    const inviteButton = screen.getByRole("button", { name: "フレンドを招待" });
    expect(inviteButton).toBeTruthy();
    expect((inviteButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("ホストでログイン済みなら招待ボタンは有効", () => {
    mockUseRoom.mockReturnValue(baseRoomState());
    mockUseAuth.mockReturnValue({ idToken: "token" });

    render(<Room />);

    const inviteButton = screen.getByRole("button", { name: "フレンドを招待" });
    expect(inviteButton).toBeTruthy();
    expect((inviteButton as HTMLButtonElement).disabled).toBe(false);
  });

  it("ホスト以外には招待ボタンを表示しない", () => {
    const state = baseRoomState();
    mockUseRoom.mockReturnValue({ ...state, playerId: "p2" });
    mockUseAuth.mockReturnValue({ idToken: "token" });

    render(<Room />);

    expect(screen.queryByRole("button", { name: "フレンドを招待" })).toBeNull();
  });

  it("招待モーダルには相互フレンドのみ表示する", async () => {
    mockUseRoom.mockReturnValue(baseRoomState());
    mockUseAuth.mockReturnValue({ idToken: "token" });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { uid: "u1", displayName: "相互フレンド", isFollowing: true },
        { uid: "u2", displayName: "片方向フレンド", isFollowing: false },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Room />);

    fireEvent.click(screen.getByRole("button", { name: "フレンドを招待" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/users/me/followers"),
        expect.objectContaining({
          headers: { Authorization: "Bearer token" },
        }),
      );
    });

    expect(screen.getByText("相互フレンド")).toBeTruthy();
    expect(screen.queryByText("片方向フレンド")).toBeNull();

    vi.unstubAllGlobals();
  });
});
