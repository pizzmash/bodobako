/**
 * 中央テーブルコンポーネント（回転テーブル）
 */

import type { Card, SonicRestaurantState } from "@bodobako/shared";
import { CardComponent } from "./CardComponent";
import { styles } from "./constants";

interface CenterTableProps {
  state: SonicRestaurantState;
  lastPlayedCard: Card | null;
}

export function CenterTable({ state, lastPlayedCard }: CenterTableProps) {
  const currentPath = state.currentPath;

  // カードを重ねて表示するための位置計算
  const getCardTransform = (index: number, total: number) => {
    if (total === 0) return {};
    
    // ランダムな角度と位置でカードを少しずらす
    const angle = (Math.random() - 0.5) * 20; // -10度 ~ +10度
    const offsetX = (Math.random() - 0.5) * 40; // -20px ~ +20px
    const offsetY = (Math.random() - 0.5) * 40;
    
    return {
      transform: `rotate(${angle}deg) translate(${offsetX}px, ${offsetY}px)`,
      zIndex: index,
    };
  };

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
          {currentPath.length > 0 ? (
            <div
              style={{
                position: "relative",
                display: "flex",
                gap: "0.5rem",
              }}
            >
              {currentPath.map((card, index) => (
                <div
                  key={`${card}-${index}`}
                  style={{
                    position: index === 0 ? "relative" : "absolute",
                    left: index === 0 ? 0 : `${index * 20}px`,
                    ...getCardTransform(index, currentPath.length),
                  }}
                >
                  <CardComponent
                    card={card}
                    isNew={lastPlayedCard === card && index === currentPath.length - 1}
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
            bottom: "3rem",
            display: "flex",
            gap: "0.25rem",
            opacity: 0.4,
            transform: "scale(0.75)",
          }}
        >
          {currentPath.map((card, index) => (
            <CardComponent key={`history-${index}`} card={card} size="small" />
          ))}
        </div>
      )}
    </div>
  );
}
