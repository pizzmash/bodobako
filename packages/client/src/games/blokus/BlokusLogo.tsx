/**
 * ブロックス ゲームロゴ
 * Fredoka フォント + 4色でブロック感を表現
 */
import "./blokus.css";

const LETTERS: { char: string; color: string; cls: string }[] = [
  { char: "B", color: "#60a5fa", cls: "blk-logo-b" },
  { char: "L", color: "#fbbf24", cls: "blk-logo-l" },
  { char: "O", color: "#f87171", cls: "blk-logo-o" },
  { char: "K", color: "#4ade80", cls: "blk-logo-k" },
  { char: "U", color: "#60a5fa", cls: "blk-logo-u" },
  { char: "S", color: "#fbbf24", cls: "blk-logo-s" },
];

interface BlokusLogoProps {
  size?: "sm" | "md" | "lg";
}

export function BlokusLogo({ size = "md" }: BlokusLogoProps) {
  const fontSize = size === "sm" ? "2rem" : size === "lg" ? "5rem" : "3rem";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem" }}>
      <div
        className="blk-logo"
        style={{
          display: "flex",
          alignItems: "baseline",
          fontFamily: "'Fredoka', sans-serif",
          fontWeight: 600,
          fontSize,
          letterSpacing: "-0.02em",
          userSelect: "none",
          lineHeight: 1.1,
        }}
      >
        {LETTERS.map(({ char, color, cls }) => (
          <span
            key={cls}
            className={`blk-logo-letter ${cls}`}
            style={{ color, position: "relative", display: "inline-block" }}
          >
            {char}
          </span>
        ))}
      </div>
      {/* デコレーティブブロック */}
      <div style={{ display: "flex", gap: "0.2rem" }}>
        {LETTERS.slice(0, 4).map(({ color, cls }) => (
          <div
            key={cls}
            style={{
              width: size === "sm" ? 6 : 8,
              height: size === "sm" ? 6 : 8,
              background: color,
              borderRadius: 2,
              opacity: 0.7,
            }}
          />
        ))}
      </div>
    </div>
  );
}
