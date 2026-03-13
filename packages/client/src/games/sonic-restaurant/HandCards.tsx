/**
 * 手札コンポーネント（下部固定エリア）
 */

import type { Card, SonicRestaurantState } from "@bodobako/shared";
import { canPlayCard } from "@bodobako/shared";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { MOBILE_TAB_BAR_HEIGHT } from "../../lib/constants";
import { Z } from "../../styles/tokens";
import { useIsMobile } from "../../hooks/useIsMobile";
import { CardComponent } from "./CardComponent";
import { styles } from "./constants";

interface HandCardsProps {
  state: SonicRestaurantState;
  playerId: string;
  onCardPlay: (card: Card, index: number) => void;
}

export const HandCards = React.memo(function HandCards({ state, playerId, onCardPlay }: HandCardsProps) {
  const myHand = state.hands[playerId] || [];
  const isFinished = state.finishedOrder.includes(playerId);
  const isMobile = useIsMobile();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // スクロール可能状態を更新
  const updateScrollButtons = useCallback(() => {
    if (!scrollRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  // 初期表示とカード枚数変更時にスクロール状態を更新
  useEffect(() => {
    updateScrollButtons();
    window.addEventListener("resize", updateScrollButtons);
    return () => window.removeEventListener("resize", updateScrollButtons);
  }, [myHand.length, updateScrollButtons]);

  // スクロール処理
  const scroll = useCallback((direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 300;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  }, []);

  return (
    <footer
      style={{
        ...styles.handContainer,
        bottom: isMobile ? MOBILE_TAB_BAR_HEIGHT : 0,
        zIndex: Z.srHandArea,
      }}
    >
      {/* 手札ラベル */}
      <div style={styles.handLabel}>自分の手札</div>

      {/* 左スクロールボタン */}
      {canScrollLeft && (
        <button
          type="button"
          className="sr-scroll-btn absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full text-2xl cursor-pointer flex items-center justify-center"
          onClick={() => scroll("left")}
          style={{
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
            zIndex: Z.srScrollBtn,
          }}
        >
          ‹
        </button>
      )}

      {/* 右スクロールボタン */}
      {canScrollRight && (
        <button
          type="button"
          className="sr-scroll-btn absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full text-2xl cursor-pointer flex items-center justify-center"
          onClick={() => scroll("right")}
          style={{
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
            zIndex: Z.srScrollBtn,
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
          <div className="p-8 text-base font-semibold" style={{ color: "#999" }}>
            {isFinished ? "上がりました！" : "手札がありません"}
          </div>
        )}
      </div>
    </footer>
  );
});
