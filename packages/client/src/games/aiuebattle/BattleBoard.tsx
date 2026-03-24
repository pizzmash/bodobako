import type { AiueBattleMove, AiueBattleState, GameResult, Player, RoomInfo } from "@bodobako/shared";
import { GameResultCard } from "../../components/GameResultCard";
import {
    BOARD_LAYOUT,
    BOARD_LAYOUT_HORIZONTAL,
    C,
    charToIndex,
    PLAYER_COLORS,
    RADIUS,
    SHADOWS,
    SPACING,
    styles,
    topicBadgeStyle,
    topicCardStyle,
    topicTextStyle,
    TYPOGRAPHY,
} from "./constants";
import { useIsWideBoard } from "./hooks/useIsWideBoard";

interface BattleBoardProps {
  state: AiueBattleState;
  playerId: string;
  room: RoomInfo;
  sendTypedMove: (move: AiueBattleMove) => void;
  gameResult: GameResult | null;
  startGame: () => void;
  leaveRoom: () => void;
  attackAnim: "hit" | "miss" | null;
  newlyRevealed: Set<string>;
  resultPlayers?: Player[] | null;
  rematchRequests?: string[];
  minPlayers?: number;
  onRematchRequest?: () => void;
}

export function BattleBoard({
  state,
  playerId,
  room,
  sendTypedMove,
  gameResult,
  startGame,
  leaveRoom,
  attackAnim,
  newlyRevealed,
  resultPlayers,
  rematchRequests,
  minPlayers,
  onRematchRequest,
}: BattleBoardProps) {
  const currentPlayer = room.players.find(
    (p) => p.id === state.playerIds[state.currentPlayerIndex]
  );
  const isMyTurn =
    state.playerIds[state.currentPlayerIndex] === playerId && !state.finished;
  const isEliminated = state.eliminatedPlayers.includes(playerId);
  const isWide = useIsWideBoard();

  // Attack result banner variables
  const attackPlayerIndex = room.players.findIndex((p) => p.id === state.lastAttackPlayerId);
  const playerColor = attackPlayerIndex >= 0 ? PLAYER_COLORS[attackPlayerIndex] : C.gray400;
  const layout = isWide ? BOARD_LAYOUT_HORIZONTAL : BOARD_LAYOUT;

  return (
    <>
      {/* Topic & Status */}
      {!gameResult && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: SPACING.md,
            margin: `0 0 ${SPACING.lg}`,
            width: "100%",
            maxWidth: "1000px",
          }}
          className="ab-topic-status-container"
        >
          {/* お題カード - 共通スタイルを使用 */}
          <div style={{ ...topicCardStyle, padding: SPACING.lg }}>
            <div style={topicBadgeStyle}>Topic</div>
            <p style={{
              ...topicTextStyle,
              fontSize: !state.topic || state.topic.length > 20 
                ? "1rem" 
                : state.topic.length > 12 
                  ? "1.2rem" 
                  : "1.5rem",
            }}>
              {state.topic ?? "..."}
            </p>
          </div>

          {/* ステータスメッセージボックス */}
          <div
            style={{
              ...(isMyTurn
                ? {
                    background: C.primary,
                    color: C.textMain,
                    animation: "ab-turn-pulse 2s ease-in-out infinite",
                    boxShadow: `0 8px 24px ${C.primary}40, 0 4px 8px rgba(0,0,0,0.1)`,
                  }
                : isEliminated
                  ? { 
                      background: C.gray200,
                      color: C.textSub,
                      boxShadow: SHADOWS.sm,
                    }
                  : { 
                      background: C.bgCard,
                      color: C.textMain,
                      boxShadow: SHADOWS.md,
                    }),
              padding: SPACING.xl,
              borderRadius: RADIUS.lg,
              border: `2px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              ...TYPOGRAPHY.xl,
              fontWeight: 800,
              position: "relative",
              overflow: "hidden",
              minWidth: 0,
              textAlign: "center",
            }}
          >
            {isEliminated ? (
              "あなたは脱落しました"
            ) : isMyTurn ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: SPACING.sm, flexWrap: "wrap" }}>
                <span
                  className="animate-ab-pulse inline-block w-2 h-2 rounded-full"
                  style={{ background: C.textMain }}
                />
                あなたの番です！
                {state.attackCount > 0 && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 12px",
                      background: "linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)",
                      color: "#fff",
                      borderRadius: RADIUS.full,
                      fontSize: TYPOGRAPHY.sm.fontSize,
                      fontWeight: 800,
                      boxShadow: "0 2px 8px rgba(255, 107, 53, 0.3)",
                      animation: "ab-combo-flash 0.6s ease-in-out infinite",
                    }}
                  >
                    <span style={{
                      display: "inline-block",
                      width: "0",
                      height: "0",
                      borderLeft: "4px solid transparent",
                      borderRight: "4px solid transparent",
                      borderBottom: "7px solid #fff",
                      filter: "drop-shadow(0 0 2px rgba(255,255,255,0.5))",
                    }} />
                    連続攻撃
                  </span>
                )}
                <span
                  className="animate-ab-pulse inline-block w-2 h-2 rounded-full"
                  style={{ background: C.textMain }}
                />
              </span>
            ) : (
              `${currentPlayer?.name ?? "..."} の番です`
            )}
          </div>
        </div>
      )}

      {/* Attack result banner */}
      {state.lastAttackChar && !gameResult && (
        <div
          style={{
            margin: `0 0 ${SPACING.md}`,
            padding: `${SPACING.md} ${SPACING.lg}`,
            borderRadius: RADIUS.md,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: SPACING.sm,
            ...(state.lastAttackHit
              ? {
                  background: C.successBg,
                  boxShadow: `0 2px 12px rgba(142, 217, 115, 0.2), 0 1px 4px rgba(244, 209, 37, 0.15)`,
                  animation: attackAnim === "hit" ? "ab-shake .5s ease-out" : undefined,
                }
              : {
                  background: C.gray200,
                  boxShadow: SHADOWS.sm,
                  animation: attackAnim === "miss" ? "ab-miss-fade .5s ease-out" : undefined,
                }),
          }}
        >
          {/* Player badge */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 10px",
            background: state.lastAttackHit ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.7)",
            borderRadius: RADIUS.full,
            boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
            flexShrink: 0,
          }}>
            <div style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: playerColor,
            }} />
            <span style={{
              fontSize: "13px",
              fontWeight: 800,
              color: state.lastAttackHit ? C.textMain : C.textSub,
            }}>
              {room.players.find((p) => p.id === state.lastAttackPlayerId)?.name ?? "?"}
            </span>
          </div>
          
          {/* Attack character */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "40px",
            height: "40px",
            background: state.lastAttackHit ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.6)",
            borderRadius: RADIUS.md,
            border: state.lastAttackHit ? `2px solid ${C.primary}` : `2px solid ${C.gray300}`,
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: "20px",
              fontWeight: 900,
              color: state.lastAttackHit ? C.textMain : C.textSub,
            }}>
              {state.lastAttackChar}
            </span>
          </div>
          
          {/* Arrow */}
          <svg width="20" height="20" viewBox="0 0 24 24" style={{ opacity: 0.7, flexShrink: 0 }}>
            <path d="M5 12h14m-7-7l7 7-7 7" stroke={state.lastAttackHit ? "#fff" : C.textSub} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          
          {/* Result */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            {state.lastAttackHit ? (
              <>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "24px",
                  height: "24px",
                  background: "rgba(255,255,255,0.95)",
                  borderRadius: "50%",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" stroke={C.primary} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span style={{ fontSize: "16px", fontWeight: 900, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>
                  ヒット！
                </span>
              </>
            ) : (
              <>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "24px",
                  height: "24px",
                  background: "rgba(255,255,255,0.6)",
                  borderRadius: "50%",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24">
                    <path d="M6 6l12 12M6 18L18 6" stroke={C.textSub} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  </svg>
                </div>
                <span style={{ fontSize: "16px", fontWeight: 900, color: C.textSub }}>
                  ミス
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Result card */}
      {gameResult && (
        <GameResultCard
          result={gameResult.ranking?.[0] === playerId ? "win" : "lose"}
          winnerName={(resultPlayers ?? room.players).find((p) => p.id === gameResult.ranking?.[0])?.name ?? "?"}
          isHost={playerId === room.hostId}
          onRematch={startGame}
          onLeave={leaveRoom}
          playerId={playerId}
          rematchRequests={rematchRequests}
          resultPlayers={resultPlayers ?? room.players}
          minPlayers={minPlayers}
          onRematchRequest={onRematchRequest}
        />
      )}

      {/* 五十音ボード */}
      <div
        className={isMyTurn ? "ab-board-pulse" : ""}
        style={{
          ...styles.kbCard,
          maxWidth: "900px",
          margin: `${SPACING.lg} auto`,
          ...(!isMyTurn ? {
            opacity: 0.5,
            filter: "grayscale(0.4)",
            pointerEvents: "none" as const,
          } : {}),
        }}
      >
        <div style={isWide ? styles.boardGridH : styles.boardGrid}>
          {layout.map((row, ri) => (
            <div key={`row-${ri}`} style={isWide ? styles.boardRowH : styles.boardRow}>
              {row.map((char, ci) => {
                if (!char) return <div key={`empty-${ri}-${ci}`} style={isWide ? styles.charEmptyH : styles.charEmpty} />;
                const idx = charToIndex(char);
                const used = state.usedChars[idx];
                
                return (
                  <button
                    key={`${ri}-${ci}`}
                    className={used || !isMyTurn ? "" : "ab-battle-char"}
                    style={{
                      ...(isWide ? styles.charButtonH : styles.charButton),
                      ...(used
                        ? styles.charUsed
                        : {
                            cursor: isMyTurn ? "pointer" : "default",
                            background: isMyTurn ? C.bgCard : C.gray100,
                            color: C.textMain,
                          }),
                    }}
                    disabled={!isMyTurn || used || state.finished}
                    onClick={() =>
                      sendTypedMove({ type: "attack", charIndex: idx })
                    }
                  >
                    {used ? <s>{char}</s> : char}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
