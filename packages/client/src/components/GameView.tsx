import { useRoom } from "../context/RoomContext";
import { OthelloBoard } from "../games/othello/OthelloBoard";
import { AiueBattleBoard } from "../games/aiuebattle/AiueBattleBoard";

export function GameView() {
  const { room } = useRoom();
  if (!room) return null;

  switch (room.gameId) {
    case "othello":
      return <OthelloBoard />;
    case "aiuebattle":
      return <AiueBattleBoard />;
    default:
      return <div>未対応のゲーム: {room.gameId}</div>;
  }
}
