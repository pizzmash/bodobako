import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Z } from '../../styles/tokens';

export function CoyotePanel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog ref={ref} className="cy-dialog" aria-labelledby="cy-panel-title" style={{ zIndex: Z.gameModal }} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="cy-dialog-content">
      <header className="flex items-center justify-between gap-4 mb-5"><h2 id="cy-panel-title" className="text-xl font-bold">{title}</h2><button className="cy-icon-button" onClick={onClose} aria-label="閉じる"><X size={20} /></button></header>
      {children}
    </div>
  </dialog>;
}
