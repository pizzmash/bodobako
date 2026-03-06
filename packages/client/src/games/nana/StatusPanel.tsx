import type { NanaStateView } from "@bodobako/shared";
import { C, FONT } from "./constants";

export function StatusPanel({
  state,
  playerId,
  currentPlayerName,
}: {
  state: NanaStateView;
  playerId: string;
  currentPlayerName: string;
}) {
  const isMyTurn = state.playerIds[state.currentPlayerIndex] === playerId;
  const flipCount = state.turnFlips.length;

  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: C.muted,
          marginBottom: 8,
        }}
      >
        現在の状況
      </div>
      <div
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: `1px solid ${isMyTurn ? C.primaryBorder : C.border}`,
          background: isMyTurn ? C.primaryLight : "rgba(248,247,245,0.8)",
        }}
      >
        {isMyTurn ? (
          <>
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.primary,
                margin: "0 0 4px",
                fontFamily: FONT,
              }}
            >
              あなたの番です
            </p>
            <p
              style={{
                fontSize: 11,
                color: "#64748b",
                lineHeight: 1.5,
                margin: "0 0 6px",
                fontFamily: FONT,
              }}
            >
              {flipCount === 0
                ? "場か誰かの手札から1枚選んでください"
                : flipCount === 1
                  ? "もう1枚めくってください（同じ数字を狙おう）"
                  : "あと1枚！3枚揃えてセット獲得！"}
            </p>
            <p
              style={{
                fontSize: 11,
                color: C.primary,
                margin: 0,
                fontWeight: 600,
                fontFamily: FONT,
              }}
            >
              めくり: {flipCount} / 3
            </p>
          </>
        ) : (
          <>
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.text,
                margin: "0 0 4px",
                fontFamily: FONT,
              }}
            >
              {currentPlayerName} の番
            </p>
            <p style={{ fontSize: 11, color: "#64748b", margin: 0, fontFamily: FONT }}>
              めくり: {flipCount} / 3
            </p>
          </>
        )}
      </div>
    </div>
  );
}
