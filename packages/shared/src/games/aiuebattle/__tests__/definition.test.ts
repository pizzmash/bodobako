import { describe, it, expect } from "vitest";
import { aiuebattleDefinition } from "../definition.js";
import { BOARD_CHARS, WORD_LENGTH, type AiueBattleState } from "../types.js";

const P1 = "player1";
const P2 = "player2";
const P3 = "player3";

// 有効なボードの文字（先頭2文字）
const VALID_WORD = [BOARD_CHARS[0], BOARD_CHARS[1]]; // "あ", "い"
const VALID_WORD_P2 = [BOARD_CHARS[2], BOARD_CHARS[3]]; // "う", "え"

function makeWordInputState(playerIds: string[]): AiueBattleState {
  return {
    ...aiuebattleDefinition.createInitialState(playerIds),
    phase: "word-input",
    topic: "テスト",
  };
}

function makeBattleState(playerIds: string[], words: Record<string, string[]>): AiueBattleState {
  const revealed: Record<string, (boolean | "end")[]> = {};
  for (const id of playerIds) {
    revealed[id] = Array(WORD_LENGTH).fill(false);
  }
  return {
    ...aiuebattleDefinition.createInitialState(playerIds),
    phase: "battle",
    topic: "テスト",
    words,
    submittedPlayers: [...playerIds],
    revealed,
    currentPlayerIndex: 0,
  };
}

describe("createInitialState", () => {
  it("playerIdsが設定される", () => {
    const state = aiuebattleDefinition.createInitialState([P1, P2]);
    expect(state.playerIds).toEqual([P1, P2]);
  });

  it("初期フェーズはtopic-select", () => {
    const state = aiuebattleDefinition.createInitialState([P1, P2]);
    expect(state.phase).toBe("topic-select");
  });

  it("topicSelectorIdはplayerIds[0]", () => {
    const state = aiuebattleDefinition.createInitialState([P1, P2]);
    expect(state.topicSelectorId).toBe(P1);
  });

  it("finished=falseで始まる", () => {
    const state = aiuebattleDefinition.createInitialState([P1, P2]);
    expect(state.finished).toBe(false);
  });

  it("usedCharsはBOARD_CHARS.lengthのfalse配列", () => {
    const state = aiuebattleDefinition.createInitialState([P1, P2]);
    expect(state.usedChars).toHaveLength(BOARD_CHARS.length);
    expect(state.usedChars.every((v) => v === false)).toBe(true);
  });
});

describe("parseMove", () => {
  it("select-topicを正しくパースする", () => {
    const move = aiuebattleDefinition.parseMove!({ type: "select-topic", topic: "食べ物" });
    expect(move).toEqual({ type: "select-topic", topic: "食べ物" });
  });

  it("submit-wordを正しくパースする", () => {
    const move = aiuebattleDefinition.parseMove!({ type: "submit-word", word: ["あ", "い"] });
    expect(move).toEqual({ type: "submit-word", word: ["あ", "い"] });
  });

  it("attackを正しくパースする", () => {
    const move = aiuebattleDefinition.parseMove!({ type: "attack", charIndex: 5 });
    expect(move).toEqual({ type: "attack", charIndex: 5 });
  });

  it("不明なtypeはnull", () => {
    expect(aiuebattleDefinition.parseMove!({ type: "unknown" })).toBeNull();
  });

  it("typeがない場合はnull", () => {
    expect(aiuebattleDefinition.parseMove!({ topic: "食べ物" })).toBeNull();
  });

  it("nullはnull", () => {
    expect(aiuebattleDefinition.parseMove!(null)).toBeNull();
  });

  it("select-topicでtopicが文字列でない場合はnull", () => {
    expect(aiuebattleDefinition.parseMove!({ type: "select-topic", topic: 123 })).toBeNull();
  });

  it("submit-wordでwordが配列でない場合はnull", () => {
    expect(aiuebattleDefinition.parseMove!({ type: "submit-word", word: "あい" })).toBeNull();
  });

  it("attackでcharIndexが整数でない場合はnull", () => {
    expect(aiuebattleDefinition.parseMove!({ type: "attack", charIndex: 1.5 })).toBeNull();
    expect(aiuebattleDefinition.parseMove!({ type: "attack", charIndex: "0" })).toBeNull();
  });
});

describe("validateMove - topic-select フェーズ", () => {
  it("topicSelectorIdがお題を選択できる", () => {
    const state = aiuebattleDefinition.createInitialState([P1, P2]);
    expect(
      aiuebattleDefinition.validateMove(state, { type: "select-topic", topic: "食べ物" }, P1)
    ).toBe(true);
  });

  it("topicSelector以外はお題を選択できない", () => {
    const state = aiuebattleDefinition.createInitialState([P1, P2]);
    expect(
      aiuebattleDefinition.validateMove(state, { type: "select-topic", topic: "食べ物" }, P2)
    ).toBe(false);
  });

  it("空のtopicは無効", () => {
    const state = aiuebattleDefinition.createInitialState([P1, P2]);
    expect(
      aiuebattleDefinition.validateMove(state, { type: "select-topic", topic: "" }, P1)
    ).toBe(false);
    expect(
      aiuebattleDefinition.validateMove(state, { type: "select-topic", topic: "   " }, P1)
    ).toBe(false);
  });

  it("topic-selectフェーズにattackは不可", () => {
    const state = aiuebattleDefinition.createInitialState([P1, P2]);
    expect(
      aiuebattleDefinition.validateMove(state, { type: "attack", charIndex: 0 }, P1)
    ).toBe(false);
  });
});

