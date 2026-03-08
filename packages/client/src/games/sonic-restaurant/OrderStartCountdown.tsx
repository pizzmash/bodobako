/**
 * 音速飯店 - ゲーム開始カウントダウン
 */

import { useEffect, useState } from "react";
import { Z } from "../../styles/tokens";

interface OrderStartCountdownProps {
  /** カウントダウン完了時のコールバック */
  onComplete: () => void;
}

export function OrderStartCountdown({ onComplete }: OrderStartCountdownProps) {
  // 0: "3", 1: "2", 2: "1", 3: "注文〜！", 4: 完了
  const [step, setStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [orderPhase, setOrderPhase] = useState<"enter" | "settle" | "exit">("enter");

  useEffect(() => {
    // ステップ進行のタイミング
    const delays = [
      800,  // 3 → 2
      800,  // 2 → 1
      800,  // 1 → 注文〜！
      1200, // 注文〜！ → 完了
    ];

    if (step < 4) {
      // フェードイン開始
      setIsAnimating(true);

      // 「注文〜！」の場合は特別なアニメーション
      let orderSettleTimer: ReturnType<typeof setTimeout> | null = null;
      if (step === 3) {
        setOrderPhase("enter");
        // 入場アニメーション → 安定
        orderSettleTimer = setTimeout(() => setOrderPhase("settle"), 400);
      }

      const innerTimer = { current: null as ReturnType<typeof setTimeout> | null };

      const mainTimer = setTimeout(() => {
        if (step === 3) {
          // 「注文〜！」のあとは完了
          setOrderPhase("exit");
          setIsAnimating(false);
          innerTimer.current = setTimeout(() => {
            setStep(4);
            onComplete();
          }, 600);
        } else {
          // フェードアウト → 次のステップ
          setIsAnimating(false);
          innerTimer.current = setTimeout(() => setStep(step + 1), 300);
        }
      }, delays[step]);

      return () => {
        clearTimeout(mainTimer);
        if (orderSettleTimer !== null) clearTimeout(orderSettleTimer);
        if (innerTimer.current !== null) clearTimeout(innerTimer.current);
      };
    }
  }, [step, onComplete]);

  if (step >= 4) return null;

  // 表示テキスト
  const texts = ["3", "2", "1", "注文〜！"];
  const currentText = texts[step];
  const isOrderText = step === 3; // 「注文〜！」かどうか

  // 「注文〜！」のアニメーションスタイル
  const getOrderStyle = () => {
    if (orderPhase === "enter") {
      return {
        transform: "scale(0.3) rotate(-10deg)",
        opacity: 0,
      };
    } else if (orderPhase === "settle") {
      return {
        transform: "scale(1) rotate(0deg)",
        opacity: 1,
      };
    } else {
      return {
        transform: "scale(1.1) rotate(3deg)",
        opacity: 0,
      };
    }
  };

  return (
    <>
      {/* 背景オーバーレイ */}
      <div
        className="fixed inset-0 bg-black/40"
        style={{ zIndex: Z.srCountdownOverlay }}
      />

      {/* カウントダウン表示 */}
      <div
        className="fixed inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: Z.srCountdown }}
      >
        {isOrderText ? (
          /* 「注文〜！」は吹き出しで表示 */
          <div
            className="sr-jaggy-burst"
            style={{
              ...getOrderStyle(),
              transition: orderPhase === "settle"
                ? "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" // バウンス効果
                : "all 0.3s ease-out",
            }}
          >
            <h1 className="sr-impact-text">{currentText}</h1>
          </div>
        ) : (
          /* 3, 2, 1 は文字のみ */
          <h1
            className="sr-countdown-number"
            style={{
              transform: isAnimating ? "scale(1)" : "scale(0.8)",
              opacity: isAnimating ? 1 : 0,
              transition: "all 0.3s ease-out",
            }}
          >
            {currentText}
          </h1>
        )}
      </div>
    </>
  );
}
