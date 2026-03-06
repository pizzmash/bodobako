import { useEffect, useState } from "react";

/**
 * MediaQueryList ベースのブレークポイントフック。
 * `minWidth` (px) 以上の場合に true を返す。
 *
 * @example
 * const isWide = useBreakpoint(760); // ≥760px で true
 */
export function useBreakpoint(minWidth: number): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= minWidth,
  );

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${minWidth}px)`);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [minWidth]);

  return matches;
}
