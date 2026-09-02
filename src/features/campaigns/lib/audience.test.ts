import { describe, expect, it } from "vitest";

import type { Segment } from "../types";
import {
  parseReachable,
  partitionAudienceSelection,
  reachabilityGate,
  reachChannelCount,
  tagSelectionId,
} from "./audience";

const SEGMENTS: Segment[] = [
  { id: "seg_1", name: "New subscribers", count: 42, starred: false },
];

describe("partitionAudienceSelection", () => {
  it("routes a contact id to profileIds even with no profile list supplied", () => {
    // The wizard's Continue save cannot supply the loaded contacts. When
    // unknown ids fell into a `listIds` bucket the backend ignored them, so
    // a contact-only campaign launched with an empty audience.
    const result = partitionAudienceSelection(["profile_abc"], SEGMENTS);

    expect(result.profileIds).toEqual(["profile_abc"]);
    expect(result.segmentIds).toEqual([]);
  });

  it("keeps segments and contacts in their own buckets", () => {
    const result = partitionAudienceSelection(
      ["profile_abc", "seg_1", "profile_def"],
      SEGMENTS
    );

    expect(result.profileIds).toEqual(["profile_abc", "profile_def"]);
    expect(result.segmentIds).toEqual(["seg_1"]);
  });

  it("extracts tag selections without treating them as profiles", () => {
    const result = partitionAudienceSelection(
      [tagSelectionId("vip"), "profile_abc"],
      SEGMENTS
    );

    expect(result.tagNames).toEqual(["vip"]);
    expect(result.profileIds).toEqual(["profile_abc"]);
  });

  it("ignores an empty tag name", () => {
    const result = partitionAudienceSelection(["tag:"], SEGMENTS);

    expect(result.tagNames).toEqual([]);
    expect(result.profileIds).toEqual([]);
  });

  it("never emits a bucket the audience endpoint would discard", () => {
    const result = partitionAudienceSelection(["profile_abc", "seg_1"], []);

    // PUT /campaigns/{id}/audience accepts { all, profileIds, segmentIds,
    // tagNames } - `all` was added with all-contacts targeting.
    expect(Object.keys(result).sort()).toEqual([
      "all",
      "profileIds",
      "segmentIds",
      "tagNames",
    ]);
  });
});

describe("reachabilityGate", () => {
  it("does not gate a row with no reachability data (undefined)", () => {
    expect(reachabilityGate(undefined, true)).toEqual({});
    expect(reachabilityGate(undefined, false)).toEqual({});
  });

  it("allows a row reachable on the current channel", () => {
    expect(reachabilityGate(["email", "push"], true)).toEqual({});
    expect(reachabilityGate(["email", "push"], false)).toEqual({});
    expect(reachabilityGate(["push"], true)).toEqual({});
    expect(reachabilityGate(["email"], false)).toEqual({});
  });

  it("disables an email-only group on an in-app push campaign", () => {
    expect(reachabilityGate(["email"], true)).toEqual({
      disabled: true,
      disabledHint: "No wallets",
    });
  });

  it("NEVER gates an email campaign - the reachableVia email signal under-counts", () => {
    // Even a group whose reachableVia is push-only stays selectable on email:
    // the "email" entry is unreliable (imported contacts read as not-reachable),
    // so we don't block email lists on it. The send estimate is the authority.
    expect(reachabilityGate(["push"], false)).toEqual({});
    expect(reachabilityGate([], false)).toEqual({});
    expect(reachabilityGate(["email"], false)).toEqual({});
  });

  it("does NOT gate an empty reachableVia on push (unknown, not 'no wallets')", () => {
    expect(reachabilityGate([], true)).toEqual({});
  });
});

describe("parseReachable", () => {
  it("reads a full { email, push } pair", () => {
    expect(parseReachable({ reachable: { email: 3, push: 10 } })).toEqual({
      email: 3,
      push: 10,
    });
  });

  it("treats an individually omitted field as 0", () => {
    expect(parseReachable({ reachable: { push: 10 } })).toEqual({
      email: 0,
      push: 10,
    });
  });

  it("returns undefined for a fail-soft null so the caller keeps the total", () => {
    expect(parseReachable({ reachable: null })).toBeUndefined();
  });

  it("returns undefined when reachable is absent or non-numeric", () => {
    expect(parseReachable({ count: 5 })).toBeUndefined();
    expect(parseReachable({ reachable: { email: "3" } })).toBeUndefined();
    expect(parseReachable(null)).toBeUndefined();
  });
});

describe("reachChannelCount", () => {
  const reach = { email: 3, push: 10 };

  it("picks push vs email by channel", () => {
    expect(reachChannelCount(reach, true)).toBe(10);
    expect(reachChannelCount(reach, false)).toBe(3);
  });

  it("preserves a genuine 0 (must be combined with ??, not ||)", () => {
    expect(reachChannelCount({ email: 0, push: 10 }, false)).toBe(0);
  });

  it("returns null when there is no reachable, so the caller falls back", () => {
    expect(reachChannelCount(undefined, true)).toBeNull();
    expect(reachChannelCount(null, false)).toBeNull();
  });
});
