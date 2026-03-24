import { Avatar } from "../../components/ui/Avatar";

interface MeepleBubbleProps {
  name: string;
  photoURL?: string;
  color: string;
}

/** 駒の下に表示するプレイヤーアイコンの吹き出し */
export function MeepleBubble({ name, photoURL, color }: MeepleBubbleProps) {
  return (
    <div className="relative flex flex-col items-center">
      {/* 三角（上向き） */}
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderBottom: `5px solid ${color}`,
        }}
      />
      {/* アバターアイコン */}
      <div
        className="rounded-full"
        style={{
          boxShadow: `0 0 0 2px ${color}, 0 1px 4px rgba(0,0,0,0.3)`,
        }}
      >
        <Avatar photoURL={photoURL} displayName={name} size={26} />
      </div>
    </div>
  );
}
