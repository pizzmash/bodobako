import type { AiueBattleMove, AiueBattleState } from "@bodobako/shared";
import { getGameDefinition } from "@bodobako/shared";
import { useCallback, useState } from "react";
import { useRoom } from "../../context/RoomContext";
import { BattleBoard } from "./BattleBoard";
import { C, FONT, RADIUS } from "./constants";
import { useAiueState } from "./hooks/useAiueState";
import { TopicSelect } from "./TopicSelect";
import { WordInput } from "./WordInput";

// あいうえバトル タイトル文字カラー
const TITLE_COLORS = {
  a: "#ff5c8d",   // あ — ピンク
  i: "#ffbc42",   // い — イエロー
  u: "#0496ff",   // う — ブルー
  e: "#06d6a0",   // え — グリーン
  battle: "#9d4edd", // バトル — パープル
} as const;

export function AiueBattleBoard() {
  const { gameState, playerId, sendMove, gameResult, room, startGame, leaveRoom, resultPlayers, rematchRequests, requestRematch } =
    useRoom();
  // ゲームIDが一致する場合のみ state を取得。フックは早期 return より前に呼ぶ必要があるため
  // ここで型を絞り込む（gameId 不一致時は null を渡してフックを安全に稼働させる）
  const state = (gameState?.gameId === "aiuebattle" ? gameState.state : null) as AiueBattleState | null;
  const [wordChars, setWordChars] = useState<string[]>([]);
  const [customTopic, setCustomTopic] = useState("");
  const [showWordConfirm, setShowWordConfirm] = useState(false);

  const { attackAnim, newlyRevealed } = useAiueState(state);

  const sendTypedMove = useCallback(
    (move: AiueBattleMove) => sendMove(move),
    [sendMove]
  );

  if (gameState !== null && gameState.gameId !== "aiuebattle") return null;
  if (!state || !playerId || !room) return null;

  // カラフルでポップなタイトル
  const Title = (
    <h2
      className="m-0 my-4 text-4xl font-black tracking-[0.05em] text-center flex items-center justify-center flex-nowrap whitespace-nowrap"
      style={{ gap: "clamp(4px, 1vw, 8px)", fontFamily: FONT }}
    >
      {[
        { char: "あ", color: TITLE_COLORS.a, rotate: "-2deg" },
        { char: "い", color: TITLE_COLORS.i, rotate: "2deg" },
        { char: "う", color: TITLE_COLORS.u, rotate: "-1deg" },
        { char: "え", color: TITLE_COLORS.e, rotate: "1deg" },
        { char: "バトル", color: TITLE_COLORS.battle, rotate: "0deg" },
      ].map((item, i) => (
        <span
          key={i}
          className="ab-title-char inline-block"
          style={{
            color: item.color,
            background: C.bgCard,
            padding: "clamp(4px, 1vw, 8px) clamp(8px, 2vw, 16px)",
            borderRadius: RADIUS.md,
            border: `2px solid ${item.color}`,
            transform: `rotate(${item.rotate})`,
            boxShadow: `0 4px 12px ${item.color}30`,
            transition: "transform 0.2s ease",
          }}
        >
          {item.char}
        </span>
      ))}
    </h2>
  );

  return (
    <div
      className="flex flex-col items-center justify-start min-h-screen p-4 text-[#171717]"
      style={{ background: C.gray50, fontFamily: FONT }}
    >
      {Title}

      {state.phase === "topic-select" && (
        <TopicSelect
          state={state}
          playerId={playerId}
          room={room}
          sendTypedMove={sendTypedMove}
          customTopic={customTopic}
          setCustomTopic={setCustomTopic}
        />
      )}
      {state.phase === "word-input" && (
        <WordInput
          state={state}
          playerId={playerId}
          room={room}
          sendTypedMove={sendTypedMove}
          wordChars={wordChars}
          setWordChars={setWordChars}
          showWordConfirm={showWordConfirm}
          setShowWordConfirm={setShowWordConfirm}
        />
      )}
      {state.phase === "battle" && (
        <BattleBoard
          state={state}
          playerId={playerId}
          room={room}
          sendTypedMove={sendTypedMove}
          gameResult={gameResult}
          startGame={startGame}
          leaveRoom={leaveRoom}
          attackAnim={attackAnim}
          newlyRevealed={newlyRevealed}
          resultPlayers={resultPlayers}
          rematchRequests={rematchRequests}
          minPlayers={getGameDefinition(room.gameId)?.minPlayers ?? 2}
          onRematchRequest={requestRematch}
        />
      )}
    </div>
  );
}
