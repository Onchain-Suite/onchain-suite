import { describe, expect, it } from "vitest";

import { connectorFor, CONNECTORS } from "./connectors";
import { MIGRATIONS } from "./migrations";
import { SOURCES } from "./sources";

const keys = (id: string) => connectorFor(id)?.fields.map((f) => f.key);

describe("connectors", () => {
  it("has one definition per backend id", () => {
    const ids = [...CONNECTORS.keys()];
    expect(new Set(ids).size).toBe(ids.length);
  });

  // The server could import from these four and the Migrate tab did not know,
  // so their cards read "Comes in as a CSV export".
  it("connects every migration the server has an importer for", () => {
    expect(connectorFor("klaviyo")).toMatchObject({ action: "migrate" });
    expect(connectorFor("paragraph")).toMatchObject({ action: "migrate" });
    expect(connectorFor("customerio")).toMatchObject({
      action: "migrate-async",
    });
    expect(connectorFor("braze")).toMatchObject({ action: "migrate-async" });
    for (const id of ["klaviyo", "paragraph", "customerio", "braze"]) {
      expect(MIGRATIONS.some((m) => m.id === id)).toBe(true);
    }
  });

  it("gives Formo, a subgraph and an RPC endpoint a connect form", () => {
    expect(connectorFor("formo")).toMatchObject({ action: "identity-sync" });
    expect(connectorFor("subgraph")).toMatchObject({ action: "identity-sync" });
    expect(connectorFor("rpc")).toMatchObject({ action: "data-sync" });
    for (const id of ["formo", "subgraph", "rpc"]) {
      expect(SOURCES.some((s) => s.id === id)).toBe(true);
    }
  });

  // The backend stores the body as given and each verifier reads these exact
  // keys, so a renamed field here is a connection that can never verify.
  it("sends the field names each backend verifier reads", () => {
    expect(keys("klaviyo")).toEqual(["apiKey"]);
    expect(keys("paragraph")).toEqual(["apiKey"]);
    expect(keys("customerio")).toEqual(["apiKey", "segmentId", "region"]);
    expect(keys("braze")).toEqual(["baseUrl", "apiKey", "segmentId"]);
    expect(keys("formo")).toEqual(["apiKey"]);
    expect(keys("subgraph")).toEqual(["subgraphUrl", "entity", "walletField"]);
    expect(keys("rpc")).toEqual(["rpcUrl", "contractAddress"]);
  });

  it("marks only the syncs the server also runs on a schedule", () => {
    const scheduled = [...CONNECTORS.values()]
      .filter((c) => c.scheduled)
      .map((c) => c.id)
      .sort();
    expect(scheduled).toEqual(["clerk", "dynamic", "privy"]);
  });

  it("still resolves the catalog ids that differ from the backend's", () => {
    expect(connectorFor("sheets")?.id).toBe("googlesheets");
    expect(connectorFor("convertkit")?.id).toBe("kit");
    expect(connectorFor("substack")).toBeNull();
  });
});
