import { C, FONT } from "./constants";

export function RulesPanel() {
  return (
    <div>
      <div
        style={{
          padding: "12px 14px",
          background: "#f8f7f5",
          borderRadius: 12,
          border: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: C.text,
            fontFamily: FONT,
          }}
        >
          <span style={{ color: C.primary }}>ℹ</span> ルール概要
        </div>
        <ul
          style={{
            fontSize: 11,
            color: "#64748b",
            lineHeight: 1.7,
            paddingLeft: 0,
            listStyle: "none",
            margin: 0,
            fontFamily: FONT,
          }}
        >
          <li>• 同じ数字を3枚揃えると1セット</li>
          <li>• 3セット獲得で勝利！</li>
          <li>• 「7」のセットを揃えると即勝利</li>
          <li>• 2セットの和・差が7でも勝利</li>
        </ul>
      </div>
    </div>
  );
}
