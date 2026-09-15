import { getGameIcon } from "../../games/icons";
import { GameIdenticon } from "./GameIdenticon";

export function GameIcon({ gameId }: { gameId: string }) {
  const icon = getGameIcon(gameId);
  if (!icon) return <GameIdenticon gameId={gameId} />;

  const Icon = icon.component;
  return (
    <div className={`h-16 w-16 shrink-0 rounded-xl p-2 ${icon.className}`}>
      <Icon className="h-full w-full" />
    </div>
  );
}
