import { useRoom } from "../context/RoomContext";
import { OthelloBoard } from "../games/othello/OthelloBoard";

export function GameView() {
  const { room } = useRoom();
  if (!room) return null;

  switch (room.gameId) {
    case "othello":
      return <OthelloBoard />;
    default:
      return <div>未対応のゲーム: {room.gameId}</div>;
  }
}
