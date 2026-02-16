import type { GameDefinition } from "../types/game.js";
import { aiuebattleDefinition } from "./aiuebattle/index.js";
import { citychaseDefinition } from "./citychase/index.js";
import { othelloDefinition } from "./othello/index.js";
import { sonicRestaurantGame } from "./sonic-restaurant/index.js";

const registry = new Map<string, GameDefinition>();

registry.set(othelloDefinition.id, othelloDefinition);
registry.set(aiuebattleDefinition.id, aiuebattleDefinition);
registry.set(citychaseDefinition.id, citychaseDefinition);
registry.set(sonicRestaurantGame.id, sonicRestaurantGame);

export function getGameDefinition(id: string): GameDefinition | undefined {
  return registry.get(id);
}

export function getAllGames(): GameDefinition[] {
  return Array.from(registry.values());
}
