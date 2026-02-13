import { memo } from "react";
import type { AiueBattleState } from "@bodobako/shared";
import type { RoomInfo, GameResult } from "@bodobako/shared";
import { C, PLAYER_COLORS, styles } from "./constants";

interface PlayerSheetProps {
  pid: string;
  pi: number;
  state: AiueBattleState;
  room: RoomInfo;
  playerId: string;
  newlyRevealed: Set<string>;
  gameResult: GameResult | null;
}

export const PlayerSheet = memo(function PlayerSheet({
  pid,
  pi,
  state,
  room,
  playerId,
  newlyRevealed,
  gameResult,
}: PlayerSheetProps) {
  const player = room.players.find((p) => p.id === pid);
  const word = state.words[pid];
  const rev = state.revealed[pid];
  const elim = state.eliminatedPlayers.includes(pid);
  const isMe = pid === playerId;
  const isCurrent = state.playerIds[state.currentPlayerIndex] === pid && !state.finished;
  const accentColor = PLAYER_COLORS[pi % PLAYER_COLORS.length];

  return (
    <div
      style={{
        ...styles.sheet,
        borderLeft: `4px solid ${accentColor}`,
        ...(elim
          ? { animation: "ab-eliminate .5s ease-out forwards" }
          : {}),
        ...(isCurrent && !gameResult
          ? { animation: "ab-glowPulse 2s ease-in-out infinite" }
          : {}),
        ...(isMe && !elim
          ? { background: "#f0f4ff" }
          : {}),
      }}
    >
      <div style={styles.sheetName}>
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: elim ? C.textSub : accentColor,
            marginRight: 6,
          }}
        />
        {player?.name ?? "?"}{" "}
        {elim && (
          <span style={{ color: C.textSub, fontWeight: 400 }}>（脱落）</span>
        )}
        {isCurrent && !gameResult && (
          <span style={{ marginLeft: 4, fontSize: "0.75rem", color: C.primary }}>
            ◀ ターン
          </span>
        )}
      </div>
      <div style={styles.sheetCells}>
        {word?.map((c, i) => {
          const revealed = rev?.[i];
          const isNew = newlyRevealed.has(`${pid}-${i}`);
          let bg: string = "#f5f5f5";
          let borderClr: string = C.border;
          if (isMe) {
            bg = revealed ? C.hitBg : "#e8f0fe";
            borderClr = revealed ? C.hit : C.primary;
          } else if (revealed === "end") {
            bg = c === "×" ? "#f5f5f5" : "#e8e8e8";
            borderClr = c === "×" ? C.borderDark : "#bbb";
          } else if (revealed) {
            bg = c === "×" ? "#f5f5f5" : "#fffbe6";
            borderClr = c === "×" ? C.borderDark : C.warning;
          }
          return (
            <div
              key={i}
              style={{
                ...styles.sheetCell,
                background: bg,
                borderColor: borderClr,
                color: isMe && !revealed ? C.textSub : C.textMain,
                ...(isNew
                  ? { animation: "ab-reveal .4s ease-out" }
                  : {}),
              }}
            >
              {isMe ? c : revealed ? c : "?"}
            </div>
          );
        })}
      </div>
    </div>
  );
});
