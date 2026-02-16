/**
 * 手札コンポーネント（下部固定エリア）
 */

import type { Card, SonicRestaurantState } from "@bodobako/shared";
import { canPlayCard } from "@bodobako/shared";
import { CardComponent } from "./CardComponent";
import { styles } from "./constants";

interface HandCardsProps {
  state: SonicRestaurantState;
  playerId: string;
  onCardPlay: (card: Card) => void;
}

export function HandCards({ state, playerId, onCardPlay }: HandCardsProps) {
  const myHand = state.hands[playerId] || [];
  const isFinished = state.finishedOrder.includes(playerId);

  return (
    <footer style={styles.handContainer}>
      {/* 手札ラベル */}
      <div style={styles.handLabel}>自分の手札</div>

      {/* カードリスト（横スクロール） */}
      <div style={styles.handScroll} className="sr-hand-scroll">
        {myHand.map((card, index) => {
          // カードが出せるか判定
          const canPlay = !isFinished && canPlayCard(state, card);

          return (
            <CardComponent
              key={`${card}-${index}`}
              card={card}
              onClick={() => onCardPlay(card)}
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