describe("validateMove - word-input フェーズ", () => {
  it("有効な単語を提出できる", () => {
    const state = makeWordInputState([P1, P2]);
    expect(
      aiuebattleDefinition.validateMove(state, { type: "submit-word", word: VALID_WORD }, P1)
    ).toBe(true);
  });

  it("無効な単語（BOARD_CHARSにない文字）は提出できない", () => {
    const state = makeWordInputState([P1, P2]);
    expect(
      aiuebattleDefinition.validateMove(state, { type: "submit-word", word: ["が", "き"] }, P1)
    ).toBe(false);
  });

  it("同じプレイヤーは2回提出できない", () => {
    const state: AiueBattleState = {
      ...makeWordInputState([P1, P2]),
      submittedPlayers: [P1], // P1は既に提出済み
    };
    expect(
      aiuebattleDefinition.validateMove(state, { type: "submit-word", word: VALID_WORD }, P1)
    ).toBe(false);
  });

  it("word-inputフェーズにselect-topicは不可", () => {
    const state = makeWordInputState([P1, P2]);
    expect(
      aiuebattleDefinition.validateMove(state, { type: "select-topic", topic: "テスト" }, P1)
    ).toBe(false);
  });

  it("存在しないプレイヤーは提出できない", () => {
    const state = makeWordInputState([P1, P2]);
    expect(
      aiuebattleDefinition.validateMove(state, { type: "submit-word", word: VALID_WORD }, "unknown")
    ).toBe(false);
  });
});

describe("validateMove - battle フェーズ", () => {
  it("現在のプレイヤーが未使用の文字を攻撃できる", () => {
    const words = {
      [P1]: ["あ", "×", "×", "×", "×", "×", "×"],
      [P2]: ["い", "×", "×", "×", "×", "×", "×"],
    };
    const state = makeBattleState([P1, P2], words);
    expect(
      aiuebattleDefinition.validateMove(state, { type: "attack", charIndex: 0 }, P1)
    ).toBe(true);
  });

  it("手番外のプレイヤーは攻撃できない", () => {
    const words = {
      [P1]: ["あ", "×", "×", "×", "×", "×", "×"],
      [P2]: ["い", "×", "×", "×", "×", "×", "×"],
    };
    const state = makeBattleState([P1, P2], words); // currentPlayerIndex=0=P1の番
    expect(
      aiuebattleDefinition.validateMove(state, { type: "attack", charIndex: 0 }, P2)
    ).toBe(false);
  });

  it("使用済みの文字は攻撃できない", () => {
    const words = {
      [P1]: ["あ", "×", "×", "×", "×", "×", "×"],
      [P2]: ["い", "×", "×", "×", "×", "×", "×"],
    };
    const usedChars = Array(BOARD_CHARS.length).fill(false);
    usedChars[0] = true; // charIndex=0は使用済み
    const state = makeBattleState([P1, P2], words);
    const stateWithUsed: AiueBattleState = { ...state, usedChars };
    expect(
      aiuebattleDefinition.validateMove(stateWithUsed, { type: "attack", charIndex: 0 }, P1)
    ).toBe(false);
  });

  it("範囲外のcharIndexは無効", () => {
    const words = {
      [P1]: ["あ", "×", "×", "×", "×", "×", "×"],
      [P2]: ["い", "×", "×", "×", "×", "×", "×"],
    };
    const state = makeBattleState([P1, P2], words);
    expect(
      aiuebattleDefinition.validateMove(state, { type: "attack", charIndex: -1 }, P1)
    ).toBe(false);
    expect(
      aiuebattleDefinition.validateMove(state, { type: "attack", charIndex: BOARD_CHARS.length }, P1)
    ).toBe(false);
  });

  it("finishedなら誰も攻撃できない", () => {
    const words = {
      [P1]: ["あ", "×", "×", "×", "×", "×", "×"],
      [P2]: ["い", "×", "×", "×", "×", "×", "×"],
    };
    const state: AiueBattleState = { ...makeBattleState([P1, P2], words), finished: true };
    expect(
      aiuebattleDefinition.validateMove(state, { type: "attack", charIndex: 0 }, P1)
    ).toBe(false);
  });
});

