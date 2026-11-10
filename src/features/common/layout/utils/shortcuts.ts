import { GO_TO } from "@/shared/components/command-palette";

/** How long after G the next key still counts as "go to". */
export const GO_WINDOW_MS = 1200;

export type ShortcutAction =
  | { kind: "go"; href: string }
  | { kind: "arm-go" }
  | { kind: "palette" }
  | { kind: "help" }
  | { kind: "row"; step: 1 | -1 }
  | { kind: "none" };

/**
 * What a key press means, given when G was last pressed (0 = not armed).
 * Pure, so the whole keymap is testable without a DOM. The caller has already
 * skipped presses with a modifier, inside a field, or under an open dialog.
 */
export function resolveShortcut(
  key: string,
  goArmedAt: number,
  now: number
): ShortcutAction {
  const k = key.toLowerCase();
  if (goArmedAt > 0 && now - goArmedAt < GO_WINDOW_MS) {
    const hit = GO_TO.find((g) => g.key === k);
    return hit ? { kind: "go", href: hit.href } : { kind: "none" };
  }
  if (k === "g") return { kind: "arm-go" };
  if (key === "?") return { kind: "help" };
  if (key === "/") return { kind: "palette" };
  if (k === "j") return { kind: "row", step: 1 };
  if (k === "k") return { kind: "row", step: -1 };
  return { kind: "none" };
}
