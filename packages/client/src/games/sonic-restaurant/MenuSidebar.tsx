/**
 * メニューサイドバー（お品書き）
 */

import type { SonicRestaurantState } from "@bodobako/shared";
import { MENUS } from "@bodobako/shared";
import { BookOpen, Utensils } from "lucide-react";
import React from "react";
import { Z } from "../../styles/tokens";
import { C, LAYOUT, styles } from "./constants";

interface MenuSidebarProps {
  state: SonicRestaurantState;
}

export const MenuSidebar = React.memo(function MenuSidebar({ state }: MenuSidebarProps) {
  // 現在製作可能なメニュー名のリスト
  const possibleMenus = state.currentNode.possibleMenus || [];

  return (
    <aside
      className="h-full min-h-0 flex flex-col shadow-lg"
      style={{
        width: LAYOUT.sidebarWidth,
        backgroundColor: "#ffffff",
        padding: "1rem 0.375rem 0.5rem",
        zIndex: Z.srGameSidebar,
      }}
    >
      {/* ゲームタイトル看板 */}
      <div className="mb-0.5">
        <div style={styles.titleSign}>
          <div style={styles.titleInner}>
            <div className="flex items-center justify-center gap-0.5 mb-0">
              <Utensils size={10} />
              <span
                style={{
                  fontSize: "0.4375rem",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  color: C.white,
                }}
              >
                オンソクハンテン
              </span>
              <span style={{ fontSize: "0.625rem" }}>🥘</span>
            </div>
            <h1 style={styles.titleMain}>音速飯点</h1>
            <div className="flex justify-center items-center gap-0.5 mt-0">
              <div
                className="h-px opacity-50"
                style={{ width: "0.375rem", backgroundColor: C.accentYellow }}
              />
              <span style={styles.titleSub}>Sonic Chinese Restaurant</span>
              <div
                className="h-px opacity-50"
                style={{ width: "0.375rem", backgroundColor: C.accentYellow }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* お品書きヘッダー */}
      <div style={styles.menuHeader}>
        <BookOpen size={12} />
        <h2 style={styles.menuTitle}>お品書き</h2>
      </div>

      {/* メニューリスト */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 flex flex-col gap-0.5">
        {MENUS.map(([cards, menuName]) => {
          const canMake = possibleMenus.includes(menuName);

          return (
            <div
              key={menuName}
              className="flex items-center justify-between rounded-sm"
              style={{
                padding: "0.1875rem 0.25rem",
                ...(canMake
                  ? styles.menuItemActive
                  : styles.menuItemInactive),
              }}
            >
              <div>
                <p
                  className="text-sm font-bold italic m-0"
                  style={{
                    lineHeight: 1.2,
                    color: canMake ? C.primary : C.gray700,
                  }}
                >
                  {menuName}
                </p>
                <p
                  className="font-medium mb-0"
                  style={{
                    fontSize: "0.6875rem",
                    marginTop: "0.0625rem",
                    lineHeight: 1.2,
                    color: canMake ? `${C.primary}99` : C.gray500,
                  }}
                >
                  {cards.join(" + ")}
                </p>
              </div>
              <span
                className="font-bold rounded-full"
                style={{
                  padding: "0.09375rem 0.1875rem",
                  fontSize: "0.625rem",
                  ...(canMake ? styles.badgeActive : styles.badgeInactive),
                }}
              >
                {canMake ? "製作可能" : "製作不可"}
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
});
