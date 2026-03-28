import type { CiaoCiaoStateView } from "@bodobako/shared";
import { getGameDefinition } from "@bodobako/shared";
import { useCallback, useMemo, useState } from "react";
import { useParticipantProfiles } from "../../components/AppHeader/hooks/useParticipantProfiles";
import { GameResultCard } from "../../components/GameResultCard";
import { useAuth } from "../../context/AuthContext";
import { useRoom } from "../../context/RoomContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useResolvedPlayerColors } from "../../hooks/useResolvedPlayerColors";
import { Z } from "../../styles/tokens";
import { Bridge } from "./Bridge";
import { ChallengePanel } from "./ChallengePanel";
import { DeclarePanel } from "./DeclarePanel";
import { DiceArea } from "./DiceArea";
import { RevealOverlay } from "./RevealOverlay";
import { CC, CIAO_PLAYER_COLORS, FONT_BODY } from "./constants";

export function CiaoCiaoBoard() {
  const {
    gameState,
    playerId,
    sendMove,
    room,
    gameResult,
    startGame,
    leaveRoom,
    resultPlayers,
    rematchRequests,
    requestRematch,
  } = useRoom();
  const { firebaseUser } = useAuth();
  const isMobile = useIsMobile();
  const [profilesByUid] = useParticipantProfiles(room?.players ?? null);
  const [bridgeAnimating, setBridgeAnimating] = useState(false);

  const state = gameState?.gameId === "ciao-ciao"
    ? (gameState.state as CiaoCiaoStateView)
    : null;

  const getName = useCallback(
    (pid: string) => room?.players.find((p) => p.id === pid)?.name ?? pid.slice(0, 8),
    [room?.players],
  );

  const getPhotoURL = useCallback(
    (pid: string) => {
      const player = room?.players.find((p) => p.id === pid);
      const uid = player?.userId;
      if (!uid) return undefined;
      if (pid === playerId) return firebaseUser?.photoURL ?? profilesByUid[uid]?.photoURL ?? undefined;
      return profilesByUid[uid]?.photoURL ?? undefined;
    },
    [room?.players, playerId, firebaseUser?.photoURL, profilesByUid],
  );

  const resolveColor = useResolvedPlayerColors(room?.players ?? null);

  const getColor = useCallback(
    (pid: string) => {
      const idx = state?.playerIds.indexOf(pid) ?? 0;
      return resolveColor(pid, CIAO_PLAYER_COLORS[idx]?.fill ?? "#888");
    },
    [resolveColor, state?.playerIds],
  );

  const getMeepleColor = useCallback(
    (pid: string) => {
      const idx = state?.playerIds.indexOf(pid) ?? 0;
      return resolveColor(pid, CIAO_PLAYER_COLORS[idx]?.meeple ?? "#888");
    },
    [resolveColor, state?.playerIds],
  );

  // 手番プレイヤーのID
  const currentPid = state ? state.playerIds[state.currentPlayerIndex] : null;
  const isMyTurn = currentPid === playerId;

  // チャレンジ中のプレイヤーID
  const challengerPid = state?.currentChallengerIndex !== null && state?.currentChallengerIndex !== undefined
    ? state.playerIds[state.currentChallengerIndex]
    : null;
  const isMyChallenge = challengerPid === playerId;

  // 宣言中のハイライト：手番プレイヤーの位置 + 宣言値
  const highlightedTile = useMemo(() => {
    if (!state || !state.declaredValue) return null;
    if (state.phase !== "challenging" && state.phase !== "revealing") return null;
    const pos = state.bridgePositions[state.playerIds[state.currentPlayerIndex]] ?? 0;
    return pos + state.declaredValue;
  }, [state]);

  if (gameState !== null && gameState.gameId !== "ciao-ciao") return null;
  if (!state || !playerId || !room) return null;

  // ---- ゲーム結果オーバーレイ (アニメーション終了待ち) ----
  let resultOverlay = null;
  if (gameResult && !bridgeAnimating) {
    const winnerId = gameResult.ranking?.[0] ?? null;
    const myResult = winnerId === playerId ? "win" : "lose";
    const winnerName = (resultPlayers ?? room.players).find((p) => p.id === winnerId)?.name;
    resultOverlay = (
      <div
        className="fixed inset-0 flex items-center justify-center p-4 backdrop-blur-sm"
        style={{
          zIndex: Z.overlay,
          background: "rgba(15,23,42,0.34)",
          paddingRight: "calc(16px + var(--sidebar-right-offset, 0px))",
        }}
      >
        <div style={{ maxWidth: 420, width: "100%" }}>
          <GameResultCard
            result={myResult}
            winnerName={winnerName}
            isHost={room.hostId === playerId}
            onRematch={startGame}
            onLeave={leaveRoom}
            playerId={playerId}
            rematchRequests={rematchRequests}
            resultPlayers={resultPlayers ?? room.players}
            minPlayers={getGameDefinition(room.gameId)?.minPlayers ?? 2}
            onRematchRequest={requestRematch}
          />
        </div>
      </div>
    );
  }

  // ---- アクションエリア ----
  let actionArea = null;
  if (state.phase === "rolling" && isMyTurn) {
    actionArea = <DiceArea onRoll={() => sendMove({ type: "roll" })} />;
  } else if (state.phase === "declaring" && isMyTurn && state.diceRoll !== null) {
    actionArea = (
      <DeclarePanel
        myRoll={state.diceRoll}
        onDeclare={(value) => sendMove({ type: "declare", value })}
      />
    );
  } else if (state.phase === "challenging" && isMyChallenge && state.declaredValue !== null) {
    actionArea = (
      <ChallengePanel
        declarerName={getName(currentPid!)}
        declarerColor={getColor(currentPid!)}
        declaredValue={state.declaredValue}
        onTrust={() => sendMove({ type: "challenge", action: "trust" })}
        onCallLiar={() => sendMove({ type: "challenge", action: "call-liar" })}
      />
    );
  } else if (state.phase !== "revealing") {
    // 待機メッセージ
    const targetPid = state.phase === "challenging" && challengerPid
      ? challengerPid
      : currentPid;
    const phaseLabels: Record<string, string> = {
      rolling: "サイコロを振っています",
      declaring: "数字を選んでいます",
      challenging: "判断しています",
    };
    actionArea = (
      <div className="text-center text-sm" style={{ fontFamily: FONT_BODY }}>
        <p
          className="font-semibold"
          style={{
            color: "#fff",
            textShadow: "0 1px 4px rgba(0,0,0,0.7), 0 0 8px rgba(0,0,0,0.5)",
          }}
        >
          {targetPid ? getName(targetPid) : ""} のターン
        </p>
        <p className="room-loading-dots" style={{ color: CC.outline }}>
          {phaseLabels[state.phase] ?? ""}
        </p>
      </div>
    );
  }

  // ---- Reveal オーバーレイ ----
  let revealOverlay = null;
  if (state.phase === "revealing" && state.challengeResult && !state.finished) {
    revealOverlay = (
      <RevealOverlay
        result={state.challengeResult}
        declarerName={getName(currentPid!)}
        challengerName={getName(state.challengeResult.challengerId)}
        isMyTurn={isMyTurn}
        onAck={() => sendMove({ type: "ack-reveal" })}
      />
    );
  }

  return (
    <div
      ref={(el) => {
        // ボードの高さを「ビューポートの残り全体」に正確に合わせる
        if (el) {
          const top = el.getBoundingClientRect().top;
          el.style.height = `calc(100dvh - ${top}px)`;
        }
      }}
      className="relative overflow-hidden"
      style={{
        fontFamily: FONT_BODY,
      }}
    >
      {/* ジャングル背景画像 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuALmDZroTZCQjwBUDUMkx7Rp5rXSZ8RrYltS_UOo5m-G38QER7ncx74_n0QPa18MPjyMCWh5qTiw1qOXA9SZMZY9STrQQia5pPGro4w0hjbhi5PxrpLqLONiJfVtC8-t-qmGVxACfyugTIjCXLjLTNVywSU3JkTDhzvKf04yy1qwZ-nQxPKXt7vCrWsy2Ls-W_pZLo6gSztsf2wLXAXBUubOwZTP7QRHNxEnqpRsPc9UyDURlzIaIP5yKfuOQwbXXxD0S1voxgjpIYK"
          alt=""
          className="w-full h-full object-cover"
          style={{ filter: "blur(12px) brightness(1.35) saturate(0.7)", transform: "scale(1.05)" }}
        />
        {/* 白いオーバーレイで全体を明るく */}
        <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.45)" }} />
      </div>

      {/* メインコンテンツ */}
      <div className="relative h-full">
        {/* 橋エリア: 3D perspective で傾けて中央に配置 */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ perspective: "1000px" }}
        >
          <div style={{ transform: "rotateX(20deg) rotateY(-5deg)" }}>
            <Bridge state={state} highlightedTile={highlightedTile} getName={getName} getPhotoURL={getPhotoURL} getMeepleColor={getMeepleColor} onAnimatingChange={setBridgeAnimating} />
          </div>
        </div>



        {/* アクションエリア: 画面下部に配置（コンテンツに応じた高さ） */}
        <div
          className="absolute inset-x-0 bottom-0 flex justify-center px-4"
          style={{
            paddingBottom: isMobile ? 8 : 16,
          }}
        >
          {actionArea}
        </div>
      </div>

      {/* Reveal オーバーレイ */}
      {revealOverlay}

      {/* ゲーム結果 */}
      {resultOverlay}
    </div>
  );
}
