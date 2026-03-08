/**
 * 中央テーブルコンポーネント（回転テーブル）
 */

import type { Card, SonicRestaurantState } from "@bodobako/shared";
import React from "react";
import { Z } from "../../styles/tokens";
import { CardComponent } from "./CardComponent";
import { LAYOUT, styles } from "./constants";

interface CenterTableProps {
  state: SonicRestaurantState;
  lastPlayedCard: Card | null;
}

// カードを重ねて表示するための位置計算（固定値を使用）
function getCardTransform(card: Card, index: number, total: number) {
  if (total === 0) return {};

  // カード名とインデックスから決定論的に角度を生成
  const cardCode = card.charCodeAt(0) + card.charCodeAt(card.length - 1);
  const seed = cardCode * (index + 1) * 37; // 固定のシード値

  // 疑似ランダム値を生成（0-1の範囲）
  const random = (seed % 1000) / 1000;
  const random2 = ((seed * 7) % 1000) / 1000;
  const random3 = ((seed * 13) % 1000) / 1000;

  const angle = (random - 0.5) * 20; // -10度 ~ +10度
  const offsetX = (random2 - 0.5) * 40; // -20px ~ +20px
  const offsetY = (random3 - 0.5) * 40;

  return {
    transform: `rotate(${angle}deg) translate(${offsetX}px, ${offsetY}px)`,
    zIndex: index,
  };
}

export const CenterTable = React.memo(function CenterTable({ state, lastPlayedCard }: CenterTableProps) {
  // 場に表示するカード：playedCardsHistory（すべての出されたカード）
  const displayPath = state.playedCardsHistory;
  // 下部の履歴表示用：currentPath（現在構築中のメニュー）
  const currentPath = state.currentPath;

  return (
    <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden" style={{ backgroundColor: "#fdf2f2" }}>
      {/* 中華風背景パターン */}
      <div
        className="sr-chinese-pattern absolute inset-0 opacity-5 pointer-events-none"
      />

      {/* 回転テーブル */}
      <div style={styles.table}>
        {/* 内側の装飾円 */}
        <div style={styles.tableInnerCircle} />

        {/* 現在構築中のメニューカード */}
        <div className="relative flex flex-col items-center gap-4">
          {/* カードを重ねて表示 */}
          {displayPath.length > 0 ? (
            <div
              style={{
                position: "relative",
                width: `${LAYOUT.cardWidth}px`,  // カード1枚分の幅
                height: `${LAYOUT.cardHeight}px`, // カード1枚分の高さ
              }}
            >
              {displayPath.map((card, index) => (
                <div
                  key={`slot-${index}`}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    ...getCardTransform(card, index, displayPath.length),
                  }}
                >
                  <CardComponent
                    card={card}
                    isNew={lastPlayedCard === card && index === displayPath.length - 1}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-base font-semibold text-center" style={{ color: "#999" }}>
              カードを出してください
            </div>
          )}
        </div>
      </div>

      {/* 下部: 現在のパス履歴（小さく表示） */}
      {currentPath.length > 0 && (
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1 px-3 py-2 bg-white/95 rounded-lg border-2 border-gray-200 shadow"
          style={{ zIndex: Z.srTableCard }}
        >
          {currentPath.map((card, index) => (
            <CardComponent key={`history-${index}`} card={card} size="small" hideLogo />
          ))}
        </div>
      )}
    </div>
  );
});
