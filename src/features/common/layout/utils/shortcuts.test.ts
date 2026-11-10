import { describe, expect, it } from "vitest";

import { GO_WINDOW_MS, resolveShortcut } from "./shortcuts";

describe("resolveShortcut", () => {
  it("arms on G, then jumps on the letter", () => {
    expect(resolveShortcut("g", 0, 1000)).toEqual({ kind: "arm-go" });
    expect(resolveShortcut("c", 1000, 1200)).toEqual({
      kind: "go",
      href: "/campaigns",
    });
    expect(resolveShortcut("H", 1000, 1200)).toEqual({
      kind: "go",
      href: "/dashboard",
    });
    expect(resolveShortcut(",", 1000, 1200)).toEqual({
      kind: "go",
      href: "/settings",
    });
  });

  it("forgets G after the window, and ignores unknown letters after G", () => {
    expect(resolveShortcut("c", 1000, 1000 + GO_WINDOW_MS)).toEqual({
      kind: "none",
    });
    expect(resolveShortcut("x", 1000, 1100)).toEqual({ kind: "none" });
  });

  it("treats J/K after G as go-to keys, not row moves", () => {
    // No section is bound to J, so G J does nothing rather than moving a row.
    expect(resolveShortcut("j", 1000, 1100)).toEqual({ kind: "none" });
  });

  it("maps the single keys", () => {
    expect(resolveShortcut("?", 0, 1)).toEqual({ kind: "help" });
    expect(resolveShortcut("/", 0, 1)).toEqual({ kind: "palette" });
    expect(resolveShortcut("j", 0, 1)).toEqual({ kind: "row", step: 1 });
    expect(resolveShortcut("k", 0, 1)).toEqual({ kind: "row", step: -1 });
    expect(resolveShortcut("x", 0, 1)).toEqual({ kind: "none" });
  });
});
