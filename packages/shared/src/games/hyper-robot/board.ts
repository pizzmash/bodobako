import type { Position, TargetColor, TargetMark } from "./types.js";

type WallSide = "right" | "bottom" | "left" | "top";

interface PieceMark {
  col: number;
  row: number;
  color: TargetColor;
  walls: WallSide[];
}

interface PieceWall {
  col: number;
  row: number;
  side: WallSide;
}

interface BoardPiece {
  centerCol: number;
  centerRow: number;
  centerWalls: WallSide[];
  marks: PieceMark[];
  extraWalls: PieceWall[];
}

// board.md の [x,y] は [col, row] を意味する
const PIECES: BoardPiece[] = [
  // ピース1
  {
    centerCol: 7,
    centerRow: 7,
    centerWalls: ["left", "top"],
    marks: [
      { col: 5, row: 1, color: "green", walls: ["right", "bottom"] },
      { col: 1, row: 2, color: "red", walls: ["left", "bottom"] },
      { col: 6, row: 4, color: "yellow", walls: ["top", "left"] },
      { col: 3, row: 6, color: "blue", walls: ["top", "right"] },
    ],
    extraWalls: [
      { col: 3, row: 0, side: "right" },
      { col: 0, row: 3, side: "bottom" },
    ],
  },
  // ピース2
  {
    centerCol: 0,
    centerRow: 7,
    centerWalls: ["top", "right"],
    marks: [
      { col: 4, row: 1, color: "yellow", walls: ["right", "bottom"] },
      { col: 2, row: 2, color: "red", walls: ["left", "bottom"] },
      { col: 3, row: 5, color: "green", walls: ["top", "right"] },
      { col: 6, row: 6, color: "blue", walls: ["top", "left"] },
      { col: 2, row: 7, color: "rainbow", walls: ["left", "bottom"] },
    ],
    extraWalls: [
      { col: 0, row: 0, side: "right" },
      { col: 7, row: 3, side: "bottom" },
    ],
  },
  // ピース3
  {
    centerCol: 7,
    centerRow: 0,
    centerWalls: ["left", "bottom"],
    marks: [
      { col: 1, row: 1, color: "yellow", walls: ["top", "right"] },
      { col: 5, row: 1, color: "blue", walls: ["top", "left"] },
      { col: 6, row: 4, color: "red", walls: ["right", "bottom"] },
      { col: 2, row: 6, color: "green", walls: ["left", "bottom"] },
    ],
    extraWalls: [
      { col: 0, row: 2, side: "bottom" },
      { col: 5, row: 7, side: "right" },
    ],
  },
  // ピース4
  {
    centerCol: 0,
    centerRow: 0,
    centerWalls: ["right", "bottom"],
    marks: [
      { col: 6, row: 1, color: "yellow", walls: ["right", "bottom"] },
      { col: 0, row: 2, color: "red", walls: ["top", "right"] },
      { col: 5, row: 3, color: "green", walls: ["left", "bottom"] },
      { col: 2, row: 5, color: "blue", walls: ["top", "left"] },
    ],
    extraWalls: [
      { col: 7, row: 2, side: "bottom" },
      { col: 3, row: 7, side: "right" },
    ],
  },
];

function rotateWallSide(side: WallSide): WallSide {
  switch (side) {
    case "right": return "bottom";
    case "bottom": return "left";
    case "left": return "top";
    case "top": return "right";
  }
}

function rotatePiece(piece: BoardPiece, times: number): BoardPiece {
  let result = piece;
  for (let t = 0; t < times; t++) {
    const newCenter = {
      col: 7 - result.centerRow,
      row: result.centerCol,
    };
    const newCenterWalls = result.centerWalls.map(rotateWallSide) as WallSide[];
    const newMarks = result.marks.map((m) => ({
      col: 7 - m.row,
      row: m.col,
      color: m.color,
      walls: m.walls.map(rotateWallSide) as WallSide[],
    }));
    const newExtraWalls = result.extraWalls.map((w) => ({
      col: 7 - w.row,
      row: w.col,
      side: rotateWallSide(w.side),
    }));
    result = {
      centerCol: newCenter.col,
      centerRow: newCenter.row,
      centerWalls: newCenterWalls,
      marks: newMarks,
      extraWalls: newExtraWalls,
    };
  }
  return result;
}

// 各象限の目標 center ローカル座標
// TL: center が [col=7, row=7] に来るように
// TR: center が [col=0, row=7] に来るように
// BL: center が [col=7, row=0] に来るように
// BR: center が [col=0, row=0] に来るように
type Quadrant = 0 | 1 | 2 | 3; // 0=TL, 1=TR, 2=BL, 3=BR

function getRotationForQuadrant(piece: BoardPiece, quadrant: Quadrant): number {
  const targets: Record<Quadrant, { col: number; row: number }> = {
    0: { col: 7, row: 7 }, // TL
    1: { col: 0, row: 7 }, // TR
    2: { col: 7, row: 0 }, // BL
    3: { col: 0, row: 0 }, // BR
  };
  const target = targets[quadrant];
  for (let times = 0; times < 4; times++) {
    const rotated = rotatePiece(piece, times);
    if (rotated.centerCol === target.col && rotated.centerRow === target.row) {
      return times;
    }
  }
  // fallback (should not happen)
  return 0;
}

