import type { DiceValue } from "@bodobako/shared";
import { useCallback, useState } from "react";
import { CC, FONT_HEADLINE } from "./constants";
import { DiceFace } from "./DiceFace";

interface DeclarePanelProps {
  myRoll: DiceValue;
  onDeclare: (value: 1 | 2 | 3 | 4) => void;
}

export function DeclarePanel({ myRoll, onDeclare }: DeclarePanelProps) {
  const [selected, setSelected] = useState<1 | 2 | 3 | 4 | null>(null);

  const handleDeclare = useCallback(() => {
    if (selected !== null) onDeclare(selected);
  }, [selected, onDeclare]);

  return (
    <div
      className="backdrop-blur-xl rounded-3xl px-6 py-5 shadow-2xl
                 border border-white/10 max-w-[360px] w-full"
      style={{ background: `${CC.surfaceLow}cc` }}
    >
      {/* 自分だけに見える出目 */}
      <div className="flex items-center gap-2 text-sm mb-3" style={{ color: CC.onSurfaceVariant }}>
        あなたの出目:
        <DiceFace value={myRoll} size="sm" />
      </div>

      {/* × 警告 */}
      {myRoll === "x" && (
        <div
          className="rounded-lg px-3 py-2 mb-3 text-sm font-medium"
          style={{ background: `${CC.errorContainer}1a`, color: CC.error }}
        >
          ⚠ ×が出ました。必ずウソの宣言をしてください。
        </div>
      )}

      {/* 1〜4 選択 */}
      <div className="grid grid-cols-2 gap-2.5">
        {([1, 2, 3, 4] as const).map((n) => (
          <button
            key={n}
            onClick={() => setSelected(n)}
            className="text-2xl font-black p-3 rounded-xl transition-all duration-200
                       active:scale-95 border-2"
            style={{
              background: selected === n ? CC.primary : CC.surfaceHighest,
              color: selected === n ? CC.onPrimary : CC.onSurface,
              borderColor: selected === n ? CC.primaryFixedDim : "transparent",
              fontFamily: FONT_HEADLINE,
            }}
          >
            {n}
          </button>
        ))}
      </div>

      {/* 確定ボタン */}
      <button
        disabled={!selected}
        onClick={handleDeclare}
        className="w-full font-extrabold text-sm py-3 rounded-full mt-3
                   transition-opacity duration-200 disabled:opacity-40"
        style={{
          background: selected ? CC.primary : CC.surfaceHighest,
          color: selected ? CC.onPrimary : CC.outline,
          fontFamily: FONT_HEADLINE,
        }}
      >
        「{selected ?? "?"}」と宣言する
      </button>
    </div>
  );
}
