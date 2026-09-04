import { describe, expect, it } from "vitest";

import type { CaptureFieldSpec } from "../forms.service";
import {
  buildCurlExample,
  buildFetchExample,
  exampleFieldsObject,
  placeholderForField,
} from "./custom-form-snippet";

describe("placeholderForField", () => {
  it("picks a realistic placeholder by type then key", () => {
    expect(placeholderForField({ key: "email" })).toBe("you@example.com");
    expect(placeholderForField({ key: "note", type: "email" })).toBe(
      "you@example.com"
    );
    expect(placeholderForField({ key: "primary", type: "wallet" })).toMatch(
      /^0x0{40}$/
    );
    expect(placeholderForField({ key: "walletAddress" })).toMatch(/^0x0{40}$/);
    expect(placeholderForField({ key: "handle", type: "x" })).toBe("@handle");
    expect(placeholderForField({ key: "fc", type: "farcaster" })).toBe(
      "your-fid"
    );
    expect(placeholderForField({ key: "whatever", type: "text" })).toBe(
      "value"
    );
  });
});

describe("exampleFieldsObject", () => {
  it("maps every declared field key to a placeholder", () => {
    const fields: CaptureFieldSpec[] = [{ key: "email" }, { key: "x" }];
    expect(exampleFieldsObject(fields)).toEqual({
      email: "you@example.com",
      x: "@handle",
    });
  });

  it("falls back to a lone email when the form declares no fields", () => {
    expect(exampleFieldsObject([])).toEqual({ email: "you@example.com" });
  });
});

describe("buildCurlExample", () => {
  it("posts JSON with a fields object and consent to the submit URL", () => {
    const curl = buildCurlExample("https://api.test/submit", [
      { key: "email" },
    ]);
    expect(curl).toContain("curl -X POST 'https://api.test/submit'");
    expect(curl).toContain("-H 'Content-Type: application/json'");
    expect(curl).toContain('"fields"');
    expect(curl).toContain('"email": "you@example.com"');
    expect(curl).toContain('"consent": true');
  });
});

describe("buildFetchExample", () => {
  it("produces a valid fetch call to the submit URL", () => {
    const snippet = buildFetchExample("https://api.test/submit", [
      { key: "email" },
    ]);
    expect(snippet).toContain('await fetch("https://api.test/submit"');
    expect(snippet).toContain('method: "POST"');
    expect(snippet).toContain("JSON.stringify(");
    expect(snippet).toContain('"consent": true');
  });
});
