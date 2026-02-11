export interface Player {
  id: string;
  name: string;
}

export interface RoomInfo {
  code: string;
  gameId: string;
  players: Player[];
  hostId: string;
  status: "waiting" | "playing" | "finished";
  gameState: unknown | null;
}
