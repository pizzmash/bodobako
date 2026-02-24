import { useState } from "react";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import { AppHeader } from "./components/AppHeader";
import { Lobby } from "./components/Lobby";
import { Room } from "./components/Room";
import { RoomPage } from "./components/RoomPage";
import { Sidebar } from "./components/Sidebar";
import { AuthProvider } from "./context/AuthContext";
import { RoomProvider, useRoom } from "./context/RoomContext";

/**
 * Lobby を常時マウントするレイアウトコンテンツ。
 * ルート遷移でアンマウントされないため、入場アニメーションが再実行されない。
 */
function LayoutContent() {
  const { room, isCreatingRoom } = useRoom();
  const isPlaying =
    room != null &&
    (room.status === "playing" || room.status === "finished");

  return (
    <>
      {/* Lobby は常時マウント。ゲーム中は非表示 */}
      {!isPlaying && <Lobby />}
      {/* / ルートでのルーム作成中ローディングモーダル */}
      {isCreatingRoom && <Room />}
      {/* /room/:code のオーバーレイ */}
      <Outlet />
    </>
  );
}

function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <AuthProvider>
      <RoomProvider>
        <AppHeader onMenuClick={() => setIsSidebarOpen(true)} />
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <LayoutContent />
      </RoomProvider>
    </AuthProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: null },
      { path: "/room/:code", element: <RoomPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
