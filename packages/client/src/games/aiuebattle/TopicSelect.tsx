import type { AiueBattleState, AiueBattleMove, RoomInfo } from "@bodobako/shared";
import { TOPIC_LIST } from "@bodobako/shared";
import { styles } from "./constants";

interface TopicSelectProps {
  state: AiueBattleState;
  playerId: string;
  room: RoomInfo;
  sendTypedMove: (move: AiueBattleMove) => void;
  customTopic: string;
  setCustomTopic: (value: string) => void;
}

export function TopicSelect({
  state,
  playerId,
  room,
  sendTypedMove,
  customTopic,
  setCustomTopic,
}: TopicSelectProps) {
  const isSelector = playerId === state.topicSelectorId;
  const selectorName = room.players.find(
    (p) => p.id === state.topicSelectorId
  )?.name;

  if (isSelector) {
    return (
      <div style={{ animation: "ab-fadeIn .4s ease-out" }}>
        <p style={styles.subtitle}>お題を選んでください</p>
        <div style={styles.topicGrid}>
          {TOPIC_LIST.map((topic, i) => (
            <button
              key={topic}
              className="ab-topic-btn"
              style={{
                ...styles.topicButton,
                animationDelay: `${i * 30}ms`,
              }}
              onClick={() => sendTypedMove({ type: "select-topic", topic })}
            >
              {topic}
            </button>
          ))}
        </div>
        <div style={styles.customTopicRow}>
          <input
            className="ab-input"
            style={styles.input}
            placeholder="自由入力..."
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
          />
          <button
            className="ab-action-btn"
            style={{
              ...styles.submitButton,
              opacity: customTopic.trim() ? 1 : 0.5,
            }}
            disabled={!customTopic.trim()}
            onClick={() =>
              sendTypedMove({ type: "select-topic", topic: customTopic })
            }
          >
            決定
          </button>
        </div>
      </div>
    );
  }

  return (
    <p style={styles.waiting}>
      <span style={{ animation: "ab-pulse 1.5s ease-in-out infinite" }}>
        {selectorName} がお題を選んでいます...
      </span>
    </p>
  );
}
