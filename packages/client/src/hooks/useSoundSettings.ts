import { useState } from "react";

const STORAGE_KEY = "bodobako_muted";

export function useSoundSettings() {
  const [muted, setMuted] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  const toggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  return { muted, toggleMute };
}
