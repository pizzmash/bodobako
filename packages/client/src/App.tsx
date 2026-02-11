import { RoomProvider, useRoom } from "./context/RoomContext";
import { Lobby } from "./components/Lobby";
import { Room } from "./components/Room";
import { GameView } from "./components/GameView";

function AppContent() {
  const { room } = useRoom();

  if (!room) return <Lobby />;
  if (room.status === "waiting") return <Room />;
  return <GameView />;
}

export default function App() {
  return (
    <RoomProvider>
      <AppContent />
    </RoomProvider>
  );
}
