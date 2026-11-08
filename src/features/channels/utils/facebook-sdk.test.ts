import { describe, expect, it } from "vitest";

import { readSignupMessage } from "./facebook-sdk";

const msg = (event: string, data: Record<string, unknown> = {}) =>
  JSON.stringify({ type: "WA_EMBEDDED_SIGNUP", event, data });

describe("readSignupMessage", () => {
  it("reads the account ids when signup finishes", () => {
    expect(
      readSignupMessage(
        "https://www.facebook.com",
        msg("FINISH", {
          waba_id: "102290129340398",
          phone_number_id: "106540352242922",
        })
      )
    ).toEqual({
      kind: "finish",
      wabaId: "102290129340398",
      phoneNumberId: "106540352242922",
    });
  });

  it("trusts only facebook.com", () => {
    const data = msg("FINISH", { waba_id: "1", phone_number_id: "2" });
    expect(readSignupMessage("https://evil.example", data)).toBeNull();
    expect(
      readSignupMessage("https://facebook.com.evil.example", data)
    ).toBeNull();
    expect(readSignupMessage("not a url", data)).toBeNull();
    expect(readSignupMessage("https://web.facebook.com", data)).not.toBeNull();
  });

  it("ignores unrelated messages and reports cancels and errors", () => {
    expect(
      readSignupMessage("https://www.facebook.com", "{not json")
    ).toBeNull();
    expect(
      readSignupMessage(
        "https://www.facebook.com",
        JSON.stringify({ type: "OTHER" })
      )
    ).toBeNull();
    expect(
      readSignupMessage(
        "https://www.facebook.com",
        msg("CANCEL", { current_step: "PHONE_NUMBER_SETUP" })
      )
    ).toEqual({
      kind: "cancel",
      step: "PHONE_NUMBER_SETUP",
    });
    expect(
      readSignupMessage(
        "https://www.facebook.com",
        msg("ERROR", { error_message: "Business not verified" })
      )
    ).toEqual({
      kind: "error",
      message: "Business not verified",
    });
    expect(
      readSignupMessage(
        "https://www.facebook.com",
        msg("FINISH", { waba_id: "1" })
      )
    ).toMatchObject({ kind: "error" });
  });
});
