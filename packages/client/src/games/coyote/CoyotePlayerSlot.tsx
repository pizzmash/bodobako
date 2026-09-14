import { Heart } from 'lucide-react';
import type { PlayerSlotProps } from '../../components/GameSidebar/PlayerCard';
import { useRoom } from '../../context/RoomContext';
export function CoyotePlayerSlot({ playerId }: PlayerSlotProps) {
  const { gameState } = useRoom();
  if (gameState?.gameId !== 'coyote') return null;
  const life = gameState.state.lives[playerId] ?? 0;
  return <div className="flex items-center gap-1 text-xs text-slate-600"><Heart size={13} />ライフ {life} / 3{life === 0 && <span className="ml-2">観戦中</span>}</div>;
}
