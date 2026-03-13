import type { ReactNode } from "react";
import { APP_HEADER_HEIGHT, GAME_SIDEBAR_WIDTH } from "../lib/constants";
import { Z } from "../styles/tokens";

interface GameSidebarProps {
  children: ReactNode;
}

export function GameSidebar({ children }: GameSidebarProps) {
  return (
    <div
      className="fixed right-0 bg-white border-l border-slate-200 overflow-y-auto"
      style={{
        top: APP_HEADER_HEIGHT,
        width: GAME_SIDEBAR_WIDTH,
        height: `calc(100vh - ${APP_HEADER_HEIGHT}px)`,
        zIndex: Z.gameSidebar,
      }}
    >
      {children}
    </div>
  );
}
