import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppHeader } from "./components/AppHeader";
import { Lobby } from "./components/Lobby";
import { RoomPage } from "./components/RoomPage";
import { RoomProvider } from "./context/RoomContext";

export default function App() {
  return (
    <BrowserRouter>
      <RoomProvider>
        <AppHeader />
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/room/:code" element={<RoomPage />} />
        </Routes>
      </RoomProvider>
    </BrowserRouter>
  );
}
