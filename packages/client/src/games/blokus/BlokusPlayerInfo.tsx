/**
 * プレイヤー情報パネル
 * 全プレイヤーの担当色・残マス数・手番を表示する。
 * 2人戦では1プレイヤーが2色を持つ。
 */

import type { BlokusState, RoomInfo } from "@bodobako/shared";
import { PIECES, computeRemainingCells, getCurrentPlayerId } from "@bodobako/shared";
import { BLOKUS_COLORS } from "./constants";
import "./blokus.css";

interface BlokusPlayerInfoProps {
  state: BlokusState;
  playerId: string;
  room: RoomInfo;
}

export function BlokusPlayerInfo({ state, playerId, room }: BlokusPlayerInfoProps) {
  const currentTurnPlayerId = getCurrentPlayerId(state);

  return (
    <div style={styles.container}>
      {room.players.map((player, playerIndex) => {
        const isMe = player.id === playerId;
        const isCurrentTurn = !state.finished && player.id === currentTurnPlayerId;

        // このプレイヤーが担当する色インデックス一覧
        const ownedColors = ([0, 1, 2, 3] as const).filter((c) => {
          if (state.colorOwner[c] === playerIndex) return true;
          // 3人戦フリーカラー: 現在担当しているプレイヤー
          if (
            state.colorOwner[c] === -1 &&
            state.currentColorIndex === c &&
            state.freeColorNextPlayer === playerIndex
          )
            return true;
          return false;
        });

        // 2人戦: colorOwner が [0,1,0,1] → フリーカラーなしで正しく取得できる
        // 3人戦: color3 (free) は currentColorIndex===3 の時だけ表示
        // それ以外の時は自分が担当しているものだけ表示
        const displayColors = ([0, 1, 2, 3] as const).filter(
          (c) => state.colorOwner[c] === playerIndex,
        );

        const remainingPerColor = displayColors.map((c) => ({
          colorIndex: c,
          remaining: computeRemainingCells(state, c),
          isActive: state.currentColorIndex === c && isCurrentTurn,
          isEliminated: state.eliminated[c],
        }));

        const isEliminated = displayColors.length > 0 && displayColors.every((c) => state.eliminated[c]);

        return (
          <div
            key={player.id}
            style={{
              ...styles.card,
              border: isCurrentTurn
                ? `2px solid ${BLOKUS_COLORS[state.currentColorIndex].fill}`
                : "2px solid transparent",
              opacity: isEliminated ? 0.4 : 1,
              background: isMe ? "#eff6ff" : "#fff",
            }}
          >
            {/* 手番パルスドット */}
            {isCurrentTurn && (
              <div
                className="blk-turn-dot"
                style={{
                  ...styles.turnDot,
                  background: BLOKUS_COLORS[state.currentColorIndex].fill,
                }}
              />
            )}

            {/* 色スウォッチ */}
            <div style={styles.swatches}>
              {displayColors.map((c) => (
                <div
                  key={c}
                  style={{
                    ...styles.swatch,
                    background: BLOKUS_COLORS[c].fill,
                    outline:
                      state.currentColorIndex === c && isCurrentTurn
                        ? "2px solid #111"
                        : "none",
                    outlineOffset: "1px",
                    opacity: state.eliminated[c] ? 0.4 : 1,
                  }}
                />
              ))}
              {/* 3人戦フリーカラー表示 */}
              {state.colorOwner[3] === -1 && (
                <div
                  title="フリーカラー（3人で共有）"
                  style={{
                    ...styles.swatch,
                    background: BLOKUS_COLORS[3].fill,
                    outline:
                      state.currentColorIndex === 3 && isCurrentTurn
                        ? "2px solid #111"
                        : "1px dashed rgba(0,0,0,0.3)",
                    outlineOffset: "1px",
                    opacity: state.eliminated[3] ? 0.4 : 0.7,
                  }}
                />
              )}
            </div>

            {/* 名前 + スコア */}
            <div style={styles.nameArea}>
              <span style={styles.name}>
                {player.name}
                {isMe && <span style={styles.meLabel}> (あなた)</span>}
              </span>
              <span style={styles.score}>
                {remainingPerColor.map((rc) => `${rc.remaining}マス`).join(" / ")}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.4rem",
    justifyContent: "center",
    width: "100%",
    maxWidth: 680,
  },
  card: {
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
    padding: "0.4rem 0.7rem",
    borderRadius: 10,
    boxShadow: "0 1px 4px rgba(0,0,0,0.09)",
    minWidth: 130,
    transition: "border-color 0.2s, opacity 0.3s",
  },
  turnDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  swatches: {
    display: "flex",
    gap: 3,
    flexShrink: 0,
  },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 3,
    flexShrink: 0,
  },
  nameArea: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
    minWidth: 0,
  },
  name: {
    fontSize: "0.82rem",
    fontWeight: 600,
    color: "#111",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  meLabel: {
    fontSize: "0.72rem",
    color: "#6b7280",
    fontWeight: 400,
  },
  score: {
    fontSize: "0.72rem",
    color: "#6b7280",
  },
};
