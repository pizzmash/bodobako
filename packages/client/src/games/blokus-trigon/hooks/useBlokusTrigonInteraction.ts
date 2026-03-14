/**
 * ブロックストライゴン UI インタラクション状態管理フック
 *
 * ピース選択・バリアント（60°回転/反転）・ホバー・配置確定を管理する。
 * 回転/反転は二面体群 D6 の演算で transformIndex を更新し、
 * サーバー側で事前計算された transformToVariant テーブルで variantIndex を得る。
 */

import type { BlokusTrigonMove, BlokusTrigonState } from "@bodobako/shared";
import {
  GRID_COLS,
  GRID_ROWS,
  TRIGON_PIECES,
  trigonGetCurrentPlayerId,
  trigonGetValidPlacements,
} from "@bodobako/shared";
import { useCallback, useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// 二面体群 D6 の演算ユーティリティ
// ---------------------------------------------------------------------------
// transformIndex = rot * 2 + flip  (rot: 0-5, flip: 0-1)
//
// バリアント生成の変換順: flip → rotate
//   g(rot, 0) = r^rot ∘ id   （回転のみ）
//   g(rot, 1) = r^rot ∘ f    （反転してから回転）
//
// pieces.ts の rotatePt は数学座標（y上向き）基準の CCW 回転行列のため、
// スクリーン座標（y下向き）では実際には CCW に見える。
// CW に見せるには rot を 1 減らす（= rot+5 mod 6）。
//
// ユーザー CW 回転 = r^(-1) ∘ g(rot, flip):
//   = r^(rot-1) ∘ f^flip  →  (rot+5 mod 6, flip)  ← flip に依らず同じ
//
// ユーザー反転 = f ∘ g(rot, flip):
//   f ∘ r^rot ∘ f^flip
//   f ∘ r = r^(-1) ∘ f を rot 回適用: f ∘ r^rot = r^(-rot) ∘ f
//   = r^(-rot) ∘ f^(1+flip)  →  ((6-rot) mod 6, 1-flip)

/** スクリーン上で 60° CW 回転後の transformIndex を返す */
function d6Rotate(ti: number): number {
  const rot = ti >> 1;
  const flip = ti & 1;
  const newRot = (rot + 5) % 6;
  return newRot * 2 + flip;
}

/** 現在表示中のピースを水平反転した後の transformIndex を返す */
function d6Flip(ti: number): number {
  const rot = ti >> 1;
  const flip = ti & 1;
  const newRot = (6 - rot) % 6;
  const newFlip = 1 - flip;
  return newRot * 2 + newFlip;
}

// ---------------------------------------------------------------------------
// フック本体
// ---------------------------------------------------------------------------

interface Params {
  state: BlokusTrigonState | null;
  playerId: string | null;
  sendMove: (move: BlokusTrigonMove) => void;
}

export interface BlokusTrigonInteraction {
  selectedPieceId: number | null;
  variantIndex: number;
  hoverCell: { row: number; col: number } | null;
  isMyTurn: boolean;
  validCenterSet: Set<string>;
  ghostCells: Set<string>;
  isGhostValid: boolean;
  handleSelectPiece: (pieceId: number) => void;
  handleRotate: () => void;
  handleFlip: () => void;
  handleBoardClick: (row: number, col: number) => void;
  handleBoardLeave: () => void;
  handleCellHover: (r: number, c: number) => void;
}

export function useBlokusTrigonInteraction({
  state,
  playerId,
  sendMove,
}: Params): BlokusTrigonInteraction {
  const [selectedPieceId, setSelectedPieceId] = useState<number | null>(null);
  const [transformIdx, setTransformIdx] = useState(0);
  const [hoverCell, setHoverCell] = useState<{
    row: number;
    col: number;
  } | null>(null);

  // transformIndex → variantIndex
  const variantIndex = useMemo(() => {
    if (selectedPieceId === null) return 0;
    return TRIGON_PIECES[selectedPieceId].transformToVariant[transformIdx];
  }, [selectedPieceId, transformIdx]);

  const isMyTurn = useMemo(() => {
    if (!state || !playerId) return false;
    return trigonGetCurrentPlayerId(state) === playerId;
  }, [state, playerId]);

  const validPlacements = useMemo(() => {
    if (!isMyTurn || selectedPieceId === null || !state) return [];
    return trigonGetValidPlacements(
      state,
      state.currentColorIndex,
      selectedPieceId,
    );
  }, [state, isMyTurn, selectedPieceId]);

  const validCenterSet = useMemo(() => {
    const s = new Set<string>();
    for (const p of validPlacements) {
      if (p.variantIndex === variantIndex) {
        s.add(`${p.row},${p.col}`);
      }
    }
    return s;
  }, [validPlacements, variantIndex]);

  const ghostCells = useMemo(() => {
    if (!hoverCell || selectedPieceId === null) return new Set<string>();
    const variant = TRIGON_PIECES[selectedPieceId].variants[variantIndex];
    // baseParity が一致しないセルではゴーストを表示しない
    if (variant.baseParity !== (hoverCell.row + hoverCell.col) % 2)
      return new Set<string>();
    const s = new Set<string>();
    for (const [dr, dc] of variant.cells) {
      const r = hoverCell.row + dr;
      const c = hoverCell.col + dc;
      if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
        s.add(`${r},${c}`);
      }
    }
    return s;
  }, [hoverCell, selectedPieceId, variantIndex]);

  const isGhostValid =
    hoverCell !== null &&
    selectedPieceId !== null &&
    validCenterSet.has(`${hoverCell.row},${hoverCell.col}`);

  const handleSelectPiece = useCallback(
    (pieceId: number) => {
      if (pieceId === selectedPieceId) {
        setSelectedPieceId(null);
      } else {
        setSelectedPieceId(pieceId);
        setTransformIdx(0);
      }
    },
    [selectedPieceId],
  );

  // 60° CW rotation via D6 group arithmetic
  const handleRotate = useCallback(() => {
    if (selectedPieceId === null) return;
    setTransformIdx(d6Rotate);
  }, [selectedPieceId]);

  // Horizontal flip via D6 group arithmetic
  const handleFlip = useCallback(() => {
    if (selectedPieceId === null) return;
    setTransformIdx(d6Flip);
  }, [selectedPieceId]);

  const handleBoardClick = useCallback(
    (row: number, col: number) => {
      if (!isMyTurn || selectedPieceId === null) return;
      if (!validCenterSet.has(`${row},${col}`)) return;
      sendMove({ pieceId: selectedPieceId, variantIndex, row, col });
      setSelectedPieceId(null);
      setHoverCell(null);
      setTransformIdx(0);
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
    isMyTurn,
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
