import { type AiueBattleState, BOARD_CHARS, WORD_LENGTH } from "./types.js";

const DAKUTEN_MAP: Record<string, string> = {
  "が": "か", "ぎ": "き", "ぐ": "く", "げ": "け", "ご": "こ",
  "ざ": "さ", "じ": "し", "ず": "す", "ぜ": "せ", "ぞ": "そ",
  "だ": "た", "ぢ": "ち", "づ": "つ", "で": "て", "ど": "と",
  "ば": "は", "び": "ひ", "ぶ": "ふ", "べ": "へ", "ぼ": "ほ",
  "ぱ": "は", "ぴ": "ひ", "ぷ": "ふ", "ぺ": "へ", "ぽ": "ほ",
};

const SMALL_MAP: Record<string, string> = {
  "っ": "つ", "ゃ": "や", "ゅ": "ゆ", "ょ": "よ",
  "ぁ": "あ", "ぃ": "い", "ぅ": "う", "ぇ": "え", "ぉ": "お",
};

export function normalizeChar(char: string): string {
  if (DAKUTEN_MAP[char]) return DAKUTEN_MAP[char];
  if (SMALL_MAP[char]) return SMALL_MAP[char];
  return char;
}

export function isValidWord(word: string[]): boolean {
  const realChars = word.filter((c) => c !== "×");
  if (realChars.length < 2 || realChars.length > WORD_LENGTH) return false;
  const boardSet = new Set<string>(BOARD_CHARS);
  return realChars.every((c) => boardSet.has(c));
}

export function padWord(chars: string[]): string[] {
  const result = [...chars];
  while (result.length < WORD_LENGTH) {
    result.push("×");
  }
  return result.slice(0, WORD_LENGTH);
}

export function getActivePlayers(state: AiueBattleState): string[] {
  return state.playerIds.filter((id) => !state.eliminatedPlayers.includes(id));
}

export function getNextActivePlayerIndex(
  state: AiueBattleState,
  fromIndex: number
): number {
  const n = state.playerIds.length;
  let idx = (fromIndex + 1) % n;
  for (let i = 0; i < n; i++) {
    if (!state.eliminatedPlayers.includes(state.playerIds[idx])) {
      return idx;
    }
    idx = (idx + 1) % n;
  }
  return fromIndex;
}

export function processAttack(
  state: AiueBattleState,
  charIndex: number,
  attackerId: string
): AiueBattleState {
  const char = BOARD_CHARS[charIndex];

  const newUsedChars = [...state.usedChars];
  newUsedChars[charIndex] = true;

  const newRevealed: Record<string, boolean[]> = {};
  for (const id of state.playerIds) {
    newRevealed[id] = [...state.revealed[id]];
  }

  let hit = false;

  for (const playerId of state.playerIds) {
    const word = state.words[playerId];
    for (let i = 0; i < word.length; i++) {
      if (word[i] === char && !newRevealed[playerId][i]) {
        newRevealed[playerId][i] = true;
        hit = true;
      }
    }
  }

  const newEliminated = [...state.eliminatedPlayers];
  const newEliminationOrder = [...state.eliminationOrder];

  for (const playerId of state.playerIds) {
    if (newEliminated.includes(playerId)) continue;
    const word = state.words[playerId];
    const allRevealed = word.every((c, i) => c === "×" || newRevealed[playerId][i]);
    if (allRevealed) {
      newEliminated.push(playerId);
      newEliminationOrder.push(playerId);
      // Reveal remaining × chars
      for (let i = 0; i < word.length; i++) {
        newRevealed[playerId][i] = true;
      }
    }
  }

  const active = state.playerIds.filter((id) => !newEliminated.includes(id));
  let finished = false;
  let winnerId: string | null = null;

  if (active.length <= 1) {
    finished = true;
    winnerId = active.length === 1 ? active[0] : attackerId;
  }

  const newState: AiueBattleState = {
    ...state,
    usedChars: newUsedChars,
    revealed: newRevealed,
    eliminatedPlayers: newEliminated,
    eliminationOrder: newEliminationOrder,
    lastAttackHit: hit,
    lastAttackChar: char,
    finished,
    winnerId,
  };

  if (finished) {
    return newState;
  }

  const attackerEliminated = newEliminated.includes(attackerId);

  if (attackerEliminated || !hit) {
    // Attacker eliminated or miss → next player
    newState.currentPlayerIndex = getNextActivePlayerIndex(
      newState,
      state.currentPlayerIndex
    );
    newState.attackCount = 0;
  } else {
    // Hit and attacker not eliminated
    const newAttackCount = state.attackCount + 1;
    if (newAttackCount >= 2) {
      newState.currentPlayerIndex = getNextActivePlayerIndex(
        newState,
        state.currentPlayerIndex
      );
      newState.attackCount = 0;
    } else {
      newState.attackCount = newAttackCount;
    }
  }

  return newState;
}
