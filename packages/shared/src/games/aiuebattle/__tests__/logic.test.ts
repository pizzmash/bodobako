import { describe, it, expect } from "vitest";
import {
  normalizeChar,
  isValidWord,
  padWord,
  getActivePlayers,
  getNextActivePlayerIndex,
  processAttack,
} from "../logic.js";
import { BOARD_CHARS, WORD_LENGTH, type AiueBattleState } from "../types.js";

// テスト用の基本State生成ヘルパー
function makeState(
  playerIds: string[],
  words: Record<string, string[]>,
  overrides: Partial<AiueBattleState> = {}
): AiueBattleState {
  const revealed: Record<string, (boolean | "end")[]> = {};
  for (const id of playerIds) {
    revealed[id] = Array(WORD_LENGTH).fill(false);
  }
  return {
    playerIds,
    phase: "battle",
    topic: "テスト",
    topicSelectorId: playerIds[0],
    words,
    submittedPlayers: [...playerIds],
    usedChars: Array(BOARD_CHARS.length).fill(false),
    currentPlayerIndex: 0,
    attackCount: 0,
    lastAttackHit: false,
    lastAttackChar: null,
    lastAttackPlayerId: null,
    revealed,
    eliminatedPlayers: [],
    eliminationOrder: [],
    finished: false,
    winnerId: null,
    ...overrides,
  };
}

describe("normalizeChar", () => {
  it("濁点文字を基本字に変換する", () => {
    expect(normalizeChar("が")).toBe("か");
    expect(normalizeChar("ぎ")).toBe("き");
    expect(normalizeChar("ぐ")).toBe("く");
    expect(normalizeChar("ざ")).toBe("さ");
    expect(normalizeChar("じ")).toBe("し");
    expect(normalizeChar("だ")).toBe("た");
    expect(normalizeChar("ば")).toBe("は");
    expect(normalizeChar("ぶ")).toBe("ふ");
    expect(normalizeChar("ぼ")).toBe("ほ");
  });

  it("半濁点文字を基本字に変換する", () => {
    expect(normalizeChar("ぱ")).toBe("は");
    expect(normalizeChar("ぴ")).toBe("ひ");
    expect(normalizeChar("ぷ")).toBe("ふ");
    expect(normalizeChar("ぺ")).toBe("へ");
    expect(normalizeChar("ぽ")).toBe("ほ");
  });

  it("小書き文字を通常字に変換する", () => {
    expect(normalizeChar("っ")).toBe("つ");
    expect(normalizeChar("ゃ")).toBe("や");
    expect(normalizeChar("ゅ")).toBe("ゆ");
    expect(normalizeChar("ょ")).toBe("よ");
    expect(normalizeChar("ぁ")).toBe("あ");
    expect(normalizeChar("ぃ")).toBe("い");
    expect(normalizeChar("ぅ")).toBe("う");
    expect(normalizeChar("ぇ")).toBe("え");
    expect(normalizeChar("ぉ")).toBe("お");
  });

  it("正規化不要な文字はそのまま返す", () => {
    expect(normalizeChar("あ")).toBe("あ");
    expect(normalizeChar("か")).toBe("か");
    expect(normalizeChar("ー")).toBe("ー");
  });
});

describe("isValidWord", () => {
  it("BOARD_CHARSにある2〜7文字の配列は有効", () => {
    expect(isValidWord(["あ", "い"])).toBe(true);
    expect(isValidWord(["か", "き", "く", "け", "こ", "さ", "し"])).toBe(true);
  });

  it("1文字以下は無効", () => {
    expect(isValidWord(["あ"])).toBe(false);
    expect(isValidWord([])).toBe(false);
  });

  it("×を除いた実文字が2文字未満は無効", () => {
    // ×はBOARD_CHARSにないので filter で除外される
    expect(isValidWord(["あ", "×"])).toBe(false);
    expect(isValidWord(["×", "×"])).toBe(false);
  });

  it("BOARD_CHARSにない文字が含まれると無効", () => {
    // 濁点文字はBOARD_CHARSに含まれていない（正規化前の文字）
    expect(isValidWord(["が", "き"])).toBe(false);
  });

  it("×を除いた実文字が7文字超は無効", () => {
    // 7文字以上: WORD_LENGTH=7なのでちょうど7はOK
    expect(isValidWord(["あ", "い", "う", "え", "お", "か", "き"])).toBe(true);
    // 8文字: 実文字が8 > WORD_LENGTH
    expect(isValidWord(["あ", "い", "う", "え", "お", "か", "き", "く"])).toBe(false);
  });
});

