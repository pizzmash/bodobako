import { useState } from "react";
import { useRoom } from "../../context/RoomContext";
import type { AiueBattleState, AiueBattleMove } from "@claude-demo/shared";
import { BOARD_CHARS, TOPIC_LIST, WORD_LENGTH } from "@claude-demo/shared";

const BOARD_LAYOUT: (string | null)[][] = [
  ["あ", "い", "う", "え", "お"],
  ["か", "き", "く", "け", "こ"],
  ["さ", "し", "す", "せ", "そ"],
  ["た", "ち", "つ", "て", "と"],
  ["な", "に", "ぬ", "ね", "の"],
  ["は", "ひ", "ふ", "へ", "ほ"],
  ["ま", "み", "む", "め", "も"],
  ["や", null, "ゆ", null, "よ"],
  ["ら", "り", "る", "れ", "ろ"],
  ["わ", null, "を", null, "ん"],
  ["ー"],
];

function charToIndex(char: string): number {
  return (BOARD_CHARS as readonly string[]).indexOf(char);
}

export function AiueBattleBoard() {
  const { gameState, playerId, sendMove, gameResult, room, startGame, leaveRoom } =
    useRoom();
  const state = gameState as AiueBattleState | null;
  const [wordChars, setWordChars] = useState<string[]>([]);
  const [customTopic, setCustomTopic] = useState("");

  if (!state || !playerId || !room) return null;

  const sendTypedMove = (move: AiueBattleMove) => sendMove(move);

  // --- Topic Select Phase ---
  if (state.phase === "topic-select") {
    const isSelector = playerId === state.topicSelectorId;
    const selectorName = room.players.find(
      (p) => p.id === state.topicSelectorId
    )?.name;

    return (
      <div style={styles.container}>
        <h2>あいうえバトル</h2>
        {isSelector ? (
          <>
            <p style={styles.subtitle}>お題を選んでください</p>
            <div style={styles.topicGrid}>
              {TOPIC_LIST.map((topic) => (
                <button
                  key={topic}
                  style={styles.topicButton}
                  onClick={() => sendTypedMove({ type: "select-topic", topic })}
                >
                  {topic}
                </button>
              ))}
            </div>
            <div style={styles.customTopicRow}>
              <input
                style={styles.input}
                placeholder="自由入力..."
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
              />
              <button
                style={{
                  ...styles.submitButton,
                  opacity: customTopic.trim() ? 1 : 0.5,
                }}
                disabled={!customTopic.trim()}
                onClick={() =>
                  sendTypedMove({ type: "select-topic", topic: customTopic })
                }
              >
                決定
              </button>
            </div>
          </>
        ) : (
          <p style={styles.waiting}>
            {selectorName} がお題を選んでいます...
          </p>
        )}
      </div>
    );
  }

  // --- Word Input Phase ---
  if (state.phase === "word-input") {
    const hasSubmitted = state.submittedPlayers.includes(playerId);

    return (
      <div style={styles.container}>
        <h2>あいうえバトル</h2>
        <p style={styles.topic}>
          お題: <strong>{state.topic}</strong>
        </p>

        {hasSubmitted ? (
          <>
            <p style={styles.waiting}>
              他のプレイヤーを待っています... ({state.submittedPlayers.length}/
              {state.playerIds.length})
            </p>
          </>
        ) : (
          <>
            <p style={styles.subtitle}>
              2〜7文字の言葉を入力してください（濁点なし・大文字で）
            </p>

            <div style={styles.wordDisplay}>
              {Array.from({ length: WORD_LENGTH }, (_, i) => (
                <div key={i} style={styles.wordCell}>
                  {wordChars[i] ?? ""}
                </div>
              ))}
            </div>
            <p style={styles.charCount}>{wordChars.length} / {WORD_LENGTH} 文字</p>

            <div style={styles.boardGrid}>
              {BOARD_LAYOUT.map((row, ri) => (
                <div key={ri} style={styles.boardRow}>
                  {row.map((char, ci) =>
                    char ? (
                      <button
                        key={ci}
                        style={styles.charButton}
                        disabled={wordChars.length >= WORD_LENGTH}
                        onClick={() => setWordChars([...wordChars, char])}
                      >
                        {char}
                      </button>
                    ) : (
                      <div key={ci} style={styles.charEmpty} />
                    )
                  )}
                </div>
              ))}
            </div>

            <div style={styles.actionRow}>
              <button
                style={styles.backspaceButton}
                disabled={wordChars.length === 0}
                onClick={() => setWordChars(wordChars.slice(0, -1))}
              >
                削除
              </button>
              <button
                style={{
                  ...styles.submitButton,
                  opacity: wordChars.length >= 2 ? 1 : 0.5,
                }}
                disabled={wordChars.length < 2}
                onClick={() => {
                  sendTypedMove({ type: "submit-word", word: wordChars });
                  setWordChars([]);
                }}
              >
                送信
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // --- Battle Phase ---
  const currentPlayer = room.players.find(
    (p) => p.id === state.playerIds[state.currentPlayerIndex]
  );
  const isMyTurn =
    state.playerIds[state.currentPlayerIndex] === playerId && !state.finished;
  const isEliminated = state.eliminatedPlayers.includes(playerId);

  return (
    <div style={styles.container}>
      <h2>あいうえバトル</h2>
      <p style={styles.topic}>
        お題: <strong>{state.topic}</strong>
      </p>

      {!gameResult && (
        <div style={styles.turn}>
          {isEliminated
            ? "あなたは脱落しました"
            : isMyTurn
              ? `あなたの番です${state.attackCount > 0 ? "（連続攻撃！）" : ""}`
              : `${currentPlayer?.name ?? "..."} の番です`}
        </div>
      )}

      {state.lastAttackChar && !gameResult && (
        <div
          style={{
            ...styles.attackResult,
            color: state.lastAttackHit ? "#e44" : "#888",
          }}
        >
          「{state.lastAttackChar}」→{" "}
          {state.lastAttackHit ? "ヒット！" : "ミス"}
        </div>
      )}

      {gameResult && (
        <div style={styles.result}>
          {gameResult.winnerId === playerId
            ? "あなたの勝ちです！"
            : `${room.players.find((p) => p.id === gameResult.winnerId)?.name ?? "?"} の勝ちです`}
          <div style={styles.resultButtons}>
            {playerId === room.hostId && (
              <button style={styles.rematchButton} onClick={startGame}>
                再戦
              </button>
            )}
            <button style={styles.lobbyButton} onClick={leaveRoom}>
              ロビーに戻る
            </button>
          </div>
        </div>
      )}

      {/* 五十音ボード */}
      <div style={styles.boardGrid}>
        {BOARD_LAYOUT.map((row, ri) => (
          <div key={ri} style={styles.boardRow}>
            {row.map((char, ci) => {
              if (!char) return <div key={ci} style={styles.charEmpty} />;
              const idx = charToIndex(char);
              const used = state.usedChars[idx];
              return (
                <button
                  key={ci}
                  style={{
                    ...styles.charButton,
                    ...(used ? styles.charUsed : {}),
                    cursor: isMyTurn && !used ? "pointer" : "default",
                  }}
                  disabled={!isMyTurn || used || state.finished}
                  onClick={() => sendTypedMove({ type: "attack", charIndex: idx })}
                >
                  {used ? <s>{char}</s> : char}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* 各プレイヤーの解答用紙 */}
      <div style={styles.sheets}>
        {state.playerIds.map((pid) => {
          const player = room.players.find((p) => p.id === pid);
          const word = state.words[pid];
          const rev = state.revealed[pid];
          const elim = state.eliminatedPlayers.includes(pid);
          const isMe = pid === playerId;
          return (
            <div
              key={pid}
              style={{
                ...styles.sheet,
                opacity: elim ? 0.5 : 1,
                border: isMe ? "2px solid #4a90d9" : "2px solid #ddd",
              }}
            >
              <div style={styles.sheetName}>
                {player?.name ?? "?"} {elim ? "（脱落）" : ""}
              </div>
              <div style={styles.sheetCells}>
                {word?.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      ...styles.sheetCell,
                      background: rev?.[i] ? (c === "×" ? "#eee" : "#ffe") : "#f5f5f5",
                    }}
                  >
                    {rev?.[i] ? c : "?"}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    minHeight: "100vh",
    fontFamily: "sans-serif",
    padding: "1rem",
  },
  subtitle: {
    color: "#666",
    margin: "0.5rem 0",
  },
  topic: {
    fontSize: "1.2rem",
    margin: "0.5rem 0",
  },
  turn: {
    fontSize: "1.2rem",
    fontWeight: "bold",
    margin: "0.5rem 0",
  },
  waiting: {
    color: "#888",
    fontStyle: "italic",
    fontSize: "1.1rem",
    marginTop: "2rem",
  },
  topicGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    justifyContent: "center",
    maxWidth: "600px",
    margin: "1rem 0",
    maxHeight: "400px",
    overflowY: "auto",
    padding: "0.5rem",
  },
  topicButton: {
    padding: "0.5rem 1rem",
    fontSize: "0.95rem",
    borderRadius: "6px",
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
  },
  customTopicRow: {
    display: "flex",
    gap: "0.5rem",
    margin: "1rem 0",
  },
  input: {
    padding: "0.5rem",
    fontSize: "1rem",
    borderRadius: "6px",
    border: "1px solid #ccc",
    width: "200px",
  },
  wordDisplay: {
    display: "flex",
    gap: "0.25rem",
    margin: "1rem 0",
  },
  wordCell: {
    width: "40px",
    height: "40px",
    border: "2px solid #333",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.3rem",
    fontWeight: "bold",
  },
  charCount: {
    color: "#888",
    fontSize: "0.9rem",
    margin: "0 0 0.5rem",
  },
  boardGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    margin: "0.5rem 0",
  },
  boardRow: {
    display: "flex",
    gap: "4px",
    justifyContent: "center",
  },
  charButton: {
    width: "44px",
    height: "44px",
    fontSize: "1.1rem",
    borderRadius: "6px",
    border: "1px solid #aaa",
    background: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  charEmpty: {
    width: "44px",
    height: "44px",
  },
  charUsed: {
    background: "#ddd",
    color: "#999",
    cursor: "default",
    textDecoration: "line-through",
  },
  actionRow: {
    display: "flex",
    gap: "1rem",
    margin: "1rem 0",
  },
  backspaceButton: {
    padding: "0.5rem 1.5rem",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "none",
    background: "#d9904a",
    color: "#fff",
    cursor: "pointer",
  },
  submitButton: {
    padding: "0.5rem 1.5rem",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "none",
    background: "#4a90d9",
    color: "#fff",
    cursor: "pointer",
  },
  attackResult: {
    fontSize: "1.1rem",
    fontWeight: "bold",
    margin: "0.25rem 0 0.5rem",
  },
  result: {
    fontSize: "1.4rem",
    fontWeight: "bold",
    margin: "0.5rem 0 1rem",
    color: "#c90",
    textAlign: "center",
  },
  resultButtons: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    marginTop: "1rem",
  },
  rematchButton: {
    padding: "0.75rem 2rem",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "none",
    background: "#2d8a2d",
    color: "#fff",
    cursor: "pointer",
  },
  lobbyButton: {
    padding: "0.75rem 2rem",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "none",
    background: "#666",
    color: "#fff",
    cursor: "pointer",
  },
  sheets: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
    justifyContent: "center",
    margin: "1rem 0",
  },
  sheet: {
    padding: "0.75rem",
    borderRadius: "8px",
    background: "#fafafa",
  },
  sheetName: {
    fontSize: "0.9rem",
    fontWeight: "bold",
    marginBottom: "0.5rem",
    textAlign: "center",
  },
  sheetCells: {
    display: "flex",
    gap: "2px",
  },
  sheetCell: {
    width: "32px",
    height: "32px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1rem",
    fontWeight: "bold",
  },
};
