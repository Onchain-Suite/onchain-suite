"use client";

import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

import { Field } from "./panel-ui";

export interface SplitVariant {
  label: string;
  weight: number;
}

/** A/B split: one row per variant, with its share. Weights are relative. */
export function SplitStepFields({
  variants,
  onChange,
}: {
  variants: SplitVariant[];
  onChange: (variants: SplitVariant[]) => void;
}) {
  const total = variants.reduce((s, v) => s + v.weight, 0);
  const put = (i: number, patch: Partial<SplitVariant>) =>
    onChange(variants.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  return (
    <Field
      label="Send people"
      hint={
        <>
          Each person gets one variant at random, in these shares
          {total > 0 ? ` (total ${total})` : ""}. Label one{" "}
          <span className="abp-mono">holdout</span> and leave its path empty for
          a control group.
        </>
      }
    >
      <ol className="abp-rows">
        {variants.map((v, i) => (
          // Variants have no id and every input is controlled, so the index is a safe key.
          // eslint-disable-next-line react/no-array-index-key
          <li key={i}>
            <span className="abp-rowtag">
              {String.fromCharCode(65 + (i % 26))}
            </span>
            <div className="abp-rowbody">
              <div className="abp-pair">
                <input
                  className="abp-input"
                  aria-label={`Label for variant ${i + 1}`}
                  placeholder="Label"
                  value={v.label}
                  onChange={(e) => put(i, { label: e.target.value })}
                />
                <input
                  type="number"
                  min={0}
                  className="abp-input"
                  aria-label={`Weight for variant ${i + 1}`}
                  value={v.weight}
                  onChange={(e) =>
                    put(i, { weight: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
              </div>
            </div>
            <button
              type="button"
              className="abp-x"
              aria-label={`Remove variant ${v.label || i + 1}`}
              onClick={() => onChange(variants.filter((_, j) => j !== i))}
            >
              <XMarkIcon aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="abp-link inline-flex items-center gap-1"
        onClick={() => onChange([...variants, { label: "", weight: 50 }])}
      >
        <PlusIcon aria-hidden="true" className="h-3.5 w-3.5" />
        Add a variant
      </button>
    </Field>
  );
}
