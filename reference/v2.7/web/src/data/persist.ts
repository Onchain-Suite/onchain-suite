import { useEffect, useState } from 'react';

/* Local persistence for demo/session state. Everything the user creates — lists, forms,
   automations, segments, settings — survives a reload. A real backend replaces this with
   API reads/writes; the hook signature is deliberately useState-compatible so swapping is
   a one-line change per call site. */
const NS = 'os:';

export function loadPersisted<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function savePersisted<T>(key: string, value: T): void {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    /* quota or private mode — degrade to in-memory */
  }
}

/** Drop-in replacement for useState that mirrors the value into localStorage. */
export function usePersistedState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => loadPersisted(key, initial));
  useEffect(() => { savePersisted(key, value); }, [key, value]);
  return [value, setValue] as const;
}


/** Clears every persisted key — used by "Reset demo data" in Settings. */
export function clearPersisted(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(NS) || k.startsWith('os-'))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/** Downloads rows as a CSV file — shared by every Export control. */
export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Copies text and resolves true on success — shared by every Copy control. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
