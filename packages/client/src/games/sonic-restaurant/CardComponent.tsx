/**
 * カードコンポーネント
 */

import type { Card } from "@bodobako/shared";
import type { CSSProperties } from "react";
import { useState } from "react";
import { LAYOUT, styles } from "./constants";

interface CardComponentProps {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  isNew?: boolean;
  size?: "normal" | "small";
  style?: CSSProperties;
  hideLogo?: boolean;
}

export function CardComponent({
  card,
  onClick,
  disabled = false,
  isNew = false,
  size = "normal",
  style = {},
  hideLogo = false,
}: CardComponentProps) {
  const isSmall = size === "small";
  const width = isSmall ? LAYOUT.cardWidthSmall : LAYOUT.cardWidth;
  const height = isSmall ? LAYOUT.cardHeightSmall : LAYOUT.cardHeight;
  const isTorikeshi = card === "とりけし";
  const [isShaking, setIsShaking] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!onClick) return;
    
    if (disabled) {
      // 選択できないカードをクリックした場合は振動
      // 一時的にホバー状態を解除するため、疑似的にマウスを外す
      const button = e.currentTarget;
      button.style.pointerEvents = 'none';
      
      setIsShaking(true);
      
      setTimeout(() => {
        setIsShaking(false);
        button.style.pointerEvents = 'auto';
      }, 500);
      return;
    }
    
    // 選択可能な場合は通常のクリックハンドラを実行
    onClick();
  };

  const cardStyle: CSSProperties = {
    ...styles.card,
    width,
    height,
    flexShrink: 0,
    cursor: onClick ? "pointer" : "default",
    ...(isNew && !isSmall
      ? { animation: "sr-new-card-flash 1s ease-out" }
      : {}),
    ...(isTorikeshi
      ? {
          backgroundColor: "#FFD700",
          borderColor: "#ffffff",
          overflow: "hidden",
        }
      : {}),
    ...style,
  };

  const contentStyle: CSSProperties = {
    ...styles.cardContent,
    fontSize: isSmall 
      ? (isTorikeshi ? "0.875rem" : "1.25rem")
      : (isTorikeshi ? "1.25rem" : "1.875rem"),
    ...(isTorikeshi
      ? {
          color: "#ffffff",
          textShadow: "0 2px 2px rgba(0,0,0,0.5)",
          position: "relative",
          zIndex: 10,
        }
      : {}),
  };

  const logoStyle: CSSProperties = {
    ...styles.cardLogo,
    fontSize: isSmall ? "0.375rem" : "0.5rem",
    ...(isTorikeshi
      ? {
          color: "rgba(255, 255, 255, 0.5)",
          zIndex: 10,
        }
      : {}),
  };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={handleClick}
        style={cardStyle}
        className={`${!isSmall ? "sr-hand-card" : ""} ${isShaking ? "sr-shaking" : ""}`}
      >
        {isTorikeshi && <div className="sr-burst-effect" />}
        <span style={contentStyle}>{card}</span>
        {!hideLogo && <div style={logoStyle}>音速飯点</div>}
        {isTorikeshi && !isSmall && (
          <div
            style={{
              position: "absolute",
              bottom: "0.5rem",
              right: "0.5rem",
              fontSize: "1rem",
              color: "white",
              opacity: 0.5,
              zIndex: 10,
            }}
          >
            ⊗
          </div>
        )}
      </button>
    );
  }

  return (
    <div style={cardStyle}>
      {isTorikeshi && <div className="sr-burst-effect" />}
      <span style={contentStyle}>{card}</span>
      {!hideLogo && <div style={logoStyle}>音速飯点</div>}
      {isTorikeshi && !isSmall && (
        <div
          style={{
            position: "absolute",
            bottom: "0.5rem",
            right: "0.5rem",
            fontSize: "1rem",
            color: "white",
            opacity: 0.5,
            zIndex: 10,
          }}
        >
          ⊗
        </div>
      )}
    </div>
  );
}
