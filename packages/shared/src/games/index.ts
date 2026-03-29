import type { GameDefinition } from "../types/game.js";
import { aiuebattleDefinition } from "./aiuebattle/index.js";
import { hyperRobotDefinition } from "./hyper-robot/definition.js";
import type { HyperRobotMove, HyperRobotState } from "./hyper-robot/types.js";
import type { AiueBattleMove, AiueBattleState } from "./aiuebattle/types.js";
import { blokusTrigonDefinition } from "./blokus-trigon/index.js";
import type { BlokusTrigonMove, BlokusTrigonState } from "./blokus-trigon/types.js";
import { blokusDefinition } from "./blokus/index.js";
import type { BlokusMove, BlokusState } from "./blokus/types.js";
import { ciaoCiaoDefinition } from "./ciao-ciao/index.js";
import type { CiaoCiaoMove, CiaoCiaoState } from "./ciao-ciao/types.js";
import { citychaseDefinition } from "./citychase/index.js";
import type { CitychaseMove, CitychaseState } from "./citychase/types.js";
import { nanaDefinition } from "./nana/index.js";
import type { NanaMove, NanaState } from "./nana/types.js";
import { nyaMensDefinition } from "./nyamens/index.js";
import type { NyaMensMove, NyaMensState } from "./nyamens/types.js";
import { sonicRestaurantGame } from "./sonic-restaurant/index.js";
import type { SonicRestaurantMove, SonicRestaurantState } from "./sonic-restaurant/types.js";

/** 登録済みゲームIDのリテラル型 */
export type GameId = "aiuebattle" | "ciao-ciao" | "citychase" | "sonic-restaurant" | "blokus" | "blokus-trigon" | "nana" | "nyamens" | "hyper-robot";

/** ゲームID → 具体的な GameDefinition 型のマッピング */
export interface GameDefinitionMap {
  "aiuebattle": GameDefinition<AiueBattleState, AiueBattleMove>;
  "ciao-ciao": GameDefinition<CiaoCiaoState, CiaoCiaoMove>;
  "citychase": GameDefinition<CitychaseState, CitychaseMove>;
  "sonic-restaurant": GameDefinition<SonicRestaurantState, SonicRestaurantMove>;
  "blokus": GameDefinition<BlokusState, BlokusMove>;
  "nana": GameDefinition<NanaState, NanaMove>;
  "nyamens": GameDefinition<NyaMensState, NyaMensMove>;
  "blokus-trigon": GameDefinition<BlokusTrigonState, BlokusTrigonMove>;
  "hyper-robot": GameDefinition<HyperRobotState, HyperRobotMove>;
}

const registry = new Map<string, GameDefinition>();

registry.set(aiuebattleDefinition.id, aiuebattleDefinition);
registry.set(ciaoCiaoDefinition.id, ciaoCiaoDefinition);
registry.set(citychaseDefinition.id, citychaseDefinition);
registry.set(sonicRestaurantGame.id, sonicRestaurantGame);
registry.set(blokusDefinition.id, blokusDefinition);
registry.set(blokusTrigonDefinition.id, blokusTrigonDefinition);
registry.set(nanaDefinition.id, nanaDefinition);
registry.set(nyaMensDefinition.id, nyaMensDefinition);
registry.set(hyperRobotDefinition.id, hyperRobotDefinition);

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
