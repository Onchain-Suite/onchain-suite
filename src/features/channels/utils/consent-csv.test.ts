import { describe, expect, it } from "vitest";

import { chunk, mapColumns, parseCsv, toRows } from "./consent-csv";

describe("consent CSV", () => {
  it("parses quotes, embedded commas and newlines, CRLF and a BOM", () => {
    const text =
      '﻿wallet,phone,note\r\n0xa,"+1 415, 555",ok\r\n0xb,+44,"line\nbreak ""q"""\r\n\r\n';
    expect(parseCsv(text)).toEqual([
      ["wallet", "phone", "note"],
      ["0xa", "+1 415, 555", "ok"],
      ["0xb", "+44", 'line\nbreak "q"'],
    ]);
  });

  it("keeps a final row with no trailing newline", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("recognises common header spellings", () => {
    expect(
      mapColumns(["Wallet Address", "phone_number", "Consented At", "IP"])
    ).toEqual({ walletAddress: 0, phone: 1, consentedAt: 2, ipAddress: 3 });
    expect(mapColumns(["address", "mobile", "opted_in_at", "source"])).toEqual({
      walletAddress: 0,
      phone: 1,
      consentedAt: 2,
      source: 3,
    });
  });

  it("builds rows from mapped columns, dropping blanks", () => {
    expect(
      toRows([["0xa", " +1 ", ""]], {
        walletAddress: 0,
        phone: 1,
        consentedAt: 2,
      })
    ).toEqual([{ walletAddress: "0xa", phone: "+1" }]);
  });

  it("chunks", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});
