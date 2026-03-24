import { forwardRef } from "react";
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

// 木目マテリアル（偶数マス: ライトオーク、奇数マス: ダークウォルナット）
const WOOD_GRAIN = (light: boolean) =>
  [
    // 木目の縦スジ
    `repeating-linear-gradient(
      87deg,
      transparent 0px, transparent 7px,
      rgba(0,0,0,0.04) 7px, rgba(0,0,0,0.04) 8px,
      transparent 8px, transparent 16px,
      rgba(0,0,0,0.025) 16px, rgba(0,0,0,0.025) 17px
    )`,
    // 上端ハイライト + 下端シャドウ
    `linear-gradient(
      180deg,
      rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.06) 6%,
      transparent 22%, transparent 70%,
      rgba(0,0,0,0.30) 100%
    )`,
    // ベースカラー
    light
      ? `linear-gradient(180deg, #c47c4c 0%, #8e5c32 42%, #7c4c26 72%, #9c6c40 100%)`
      : `linear-gradient(180deg, #9c6238 0%, #6e3e1c 42%, #5e3016 72%, #7c5028 100%)`,
  ].join(", ");

export const BridgeTile = forwardRef<HTMLDivElement, BridgeTileProps>(
  function BridgeTile({ index, meeples, isHighlighted, getName, getPhotoURL }, ref) {
    const isEven = index % 2 === 0;

    return (
      <div ref={ref} className="flex flex-col items-center shrink-0" style={{ position: "relative", zIndex: 1 }}>
        <div
          className={`flex items-end justify-center pb-2 relative${isHighlighted ? " ciao-tile-glow" : ""}`}
          style={{
            width: "clamp(48px, 7vw, 80px)",
            height: "clamp(64px, 9vw, 112px)",
            background: WOOD_GRAIN(isEven),
            borderRadius: "3px 3px 2px 2px",
            boxShadow: isHighlighted
              ? `0 0 8px 2px ${CC.primaryFixedDim}, 0 0 20px 4px rgba(23,106,33,0.3), 0 4px 12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.24), inset 0 -2px 5px rgba(0,0,0,0.32)`
              : `0 4px 12px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 5px rgba(0,0,0,0.30)`,
          }}
        >
          {/* 番号（薄く） */}
          <span
            className="absolute top-0.5 left-1/2 -translate-x-1/2 text-2xl font-black pointer-events-none select-none"
            style={{ opacity: 0.10, color: "white" }}
          >
            {index}
          </span>
          {/* ロープ留め穴（左上・右上） */}
          <div style={{ position: "absolute", top: 7, left: 5, width: 5, height: 5, borderRadius: "50%", background: "rgba(0,0,0,0.38)", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.55)" }} />
          <div style={{ position: "absolute", top: 7, right: 5, width: 5, height: 5, borderRadius: "50%", background: "rgba(0,0,0,0.38)", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.55)" }} />
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
        {meeples.length > 0 && (
          <div className="flex gap-0.5 mt-0.5" style={{ transformStyle: "flat" }}>
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
);
