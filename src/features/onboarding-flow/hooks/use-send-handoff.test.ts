import { describe, expect, it, vi } from "vitest";

import {
  HANDOFF_SEATS_FULL_MESSAGE,
  handoffFailureMessage,
} from "./use-send-handoff";
import {
  INVITE_RATE_LIMIT_MESSAGE,
  isSeatLimitError,
  OrganizationMembersError,
} from "@/features/settings/organization-members.service";

vi.mock("@/lib/api-client", () => ({ apiClient: { request: vi.fn() } }));
vi.mock("@/lib/auth-client", () => ({
  authClient: { getSession: vi.fn() },
  useSession: () => ({ data: null }),
}));

const seatsFull = new OrganizationMembersError(
  "The Launch plan allows 2 seats; this action would use 3. Upgrade to raise the limit.",
  402,
  undefined,
  "seats"
);

describe("isSeatLimitError", () => {
  it("recognises the seat limit, with or without the limit named", () => {
    expect(isSeatLimitError(seatsFull)).toBe(true);
    expect(isSeatLimitError(new OrganizationMembersError("x", 402))).toBe(true);
  });

  it("does not mistake another plan limit or another failure for it", () => {
    expect(
      isSeatLimitError(
        new OrganizationMembersError("x", 402, undefined, "automations")
      )
    ).toBe(false);
    expect(isSeatLimitError(new OrganizationMembersError("x", 429))).toBe(
      false
    );
    expect(isSeatLimitError(new Error("x"))).toBe(false);
  });
});

describe("handoffFailureMessage", () => {
  // The backend says "Upgrade to raise the limit", which cannot be done from
  // inside the wizard.
  it("sends them to finish setup and add a seat when seats are full", () => {
    const message = handoffFailureMessage(seatsFull);
    expect(message).toBe(HANDOFF_SEATS_FULL_MESSAGE);
    expect(message).toMatch(/Finish or skip setup/);
    expect(message).not.toMatch(/Upgrade/);
  });

  it("keeps the rate limit and other reasons as they are", () => {
    expect(
      handoffFailureMessage(new OrganizationMembersError("slow down", 429))
    ).toBe(INVITE_RATE_LIMIT_MESSAGE);
    expect(handoffFailureMessage(new Error("User is already a member"))).toBe(
      "User is already a member"
    );
    expect(handoffFailureMessage("nope")).toBe("Failed to send the invite.");
  });
});
