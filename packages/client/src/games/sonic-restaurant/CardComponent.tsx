/**
 * カードコンポーネント
 */

import type { CSSProperties } from "react";
import type { Card } from "@bodobako/shared";
import { C, LAYOUT, styles } from "./constants";

interface CardComponentProps {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  isNew?: boolean;
  size?: "normal" | "small";
  style?: CSSProperties;
}

export function CardComponent({
  card,
  onClick,
  disabled = false,
  isNew = false,
  size = "normal",
  style = {},
}: CardComponentProps) {
  const isSmall = size === "small";
  const width = isSmall ? LAYOUT.cardWidthSmall : LAYOUT.cardWidth;
  const height = isSmall ? LAYOUT.cardHeightSmall : LAYOUT.cardHeight;

  const cardStyle: CSSProperties = {
    ...styles.card,
    width,
    height,
    flexShrink: 0,
    cursor: onClick && !disabled ? "pointer" : "default",
    opacity: disabled ? 0.5 : 1,
    ...(isNew && !isSmall
      ? { animation: "sr-new-card-flash 1s ease-out" }
      : {}),
    ...style,
  };

  const contentStyle: CSSProperties = {
    ...styles.cardContent,
    fontSize: isSmall ? "1.25rem" : "1.875rem",
  };

  const logoStyle: CSSProperties = {
    ...styles.cardLogo,
    fontSize: isSmall ? "0.375rem" : "0.5rem",
  };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        style={cardStyle}
        className={!isSmall ? "sr-hand-card" : ""}
      >
        <span style={contentStyle}>{card}</span>
        <div style={logoStyle}>音速飯点</div>
      </button>
    );
  }

  return (
    <div style={cardStyle}>
      <span style={contentStyle}>{card}</span>
      <div style={logoStyle}>音速飯点</div>
    </div>
  );
}
