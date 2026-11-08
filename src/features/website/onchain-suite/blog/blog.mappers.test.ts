import { describe, expect, it } from "vitest";

import { toAuthor } from "./blog.mappers";
import type { Media, User } from "@/payload-types";

const user = (avatar: User["avatar"]) =>
  ({
    id: 7,
    name: "Ada Aborode",
    bio: "Growth lead",
    farcaster: "ada",
    x: "ada",
    walletAddress: null,
    avatar,
  }) as unknown as User;

describe("toAuthor", () => {
  it("keeps a populated avatar, which needs the article read at depth 2", () => {
    const photo = { id: 3, url: "/media/ada.jpg", alt: "Ada" } as Media;
    expect(toAuthor(user(photo))?.avatar).toBe(photo);
  });

  it("treats an unpopulated avatar (a bare id, as at depth 1) as no photo", () => {
    expect(toAuthor(user(3))?.avatar).toBeNull();
  });
});
