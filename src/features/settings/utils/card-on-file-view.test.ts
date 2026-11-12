import { describe, expect, it } from "vitest";

import { cardOnFileView } from "./card-on-file-view";

describe("cardOnFileView", () => {
  // A subscriber who paid by card saw "No card on file" and an "Add card"
  // button, as though nothing would be charged at renewal.
  it("shows the card a subscription renews on, and sends changes to Stripe", () => {
    expect(
      cardOnFileView({
        hasCard: true,
        brand: "Visa",
        last4: "4242",
        since: null,
        source: "subscription",
      })
    ).toEqual({
      hasCard: true,
      savedWithUs: false,
      description: "The card your subscription renews on.",
      title: "Visa •••• 4242",
      pill: "Pays your subscription",
      note: "Stripe charges this card when your plan renews. Change it in Stripe billing.",
      action: "portal",
      actionLabel: "Change card",
    });
  });

  it("shows a card saved with us as on file, replaceable here", () => {
    expect(
      cardOnFileView({
        hasCard: true,
        brand: "mastercard",
        last4: "4444",
        since: "2026-11-12T12:00:00.000Z",
      })
    ).toMatchObject({
      hasCard: true,
      savedWithUs: true,
      title: "Mastercard •••• 4444",
      pill: "On file",
      note: "Added Nov 12, 2026",
      action: "save",
      actionLabel: "Update card",
    });
  });

  it("offers to add a card when there is none", () => {
    for (const none of [undefined, null, {}, { hasCard: false }]) {
      expect(cardOnFileView(none)).toMatchObject({
        hasCard: false,
        savedWithUs: false,
        title: "No card on file",
        pill: null,
        action: "save",
        actionLabel: "Add card",
      });
    }
  });

  // hasCard false wins: a source alone is not a card.
  it("does not show a card that the server says is not there", () => {
    expect(
      cardOnFileView({ hasCard: false, source: "subscription", last4: "4242" })
        .title
    ).toBe("No card on file");
  });

  it("fills in what is missing rather than printing nothing", () => {
    expect(cardOnFileView({ hasCard: true }).title).toBe("Card •••• ----");
    expect(
      cardOnFileView({ hasCard: true, brand: " ", last4: " " }).title
    ).toBe("Card •••• ----");
    expect(
      cardOnFileView({ hasCard: true, since: "not a date" }).note
    ).toBeNull();
  });

  it("treats a source it does not know as a card saved with us", () => {
    expect(
      cardOnFileView({ hasCard: true, source: "something-new" })
    ).toMatchObject({ savedWithUs: true, action: "save" });
  });
});
