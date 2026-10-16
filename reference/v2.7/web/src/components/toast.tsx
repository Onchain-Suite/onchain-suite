import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons';
import type { IconName } from './icons';

/* Module-level toast so any screen can confirm an action without threading a provider
   through the tree. <Toaster /> is mounted once in the shell. */
type Toast = { id: number; msg: string; icon: IconName };
let nextId = 1;
const listeners = new Set<(t: Toast[]) => void>();
let queue: Toast[] = [];

function emit() { listeners.forEach((l) => l(queue)); }

export function toast(msg: string, icon: IconName = 'check-circle-2') {
  const t = { id: nextId++, msg, icon };
  queue = [...queue, t];
  emit();
  setTimeout(() => { queue = queue.filter((x) => x.id !== t.id); emit(); }, 3000);
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>(queue);
  useEffect(() => {
    listeners.add(setItems);
    return () => { listeners.delete(setItems); };
  }, []);
  if (!items.length) return null;
  return createPortal(
    <div className="toaster" role="status" aria-live="polite">
      {items.map((t) => (
        <div className="toaster__item" key={t.id}>
          <Icon name={t.icon} size={18} color="var(--green-500)" />{t.msg}
        </div>
      ))}
    </div>,
    document.body,
  );
}
