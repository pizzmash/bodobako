import type React from "react";

export interface PlayingCardProps {
  faceDown?: boolean;
  label?: React.ReactNode;
  width?: number;
  height?: number;
  /** 裏面の背景色（デフォルト: #f49d25） */
  backColor?: string;
  /** 表面の背景色 */
  faceBackground?: string;
  /** 表面のテキスト色 */
  textColor?: string;
  borderColor?: string;
  onClick?: () => void;
  clickable?: boolean;
  highlighted?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export function PlayingCard({
  faceDown = false,
  label,
  width = 52,
  height = 70,
  backColor = "#f49d25",
  faceBackground = "#ffffff",
  textColor = "#f49d25",
  borderColor,
  onClick,
  clickable = false,
  highlighted = false,
  style,
  className,
}: PlayingCardProps) {
  const hoverStyle: React.CSSProperties =
    clickable && highlighted ? { transform: "translateY(-8px)" } : {};

  if (faceDown) {
    return (
      <div
        className={className}
        onClick={clickable ? onClick : undefined}
        style={{
          width,
          height,
          borderRadius: 8,
          backgroundColor: backColor,
          backgroundImage:
            "radial-gradient(#ffffff 10%, transparent 10%), radial-gradient(#ffffff 10%, transparent 10%)",
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 10px 10px",
          border: highlighted
            ? "2px solid rgba(255,255,255,0.9)"
            : "2px solid rgba(255,255,255,0.5)",
          cursor: clickable ? "pointer" : "default",
          boxShadow: highlighted
            ? "0 4px 20px rgba(0,0,0,0.35)"
            : "0 2px 8px rgba(0,0,0,0.15)",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
          ...hoverStyle,
          ...style,
        }}
      />
    );
  }

  return (
    <div
      className={className}
      onClick={clickable ? onClick : undefined}
      style={{
        width,
        height,
        borderRadius: 8,
        background: faceBackground,
        border: `2px solid ${borderColor ?? "#e2e8f0"}`,
        boxShadow: highlighted
          ? `0 0 14px ${borderColor ?? "#6366f1"}60`
          : "0 2px 8px rgba(0,0,0,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(height * 0.36),
        fontWeight: 900,
        color: textColor,
        cursor: clickable ? "pointer" : "default",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        ...hoverStyle,
        ...style,
      }}
    >
      {label}
    </div>
  );
}
