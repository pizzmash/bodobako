import clsx from "clsx";
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
      className="fixed bottom-0 left-0 right-0 flex flex-shrink-0 bg-white border-t border-slate-200"
      style={{
        height: MOBILE_TAB_BAR_HEIGHT,
        zIndex: Z.gameMobileTab,
      }}
    >
      {(["game", "sidebar"] as const).map((tab) => {
        const active = activeTab === tab;
        return (
          <button
            key={tab}
            className={clsx(
              "flex-1 border-none cursor-pointer flex flex-col items-center justify-center gap-0.5 text-[11px] border-t-2",
              active
                ? "bg-indigo-500/[0.08] text-indigo-500 font-bold border-t-indigo-500"
                : "bg-transparent text-slate-400 font-medium border-t-transparent",
            )}
            onClick={() => onTabChange(tab)}
          >
            <span className="text-base">{TAB_ICONS[tab]}</span>
            {TAB_LABELS[tab]}
          </button>
        );
      })}
    </div>
  );
}
