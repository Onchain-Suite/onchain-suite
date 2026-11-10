"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { CommandPaletteDialog } from "./command-palette-dialog";
import type { PaletteRow } from "./palette-model";
import { rememberRecent } from "./recent";
import { ShortcutHelp } from "./shortcut-help";

export interface CommandPaletteApi {
  open: (prefill?: string) => void;
  close: () => void;
  toggle: () => void;
  openShortcuts: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteApi | null>(null);

export function useCommandPalette(): CommandPaletteApi {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error("CommandPaletteProvider missing");
  return ctx;
}

const isEditable = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== "string") return false;
  return (
    el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)
  );
};

/**
 * Owns the palette and the shortcuts list for the whole app, mounted once in
 * RootProviders so it survives navigation. ⌘K (Ctrl K) toggles it anywhere
 * except inside another text field or editor, where the key may mean
 * something else (an editor's "insert link").
 */
export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState("");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const openRef = useRef(false);
  openRef.current = open;

  const api = useMemo<CommandPaletteApi>(
    () => ({
      open: (text) => {
        setPrefill(typeof text === "string" ? text : "");
        setShortcutsOpen(false);
        setOpen(true);
      },
      close: () => setOpen(false),
      toggle: () => {
        setPrefill("");
        setOpen((v) => !v);
      },
      openShortcuts: () => {
        setOpen(false);
        setShortcutsOpen(true);
      },
    }),
    []
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      if (e.key.toLowerCase() !== "k" && e.code !== "KeyK") return;
      const ownInput =
        e.target instanceof HTMLElement &&
        e.target.hasAttribute("data-palette-input");
      if (!ownInput && isEditable(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      if (openRef.current) setOpen(false);
      else api.open();
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [api]);

  const onSelect = useCallback(
    (row: PaletteRow) => {
      if (row.record) rememberRecent(row);
      setOpen(false);
      router.push(row.href);
    },
    [router]
  );

  return (
    <CommandPaletteContext.Provider value={api}>
      {children}
      <CommandPaletteDialog
        open={open}
        onOpenChange={setOpen}
        initialQuery={prefill}
        onSelect={onSelect}
      />
      <ShortcutHelp open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </CommandPaletteContext.Provider>
  );
}
