import { describe, expect, it } from "vitest";

import {
  legacyUsageRows,
  usageBlockState,
  usageRows,
  usageRowsFromMeters,
} from "./usage-rows";

const meter = (used: number, limit: number) => ({
  used,
  limit,
  percent: 0,
  status: "ok",
});

/** What staging returned for a workspace subscribed at 7,500 contacts. */
const subscribed = {
  contacts: meter(0, 7500),
  trackedWallets: meter(0, 7500),
  emailsPerMonth: meter(0, 75000),
  inAppPushesPerMonth: meter(0, 0),
  aiCredits: meter(12, 1000),
  goldrushCredits: meter(0, 10000),
  seats: meter(1, 3),
  automations: meter(0, -1),
  apiKeys: meter(0, 2),
};

describe("usageRowsFromMeters", () => {
  // The page said "No usage metrics for this billing period yet" for this
  // workspace: nothing had been used, and the block hid every row.
  it("lists what the plan gives even when none of it has been used", () => {
    const rows = usageRowsFromMeters(subscribed);
    expect(rows.find((r) => r.key === "contacts")).toEqual({
      key: "contacts",
      label: "Contacts",
      used: 0,
      limit: 7500,
    });
    expect(rows.map((r) => r.label)).toEqual([
      "Contacts",
      "Tracked wallets",
      "Emails this month",
      "AI credits",
      "Enrichment & on-chain",
      "Seats",
      "Loops",
      "API keys",
    ]);
  });

  it("leaves out a meter the plan does not include and nobody has used", () => {
    const keys = usageRowsFromMeters(subscribed).map((r) => r.key);
    expect(keys).not.toContain("inAppPushesPerMonth");
  });

  it("keeps a meter with usage even when the plan includes none of it", () => {
    const rows = usageRowsFromMeters({ inAppPushesPerMonth: meter(40, 0) });
    expect(rows).toEqual([
      {
        key: "inAppPushesPerMonth",
        label: "In-app pushes this month",
        used: 40,
        limit: 0,
      },
    ]);
  });

  it("carries an uncapped meter through as below zero", () => {
    const loops = usageRowsFromMeters(subscribed).find(
      (r) => r.key === "automations"
    );
    expect(loops?.limit).toBe(-1);
  });

  it("skips a meter it cannot read, and keeps the rest", () => {
    const rows = usageRowsFromMeters({
      contacts: { used: "12", limit: "7500" },
      seats: { used: NaN, limit: 3 },
      apiKeys: { used: 1 },
      aiCredits: "lots",
      emailsPerMonth: null,
      somethingNew: meter(1, 2),
    });
    expect(rows).toEqual([
      { key: "contacts", label: "Contacts", used: 12, limit: 7500 },
    ]);
  });

  it("never shows a negative amount used", () => {
    expect(usageRowsFromMeters({ contacts: meter(-5, 100) })[0]?.used).toBe(0);
  });

  it("is empty for anything that is not a set of meters", () => {
    for (const bad of [undefined, null, "x", 7, [], [meter(1, 2)]]) {
      expect(usageRowsFromMeters(bad)).toEqual([]);
    }
  });
});

describe("legacyUsageRows", () => {
  // The older endpoint names its limits emailLimit, contactLimit and
  // onChainLimit. The page read emailsSent, contacts and onChainSends under
  // `limits`, found nothing, and showed no limit at all.
  it("reads the limits by the names the endpoint sends", () => {
    const rows = legacyUsageRows({
      emailsSent: 0,
      contacts: 0,
      onChainSends: 0,
      limits: { emailLimit: 75000, contactLimit: 7500, onChainLimit: 0 },
    });
    expect(rows).toEqual([
      { key: "emailsSent", label: "Emails sent", used: 0, limit: 75000 },
      { key: "contacts", label: "Contacts", used: 0, limit: 7500 },
    ]);
  });

  it("still reads the older limit names, and the summary on the overview", () => {
    const rows = legacyUsageRows(
      { emailsSent: 5 },
      { contacts: 40, limits: { emailsSent: 100, contacts: 500 } }
    );
    expect(rows).toEqual([
      { key: "emailsSent", label: "Emails sent", used: 5, limit: 100 },
      { key: "contacts", label: "Contacts", used: 40, limit: 500 },
    ]);
  });

  it("maps an items list, with no limit where none was sent", () => {
    const rows = legacyUsageRows({
      items: [
        { key: "Emails", used: 3, limit: 10 },
        { label: "Calls", used: 2 },
        { key: "Unused", used: 0 },
        { key: "Open", used: 0, limit: -1 },
        "junk",
      ],
    });
    expect(rows).toEqual([
      { key: "Emails", label: "Emails", used: 3, limit: 10 },
      { key: "Calls", label: "Calls", used: 2, limit: null },
      { key: "Open", label: "Open", used: 0, limit: -1 },
    ]);
  });

  it("gives two items of the same name different keys", () => {
    const rows = legacyUsageRows({
      items: [
        { key: "Emails", used: 1 },
        { key: "Emails", used: 2 },
      ],
    });
    expect(new Set(rows.map((r) => r.key)).size).toBe(2);
  });

  it("is empty when there is nothing to show", () => {
    expect(legacyUsageRows(undefined)).toEqual([]);
    expect(legacyUsageRows({ emailsSent: 0, limits: {} })).toEqual([]);
  });
});

describe("usageRows", () => {
  it("uses the workspace's meters when it has them", () => {
    const rows = usageRows({
      meters: { contacts: meter(0, 7500) },
      usage: { contacts: 99, limits: { contactLimit: 1 } },
    });
    expect(rows).toEqual([
      { key: "contacts", label: "Contacts", used: 0, limit: 7500 },
    ]);
  });

  it("falls back to the older figures when there are no meters", () => {
    const rows = usageRows({
      meters: undefined,
      usage: { contacts: 99, limits: { contactLimit: 500 } },
    });
    expect(rows).toEqual([
      { key: "contacts", label: "Contacts", used: 99, limit: 500 },
    ]);
  });
});

describe("usageBlockState", () => {
  const rows = [{ key: "contacts", label: "Contacts", used: 0, limit: 7500 }];
  const base = { loading: false, rows: [], freeFallback: false, failed: false };

  it("waits while anything is loading", () => {
    expect(usageBlockState({ ...base, loading: true, rows })).toBe("loading");
  });

  // The older endpoint failing must not hide meters that did load.
  it("shows rows over a failure or the Free fallback", () => {
    expect(usageBlockState({ ...base, rows, failed: true })).toBe("rows");
    expect(usageBlockState({ ...base, rows, freeFallback: true })).toBe("rows");
  });

  it("says Free before it says failed", () => {
    expect(usageBlockState({ ...base, freeFallback: true, failed: true })).toBe(
      "free"
    );
  });

  it("reports a failure, and otherwise that there is nothing yet", () => {
    expect(usageBlockState({ ...base, failed: true })).toBe("error");
    expect(usageBlockState(base)).toBe("empty");
  });
});
