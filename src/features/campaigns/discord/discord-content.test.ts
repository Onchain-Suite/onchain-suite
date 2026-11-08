import { describe, expect, it } from "vitest";

import { discordContent, restoreDiscord } from "./discord-content";
import { toDiscordServers } from "./discord-post-target";
import { discordPostOutcome } from "./discord-send";

describe("discordContent / restoreDiscord", () => {
  it("round-trips a crossposted post that pings a role", () => {
    const saved = discordContent({
      discordText: " Season 2 ",
      discordChannelId: "223344556677889900",
      discordDelivery: "post",
      discordCrosspost: true,
      discordMention: "role",
      discordMentionRoleId: "445566778899001122",
    });
    expect(saved).toEqual({
      text: "Season 2",
      channelId: "223344556677889900",
      delivery: "post",
      crosspost: true,
      mention: "role",
      mentionRoleId: "445566778899001122",
    });
    expect(restoreDiscord(saved)).toMatchObject({
      discordCrosspost: true,
      discordMention: "role",
      discordMentionRoleId: "445566778899001122",
    });
  });

  it("saves no role id unless a role is the mention", () => {
    expect(
      discordContent({
        discordText: "gm",
        discordChannelId: "1",
        discordDelivery: "post",
        discordCrosspost: false,
        discordMention: "none",
        discordMentionRoleId: "445566778899001122",
      })
    ).not.toHaveProperty("mentionRoleId");
  });

  it("restores nothing from junk", () => {
    expect(restoreDiscord("nope")).toBeNull();
    expect(restoreDiscord({ mention: "admins" })).toEqual({});
  });
});

describe("discordPostOutcome", () => {
  it("says a crosspost was refused, and why, without failing the post", () => {
    expect(
      discordPostOutcome({
        ok: true,
        crossposted: false,
        crosspostReason: "not_an_announcement_channel",
      })
    ).toEqual({
      level: "warning",
      message:
        "Posted to Discord, but not crossposted: it isn't an Announcement channel.",
      done: true,
    });
  });

  it("confirms a crosspost and reports a failed post", () => {
    expect(discordPostOutcome({ ok: true, crossposted: true }).message).toMatch(
      /crossposted to following servers/
    );
    expect(
      discordPostOutcome({ ok: false, reason: "Missing Access" })
    ).toMatchObject({
      level: "error",
      done: false,
    });
  });
});

describe("toDiscordServers", () => {
  it("keeps servers, channels and roles with ids", () => {
    expect(
      toDiscordServers({
        servers: [
          {
            id: "g1",
            name: "Acme",
            channels: [
              { id: "c1", name: "news", announcement: true },
              { name: "x" },
            ],
            roles: [{ id: "r1", name: "Alerts", mentionable: true }],
          },
        ],
      })
    ).toEqual([
      {
        id: "g1",
        name: "Acme",
        channels: [{ id: "c1", name: "news", announcement: true }],
        roles: [{ id: "r1", name: "Alerts", mentionable: true }],
      },
    ]);
    expect(toDiscordServers(null)).toEqual([]);
  });
});
