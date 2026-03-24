import type { CiaoCiaoStateView } from "@bodobako/shared";
import { getGameDefinition } from "@bodobako/shared";
import { useCallback, useMemo } from "react";
import { useParticipantProfiles } from "../../components/AppHeader/hooks/useParticipantProfiles";
import { GameResultCard } from "../../components/GameResultCard";
import { useAuth } from "../../context/AuthContext";
import { useRoom } from "../../context/RoomContext";
import { useIsMobile } from "../../hooks/useIsMobile";
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

  const getColor = useCallback(
    (pid: string) => {
      const idx = state?.playerIds.indexOf(pid) ?? 0;
      return CIAO_PLAYER_COLORS[idx]?.fill ?? "#888";
    },
    [state?.playerIds],
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

  // ---- ゲーム結果オーバーレイ ----
  let resultOverlay = null;
  if (gameResult) {
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
      <div className="text-center text-sm" style={{ color: CC.onSurfaceVariant, fontFamily: FONT_BODY }}>
        <p className="font-semibold" style={{ color: CC.onSurface }}>
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
  if (state.phase === "revealing" && state.challengeResult) {
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
      {/* ジャングルメッシュグラデーション背景 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "#e8f4e0" }}>
        {/* 大きな緑の霧（中央〜上部） */}
        <div
          className="absolute"
          style={{
            width: "140%", height: "80%", top: "-15%", left: "-20%",
            background: "radial-gradient(ellipse at 50% 45%, rgba(144,226,138,0.4) 0%, rgba(157,241,151,0.15) 35%, transparent 65%)",
            filter: "blur(40px)",
          }}
        />
        {/* 深い緑の影（右上） */}
        <div
          className="absolute"
          style={{
            width: "55%", height: "50%", top: "-5%", right: "-10%",
            background: "radial-gradient(ellipse at 65% 30%, rgba(2,93,22,0.22) 0%, rgba(23,106,33,0.08) 40%, transparent 70%)",
            filter: "blur(30px)",
          }}
        />
        {/* 暖色の木漏れ日（左下） */}
        <div
          className="absolute"
          style={{
            width: "55%", height: "50%", bottom: "-5%", left: "-8%",
            background: "radial-gradient(ellipse at 35% 65%, rgba(247,199,183,0.3) 0%, rgba(119,83,70,0.1) 40%, transparent 70%)",
            filter: "blur(35px)",
          }}
        />
        {/* 濃い緑の暗部（左上） */}
        <div
          className="absolute"
          style={{
            width: "45%", height: "40%", top: "5%", left: "-10%",
            background: "radial-gradient(ellipse at 30% 30%, rgba(0,70,14,0.15) 0%, transparent 60%)",
            filter: "blur(40px)",
          }}
        />
        {/* 黄緑のハイライト斑（中央やや上） */}
        <div
          className="absolute"
          style={{
            width: "35%", height: "25%", top: "20%", left: "35%",
            background: "radial-gradient(circle at 50% 50%, rgba(157,241,151,0.35) 0%, rgba(144,226,138,0.1) 40%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />
        {/* ピンクのアクセント霧（右下） */}
        <div
          className="absolute"
          style={{
            width: "40%", height: "35%", bottom: "0%", right: "-5%",
            background: "radial-gradient(ellipse at 60% 60%, rgba(182,0,81,0.07) 0%, transparent 60%)",
            filter: "blur(30px)",
          }}
        />
        {/* 小さな光斑（右中央） */}
        <div
          className="absolute"
          style={{
            width: "20%", height: "18%", top: "40%", right: "10%",
            background: "radial-gradient(circle, rgba(157,241,151,0.25) 0%, transparent 70%)",
            filter: "blur(20px)",
          }}
        />
        {/* 小さな暖色光斑（左中央） */}
        <div
          className="absolute"
          style={{
            width: "18%", height: "14%", top: "55%", left: "12%",
            background: "radial-gradient(circle, rgba(232,181,155,0.2) 0%, transparent 70%)",
            filter: "blur(18px)",
          }}
        />
        {/* 全体にかぶせる周辺減光 */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(23,106,33,0.06) 70%, rgba(0,70,14,0.1) 100%)",
          }}
        />
      </div>

      {/* メインコンテンツ */}
      <div className="relative h-full">
        {/* 橋エリア: 画面全体の中央に配置 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Bridge state={state} highlightedTile={highlightedTile} getName={getName} getPhotoURL={getPhotoURL} />
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
