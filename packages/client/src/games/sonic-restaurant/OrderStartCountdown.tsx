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

      const timer = setTimeout(() => {
        if (step === 3) {
          // 「注文〜！」のあとは完了
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
        {/* 吹き出し */}
        <div
          className="jaggy-burst"
          style={{
            transform: isAnimating ? "scale(1)" : "scale(0.8)",
            opacity: isAnimating ? 1 : 0,
            transition: "all 0.3s ease-out",
          }}
        >
          {/* インパクトテキスト */}
          <h1 className="impact-text">{currentText}</h1>
        </div>
      </div>

      {/* スタイル定義 */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@900&display=swap');

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
            drop-shadow(0 15px 25px rgba(0,0,0,0.6));
          padding: 4rem 5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 550px;
          min-height: 300px;
          position: relative;
        }
      `}</style>
    </>
  );
}
