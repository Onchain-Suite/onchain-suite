import { afterEach, describe, expect, it, vi } from "vitest";

/* The prefix is read once at module load, so each case re-imports. */
const load = async (prefix?: string) => {
  vi.resetModules();
  if (prefix === undefined) vi.stubEnv("NEXT_PUBLIC_AUTH_COOKIE_PREFIX", "");
  else vi.stubEnv("NEXT_PUBLIC_AUTH_COOKIE_PREFIX", prefix);
  return import("./auth-cookie");
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("auth cookie (production default)", () => {
  it("keeps Better Auth's default name, so prod sessions are untouched", async () => {
    const c = await load();
    expect(c.AUTH_COOKIE_PREFIX).toBe("better-auth");
    expect(c.SESSION_COOKIE_NAME).toBe("better-auth.session_token");
    expect(
      c.readSessionCookie("a=1; __Secure-better-auth.session_token=tok%3D1")
    ).toBe("tok=1");
    expect(c.hasSessionCookie("better-auth.sessionToken=x")).toBe(true);
  });
});

describe("auth cookie (staging prefix)", () => {
  it("reads only its own environment's session", async () => {
    const c = await load("ocs-staging");
    const both =
      "__Secure-better-auth.session_token=prod; __Secure-ocs-staging.session_token=stg";
    expect(c.readSessionCookie(both)).toBe("stg");
    expect(c.hasSessionCookie("__Secure-better-auth.session_token=prod")).toBe(
      false
    );
    expect(c.isAuthCookieName("__Secure-ocs-staging.session_data")).toBe(true);
    expect(c.isAuthCookieName("better-auth.session_data")).toBe(false);
    expect(c.SESSION_COOKIE_NAME).toBe("ocs-staging.session_token");
  });

  it("falls back to the default for an unsafe value", async () => {
    const c = await load("bad prefix;");
    expect(c.AUTH_COOKIE_PREFIX).toBe("better-auth");
  });
});
