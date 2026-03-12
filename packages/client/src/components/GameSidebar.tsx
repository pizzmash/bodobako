import type { ReactNode } from "react";
import { APP_HEADER_HEIGHT, GAME_SIDEBAR_WIDTH } from "../lib/constants";
import { Z } from "../styles/tokens";

interface GameSidebarProps {
  children: ReactNode;
}

export function GameSidebar({ children }: GameSidebarProps) {
  return (
    <div
      style={{
        position: "fixed",
        right: 0,
        top: APP_HEADER_HEIGHT,
        width: GAME_SIDEBAR_WIDTH,
        height: `calc(100vh - ${APP_HEADER_HEIGHT}px)`,
        zIndex: Z.gameSidebar,
        background: "#ffffff",
        borderLeft: "1px solid #e2e8f0",
        overflowY: "auto",
      }}
    >
      {children}
    </div>
  );
}
