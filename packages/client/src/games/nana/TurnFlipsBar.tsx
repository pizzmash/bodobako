import type { NanaStateView } from "@bodobako/shared";
import { withAlpha } from "../../lib/color";
import { C, FONT } from "./constants";
import { findVisibleCardNumber } from "./FieldCardView";

export function TurnFlipsBar({
  flips,
  state,
  resolvedNumbers,
  getPlayerColor,
}: {
  flips: NanaStateView["turnFlips"];
  state: NanaStateView;
  resolvedNumbers?: Record<number, number | null>;
  getPlayerColor: (pid: string) => string;
}) {
  const findNum = (cardId: number): number | null =>
    resolvedNumbers?.[cardId] ?? findVisibleCardNumber(state, cardId);

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
      {[0, 1, 2].map((i) => {
        const flip = flips[i];
        if (!flip) {
          return (
            <div
              key={i}
              style={{
                width: 52,
                height: 70,
                border: `2px dashed ${C.border}`,
                borderRadius: 8,
                opacity: 0.45,
              }}
            />
          );
        }
        const num = findNum(flip.cardId);
        const handSource = flip.source.type === "hand" ? flip.source : null;
        const accentColor = handSource ? getPlayerColor(handSource.targetPlayerId) : C.primary;
        const handPosLabel =
          handSource?.position === "max" ? "MAX" : handSource?.position === "min" ? "MIN" : null;
        return (
          <div
            key={i}
            className="nana-card-revealed"
            style={{
              position: "relative",
              width: 52,
              height: 70,
              background: C.card,
              border: `2px solid ${accentColor}`,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT,
              fontSize: 22,
              fontWeight: 900,
              color: accentColor,
              boxShadow: `0 0 10px ${withAlpha(accentColor, 0.35)}`,
            }}
          >
            {handPosLabel && (
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  left: 4,
                  fontSize: 8,
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: "0.03em",
                  color: "white",
                  background: accentColor,
                  borderRadius: 999,
                  padding: "2px 5px",
                  boxShadow: `0 2px 6px ${withAlpha(accentColor, 0.35)}`,
                }}
              >
                {handPosLabel}
              </span>
            )}
            {num ?? "?"}
          </div>
        );
      })}
    </div>
  );
}
