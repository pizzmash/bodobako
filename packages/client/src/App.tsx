import { RoomProvider, useRoom } from "./context/RoomContext";
import { AppHeader } from "./components/AppHeader";
import { NameEntryModal } from "./components/NameEntryModal";
import { Lobby } from "./components/Lobby";
import { Room } from "./components/Room";
import { GameView } from "./components/GameView";

function AppContent() {
  const { room, playerName } = useRoom();

  return (
    <>
      <AppHeader />
      {room && room.status !== "waiting" ? (
        <GameView />
      ) : (
        <>
          <Lobby />
          {room && room.status === "waiting" && <Room />}
        </>
      )}
      {!playerName && !room && <NameEntryModal />}
    </>
  );
}

export default function App() {
  return (
    <RoomProvider>
      <AppContent />
    </RoomProvider>
  );
}
