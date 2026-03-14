/**
 * ブロックス ゲームロゴ
 * Fredoka フォント + 4色でブロック感を表現
 */


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
  subtitle?: string;
}

export function BlokusLogo({ size = "md", subtitle }: BlokusLogoProps) {
  const fontSize = size === "sm" ? "2rem" : size === "lg" ? "5rem" : "3rem";
  const blockSize = size === "sm" ? 6 : 8;
  const subtitleSize = size === "sm" ? "0.75rem" : size === "lg" ? "1.2rem" : "0.9rem";

  return (
    <div className="flex flex-col items-center gap-[0.3rem]">
      <div
        className="blk-logo flex items-baseline select-none leading-[1.1] tracking-[-0.02em]"
        style={{
          fontFamily: "'Fredoka', sans-serif",
          fontWeight: 600,
          fontSize,
        }}
      >
        {LETTERS.map(({ char, color, cls }) => (
          <span
            key={cls}
            className={`blk-logo-letter ${cls} relative inline-block`}
            style={{ color }}
          >
            {char}
          </span>
        ))}
      </div>
      {/* デコレーティブブロック */}
      <div className="flex gap-[0.2rem]">
        {LETTERS.slice(0, 4).map(({ color, cls }) => (
          <div
            key={cls}
            className="rounded-[2px] opacity-70"
            style={{
              width: blockSize,
              height: blockSize,
              background: color,
            }}
          />
        ))}
      </div>
      {subtitle && (
        <div
          className="font-semibold tracking-[0.18em] text-slate-500 uppercase select-none"
          style={{
            fontFamily: "'Fredoka', sans-serif",
            fontSize: subtitleSize,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}
