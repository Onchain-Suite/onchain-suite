import { describe, expect, it } from "vitest";

import { block, pass, result } from "../test/fixtures";
import {
  saveBlockFromError,
  saveBlockHeadline,
  saveBlockLinks,
  saveBlockSignature,
} from "./save-refusal";

/** The Error the services throw: code + the envelope's `error.details`. */
const refused = (details: Record<string, unknown>) =>
  Object.assign(new Error("[HTTP 422] An error occurred"), {
    code: "PRESEND_BLOCKED",
    details,
  });

const shortener = (links: string[]) => ({
  ...block("URL_SHORTENER"),
  details: { links },
});

describe("saveBlockFromError", () => {
  it("reads the blocking checks and links off error.details.checks", () => {
    const checks = [
      shortener(["https://bit.ly/a", "https://bit.ly/a"]),
      pass("SENDER_NOT_VERIFIED"),
    ];
    const got = saveBlockFromError(
      refused({
        code: "PRESEND_BLOCKED",
        message: "Blocked",
        rulesetVersion: "2026-11-21.1",
        checks,
        presend: result(checks),
      }),
      { campaignId: "c1" },
      "autosave"
    );
    expect(got).toEqual({
      campaignId: "c1",
      source: "autosave",
      code: "PRESEND_BLOCKED",
      message: "this email can't go out while it contains a link shortener",
      rulesetVersion: "2026-11-21.1",
      checks: [
        {
          code: "URL_SHORTENER",
          message: "URL_SHORTENER message",
          fix: "URL_SHORTENER fix",
          links: ["https://bit.ly/a"],
        },
      ],
    });
  });

  it("parses a body with checks but no presend result", () => {
    const got = saveBlockFromError(
      refused({
        code: "PRESEND_BLOCKED",
        checks: [block("SEED_PHRASE_REQUEST")],
      }),
      { campaignId: "c1" },
      "save"
    );
    expect(got?.checks.map((c) => c.code)).toEqual(["SEED_PHRASE_REQUEST"]);
    expect(got?.source).toBe("save");
  });

  it("is null for any other error", () => {
    expect(
      saveBlockFromError(new Error("boom"), { campaignId: "c" }, "save")
    ).toBeNull();
    expect(
      saveBlockFromError(
        Object.assign(new Error("x"), {
          code: "PRESEND_ACK_REQUIRED",
          details: { code: "PRESEND_ACK_REQUIRED", checks: [] },
        }),
        { campaignId: "c" },
        "save"
      )
    ).toBeNull();
  });
});

describe("saveBlockSignature", () => {
  it("ignores order and changes with codes or links", () => {
    const a = saveBlockFromError(
      refused({
        code: "PRESEND_BLOCKED",
        checks: [shortener(["b", "a"]), block("SEED_PHRASE_REQUEST")],
      }),
      {},
      "autosave"
    );
    const b = saveBlockFromError(
      refused({
        code: "PRESEND_BLOCKED",
        checks: [block("SEED_PHRASE_REQUEST"), shortener(["a", "b"])],
      }),
      {},
      "autosave"
    );
    const c = saveBlockFromError(
      refused({ code: "PRESEND_BLOCKED", checks: [shortener(["a"])] }),
      {},
      "autosave"
    );
    expect(saveBlockSignature(a)).toBe(saveBlockSignature(b));
    expect(saveBlockSignature(a)).not.toBe(saveBlockSignature(c));
    expect(saveBlockSignature(null)).toBe("");
    expect(saveBlockLinks(a)).toEqual(["b", "a"]);
  });
});

describe("saveBlockHeadline", () => {
  it("names both reasons", () => {
    expect(saveBlockHeadline(["URL_SHORTENER", "SEED_PHRASE_REQUEST"])).toBe(
      "this email can't go out while it contains a link shortener and asks for a seed phrase or private key"
    );
  });
});
