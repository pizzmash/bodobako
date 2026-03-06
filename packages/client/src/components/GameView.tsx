import { Component, lazy, Suspense, type ReactElement, type ReactNode } from "react";
import { useRoom } from "../context/RoomContext";

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

export function GameView() {
  const { room } = useRoom();
  if (!room) return null;

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
    default:
      board = <div>未対応のゲーム: {room.gameId}</div>;
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
        {board}
      </Suspense>
    </GameErrorBoundary>
  );
}
