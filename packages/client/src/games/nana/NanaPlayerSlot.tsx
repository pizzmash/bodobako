import type { NanaStateView } from "@bodobako/shared";
import { useMemo } from "react";
import type { PlayerSlotProps } from "../../components/GameSidebar/PlayerCard";
import { useRoom } from "../../context/RoomContext";
import { withAlpha } from "../../lib/color";
import { C, FONT, PLAYER_COLORS } from "./constants";

export function NanaPlayerSlot({ playerId: slotPlayerId, isMe }: PlayerSlotProps) {
  const { gameState, sendMove, playerId: myId, room } = useRoom();
  const state: NanaStateView | null =
    gameState?.gameId === "nana" ? gameState.state : null;

  const playerIndex = useMemo(() => {
    if (!room) return 0;
    const idx = room.players.findIndex((p) => p.id === slotPlayerId);
    return idx >= 0 ? idx : 0;
  }, [room, slotPlayerId]);

  const playerColor = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];

  const flippedIdsSet = useMemo(
    () => new Set(state?.turnFlips.map((f) => f.cardId) ?? []),
    [state?.turnFlips]
  );

  const hand = state?.hands[slotPlayerId] ?? [];
  const activeCards = useMemo(
    () => hand.filter((c) => !flippedIdsSet.has(c.id)),
    [hand, flippedIdsSet]
  );
  const sets = state?.collectedSets[slotPlayerId] ?? [];
  const pendingResult = state?.pendingResult ?? null;
  const isMyTurn = state
    ? state.playerIds[state.currentPlayerIndex] === myId
    : false;

  const canFlipMin =
    isMyTurn && pendingResult === null && !isMe && activeCards.length >= 1;
  const canFlipMax =
    isMyTurn && pendingResult === null && !isMe && activeCards.length >= 2;

  if (!state) return null;

  return (
    <div style={{ fontFamily: FONT }}>
      {/* セット数 + 手札枚数 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
          fontSize: 11,
          color: C.muted,
          fontWeight: 600,
        }}
      >
        <span>
          <span style={{ color: C.text, fontWeight: 700 }}>{sets.length}</span>{" "}
          セット
        </span>
        <span>
          <span style={{ color: C.text, fontWeight: 700 }}>{hand.length}</span>{" "}
          枚
        </span>
        {/* MIN / MAX ボタン（自分以外のプレイヤーのみ） */}
        {!isMe && (
          <div style={{ display: "flex", gap: 4 }}>
            {(["min", "max"] as const).map((pos) => {
              const enabled = pos === "min" ? canFlipMin : canFlipMax;
              return (
                <button
                  key={pos}
                  className="nana-minmax-btn"
                  disabled={!enabled}
                  onClick={() =>
                    sendMove({
                      type: "flip-hand",
                      targetPlayerId: slotPlayerId,
                      position: pos,
                    })
                  }
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 6px",
                    border: `1px solid ${C.border}`,
                    borderRadius: 4,
                    background: "white",
                    cursor: enabled ? "pointer" : "not-allowed",
                    fontFamily: FONT,
                    color: C.text,
                    opacity: enabled ? 1 : 0.4,
                  }}
                >
                  {pos === "min" ? "最小" : "最大"}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* セットカード表示 */}
      <div style={{ display: "flex", gap: 4, justifyContent: "flex-start" }}>
        {Array.from({ length: 3 }).map((_, i) => {
          const num = sets[i];
          return num !== undefined ? (
            <div
              key={i}
              style={{
                width: 22,
                height: 30,
                borderRadius: 5,
                background: `linear-gradient(135deg, ${playerColor}, ${withAlpha(playerColor, 0.75)})`,
                color: "white",
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: 11,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 2px 6px ${withAlpha(playerColor, 0.3)}`,
              }}
            >
              {num}
            </div>
          ) : (
            <div
              key={i}
              style={{
                width: 22,
                height: 30,
                borderRadius: 5,
                border: `1.5px dashed ${withAlpha(playerColor, 0.45)}`,
                color: withAlpha(playerColor, 0.4),
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              +
            </div>
          );
        })}
      </div>
    </div>
  );
}
