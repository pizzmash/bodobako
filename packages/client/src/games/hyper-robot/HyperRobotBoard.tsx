import type { HyperRobotMove, HyperRobotState, Position, RobotColor, TargetMark } from "@bodobako/shared";
import { getGameDefinition } from "@bodobako/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParticipantProfiles } from "../../components/AppHeader/hooks/useParticipantProfiles";
import { GameResultCard } from "../../components/GameResultCard";
import { Avatar } from "../../components/ui/Avatar";
import { useAuth } from "../../context/AuthContext";
import { useRoom } from "../../context/RoomContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { Z } from "../../styles/tokens";
import { BiddingPanel } from "./BiddingPanel";
import { ConfiguringPanel } from "./ConfiguringPanel";
import { BIDDING_TIME_SEC, C, FONT, RAINBOW_COIN_BG, ROBOT_COLORS, TARGET_COLORS } from "./constants";
import { useTargetIconMap } from "./hooks/useTargetIconMap";
import { HyperRobotGrid } from "./HyperRobotGrid";
import { RobotBadge } from "./RobotBadge";
import { SolvingPanel } from "./SolvingPanel";
import { TargetChip } from "./TargetChip";

const EMPTY_TARGETS: TargetMark[] = [];

export function HyperRobotBoard() {
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

  const state: HyperRobotState | null =
    gameState?.gameId === "hyper-robot" ? gameState.state : null;

  // 選択中ロボット
  const [selectedRobot, setSelectedRobot] = useState<RobotColor | null>(null);

  // タイマー
  const [timeLeft, setTimeLeft] = useState(BIDDING_TIME_SEC);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerVersionRef = useRef<number>(-1);

  // 結果ポップアップ
  const [solveResult, setSolveResult] = useState<{ type: "success" | "failure"; playerId: string } | null>(null);
  const [popupRobots, setPopupRobots] = useState<Record<RobotColor, Position> | null>(null);
  const prevStateRef = useRef<HyperRobotState | null>(null);
  const popupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 新ターゲットアナウンス
  const [newTargetModal, setNewTargetModal] = useState<TargetMark | null>(null);
  const newTargetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ターゲットアイコンマップ（フックはすべて条件リターンの前に宣言）
  const targetIconMap = useTargetIconMap(state?.allTargets ?? EMPTY_TARGETS);

  const [profilesByUid] = useParticipantProfiles(room?.players ?? null);

  const getName = useCallback(
    (pid: string) => room?.players.find((p) => p.id === pid)?.name ?? pid.slice(0, 8),
    [room?.players],
  );

  const getPhotoURL = useCallback(
    (pid: string) => {
      if (pid === playerId) return firebaseUser?.photoURL ?? undefined;
      const userId = room?.players.find((p) => p.id === pid)?.userId;
      return userId ? (profilesByUid[userId]?.photoURL ?? undefined) : undefined;
    },
    [playerId, firebaseUser?.photoURL, room?.players, profilesByUid],
  );

  useEffect(() => {
    if (!state || state.phase !== "bidding") {
      if (timerRef.current) clearInterval(timerRef.current);
      timerVersionRef.current = -1;
      return;
    }
    // リトライ以外で宣言なし → タイマーをリセットして停止
    if (state.bids.length === 0 && !state.isRetry) {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeLeft(BIDDING_TIME_SEC);
      timerVersionRef.current = state.timerVersion;
      return;
    }
    // 最初の宣言 or timerVersion 変化でタイマー起動/リセット
    if (state.timerVersion !== timerVersionRef.current) {
      timerVersionRef.current = state.timerVersion;
      setTimeLeft(BIDDING_TIME_SEC);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state?.timerVersion, state?.phase, state?.isRetry]);

  // 結果ポップアップの検出
  useEffect(() => {
    if (!state) return;
    const prev = prevStateRef.current;
    prevStateRef.current = state;
    if (!prev) return;

    // 成功: chips 合計が増加
    const prevChipsSum = Object.values(prev.chips).reduce((a, b) => a + b, 0);
    const newChipsSum = Object.values(state.chips).reduce((a, b) => a + b, 0);
    if (newChipsSum > prevChipsSum) {
      const winner = state.playerIds.find((pid) => (state.chips[pid] ?? 0) > (prev.chips[pid] ?? 0));
      setSolveResult({ type: "success", playerId: winner ?? "" });
      setTimeout(() => setSolveResult(null), 2000);
      return;
    }

    // 失敗: solving のまま currentBidIndex が進んだ（次のソルバーへ）
    // または solving → bidding かつ bids が空（全員失敗）
    const isNonLastFailure =
      prev.phase === "solving" &&
      state.phase === "solving" &&
      state.currentBidIndex > prev.currentBidIndex;
    const isLastFailure =
      prev.phase === "solving" &&
      state.phase === "bidding" &&
      state.bids.length === 0;

    if (isNonLastFailure || isLastFailure) {
      const failedSolver = prev.bids[prev.currentBidIndex];
      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
      // lastFailureRobots は nextSolver がリセット前に記録した最終位置
      setPopupRobots(state.lastFailureRobots ?? prev.robots);
      setSolveResult({
        type: "failure",
        playerId: failedSolver?.playerId ?? "",
      });
      popupTimeoutRef.current = setTimeout(() => {
        setSolveResult(null);
        setPopupRobots(null);
        popupTimeoutRef.current = null;
      }, 1500);
    }

    // 新ターゲット検出（currentTarget.id が変化したとき）
    if (state.currentTarget && state.phase === "bidding" &&
        (!prev.currentTarget || prev.currentTarget.id !== state.currentTarget.id)) {
      const t = state.currentTarget;
      if (newTargetTimeoutRef.current) clearTimeout(newTargetTimeoutRef.current);
      // 失敗ポップアップと重ならないよう、同時に失敗が発生した場合は遅延させる
      const modalDelay = isLastFailure ? 1650 : 0;
      const startModal = () => {
        setNewTargetModal(t);
        newTargetTimeoutRef.current = setTimeout(() => {
          setNewTargetModal(null);
          newTargetTimeoutRef.current = null;
        }, 2800);
      };
      if (modalDelay > 0) {
        newTargetTimeoutRef.current = setTimeout(startModal, modalDelay);
      } else {
        startModal();
      }
    }
  }, [state]);

  // アンマウント時に newTarget タイマーをクリア
  useEffect(() => {
    return () => {
      if (newTargetTimeoutRef.current) clearTimeout(newTargetTimeoutRef.current);
      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
    };
  }, []);

  // solving フェーズ終了 or phase 切替で選択リセット
  useEffect(() => {
    setSelectedRobot(null);
  }, [state?.phase, state?.currentBidIndex]);

  const handleMoveRobot = useCallback(
    (direction: "up" | "down" | "left" | "right") => {
      if (!selectedRobot) return;
      const move: HyperRobotMove = { type: "move-robot", color: selectedRobot, direction };
      sendMove(move);
    },
    [selectedRobot, sendMove],
  );

  const handleBid = useCallback(
    (count: number) => {
      const move: HyperRobotMove = { type: "bid", count };
      sendMove(move);
    },
    [sendMove],
  );

  const handleGiveUp = useCallback(() => {
    const move: HyperRobotMove = { type: "give-up" };
    sendMove(move);
  }, [sendMove]);

  const handleConfirmBid = useCallback(() => {
    const move: HyperRobotMove = { type: "confirm-bid" };
    sendMove(move);
  }, [sendMove]);

  const handleUnconfirmBid = useCallback(() => {
    const move: HyperRobotMove = { type: "unconfirm-bid" };
    sendMove(move);
  }, [sendMove]);

  const handleNextTarget = useCallback(() => {
    const move: HyperRobotMove = { type: "next-target" };
    sendMove(move);
  }, [sendMove]);

  const handleStartGame = useCallback(
    (winChips: number) => {
      const move: HyperRobotMove = { type: "start-game", winChips };
      sendMove(move);
    },
    [sendMove],
  );

  // タイマー0で自動締め切り
  // 宣言あり or 再宣言ラウンド → end-bidding を送信
  useEffect(() => {
    if (timeLeft !== 0 || state?.phase !== "bidding") return;
    const hasBids = state.bids.length > 0;
    if (hasBids || state.isRetry) {
      sendMove({ type: "end-bidding" } as HyperRobotMove);
    }
  }, [timeLeft, state?.phase, state?.bids.length, state?.isRetry, sendMove]);

  // revealing フェーズで5秒後に自動的に次のターゲットへ
  useEffect(() => {
    if (state?.phase !== "revealing") {
      if (revealingTimeoutRef.current) {
        clearTimeout(revealingTimeoutRef.current);
        revealingTimeoutRef.current = null;
      }
      return;
    }
    revealingTimeoutRef.current = setTimeout(() => {
      sendMove({ type: "next-target" } as HyperRobotMove);
      revealingTimeoutRef.current = null;
    }, 5000);
    return () => {
      if (revealingTimeoutRef.current) {
        clearTimeout(revealingTimeoutRef.current);
        revealingTimeoutRef.current = null;
      }
    };
  }, [state?.phase, sendMove]);

  if (gameState !== null && gameState.gameId !== "hyper-robot") return null;
  if (!state || !playerId || !room) return null;

  const currentSolver =
    state.phase === "solving" && state.bids[state.currentBidIndex]
      ? state.bids[state.currentBidIndex].playerId
      : null;
  const isMyTurn = currentSolver === playerId;

  // ゲーム結果オーバーレイ
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
          background: "rgba(15,23,42,0.55)",
          paddingRight: `calc(16px + var(--sidebar-right-offset, 0px))`,
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

  // 残り手数表示
  const movesUsed = state.phase === "solving" ? state.moveCount : 0;
  const movesAllowed = state.phase === "solving" && state.bids[state.currentBidIndex]
    ? state.bids[state.currentBidIndex].count
    : 0;

  // 目標ヘッダー
  const t = state.currentTarget;
  const TargetIcon = t ? (targetIconMap.get(t.id) ?? null) : null;
  const tColor = t ? TARGET_COLORS[t.color] : null;
  const rColor = t ? (t.color !== "rainbow" ? ROBOT_COLORS[t.color as RobotColor] : "#818CF8") : null;
  const targetHeader = t ? (
    <div
      className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
      style={{
        background: C.card,
        border: `1px solid ${C.cardBorder}`,
        fontFamily: FONT,
      }}
    >
      <RobotBadge color={rColor!} size={20} />
      <span style={{ color: C.muted, fontSize: 12 }}>を</span>
      {TargetIcon && <TargetIcon size={16} color={tColor!} strokeWidth={2} aria-label="目標" />}
      <span style={{ color: C.muted, fontSize: 12 }}>へ</span>
      {state.phase === "solving" && (
        <span className="ml-2 text-xs font-normal" style={{ color: C.muted }}>
          {movesUsed}/{movesAllowed} 手
        </span>
      )}
    </div>
  ) : null;

  const boardSection = (
    <div className="flex flex-col items-center justify-center w-full h-full gap-2 py-2">
      {/* 現在のターゲット */}
      {targetHeader}

      {/* ボードグリッド */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center">
        <HyperRobotGrid
          state={state}
          selectedRobot={selectedRobot}
          onSelectRobot={
            state.phase === "solving" && isMyTurn
              ? (color) => setSelectedRobot((prev) => prev === color ? null : color)
              : undefined
          }
          onMoveRobot={state.phase === "solving" && isMyTurn ? handleMoveRobot : undefined}
          displayRobots={popupRobots ?? undefined}
          isMobile={isMobile}
          targetIconMap={targetIconMap}
        />
      </div>

      {/* 残り目標チップ数 */}
      <div
        className="text-xs"
        style={{ color: C.muted, fontFamily: FONT }}
      >
        残り目標: {state.remainingTargets.length} / {state.allTargets.length}
      </div>
    </div>
  );

  const panelSection = (
    <>
      {state.phase === "configuring" && (
        <ConfiguringPanel
          state={state}
          isHost={playerId === room?.hostId}
          onStartGame={handleStartGame}
          getName={getName}
        />
      )}
      {state.phase === "bidding" && (
        <BiddingPanel
          state={state}
          playerId={playerId}
          timeLeft={timeLeft}
          getName={getName}
          onBid={handleBid}
          onConfirmBid={handleConfirmBid}
          onUnconfirmBid={handleUnconfirmBid}
          isRetry={state.isRetry}
        />
      )}
      {state.phase === "solving" && (
        <SolvingPanel
          state={state}
          onGiveUp={handleGiveUp}
          getName={getName}
          isMyTurn={isMyTurn}
          movesUsed={movesUsed}
          movesAllowed={movesAllowed}
        />
      )}
    </>
  );

  return (
    <div
      ref={(el) => {
        if (el) {
          const top = el.getBoundingClientRect().top;
          el.style.height = `calc(100dvh - ${top}px)`;
        }
      }}
      className="relative overflow-hidden"
      style={{
        background: [
          "radial-gradient(ellipse at 12% 18%, rgba(99,102,241,0.28) 0%, transparent 44%)",
          "radial-gradient(ellipse at 88% 10%, rgba(139,92,246,0.22) 0%, transparent 40%)",
          "radial-gradient(ellipse at 90% 76%, rgba(6,182,212,0.16) 0%, transparent 46%)",
          "radial-gradient(ellipse at 14% 84%, rgba(236,72,153,0.14) 0%, transparent 42%)",
          "radial-gradient(ellipse at 52% 52%, rgba(30,27,75,0.5) 0%, transparent 56%)",
          "#030712",
        ].join(", "),
        fontFamily: FONT,
      }}
    >
      <style>{`
        @keyframes hr-solve-popup {
          from { opacity: 0; transform: scale(0.7); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes hr-target-popup {
          0%   { opacity: 0; transform: scale(0.75) translateY(16px); }
          18%  { opacity: 1; transform: scale(1.04) translateY(-2px); }
          32%  { transform: scale(1); }
          78%  { opacity: 1; }
          100% { opacity: 0; transform: scale(0.92) translateY(-8px); }
        }
      `}</style>

      {isMobile ? (
        /* モバイルレイアウト: ボード上 + パネル下 */
        <div className="relative flex flex-col h-full">
          <div className="flex-1 min-h-0">{boardSection}</div>
          <div
            className="shrink-0 px-3 pb-3"
            style={{ maxHeight: "44vh", overflowY: "auto" }}
          >
            {panelSection}
          </div>
        </div>
      ) : (
        /* デスクトップレイアウト: ボード左 + パネル右 */
        <div className="relative flex h-full gap-4 px-4 py-4">
          <div className="flex-1 min-w-0">{boardSection}</div>
          <div
            className="shrink-0 flex flex-col gap-3 overflow-y-auto py-2"
            style={{ width: 280 }}
          >
            {panelSection}
          </div>
        </div>
      )}

      {/* 解決結果ポップアップ */}
      {solveResult && (
        <div
          className="fixed inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: Z.overlay - 1 }}
        >
          <div
            className="flex items-center gap-4 px-8 py-5 rounded-2xl"
            style={{
              background:
                solveResult.type === "success"
                  ? "rgba(22,163,74,0.92)"
                  : "rgba(220,38,38,0.88)",
              color: "white",
              fontFamily: FONT,
              boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
              animation: "hr-solve-popup 0.3s ease-out",
            }}
          >
            {solveResult.playerId && (
              <Avatar
                displayName={getName(solveResult.playerId)}
                photoURL={getPhotoURL(solveResult.playerId)}
                size={40}
              />
            )}
            <span className="text-3xl font-black">
              {solveResult.type === "success" ? "達成！" : "失敗..."}
            </span>
          </div>
        </div>
      )}

      {/* チップめくりオーバーレイ */}
      {state.phase === "revealing" && state.revealingTarget && (() => {
        const t = state.revealingTarget;
        const RevealIcon = targetIconMap.get(t.id) ?? null;
        const tColor = TARGET_COLORS[t.color];
        const winnerName = getName(state.revealingPlayer ?? "");
        const winnerPhotoURL = getPhotoURL(state.revealingPlayer ?? "");
        return (
          <div
            className="fixed inset-0 flex items-center justify-center backdrop-blur-sm"
            style={{ zIndex: Z.overlay - 1, background: "rgba(15,23,42,0.6)" }}
          >
            <div
              className="flex flex-col items-center gap-5 px-10 py-8 rounded-3xl"
              style={{
                background: C.card,
                border: `1px solid ${C.cardBorder}`,
                fontFamily: FONT,
                boxShadow: "0 12px 60px rgba(0,0,0,0.6)",
                animation: "hr-solve-popup 0.3s ease-out",
                minWidth: 260,
              }}
            >
              {RevealIcon && (() => {
                const isRainbow = t.color === "rainbow";
                return (
                  <div
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: "50%",
                      background: isRainbow
                        ? RAINBOW_COIN_BG
                        : `radial-gradient(circle at 36% 30%, ${tColor}ff, ${tColor}cc 40%, ${tColor}88 64%, ${tColor}44)`,
                      boxShadow: isRainbow
                        ? [
                            "0 8px 28px rgba(0,0,0,0.7)",
                            "inset 0 4px 10px rgba(255,255,255,0.42)",
                            "inset 0 -4px 8px rgba(0,0,0,0.26)",
                            "0 0 40px rgba(255,255,255,0.14)",
                          ].join(", ")
                        : [
                            `0 6px 24px rgba(0,0,0,0.68)`,
                            "0 2px 6px rgba(0,0,0,0.4)",
                            "inset 0 3px 8px rgba(255,255,255,0.28)",
                            "inset 0 -3px 7px rgba(0,0,0,0.48)",
                            `0 0 32px ${tColor}55`,
                          ].join(", "),
                      border: isRainbow
                        ? "3px solid rgba(255,255,255,0.6)"
                        : `3px solid ${tColor}cc`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 12,
                        borderRadius: "50%",
                        border: isRainbow
                          ? "1.5px solid rgba(255,255,255,0.32)"
                          : "1.5px solid rgba(255,255,255,0.18)",
                        pointerEvents: "none",
                      }}
                    />
                    <RevealIcon size={40} color="rgba(0,0,0,0.65)" strokeWidth={2} />
                    <div
                      style={{
                        position: "absolute",
                        top: "11%",
                        left: "15%",
                        width: "36%",
                        height: "24%",
                        borderRadius: "50%",
                        background: isRainbow
                          ? "rgba(255,255,255,0.5)"
                          : "rgba(255,255,255,0.38)",
                        transform: "rotate(-22deg)",
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                );
              })()}
              <div className="flex flex-col items-center gap-2">
                <Avatar displayName={winnerName} photoURL={winnerPhotoURL} size={40} />
                <span className="text-lg font-black" style={{ color: C.text }}>
                  {winnerName}
                </span>
                <span className="text-sm font-semibold" style={{ color: C.success }}>
                  チップを獲得！
                </span>
              </div>
              <button
                className="w-full py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all duration-150 active:scale-95"
                style={{ background: C.primary, color: "#fff" }}
                onClick={handleNextTarget}
              >
                次のターゲットへ
              </button>
            </div>
          </div>
        );
      })()}

      {/* 新ターゲットアナウンスモーダル */}
      {newTargetModal && (() => {
        const t = newTargetModal;
        const AnnounceIcon = targetIconMap.get(t.id) ?? null;
        const tColor = TARGET_COLORS[t.color];
        const rColor = t.color !== "rainbow" ? ROBOT_COLORS[t.color as RobotColor] : "#818CF8";
        return (
          <div
            className="fixed inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: Z.overlay - 2 }}
          >
            <div
              className="flex flex-col items-center gap-5 px-12 py-8 rounded-3xl"
              style={{
                background: C.card,
                border: `1px solid ${C.cardBorder}`,
                fontFamily: FONT,
                boxShadow: [
                  "0 16px 64px rgba(0,0,0,0.75)",
                  `0 0 48px rgba(99,102,241,0.22)`,
                ].join(", "),
                animation: `hr-target-popup ${2.8}s ease-in-out forwards`,
                minWidth: 260,
              }}
            >
              <span
                className="text-xs font-bold tracking-widest uppercase"
                style={{ color: C.muted, letterSpacing: "0.18em" }}
              >
                次のターゲット
              </span>
              <div className="flex items-center gap-4">
                <RobotBadge color={rColor} size={44} />
                <span style={{ color: C.muted, fontSize: 20, fontWeight: 300 }}>→</span>
                {AnnounceIcon && (
                  <TargetChip Icon={AnnounceIcon} color={tColor} size={80} />
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {resultOverlay}
    </div>
  );
}
