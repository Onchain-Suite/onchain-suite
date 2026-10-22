import { describe, expect, it } from "vitest";

import { DEFAULT_FOOTER } from "../data/merge-tags";
import { EMAIL_DOC_FORMAT } from "../types/email-doc";
import { buildEmailPayload } from "./email-payload";
import { loadDesign, starterDoc } from "./load-design";

describe("buildEmailPayload", () => {
  it("saves send HTML, a text part and a design that reopens as itself", () => {
    const doc = starterDoc();
    const p = buildEmailPayload(doc, DEFAULT_FOOTER);
    expect(p.html).toContain('{{ name | default: "there" }}');
    expect(p.html).toContain('href="{{ unsubscribe_url }}"');
    expect(p.textVersion).toContain("Your headline");
    expect(p.json.format).toBe(EMAIL_DOC_FORMAT);
    expect(loadDesign({ json: p.json, html: p.html })).toEqual({
      kind: "doc",
      doc,
      footer: DEFAULT_FOOTER,
    });
  });
});
