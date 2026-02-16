import type { AiueBattleMove, AiueBattleState, GameResult, RoomInfo } from "@bodobako/shared";
import { GameResultCard } from "../../components/GameResultCard";
import { BOARD_LAYOUT, BOARD_LAYOUT_HORIZONTAL, C, charToIndex, styles, useIsWideBoard } from "./constants";
import { PlayerSheet } from "./PlayerSheet";

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
}: BattleBoardProps) {
  const currentPlayer = room.players.find(
    (p) => p.id === state.playerIds[state.currentPlayerIndex]
  );
  const isMyTurn =
    state.playerIds[state.currentPlayerIndex] === playerId && !state.finished;
  const isEliminated = state.eliminatedPlayers.includes(playerId);
  const isWide = useIsWideBoard();
  const layout = isWide ? BOARD_LAYOUT_HORIZONTAL : BOARD_LAYOUT;

  return (
    <>
      {/* Topic & Turn banner (横一列) */}
      {!gameResult && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(150px, 1fr) minmax(0, 2fr)",
            gap: "0.5rem",
            margin: "0 0 1rem",
          }}
        >
          {/* お題カード */}
          <div
            style={{
              background: "linear-gradient(145deg, #ffffff, #fafafa)",
              padding: "clamp(0.75rem, 3vw, 1.5rem)",
              borderRadius: "clamp(12px, 3vw, 20px)",
              border: "none",
              boxShadow: "0 10px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
              transform: "rotate(-1deg)",
              textAlign: "center",
              overflow: "visible",
            }}
          >
            <div
              style={{
                fontSize: "clamp(0.5rem, 1.5vw, 0.65rem)",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "#fff",
                background: "linear-gradient(135deg, #f4d125, #ffbc42)",
                padding: "clamp(0.25rem, 1vw, 0.4rem) clamp(0.5rem, 2vw, 1rem)",
                borderRadius: "clamp(12px, 3vw, 20px)",
                display: "inline-block",
                marginBottom: "clamp(0.35rem, 1.5vw, 0.75rem)",
                boxShadow: "0 2px 8px rgba(244,209,37,0.3)",
              }}
            >
              Topic
            </div>
            <p style={{ 
              fontSize: state.topic.length > 20 
                ? "clamp(0.9rem, 3vw, 1.3rem)" 
                : state.topic.length > 12 
                  ? "clamp(1rem, 3.5vw, 1.6rem)" 
                  : "clamp(1.2rem, 4vw, 2rem)", 
              fontWeight: 900, 
              color: C.textMain, 
              margin: 0, 
              letterSpacing: "0.02em", 
              wordBreak: "break-word", 
              lineHeight: "1.2" 
            }}>
              {state.topic}
            </p>
          </div>

          {/* ステータスメッセージボックス */}
          <div
            style={{
              ...(isMyTurn
                ? {
                    background: "linear-gradient(135deg, #ffbc42, #ffd96a)",
                    color: C.textMain,
                    animation: "ab-turnPulse 2s ease-in-out infinite",
                    boxShadow: "0 12px 35px rgba(255,188,66,0.35), 0 4px 12px rgba(0,0,0,0.1)",
                  }
                : isEliminated
                  ? { 
                      background: "linear-gradient(145deg, #e2e8f0, #cbd5e0)",
                      color: C.textSub,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                    }
                  : { 
                      background: "linear-gradient(145deg, #ffffff, #fafafa)",
                      color: C.textMain,
                      boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                    }),
              padding: "clamp(1rem, 3vw, 2rem) clamp(1rem, 4vw, 2.5rem)",
              borderRadius: "clamp(16px, 4vw, 24px)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "clamp(1rem, 3vw, 1.5rem)",
              fontWeight: 900,
              position: "relative",
              overflow: "hidden",
              letterSpacing: "0.02em",
              minWidth: 0,
              textAlign: "center",
            }}
          >
            {isEliminated
              ? "あなたは脱落しました"
              : isMyTurn
                ? `🎯 あなたの番です！${state.attackCount > 0 ? " （連続攻撃！）" : ""}`
                : `${currentPlayer?.name ?? "..."} の番です`}
          </div>
        </div>
      )}

      {/* Attack result banner */}
      {state.lastAttackChar && !gameResult && (
        <div
          style={{
            fontSize: "1.1rem",
            fontWeight: 700,
            margin: "0 0 1rem",
            padding: "1rem 1.5rem",
            borderRadius: "16px",
            textAlign: "center",
            letterSpacing: "0.02em",
            ...(state.lastAttackHit
              ? {
                  background: "linear-gradient(135deg, #06d6a0, #4ade80)",
                  color: "#fff",
                  boxShadow: "0 8px 24px rgba(6,214,160,0.35), 0 2px 8px rgba(0,0,0,0.1)",
                  animation: attackAnim === "hit" ? "ab-shake .5s ease-out" : undefined,
                }
              : {
                  background: "linear-gradient(145deg, #f5f5f5, #e5e5e5)",
                  color: C.textSub,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  animation: attackAnim === "miss" ? "ab-missFade .5s ease-out" : undefined,
                }),
          }}
        >
          <span style={{ fontWeight: 800 }}>
            {room.players.find((p) => p.id === state.lastAttackPlayerId)?.name ?? "?"}
          </span>
          ：「{state.lastAttackChar}」→{" "}
          {state.lastAttackHit ? "ヒット！" : "ミス"}
        </div>
      )}

      {/* Result card */}
      {gameResult && (
        <GameResultCard
          result={gameResult.ranking?.[0] === playerId ? "win" : "lose"}
          winnerName={room.players.find((p) => p.id === gameResult.ranking?.[0])?.name ?? "?"}
          isHost={playerId === room.hostId}
          onRematch={startGame}
          onLeave={leaveRoom}
        />
      )}

      {/* 五十音ボード */}
      <div
        className={isMyTurn ? "ab-board-pulse" : ""}
        style={{
          ...styles.kbCard,
          ...(!isMyTurn ? {
            opacity: 0.5,
            filter: "grayscale(0.4)",
            pointerEvents: "none" as const,
          } : {}),
        }}
      >
        <div style={isWide ? styles.boardGridH : styles.boardGrid}>
          {layout.map((row, ri) => (
            <div key={ri} style={isWide ? styles.boardRowH : styles.boardRow}>
              {row.map((char, ci) => {
                if (!char) return <div key={ci} style={isWide ? styles.charEmptyH : styles.charEmpty} />;
                const idx = charToIndex(char);
                const used = state.usedChars[idx];
                
                return (
                  <button
                    key={ci}
                    className={used || !isMyTurn ? "" : "ab-battle-char"}
                    style={{
                      ...(isWide ? styles.charButtonH : styles.charButton),
                      ...(used
                        ? styles.charUsed
                        : {
                            cursor: isMyTurn ? "pointer" : "default",
                            background: isMyTurn ? "#fff" : "#f5f5f5",
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

      {/* Player sheets */}
      <div style={styles.sheets}>
        {state.playerIds.map((pid, pi) => (
          <PlayerSheet
            key={pid}
            pid={pid}
            pi={pi}
            state={state}
            room={room}
            playerId={playerId}
            newlyRevealed={newlyRevealed}
            gameResult={gameResult}
          />
        ))}
      </div>
    </>
  );
}
