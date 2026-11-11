import { describe, expect, it } from "vitest";

import { connectorFor } from "../data/connectors";
import { syncIntro } from "./sync-intro";

const intro = (id: string) => {
  const def = connectorFor(id);
  if (!def) throw new Error(`no connector ${id}`);
  return syncIntro(def);
};

describe("syncIntro", () => {
  it("says a table is pulled in and matched", () => {
    for (const id of ["dune", "googlesheets"]) {
      expect(intro(id)).toMatch(/Pull the rows in as contacts/);
    }
  });

  it("says a user directory keeps itself current", () => {
    for (const id of ["privy", "clerk", "dynamic"]) {
      expect(intro(id)).toMatch(/users sync every 6 hours/);
    }
  });

  it("says the RPC source reads the whole history once, then only new blocks", () => {
    const text = intro("rpc");
    expect(text).toMatch(/whole history/);
    expect(text).toMatch(/new blocks are read every 6 hours/);
    // It is not a table of rows, and no longer a recent window.
    expect(text).not.toMatch(/rows|2,000/);
  });

  it("says a directory with no schedule is a one-off pull", () => {
    expect(intro("formo")).toMatch(/Pull everyone Formo holds/);
    expect(intro("subgraph")).toMatch(/Pull everyone Subgraph holds/);
  });
});
