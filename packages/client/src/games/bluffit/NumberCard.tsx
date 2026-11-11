import { CARD_COLORS } from "./constants";

export function NumberCard({ value }: { value: number }) {
  const numeral = value === 6 || value === 9 ? `${value}.` : value;
  return (
    <span className="bf-card" aria-hidden="true" style={{ backgroundColor: CARD_COLORS[value - 1] }}>
      <span className="bf-pattern">
        {Array.from({ length: 36 }, (_, i) => (
          <i key={i}>{value}</i>
        ))}
      </span>
      {["bf-corner-0", "bf-corner-1", "bf-corner-2", "bf-corner-3"].map((corner) => (
        <small className={`bf-corner ${corner}`} key={corner}>
          {numeral}
        </small>
      ))}
      <b>{numeral}</b>
    </span>
  );
}
