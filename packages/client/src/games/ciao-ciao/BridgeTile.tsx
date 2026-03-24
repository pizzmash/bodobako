import { CC, CIAO_PLAYER_COLORS } from "./constants";
import { Meeple } from "./Meeple";
import { MeepleBubble } from "./MeepleBubble";

interface BridgeTileProps {
  index: number;
  meeples: { playerId: string; colorIndex: number }[];
  isHighlighted?: boolean;
  getName: (pid: string) => string;
  getPhotoURL: (pid: string) => string | undefined;
}

export function BridgeTile({ index, meeples, isHighlighted, getName, getPhotoURL }: BridgeTileProps) {
  const isEven = index % 2 === 0;

  return (
    <div className="flex flex-col items-center shrink-0">
      <div
        className={`flex items-end justify-center pb-2 rounded-lg shadow-lg relative${isHighlighted ? " ciao-tile-glow" : ""}`}
        style={{
          width: "clamp(48px, 7vw, 80px)",
          height: "clamp(64px, 9vw, 112px)",
          background: isEven ? CC.secondary : CC.secondaryDim,
          boxShadow: isHighlighted
            ? `0 0 8px 2px ${CC.primaryFixedDim}, 0 0 20px 4px rgba(23,106,33,0.3)`
            : undefined,
        }}
      >
        {/* マス番号 */}
        <span
          className="absolute top-0.5 left-1/2 -translate-x-1/2 text-2xl font-black pointer-events-none select-none"
          style={{ opacity: 0.15, color: "white" }}
        >
          {index}
        </span>
        {/* コマ */}
        <div className="flex items-end justify-center">
          {meeples.map((m, i) => (
            <div key={m.playerId} className={i > 0 ? "-ml-1" : ""}>
              <Meeple
                color={CIAO_PLAYER_COLORS[m.colorIndex]?.meeple ?? "#888"}
                size={24}
              />
            </div>
          ))}
        </div>
      </div>
      {/* 吹き出し */}
      {meeples.length > 0 && (
        <div className="flex gap-0.5 mt-0.5">
          {meeples.map((m) => (
            <MeepleBubble
              key={m.playerId}
              name={getName(m.playerId)}
              photoURL={getPhotoURL(m.playerId)}
              color={CIAO_PLAYER_COLORS[m.colorIndex]?.meeple ?? "#888"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
