/**
 * 完成メニューバナー
 */

import React from "react";
import { Z } from "../../styles/tokens";
import { C } from "./constants";

interface CompletedDishBannerProps {
  dishName: string | null;
}

export const CompletedDishBanner = React.memo(function CompletedDishBanner({ dishName }: CompletedDishBannerProps) {
  if (!dishName) return null;

  return (
    <div
      className="absolute top-6 left-1/2 -translate-x-1/2"
      style={{
        zIndex: Z.srDishBanner,
        animation: "sr-dish-complete 0.6s ease-out forwards",
      }}
    >
      <div
        className="inline-block px-8 py-3 text-white rounded-full text-2xl font-black italic tracking-wide"
        style={{
          background: C.primary,
          boxShadow: `0 4px 16px ${C.primary}66`,
          border: `4px solid ${C.white}`,
        }}
      >
        完成: {dishName}！
      </div>
    </div>
  );
});
