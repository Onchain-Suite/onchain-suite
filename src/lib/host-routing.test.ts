import { describe, expect, it } from "vitest";

import { resolveHostRouting } from "./host-routing";

const APP = "app.onchainsuite.com";
const STAGING = "staging.onchainsuite.com";
const APEX = "onchainsuite.com";
const WWW = "www.onchainsuite.com";

describe("resolveHostRouting", () => {
  it("is a no-op when disabled, whatever the host/path", () => {
    expect(
      resolveHostRouting(APEX, "/dashboard", "", { enabled: false })
    ).toEqual({ kind: "next" });
    expect(resolveHostRouting(APP, "/pricing", "", { enabled: false })).toEqual(
      { kind: "next" }
    );
  });

  describe("marketing host", () => {
    it("redirects an app path to the app origin (permanent), keeping the query", () => {
      expect(resolveHostRouting(APEX, "/campaigns", "?tab=sent")).toEqual({
        kind: "redirect",
        location: "https://app.onchainsuite.com/campaigns?tab=sent",
        permanent: true,
      });
    });

    it("redirects auth and onboarding to the app origin", () => {
      expect(resolveHostRouting(WWW, "/auth/signin", "").kind).toBe("redirect");
      expect(resolveHostRouting(WWW, "/onboarding", "").kind).toBe("redirect");
    });

    it("serves marketing paths untouched", () => {
      expect(resolveHostRouting(APEX, "/", "")).toEqual({ kind: "next" });
      expect(resolveHostRouting(APEX, "/pricing", "")).toEqual({
        kind: "next",
      });
      expect(resolveHostRouting(APEX, "/for", "")).toEqual({ kind: "next" });
    });
  });

  describe("app host", () => {
    it("sends the root to the dashboard (temporary, same host)", () => {
      expect(resolveHostRouting(APP, "/", "")).toEqual({
        kind: "redirect",
        location: "/dashboard",
        permanent: false,
      });
    });

    it("serves app paths untouched", () => {
      expect(resolveHostRouting(APP, "/dashboard", "")).toEqual({
        kind: "next",
      });
      expect(resolveHostRouting(APP, "/settings/company", "")).toEqual({
        kind: "next",
      });
      expect(resolveHostRouting(APP, "/admin", "")).toEqual({ kind: "next" });
    });

    it("redirects a marketing path back to the apex (permanent)", () => {
      expect(resolveHostRouting(APP, "/pricing", "")).toEqual({
        kind: "redirect",
        location: "https://onchainsuite.com/pricing",
        permanent: true,
      });
    });

    it("applies the same rules on staging", () => {
      expect(resolveHostRouting(STAGING, "/", "")).toEqual({
        kind: "redirect",
        location: "/dashboard",
        permanent: false,
      });
      expect(resolveHostRouting(STAGING, "/campaigns", "")).toEqual({
        kind: "next",
      });
    });
  });

  describe("public and shared surfaces", () => {
    it("never redirects public paths, on any host", () => {
      for (const host of [APEX, APP, STAGING, WWW]) {
        expect(resolveHostRouting(host, "/api/v1/auth/session", "")).toEqual({
          kind: "next",
        });
        expect(resolveHostRouting(host, "/f/abc123", "")).toEqual({
          kind: "next",
        });
        expect(resolveHostRouting(host, "/d/token", "")).toEqual({
          kind: "next",
        });
        expect(resolveHostRouting(host, "/cms-api/graphql", "")).toEqual({
          kind: "next",
        });
      }
    });

    it("serves static assets where requested", () => {
      expect(resolveHostRouting(APP, "/icon.png", "")).toEqual({
        kind: "next",
      });
      expect(resolveHostRouting(APEX, "/robots.txt", "")).toEqual({
        kind: "next",
      });
    });
  });

  describe("unknown hosts are left alone", () => {
    it("does not redirect preview or localhost, even for app/marketing paths", () => {
      expect(
        resolveHostRouting("onchain-suite-git-x.vercel.app", "/dashboard", "")
      ).toEqual({ kind: "next" });
      expect(resolveHostRouting("localhost:3000", "/pricing", "")).toEqual({
        kind: "next",
      });
      expect(resolveHostRouting("localhost:3000", "/", "")).toEqual({
        kind: "next",
      });
    });
  });

  describe("segment-boundary matching avoids false hits", () => {
    it("treats /forms as app but /for as marketing", () => {
      expect(resolveHostRouting(APEX, "/forms", "").kind).toBe("redirect");
      expect(resolveHostRouting(APEX, "/for", "")).toEqual({ kind: "next" });
    });

    it("does not confuse /d (public) with /dashboard (app)", () => {
      // On the apex, /dashboard redirects to the app; /d does not.
      expect(resolveHostRouting(APEX, "/dashboard", "").kind).toBe("redirect");
      expect(resolveHostRouting(APEX, "/d/xyz", "")).toEqual({ kind: "next" });
    });

    it("strips a port from the host before matching", () => {
      expect(resolveHostRouting("app.onchainsuite.com:443", "/", "")).toEqual({
        kind: "redirect",
        location: "/dashboard",
        permanent: false,
      });
    });
  });
});
