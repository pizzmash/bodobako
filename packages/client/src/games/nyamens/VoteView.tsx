import type { NyaMensPlayerView } from "@bodobako/shared";
import { Avatar } from "../../components/ui/Avatar";
import { NYAMENS_ACCENT as ACCENT } from "../../styles/tokens";
import { DANGER } from "./nyaUtils";

interface VoteViewProps {
  state: NyaMensPlayerView;
  myId: string;
  playerNames: Record<string, string>;
  photoURLs?: Record<string, string>;
  onVote?: (target: string | "none") => void;
}

export function VoteView({ state, myId, playerNames, photoURLs = {}, onVote }: VoteViewProps) {
  const { playerOrder, votes } = state;
  const myVote = votes?.[myId];
  const votedCount = Object.keys(votes ?? {}).length;

  return (
    <div
      style={{
        background: "rgba(220, 38, 38, 0.08)",
        border: "2px solid rgba(220, 38, 38, 0.3)",
        borderRadius: 16,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fca5a5", marginBottom: 4 }}>
          ⚠️ 修理失敗！
        </div>
        <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
          アサシンは誰ですか？投票してください。
        </div>
        <div style={{ color: "#94a3b8", fontSize: "0.75rem", marginTop: 4 }}>
          {votedCount} / {playerOrder.length} 人 投票済み
        </div>
      </div>

      {/* プレイヤー一覧 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: 10,
        }}
      >
        {playerOrder.map((pid: string) => {
          const isMe = pid === myId;
          const isSelected = myVote === pid;
          const hasVoted = myVote !== undefined;
          const name = playerNames[pid] ?? pid.slice(0, 12);
          const photoURL = photoURLs[pid];

          return (
            <button
              key={pid}
              disabled={hasVoted}
              onClick={() => !hasVoted && onVote?.(pid)}
              style={{
                padding: "12px 8px",
                borderRadius: 12,
                border: isSelected ? `2px solid ${DANGER}` : "2px solid rgba(255,255,255,0.08)",
                background: isSelected ? `${DANGER}20` : "rgba(255,255,255,0.05)",
                color: isSelected ? "#dc2626" : "#1e293b",
                fontWeight: isSelected ? 700 : 500,
                fontSize: "0.82rem",
                cursor: hasVoted ? "default" : "pointer",
                transition: "all 0.15s",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                boxShadow: isSelected ? `0 0 10px ${DANGER}50` : "none",
              }}
            >
              {/* アバター */}
              <Avatar photoURL={photoURL} displayName={name} size={36} />
              <span
                style={{
                  maxWidth: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "block",
                }}
              >
                {name}
              </span>
              {isMe && (
                <span style={{ color: ACCENT, fontSize: "0.65rem" }}>（自分）</span>
              )}
              {votes?.[pid] !== undefined && (
                <span style={{ color: "#94a3b8", fontSize: "0.65rem" }}>✓ 投票済</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 無投票ボタン */}
      <button
        disabled={myVote !== undefined}
        onClick={() => myVote === undefined && onVote?.("none")}
        style={{
          padding: "10px 20px",
          borderRadius: 10,
          border: myVote === "none" ? `2px solid ${ACCENT}` : "2px solid rgba(255,255,255,0.1)",
          background: myVote === "none" ? `${ACCENT}20` : "rgba(255,255,255,0.05)",
          color: myVote === "none" ? ACCENT : "#64748b",
          fontWeight: 600,
          fontSize: "0.85rem",
          cursor: myVote !== undefined ? "default" : "pointer",
          transition: "all 0.15s",
          alignSelf: "center",
        }}
      >
        🤷 無投票（アサシンはいないと思う）
      </button>

      {myVote !== undefined && (
        <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.8rem" }}>
          投票済み。他のプレイヤーを待っています...
        </div>
      )}
    </div>
  );
}
