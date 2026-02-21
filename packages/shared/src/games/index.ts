import type { GameDefinition } from "../types/game.js";
import { aiuebattleDefinition } from "./aiuebattle/index.js";
import type { AiueBattleMove, AiueBattleState } from "./aiuebattle/types.js";
import { blokusDefinition } from "./blokus/index.js";
import type { BlokusMove, BlokusState } from "./blokus/types.js";
import { citychaseDefinition } from "./citychase/index.js";
import type { CitychaseMove, CitychaseState } from "./citychase/types.js";
import { nanaDefinition } from "./nana/index.js";
import type { NanaMove, NanaState } from "./nana/types.js";
import { othelloDefinition } from "./othello/index.js";
import type { OthelloMove, OthelloState } from "./othello/types.js";
import { sonicRestaurantGame } from "./sonic-restaurant/index.js";
import type { SonicRestaurantMove, SonicRestaurantState } from "./sonic-restaurant/types.js";

/** 登録済みゲームIDのリテラル型 */
export type GameId = "othello" | "aiuebattle" | "citychase" | "sonic-restaurant" | "blokus" | "nana";

/** ゲームID → 具体的な GameDefinition 型のマッピング */
export interface GameDefinitionMap {
  "othello": GameDefinition<OthelloState, OthelloMove>;
  "aiuebattle": GameDefinition<AiueBattleState, AiueBattleMove>;
  "citychase": GameDefinition<CitychaseState, CitychaseMove>;
  "sonic-restaurant": GameDefinition<SonicRestaurantState, SonicRestaurantMove>;
  "blokus": GameDefinition<BlokusState, BlokusMove>;
  "nana": GameDefinition<NanaState, NanaMove>;
}

const registry = new Map<string, GameDefinition>();

registry.set(othelloDefinition.id, othelloDefinition);
registry.set(aiuebattleDefinition.id, aiuebattleDefinition);
registry.set(citychaseDefinition.id, citychaseDefinition);
registry.set(sonicRestaurantGame.id, sonicRestaurantGame);
registry.set(blokusDefinition.id, blokusDefinition);
registry.set(nanaDefinition.id, nanaDefinition);

/**
 * 既知のゲームID（リテラル型）に対してはゲーム固有の型付き定義を返す。
 * 動的な string の場合は後方互換として `GameDefinition | undefined` を返す。
 */
export function getGameDefinition<K extends GameId>(id: K): GameDefinitionMap[K];
export function getGameDefinition(id: string): GameDefinition | undefined;
export function getGameDefinition(id: string): GameDefinition | undefined {
  return registry.get(id);
}

export function getAllGames(): GameDefinition[] {
  return Array.from(registry.values());
}