describe("padWord", () => {
  it("7文字未満の配列を7文字に拡張する", () => {
    const result = padWord(["あ", "い"]);
    expect(result).toHaveLength(WORD_LENGTH);
    expect(result[0]).toBe("あ");
    expect(result[1]).toBe("い");
    expect(result[2]).toBe("×");
    expect(result[6]).toBe("×");
  });

  it("ちょうど7文字はそのまま", () => {
    const chars = ["あ", "い", "う", "え", "お", "か", "き"];
    const result = padWord(chars);
    expect(result).toEqual(chars);
  });

  it("7文字超は7文字に切り詰める", () => {
    const chars = ["あ", "い", "う", "え", "お", "か", "き", "く"];
    const result = padWord(chars);
    expect(result).toHaveLength(WORD_LENGTH);
    expect(result[6]).toBe("き");
  });
});

describe("getActivePlayers", () => {
  it("脱落者なしなら全員が返る", () => {
    const state = makeState(["p1", "p2", "p3"], {
      p1: ["あ", "い", "×", "×", "×", "×", "×"],
      p2: ["う", "え", "×", "×", "×", "×", "×"],
      p3: ["お", "か", "×", "×", "×", "×", "×"],
    });
    expect(getActivePlayers(state)).toEqual(["p1", "p2", "p3"]);
  });

  it("脱落者を除いたリストを返す", () => {
    const state = makeState(
      ["p1", "p2", "p3"],
      {
        p1: ["あ", "い", "×", "×", "×", "×", "×"],
        p2: ["う", "え", "×", "×", "×", "×", "×"],
        p3: ["お", "か", "×", "×", "×", "×", "×"],
      },
      { eliminatedPlayers: ["p2"] }
    );
    expect(getActivePlayers(state)).toEqual(["p1", "p3"]);
  });

  it("全員脱落なら空配列", () => {
    const state = makeState(
      ["p1", "p2"],
      {
        p1: ["あ", "い", "×", "×", "×", "×", "×"],
        p2: ["う", "え", "×", "×", "×", "×", "×"],
      },
      { eliminatedPlayers: ["p1", "p2"] }
    );
    expect(getActivePlayers(state)).toEqual([]);
  });
});

describe("getNextActivePlayerIndex", () => {
  it("次のアクティブプレイヤーのインデックスを返す", () => {
    const state = makeState(["p1", "p2", "p3"], {
      p1: ["あ", "×", "×", "×", "×", "×", "×"],
      p2: ["い", "×", "×", "×", "×", "×", "×"],
      p3: ["う", "×", "×", "×", "×", "×", "×"],
    });
    // index=0からの次 → 1
    expect(getNextActivePlayerIndex(state, 0)).toBe(1);
    // index=1からの次 → 2
    expect(getNextActivePlayerIndex(state, 1)).toBe(2);
    // index=2からの次 → 0 (wrap around)
    expect(getNextActivePlayerIndex(state, 2)).toBe(0);
  });

  it("脱落者をスキップして次のアクティブプレイヤーを返す", () => {
    const state = makeState(
      ["p1", "p2", "p3"],
      {
        p1: ["あ", "×", "×", "×", "×", "×", "×"],
        p2: ["い", "×", "×", "×", "×", "×", "×"],
        p3: ["う", "×", "×", "×", "×", "×", "×"],
      },
      { eliminatedPlayers: ["p2"] }
    );
    // p1(index=0)の次はp2(eliminated) → p3(index=2)
    expect(getNextActivePlayerIndex(state, 0)).toBe(2);
  });
});

