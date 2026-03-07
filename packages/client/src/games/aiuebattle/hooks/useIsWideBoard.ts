import { useEffect, useState } from "react";

const WIDE_BREAKPOINT = 600;

export function useIsWideBoard(): boolean {
  const [isWide, setIsWide] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= WIDE_BREAKPOINT
  );
  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${WIDE_BREAKPOINT}px)`);
    const handler = (e: MediaQueryListEvent) => setIsWide(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return isWide;
}
