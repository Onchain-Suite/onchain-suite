import { describe, expect, it } from "vitest";

import {
  normalizeBranchRule,
  normalizeSchemaFieldOptions,
  normalizeSchemaFields,
} from "./builder-schema";

describe("normalizeSchemaFieldOptions", () => {
  it("accepts bare strings/numbers and object shapes, dropping empties", () => {
    expect(
      normalizeSchemaFieldOptions(["base", 137, { value: "op", label: "Op" }])
    ).toEqual([
      { label: "base", value: "base" },
      { label: "137", value: "137" },
      { label: "Op", value: "op" },
    ]);
  });
  it("resolves value/label from alternate keys and skips valueless entries", () => {
    expect(normalizeSchemaFieldOptions([{ id: "x", name: "X label" }])).toEqual(
      [{ value: "x", label: "X label" }]
    );
    expect(normalizeSchemaFieldOptions([{ label: "no value" }])).toEqual([]);
  });
});

describe("normalizeSchemaFields", () => {
  it("maps fields, lowercases type, and surfaces the default as placeholder", () => {
    const out = normalizeSchemaFields({
      fields: [{ key: "amount", label: "Amount", type: "NUMBER", default: 10 }],
    });
    expect(out).toEqual([
      {
        key: "amount",
        label: "Amount",
        description: undefined,
        type: "number",
        required: false,
        placeholder: "10",
        advanced: false,
        options: [],
      },
    ]);
  });

  it("drops internal keys and fields without a usable key", () => {
    const out = normalizeSchemaFields({
      fields: [
        { key: "templateId", type: "text" }, // internal - excluded
        { type: "text" }, // no key - excluded
        { key: "poolAddress", type: "text" },
      ],
    });
    expect(out.map((f) => f.key)).toEqual(["poolAddress"]);
  });

  it("is [] for non-object schemas", () => {
    expect(normalizeSchemaFields(null)).toEqual([]);
    expect(normalizeSchemaFields("nope")).toEqual([]);
  });
});

describe("normalizeBranchRule", () => {
  it("reads value from legacy/backend key aliases and defaults the operator", () => {
    const rule = normalizeBranchRule(
      { key: "score", comparator: "gte", value: 5, to: "node-2" },
      0
    );
    expect(rule).toMatchObject({
      field: "score",
      operator: "gte",
      value: "5",
      target: "node-2",
    });
  });

  it("defaults operator to eq and generates a stable-shaped id when absent", () => {
    const rule = normalizeBranchRule({}, 3);
    expect(rule.operator).toBe("eq");
    expect(rule.value).toBe("");
    expect(rule.id).toMatch(/^rule-3-/);
  });
});
