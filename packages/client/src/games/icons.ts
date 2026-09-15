import type { GameId } from "@bodobako/shared";
import type { ComponentType } from "react";
import { CoyoteEmblem } from "./coyote/CoyoteEmblem";

interface GameIconDefinition {
  component: ComponentType<{ className?: string }>;
  className: string;
}

// 独自アイコンはここに登録する。未登録のゲームはGameIdenticonで表示する。
// Reactコンポーネントと装飾はクライアントで管理し、sharedのゲーム定義に持ち込まない。
const gameIcons: Partial<Record<GameId, GameIconDefinition>> = {
  coyote: {
    component: CoyoteEmblem,
    className: "bg-[#101827] text-[#e8b86b] shadow-lg",
  },
};

export function getGameIcon(gameId: string): GameIconDefinition | undefined {
  if (Object.hasOwn(gameIcons, gameId)) {
    return gameIcons[gameId as GameId];
  }
  return undefined;
}
