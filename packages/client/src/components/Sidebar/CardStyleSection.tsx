import type { BgPattern, PlayerCardStyle } from "@bodobako/shared";
import { BG_PATTERNS, PRESET_ACCENT_COLORS } from "@bodobako/shared";
import { useEffect, useState } from "react";
import { withAlpha } from "../../lib/color";
import { Avatar } from "../ui/Avatar";
import { Spinner } from "../ui/Spinner";

// ----------------------------------------------------------------
// パターンサムネイル（インラインCSS）
// ----------------------------------------------------------------
function PatternPreview({
  pattern,
  color,
}: {
  pattern: BgPattern;
  color: string;
}) {
  if (pattern === "none") return null;

  const c = withAlpha(color, 0.25);
  let backgroundImage: string;
  let backgroundSize: string;
  let backgroundPosition: string | undefined = undefined;

  switch (pattern) {
    case "dots":
      backgroundImage = `radial-gradient(${c} 1.5px, transparent 1.5px)`;
      backgroundSize = "10px 10px";
      break;
    case "stripes":
      backgroundImage = `repeating-linear-gradient(45deg, ${c} 0, ${c} 1.5px, transparent 0, transparent 50%)`;
      backgroundSize = "8px 8px";
      break;
    case "grid":
      backgroundImage = `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`;
      backgroundSize = "10px 10px";
      break;
    case "crosshatch":
      backgroundImage = `repeating-linear-gradient(45deg, ${c} 0, ${c} 1px, transparent 0, transparent 50%), repeating-linear-gradient(-45deg, ${c} 0, ${c} 1px, transparent 0, transparent 50%)`;
      backgroundSize = "8px 8px";
      break;
    case "diamonds":
      backgroundImage = `repeating-linear-gradient(45deg, ${c} 0, ${c} 1px, transparent 0, transparent 50%), repeating-linear-gradient(-45deg, ${c} 0, ${c} 1px, transparent 0, transparent 50%)`;
      backgroundSize = "12px 12px";
      backgroundPosition = "0 0, 6px 0";
      break;
    default:
      return null;
  }

  return (
    <div
      className="absolute inset-0 rounded-xl pointer-events-none"
      style={{ backgroundImage, backgroundSize, backgroundPosition }}
    />
  );
}

