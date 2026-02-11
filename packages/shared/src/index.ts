export type { GameDefinition, GameStatus } from "./types/game.js";
export type { Player, RoomInfo } from "./types/room.js";
export type {
  ClientToServerEvents,
  ServerToClientEvents,
  GameResult,
  JoinResult,
} from "./types/protocol.js";
export { getGameDefinition, getAllGames } from "./games/index.js";
export { othelloDefinition } from "./games/othello/index.js";
export type { OthelloState, OthelloMove, CellState, OthelloBoard } from "./games/othello/types.js";
export { getValidMoves, countDiscs } from "./games/othello/logic.js";
export { BOARD_SIZE } from "./games/othello/types.js";
