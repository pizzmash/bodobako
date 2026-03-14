/**
 * ピースパレット（三角ピース版）
 * 自分が担当する色のピースをサムネイル形式で表示する。
 */

import type { BlokusTrigonState } from "@bodobako/shared";
import { TRIGON_NUM_PIECES, TRIGON_PIECES, trigonGetValidPlacements } from "@bodobako/shared";
import React, { useMemo } from "react";
import { MINI_TRI_SIDE, SURFACE_BORDER, TRIGON_COLORS } from "./constants";
import { TriPieceThumbnail } from "./TriPieceThumbnail";

interface Props {
  state: BlokusTrigonState;
  myColorIndices: number[];
  activeColorIndex: number;
  selectedPieceId: number | null;
  isMyTurn: boolean;
  onSelectPiece: (pieceId: number) => void;
}

export const BlokusTrigonPiecePalette = React.memo(
  function BlokusTrigonPiecePalette({
    state,
    myColorIndices,
    activeColorIndex,
    selectedPieceId,
    isMyTurn,
    onSelectPiece,
  }: Props) {
    const unplaceableSets = useMemo(() => {
      const result: Record<number, Set<number>> = {};
      for (const ci of myColorIndices) {
        const set = new Set<number>();
        const remaining = state.remainingPieces[ci];
        for (let i = 0; i < TRIGON_NUM_PIECES; i++) {
          if (remaining & (1 << i)) {
            if (trigonGetValidPlacements(state, ci, i).length === 0) {
              set.add(i);
            }
          }
        }
        result[ci] = set;
      }
      return result;
    }, [state, myColorIndices]);

    const multiColor = myColorIndices.length > 1;

    return (
      <div className="bg-white/[0.88] rounded-2xl px-3 py-[0.85rem] border border-black/[0.07] backdrop-blur-[12px] overflow-hidden shadow-[0_4px_20px_rgba(100,120,180,0.1),0_1px_4px_rgba(0,0,0,0.06)]">
        {myColorIndices.map((ci, sectionIdx) => {
          const remaining = state.remainingPieces[ci];
          const colorFill = TRIGON_COLORS[ci]?.fill ?? "#888";
          const colorLabel = TRIGON_COLORS[ci]?.label ?? "";
          const isActiveColor = ci === activeColorIndex;
          const canInteract = isMyTurn && isActiveColor;
          const unplaceable = unplaceableSets[ci] ?? new Set<number>();

          let remainingCount = 0;
          for (let i = 0; i < TRIGON_NUM_PIECES; i++) {
            if (remaining & (1 << i)) remainingCount++;
          }

          return (
            <div
              key={ci}
              className="transition-opacity duration-[250ms]"
              style={{
                marginTop: sectionIdx > 0 ? "0.55rem" : 0,
                paddingTop: sectionIdx > 0 ? "0.55rem" : 0,
                borderTop:
                  sectionIdx > 0
                    ? `1px solid ${SURFACE_BORDER}`
                    : "none",
                opacity: !isActiveColor && isMyTurn ? 0.45 : 1,
              }}
            >
              {/* セクションヘッダー */}
              <div
                className="flex items-center gap-[0.35rem] transition-[background,border-color] duration-[250ms] rounded-[8px] px-[6px] py-[3px] mb-2"
                style={{
                  background:
                    isActiveColor && isMyTurn
                      ? `${colorFill}18`
                      : "transparent",
                  border:
                    isActiveColor && isMyTurn
                      ? `1px solid ${colorFill}44`
                      : "1px solid transparent",
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-[2px] shrink-0 inline-block transition-shadow duration-[250ms]"
                  style={{
                    background: colorFill,
                    opacity: state.eliminated[ci] ? 0.4 : 1,
                    boxShadow:
                      isActiveColor && isMyTurn
                        ? `0 0 8px ${colorFill}`
                        : "none",
                  }}
                />
                {multiColor && (
                  <span
                    className="text-[0.8rem] font-bold"
                    style={{ color: colorFill }}
                  >
                    {colorLabel}
                  </span>
                )}
                {isActiveColor && isMyTurn && (
                  <span
                    className="text-[0.68rem] font-bold tracking-[0.01em]"
                    style={{ color: colorFill }}
                  >
                    ▶ 手番
                  </span>
                )}
                <span className="text-[0.8rem] font-semibold text-slate-800 ml-auto opacity-70">
                  <span className="text-[0.75rem] text-slate-400 font-normal">
                    残り {remainingCount} 個
                  </span>
                </span>
              </div>

              {/* ピースグリッド */}
              <div className="grid grid-cols-7 gap-[0.2rem]">
                {TRIGON_PIECES.map((piece) => {
                  const isUsed =
                    (remaining & (1 << piece.id)) === 0;
                  const isUnplaceable =
                    !isUsed && unplaceable.has(piece.id);
                  const isSelected =
                    canInteract && selectedPieceId === piece.id;
                  const isDisabled =
                    !canInteract || isUsed || isUnplaceable;

                  let bgColor = "rgba(0,0,0,0.025)";
                  let border = "1px solid rgba(0,0,0,0.07)";
                  let opacity = 1;
                  let cellColor: string = colorFill;

                  if (isSelected) {
                    bgColor = `${colorFill}22`;
                    border = `2px solid ${colorFill}`;
                  } else if (isUsed) {
                    opacity = 0.22;
                    cellColor = "#94a3b8";
                  } else if (isUnplaceable) {
                    opacity = 0.4;
                    cellColor = "#94a3b8";
                    border = "1px dashed rgba(0,0,0,0.15)";
                  }

                  return (
                    <button
                      key={piece.id}
                      className={`blk-palette-item flex items-center justify-center w-full aspect-square p-[0.15rem] rounded-[8px] min-w-0 overflow-hidden relative${isSelected ? " blk-palette-selected" : ""}`}
                      disabled={isDisabled}
                      onClick={() => onSelectPiece(piece.id)}
                      style={{
                        opacity,
                        background: bgColor,
                        border,
                        cursor: isDisabled ? "default" : "pointer",
                      }}
                      title={
                        isUsed
                          ? "使用済み"
                          : isUnplaceable
                            ? "配置できません"
                            : `${piece.size}マス ピース`
                      }
                    >
                      <div className="flex items-center justify-center w-full h-full">
                        <TriPieceThumbnail
                          variant={piece.variants[0]}
                          color={cellColor}
                          triSide={MINI_TRI_SIDE}
                        />
                      </div>
                      {isUnplaceable && (
                        <div className="absolute inset-0 flex items-center justify-center text-[0.65rem] text-red-400 font-bold pointer-events-none bg-red-400/10 rounded-[6px]">
                          ✕
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  },
);

