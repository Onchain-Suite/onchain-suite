"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { isJsonObject } from "@/lib/utils";

import { request } from "../dm-send/dm-send.service";
import type { CampaignFormData } from "../validations";

export interface DiscordServer {
  id: string;
  name: string;
  channels: Array<{ id: string; name: string; announcement: boolean }>;
  roles: Array<{ id: string; name: string; mentionable: boolean }>;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Normalise GET /organization/integrations/discord/servers. */
export function toDiscordServers(raw: unknown): DiscordServer[] {
  const list =
    isJsonObject(raw) && Array.isArray(raw.servers) ? raw.servers : [];
  return list.filter(isJsonObject).map((s) => ({
    id: str(s.id),
    name: str(s.name) || str(s.id),
    channels: (Array.isArray(s.channels) ? s.channels : [])
      .filter(isJsonObject)
      .map((c) => ({
        id: str(c.id),
        name: str(c.name),
        announcement: c.announcement === true,
      }))
      .filter((c) => c.id),
    roles: (Array.isArray(s.roles) ? s.roles : [])
      .filter(isJsonObject)
      .map((r) => ({
        id: str(r.id),
        name: str(r.name),
        mentionable: r.mentionable === true,
      }))
      .filter((r) => r.id),
  }));
}

const NONE = "__none";

/**
 * Where a Discord campaign post goes and who it pings: a channel picked from
 * the bot's servers (or a pasted id when they can't be listed), crosspost to
 * following servers for an Announcement channel, and an explicit mention. An
 * opt-in role is the way to notify many members without DMing them.
 */
export function DiscordPostTarget({
  form,
}: {
  form: UseFormReturn<CampaignFormData>;
}) {
  const channelId = form.watch("discordChannelId") ?? "";
  const crosspost = form.watch("discordCrosspost") === true;
  const mention = form.watch("discordMention") ?? "none";
  const roleId = form.watch("discordMentionRoleId") ?? "";
  const set = (key: keyof CampaignFormData, value: unknown) =>
    form.setValue(key, value as never, { shouldDirty: true });

  const servers = useQuery({
    queryKey: ["discord", "servers"],
    retry: false,
    staleTime: 60_000,
    queryFn: async () =>
      toDiscordServers(
        await request({
          method: "GET",
          url: "/organization/integrations/discord/servers",
        })
      ),
  });

  const list = servers.data ?? [];
  const server =
    list.find((s) => s.channels.some((c) => c.id === channelId)) ?? list[0];
  const channel = server?.channels.find((c) => c.id === channelId);
  const role = server?.roles.find((r) => r.id === roleId);
  const canPick = list.some((s) => s.channels.length > 0);

  return (
    <div className="space-y-4">
      {canPick ? (
        <div className="space-y-1.5">
          <Label htmlFor="discord-channel">Channel</Label>
          <Select
            value={channel ? channel.id : NONE}
            onValueChange={(v) => {
              set("discordChannelId", v === NONE ? "" : v);
              const picked = list
                .flatMap((s) => s.channels)
                .find((c) => c.id === v);
              if (!picked?.announcement) set("discordCrosspost", false);
            }}
          >
            <SelectTrigger id="discord-channel" className="h-9">
              <SelectValue placeholder="Pick a channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Pick a channel</SelectItem>
              {list.flatMap((s) =>
                s.channels.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {list.length > 1 ? `${s.name} · ` : ""}#{c.name}
                    {c.announcement ? " (announcement)" : ""}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="discord-channel">Channel ID</Label>
          <Input
            id="discord-channel"
            inputMode="numeric"
            placeholder="e.g. 112233445566778899"
            value={channelId}
            onChange={(e) => set("discordChannelId", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {servers.isPending
              ? "Loading your servers…"
              : "Couldn't list your bot's servers. In Discord, turn on Developer Mode, right-click the channel and Copy Channel ID."}
          </p>
        </div>
      )}

      <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
        <div className="min-w-0 space-y-0.5">
          <Label htmlFor="discord-crosspost">
            Crosspost to following servers
          </Label>
          <p className="text-xs text-muted-foreground">
            {channel && !channel.announcement
              ? "Only Announcement channels can be crossposted."
              : "Publishes the post to every server that follows this channel. The bot needs Manage Messages there."}
          </p>
        </div>
        <Switch
          id="discord-crosspost"
          checked={crosspost}
          disabled={Boolean(channel && !channel.announcement)}
          onCheckedChange={(v) => set("discordCrosspost", v === true)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="discord-mention">Ping</Label>
          <Select
            value={mention}
            onValueChange={(v) => set("discordMention", v)}
          >
            <SelectTrigger id="discord-mention" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nobody</SelectItem>
              <SelectItem value="role">A role</SelectItem>
              <SelectItem value="everyone">@everyone</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {mention === "role" ? (
          <div className="space-y-1.5">
            <Label htmlFor="discord-role">Role</Label>
            {server && server.roles.length > 0 ? (
              <Select
                value={role ? role.id : NONE}
                onValueChange={(v) =>
                  set("discordMentionRoleId", v === NONE ? "" : v)
                }
              >
                <SelectTrigger id="discord-role" className="h-9">
                  <SelectValue placeholder="Pick a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Pick a role</SelectItem>
                  {server.roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      @{r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="discord-role"
                inputMode="numeric"
                placeholder="Role ID"
                value={roleId}
                onChange={(e) => set("discordMentionRoleId", e.target.value)}
              />
            )}
          </div>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {mention === "role"
          ? role && !role.mentionable
            ? `@${role.name} isn't mentionable, so it only pings if your bot has the Mention Everyone permission.`
            : "Pings only members with this role. Ask members to take an alerts role to hear about campaigns."
          : mention === "everyone"
            ? "Pings every member of the server. Use it sparingly."
            : "Nobody is pinged, even if the message says @everyone."}
      </p>
    </div>
  );
}
