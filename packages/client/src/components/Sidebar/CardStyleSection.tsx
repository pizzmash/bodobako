import type { BgPattern, PlayerCardStyle } from "@bodobako/shared";
import { BG_PATTERNS, PRESET_ACCENT_COLORS, getBgPatternLabel, isSvgBgPattern } from "@bodobako/shared";
import { MoreHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { withAlpha } from "../../lib/color";
import { buildCssPatternStyle, svgPatternOverlayStyle } from "../../lib/patternStyle";
import { Z } from "../../styles/tokens";
import { Avatar } from "../ui/Avatar";
import { Spinner } from "../ui/Spinner";

// サイドバーに直接表示するプライマリパターン（5種）
const PRIMARY_PATTERNS: BgPattern[] = ["none", "dots", "stripes", "grid", "crosshatch"];
// プライマリ以外の拡張パターン
const EXTENDED_PATTERNS = BG_PATTERNS.filter(
  (p): p is BgPattern => !PRIMARY_PATTERNS.includes(p as BgPattern),
);

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

  // SVGパターン
  if (isSvgBgPattern(pattern)) {
    const style = svgPatternOverlayStyle(pattern);
    return (
      <div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={style ? { ...style, opacity: 0.25 } : undefined}
      />
    );
  }

  // CSSパターン: プレビュー用に少し明るめの opacity=0.25
  const style = buildCssPatternStyle(pattern, color, 0.25);
  if (!style) return null;

  return (
    <div
      className="absolute inset-0 rounded-xl pointer-events-none"
      style={style}
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
        backgroundColor: withAlpha(accentColor, 0.04),
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
// 全パターンモーダル
// ----------------------------------------------------------------
function PatternPickerModal({
  open,
  color,
  selectedPattern,
  onSelect,
  onClose,
}: {
  open: boolean;
  color: string;
  selectedPattern: BgPattern;
  onSelect: (p: BgPattern) => void;
  onClose: () => void;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Escape キーで閉じる
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return createPortal(
    <>
      <style>{`
        @keyframes csp-backdrop-in  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes csp-card-in      { from { opacity: 0; transform: scale(0.94) translateY(6px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes csp-card-out     { from { opacity: 1; transform: scale(1) translateY(0); } to { opacity: 0; transform: scale(0.94) translateY(6px); } }
      `}</style>
      <div
        ref={backdropRef}
        className="fixed inset-0 flex items-center justify-center"
        style={{
          zIndex: Z.sidebar + 50,
          backgroundColor: "rgba(15,23,42,0.45)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          animation: open ? "csp-backdrop-in 180ms ease-out forwards" : undefined,
        }}
        onPointerDown={(e) => {
          if (e.target === backdropRef.current) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-label="背景パターンを選ぶ"
      >
        <div
          className="rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
          style={{
            background: "rgba(255,255,255,0.98)",
            border: "1px solid rgba(99,102,241,0.18)",
            width: "min(440px, calc(100vw - 32px))",
            animation: open ? "csp-card-in 200ms cubic-bezier(0.34,1.56,0.64,1) forwards" : undefined,
          }}
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
            <span className="text-[0.85rem] font-bold text-slate-700">背景パターンを選ぶ</span>
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-150 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
              onClick={onClose}
              aria-label="閉じる"
            >
              <X size={16} className="text-slate-500" />
            </button>
          </div>

          {/* パターングリッド */}
          <div className="p-4">
            <div className="grid grid-cols-5 gap-2">
              {BG_PATTERNS.map((pattern) => {
                const isSelected = selectedPattern === pattern;
                return (
                  <button
                    key={pattern}
                    type="button"
                    className="relative h-11 rounded-xl border-2 overflow-hidden transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                    style={{
                      borderColor: isSelected ? color : "rgb(226 232 240 / 0.7)",
                      backgroundColor: withAlpha(color, 0.04),
                      boxShadow: isSelected ? `0 0 0 1px ${color}` : undefined,
                      transform: isSelected ? "scale(1.04)" : undefined,
                    }}
                    onClick={() => {
                      onSelect(pattern);
                      onClose();
                    }}
                    aria-label={getBgPatternLabel(pattern)}
                    aria-pressed={isSelected}
                  >
                    <PatternPreview pattern={pattern} color={color} />
                    {/* 選択済みチェックマーク */}
                    {isSelected && (
                      <div
                        className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: color }}
                      >
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                    <span
                      className="absolute inset-x-0 bottom-0 text-[0.62rem] font-semibold text-center pb-0.5 leading-4"
                      style={{ color: isSelected ? color : "#94a3b8" }}
                    >
                      {getBgPatternLabel(pattern)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

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
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  // 「その他」ボタンがアクティブかどうか（拡張パターンが選択されているとき）
  const isExtendedSelected = EXTENDED_PATTERNS.includes(selectedPattern);

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
    <>
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
          {/* 3列×2行: PRIMARY_PATTERNS(5) + 「その他」ボタン */}
          <div className="grid grid-cols-3 gap-1.5">
            {PRIMARY_PATTERNS.map((pattern) => {
              const isSelected = selectedPattern === pattern;
              return (
                <button
                  key={pattern}
                  type="button"
                  className="relative h-11 rounded-xl border-2 overflow-hidden transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                  style={{
                    borderColor: isSelected ? previewColor : "rgb(226 232 240 / 0.6)",
                    backgroundColor: withAlpha(previewColor, 0.04),
                    boxShadow: isSelected ? `0 0 0 1px ${previewColor}` : undefined,
                  }}
                  onClick={() => setSelectedPattern(pattern)}
                  aria-label={getBgPatternLabel(pattern)}
                  aria-pressed={isSelected}
                >
                  <PatternPreview pattern={pattern} color={previewColor} />
                  <span
                    className="absolute inset-x-0 bottom-0 text-[0.62rem] font-semibold text-center pb-0.5 leading-4"
                    style={{ color: isSelected ? previewColor : "#94a3b8" }}
                  >
                    {getBgPatternLabel(pattern)}
                  </span>
                </button>
              );
            })}

            {/* その他ボタン */}
            <button
              type="button"
              className="relative h-11 rounded-xl border-2 overflow-hidden transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 flex flex-col items-center justify-center gap-0.5"
              style={{
                borderColor: isExtendedSelected ? previewColor : "rgb(226 232 240 / 0.6)",
                backgroundColor: isExtendedSelected
                  ? withAlpha(previewColor, 0.06)
                  : "rgb(248 250 252)",
                boxShadow: isExtendedSelected ? `0 0 0 1px ${previewColor}` : undefined,
              }}
              onClick={() => setIsModalOpen(true)}
              aria-label={`その他のパターン${isExtendedSelected ? `（${getBgPatternLabel(selectedPattern)}選択中）` : ""}`}
              aria-expanded={isModalOpen}
              aria-haspopup="dialog"
            >
              {/* 常に「その他」表示（拡張パターン選択中はアクティブなボーダーのみで示す） */}
              <MoreHorizontal
                size={14}
                aria-hidden="true"
                style={{ color: isExtendedSelected ? previewColor : undefined }}
                className={isExtendedSelected ? undefined : "text-slate-400"}
              />
              <span
                className="text-[0.62rem] font-semibold leading-4"
                style={{ color: isExtendedSelected ? previewColor : "#94a3b8" }}
              >
                その他
              </span>
            </button>
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

      {/* 全パターン選択モーダル */}
      {isModalOpen && (
        <PatternPickerModal
          open={isModalOpen}
          color={previewColor}
          selectedPattern={selectedPattern}
          onSelect={setSelectedPattern}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}

