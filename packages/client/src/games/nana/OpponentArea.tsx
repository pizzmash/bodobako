import type { NanaStateView } from "@bodobako/shared";
import { withAlpha } from "../../lib/color";
import { C, FONT } from "./constants";

export function OpponentArea({
  pid,
  name,
  state,
  isMyTurn,
  onFlip,
  isCurrentPlayer,
  playerColor,
}: {
  pid: string;
  name: string;
  state: NanaStateView;
  isMyTurn: boolean;
  onFlip: (pos: "min" | "max") => void;
  isCurrentPlayer: boolean;
  playerColor: string;
}) {
  const hand = state.hands[pid] ?? [];
  const pendingResult = state.pendingResult ?? null;
  const flippedIds = state.turnFlips.map((f) => f.cardId);
  const activeCards = hand.filter((c) => !flippedIds.includes(c.id));
  const hasMin = activeCards.length > 0;
  const hasMax = activeCards.length > 0;
  const sets = state.collectedSets[pid] ?? [];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 6,
        padding: "10px",
        borderRadius: 14,
        border: `1px solid ${isCurrentPlayer ? withAlpha(playerColor, 0.45) : withAlpha(playerColor, 0.22)}`,
        background: isCurrentPlayer
          ? `linear-gradient(135deg, ${withAlpha(playerColor, 0.22)} 0%, ${C.card} 75%)`
          : `linear-gradient(135deg, ${withAlpha(playerColor, 0.09)} 0%, ${C.card} 70%)`,
        boxShadow: isCurrentPlayer
          ? `0 0 0 2px ${withAlpha(playerColor, 0.16)}, 0 10px 24px ${withAlpha(playerColor, 0.22)}`
          : `0 4px 14px ${withAlpha(playerColor, 0.12)}`,
        minWidth: 118,
      }}
    >
      {/* 1行目: 名前 / MIN MAX / 枚数 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          fontSize: 12,
          fontWeight: 600,
          color: C.text,
          fontFamily: FONT,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
          <span
            className={`nana-player-dot${isCurrentPlayer ? " active" : ""}`}
            aria-hidden="true"
            style={{
              color: playerColor,
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "currentColor",
              boxShadow: `0 0 0 3px ${withAlpha(playerColor, 0.2)}`,
              flexShrink: 0,
            }}
          />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name}
          </span>
        </div>

        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {(["min", "max"] as const).map((pos) => {
            const enabled = isMyTurn && pendingResult === null && (pos === "min" ? hasMin : hasMax);
            return (
              <button
                key={pos}
                className="nana-minmax-btn"
                disabled={!enabled}
                onClick={() => onFlip(pos)}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "3px 7px",
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                  background: "white",
                  cursor: enabled ? "pointer" : "not-allowed",
                  fontFamily: FONT,
                  color: C.text,
                }}
              >
                {pos === "min" ? "最小" : "最大"}
              </button>
            );
          })}
        </div>

        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: withAlpha(playerColor, 0.95),
            background: withAlpha(playerColor, 0.12),
            border: `1px solid ${withAlpha(playerColor, 0.35)}`,
            borderRadius: 999,
            padding: "1px 7px",
            flexShrink: 0,
          }}
        >
          {hand.length}枚
        </span>
      </div>

      <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 2 }}>
        {Array.from({ length: 3 }).map((_, i) => {
          const num = sets[i];
          return num !== undefined ? (
            <div
              key={i}
              style={{
                width: 26,
                height: 34,
                borderRadius: 6,
                background: `linear-gradient(135deg, ${playerColor}, ${withAlpha(playerColor, 0.75)})`,
                color: "white",
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 2px 8px ${withAlpha(playerColor, 0.3)}`,
              }}
            >
              {num}
            </div>
          ) : (
            <div
              key={i}
              style={{
                width: 26,
                height: 34,
                borderRadius: 6,
                border: `1.5px dashed ${withAlpha(playerColor, 0.45)}`,
                color: withAlpha(playerColor, 0.4),
                fontSize: 14,
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
