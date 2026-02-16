/**
 * メニューサイドバー（お品書き）
 */

import type { SonicRestaurantState } from "@bodobako/shared";
import { MENUS } from "@bodobako/shared";
import { C, styles } from "./constants";

interface MenuSidebarProps {
  state: SonicRestaurantState;
}

export function MenuSidebar({ state }: MenuSidebarProps) {
  // 現在製作可能なメニュー名のリスト
  const possibleMenus = state.currentNode.possibleMenus || [];

  return (
    <aside style={styles.sidebar}>
      {/* ゲームタイトル看板 */}
      <div style={styles.sidebarTitle}>
        <div style={styles.titleSign}>
          <div style={styles.titleInner}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.25rem",
              }}
            >
              <span style={{ fontSize: "1.25rem" }}>🍜</span>
              <span
                style={{
                  fontSize: "0.625rem",
                  fontWeight: 800,
                  letterSpacing: "0.3em",
                  color: C.white,
                }}
              >
                オンソクハンテン
              </span>
              <span style={{ fontSize: "1.25rem" }}>🥘</span>
            </div>
            <h1 style={styles.titleMain}>音速飯点</h1>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "0.5rem",
                marginTop: "0.25rem",
              }}
            >
              <div
                style={{
                  height: "1px",
                  width: "1rem",
                  backgroundColor: C.accentYellow,
                  opacity: 0.5,
                }}
              />
              <span style={styles.titleSub}>Sonic Chinese Restaurant</span>
              <div
                style={{
                  height: "1px",
                  width: "1rem",
                  backgroundColor: C.accentYellow,
                  opacity: 0.5,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* お品書きヘッダー */}
      <div style={styles.menuHeader}>
        <span style={{ fontSize: "0.875rem" }}>📖</span>
        <h2 style={styles.menuTitle}>お品書き</h2>
      </div>

      {/* メニューリスト */}
      <div style={styles.menuList}>
        {MENUS.map(([cards, menuName]) => {
          const canMake = possibleMenus.includes(menuName);

          return (
            <div
              key={menuName}
              style={{
                ...styles.menuItem,
                ...(canMake
                  ? styles.menuItemActive
                  : styles.menuItemInactive),
              }}
            >
              <div>
                <p
                  style={{
                    ...styles.menuName,
                    color: canMake ? C.primary : C.gray700,
                  }}
                >
                  {menuName}
                </p>
                <p
                  style={{
                    ...styles.menuRecipe,
                    color: canMake ? `${C.primary}99` : C.gray500,
                  }}
                >
                  {cards.join(" + ")}
                </p>
              </div>
              <span
                style={{
                  ...styles.badge,
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
}
