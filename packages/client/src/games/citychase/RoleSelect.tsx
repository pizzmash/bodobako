import type { CitychaseMove, CitychasePlayerView, RoomInfo } from "@bodobako/shared";

interface Props {
  state: CitychasePlayerView;
  playerId: string;
  room: RoomInfo;
  sendMove: (move: CitychaseMove) => void;
}

export function RoleSelect({ state, playerId, room, sendMove }: Props) {

  const isHost = playerId === room.hostId;

  if (!isHost) {
    return (
      <div className="text-center p-2 w-full">
        <div className="cc-glass-panel p-10 rounded-2xl max-w-[400px] mx-auto">
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem", fontFamily: "'Orbitron', monospace", fontWeight: 900, color: "#258cf4" }}>[WAIT]</div>
          <p className="text-base text-slate-400 font-semibold tracking-[0.02em] mb-6">ホストが犯人を選んでいます...</p>
          <div className="flex gap-2 justify-center flex-wrap">
            {state.playerIds.map((pid) => {
              const p = room.players.find((pl) => pl.id === pid);
              return (
                <span key={pid} className="cc-status-badge-primary text-[0.75rem] px-[0.7rem] py-[0.25rem] rounded-lg font-semibold">
                  {p?.name ?? pid}
                  {pid === playerId ? " (自分)" : ""}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center p-2 w-full">
      <div className="text-[0.95rem] text-slate-400 mb-6 font-semibold">
        <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem", fontFamily: "'Orbitron', monospace", fontWeight: 900, color: "#dc2626" }}>[SELECT]</div>
        <span className="cc-text-tactical" style={{ fontSize: "0.85rem", color: "#64c3ff" }}>
          犯人役のプレイヤーを選んでください
        </span>
      </div>
      <div className="flex flex-col gap-[0.6rem] items-center">
        {state.playerIds.map((pid) => {
          const player = room.players.find((p) => p.id === pid);
          return (
            <button
              key={pid}
              className="cc-role-btn cc-glass-panel flex items-center gap-3 px-[1.4rem] py-[0.85rem] text-base font-semibold border-2 border-[rgba(37,140,244,0.3)] rounded-xl text-white cursor-pointer min-w-[260px] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
              onClick={() => sendMove({ type: "assign-criminal", targetId: pid })}
            >
              <span className="text-base text-[#258cf4]">▶</span>
              <span className="flex-1 text-left tracking-[0.02em]">
                {player?.name ?? pid}
                {pid === playerId && (
                  <span className="cc-you-badge">YOU</span>
                )}
              </span>
              <span className="text-[#258cf4] text-[1.2rem]">→</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
