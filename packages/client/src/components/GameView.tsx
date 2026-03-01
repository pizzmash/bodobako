import { useRoom } from "../context/RoomContext";
import { AiueBattleBoard } from "../games/aiuebattle/AiueBattleBoard";
import { BlokusBoard } from "../games/blokus/BlokusBoard";
import { CitychaseBoard } from "../games/citychase/CitychaseBoard";
import { NanaBoard } from "../games/nana/NanaBoard";
import { NyaMensBoard } from "../games/nyamens/NyaMensBoard";
import { OthelloBoard } from "../games/othello/OthelloBoard";
import { SonicRestaurantBoard } from "../games/sonic-restaurant/SonicRestaurantBoard";

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
    case "sonic-restaurant":
      return <SonicRestaurantBoard />;
    case "blokus":
      return <BlokusBoard />;
    case "nana":
      return <NanaBoard />;
    case "nyamens":
      return <NyaMensBoard />;
    default:
      return <div>未対応のゲーム: {room.gameId}</div>;
  }
}
