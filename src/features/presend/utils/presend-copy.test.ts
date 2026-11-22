import { describe, expect, it } from "vitest";

import { presendCopy } from "./presend-copy";

describe("presendCopy", () => {
  it("titles the send-spike and consent codes", () => {
    expect(presendCopy("SEND_SPIKE").title).toBe("Much bigger send than usual");
    expect(presendCopy("SEND_SPIKE_HOLD").title).toBe(
      "Sending is on hold after a spike"
    );
    expect(presendCopy("CONSENT_DATE_UNKNOWN").title).toBe(
      "Opt-in date unknown for some recipients"
    );
  });

  it("links the approval codes to the sending-approval settings", () => {
    for (const code of [
      "SENDING_APPROVAL_PENDING",
      "SENDING_APPROVAL_REJECTED",
      "HIGH_RISK_TIER_REVIEW",
    ]) {
      expect(presendCopy(code).href).toBe("/settings?tab=sending");
      expect(presendCopy(code).linkLabel).toBe("Sending approval");
    }
  });

  it("humanizes a code this build does not know", () => {
    expect(presendCopy("BRAND_NEW_CHECK").title).toBe("Brand new check");
  });
});
