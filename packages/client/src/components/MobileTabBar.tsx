import { MOBILE_TAB_BAR_HEIGHT } from "../lib/constants";
import { Z } from "../styles/tokens";

type MobileTab = "game" | "sidebar";

const TAB_LABELS: Record<MobileTab, string> = {
  game: "ゲーム",
  sidebar: "プレイヤー",
};

const TAB_ICONS: Record<MobileTab, string> = {
  game: "🎮",
  sidebar: "👥",
};

interface MobileTabBarProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

export function MobileTabBar({ activeTab, onTabChange }: MobileTabBarProps) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: MOBILE_TAB_BAR_HEIGHT,
        zIndex: Z.gameMobileTab,
        background: "#ffffff",
        borderTop: "1px solid #e2e8f0",
        display: "flex",
        flexShrink: 0,
      }}
    >
      {(["game", "sidebar"] as const).map((tab) => {
        const active = activeTab === tab;
        return (
          <button
            key={tab}
            style={{
              flex: 1,
              border: "none",
              background: active ? "rgba(99,102,241,0.08)" : "transparent",
              color: active ? "#6366F1" : "#94a3b8",
              fontWeight: active ? 700 : 500,
              fontSize: 11,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              borderTop: active ? "2px solid #6366F1" : "2px solid transparent",
            }}
            onClick={() => onTabChange(tab)}
          >
            <span style={{ fontSize: 16 }}>{TAB_ICONS[tab]}</span>
            {TAB_LABELS[tab]}
          </button>
        );
      })}
    </div>
  );
}
