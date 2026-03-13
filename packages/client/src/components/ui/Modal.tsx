import { type CSSProperties, type ReactNode } from "react";
import { Z } from "../../styles/tokens";

interface ModalProps {
  onClose?: () => void;
  children: ReactNode;
  /** z-index レベル（デフォルト: Z.modal）。ゲーム内モーダルは Z.gameModal を使う */
  zIndex?: number;
}

/**
 * 共通モーダルラッパー。fixed backdrop + blur オーバーレイ。
 * onClose を渡すと backdrop クリックで閉じられる。
 *
 * ゲーム画面では CSS var --sidebar-right-offset が設定されているため、
 * コンテンツがゲームエリア（サイドバーを除いた領域）の中央に配置される。
 * ゲーム外（ロビー・ルーム）では --sidebar-right-offset が 0px のため影響なし。
 */
export function Modal({ onClose, children, zIndex = Z.modal }: ModalProps) {
  const modalStyle = {
    "--modal-z": `${zIndex}`,
    paddingRight: "var(--sidebar-right-offset, 0px)",
  } as CSSProperties;

  return (
    <div
      className="fixed inset-0 z-[var(--modal-z)] flex items-center justify-center"
      style={modalStyle}
      onClick={onClose}
    >
      {/* backdrop: inset-0 でサイドバー含む全体をカバー */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

      {/* content */}
      <div
        className="relative"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
