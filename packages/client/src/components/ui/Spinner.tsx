interface SpinnerProps {
  size?: number;
  /** Override border color (Tailwind class pairs, e.g. "border-white/40 border-t-white") */
  colorClass?: string;
}

/**
 * 共通ローディングスピナー。
 */
export function Spinner({
  size = 32,
  colorClass = "border-indigo-200 border-t-indigo-500",
}: SpinnerProps) {
  return (
    <div
      style={{ width: size, height: size, borderWidth: Math.max(2, size / 12) }}
      className={`rounded-full animate-spin ${colorClass}`}
      role="status"
      aria-label="読み込み中"
    />
  );
}
