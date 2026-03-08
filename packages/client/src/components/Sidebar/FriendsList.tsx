import { Avatar } from "../ui/Avatar";
import { Spinner } from "../ui/Spinner";

export interface Friend {
  uid: string;
  displayName: string;
  friendCode: string;
  photoURL: string;
}

export interface Follower extends Friend {
  isFollowing: boolean;
}

interface Props {
  loading: boolean;
  items: (Friend | Follower)[];
  emptyTitle: string;
  emptySubTitle: string;
  renderActions: (f: Friend & { isFollowing?: boolean }) => React.ReactNode;
}

export function FriendsList({ loading, items, emptyTitle, emptySubTitle, renderActions }: Props) {
  if (loading) {
    return (
      <div className="flex items-center py-5 gap-2.5 text-indigo-400">
        <Spinner size={18} />
        <span className="text-[0.85rem] font-medium">読み込み中...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center pt-5 pb-2">
        <svg
          width="38"
          height="38"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="opacity-35 mb-2"
        >
          <circle cx="9" cy="8" r="3.5" stroke="#818CF8" strokeWidth="1.5" />
          <path
            d="M2 20c0-3.5 3.13-6 7-6"
            stroke="#818CF8"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line x1="17" y1="11" x2="17" y2="17" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="14" y1="14" x2="20" y2="14" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p className="text-[0.85rem] text-indigo-500 font-semibold m-0 text-center">{emptyTitle}</p>
        <p className="text-[0.78rem] text-indigo-300 mt-1 mb-0 text-center leading-[1.5]">
          {emptySubTitle}
        </p>
      </div>
    );
  }

  return (
    <ul className="list-none m-0 p-0 flex flex-col gap-2" aria-label="フレンド一覧">
      {items.map((f) => (
        <li
          key={f.uid}
          className="flex items-center gap-2.5 rounded-xl border border-indigo-100/30 bg-indigo-50/50 p-2.5 transition duration-150 hover:bg-indigo-50/80"
        >
          <Avatar photoURL={f.photoURL} displayName={f.displayName} size={36} />
          <div className="flex-1 min-w-0">
            <span className="block text-[0.88rem] font-semibold text-indigo-900 truncate">
              {f.displayName}
            </span>
            <span className="block font-mono text-[0.72rem] text-indigo-300 tracking-[0.08em] mt-0.5">
              {f.friendCode.slice(0, 4)}-{f.friendCode.slice(4)}
            </span>
          </div>
          {renderActions(f as Friend & { isFollowing?: boolean })}
        </li>
      ))}
    </ul>
  );
}
