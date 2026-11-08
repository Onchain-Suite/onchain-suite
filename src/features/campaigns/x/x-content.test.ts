import { describe, expect, it } from "vitest";

import { xContent, xPostOutcome, xPosts, xPostsCost } from "./x-content";

describe("xPosts / xContent", () => {
  it("saves a single post with no thread", () => {
    expect(
      xContent({
        xText: " gm ",
        xThreadRest: [],
        xDmText: "",
        xDelivery: "post",
      })
    ).toEqual({ text: "gm", dmText: "", delivery: "post" });
  });

  it("saves a thread in order, skipping empty posts", () => {
    expect(
      xContent({
        xText: "1/ Season 2",
        xThreadRest: ["", " 2/ details ", "3/ gm"],
        xDmText: "",
        xDelivery: "post",
      })
    ).toEqual({
      text: "1/ Season 2",
      dmText: "",
      delivery: "post",
      thread: ["1/ Season 2", "2/ details", "3/ gm"],
    });
    expect(xPosts({ xText: "", xThreadRest: ["only"] })).toEqual(["only"]);
  });
});

describe("xPostsCost", () => {
  it("charges a post with a link at the link rate", () => {
    expect(xPostsCost(["gm"])).toBe(0.015);
    expect(
      xPostsCost(["gm", "read https://acme.xyz/s2", "www.acme.xyz/x ok"])
    ).toBe(0.415);
    expect(xPostsCost([])).toBe(0);
  });
});

describe("xPostOutcome", () => {
  it("names a thread", () => {
    expect(xPostOutcome({ ok: true, posted: 3, total: 3 }).message).toBe(
      "Thread of 3 posted to X."
    );
    expect(xPostOutcome({ ok: true, posted: 1, total: 1 }).message).toBe(
      "Posted to X."
    );
  });

  it("says how far a broken thread got and how to finish it", () => {
    expect(xPostOutcome({ ok: false, posted: 2, total: 5 })).toEqual({
      level: "error",
      message:
        "Posted 2 of 5, then X refused the next one. Send again to post the rest.",
      done: false,
    });
  });

  it("passes X's reason through when nothing went up", () => {
    expect(
      xPostOutcome({
        ok: false,
        posted: 0,
        total: 1,
        reason: "Tweet is 300 characters",
      }).message
    ).toBe("Tweet is 300 characters");
  });
});
