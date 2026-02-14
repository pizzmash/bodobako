export type { GameDefinition, GameStatus } from "./types/game.js";
export type { Player, RoomInfo } from "./types/room.js";
export type {
  ClientToServerEvents,
  ServerToClientEvents,
  GameResult,
  JoinResult,
  ReconnectResult,
} from "./types/protocol.js";
export { getGameDefinition, getAllGames } from "./games/index.js";
export { othelloDefinition } from "./games/othello/index.js";
export type { OthelloState, OthelloMove, CellState, OthelloBoard } from "./games/othello/types.js";
export { getValidMoves, countDiscs } from "./games/othello/logic.js";
export { BOARD_SIZE } from "./games/othello/types.js";
export { aiuebattleDefinition } from "./games/aiuebattle/index.js";
export type { AiueBattleState, AiueBattleMove } from "./games/aiuebattle/types.js";
export { BOARD_CHARS, TOPIC_LIST, WORD_LENGTH } from "./games/aiuebattle/types.js";
export { normalizeChar, isValidWord, padWord, getActivePlayers } from "./games/aiuebattle/logic.js";
export { citychaseDefinition } from "./games/citychase/index.js";
export type {
  CitychaseState,
  CitychaseMove,
  CitychasePlayerView,
  CitychasePhase,
  BuildingPos,
  IntersectionPos,
  RevealedTrace,
  SearchResult,
} from "./games/citychase/types.js";
export {
  BOARD_SIZE as CITYCHASE_BOARD_SIZE,
  INTERSECTION_SIZE,
  HELICOPTER_COUNT,
  MAX_ROUNDS,
  getAdjacentBuildings,
  getAdjacentIntersections,
  getSurroundingBuildings,
  getValidCriminalMoves,
  getHelicoptersForPlayer,
  posKey,
  isSamePos,
} from "./games/citychase/logic.js";