function getQuadrantOffset(quadrant: Quadrant): { rowOffset: number; colOffset: number } {
  switch (quadrant) {
    case 0: return { rowOffset: 0, colOffset: 0 };   // TL
    case 1: return { rowOffset: 0, colOffset: 8 };   // TR
    case 2: return { rowOffset: 8, colOffset: 0 };   // BL
    case 3: return { rowOffset: 8, colOffset: 8 };   // BR
  }
}

function setWall(
  rightWalls: boolean[][],
  bottomWalls: boolean[][],
  boardRow: number,
  boardCol: number,
  side: WallSide,
): void {
  if (boardRow < 0 || boardRow > 15 || boardCol < 0 || boardCol > 15) return;
  if (side === "right") {
    rightWalls[boardRow]![boardCol] = true;
  } else if (side === "bottom") {
    bottomWalls[boardRow]![boardCol] = true;
  } else if (side === "left") {
    // left wall = right wall of (row, col-1)
    if (boardCol > 0) rightWalls[boardRow]![boardCol - 1] = true;
  } else if (side === "top") {
    // top wall = bottom wall of (row-1, col)
    if (boardRow > 0) bottomWalls[boardRow - 1]![boardCol] = true;
  }
}

export interface AssembledBoard {
  rightWalls: boolean[][];
  bottomWalls: boolean[][];
  targets: TargetMark[];
}

export function assembleBoard(arrangement: [0 | 1 | 2 | 3, 0 | 1 | 2 | 3, 0 | 1 | 2 | 3, 0 | 1 | 2 | 3]): AssembledBoard {
  // 16×16 の壁配列を false で初期化
  const rightWalls: boolean[][] = Array.from({ length: 16 }, () => Array(16).fill(false));
  const bottomWalls: boolean[][] = Array.from({ length: 16 }, () => Array(16).fill(false));

  const targets: TargetMark[] = [];
  let targetId = 0;

  for (let quadrant = 0 as Quadrant; quadrant < 4; quadrant++) {
    const pieceIdx = arrangement[quadrant];
    const piece = PIECES[pieceIdx]!;
    const rotTimes = getRotationForQuadrant(piece, quadrant as Quadrant);
    const rotated = rotatePiece(piece, rotTimes);
    const { rowOffset, colOffset } = getQuadrantOffset(quadrant as Quadrant);

    // センター壁を配置
    const centerBoardRow = rotated.centerRow + rowOffset;
    const centerBoardCol = rotated.centerCol + colOffset;
    for (const side of rotated.centerWalls) {
      setWall(rightWalls, bottomWalls, centerBoardRow, centerBoardCol, side);
    }

    // マーク配置
    for (const mark of rotated.marks) {
      const boardRow = mark.row + rowOffset;
      const boardCol = mark.col + colOffset;
      for (const side of mark.walls) {
        setWall(rightWalls, bottomWalls, boardRow, boardCol, side);
      }
      targets.push({
        id: targetId++,
        position: { row: boardRow, col: boardCol },
        color: mark.color,
      });
    }

    // 追加壁
    for (const w of rotated.extraWalls) {
      const boardRow = w.row + rowOffset;
      const boardCol = w.col + colOffset;
      setWall(rightWalls, bottomWalls, boardRow, boardCol, w.side);
    }
  }

  // センター 2×2 周囲の壁をセット
  // center 左側: rightWalls[7][6] = rightWalls[8][6] = true
  rightWalls[7]![6] = true;
  rightWalls[8]![6] = true;
  // center 右側: rightWalls[7][8] = rightWalls[8][8] = true
  rightWalls[7]![8] = true;
  rightWalls[8]![8] = true;
  // center 上側: bottomWalls[6][7] = bottomWalls[6][8] = true
  bottomWalls[6]![7] = true;
  bottomWalls[6]![8] = true;
  // center 下側: bottomWalls[8][7] = bottomWalls[8][8] = true
  bottomWalls[8]![7] = true;
  bottomWalls[8]![8] = true;

  return { rightWalls, bottomWalls, targets };
}

export function generateRandomBoard(): AssembledBoard {
  const indices: [0 | 1 | 2 | 3, 0 | 1 | 2 | 3, 0 | 1 | 2 | 3, 0 | 1 | 2 | 3] = [0, 1, 2, 3];
  // Fisher-Yates shuffle
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = indices[i]!;
    indices[i] = indices[j]!;
    indices[j] = tmp;
  }
  return assembleBoard(indices);
}

export function isCenter(pos: Position): boolean {
  return pos.row >= 7 && pos.row <= 8 && pos.col >= 7 && pos.col <= 8;
}

export { PIECES, rotatePiece };
export type { BoardPiece, PieceMark, PieceWall, WallSide };

