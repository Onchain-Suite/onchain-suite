import { describe, expect, it } from "vitest";

import type {
  ConnectionSummary,
  MigrationResult,
} from "../contracts/connections";
import { connectorFor, CONNECTORS } from "../data/connectors";
import {
  connectionLabel,
  connectionState,
  EMPTY_MIGRATION,
  EMPTY_SYNC,
  findConnection,
  heldTotal,
  madeProgress,
  mergeMigration,
  mergeSync,
  missingFields,
  nextMigrationBody,
  nextSyncBody,
  oauthReturnMessage,
  toCredentials,
} from "./connections";

const conn = (over: Partial<ConnectionSummary> = {}): ConnectionSummary => ({
  connector: "privy",
  kind: "source",
  config: {},
  fingerprint: "abcd",
  verified: true,
  verifiedAt: "2026-10-01T00:00:00Z",
  lastError: null,
  updatedAt: "2026-10-01T00:00:00Z",
  ...over,
});

const slice = (over: Partial<MigrationResult> = {}): MigrationResult => ({
  ...EMPTY_MIGRATION,
  scanned: 100,
  created: 60,
  alreadyMigrated: 30,
  held: { unsubscribed: 5, unconfirmed: 3, invalid: 1, unreachable: 1 },
  pages: 1,
  hasMore: true,
  nextCursor: "c1",
  ...over,
});

describe("connectionState", () => {
  it("separates working, saved-but-rejected and absent", () => {
    expect(connectionState(conn())).toBe("connected");
    expect(connectionState(conn({ verified: false }))).toBe("broken");
    expect(connectionState(null)).toBe("none");
  });
});

describe("connectionLabel", () => {
  it("prefers the server label, then the account name", () => {
    expect(
      connectionLabel(conn({ config: { label: "@bot", botUsername: "x" } }))
    ).toBe("@bot");
    expect(connectionLabel(conn({ config: { appName: "My app" } }))).toBe(
      "My app"
    );
    expect(connectionLabel(conn({ config: {} }))).toBeNull();
  });
});

describe("findConnection", () => {
  it("finds by connector id", () => {
    expect(findConnection([conn()], "privy")?.connector).toBe("privy");
    expect(findConnection([conn()], "clerk")).toBeNull();
    expect(findConnection(undefined, "privy")).toBeNull();
  });
});

describe("credential form", () => {
  const privy = CONNECTORS.get("privy");
  const x = CONNECTORS.get("x");

  it("lists blank required fields by label", () => {
    expect(privy && missingFields(privy, { appId: " " })).toEqual([
      "App ID",
      "App secret",
    ]);
    expect(
      privy && missingFields(privy, { appId: "a", appSecret: "b" })
    ).toEqual([]);
  });

  it("sends only the connector's own trimmed fields, dropping blank optionals", () => {
    expect(
      x &&
        toCredentials(x, {
          accessToken: " tok ",
          refreshToken: "",
          stray: "nope",
        })
    ).toEqual({ accessToken: "tok" });
  });
});

describe("connectorFor", () => {
  it("maps catalog ids that differ from the backend id", () => {
    expect(connectorFor("sheets")?.id).toBe("googlesheets");
    expect(connectorFor("sheets")?.route).toBe("google-sheets");
    expect(connectorFor("convertkit")?.id).toBe("kit");
    expect(connectorFor("segment")).toBeNull();
  });

  it("marks the OAuth tools as having no fields to paste", () => {
    for (const id of ["hubspot", "salesforce", "intercom"]) {
      expect(CONNECTORS.get(id)?.connect).toBe("oauth");
      expect(CONNECTORS.get(id)?.fields).toEqual([]);
    }
  });
});

describe("nextMigrationBody", () => {
  it("starts with an empty body", () => {
    expect(nextMigrationBody("cursor", null)).toEqual({});
  });

  it("stops when the server has no more", () => {
    expect(nextMigrationBody("cursor", slice({ hasMore: false }))).toBeNull();
  });

  it("re-runs, pages or follows the cursor by tool", () => {
    expect(nextMigrationBody("rerun", slice())).toEqual({});
    expect(nextMigrationBody("page", slice({ nextPage: 4 }))).toEqual({
      startPage: 4,
    });
    expect(nextMigrationBody("cursor", slice())).toEqual({ cursor: "c1" });
  });

  it("stops rather than restarting when a cursor or page is missing", () => {
    expect(nextMigrationBody("cursor", slice({ nextCursor: null }))).toBeNull();
    expect(nextMigrationBody("page", slice({ nextPage: null }))).toBeNull();
  });
});

describe("nextSyncBody", () => {
  it("follows the cursor while there is more", () => {
    expect(nextSyncBody(null)).toEqual({});
    expect(
      nextSyncBody({ ...EMPTY_SYNC, hasMore: true, nextCursor: "100" })
    ).toEqual({ cursor: "100" });
    expect(nextSyncBody({ ...EMPTY_SYNC, hasMore: false })).toBeNull();
  });
});

describe("merging slices", () => {
  it("adds migration totals and keeps the latest paging", () => {
    const a = mergeMigration(EMPTY_MIGRATION, slice({ warnings: ["w"] }));
    const b = mergeMigration(
      a,
      slice({
        nextCursor: "c2",
        listName: "Imported from Kit",
        warnings: ["w"],
      })
    );
    expect(b.scanned).toBe(200);
    expect(b.created).toBe(120);
    expect(b.held.unsubscribed).toBe(10);
    expect(heldTotal(b.held)).toBe(20);
    expect(b.nextCursor).toBe("c2");
    expect(b.listName).toBe("Imported from Kit");
    expect(b.warnings).toEqual(["w"]);
  });

  it("adds sync totals and remembers Dynamic's cap", () => {
    const r = mergeSync(
      mergeSync(EMPTY_SYNC, {
        ...EMPTY_SYNC,
        scanned: 10,
        truncatedAtCap: true,
      }),
      { ...EMPTY_SYNC, scanned: 5 }
    );
    expect(r.scanned).toBe(15);
    expect(r.truncatedAtCap).toBe(true);
  });

  it("treats a slice that read nothing as no progress", () => {
    expect(madeProgress({ scanned: 0, pages: 0 })).toBe(false);
    expect(madeProgress({ scanned: 0, pages: 1 })).toBe(true);
  });
});

describe("oauthReturnMessage", () => {
  const label = (id: string) => (id === "hubspot" ? "HubSpot" : id);

  it("names the connected tool", () => {
    expect(oauthReturnMessage({ connected: "hubspot", label })).toEqual({
      kind: "success",
      message: "HubSpot connected",
    });
  });

  it("explains each failure", () => {
    expect(oauthReturnMessage({ error: "invalid_state" })?.message).toMatch(
      /expired/
    );
    expect(
      oauthReturnMessage({
        error: "connect_failed",
        connector: "hubspot",
        label,
      })?.message
    ).toMatch(/HubSpot/);
    expect(oauthReturnMessage({ error: "access_denied" })?.message).toBe(
      "Couldn't connect: access_denied"
    );
  });

  it("is silent without either param", () => {
    expect(oauthReturnMessage({})).toBeNull();
  });
});