describe("applyMove - topic-select → word-input", () => {
  it("お題選択でword-inputフェーズに移行する", () => {
    const state = aiuebattleDefinition.createInitialState([P1, P2]);
    const newState = aiuebattleDefinition.applyMove(
      state,
      { type: "select-topic", topic: "食べ物" },
      P1
    );
    expect(newState.phase).toBe("word-input");
    expect(newState.topic).toBe("食べ物");
  });

  it("topicがtrimされる", () => {
    const state = aiuebattleDefinition.createInitialState([P1, P2]);
    const newState = aiuebattleDefinition.applyMove(
      state,
      { type: "select-topic", topic: "  食べ物  " },
      P1
    );
    expect(newState.topic).toBe("食べ物");
  });
});

describe("applyMove - word-input → battle", () => {
  it("全員提出でbattleフェーズに移行する", () => {
    const state = makeWordInputState([P1, P2]);

    const state1 = aiuebattleDefinition.applyMove(
      state,
      { type: "submit-word", word: VALID_WORD },
      P1
    );
    expect(state1.phase).toBe("word-input"); // まだ移行しない

    const state2 = aiuebattleDefinition.applyMove(
      state1,
      { type: "submit-word", word: VALID_WORD_P2 },
      P2
    );
    expect(state2.phase).toBe("battle"); // 全員提出で移行
  });

  it("提出後、wordsに単語が記録される", () => {
    const state = makeWordInputState([P1, P2]);
    const newState = aiuebattleDefinition.applyMove(
      state,
      { type: "submit-word", word: VALID_WORD },
      P1
    );
    expect(newState.words[P1]).toBeDefined();
    expect(newState.words[P1]).toHaveLength(WORD_LENGTH); // padWordされている
  });

  it("3人全員提出でbattleに移行する", () => {
    const state = makeWordInputState([P1, P2, P3]);
    const WORD_P3 = [BOARD_CHARS[4], BOARD_CHARS[5]]; // "お", "か"

    const s1 = aiuebattleDefinition.applyMove(state, { type: "submit-word", word: VALID_WORD }, P1);
    const s2 = aiuebattleDefinition.applyMove(s1, { type: "submit-word", word: VALID_WORD_P2 }, P2);
    const s3 = aiuebattleDefinition.applyMove(s2, { type: "submit-word", word: WORD_P3 }, P3);
    expect(s3.phase).toBe("battle");
  });
});

describe("getStatus", () => {
  it("finished=falseなら'playing'", () => {
    const state = aiuebattleDefinition.createInitialState([P1, P2]);
    expect(aiuebattleDefinition.getStatus(state)).toBe("playing");
  });

  it("finished=trueなら'finished'", () => {
    const state: AiueBattleState = {
      ...aiuebattleDefinition.createInitialState([P1, P2]),
      finished: true,
    };
    expect(aiuebattleDefinition.getStatus(state)).toBe("finished");
  });
});

describe("getRanking", () => {
  it("finishedでなければnullを返す", () => {
    const state = aiuebattleDefinition.createInitialState([P1, P2]);
    expect(aiuebattleDefinition.getRanking(state)).toBeNull();
  });

  it("生き残り1人が勝者として1位になる", () => {
    const state: AiueBattleState = {
      ...aiuebattleDefinition.createInitialState([P1, P2]),
      finished: true,
      eliminatedPlayers: [P1],
      eliminationOrder: [P1],
    };
    const ranking = aiuebattleDefinition.getRanking(state);
    expect(ranking![0]).toBe(P2);
    expect(ranking).toContain(P1);
  });

  it("全員同時脱落ではeliminationOrderの末尾が1位になる", () => {
    // p1が攻撃、p1がeliminationOrderの末尾（processAttackが移動する）
    const state: AiueBattleState = {
      ...aiuebattleDefinition.createInitialState([P1, P2]),
      finished: true,
      eliminatedPlayers: [P1, P2],
      eliminationOrder: [P2, P1], // p1(攻撃者)が末尾
    };
    const ranking = aiuebattleDefinition.getRanking(state);
    expect(ranking![0]).toBe(P1);
    expect(ranking![1]).toBe(P2);
  });
});

describe("getCurrentPlayerId", () => {
  it("topic-selectフェーズでtopicSelectorIdを返す", () => {
    const state = aiuebattleDefinition.createInitialState([P1, P2]);
    expect(aiuebattleDefinition.getCurrentPlayerId(state)).toBe(P1);
  });

  it("word-inputフェーズで空文字を返す（全員同時入力のため手番なし）", () => {
    const state: AiueBattleState = {
      ...makeWordInputState([P1, P2]),
      submittedPlayers: [P1], // P1は提出済み
    };
    expect(aiuebattleDefinition.getCurrentPlayerId(state)).toBe("");
  });

  it("battleフェーズでcurrentPlayerIndexのプレイヤーを返す", () => {
    const words = {
      [P1]: ["あ", "×", "×", "×", "×", "×", "×"],
      [P2]: ["い", "×", "×", "×", "×", "×", "×"],
    };
    const state = makeBattleState([P1, P2], words);
    expect(aiuebattleDefinition.getCurrentPlayerId(state)).toBe(P1);
  });
});
