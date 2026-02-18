import { AppHeader } from "./components/AppHeader";
import { GameView } from "./components/GameView";
import { Lobby } from "./components/Lobby";
import { NameEntryModal } from "./components/NameEntryModal";
import { Room } from "./components/Room";
import { RoomProvider, useRoom } from "./context/RoomContext";

function AppContent() {
  const { room, playerName, isCreatingRoom } = useRoom();

  return (
    <>
      <AppHeader />
      {room && room.status !== "waiting" ? (
        <GameView />
      ) : (
        <>
          <Lobby />
          {(isCreatingRoom || (room && room.status === "waiting")) && <Room />}
        </>
      )}
      {!playerName && !room && !isCreatingRoom && <NameEntryModal />}
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
