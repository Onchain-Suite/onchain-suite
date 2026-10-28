import { describe, expect, it } from "vitest";

import {
  extractAxiosError,
  findExistingOrganizationId,
  firstOrganizationId,
  normalizeWebsiteUrl,
  pickNonEmptyString,
  slugify,
} from "./organization";

describe("slugify", () => {
  it("lowercases, hyphenates and trims to a URL-safe slug", () => {
    expect(slugify("Acme Corp")).toBe("acme-corp");
    expect(slugify("  Foo  Bar!! ")).toBe("foo-bar");
    expect(slugify("Déjà")).toBe("d-j"); // non-alphanumerics collapse
  });
});

describe("normalizeWebsiteUrl", () => {
  it("adds a scheme to a bare domain and canonicalises", () => {
    expect(normalizeWebsiteUrl("acme.xyz")).toBe("https://acme.xyz/");
    expect(normalizeWebsiteUrl("http://acme.xyz")).toBe("http://acme.xyz/");
  });

  it("returns undefined for empty or unparseable input", () => {
    expect(normalizeWebsiteUrl("")).toBeUndefined();
    expect(normalizeWebsiteUrl("   ")).toBeUndefined();
    expect(normalizeWebsiteUrl("http://")).toBeUndefined();
  });
});

describe("pickNonEmptyString", () => {
  it("returns the first non-empty trimmed string", () => {
    expect(pickNonEmptyString(undefined, "", "  ", "x")).toBe("x");
    expect(pickNonEmptyString(1, null, {})).toBeUndefined();
  });
});

describe("extractAxiosError", () => {
  it("reads status and unwraps a nested envelope message", () => {
    const err = {
      response: { status: 409, data: { error: { message: "taken" } } },
    };
    expect(extractAxiosError(err)).toEqual({ status: 409, message: "taken" });
  });

  it("falls back to the top-level message when there is no response", () => {
    expect(extractAxiosError(new Error("boom"))).toEqual({
      status: undefined,
      message: "boom",
    });
  });
});

describe("findExistingOrganizationId", () => {
  const payload = {
    data: [
      { id: "org_1", name: "Acme", slug: "acme" },
      { id: "org_2", name: "Beta", slug: "beta" },
    ],
  };

  it("matches on slug first, then name, case-insensitively", () => {
    expect(findExistingOrganizationId(payload, "x", "ACME")).toBe("org_1");
    expect(findExistingOrganizationId(payload, "Beta", "nope")).toBe("org_2");
  });

  it("returns null when nothing matches", () => {
    expect(findExistingOrganizationId(payload, "Gamma", "gamma")).toBeNull();
    expect(findExistingOrganizationId({ data: [] }, "Acme", "acme")).toBeNull();
  });
});

describe("firstOrganizationId", () => {
  it("returns the first org id regardless of name/slug", () => {
    expect(
      firstOrganizationId({
        data: [
          { id: "org_1", name: "Acme" },
          { id: "org_2", name: "Beta" },
        ],
      })
    ).toBe("org_1");
    // tolerant of the nested { data: { data: [...] } } envelope and organizationId
    expect(
      firstOrganizationId({ data: { data: [{ organizationId: "org_9" }] } })
    ).toBe("org_9");
    // and a bare array
    expect(firstOrganizationId([{ id: "org_3" }])).toBe("org_3");
  });

  it("returns null when the user belongs to no org", () => {
    expect(firstOrganizationId({ data: [] })).toBeNull();
    expect(firstOrganizationId(null)).toBeNull();
    expect(firstOrganizationId({ data: [{ name: "no id here" }] })).toBeNull();
  });
});
