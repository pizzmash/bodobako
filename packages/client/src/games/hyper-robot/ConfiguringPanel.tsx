import type { HyperRobotState } from "@bodobako/shared";
import { getWinChips } from "@bodobako/shared";
import { useState } from "react";
import { C, FONT, MAX_WIN_CHIPS } from "./constants";

interface ConfiguringPanelProps {
  state: HyperRobotState;
  isHost: boolean;
  onStartGame: (winChips: number) => void;
  getName: (pid: string) => string;
}

export function ConfiguringPanel({ state, isHost, onStartGame, getName }: ConfiguringPanelProps) {
  const recommended = getWinChips(state.playerIds.length);
  const [winChips, setWinChips] = useState(recommended);

  const recommendedLabel = `推奨: ${recommended}枚（${state.playerIds.length}人）`;

  if (!isHost) {
    return (
      <div
        className="rounded-2xl flex flex-col items-center justify-center gap-3 p-6"
        style={{ background: C.card, border: `1px solid ${C.cardBorder}`, fontFamily: FONT }}
      >
        <span className="text-sm font-medium" style={{ color: C.muted }}>
          ホストの設定を待っています...
        </span>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: C.primary, animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl flex flex-col gap-4 p-5"
      style={{ background: C.card, border: `1px solid ${C.cardBorder}`, fontFamily: FONT }}
    >
      <div>
        <h3 className="text-base font-bold" style={{ color: C.text }}>
          ゲーム設定
        </h3>
        <p className="text-xs mt-0.5" style={{ color: C.muted }}>
          参加者: {state.playerIds.map(getName).join("、")}
        </p>
      </div>

      {/* 勝利チップ数 */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold" style={{ color: C.text }}>
          勝利に必要なチップ数
        </label>
        <div className="flex items-center gap-3">
          <button
            className="w-9 h-9 rounded-lg font-bold text-lg flex items-center justify-center cursor-pointer"
            style={{ background: C.primaryLight, color: C.secondary, border: `1px solid ${C.cardBorder}` }}
            onClick={() => setWinChips((v) => Math.max(1, v - 1))}
          >
            −
          </button>
          <span className="text-3xl font-black tabular-nums w-10 text-center" style={{ color: C.text }}>
            {winChips}
          </span>
          <button
            className="w-9 h-9 rounded-lg font-bold text-lg flex items-center justify-center cursor-pointer"
            style={{ background: C.primaryLight, color: C.secondary, border: `1px solid ${C.cardBorder}` }}
            onClick={() => setWinChips((v) => Math.min(MAX_WIN_CHIPS, v + 1))}
          >
            ＋
          </button>
          <span className="text-xs" style={{ color: C.muted }}>
            {recommendedLabel}
          </span>
        </div>
      </div>

      {/* 開始ボタン */}
      <button
        className="w-full py-3 rounded-xl font-bold text-sm cursor-pointer transition-all duration-150 active:scale-95"
        style={{ background: C.primary, color: "#fff", border: "none" }}
        onClick={() => onStartGame(winChips)}
      >
        ゲーム開始
      </button>
    </div>
  );
}
