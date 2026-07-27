import { describe, expect, it } from "vitest";

import type { Segment } from "../types";
import { partitionAudienceSelection, tagSelectionId } from "./audience";

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

    // PUT /campaigns/{id}/audience accepts { profileIds, segmentIds } only.
    expect(Object.keys(result).sort()).toEqual([
      "profileIds",
      "segmentIds",
      "tagNames",
    ]);
  });
});
