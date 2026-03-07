/**
 * 中央テーブルコンポーネント（回転テーブル）
 */

import React from "react";
import type { Card, SonicRestaurantState } from "@bodobako/shared";
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
    <div style={styles.centerContainer}>
      {/* 中華風背景パターン */}
      <div
        className="sr-chinese-pattern"
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.05,
          pointerEvents: "none",
        }}
      />

      {/* 回転テーブル */}
      <div style={styles.table}>
        {/* 内側の装飾円 */}
        <div style={styles.tableInnerCircle} />

        {/* 現在構築中のメニューカード */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
          }}
        >
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
            <div
              style={{
                fontSize: "1rem",
                color: "#999",
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              カードを出してください
            </div>
          )}
        </div>
      </div>

      {/* 下部: 現在のパス履歴（小さく表示） */}
      {currentPath.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: "1.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "0.25rem",
            padding: "0.5rem 0.75rem",
            background: "rgba(255, 255, 255, 0.95)",
            borderRadius: "0.5rem",
            border: "2px solid #e5e7eb",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
            zIndex: 15,
          }}
        >
          {currentPath.map((card, index) => (
            <CardComponent key={`history-${index}`} card={card} size="small" hideLogo />
          ))}
        </div>
      )}
    </div>
  );
});
