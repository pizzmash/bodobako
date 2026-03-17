export { aiuebattleDefinition } from "./games/aiuebattle/index.js";
export { getActivePlayers, isValidWord, normalizeChar, padWord } from "./games/aiuebattle/logic.js";
export { BOARD_CHARS, TOPIC_LIST, WORD_LENGTH } from "./games/aiuebattle/types.js";
export type { AiueBattleMove, AiueBattleState } from "./games/aiuebattle/types.js";
export { BORDER_MASK, ROW_RANGES, VALID_MASK, isUpTriangle, isTrigonBorderCell, isValidCell, startBitFor } from "./games/blokus-trigon/board.js";
export {
    PIECES as TRIGON_PIECES, TOTAL_CELLS as TRIGON_TOTAL_CELLS, TOTAL_VARIANTS as TRIGON_TOTAL_VARIANTS, blokusTrigonDefinition, boardToGrid as trigonBoardToGrid,
    canPlace as trigonCanPlace, computePlayerPenalty as trigonComputePlayerScore, computeRemainingCells as trigonComputeRemainingCells,
    computePenalty as trigonComputeScore, getCurrentPlayerId as trigonGetCurrentPlayerId,
    getValidPlacements as trigonGetValidPlacements
} from "./games/blokus-trigon/index.js";
export type { Placement as TrigonPlacement } from "./games/blokus-trigon/logic.js";
export { GRID_COLS, GRID_ROWS, START_POSITIONS, START_POSITIONS_3P, MAX_COLORS as TRIGON_MAX_COLORS, NUM_PIECES as TRIGON_NUM_PIECES } from "./games/blokus-trigon/types.js";
export type {
    BlokusTrigonMove, BlokusTrigonState,
    PieceDefinition as TrigonPieceDefinition,
    PieceVariant as TrigonPieceVariant
} from "./games/blokus-trigon/types.js";
export {
    PIECES, TOTAL_VARIANTS, blokusDefinition, boardToGrid, canPlace, computePlayerRemainingCells,
    computeRemainingCells, getCurrentPlayerId, getValidPlacements
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
export { nanaDefinition } from "./games/nana/index.js";
export { checkWinCondition, createDeck, getActiveHandCard } from "./games/nana/logic.js";
export type { NanaCard, NanaCardView, NanaMove, NanaState, NanaStateView } from "./games/nana/types.js";
export { nyaMensDefinition } from "./games/nyamens/index.js";
export type {
    NyaCard, NyaEventCard, NyaMensMove, NyaMensPhase, NyaMensPlayerView,
    NyaMensState, NyaMensTrack, NyaRole
} from "./games/nyamens/types.js";
export { sonicRestaurantGame } from "./games/sonic-restaurant/index.js";
export { buildMenuTree, canPlayCard } from "./games/sonic-restaurant/logic.js";
export { CARD_COUNTS, MENUS } from "./games/sonic-restaurant/types.js";
export type {
    Card, CompletedMenu, MenuTreeNode, SonicRestaurantMove, SonicRestaurantState
} from "./games/sonic-restaurant/types.js";
export type { GameDefinition, GameLogEntry, GameStatus } from "./types/game.js";
export type {
    GameResult, WsAckError, WsAckSuccess, WsClientMessage, WsServerMessage
} from "./types/protocol.js";
export type { Player, RoomInfo } from "./types/room.js";

