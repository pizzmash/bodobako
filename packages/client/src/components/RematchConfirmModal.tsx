import type { Player } from "@bodobako/shared";
import { useAuth } from "../context/AuthContext";
import { Z } from "../styles/tokens";
import { useParticipantProfiles } from "./AppHeader/hooks/useParticipantProfiles";
import { PlayerCard } from "./GameSidebar/PlayerCard";

interface RematchConfirmModalProps {
  rematchRequests: string[];
  allPlayers: Player[];
  playerId: string | null;
  /** ゲームの最小プレイ人数（GameDefinition.minPlayers） */
  minPlayers: number;
  onConfirm: () => void;
  onClose: () => void;
}

export function RematchConfirmModal({
  rematchRequests,
  allPlayers,
  playerId,
  minPlayers,
  onConfirm,
  onClose,
}: RematchConfirmModalProps) {
  const { firebaseUser } = useAuth();
  const [profilesByUid] = useParticipantProfiles(allPlayers);
  const canStart = rematchRequests.length >= minPlayers;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      style={{ zIndex: Z.overlay + 10 }}
    >
      <div className="bg-white rounded-3xl p-6 w-[90%] max-w-[360px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-slide-down">
        <h3 className="text-base font-bold text-gray-800 mb-3">
          再戦希望者 ({rematchRequests.length}人)
        </h3>

        <div className="flex flex-col gap-2 mb-5 max-h-[220px] overflow-y-auto text-left">
          {rematchRequests.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">希望者を待っています...</p>
          ) : (
            rematchRequests.map((pid) => {
              const player = allPlayers.find((p) => p.id === pid);
              const colorIndex = allPlayers.findIndex((p) => p.id === pid);
              const uid = player?.userId;
              const profile = uid ? profilesByUid[uid] : null;
              const photoURL = pid === playerId
                ? (firebaseUser?.photoURL ?? profile?.photoURL ?? undefined)
                : (profile?.photoURL ?? undefined);
              return (
                <PlayerCard
                  key={pid}
                  playerId={pid}
                  playerName={player?.name ?? "不明"}
                  colorIndex={colorIndex >= 0 ? colorIndex : 0}
                  isMe={pid === playerId}
                  isCurrentPlayer={null}
                  photoURL={photoURL}
                  avatarDisplayName={profile?.displayName ?? player?.name ?? undefined}
                />
              );
            })
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={!canStart}
            className="flex-1 min-h-[44px] rounded-2xl border-0 text-sm font-bold text-white cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed bg-green-gradient shadow-action-green"
          >
            このメンバーで再戦
          </button>
          <button
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-2xl border-2 border-gray-200 bg-white text-sm font-bold text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
