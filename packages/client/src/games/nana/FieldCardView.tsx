import type { NanaStateView } from "@bodobako/shared";
import { PlayingCard } from "../../components/PlayingCard";
import { C, FONT } from "./constants";
import type { CardView } from "./types";

export function findVisibleCardNumber(state: NanaStateView, cardId: number): number | null {
  for (const c of state.fieldCards) {
    if (c?.id === cardId) return c.number;
  }
  for (const hand of Object.values(state.hands)) {
    const c = hand.find((h) => h.id === cardId);
    if (c) return c.number;
  }
  return null;
}

export function FieldCardView({
  card,
  clickable,
  w,
  h,
  onClick,
}: {
  card: CardView | null;
  clickable: boolean;
  w: number;
  h: number;
  onClick?: () => void;
}) {
  if (card === null) {
    return (
      <div
        style={{
          width: w,
          height: h,
          border: `2px dashed ${C.border}`,
          borderRadius: 8,
          opacity: 0.35,
        }}
      />
    );
  }

  if (card.number !== null) {
    return (
      <PlayingCard
        className="nana-card-revealed"
        label={card.number}
        width={w}
        height={h}
        faceBackground={C.card}
        textColor={C.primary}
        borderColor={C.primary}
        highlighted
        style={{ fontFamily: FONT }}
      />
    );
  }

  return (
    <PlayingCard
      className={`nana-field-card${clickable ? " clickable" : ""}`}
      faceDown
      backColor={C.primary}
      width={w}
      height={h}
      clickable={clickable}
      onClick={onClick}
    />
  );
}
