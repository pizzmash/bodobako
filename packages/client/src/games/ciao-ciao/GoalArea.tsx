import { Star } from "lucide-react";
import { CC, FONT_HEADLINE } from "./constants";
import { Meeple } from "./Meeple";

interface GoalAreaProps {
  goalMeeples: { playerId: string; color: string }[];
  isHighlighted?: boolean;
}

export function GoalArea({ goalMeeples, isHighlighted }: GoalAreaProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl ml-2 shadow-lg shrink-0${isHighlighted ? " ciao-tile-glow" : ""}`}
      style={{
        width: "clamp(64px, 8vw, 100px)",
        height: "clamp(64px, 9vw, 112px)",
        background: CC.primaryFixedDim,
        outline: `3px solid ${CC.primary}33`,
      }}
    >
      <Star size={20} fill={CC.primary} color={CC.primary} />
      <span
        className="font-black text-xs"
        style={{ fontFamily: FONT_HEADLINE, color: CC.primary }}
      >
        GOAL
      </span>
      {goalMeeples.length > 0 && (
        <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-full">
          {goalMeeples.map((m, i) => (
            <Meeple key={i} color={m.color} size={14} />
          ))}
        </div>
      )}
    </div>
  );
}
