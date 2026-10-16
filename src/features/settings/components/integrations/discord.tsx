"use client";

import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  type DiscordConnection,
  discordService,
  explainDiscordError,
} from "../../discord.service";
import { useAccountOrg } from "../account/use-account-org";
import { SettingsCard, StatusPill } from "../settings-card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useMyOrgRole } from "@/shared/hooks/client/use-my-org-role";

const DISCORD_APPS_URL = "https://discord.com/developers/applications";

function botName(conn: DiscordConnection | null): string | null {
  if (!conn) return null;
  const c = conn.config;
  const raw = c.botName ?? c.botUsername;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

/**
 * Discord channel. The customer brings their own bot (created in the Discord
 * Developer Portal); we verify the token with `GET /users/@me`. For a broadcast
 * there is no opt-in/webhook step — the bot just needs to be a member of the
 * target server, and the channel id is chosen per campaign. OWNER/ADMIN only.
 */
export function DiscordCard() {
  const { role } = useMyOrgRole();
  const canEdit = role === "OWNER" || role === "ADMIN";
  const { organizationId } = useAccountOrg();
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ["organization", "connections", "discord", organizationId] as const,
    [organizationId]
  );

  const [botToken, setBotToken] = useState("");

  const query = useQuery({
    queryKey,
    queryFn: () => discordService.getConnection(organizationId ?? undefined),
    enabled: canEdit && Boolean(organizationId),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const connectMutation = useMutation({
    mutationFn: (token: string) =>
      discordService.connect(token, organizationId ?? undefined),
    onSuccess: (conn) => {
      invalidate();
      setBotToken("");
      if (conn.verified) {
        toast.success("Discord bot connected and verified.");
      } else {
        toast.warning(
          explainDiscordError(conn.lastError) ??
            conn.lastError ??
            "Saved, but Discord didn't accept the token."
        );
      }
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't connect the bot."),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => discordService.disconnect(organizationId ?? undefined),
    onSuccess: () => {
      invalidate();
      toast.success("Discord disconnected.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't disconnect."),
  });

  if (!canEdit) return null;

  const conn = query.data ?? null;
  const connected = Boolean(conn);
  const verified = Boolean(conn?.verified);
  const name = botName(conn);

  const statusPill = !connected ? (
    <StatusPill tone="neutral">Not connected</StatusPill>
  ) : verified ? (
    <StatusPill tone="success">Connected</StatusPill>
  ) : (
    <StatusPill tone="pending">Saved — not verified</StatusPill>
  );

  return (
    <SettingsCard
      id="discord"
      title="Discord"
      description="Broadcast campaigns and automations to a Discord channel, through your own bot."
      action={statusPill}
    >
      <div className="space-y-5">
        {!verified ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              Create an app in the{" "}
              <a
                href={DISCORD_APPS_URL}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline underline-offset-2"
              >
                Discord Developer Portal
              </a>
              , add a Bot, then paste its token here. Invite the bot to your
              server so it can post.
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="discord-token">Bot token</Label>
              <div className="flex gap-2">
                <Input
                  id="discord-token"
                  type="password"
                  autoComplete="off"
                  placeholder="MTA1..."
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                />
                <Button
                  onClick={() => connectMutation.mutate(botToken.trim())}
                  disabled={
                    botToken.trim().length === 0 || connectMutation.isPending
                  }
                >
                  {connectMutation.isPending ? "Connecting…" : "Connect"}
                </Button>
              </div>
            </div>
            {conn && !verified && conn.lastError ? (
              <p className="flex items-start gap-1.5 text-sm text-amber-600 dark:text-amber-400">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {explainDiscordError(conn.lastError) ?? conn.lastError}
                </span>
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
              <span>
                Connected
                {name ? (
                  <>
                    {" "}
                    as <strong>{name}</strong>
                  </>
                ) : null}{" "}
                — the token verified with Discord.
              </span>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              To broadcast, pick the target <strong>channel ID</strong> in the
              campaign composer. (Enable Developer Mode in Discord, right-click
              a channel → Copy Channel ID. The bot must be in that server.)
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? "Disconnecting…" : "Disconnect"}
            </Button>
          </div>
        )}
      </div>
    </SettingsCard>
  );
}
