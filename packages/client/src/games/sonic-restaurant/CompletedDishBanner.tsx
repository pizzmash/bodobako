/**
 * 完成メニューバナー
 */

import React from "react";
import { C } from "./constants";

interface CompletedDishBannerProps {
  dishName: string | null;
}

export const CompletedDishBanner = React.memo(function CompletedDishBanner({ dishName }: CompletedDishBannerProps) {
  if (!dishName) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "1.5rem",
        left: "50%",
        zIndex: 20,
        animation: "sr-dish-complete 0.6s ease-out forwards",
      }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "0.75rem 2rem",
          background: C.primary,
          color: "white",
          borderRadius: "9999px",
          fontSize: "1.5rem",
          fontWeight: 800,
          fontStyle: "italic",
          letterSpacing: "0.05em",
          boxShadow: `0 4px 16px ${C.primary}66`,
          border: `4px solid ${C.white}`,
        }}
      >
        完成: {dishName}！
      </div>
    </div>
  );
});
