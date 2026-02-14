import type { GameDefinition } from "../types/game.js";
import { othelloDefinition } from "./othello/index.js";
import { aiuebattleDefinition } from "./aiuebattle/index.js";
import { citychaseDefinition } from "./citychase/index.js";

const registry = new Map<string, GameDefinition>();

registry.set(othelloDefinition.id, othelloDefinition);
registry.set(aiuebattleDefinition.id, aiuebattleDefinition);
registry.set(citychaseDefinition.id, citychaseDefinition);

export function getGameDefinition(id: string): GameDefinition | undefined {
  return registry.get(id);
}

export function getAllGames(): GameDefinition[] {
  return Array.from(registry.values());
}
