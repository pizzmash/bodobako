import type { CSSProperties } from "react";

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
  const spinnerStyle = {
    "--spinner-size": `${size}px`,
    "--spinner-border": `${Math.max(2, size / 12)}px`,
  } as CSSProperties;

  return (
    <div
      style={spinnerStyle}
      className={`h-[var(--spinner-size)] w-[var(--spinner-size)] rounded-full border-[var(--spinner-border)] animate-spin ${colorClass}`}
      role="status"
      aria-label="読み込み中"
    />
  );
}
