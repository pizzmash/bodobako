import { useRoom } from "../../context/RoomContext";
import { GameResultCard } from "../../components/GameResultCard";
import type { OthelloState, OthelloMove } from "@bodobako/shared";
import { getValidMoves, countDiscs, BOARD_SIZE } from "@bodobako/shared";

export function OthelloBoard() {
  const { gameState, playerId, sendMove, gameResult, room, startGame, leaveRoom } = useRoom();
  const state = gameState as OthelloState | null;
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
    <div style={styles.container}>
      <h2>オセロ</h2>
      <div style={styles.info}>
        <span>あなた: {myColor}</span>
        <span style={styles.separator}>|</span>
        <span>黒: {counts.black} / 白: {counts.white}</span>
      </div>

      {!gameResult && (
        <div style={styles.turn}>
          {isMyTurn ? "あなたの番です" : `${currentPlayer?.name ?? "相手"} の番です`}
        </div>
      )}

      {gameResult && (
        <GameResultCard
          result={
            gameResult.winnerId === playerId
              ? "win"
              : gameResult.winnerId
                ? "lose"
                : "draw"
          }
          winnerName={room.players.find((p) => p.id === gameResult.winnerId)?.name}
          isHost={playerId === room.hostId}
          onRematch={startGame}
          onLeave={leaveRoom}
        />
      )}

      <div style={styles.board}>
        {Array.from({ length: BOARD_SIZE }, (_, row) => (
          <div key={row} style={styles.row}>
            {Array.from({ length: BOARD_SIZE }, (_, col) => {
              const cell = state.board[row][col];
              const isValid = validSet.has(`${row},${col}`);
              return (
                <div
                  key={col}
                  style={{
                    ...styles.cell,
                    cursor: isValid ? "pointer" : "default",
                    background: isValid ? "#3a7a3a" : "#2d8a2d",
                  }}
                  onClick={() => handleClick(row, col)}
                >
                  {cell !== "empty" && (
                    <div
                      style={{
                        ...styles.disc,
                        background: cell === "black" ? "#111" : "#eee",
                        boxShadow:
                          cell === "black"
                            ? "inset 0 -2px 4px rgba(255,255,255,0.2)"
                            : "inset 0 -2px 4px rgba(0,0,0,0.2)",
                      }}
                    />
                  )}
                  {isValid && cell === "empty" && <div style={styles.hint} />}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {mustPass && (
        <button style={styles.passButton} onClick={handlePass}>
          パス（置ける場所がありません）
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    fontFamily: "sans-serif",
  },
  info: {
    fontSize: "1.1rem",
    margin: "0.5rem 0",
  },
  separator: {
    margin: "0 1rem",
    color: "#aaa",
  },
  turn: {
    fontSize: "1.2rem",
    fontWeight: "bold",
    margin: "0.5rem 0 1rem",
  },
  board: {
    display: "flex",
    flexDirection: "column",
    border: "3px solid #1a5c1a",
    borderRadius: "4px",
  },
  row: {
    display: "flex",
  },
  cell: {
    width: "56px",
    height: "56px",
    border: "1px solid #1a5c1a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  disc: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    transition: "all 0.2s",
  },
  hint: {
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.3)",
  },
  passButton: {
    marginTop: "1rem",
    padding: "0.75rem 2rem",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "none",
    background: "#d9904a",
    color: "#fff",
    cursor: "pointer",
  },
};
