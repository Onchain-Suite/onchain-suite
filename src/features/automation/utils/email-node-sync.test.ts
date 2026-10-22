import { describe, expect, it } from "vitest";

import { emailNodePatch, hasEmailPatch } from "./email-node-sync";

describe("emailNodePatch", () => {
  it("maps subject and preview text from a saved design", () => {
    const patch = emailNodePatch(
      { subject: "Welcome aboard", previewText: "Your rewards are ready" },
      []
    );
    expect(patch).toEqual({
      subject: "Welcome aboard",
      previewText: "Your rewards are ready",
    });
  });

  it("names the node by the template when the picker knows it", () => {
    const patch = emailNodePatch({ subject: "Hi", templateId: "tpl_1" }, [
      { id: "tpl_1", name: "Onboarding drip" },
    ]);
    expect(patch.templateId).toBe("tpl_1");
    expect(patch.templateName).toBe("Onboarding drip");
  });

  it("falls back to the subject when a freshly-created template is not in the list yet", () => {
    // The template was just created in the editor tab; the builder's picker has
    // not refetched, so the lookup misses - the node must still be named.
    const patch = emailNodePatch(
      { subject: "Launch day", templateId: "tpl_new" },
      []
    );
    expect(patch.templateName).toBe("Launch day");
  });

  it("falls back to a generic label when there is no subject either", () => {
    const patch = emailNodePatch({ templateId: "tpl_x" }, []);
    expect(patch.templateName).toBe("Saved email");
  });

  it("omits fields that are absent so a partial save never blanks the node", () => {
    expect(emailNodePatch({ subject: "   ", previewText: "" }, [])).toEqual({});
    expect(hasEmailPatch(emailNodePatch({}, []))).toBe(false);
  });

  it("trims whitespace-only values", () => {
    const patch = emailNodePatch(
      { subject: "  Trimmed  ", previewText: "  keep  " },
      []
    );
    expect(patch.subject).toBe("Trimmed");
    expect(patch.previewText).toBe("keep");
  });

  it("hasEmailPatch reports whether anything is worth applying", () => {
    expect(hasEmailPatch({})).toBe(false);
    expect(hasEmailPatch({ subject: "x" })).toBe(true);
  });
});
