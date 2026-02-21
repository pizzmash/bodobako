export { aiuebattleDefinition } from "./games/aiuebattle/index.js";
export { getActivePlayers, isValidWord, normalizeChar, padWord } from "./games/aiuebattle/logic.js";
export { BOARD_CHARS, TOPIC_LIST, WORD_LENGTH } from "./games/aiuebattle/types.js";
export type { AiueBattleMove, AiueBattleState } from "./games/aiuebattle/types.js";
export {
    PIECES, TOTAL_VARIANTS, blokusDefinition, boardToGrid, canPlace, computePlayerRemainingCells,
    getValidPlacements
} from "./games/blokus/index.js";
export type { Placement } from "./games/blokus/logic.js";
export { BOARD_SIZE as BLOKUS_BOARD_SIZE, NUM_COLORS, NUM_PIECES, START_CORNERS } from "./games/blokus/types.js";
export type {
    BlokusMove, BlokusState, ColorBoards, ColorOwner,
    PieceDefinition, PieceVariant, RemainingPieces
} from "./games/blokus/types.js";
export { citychaseDefinition } from "./games/citychase/index.js";
export {
    BOARD_SIZE as CITYCHASE_BOARD_SIZE, HELICOPTER_COUNT, INTERSECTION_SIZE, MAX_ROUNDS, getAdjacentBuildings,
    getAdjacentIntersections, getHelicoptersForPlayer, getSurroundingBuildings,
    getValidCriminalMoves, isSamePos, posKey
} from "./games/citychase/logic.js";
export type {
    BuildingPos, CitychaseMove, CitychasePhase, CitychasePlayerView, CitychaseState, IntersectionPos,
    RevealedTrace,
    SearchResult
} from "./games/citychase/types.js";
export { getAllGames, getGameDefinition } from "./games/index.js";
export type { GameDefinitionMap, GameId } from "./games/index.js";
export { othelloDefinition } from "./games/othello/index.js";
export { countDiscs, getValidMoves } from "./games/othello/logic.js";
export { BOARD_SIZE } from "./games/othello/types.js";
export type { CellState, OthelloBoard, OthelloMove, OthelloState } from "./games/othello/types.js";
export { sonicRestaurantGame } from "./games/sonic-restaurant/index.js";
export { buildMenuTree, canPlayCard } from "./games/sonic-restaurant/logic.js";
export { CARD_COUNTS, MENUS } from "./games/sonic-restaurant/types.js";
export type {
    Card, CompletedMenu, MenuTreeNode, SonicRestaurantMove, SonicRestaurantState
} from "./games/sonic-restaurant/types.js";
export type { GameDefinition, GameStatus } from "./types/game.js";
export type {
    GameResult, WsAckError, WsAckSuccess, WsClientMessage, WsServerMessage
} from "./types/protocol.js";
export type { Player, RoomInfo } from "./types/room.js";

