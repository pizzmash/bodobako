/**
 * ブロックス UI インタラクション状態管理フック
 *
 * ピース選択・バリアント（回転/反転）・ホバー・配置確定を管理する。
 * getValidPlacements は重い処理のため useMemo で state/selectedPieceId が
 * 変わった時だけ再計算する。
 */

import type { BlokusMove, BlokusState, PieceDefinition } from "@bodobako/shared";
import { PIECES, getCurrentPlayerId, getValidPlacements } from "@bodobako/shared";
import { useCallback, useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// バリアント変換ユーティリティ
// ---------------------------------------------------------------------------

/**
 * バリアントのセル配列を正規化キーに変換。
 * 平行移動で min=(0,0) にし、重心最寄りセルを中心として相対座標化した後、
 * ソートしてキー文字列を生成する。
 * これにより、同じ形状のバリアントは同じキーになる。
 */
function variantKey(cells: readonly (readonly [number, number])[]): string {
  if (cells.length === 0) return "";

  // min=(0,0) に平行移動
  const minR = Math.min(...cells.map(([dr]) => dr));
  const minC = Math.min(...cells.map(([, dc]) => dc));
  const shifted = cells.map(([dr, dc]) => [dr - minR, dc - minC] as [number, number]);
  const sorted = [...shifted].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  // 重心最寄りセルを中心として選択
  const n = sorted.length;
  const cr = sorted.reduce((s, [r]) => s + r, 0) / n;
  const cc = sorted.reduce((s, [, c]) => s + c, 0) / n;
  let center = sorted[0];
  let bestDist = Infinity;
  for (const cell of sorted) {
    const d = (cell[0] - cr) ** 2 + (cell[1] - cc) ** 2;
    if (
      d < bestDist ||
      (d === bestDist &&
        (cell[0] < center[0] || (cell[0] === center[0] && cell[1] < center[1])))
    ) {
      bestDist = d;
      center = cell;
    }
  }

  const relative = sorted.map(([r, c]) => [r - center[0], c - center[1]] as [number, number]);
  return relative.map(([r, c]) => `${r},${c}`).join("|");
}

/**
 * 変換関数を適用して一致するバリアントのインデックスを返す。
 * 一致しない場合（対称ピース等）は元のインデックスをそのまま返す。
 */
function findVariantByTransform(
  piece: PieceDefinition,
  variantIndex: number,
  transform: (cells: readonly (readonly [number, number])[]) => [number, number][],
): number {
  const cells = piece.variants[variantIndex].cells;
  const transformed = transform(cells);
  const key = variantKey(transformed);
  const idx = piece.variants.findIndex((v) => variantKey(v.cells) === key);
  return idx === -1 ? variantIndex : idx;
}

// ---------------------------------------------------------------------------
// フック本体
// ---------------------------------------------------------------------------

interface UseBlokusInteractionParams {
  state: BlokusState | null;
  playerId: string | null;
  sendMove: (move: BlokusMove) => void;
}

export interface BlokusInteraction {
  selectedPieceId: number | null;
  variantIndex: number;
  hoverCell: { row: number; col: number } | null;
  setHoverCell: (cell: { row: number; col: number } | null) => void;
  isMyTurn: boolean;
  validPlacements: { variantIndex: number; row: number; col: number }[];
  /** 現在バリアントでセンターを置ける "row,col" の Set */
  validCenterSet: Set<string>;
  /** ホバー中のゴーストセル "row,col" の Set */
  ghostCells: Set<string>;
  /** ゴースト配置が有効かどうか */
  isGhostValid: boolean;
  handleSelectPiece: (pieceId: number) => void;
  handleRotate: () => void;
  handleFlip: () => void;
  handleBoardClick: (row: number, col: number) => void;
  handleBoardLeave: () => void;
  handleCellHover: (r: number, c: number) => void;
}

export function useBlokusInteraction({
  state,
  playerId,
  sendMove,
}: UseBlokusInteractionParams): BlokusInteraction {
  const [selectedPieceId, setSelectedPieceId] = useState<number | null>(null);
  const [variantIndex, setVariantIndex] = useState(0);
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);

  // 自分の手番かどうか
  const isMyTurn = useMemo(() => {
    if (!state || !playerId) return false;
    return getCurrentPlayerId(state) === playerId;
  }, [state, playerId]);

  // 選択ピースの全有効配置（重い処理・state/selectedPieceId 変更時のみ再計算）
  const validPlacements = useMemo(() => {
    if (!isMyTurn || selectedPieceId === null || !state) return [];
    return getValidPlacements(state, state.currentColorIndex, selectedPieceId);
  }, [state, isMyTurn, selectedPieceId]);

  // 現在バリアントのセンター配置可能セル Set
  const validCenterSet = useMemo(() => {
    const s = new Set<string>();
    for (const p of validPlacements) {
      if (p.variantIndex === variantIndex) {
        s.add(`${p.row},${p.col}`);
      }
    }
    return s;
  }, [validPlacements, variantIndex]);

  // ホバー中のゴーストセル
  const ghostCells = useMemo(() => {
    if (!hoverCell || selectedPieceId === null) return new Set<string>();
    const variant = PIECES[selectedPieceId].variants[variantIndex];
    const s = new Set<string>();
    for (const [dr, dc] of variant.cells) {
      const r = hoverCell.row + dr;
      const c = hoverCell.col + dc;
      if (r >= 0 && r < 20 && c >= 0 && c < 20) {
        s.add(`${r},${c}`);
      }
    }
    return s;
  }, [hoverCell, selectedPieceId, variantIndex]);

  const isGhostValid =
    hoverCell !== null &&
    selectedPieceId !== null &&
    validCenterSet.has(`${hoverCell.row},${hoverCell.col}`);

  // ピース選択トグル
  const handleSelectPiece = useCallback(
    (pieceId: number) => {
      if (pieceId === selectedPieceId) {
        setSelectedPieceId(null);
      } else {
        setSelectedPieceId(pieceId);
        setVariantIndex(0);
      }
    },
    [selectedPieceId],
  );

  // 90°時計回り回転: [dr, dc] → [dc, -dr]
  const handleRotate = useCallback(() => {
    if (selectedPieceId === null) return;
    const piece = PIECES[selectedPieceId];
    const newIdx = findVariantByTransform(piece, variantIndex, (cells) =>
      cells.map(([dr, dc]) => [dc, -dr] as [number, number]),
    );
    setVariantIndex(newIdx);
  }, [selectedPieceId, variantIndex]);

  // 水平反転: [dr, dc] → [dr, -dc]
  const handleFlip = useCallback(() => {
    if (selectedPieceId === null) return;
    const piece = PIECES[selectedPieceId];
    const newIdx = findVariantByTransform(piece, variantIndex, (cells) =>
      cells.map(([dr, dc]) => [dr, -dc] as [number, number]),
    );
    setVariantIndex(newIdx);
  }, [selectedPieceId, variantIndex]);

  // ボードセルクリック → 有効なら配置確定
  const handleBoardClick = useCallback(
    (row: number, col: number) => {
      if (!isMyTurn || selectedPieceId === null) return;
      if (!validCenterSet.has(`${row},${col}`)) return;
      sendMove({ pieceId: selectedPieceId, variantIndex, row, col });
      setSelectedPieceId(null);
      setHoverCell(null);
      setVariantIndex(0);
    },
    [isMyTurn, selectedPieceId, variantIndex, validCenterSet, sendMove],
  );

  const handleBoardLeave = useCallback(() => {
    setHoverCell(null);
  }, []);

  const handleCellHover = useCallback((r: number, c: number) => {
    setHoverCell({ row: r, col: c });
  }, []);

  return {
    selectedPieceId,
    variantIndex,
    hoverCell,
    setHoverCell,
    isMyTurn,
    validPlacements,
    validCenterSet,
    ghostCells,
    isGhostValid,
    handleSelectPiece,
    handleRotate,
    handleFlip,
    handleBoardClick,
    handleBoardLeave,
    handleCellHover,
  };
}
