import { forwardRef } from "react";
import { Star } from "lucide-react";
import { FONT_HEADLINE } from "./constants";
import { Meeple } from "./Meeple";

interface GoalAreaProps {
  goalMeeples: { playerId: string; color: string }[];
  isHighlighted?: boolean;
}

export const GoalArea = forwardRef<HTMLDivElement, GoalAreaProps>(
  function GoalArea({ goalMeeples, isHighlighted }, ref) {
    return (
      <div
        ref={ref}
        className={`flex flex-col items-center justify-center rounded-2xl ml-2 shrink-0${isHighlighted ? " ciao-tile-glow" : ""}`}
        style={{
          width: "clamp(64px, 8vw, 100px)",
          height: "clamp(64px, 9vw, 112px)",
          // エメラルドジェムマテリアル
          background: [
            "radial-gradient(ellipse at 28% 20%, rgba(255,255,255,0.40) 0%, transparent 50%)",
            "radial-gradient(ellipse at 72% 78%, rgba(0,0,0,0.24) 0%, transparent 45%)",
            "linear-gradient(155deg, #34b84e 0%, #176a21 46%, #0d4d16 78%, #1e8630 100%)",
          ].join(", "),
          boxShadow: isHighlighted
            ? `0 0 12px 3px #4caf50, 0 0 26px 6px rgba(23,106,33,0.38), 0 4px 18px rgba(22,106,31,0.55), inset 0 1px 0 rgba(255,255,255,0.42), inset 0 -2px 5px rgba(0,0,0,0.24)`
            : `0 4px 18px rgba(22,106,31,0.52), 0 1px 4px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.40), inset 0 -2px 5px rgba(0,0,0,0.22)`,
          position: "relative",
          zIndex: 1,
        }}
      >
        <Star
          size={20}
          fill="#ffd040"
          color="#c89010"
          style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.55))" }}
        />
        <span
          className="font-black text-xs"
          style={{
            fontFamily: FONT_HEADLINE,
            color: "#ffd040",
            textShadow: "0 1px 3px rgba(0,0,0,0.65)",
          }}
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
);
