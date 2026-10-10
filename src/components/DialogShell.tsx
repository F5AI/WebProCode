import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import '../dialogs.css';

type Props = { title: string; eyebrow?: string; onClose: () => void; children: ReactNode; wide?: boolean; className?: string };

export default function DialogShell({ title, eyebrow, onClose, children, wide, className = '' }: Props) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const element = panel.current;
    const focusable = () => Array.from(element?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || []).filter((item) => item.getClientRects().length > 0);
    (element?.querySelector<HTMLElement>('[data-dialog-focus]') || focusable()[0] || element)?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) { event.preventDefault(); element?.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !element?.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !element?.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  return createPortal(
    <div className="dialog-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panel} className={`df-dialog ${wide ? 'df-dialog-wide' : ''} ${className}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <header className="df-dialog-header">
          <div>{eyebrow && <div className="df-eyebrow">{eyebrow}</div>}<h2 id={titleId}>{title}</h2></div>
          <button className="df-icon-button" type="button" onClick={onClose} aria-label="Đóng cửa sổ"><X size={21} /></button>
        </header>
        {children}
      </div>
    </div>, document.body,
  );
}