describe("processAttack", () => {
  // BOARD_CHARS[0] = "あ"
  const AH_INDEX = BOARD_CHARS.indexOf("あ");
  const I_INDEX = BOARD_CHARS.indexOf("い");
  const U_INDEX = BOARD_CHARS.indexOf("う");

  it("ヒットした場合、revealedが更新される", () => {
    const words = {
      p1: ["あ", "い", "×", "×", "×", "×", "×"],
      p2: ["う", "え", "×", "×", "×", "×", "×"],
    };
    const state = makeState(["p1", "p2"], words);
    const newState = processAttack(state, AH_INDEX, "p1"); // "あ" を攻撃

    // p2の単語に"あ"は含まれないのでp2には影響なし
    // p1自身の"あ"は自分の単語にも含まれるのでhit
    expect(newState.lastAttackHit).toBe(true);
    expect(newState.lastAttackChar).toBe("あ");
    expect(newState.revealed["p1"][0]).toBe(true);
  });

  it("ミスの場合lastAttackHit=falseで次のプレイヤーへ", () => {
    const words = {
      p1: ["あ", "い", "×", "×", "×", "×", "×"],
      p2: ["う", "え", "×", "×", "×", "×", "×"],
    };
    const state = makeState(["p1", "p2"], words, { currentPlayerIndex: 0 });
    // p1が"う"を攻撃→ p1の単語にはない（"あ","い"のみ）
    // p2の単語に"う"はある→ これはhitになる
    // ミスのケース: "わ"を攻撃（誰の単語にも含まれない文字）
    const WA_INDEX = BOARD_CHARS.indexOf("わ");
    const newState = processAttack(state, WA_INDEX, "p1");
    expect(newState.lastAttackHit).toBe(false);
    // ミスなので次のプレイヤーへ
    expect(newState.currentPlayerIndex).toBe(1);
  });

  it("ヒット時に1回目のヒットはattackCountが増加、2回連続ヒットで次のプレイヤーへ", () => {
    // p2の単語を3文字にして、2回ヒットしても脱落しないようにする
    const WA_INDEX2 = BOARD_CHARS.indexOf("わ");
    const words = {
      p1: ["あ", "×", "×", "×", "×", "×", "×"],
      p2: ["い", "う", "わ", "×", "×", "×", "×"], // 3文字なので2回hitしても脱落しない
    };
    const state = makeState(["p1", "p2"], words, { currentPlayerIndex: 0, attackCount: 0 });
    // p1が"い"を攻撃 → p2の単語にhit → attackCount=1
    const newState1 = processAttack(state, I_INDEX, "p1");
    expect(newState1.attackCount).toBe(1);
    expect(newState1.currentPlayerIndex).toBe(0); // まだp1の番

    // 続けて"う"を攻撃 → attackCount=1+1=2になって次のプレイヤーへ
    const newState2 = processAttack(newState1, U_INDEX, "p1");
    expect(newState2.finished).toBe(false); // まだゲーム終了していない
    expect(newState2.attackCount).toBe(0);
    expect(newState2.currentPlayerIndex).toBe(1); // p2に移動
  });

  it("全文字が公開されたプレイヤーは脱落する", () => {
    // p2の単語が"あ"だけ（他は×）
    const words = {
      p1: ["い", "う", "×", "×", "×", "×", "×"],
      p2: ["あ", "×", "×", "×", "×", "×", "×"],
    };
    const state = makeState(["p1", "p2"], words, { currentPlayerIndex: 0 });
    const newState = processAttack(state, AH_INDEX, "p1"); // "あ"を攻撃
    // p2の単語は"あ"のみ → 全公開 → 脱落
    expect(newState.eliminatedPlayers).toContain("p2");
  });

  it("最後の1人になったらゲーム終了", () => {
    // 2人プレイ、p2の単語が1文字
    const words = {
      p1: ["い", "う", "×", "×", "×", "×", "×"],
      p2: ["あ", "×", "×", "×", "×", "×", "×"],
    };
    const state = makeState(["p1", "p2"], words, { currentPlayerIndex: 0 });
    const newState = processAttack(state, AH_INDEX, "p1"); // p2を脱落させる
    expect(newState.finished).toBe(true);
    expect(newState.winnerId).toBe("p1");
  });

  it("全員脱落したら攻撃者が勝者", () => {
    // p1とp2がどちらも"あ"だけ
    const words = {
      p1: ["あ", "×", "×", "×", "×", "×", "×"],
      p2: ["あ", "×", "×", "×", "×", "×", "×"],
    };
    // p1が既に脱落しかかっている状態でp2も脱落する（まだ調整が難しいので別アプローチ）
    // 攻撃者=p1、p1とp2両方が"あ"を持っていて両方脱落 → 攻撃者p1が勝者
    const state = makeState(["p1", "p2"], words, { currentPlayerIndex: 0 });
    const newState = processAttack(state, AH_INDEX, "p1");
    expect(newState.finished).toBe(true);
    // active=0なので attackerIdが勝者
    expect(newState.winnerId).toBe("p1");
  });

  it("ゲーム終了時に未公開文字が'end'になる", () => {
    const words = {
      p1: ["い", "う", "×", "×", "×", "×", "×"],
      p2: ["あ", "×", "×", "×", "×", "×", "×"],
    };
    const state = makeState(["p1", "p2"], words, { currentPlayerIndex: 0 });
    const newState = processAttack(state, AH_INDEX, "p1");
    // p1の単語("い","う")のindex 0,1は未公開 → "end"になる
    expect(newState.revealed["p1"][0]).toBe("end");
    expect(newState.revealed["p1"][1]).toBe("end");
  });
});
