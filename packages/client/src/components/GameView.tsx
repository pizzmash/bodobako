import type { GameId, GameResult } from "@bodobako/shared";
import { getGameDefinition } from "@bodobako/shared";
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from "react";
import type { GameStateEntry } from "../context/RoomContext";
import { useRoom } from "../context/RoomContext";
import { getBlokusTrigonPlayerColorMap, renderBlokusTrigonLogItemExtra } from "../games/blokus-trigon/sidebarExtras";
import { getBlokusPlayerColorMap, renderBlokusLogItemExtra } from "../games/blokus/sidebarExtras";
import type { GameLogItem } from "../hooks/useGameLog";
import { useGameLog } from "../hooks/useGameLog";
import { useIsMobile } from "../hooks/useIsMobile";
import { useTurnSound } from "../hooks/useTurnSound";
import { APP_HEADER_HEIGHT_MOBILE, GAME_SIDEBAR_WIDTH, MOBILE_TAB_BAR_HEIGHT } from "../lib/constants";
import { GameSidebar } from "./GameSidebar";
import type { PlayerSlotProps } from "./GameSidebar/PlayerCard";
import { GameSidebarContent } from "./GameSidebarContent";
import { MobileTabBar } from "./MobileTabBar";

const OthelloBoard = lazy(() =>
  import("../games/othello/OthelloBoard").then((m) => ({ default: m.OthelloBoard }))
);
const AiueBattleBoard = lazy(() =>
  import("../games/aiuebattle/AiueBattleBoard").then((m) => ({ default: m.AiueBattleBoard }))
);
const CitychaseBoard = lazy(() =>
  import("../games/citychase/CitychaseBoard").then((m) => ({ default: m.CitychaseBoard }))
);
const SonicRestaurantBoard = lazy(() =>
  import("../games/sonic-restaurant/SonicRestaurantBoard").then((m) => ({ default: m.SonicRestaurantBoard }))
);
const BlokusBoard = lazy(() =>
  import("../games/blokus/BlokusBoard").then((m) => ({ default: m.BlokusBoard }))
);
const NanaBoard = lazy(() =>
  import("../games/nana/NanaBoard").then((m) => ({ default: m.NanaBoard }))
);
const NyaMensBoard = lazy(() =>
  import("../games/nyamens/NyaMensBoard").then((m) => ({ default: m.NyaMensBoard }))
);
const BlokusTrigonBoard = lazy(() =>
  import("../games/blokus-trigon/BlokusTrigonBoard").then((m) => ({ default: m.BlokusTrigonBoard }))
);

class GameErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-gray-500">
          <p className="text-lg font-semibold mb-2">ゲームの読み込みに失敗しました</p>
          <button
            className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium"
            onClick={() => this.setState({ hasError: false })}
          >
            再試行
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** ゲームの現在の手番プレイヤーIDを解決する。ゲーム終了時はnullを返す。 */
function resolveCurrentPlayerId(
  gameState: GameStateEntry | null,
  gameResult: GameResult | null
): string | null {
  if (gameResult !== null) return null;
  if (!gameState) return null;
  try {
    const def = getGameDefinition(gameState.gameId as GameId);
    if (!def) return null;
    return def.getCurrentPlayerId(gameState.state as never);
  } catch {
    return null;
  }
}

const NanaPlayerSlot = lazy(() =>
  import("../games/nana/NanaPlayerSlot").then((m) => ({ default: m.NanaPlayerSlot }))
);
const AiueBattlePlayerSlot = lazy(() =>
  import("../games/aiuebattle/AiueBattlePlayerSlot").then((m) => ({ default: m.AiueBattlePlayerSlot }))
);
const CitychasePlayerSlot = lazy(() =>
  import("../games/citychase/CitychasePlayerSlot").then((m) => ({ default: m.CitychasePlayerSlot }))
);
const NyaMensPlayerSlot = lazy(() =>
  import("../games/nyamens/NyaMensPlayerSlot").then((m) => ({ default: m.NyaMensPlayerSlot }))
);
const BlokusPlayerSlot = lazy(() =>
  import("../games/blokus/BlokusPlayerSlot").then((m) => ({ default: m.BlokusPlayerSlot }))
);
const SonicRestaurantPlayerSlot = lazy(() =>
  import("../games/sonic-restaurant/SonicRestaurantPlayerSlot").then((m) => ({ default: m.SonicRestaurantPlayerSlot }))
);
const BlokusTrigonPlayerSlot = lazy(() =>
  import("../games/blokus-trigon/BlokusTrigonPlayerSlot").then((m) => ({ default: m.BlokusTrigonPlayerSlot }))
);

/** ゲーム固有のサイドバー拡張 */
interface SidebarExtras {
  getPlayerColorMap?: (state: unknown) => Record<string, string>;
  renderLogItemExtra?: (item: GameLogItem) => ReactNode;
}

const sidebarExtrasMap: Partial<Record<GameId, SidebarExtras>> = {
  blokus: {
    getPlayerColorMap: (s) => getBlokusPlayerColorMap(s as never),
    renderLogItemExtra: renderBlokusLogItemExtra,
  },
  "blokus-trigon": {
    getPlayerColorMap: (s) => getBlokusTrigonPlayerColorMap(s as never),
    renderLogItemExtra: renderBlokusTrigonLogItemExtra,
  },
};

