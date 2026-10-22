"use client";

import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

import {
  BRANCH_OPERATORS,
  BRANCH_VALUELESS_OPERATORS,
  type BranchRule,
} from "../../../utils/builder-schema";
import { PropertySelect, type PropertySelectOption } from "../property-select";
import { Field } from "./panel-ui";
import { PickField } from "./pick-field";

/**
 * If / else: conditions checked in order, each one a row. Yes and No are the
 * two paths on the canvas; a condition can also send people to a step of
 * its own, and anyone who matches none takes the fallback.
 */
export function BranchStepFields({
  rules,
  targets,
  fallback,
  onAdd,
  onUpdate,
  onRemove,
  onFallback,
}: {
  rules: BranchRule[];
  targets: PropertySelectOption[];
  fallback: string;
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<BranchRule>) => void;
  onRemove: (id: string) => void;
  onFallback: (target: string) => void;
}) {
  return (
    <>
      <Field
        label="Conditions"
        hint="Checked top to bottom. Yes goes left, no goes right, and both paths join back up after."
      >
        {rules.length === 0 ? (
          <p className="abp-note">
            No conditions yet. Add one to decide who goes down the Yes path.
          </p>
        ) : (
          <ol className="abp-rows">
            {rules.map((rule, i) => {
              const needsValue = !BRANCH_VALUELESS_OPERATORS.has(rule.operator);
              return (
                <li key={rule.id}>
                  <span className="abp-rowtag">{i + 1}</span>
                  <div className="abp-rowbody">
                    <input
                      className="abp-input"
                      aria-label={`Field for condition ${i + 1}`}
                      placeholder="Field, e.g. tier or balance"
                      value={rule.field}
                      onChange={(e) =>
                        onUpdate(rule.id, { field: e.target.value })
                      }
                    />
                    <div className={needsValue ? "abp-pair" : undefined}>
                      <PropertySelect
                        value={rule.operator}
                        options={BRANCH_OPERATORS}
                        placeholder="Operator"
                        onChange={(operator) => onUpdate(rule.id, { operator })}
                      />
                      {needsValue && (
                        <input
                          className="abp-input"
                          aria-label={`Value for condition ${i + 1}`}
                          placeholder="Value"
                          value={rule.value}
                          onChange={(e) =>
                            onUpdate(rule.id, { value: e.target.value })
                          }
                        />
                      )}
                    </div>
                    <PropertySelect
                      value={rule.target}
                      options={targets}
                      placeholder={
                        targets.length
                          ? "Then go to (optional)"
                          : "Add more steps first"
                      }
                      onChange={(target) => onUpdate(rule.id, { target })}
                    />
                  </div>
                  <button
                    type="button"
                    className="abp-x"
                    aria-label={`Remove condition ${i + 1}`}
                    onClick={() => onRemove(rule.id)}
                  >
                    <XMarkIcon aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        <button
          type="button"
          className="abp-link inline-flex items-center gap-1"
          onClick={onAdd}
        >
          <PlusIcon aria-hidden="true" className="h-3.5 w-3.5" />
          Add a condition
        </button>
      </Field>
      <PickField
        label="Anyone who matches none"
        optional
        value={fallback}
        options={targets}
        onChange={onFallback}
        placeholder={
          targets.length ? "Takes the No path" : "Add more steps first"
        }
      />
    </>
  );
}
