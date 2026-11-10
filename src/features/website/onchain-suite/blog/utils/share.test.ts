import { describe, expect, it } from "vitest";

import {
  cleanHandle,
  farcasterProfileUrl,
  initials,
  shareOnLinkedInUrl,
  shareOnXUrl,
  xProfileUrl,
} from "./share";

describe("share links", () => {
  const url = "https://onchainsuite.com/blog/win-back?x=1&y=2";

  it("encodes the post url and title", () => {
    const x = new URL(shareOnXUrl(url, "Win back & retain"));
    expect(x.origin + x.pathname).toBe("https://x.com/intent/post");
    expect(x.searchParams.get("url")).toBe(url);
    expect(x.searchParams.get("text")).toBe("Win back & retain");

    const li = new URL(shareOnLinkedInUrl(url));
    expect(li.searchParams.get("url")).toBe(url);
  });
});

describe("author handles", () => {
  it("strips @ and pasted profile URLs", () => {
    expect(cleanHandle("@ada")).toBe("ada");
    expect(cleanHandle("https://x.com/ada?s=21")).toBe("ada");
    expect(cleanHandle("https://warpcast.com/@ada")).toBe("ada");
    expect(cleanHandle("   ")).toBeNull();
    expect(cleanHandle(null)).toBeNull();
  });

  it("builds profile links only when a handle exists", () => {
    expect(xProfileUrl("ada")).toBe("https://x.com/ada");
    expect(farcasterProfileUrl("@ada")).toBe("https://farcaster.xyz/ada");
    expect(xProfileUrl("")).toBeNull();
  });

  it("derives initials", () => {
    expect(initials("Ada Byron Lovelace")).toBe("AL");
    expect(initials("ada")).toBe("A");
    expect(initials("")).toBe("?");
  });
});
