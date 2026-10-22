"use client";

import { useId } from "react";

import {
  readWait,
  WAIT_UNITS,
  type WaitUnit,
  writeWait,
} from "../../../utils/wait-duration";
import { PropertySelect } from "../property-select";

const UNIT_OPTIONS = WAIT_UNITS.map((u) => ({ value: u, label: u }));

/** Wait: how long, as a number and a unit side by side. */
export function WaitStepFields({
  data,
  onChange,
}: {
  data: { duration?: unknown; seconds?: unknown };
  onChange: (patch: { duration: string; seconds: number }) => void;
}) {
  const id = useId();
  const { amount, unit } = readWait(data);
  return (
    <>
      <div className="abp-pair">
        <div className="abp-field">
          <label className="abp-label" htmlFor={id}>
            How long
          </label>
          <input
            id={id}
            type="number"
            min={1}
            className="abp-input"
            value={amount}
            placeholder="2"
            onChange={(e) => onChange(writeWait(e.target.value, unit))}
          />
        </div>
        <div className="abp-field">
          <span className="abp-label" aria-hidden="true">
            &nbsp;
          </span>
          <PropertySelect
            value={unit}
            options={UNIT_OPTIONS}
            onChange={(next) =>
              onChange(writeWait(amount || "1", next as WaitUnit))
            }
          />
        </div>
      </div>
      <p className="abp-hint">
        Everyone waits here this long before the next step. The clock starts
        when they reach it.
      </p>
    </>
  );
}
