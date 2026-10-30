import { describe, expect, it } from "vitest";

import { resolveWorkspaceFromHost } from "./middleware";

const DOMAIN = "onchainsuite.com";

describe("resolveWorkspaceFromHost", () => {
  it("returns the workspace slug for a workspace subdomain", () => {
    expect(resolveWorkspaceFromHost("acme.onchainsuite.com", DOMAIN)).toBe(
      "acme"
    );
    expect(resolveWorkspaceFromHost("acme.onchainsuite.com:443", DOMAIN)).toBe(
      "acme"
    );
    expect(resolveWorkspaceFromHost("ACME.ONCHAINSUITE.COM", DOMAIN)).toBe(
      "acme"
    );
  });

  it("is null for the apex and reserved subdomains", () => {
    expect(resolveWorkspaceFromHost("onchainsuite.com", DOMAIN)).toBeNull();
    expect(resolveWorkspaceFromHost("www.onchainsuite.com", DOMAIN)).toBeNull();
    expect(resolveWorkspaceFromHost("app.onchainsuite.com", DOMAIN)).toBeNull();
    expect(resolveWorkspaceFromHost("api.onchainsuite.com", DOMAIN)).toBeNull();
  });

  it("is null for multi-label subdomains and other domains", () => {
    expect(resolveWorkspaceFromHost("a.b.onchainsuite.com", DOMAIN)).toBeNull();
    expect(resolveWorkspaceFromHost("acme.example.com", DOMAIN)).toBeNull();
    expect(resolveWorkspaceFromHost("localhost:3000", DOMAIN)).toBeNull();
  });

  it("is inert (null) when no publishing domain is configured", () => {
    expect(
      resolveWorkspaceFromHost("acme.onchainsuite.com", undefined)
    ).toBeNull();
    expect(resolveWorkspaceFromHost("acme.onchainsuite.com", "")).toBeNull();
  });
});
