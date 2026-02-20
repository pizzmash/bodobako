import { describe, it, expect } from "vitest";
import { othelloDefinition } from "../definition.js";
import type { OthelloState } from "../types.js";

const P1 = "player1";
const P2 = "player2";

function makeState(overrides: Partial<OthelloState> = {}): OthelloState {
  return {
    ...othelloDefinition.createInitialState([P1, P2]),
    ...overrides,
  };
}

describe("createInitialState", () => {
  it("2人のplayerIdsが設定される", () => {
    const state = othelloDefinition.createInitialState([P1, P2]);
    expect(state.playerIds).toEqual([P1, P2]);
  });

  it("currentPlayerIndex=0で始まる", () => {
    const state = othelloDefinition.createInitialState([P1, P2]);
    expect(state.currentPlayerIndex).toBe(0);
  });

  it("passCount=0で始まる", () => {
    const state = othelloDefinition.createInitialState([P1, P2]);
    expect(state.passCount).toBe(0);
  });

  it("finished=falseで始まる", () => {
    const state = othelloDefinition.createInitialState([P1, P2]);
    expect(state.finished).toBe(false);
  });

  it("初期盤面に4石が配置される", () => {
    const state = othelloDefinition.createInitialState([P1, P2]);
    expect(state.board[3][3]).toBe("white");
    expect(state.board[3][4]).toBe("black");
    expect(state.board[4][3]).toBe("black");
    expect(state.board[4][4]).toBe("white");
  });
});

describe("parseMove", () => {
  it("有効な座標を返す", () => {
    const move = othelloDefinition.parseMove!({ row: 2, col: 3 });
    expect(move).toEqual({ row: 2, col: 3 });
  });

  it("pass=trueの場合はパスムーブを返す", () => {
    const move = othelloDefinition.parseMove!({ pass: true });
    expect(move).toMatchObject({ pass: true });
  });

  it("rowが数値でない場合はnull", () => {
    expect(othelloDefinition.parseMove!({ row: "2", col: 3 })).toBeNull();
  });

  it("colが数値でない場合はnull", () => {
    expect(othelloDefinition.parseMove!({ row: 2, col: "3" })).toBeNull();
  });

  it("nullを渡すとnull", () => {
    expect(othelloDefinition.parseMove!(null)).toBeNull();
  });

  it("文字列を渡すとnull", () => {
    expect(othelloDefinition.parseMove!("invalid")).toBeNull();
  });

  it("数値でない整数（小数）はnull", () => {
    expect(othelloDefinition.parseMove!({ row: 2.5, col: 3 })).toBeNull();
  });

  it("範囲外（負数）はnull", () => {
    expect(othelloDefinition.parseMove!({ row: -1, col: 0 })).toBeNull();
  });

  it("範囲外（8以上）はnull", () => {
    expect(othelloDefinition.parseMove!({ row: 8, col: 0 })).toBeNull();
  });
});

describe("validateMove", () => {
  it("正しいプレイヤーが有効な手を打てる", () => {
    const state = makeState();
    // P1(黒)が(2,3)に打つ → 有効
    expect(othelloDefinition.validateMove(state, { row: 2, col: 3 }, P1)).toBe(true);
  });

  it("手番外のプレイヤーは打てない", () => {
    const state = makeState(); // currentPlayerIndex=0=P1の番
    expect(othelloDefinition.validateMove(state, { row: 2, col: 3 }, P2)).toBe(false);
  });

  it("存在しないプレイヤーは打てない", () => {
    const state = makeState();
    expect(othelloDefinition.validateMove(state, { row: 2, col: 3 }, "unknown")).toBe(false);
  });

  it("無効な手（挟める石なし）は打てない", () => {
    const state = makeState();
    expect(othelloDefinition.validateMove(state, { row: 0, col: 0 }, P1)).toBe(false);
  });

  it("占有済みマスは打てない", () => {
    const state = makeState();
    expect(othelloDefinition.validateMove(state, { row: 3, col: 3 }, P1)).toBe(false);
  });

  it("有効手があるときにパスは不可", () => {
    const state = makeState();
    expect(othelloDefinition.validateMove(state, { pass: true, row: 0, col: 0 }, P1)).toBe(false);
  });

  it("finished=trueなら誰も打てない", () => {
    const state = makeState({ finished: true });
    expect(othelloDefinition.validateMove(state, { row: 2, col: 3 }, P1)).toBe(false);
  });

  it("有効手がないときはパスが通る", () => {
    // 全マスを黒で埋めて白が打てない状態
    const board = Array.from({ length: 8 }, () =>
      Array(8).fill("black")
    );
    // ただし1マスだけwhiteを置いて(P2がwhite=playerIndex=1)
    board[0][0] = "white";
    // emptyを作る
    board[0][1] = "empty";
    const state = makeState({
      board: board as any,
      currentPlayerIndex: 0, // P1=black
    });
    // blackに有効手なし → passが通るか
    // ただしこの状態ではblack(playerIndex=0)には有効手あるかもしれない
    // より確実な方法: passが通る状態を作る
    // P2(white)の番で有効手なしの状態
    const board2 = Array.from({ length: 8 }, () =>
      Array(8).fill("black")
    ) as any;
    board2[7][7] = "white";
    // board2[7][7]=white、他はすべてblack → whiteは打てる場所なし
    const state2 = makeState({
      board: board2,
      currentPlayerIndex: 1, // P2=white の番
    });
    expect(othelloDefinition.validateMove(state2, { pass: true, row: 0, col: 0 }, P2)).toBe(true);
  });
});

