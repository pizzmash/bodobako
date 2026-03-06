/**
 * プレイヤー情報パネル
 * 全プレイヤーの担当色・残マス数・手番を表示する。
 * 2人戦では1プレイヤーが2色を持つ。
 */

import type { BlokusState, RoomInfo } from "@bodobako/shared";
import { computeRemainingCells, getCurrentPlayerId } from "@bodobako/shared";
import { BLOKUS_COLORS, SURFACE, SURFACE_BORDER, TEXT_MUTED, TEXT_PRIMARY } from "./constants";

interface BlokusPlayerInfoProps {
  state: BlokusState;
  playerId: string;
  room: RoomInfo;
}

export function BlokusPlayerInfo({ state, playerId, room }: BlokusPlayerInfoProps) {
  const currentTurnPlayerId = getCurrentPlayerId(state);

  return (
    <div style={styles.container}>
      {room.players.map((player) => {
        const isMe = player.id === playerId;
        const isCurrentTurn = !state.finished && player.id === currentTurnPlayerId;

        // state.playerIds の順序が colorOwner のインデックス基準なので、そちらで引く
        const playerIndex = state.playerIds.indexOf(player.id);

        // 自担当色のみ表示（フリーカラーはパレットに表示するのでここでは出さない）
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

        // 自分のカード背景: 担当色ベース（1色=そのままtint、2色=グラデーション）
        let cardBg = "rgba(255,255,255,0.88)";
        if (isMe && displayColors.length >= 1) {
          const fills = displayColors.map((c) => BLOKUS_COLORS[c].fill);
          cardBg = fills.length === 1
            ? `${fills[0]}16`
            : `linear-gradient(135deg, ${fills[0]}1c 0%, ${fills[1]}1c 100%)`;
        }

        return (
          <div
            key={player.id}
            className="blk-player-card"
            style={{
              ...styles.card,
              border: isCurrentTurn
                ? `1.5px solid ${BLOKUS_COLORS[state.currentColorIndex].fill}`
                : `1.5px solid ${SURFACE_BORDER}`,
              boxShadow: isCurrentTurn
                ? `0 0 12px ${BLOKUS_COLORS[state.currentColorIndex].fill}55, 0 2px 8px rgba(0,0,0,0.08)`
                : "0 2px 8px rgba(100,120,180,0.1), 0 1px 3px rgba(0,0,0,0.05)",
              opacity: isEliminated ? 0.35 : 1,
              background: cardBg,
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

            {/* 名前 + スコア */}
            <div style={styles.nameArea}>
              <span style={styles.name}>
                {player.name}
                {isMe && <span style={styles.meLabel}> (あなた)</span>}
              </span>
              {/* 色ごとの残りマス数 */}
              <div style={styles.scoreRow}>
                {remainingPerColor.map((rc) => {
                  const accentColor = BLOKUS_COLORS[rc.colorIndex].fill;
                  return (
                    <span
                      key={rc.colorIndex}
                      style={{
                        ...styles.scoreItem,
                        opacity: rc.isEliminated ? 0.35 : 1,
                      }}
                    >
                      <span
                        style={{
                          ...styles.scoreDot,
                          background: accentColor,
                        }}
                      />
                      <span style={styles.scoreNum}>
                        {rc.remaining}マス
                      </span>
                    </span>
                  );
                })}
              </div>
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
    gap: "0.5rem",
    padding: "0.45rem 0.8rem",
    borderRadius: 12,
    backdropFilter: "blur(12px)",
    minWidth: 130,
    transition: "border-color 0.2s, opacity 0.3s, box-shadow 0.2s",
    boxShadow: "0 2px 8px rgba(100,120,180,0.1), 0 1px 3px rgba(0,0,0,0.05)",
  },
  turnDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  nameArea: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  },
  name: {
    fontSize: "0.82rem",
    fontWeight: 600,
    color: TEXT_PRIMARY,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  meLabel: {
    fontSize: "0.7rem",
    color: TEXT_MUTED,
    fontWeight: 400,
  },
  scoreRow: {
    display: "flex",
    gap: "0.4rem",
    flexWrap: "wrap" as const,
    alignItems: "center",
  },
  scoreItem: {
    display: "flex",
    alignItems: "center",
    gap: 3,
  },
  scoreDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    flexShrink: 0,
    display: "inline-block",
  },
  scoreNum: {
    fontSize: "0.7rem",
    color: TEXT_MUTED,
  },
};
