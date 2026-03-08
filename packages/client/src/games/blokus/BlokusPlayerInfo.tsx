/**
 * プレイヤー情報パネル
 * 全プレイヤーの担当色・残マス数・手番を表示する。
 * 2人戦では1プレイヤーが2色を持つ。
 */

import type { BlokusState, RoomInfo } from "@bodobako/shared";
import { computeRemainingCells, getCurrentPlayerId } from "@bodobako/shared";
import { memo } from "react";
import { BLOKUS_COLORS, SURFACE_BORDER, TEXT_MUTED, TEXT_PRIMARY } from "./constants";

interface BlokusPlayerInfoProps {
  state: BlokusState;
  playerId: string;
  room: RoomInfo;
}

export const BlokusPlayerInfo = memo(function BlokusPlayerInfo({ state, playerId, room }: BlokusPlayerInfoProps) {
  const currentTurnPlayerId = getCurrentPlayerId(state);

  return (
    <div className="flex flex-wrap gap-[0.4rem] justify-center w-full max-w-[680px]">
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
            className="blk-player-card blk-player-card-base"
            style={{
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
                className="blk-turn-dot w-2 h-2 rounded-full shrink-0"
                style={{ background: BLOKUS_COLORS[state.currentColorIndex].fill }}
              />
            )}

            {/* 名前 + スコア */}
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[0.82rem] font-semibold truncate" style={{ color: TEXT_PRIMARY }}>
                {player.name}
                {isMe && <span className="text-[0.7rem] font-normal" style={{ color: TEXT_MUTED }}> (あなた)</span>}
              </span>
              {/* 色ごとの残りマス数 */}
              <div className="flex gap-[0.4rem] flex-wrap items-center">
                {remainingPerColor.map((rc) => {
                  const accentColor = BLOKUS_COLORS[rc.colorIndex].fill;
                  return (
                    <span
                      key={rc.colorIndex}
                      className="flex items-center gap-[3px]"
                      style={{ opacity: rc.isEliminated ? 0.35 : 1 }}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-[2px] shrink-0"
                        style={{ background: accentColor }}
                      />
                      <span className="text-[0.7rem]" style={{ color: TEXT_MUTED }}>
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
});
