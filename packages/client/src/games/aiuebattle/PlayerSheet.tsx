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
        borderLeftColor: accentColor,
        ...(elim
          ? { animation: "ab-eliminate .5s ease-out forwards", filter: "grayscale(1)" }
          : {}),
        ...(isCurrent && !gameResult
          ? { 
              animation: "ab-glowPulse 2s ease-in-out infinite",
              transform: "scale(1.03)",
              boxShadow: `0 12px 32px ${accentColor}40, 0 4px 12px rgba(0,0,0,0.08)`,
            }
          : {}),
        ...(isMe && !elim
          ? { 
              background: `linear-gradient(145deg, ${accentColor}08, ${accentColor}03)`,
            }
          : {}),
      }}
    >
      <div style={styles.sheetName}>
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: elim ? C.textSub : accentColor,
            marginRight: 8,
            border: `2px solid ${C.border}`,
          }}
        />
        <span style={{ fontWeight: 700, color: C.textMain }}>
          {player?.name ?? "?"}
        </span>{" "}
        {elim && (
          <span style={{ color: C.textSub, fontWeight: 400 }}>（脱落）</span>
        )}
        {isCurrent && !gameResult && (
          <span 
            style={{ 
              marginLeft: 8, 
              fontSize: "0.65rem", 
              background: "linear-gradient(135deg, #f4d125, #ffbc42)", 
              color: "#fff",
              padding: "0.3rem 0.75rem",
              borderRadius: "12px",
              fontWeight: 900,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              boxShadow: "0 2px 6px rgba(244,209,37,0.3)",
            }}
          >
            Target
          </span>
        )}
      </div>
      <div style={styles.sheetCells}>
        {word?.map((c, i) => {
          const revealed = rev?.[i];
          const isNew = newlyRevealed.has(`${pid}-${i}`) && revealed !== "end";
          let bg: string = "transparent";
          let textColor: string = C.textMain;
          let borderStyle: string = "dashed";
          let borderColor: string = "rgba(0,0,0,0.15)";
          
          // 新しく公開された文字を強調（ゲーム終了時の公開は除く）
          if (isNew) {
            bg = "linear-gradient(135deg, #06d6a0, #4ade80)";
            textColor = "#fff";
            borderStyle = "solid";
            borderColor = "#06d6a0";
          } else if (isMe) {
            // 自分の単語の場合
            if (revealed === "end") {
              // ゲーム終了で公開：薄いグレー（当てられなかった文字）
              bg = "linear-gradient(145deg, #f5f5f5, #e5e5e5)";
              textColor = C.textSub;
              borderStyle = "solid";
              borderColor = "rgba(0,0,0,0.15)";
            } else if (revealed) {
              // 攻撃で公開済み：赤っぽい背景で強調
              bg = "linear-gradient(135deg, #ff8a9b, #ffadb8)";
              textColor = "#fff";
              borderStyle = "solid";
              borderColor = "#ff5c8d";
            } else {
              // 未公開：白背景で破線
              bg = "linear-gradient(145deg, #ffffff, #f9f9f9)";
              textColor = C.textMain;
              borderStyle = "dashed";
              borderColor = "rgba(0,0,0,0.2)";
            }
          } else if (revealed === "end") {
            // 他人のゲーム終了で公開された文字（当てられなかった）
            bg = "linear-gradient(145deg, #f5f5f5, #e5e5e5)";
            borderStyle = "solid";
            borderColor = "rgba(0,0,0,0.15)";
            textColor = C.textSub;
          } else if (revealed) {
            // 他人の攻撃で公開された文字（当てられた）
            bg = "linear-gradient(145deg, #ffffff, #f9f9f9)";
            borderStyle = "solid";
            borderColor = "rgba(0,0,0,0.08)";
            textColor = C.textMain;
          } else {
            // 他人の未公開文字
            textColor = C.textSub;
          }
          
          return (
            <div
              key={i}
              style={{
                width: "42px",
                height: "42px",
                border: `2px ${borderStyle} ${borderColor}`,
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.15rem",
                fontWeight: 800,
                background: bg,
                color: textColor,
                transition: "all .3s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: isNew 
                  ? "0 4px 16px rgba(6,214,160,0.5), 0 2px 8px rgba(0,0,0,0.1)"
                  : (isMe && revealed === true)
                    ? "0 3px 10px rgba(255,92,141,0.4), 0 1px 4px rgba(0,0,0,0.08)"
                    : (revealed && revealed !== "end") 
                      ? "0 2px 6px rgba(0,0,0,0.08)" 
                      : revealed === "end"
                        ? "inset 0 1px 3px rgba(0,0,0,0.15)"
                        : (isMe)
                          ? "0 2px 6px rgba(0,0,0,0.08)"
                          : "none",
                ...(isNew
                  ? { animation: "ab-reveal .4s ease-out, ab-celebrate 0.6s ease-out" }
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
