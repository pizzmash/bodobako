/**
 * 手札コンポーネント（下部固定エリア）
 */

import type { Card, SonicRestaurantState } from "@bodobako/shared";
import { canPlayCard } from "@bodobako/shared";
import { useEffect, useRef, useState } from "react";
import { CardComponent } from "./CardComponent";
import { styles } from "./constants";

interface HandCardsProps {
  state: SonicRestaurantState;
  playerId: string;
  onCardPlay: (card: Card, index: number) => void;
}

export function HandCards({ state, playerId, onCardPlay }: HandCardsProps) {
  const myHand = state.hands[playerId] || [];
  const isFinished = state.finishedOrder.includes(playerId);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // スクロール可能状態を更新
  const updateScrollButtons = () => {
    if (!scrollRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  // 初期表示とカード枚数変更時にスクロール状態を更新
  useEffect(() => {
    updateScrollButtons();
    const handleResize = () => updateScrollButtons();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [myHand.length]);

  // スクロール処理
  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 300;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <footer style={styles.handContainer}>
      {/* 手札ラベル */}
      <div style={styles.handLabel}>自分の手札</div>

      {/* 左スクロールボタン */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          style={{
            position: "absolute",
            left: "0.5rem",
            top: "50%",
            transform: "translateY(-50%)",
            width: "3rem",
            height: "3rem",
            borderRadius: "50%",
            border: "2px solid #d74242",
            background: "rgba(255, 255, 255, 0.95)",
            color: "#d74242",
            fontSize: "1.5rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
            zIndex: 60,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#d74242";
            e.currentTarget.style.color = "#ffffff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.95)";
            e.currentTarget.style.color = "#d74242";
          }}
        >
          ‹
        </button>
      )}

      {/* 右スクロールボタン */}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          style={{
            position: "absolute",
            right: "0.5rem",
            top: "50%",
            transform: "translateY(-50%)",
            width: "3rem",
            height: "3rem",
            borderRadius: "50%",
            border: "2px solid #d74242",
            background: "rgba(255, 255, 255, 0.95)",
            color: "#d74242",
            fontSize: "1.5rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
            zIndex: 60,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#d74242";
            e.currentTarget.style.color = "#ffffff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.95)";
            e.currentTarget.style.color = "#d74242";
          }}
        >
          ›
        </button>
      )}

      {/* カードリスト（横スクロール） */}
      <div
        ref={scrollRef}
        style={styles.handScroll}
        className="sr-hand-scroll"
        onScroll={updateScrollButtons}
      >
        {myHand.map((card, index) => {
          // カードが出せるか判定
          const canPlay = !isFinished && canPlayCard(state, card);

          return (
            <CardComponent
              key={`${card}-${index}`}
              card={card}
              onClick={() => onCardPlay(card, index)}
              disabled={!canPlay}
            />
          );
        })}

        {myHand.length === 0 && (
          <div
            style={{
              padding: "2rem",
              fontSize: "1rem",
              color: "#999",
              fontWeight: 600,
            }}
          >
            {isFinished ? "上がりました！" : "手札がありません"}
          </div>
        )}
      </div>
    </footer>
  );
}
