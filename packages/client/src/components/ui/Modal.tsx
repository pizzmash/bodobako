import { type CSSProperties, type ReactNode } from "react";
import { Z } from "../../styles/tokens";

interface ModalProps {
  onClose?: () => void;
  children: ReactNode;
  /** z-index レベル（デフォルト: Z.modal） */
  zIndex?: number;
}

/**
 * 共通モーダルラッパー。fixed backdrop + blur オーバーレイ。
 * onClose を渡すと backdrop クリックで閉じられる。
 */
export function Modal({ onClose, children, zIndex = Z.modal }: ModalProps) {
  const modalStyle = {
    "--modal-z": `${zIndex}`,
  } as CSSProperties;

  return (
    <div
      className="fixed inset-0 z-[var(--modal-z)] flex items-center justify-center"
      style={modalStyle}
      onClick={onClose}
    >
      {/* backdrop */}
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
