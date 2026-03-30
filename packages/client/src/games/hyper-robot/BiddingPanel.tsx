import type { HyperRobotState } from "@bodobako/shared";
import { AlertTriangle } from "lucide-react";
import { useCallback, useState } from "react";
import { BIDDING_TIME_SEC, C, FONT, MAX_BID_COUNT } from "./constants";

interface BiddingPanelProps {
  state: HyperRobotState;
  playerId: string;
  timeLeft: number;
  getName: (pid: string) => string;
  onBid: (count: number) => void;
  onConfirmBid: () => void;
  onUnconfirmBid: () => void;
  isRetry?: boolean;
}

export function BiddingPanel({
  state,
  playerId,
  timeLeft,
  getName,
  onBid,
  onConfirmBid,
  onUnconfirmBid,
  isRetry,
}: BiddingPanelProps) {
  const [bidInput, setBidInput] = useState<number>(1);

  const myBid = state.bids.find((b) => b.playerId === playerId);
  const minBid = state.bids.length > 0
    ? Math.min(...state.bids.map((b) => b.count))
    : Infinity;

  const handleBid = useCallback(() => {
    if (bidInput >= 1) onBid(bidInput);
  }, [bidInput, onBid]);

  const timerPct = (timeLeft / BIDDING_TIME_SEC) * 100;
  const timerColor = timeLeft > 20 ? C.success : timeLeft > 10 ? C.warning : C.accent;

  // ソート済みbid一覧（手数昇順、同手数は orderId 昇順）
  const sortedBids = [...state.bids].sort(
    (a, b) => a.count - b.count || a.orderId - b.orderId,
  );

  const showTimer = !(state.bids.length === 0 && !isRetry);
  const isConfirmed = state.confirmedBidders?.includes(playerId) ?? false;
  const canConfirm = !!myBid;
  const isUpdateDisabled = myBid
    ? (bidInput >= myBid.count || isConfirmed)
    : false;

  return (
    <div
      className="rounded-2xl flex flex-col gap-3 p-4"
      style={{
        background: C.card,
        border: `1px solid ${C.cardBorder}`,
        fontFamily: FONT,
      }}
    >
      {/* リトライバナー */}
      {isRetry && (
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold"
          style={{
            background: "rgba(220,38,38,0.15)",
            border: "1px solid rgba(220,38,38,0.4)",
            color: "#F87171",
            fontFamily: FONT,
          }}
        >
          <AlertTriangle size={14} />
          <span>再宣言ラウンド</span>
        </div>
      )}

      {/* タイマー */}
      {showTimer && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: C.muted }}>
              宣言フェーズ
            </span>
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: timerColor }}
            >
              {timeLeft}秒
            </span>
          </div>

          {/* タイマーバー */}
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: 4, background: `${C.border}` }}
          >
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${timerPct}%`,
                background: timerColor,
                boxShadow: `0 0 6px ${timerColor}88`,
              }}
            />
          </div>
        </>
      )}

      {/* 宣言フェーズラベル（タイマー非表示時） */}
      {!showTimer && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold" style={{ color: C.muted }}>
            宣言フェーズ
          </span>
        </div>
      )}

      {/* 宣言入力 */}
      {state.biddingOpen && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium" style={{ color: C.text }}>
            手数を宣言:
          </span>
          <div className="flex gap-2 items-center">
            <button
              className="w-8 h-8 rounded-lg font-bold text-lg flex items-center justify-center cursor-pointer transition-colors duration-150"
              style={{ background: C.primaryLight, color: C.secondary, border: `1px solid ${C.cardBorder}` }}
              onClick={() => setBidInput((v) => Math.max(1, v - 1))}
              aria-label="減らす"
            >
              −
            </button>
            <span
              data-testid="bid-input-display"
              className="w-10 text-center text-xl font-black tabular-nums"
              style={{ color: C.text }}
            >
              {bidInput}
            </span>
            <button
              className="w-8 h-8 rounded-lg font-bold text-lg flex items-center justify-center cursor-pointer transition-colors duration-150"
              style={{ background: C.primaryLight, color: C.secondary, border: `1px solid ${C.cardBorder}` }}
              onClick={() => setBidInput((v) => Math.min(MAX_BID_COUNT, v + 1))}
              aria-label="増やす"
            >
              ＋
            </button>
            <button
                  className="flex-1 h-8 rounded-lg text-sm font-bold transition-all duration-150 active:scale-95"
                  style={{
                    background: isUpdateDisabled ? C.primaryLight : C.primary,
                    color: isUpdateDisabled ? C.secondary : "#fff",
                    border: `1px solid ${isUpdateDisabled ? C.cardBorder : "transparent"}`,
                    cursor: isUpdateDisabled ? "not-allowed" : "pointer",
                    opacity: isUpdateDisabled ? 0.5 : 1,
                  }}
                  disabled={isUpdateDisabled}
                  onClick={handleBid}
                >
                  {myBid ? "更新" : "宣言する"}
                </button>
          </div>
        </div>
      )}

      {/* 確定ボタン */}
      <button
            className="w-full py-2 rounded-xl text-sm font-bold transition-all duration-150 active:scale-95"
            style={{
              background: isConfirmed ? C.primaryLight : C.primary,
              color: isConfirmed ? C.secondary : "#fff",
              border: `1px solid ${isConfirmed ? C.cardBorder : "transparent"}`,
              cursor: (!isConfirmed && !canConfirm) ? "not-allowed" : "pointer",
              opacity: (!isConfirmed && !canConfirm) ? 0.4 : 1,
            }}
            disabled={!isConfirmed && !canConfirm}
            onClick={isConfirmed ? onUnconfirmBid : onConfirmBid}
          >
            {isConfirmed ? "取り消す" : "宣言を確定する"}
          </button>

      {/* 宣言一覧 */}
      {sortedBids.length > 0 && (
        <div className="flex flex-col gap-1" data-testid="bid-list">
          <span className="text-xs font-semibold" style={{ color: C.muted }}>
            宣言一覧 (最少: {minBid}手)
          </span>
          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
            {sortedBids.map((bid) => {
              const isConfirmed = state.confirmedBidders?.includes(bid.playerId) ?? false;
              return (
                <div
                  key={bid.playerId}
                  className="flex items-center justify-between rounded-lg px-2 py-1"
                  style={{
                    background: bid.count === minBid ? `${C.primary}22` : C.bgCell,
                    border: `1px solid ${bid.count === minBid ? C.primary : "transparent"}`,
                  }}
                >
                  <span
                    className="text-xs font-medium truncate"
                    style={{ color: bid.playerId === playerId ? C.secondary : C.text }}
                  >
                    {getName(bid.playerId)}
                    {bid.playerId === playerId && " (自分)"}
                  </span>
                  <div className="flex items-center gap-1 ml-2">
                    <span
                      className="text-sm font-black tabular-nums"
                      style={{ color: bid.count === minBid ? C.primary : C.text }}
                    >
                      {bid.count}手
                    </span>
                    {isConfirmed && (
                      <span
                        className="text-xs font-bold"
                        style={{ color: C.success }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
