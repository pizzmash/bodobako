import type { AiueBattleState, AiueBattleMove, RoomInfo, GameResult } from "@bodobako/shared";
import { GameResultCard } from "../../components/GameResultCard";
import { C, BOARD_LAYOUT, BOARD_LAYOUT_HORIZONTAL, charToIndex, useIsWideBoard, styles } from "./constants";
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
      {/* Turn banner */}
      {!gameResult && (
        <div
          style={{
            ...styles.turnBanner,
            ...(isMyTurn
              ? {
                  background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
                  color: "#fff",
                  animation: "ab-turnPulse 2s ease-in-out infinite",
                }
              : isEliminated
                ? { background: "#e2e8f0", color: C.textSub }
                : {}),
          }}
        >
          {isEliminated
            ? "あなたは脱落しました"
            : isMyTurn
              ? `あなたの番です${state.attackCount > 0 ? "（連続攻撃！）" : ""}`
              : `${currentPlayer?.name ?? "..."} の番です`}
        </div>
      )}

      {/* Attack result banner */}
      {state.lastAttackChar && !gameResult && (
        <div
          style={{
            ...styles.attackBanner,
            ...(state.lastAttackHit
              ? {
                  background: "#f0faf0",
                  borderColor: C.success,
                  color: C.success,
                  animation: attackAnim === "hit" ? "ab-shake .5s ease-out" : undefined,
                }
              : {
                  background: "#f7f7f7",
                  borderColor: "#ccc",
                  color: C.textSub,
                  animation: attackAnim === "miss" ? "ab-missFade .5s ease-out" : undefined,
                }),
          }}
        >
          <span style={{ fontWeight: 700 }}>
            {room.players.find((p) => p.id === state.lastAttackPlayerId)?.name ?? "?"}
          </span>
          ：「{state.lastAttackChar}」→{" "}
          {state.lastAttackHit ? "ヒット！" : "ミス"}
        </div>
      )}

      {/* Result card */}
      {gameResult && (
        <GameResultCard
          result={gameResult.winnerId === playerId ? "win" : "lose"}
          winnerName={room.players.find((p) => p.id === gameResult.winnerId)?.name ?? "?"}
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
                            borderColor: isMyTurn ? C.primary : "#ccc",
                            color: isMyTurn ? C.textMain : C.textSub,
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
