import type { HyperRobotState } from "@bodobako/shared";
import { C, FONT } from "./constants";

interface SolvingPanelProps {
  state: HyperRobotState;
  playerId: string;
  onGiveUp: () => void;
  getName: (pid: string) => string;
  isMyTurn: boolean;
  movesUsed: number;
  movesAllowed: number;
}

export function SolvingPanel({
  state,
  playerId: _playerId,
  onGiveUp,
  getName,
  isMyTurn,
  movesUsed,
  movesAllowed,
}: SolvingPanelProps) {
  const solver = state.bids[state.currentBidIndex];
  if (!solver) return null;

  const solverName = getName(solver.playerId);
  const remainingMoves = movesAllowed - movesUsed;

  return (
    <div
      className="rounded-2xl flex flex-col gap-3 p-4"
      style={{
        background: C.card,
        border: `1px solid ${isMyTurn ? C.primary : C.cardBorder}`,
        fontFamily: FONT,
        boxShadow: isMyTurn ? `0 0 16px ${C.primaryGlow}` : undefined,
      }}
    >
      {/* 解決者情報 */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs" style={{ color: C.muted }}>
            解決中
          </span>
          <span
            className="text-sm font-bold"
            style={{ color: isMyTurn ? C.secondary : C.text }}
          >
            {isMyTurn ? "あなたの番！" : `${solverName} の番`}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs" style={{ color: C.muted }}>残り手数</span>
          <span
            className="text-lg font-black tabular-nums"
            style={{ color: remainingMoves <= 1 ? C.accent : C.primary }}
          >
            {remainingMoves}
          </span>
        </div>
      </div>

      {/* 手数プログレス */}
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: 4, background: C.border }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: movesAllowed > 0 ? `${(movesUsed / movesAllowed) * 100}%` : "0%",
            background: remainingMoves <= 1 ? C.accent : C.primary,
          }}
        />
      </div>

      {isMyTurn && (
        /* ギブアップ */
        <button
          className="w-full py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-150 active:scale-95"
          style={{
            background: "transparent",
            color: C.muted,
            border: `1px solid ${C.border}`,
          }}
          onClick={onGiveUp}
        >
          ギブアップ（次の宣言者へ）
        </button>
      )}

      {!isMyTurn && (
        <div
          className="text-center text-sm py-2 rounded-xl"
          style={{ color: C.muted, background: C.bgCell }}
        >
          {solverName} が解いています...
        </div>
      )}

      {/* 宣言キュー表示 */}
      {state.bids.length > 1 && (
        <div className="flex flex-col gap-1 pt-1 border-t" style={{ borderColor: C.border }}>
          <span className="text-xs" style={{ color: C.muted }}>宣言順</span>
          <div className="flex flex-col gap-0.5">
            {state.bids.map((bid, idx) => (
              <div
                key={bid.playerId}
                className="flex items-center justify-between text-xs px-2 py-0.5 rounded"
                style={{
                  background: idx === state.currentBidIndex ? `${C.primary}22` : "transparent",
                  color: idx === state.currentBidIndex ? C.secondary
                    : idx < state.currentBidIndex ? C.muted : C.text,
                  textDecoration: idx < state.currentBidIndex ? "line-through" : undefined,
                }}
              >
                <span>
                  {idx === state.currentBidIndex && "▶ "}
                  {getName(bid.playerId)}
                </span>
                <span className="font-bold">{bid.count}手</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