/** ゲームID → PlayerSlot コンポーネントのマップ */
const playerSlotMap: Partial<Record<GameId, ComponentType<PlayerSlotProps>>> = {
  nana: NanaPlayerSlot as ComponentType<PlayerSlotProps>,
  blokus: BlokusPlayerSlot as ComponentType<PlayerSlotProps>,
  "sonic-restaurant": SonicRestaurantPlayerSlot as ComponentType<PlayerSlotProps>,
  aiuebattle: AiueBattlePlayerSlot as ComponentType<PlayerSlotProps>,
  citychase: CitychasePlayerSlot as ComponentType<PlayerSlotProps>,
  nyamens: NyaMensPlayerSlot as ComponentType<PlayerSlotProps>,
  "blokus-trigon": BlokusTrigonPlayerSlot as ComponentType<PlayerSlotProps>,
};

export function GameView() {
  const { room, gameState, playerId: _playerId, gameResult, gameStartCount } = useRoom();
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<"game" | "sidebar">("game");

  // 手番通知音（条件リターンより前に呼ぶ）
  const currentTurnPlayerIdForSound = resolveCurrentPlayerId(gameState, gameResult);
  useTurnSound(currentTurnPlayerIdForSound, _playerId, gameStartCount);

  // CSS変数管理
  useEffect(() => {
    if (isMobile) return;
    document.documentElement.style.setProperty(
      "--sidebar-right-offset",
      `${GAME_SIDEBAR_WIDTH}px`
    );
    return () => {
      document.documentElement.style.removeProperty("--sidebar-right-offset");
    };
  }, [isMobile]);

  // ログ蓄積（フックはすべて条件リターンより前に呼ぶ）
  const logEntries = useGameLog({
    gameId: room?.gameId,
    gameState: gameState?.state ?? null,
    players: room?.players ?? [],
    roomCode: room?.code ?? null,
    resetKey: gameStartCount,
  });

  // ゲーム固有のサイドバー拡張（プレイヤーカラーマップ）
  const playerColorMap = useMemo<Record<string, string> | undefined>(() => {
    if (!gameState) return undefined;
    return sidebarExtrasMap[gameState.gameId as GameId]?.getPlayerColorMap?.(gameState.state);
  }, [gameState]);

  if (!room) return null;

  // 現在の手番プレイヤーを解決
  const currentTurnPlayerId = resolveCurrentPlayerId(gameState, gameResult);

  const PlayerSlot = playerSlotMap[room.gameId as GameId];

  let board: ReactElement;
  switch (room.gameId) {
    case "othello":
      board = <OthelloBoard />;
      break;
    case "aiuebattle":
      board = <AiueBattleBoard />;
      break;
    case "citychase":
      board = <CitychaseBoard />;
      break;
    case "sonic-restaurant":
      board = <SonicRestaurantBoard />;
      break;
    case "blokus":
      board = <BlokusBoard />;
      break;
    case "nana":
      board = <NanaBoard />;
      break;
    case "nyamens":
      board = <NyaMensBoard />;
      break;
    case "blokus-trigon":
      board = <BlokusTrigonBoard />;
      break;
    default:
      board = <div>未対応のゲーム: {room.gameId}</div>;
  }

  const renderLogItemExtra = sidebarExtrasMap[room.gameId as GameId]?.renderLogItemExtra;

  const sidebarContent = (
    <GameSidebarContent
      logEntries={logEntries}
      PlayerSlot={PlayerSlot}
      currentTurnPlayerId={currentTurnPlayerId}
      playerColorMap={playerColorMap}
      renderLogItemExtra={renderLogItemExtra}
    />
  );

  if (isMobile) {
    return (
      <GameErrorBoundary>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              読み込み中...
            </div>
          }
        >
          <div
            style={{
              position: "fixed",
              top: APP_HEADER_HEIGHT_MOBILE,
              left: 0,
              right: 0,
              bottom: MOBILE_TAB_BAR_HEIGHT,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                visibility: mobileTab === "game" ? "visible" : "hidden",
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {board}
            </div>
            <div
              style={{
                position: "absolute",
                inset: 0,
                visibility: mobileTab === "sidebar" ? "visible" : "hidden",
                overflowY: "auto",
              }}
            >
              {sidebarContent}
            </div>
          </div>
          <MobileTabBar activeTab={mobileTab} onTabChange={setMobileTab} />
        </Suspense>
      </GameErrorBoundary>
    );
  }

  return (
    <GameErrorBoundary>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            読み込み中...
          </div>
        }
      >
        {/* サイドバー幅分の右余白をラッパーで確保（通常フローのゲーム向け） */}
        {/* position:fixed のゲームは CSS var --sidebar-right-offset で個別対応済み */}
        <div style={{ paddingRight: "var(--sidebar-right-offset, 0px)" }}>
          {board}
        </div>
        <GameSidebar>{sidebarContent}</GameSidebar>
      </Suspense>
    </GameErrorBoundary>
  );
}
