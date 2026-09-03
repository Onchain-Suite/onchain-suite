"use client";

import type { PropertySelectOption } from "./property-select";
import { PropertySelect } from "./property-select";

/**
 * "Alert above this amount" — in tokens, not base units.
 *
 * WHY THIS FIELD EXISTS AT ALL
 *
 * The Large Transfer preset promised "at or above an amount you set" and gave
 * no way to set it: business presets hide every field but the contract, so the
 * threshold silently used a default. Backend #460 made the threshold
 * expressible; this is where a person expresses it.
 *
 * WHY IT ASKS FOR DECIMALS
 *
 * A chain stores amounts in base units. 1,000 USDC is 1000000000 (6 decimals);
 * 1,000 DAI is 1000000000000000000000 (18). Typing a raw base-unit figure is
 * not something anyone can do reliably, and getting the decimals wrong is not a
 * small error — assuming 18 for USDC sets the threshold 10^12 too high, so the
 * alert never fires and looks like a broken trigger rather than a wrong number.
 *
 * So the field takes a human amount plus the token's decimals, does the
 * conversion, and SHOWS the base-unit result. Showing it matters: it is the
 * value that actually gets stored, and a person who can see it can catch a
 * decimals mistake themselves.
 */

/** Decimals of the tokens people actually set thresholds on. */
const DECIMALS_OPTIONS: PropertySelectOption[] = [
  { value: "18", label: "18 — most ERC-20 (DAI, WETH, LINK)" },
  { value: "6", label: "6 — USDC, USDT" },
  { value: "9", label: "9 — SOL, most SPL tokens" },
  { value: "8", label: "8 — WBTC" },
  { value: "0", label: "0 — whole units / NFTs" },
];

/**
 * Human amount → base units, exactly.
 *
 * BigInt and string surgery rather than `amount * 10 ** decimals`: the float
 * path loses precision above 2^53, which is four orders of magnitude below one
 * ETH in wei — the whole range this field exists to serve.
 *
 * @returns the base-unit string, or null when the input is not a usable amount.
 */
export function toBaseUnits(amount: string, decimals: number): string | null {
  const raw = amount.trim();
  if (!raw || !/^\d*\.?\d*$/.test(raw) || raw === ".") return null;
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) return null;

  const [whole = "0", frac = ""] = raw.split(".");
  // A fraction finer than the token's decimals cannot be represented on chain;
  // truncate rather than round, so the threshold never lands ABOVE what was
  // asked for and quietly filters out matches the user expected.
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  const digits = `${whole}${padded}`.replace(/^0+(?=\d)/, "");
  try {
    return BigInt(digits).toString();
  } catch {
    return null;
  }
}

/** Base units → human amount, for showing a stored value back to its author. */
export function fromBaseUnits(base: string, decimals: number): string {
  const raw = (base ?? "").trim();
  if (!/^\d+$/.test(raw)) return "";
  if (decimals === 0) return raw;
  const padded = raw.padStart(decimals + 1, "0");
  const whole = padded.slice(0, padded.length - decimals);
  const frac = padded.slice(padded.length - decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

export function AmountThresholdField({
  amount,
  decimals,
  onChange,
  labelClass,
  inputClass,
  hintClass,
}: {
  amount: string;
  decimals: number;
  onChange: (amount: string, decimals: number) => void;
  labelClass: string;
  inputClass: string;
  hintClass: string;
}) {
  const base = toBaseUnits(amount, decimals);

  return (
    <div>
      <label className={labelClass}>Alert above</label>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          className={`${inputClass} flex-1`}
          placeholder="1000"
          value={amount}
          onChange={(e) => onChange(e.target.value, decimals)}
        />
        <PropertySelect
          value={String(decimals)}
          onChange={(d) => onChange(amount, Number(d))}
          className="w-56"
          options={DECIMALS_OPTIONS}
        />
      </div>
      <p className={`${hintClass} mt-2`}>
        {amount.trim() && base
          ? // Shown deliberately: this is the value that gets stored, and
            // seeing it is how a decimals mistake gets caught.
            `Fires on transfers of ${amount} or more — stored as ${base} base units.`
          : "The amount a transfer must reach to count. Pick the token's decimals — USDC uses 6, most ERC-20s use 18."}
      </p>
    </div>
  );
}
