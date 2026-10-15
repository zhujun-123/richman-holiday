import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function Dialog({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose?: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} className={`dialog ${wide ? 'dialog-wide' : ''}`} aria-labelledby="dialog-title" onCancel={e => { e.preventDefault(); onClose?.(); }} onClick={e => { if (e.target === ref.current) onClose?.(); }}>
    <div className="dialog-content">
      <div className="dialog-heading"><h2 id="dialog-title">{title}</h2>{onClose ? <button className="icon-button" aria-label="关闭面板" onClick={onClose}><Icon name="close" /></button> : null}</div>
      {children}
    </div>
  </dialog>;
}
