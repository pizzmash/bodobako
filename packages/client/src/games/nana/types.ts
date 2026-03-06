export interface LogEntry {
  id: number;
  playerId: string;
  player: string;
  msg: string;
  tag?: string;
  tagColor?: string;
}

export interface CardView {
  id: number;
  number: number | null;
}
