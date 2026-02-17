import { memo } from "react";
import type { AiueBattleState } from "@bodobako/shared";
import type { RoomInfo, GameResult } from "@bodobako/shared";
import { C, PLAYER_COLORS, styles, SPACING, RADIUS, SHADOWS } from "./constants";

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
              transform: "scale(1.02)",
              boxShadow: `0 8px 24px ${accentColor}40, 0 4px 8px rgba(0,0,0,0.08)`,
            }
          : {}),
        ...(isMe && !elim
          ? { 
              background: `${accentColor}08`,
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
            background: elim ? C.gray400 : accentColor,
            marginRight: SPACING.sm,
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
              marginLeft: SPACING.sm, 
              fontSize: "0.65rem", 
              background: C.primary, 
              color: C.textMain,
              padding: `${SPACING.xs} ${SPACING.md}`,
              borderRadius: RADIUS.full,
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              border: `2px solid ${C.border}`,
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
          let borderColor: string = C.border;
          let boxShadow: string = "none";
          
          // 新しく公開された文字を強調（ゲーム終了時の公開は除く）
          if (isNew) {
            bg = C.primary;
            textColor = C.textMain;
            borderStyle = "solid";
            borderColor = C.primary;
            boxShadow = `0 4px 12px ${C.primary}40`;
          } else if (isMe) {
            // 自分の単語の場合
            if (revealed === "end") {
              // ゲーム終了で公開：薄いグレー（当てられなかった文字）
              bg = C.gray100;
              textColor = C.textSub;
              borderStyle = "solid";
              borderColor = C.border;
            } else if (revealed) {
              // 攻撃で公開済み：テーマカラーで統一
              bg = C.primary;
              textColor = C.textMain;
              borderStyle = "solid";
              borderColor = C.primary;
              boxShadow = `0 4px 12px ${C.primary}40`;
            } else {
              // 未公開：白背景で破線
              bg = C.bgCard;
              textColor = C.textMain;
              borderStyle = "dashed";
              borderColor = C.border;
            }
          } else if (revealed === "end") {
            // 他人のゲーム終了で公開された文字（当てられなかった）
            bg = C.gray100;
            borderStyle = "solid";
            borderColor = C.border;
            textColor = C.textSub;
          } else if (revealed) {
            // 他人の攻撃で公開された文字（当てられた）：薄いイエロー
            bg = C.primaryLight;
            borderStyle = "solid";
            borderColor = C.primary;
            textColor = C.textMain;
            boxShadow = SHADOWS.sm;
          } else {
            // 他人の未公開文字
            textColor = C.textSub;
          }
          
          return (
            <div
              key={i}
              style={{
                width: "40px",
                height: "40px",
                border: `2px ${borderStyle} ${borderColor}`,
                borderRadius: RADIUS.sm,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.15rem",
                fontWeight: 800,
                background: bg,
                color: textColor,
                transition: "all .3s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: boxShadow,
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
