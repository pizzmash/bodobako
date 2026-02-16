/**
 * 音速飯店 - ゲーム開始カウントダウン
 */

import { useEffect, useState } from "react";

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
      if (step === 3) {
        setOrderPhase("enter");
        // 入場アニメーション → 安定
        setTimeout(() => setOrderPhase("settle"), 400);
      }

      const timer = setTimeout(() => {
        if (step === 3) {
          // 「注文〜！」のあとは完了
          setOrderPhase("exit");
          setIsAnimating(false);
          setTimeout(() => {
            setStep(4);
            onComplete();
          }, 600);
        } else {
          // フェードアウト → 次のステップ
          setIsAnimating(false);
          setTimeout(() => setStep(step + 1), 300);
        }
      }, delays[step]);

      return () => clearTimeout(timer);
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
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          zIndex: 9998,
        }}
      />

      {/* カウントダウン表示 */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        {isOrderText ? (
          /* 「注文〜！」は吹き出しで表示 */
          <div
            className="jaggy-burst"
            style={{
              ...getOrderStyle(),
              transition: orderPhase === "settle" 
                ? "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" // バウンス効果
                : "all 0.3s ease-out",
            }}
          >
            <h1 className="impact-text">{currentText}</h1>
          </div>
        ) : (
          /* 3, 2, 1 は文字のみ */
          <h1
            className="countdown-number"
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

      {/* スタイル定義 */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@900&display=swap');

        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
          50% { opacity: 1; transform: scale(1) rotate(180deg); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-2px) rotate(-1deg); }
          75% { transform: translateX(2px) rotate(1deg); }
        }

        .countdown-number {
          font-family: 'M PLUS Rounded 1c', sans-serif;
          font-size: 10rem;
          font-weight: 900;
          color: #ffffff;
          text-shadow: 
            0 0 20px rgba(255, 255, 255, 0.8),
            0 0 40px rgba(255, 255, 255, 0.6),
            0 4px 8px rgba(0, 0, 0, 0.8);
          margin: 0;
          padding: 0;
        }

        .impact-text {
          font-family: 'M PLUS Rounded 1c', sans-serif;
          background: linear-gradient(to bottom, #ff5f6d, #b91c1c, #7f1d1d);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 4px 0 #450a0a) drop-shadow(0 8px 15px rgba(0,0,0,0.6));
          letter-spacing: 0.05em;
          position: relative;
          font-size: 6rem;
          font-weight: 900;
          white-space: nowrap;
          z-index: 20;
          margin: 0;
          padding: 0;
        }

        .jaggy-burst {
          background: #fdd835;
          clip-path: polygon(
            50% 0%, 63% 18%, 78% 7%, 81% 25%, 98% 18%, 91% 38%, 100% 50%, 
            91% 62%, 98% 82%, 81% 75%, 78% 93%, 63% 82%, 50% 100%, 37% 82%, 
            22% 93%, 19% 75%, 2% 82%, 9% 62%, 0% 50%, 9% 38%, 2% 18%, 
            19% 25%, 22% 7%, 37% 18%
          );
          filter: 
            drop-shadow(4px 0 0 #b91c1c) 
            drop-shadow(-4px 0 0 #b91c1c) 
            drop-shadow(0 4px 0 #b91c1c) 
            drop-shadow(0 -4px 0 #b91c1c)
            drop-shadow(0 15px 25px rgba(0,0,0,0.6))
            drop-shadow(0 0 30px rgba(255, 215, 0, 0.6));
          padding: 4rem 5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 550px;
          min-height: 300px;
          position: relative;
        }

        .jaggy-burst::before {
          content: '';
          position: absolute;
          top: 10%;
          right: 15%;
          width: 40px;
          height: 40px;
          background: linear-gradient(45deg, #fff 0%, #ffeb3b 100%);
          clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
          animation: sparkle 0.8s ease-in-out;
          pointer-events: none;
        }

        .jaggy-burst::after {
          content: '';
          position: absolute;
          bottom: 15%;
          left: 20%;
          width: 30px;
          height: 30px;
          background: linear-gradient(45deg, #fff 0%, #ffeb3b 100%);
          clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
          animation: sparkle 0.8s ease-in-out 0.15s;
          pointer-events: none;
        }
      `}</style>
    </>
  );
}
