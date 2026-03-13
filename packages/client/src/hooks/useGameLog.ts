import { useCallback, useEffect, useRef, useState } from "react";
import { getGameDefinition } from "@bodobako/shared";
import type { GameId } from "@bodobako/shared";

export interface GameLogItem {
  id: number;
  playerId: string;
  playerName: string;
  message: string;
  tag?: string;
  tagColor?: string;
}

const getNewLogStorageKey = (roomCode: string) => `game-logs-${roomCode}`;
const getOldLogStorageKey = (roomCode: string) => `nana-logs-${roomCode}`;

function loadStoredLogs(roomCode: string): GameLogItem[] {
  try {
    const stored = localStorage.getItem(getNewLogStorageKey(roomCode));
    if (stored) return JSON.parse(stored) as GameLogItem[];
    // 旧キーからの移行
    const oldStored = localStorage.getItem(getOldLogStorageKey(roomCode));
    if (oldStored) {
      const parsed = JSON.parse(oldStored) as GameLogItem[];
      localStorage.setItem(getNewLogStorageKey(roomCode), JSON.stringify(parsed));
      localStorage.removeItem(getOldLogStorageKey(roomCode));
      return parsed;
    }
  } catch {
    // パースエラーは無視
  }
  return [];
}

export function useGameLog({
  gameId,
  gameState,
  players,
  roomCode,
}: {
  gameId: string | undefined;
  gameState: unknown;
  players: { id: string; name: string }[];
  roomCode: string | null;
}): GameLogItem[] {
  const [logItems, setLogItems] = useState<GameLogItem[]>(() => {
    if (!roomCode) return [];
    return loadStoredLogs(roomCode);
  });

  const logIdRef = useRef(
    logItems.length > 0 ? Math.max(...logItems.map((l) => l.id)) : 0
  );
  const prevStateRef = useRef<unknown>(null);
  const prevRoomCodeRef = useRef<string | null>(null);
  const playersRef = useRef(players);
  playersRef.current = players;

  const getName = useCallback(
    (pid: string) => playersRef.current.find((p) => p.id === pid)?.name ?? pid,
    []
  );

  // クロスルームリセット
  useEffect(() => {
    if (roomCode) {
      if (prevRoomCodeRef.current && prevRoomCodeRef.current !== roomCode) {
        try {
          localStorage.removeItem(getNewLogStorageKey(prevRoomCodeRef.current));
        } catch {
          // 無視
        }
        const fresh = loadStoredLogs(roomCode);
        setLogItems(fresh);
        logIdRef.current =
          fresh.length > 0 ? Math.max(...fresh.map((l) => l.id)) : 0;
        prevStateRef.current = null;
      }
      prevRoomCodeRef.current = roomCode;
    } else if (prevRoomCodeRef.current) {
      try {
        localStorage.removeItem(getNewLogStorageKey(prevRoomCodeRef.current));
      } catch {
        // 無視
      }
      prevRoomCodeRef.current = null;
      setLogItems([]);
      prevStateRef.current = null;
    }
  }, [roomCode]);

  // ログ蓄積
  useEffect(() => {
    if (!gameState || !gameId) return;
    const def = getGameDefinition(gameId as GameId);
    if (!def?.getLogEntries) return;
    const prev = prevStateRef.current;
    prevStateRef.current = gameState;
    if (!prev) return;
    const entries = def.getLogEntries(prev as never, gameState as never);
    if (entries.length === 0) return;
    const newItems: GameLogItem[] = entries.map((entry) => ({
      id: ++logIdRef.current,
      playerId: entry.playerId,
      playerName: getName(entry.playerId),
      message: entry.message,
      tag: entry.tag,
      tagColor: entry.tagColor,
    }));
    setLogItems((prev) => [...newItems, ...prev].slice(0, 50));
  }, [gameState, gameId, getName]);

  // localStorage 永続化
  useEffect(() => {
    if (!roomCode) return;
    try {
      localStorage.setItem(
        getNewLogStorageKey(roomCode),
        JSON.stringify(logItems)
      );
    } catch {
      // 無視
    }
  }, [logItems, roomCode]);

  return logItems;
}
