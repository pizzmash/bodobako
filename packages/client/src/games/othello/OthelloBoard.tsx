import type { OthelloMove } from "@bodobako/shared";
import { BOARD_SIZE, countDiscs, getValidMoves } from "@bodobako/shared";
import { GameResultCard } from "../../components/GameResultCard";
import { useRoom } from "../../context/RoomContext";

export function OthelloBoard() {
  const { gameState, playerId, sendMove, gameResult, room, startGame, leaveRoom } = useRoom();
  if (gameState !== null && gameState.gameId !== "othello") return null;
  const state = gameState?.state ?? null;
  if (!state || !playerId || !room) return null;

  const myIndex = state.playerIds.indexOf(playerId);
  const isMyTurn = state.currentPlayerIndex === myIndex;
  const validMoves = isMyTurn ? getValidMoves(state.board, myIndex) : [];
  const validSet = new Set(validMoves.map(([r, c]) => `${r},${c}`));
  const mustPass = isMyTurn && validMoves.length === 0 && !state.finished;
  const counts = countDiscs(state.board);

  const currentPlayer = room.players.find(
    (p) => p.id === state.playerIds[state.currentPlayerIndex]
  );

  const handleClick = (row: number, col: number) => {
    if (!isMyTurn || state.finished) return;
    if (!validSet.has(`${row},${col}`)) return;
    const move: OthelloMove = { row, col };
    sendMove(move);
  };

  const handlePass = () => {
    if (!isMyTurn || !mustPass) return;
    const move: OthelloMove = { row: -1, col: -1, pass: true };
    sendMove(move);
  };

  const myColor = myIndex === 0 ? "黒" : "白";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen font-sans">
      <h2>オセロ</h2>
      <div className="text-lg my-2">
        <span>あなた: {myColor}</span>
        <span className="mx-4 text-gray-400">|</span>
        <span>黒: {counts.black} / 白: {counts.white}</span>
      </div>

      {!gameResult && (
        <div className="text-xl font-bold my-2 mb-4">
          {isMyTurn ? "あなたの番です" : `${currentPlayer?.name ?? "相手"} の番です`}
        </div>
      )}

      {gameResult && (
        <GameResultCard
          result={
            gameResult.ranking?.[0] === playerId
              ? "win"
              : gameResult.ranking?.[0]
                ? "lose"
                : "draw"
          }
          winnerName={room.players.find((p) => p.id === gameResult.ranking?.[0])?.name}
          isHost={playerId === room.hostId}
          onRematch={startGame}
          onLeave={leaveRoom}
        />
      )}

      <div className="flex flex-col border-[3px] border-[#1a5c1a] rounded-sm">
        {Array.from({ length: BOARD_SIZE }, (_, row) => (
          <div key={`row-${row}`} className="flex">
            {Array.from({ length: BOARD_SIZE }, (_, col) => {
              const cell = state.board[row][col];
              const isValid = validSet.has(`${row},${col}`);
              return (
                <div
                  key={`${row}-${col}`}
                  data-valid={isValid}
                  className="w-14 h-14 border border-[#1a5c1a] flex items-center justify-center"
                  style={{
                    cursor: isValid ? "pointer" : "default",
                    background: isValid ? "#3a7a3a" : "#2d8a2d",
                  }}
                  onClick={() => handleClick(row, col)}
                >
                  {cell !== "empty" && (
                    <div
                      className="w-11 h-11 rounded-full transition-all duration-200"
                      style={{
                        background: cell === "black" ? "#111" : "#eee",
                        boxShadow:
                          cell === "black"
                            ? "inset 0 -2px 4px rgba(255,255,255,0.2)"
                            : "inset 0 -2px 4px rgba(0,0,0,0.2)",
                      }}
                    />
                  )}
                  {isValid && cell === "empty" && (
                    <div className="w-4 h-4 rounded-full bg-white/30" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {mustPass && (
        <button
          className="mt-4 px-8 py-3 text-base rounded-lg border-0 bg-[#d9904a] text-white cursor-pointer"
          onClick={handlePass}
        >
          パス（置ける場所がありません）
        </button>
      )}
    </div>
  );
}
