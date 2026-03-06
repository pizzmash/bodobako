import { useEffect, useRef, useState } from "react";

/**
 * ResizeObserver を使ってコンテナ幅に対するボードのスケールを計算する。
 * @param boardPx - ボードの元サイズ（px）
 * @returns [ref, scale] — ref をコンテナ要素に渡す
 */
export function useBoardScale(boardPx: number): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setScale(Math.min(1, el.clientWidth / boardPx));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [boardPx]);

  return [ref, scale];
}