// ----------------------------------------------------------------
// ミニプレビュー（PlayerCard 簡略版）
// ----------------------------------------------------------------
function MiniPlayerCard({
  name,
  accentColor,
  bgPattern,
  photoURL,
}: {
  name: string;
  accentColor: string;
  bgPattern: BgPattern;
  photoURL?: string;
}) {
  return (
    <div
      className="relative rounded-xl px-3 py-2 overflow-hidden"
      style={{
        borderLeft: `4px solid ${accentColor}`,
        background: withAlpha(accentColor, 0.04),
        boxShadow: `0 1px 4px rgba(0,0,0,0.07)`,
      }}
    >
      <PatternPreview pattern={bgPattern} color={accentColor} />
      <div className="relative flex items-center gap-2">
        <Avatar
          photoURL={photoURL}
          displayName={name}
          size={28}
        />
        <span
          className="text-[0.875rem] font-bold truncate flex-1 leading-tight"
          style={{ color: accentColor }}
        >
          {name}
        </span>
        <span
          className="text-[0.7rem] font-bold px-1.5 py-0.5 rounded-full shrink-0"
          style={{ background: withAlpha(accentColor, 0.15), color: accentColor }}
        >
          あなた
        </span>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// パターン日本語ラベル
// ----------------------------------------------------------------
const PATTERN_LABELS: Record<BgPattern, string> = {
  none: "なし",
  dots: "ドット",
  stripes: "ストライプ",
  grid: "グリッド",
  crosshatch: "クロスハッチ",
  diamonds: "ダイヤ",
};

// ----------------------------------------------------------------
// メインコンポーネント
// ----------------------------------------------------------------
interface CardStyleSectionProps {
  appDisplayName: string | null;
  currentCardStyle: PlayerCardStyle | null;
  onSave: (style: PlayerCardStyle) => Promise<void>;
  photoURL?: string;
}

export function CardStyleSection({
  appDisplayName,
  currentCardStyle,
  onSave,
  photoURL,
}: CardStyleSectionProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(
    currentCardStyle?.accentColor ?? null,
  );
  const [selectedPattern, setSelectedPattern] = useState<BgPattern>(
    currentCardStyle?.bgPattern ?? "none",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // currentCardStyle は非同期ロード後に null → 実値 と変わるため、
  // prop が変化したタイミングでローカル選択状態を同期する
  useEffect(() => {
    setSelectedColor(currentCardStyle?.accentColor ?? null);
    setSelectedPattern(currentCardStyle?.bgPattern ?? "none");
  }, [currentCardStyle]);

  const previewColor = selectedColor ?? "#6366f1";
  const previewName = appDisplayName ?? "あなた";

  const isDirty =
    selectedColor !== (currentCardStyle?.accentColor ?? null) ||
    selectedPattern !== (currentCardStyle?.bgPattern ?? "none");

  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);
    try {
      const style: PlayerCardStyle = {
        ...(selectedColor !== null ? { accentColor: selectedColor } : {}),
        bgPattern: selectedPattern,
      };
      await onSave(style);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="px-5 py-3.5">
      <div className="text-[0.75rem] font-semibold text-indigo-500 uppercase tracking-[0.08em] mb-3">
        プレイヤーカード
      </div>

      {/* ライブプレビュー */}
      <div className="mb-4">
        <MiniPlayerCard
          name={previewName}
          accentColor={previewColor}
          bgPattern={selectedPattern}
          photoURL={photoURL}
        />
      </div>

      {/* カラー選択 */}
      <div className="mb-4">
        <div className="text-[0.72rem] font-semibold text-indigo-400 mb-2">カラー</div>
        <div className="grid grid-cols-[repeat(4,minmax(0,1fr))] gap-1.5">
          {/* 自動ボタン */}
          <button
            type="button"
            className="h-10 flex items-center justify-center rounded-lg border-2 transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            style={{
              borderColor: selectedColor === null ? "#6366f1" : "transparent",
              background:
                "linear-gradient(135deg, #6366f1 0%, #a855f7 33%, #ec4899 66%, #f59e0b 100%)",
              boxShadow: selectedColor === null ? `0 0 0 2px #6366f1` : undefined,
            }}
            onClick={() => setSelectedColor(null)}
            aria-label="カラー自動（デフォルト）"
            aria-pressed={selectedColor === null}
            title="自動"
          >
            {selectedColor === null && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>

          {PRESET_ACCENT_COLORS.map((color) => {
            const isSelected = selectedColor === color;
            return (
              <button
                key={color}
                type="button"
                className="h-10 rounded-lg border-2 transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                style={{
                  background: color,
                  borderColor: isSelected ? color : "transparent",
                  outline: isSelected ? `2px solid ${color}` : undefined,
                  outlineOffset: isSelected ? "2px" : undefined,
                  transform: isSelected ? "scale(1.12)" : undefined,
                }}
                onClick={() => setSelectedColor(color)}
                aria-label={`カラー ${color}`}
                aria-pressed={isSelected}
              />
            );
          })}
        </div>
      </div>

      {/* パターン選択 */}
      <div className="mb-4">
        <div className="text-[0.72rem] font-semibold text-indigo-400 mb-2">背景パターン</div>
        <div className="grid grid-cols-3 gap-1.5">
          {BG_PATTERNS.map((pattern) => {
            const isSelected = selectedPattern === pattern;
            return (
              <button
                key={pattern}
                type="button"
                className="relative h-11 rounded-xl border-2 overflow-hidden transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                style={{
                  borderColor: isSelected ? previewColor : "rgb(226 232 240 / 0.6)",
                  background: withAlpha(previewColor, 0.04),
                  boxShadow: isSelected
                    ? `0 0 0 1px ${previewColor}`
                    : undefined,
                }}
                onClick={() => setSelectedPattern(pattern)}
                aria-label={PATTERN_LABELS[pattern]}
                aria-pressed={isSelected}
              >
                <PatternPreview pattern={pattern} color={previewColor} />
                <span
                  className="absolute inset-x-0 bottom-0 text-[0.62rem] font-semibold text-center pb-0.5 leading-4"
                  style={{ color: isSelected ? previewColor : "#94a3b8" }}
                >
                  {PATTERN_LABELS[pattern]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 保存ボタン / フィードバック */}
      {saveError && (
        <p className="text-[0.8rem] text-red-500 mb-1.5" role="alert">
          {saveError}
        </p>
      )}
      {saveSuccess && (
        <p className="text-[0.8rem] text-green-500 font-medium mb-1.5" role="status">
          保存しました
        </p>
      )}
      <button
        type="button"
        className="min-h-[44px] w-full rounded-xl border-0 bg-indigo-500 py-2.5 font-poppins text-[0.9rem] font-semibold text-white transition duration-200 hover:-translate-y-px hover:bg-indigo-600 hover:shadow-[0_4px_12px_rgba(99,102,241,0.3)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => void handleSave()}
        disabled={!isDirty || isSaving}
        aria-busy={isSaving}
      >
        {isSaving ? <Spinner size={16} colorClass="border-white/40 border-t-white" /> : "保存する"}
      </button>
    </div>
  );
}
