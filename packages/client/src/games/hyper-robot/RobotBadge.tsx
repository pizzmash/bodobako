import { Bot } from "lucide-react";

/** Lucide Bot アイコンをベースにしたグローバッジ */
export function RobotBadge({ color, size }: { color: string; size: number }) {
  const iconSize = Math.round(size * 0.6);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle at 38% 32%, ${color}2e, ${color}12 55%, transparent)`,
        border: `1.5px solid ${color}80`,
        boxShadow: [
          "0 2px 7px rgba(0,0,0,0.6)",
          `0 0 10px ${color}52`,
          `inset 0 0 8px ${color}18`,
        ].join(", "),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Bot size={iconSize} color={color} strokeWidth={2} />
    </div>
  );
}
