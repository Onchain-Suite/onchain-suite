/* eslint-disable no-script-url -- these tests feed script URLs to the sanitizer on purpose */
import { describe, expect, it } from "vitest";

import {
  cleanGoogleDocsHtml,
  isSafeUrl,
  sanitizeEmailHtml,
} from "./email-safety";

describe("isSafeUrl", () => {
  it("allows web, mail, in-page, relative and merge-tag links", () => {
    for (const u of [
      "https://a.xyz",
      "mailto:a@b.c",
      "#top",
      "/path",
      "page.html",
      "{{ claim_url }}",
      "",
    ]) {
      expect(isSafeUrl(u), u).toBe(true);
    }
  });

  it("rejects script schemes, even disguised", () => {
    for (const u of [
      "javascript:alert(1)",
      "java\tscript:alert(1)",
      "JAVASCRIPT:x",
      "vbscript:x",
      "//evil.com",
    ]) {
      expect(isSafeUrl(u), u).toBe(false);
    }
  });

  it("allows data images only where images are expected", () => {
    expect(isSafeUrl("data:image/png;base64,AAA")).toBe(false);
    expect(isSafeUrl("data:image/png;base64,AAA", { images: true })).toBe(true);
    expect(isSafeUrl("data:text/html;base64,AAA", { images: true })).toBe(
      false
    );
  });
});

describe("sanitizeEmailHtml", () => {
  it("removes scripts, handlers and unsafe links, and counts them", () => {
    const { html, removed } = sanitizeEmailHtml(
      '<p onclick="x()">Hi</p><script>bad()</script><a href="javascript:x">l</a><iframe src="https://a"></iframe>'
    );
    expect(html).toBe("<p>Hi</p><a>l</a>");
    expect(removed).toBe(4);
  });
});

describe("cleanGoogleDocsHtml", () => {
  it("unwraps the Docs wrapper and turns styled spans into tags", () => {
    const pasted =
      '<b id="docs-internal-guid-1" style="font-weight:normal"><p><span style="font-weight:700">Bold</span> and <span style="font-style:italic">it</span></p></b>';
    expect(cleanGoogleDocsHtml(pasted)).toBe(
      "<p><strong>Bold</strong> and <em>it</em></p>"
    );
  });

  it("leaves other HTML untouched", () => {
    expect(cleanGoogleDocsHtml("<p><b>Hi</b></p>")).toBe("<p><b>Hi</b></p>");
  });
});
