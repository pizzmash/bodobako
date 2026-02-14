import { useRoom } from "../context/RoomContext";
import { OthelloBoard } from "../games/othello/OthelloBoard";
import { AiueBattleBoard } from "../games/aiuebattle/AiueBattleBoard";
import { CitychaseBoard } from "../games/citychase/CitychaseBoard";

export function GameView() {
  const { room } = useRoom();
  if (!room) return null;

  switch (room.gameId) {
    case "othello":
      return <OthelloBoard />;
    case "aiuebattle":
      return <AiueBattleBoard />;
    case "citychase":
      return <CitychaseBoard />;
    default:
      return <div>未対応のゲーム: {room.gameId}</div>;
  }
}
