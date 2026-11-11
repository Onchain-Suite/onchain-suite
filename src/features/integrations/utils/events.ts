import type { EventsCatalog } from "../contracts/connections";

/* Pure rules behind the Events tab: what each health tile says. */

export interface HealthTile {
  label: string;
  /** The one thing to know. */
  headline: string;
  /** What that means, or what to do about it. */
  detail: string;
}

const count = new Intl.NumberFormat("en-US");

/** `null` while the contracts are still loading. */
export function contractsTile(contracts: number | null): HealthTile {
  const label = "Contracts";
  if (contracts === null) {
    return { label, headline: "Checking…", detail: "Reading your contracts" };
  }
  if (contracts === 0) {
    return {
      label,
      headline: "None indexed",
      detail: "Optional: adds on-chain data to segments and Loops",
    };
  }
  return {
    label,
    headline: `${count.format(contracts)} indexed`,
    detail: "Read from the chain as blocks land",
  };
}

/** `undefined` while loading; `null` when the catalog could not be read. */
export function productEventsTile(
  catalog: EventsCatalog | null | undefined
): HealthTile {
  const label = "Product events";
  if (catalog === undefined) {
    return { label, headline: "Checking…", detail: "Reading your events" };
  }
  if (catalog === null) {
    return {
      label,
      headline: "Could not check",
      detail: "The event list did not load. Try again in a moment",
    };
  }
  const days = catalog.windowDays || 30;
  const names = catalog.events.length;
  if (names === 0) {
    return {
      label,
      headline: "None yet",
      detail: `Nothing has arrived in the last ${days} days`,
    };
  }
  const total = catalog.events.reduce((sum, e) => sum + (e.count || 0), 0);
  return {
    label,
    headline: `${count.format(names)} ${names === 1 ? "event" : "events"} arriving`,
    detail: `${count.format(total)} in the last ${days} days`,
  };
}

/** "0x1234567890…abcdef" for a table cell; short addresses are left whole. */
export const shortAddress = (address: string): string =>
  address.length > 18
    ? `${address.slice(0, 10)}…${address.slice(-6)}`
    : address;
