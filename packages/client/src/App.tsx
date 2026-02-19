import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import { AppHeader } from "./components/AppHeader";
import { Lobby } from "./components/Lobby";
import { RoomPage } from "./components/RoomPage";
import { RoomProvider } from "./context/RoomContext";

/** RoomProvider（useNavigate を使う）をルーターの内側に置くためのレイアウトルート */
function Layout() {
  return (
    <RoomProvider>
      <AppHeader />
      <Outlet />
    </RoomProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Lobby /> },
      { path: "/room/:code", element: <RoomPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