describe("applyMove - 通常のムーブ", () => {
  it("有効な手を打つと盤面が更新される", () => {
    const state = makeState();
    const newState = othelloDefinition.applyMove(state, { row: 2, col: 3 }, P1);
    expect(newState.board[2][3]).toBe("black");
    expect(newState.board[3][3]).toBe("black"); // 反転
  });

  it("元のstateを変更しない（不変性）", () => {
    const state = makeState();
    const origBoard33 = state.board[3][3];
    othelloDefinition.applyMove(state, { row: 2, col: 3 }, P1);
    expect(state.board[3][3]).toBe(origBoard33);
  });

  it("手を打つとcurrentPlayerIndexが切り替わる", () => {
    const state = makeState();
    const newState = othelloDefinition.applyMove(state, { row: 2, col: 3 }, P1);
    expect(newState.currentPlayerIndex).toBe(1);
  });

  it("手を打つとpassCountがリセットされる", () => {
    const state = makeState({ passCount: 1 });
    const newState = othelloDefinition.applyMove(state, { row: 2, col: 3 }, P1);
    expect(newState.passCount).toBe(0);
  });
});

describe("applyMove - パスムーブ", () => {
  it("パスでcurrentPlayerIndexが切り替わる", () => {
    const state = makeState({ currentPlayerIndex: 0 });
    const newState = othelloDefinition.applyMove(state, { pass: true, row: 0, col: 0 }, P1);
    expect(newState.currentPlayerIndex).toBe(1);
  });

  it("passCountが増加する", () => {
    const state = makeState({ passCount: 0 });
    const newState = othelloDefinition.applyMove(state, { pass: true, row: 0, col: 0 }, P1);
    expect(newState.passCount).toBe(1);
  });

  it("2連続パスでfinishedになる（ダブルパス→ゲーム終了）", () => {
    const state = makeState({ passCount: 1, currentPlayerIndex: 1 });
    const newState = othelloDefinition.applyMove(state, { pass: true, row: 0, col: 0 }, P2);
    expect(newState.finished).toBe(true);
  });
});

describe("getStatus", () => {
  it("finished=falseなら'playing'を返す", () => {
    const state = makeState({ finished: false });
    expect(othelloDefinition.getStatus(state)).toBe("playing");
  });

  it("finished=trueなら'finished'を返す", () => {
    const state = makeState({ finished: true });
    expect(othelloDefinition.getStatus(state)).toBe("finished");
  });
});

describe("getRanking", () => {
  it("未終了状態ではnullを返す", () => {
    const state = makeState({ finished: false });
    expect(othelloDefinition.getRanking(state)).toBeNull();
  });

  it("黒が多ければP1(黒)が1位", () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill("black")) as any;
    board[0][0] = "white"; // 黒63, 白1
    const state = makeState({ finished: true, board });
    const ranking = othelloDefinition.getRanking(state);
    expect(ranking![0]).toBe(P1);
    expect(ranking![1]).toBe(P2);
  });

  it("白が多ければP2(白)が1位", () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill("white")) as any;
    board[0][0] = "black"; // 白63, 黒1
    const state = makeState({ finished: true, board });
    const ranking = othelloDefinition.getRanking(state);
    expect(ranking![0]).toBe(P2);
    expect(ranking![1]).toBe(P1);
  });

  it("同数の場合はnull（引き分け）", () => {
    // 黒32, 白32になるボードを作成
    const board = Array.from({ length: 8 }, (_, r) =>
      Array.from({ length: 8 }, (_, c) =>
        (r * 8 + c) < 32 ? "black" : "white"
      )
    ) as any;
    const state = makeState({ finished: true, board });
    expect(othelloDefinition.getRanking(state)).toBeNull();
  });
});

describe("getCurrentPlayerId", () => {
  it("currentPlayerIndex=0のときP1を返す", () => {
    const state = makeState({ currentPlayerIndex: 0 });
    expect(othelloDefinition.getCurrentPlayerId(state)).toBe(P1);
  });

  it("currentPlayerIndex=1のときP2を返す", () => {
    const state = makeState({ currentPlayerIndex: 1 });
    expect(othelloDefinition.getCurrentPlayerId(state)).toBe(P2);
  });
});

describe("盤面満杯でのゲーム終了", () => {
  it("盤面が満杯になるとfinished=trueになる", () => {
    // P1が打つと盤面が満杯になるシナリオを作成
    // 63マスを黒で、1マス空き、空きの周囲に白なし（パスなしで打てる）
    const board = Array.from({ length: 8 }, () =>
      Array(8).fill("black")
    ) as any;
    // (0,0)=empty、(0,1)=white → P1(black)が(0,0)に打つと反転して盤面満杯
    board[0][0] = "empty";
    board[0][1] = "white";
    const state = makeState({ board, currentPlayerIndex: 0 });
    const newState = othelloDefinition.applyMove(state, { row: 0, col: 0 }, P1);
    expect(newState.finished).toBe(true);
  });
});
