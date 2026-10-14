"use client";

import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CopyButton } from "@/components/common/copy-button";

import {
  explainTelegramError,
  type TelegramConnection,
  type TelegramOptInLink,
  telegramService,
} from "../../telegram.service";
import { useAccountOrg } from "../account/use-account-org";
import { SettingsCard, StatusPill } from "../settings-card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useMyOrgRole } from "@/shared/hooks/client/use-my-org-role";

const BOTFATHER_URL = "https://t.me/BotFather";

function botUsername(conn: TelegramConnection | null): string | null {
  if (!conn) return null;
  const c = conn.config;
  const raw = c.username ?? c.botUsername ?? c.handle;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

/**
 * Telegram channel. The customer brings their own bot (created in @BotFather);
 * we verify the token, point the bot at our webhook, and mint per-wallet opt-in
 * deep links. OWNER/ADMIN only - hidden for other roles rather than 403-ing.
 */
export function TelegramCard() {
  const { role } = useMyOrgRole();
  const canEdit = role === "OWNER" || role === "ADMIN";
  const { organizationId } = useAccountOrg();
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ["organization", "connections", "telegram", organizationId] as const,
    [organizationId]
  );

  const [botToken, setBotToken] = useState("");
  const [wallet, setWallet] = useState("");
  const [optInLink, setOptInLink] = useState<TelegramOptInLink | null>(null);

  const query = useQuery({
    queryKey,
    queryFn: () => telegramService.getConnection(organizationId ?? undefined),
    enabled: canEdit && Boolean(organizationId),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const activateMutation = useMutation({
    mutationFn: () => telegramService.activate(organizationId ?? undefined),
    onSuccess: () =>
      toast.success("Bot webhook registered — opt-ins will reach us."),
    onError: (e) =>
      toast.error(
        e instanceof Error ? e.message : "Couldn't activate the webhook."
      ),
  });

  const connectMutation = useMutation({
    mutationFn: (token: string) =>
      telegramService.connect(token, organizationId ?? undefined),
    onSuccess: (conn) => {
      invalidate();
      setBotToken("");
      if (conn.verified) {
        toast.success("Telegram bot connected and verified.");
        // Auto-register the webhook so opt-ins work immediately.
        activateMutation.mutate();
      } else {
        toast.warning(
          explainTelegramError(conn.lastError) ??
            conn.lastError ??
            "Saved, but Telegram didn't accept the token."
        );
      }
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't connect the bot."),
  });

  const optInMutation = useMutation({
    mutationFn: (walletAddress: string) =>
      telegramService.createOptInLink(
        walletAddress,
        organizationId ?? undefined
      ),
    onSuccess: (link) => setOptInLink(link),
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't create the link."),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => telegramService.disconnect(organizationId ?? undefined),
    onSuccess: () => {
      invalidate();
      setOptInLink(null);
      toast.success("Telegram bot disconnected.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't disconnect."),
  });

  if (!canEdit) return null;

  const conn = query.data ?? null;
  const connected = Boolean(conn);
  const verified = Boolean(conn?.verified);
  const username = botUsername(conn);

  const statusPill = !connected ? (
    <StatusPill tone="neutral">Not connected</StatusPill>
  ) : verified ? (
    <StatusPill tone="success">Connected</StatusPill>
  ) : (
    <StatusPill tone="pending">Saved — not verified</StatusPill>
  );

  return (
    <SettingsCard
      id="telegram"
      title="Telegram"
      description="Send campaigns and automations to wallets on Telegram, through your own bot."
      action={statusPill}
    >
      <div className="space-y-5">
        {/* Connect / re-connect the bot token */}
        {!verified ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              Create a bot in{" "}
              <a
                href={BOTFATHER_URL}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline underline-offset-2"
              >
                @BotFather
              </a>{" "}
              (send <code className="rounded bg-background px-1">/newbot</code>
              ), then paste the token it gives you.
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tg-token">Bot token</Label>
              <div className="flex gap-2">
                <Input
                  id="tg-token"
                  type="password"
                  autoComplete="off"
                  placeholder="123456789:AA..."
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
                  {explainTelegramError(conn.lastError) ?? conn.lastError}
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
                {username ? (
                  <>
                    {" "}
                    to <strong>@{username}</strong>
                  </>
                ) : null}{" "}
                — the token verified with Telegram.
              </span>
            </div>

            {/* Opt-in deep link for a wallet */}
            <div className="space-y-1.5">
              <Label htmlFor="tg-wallet">
                Generate an opt-in link for a wallet
              </Label>
              <div className="flex gap-2">
                <Input
                  id="tg-wallet"
                  placeholder="0x… or Solana address"
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                />
                <Button
                  variant="secondary"
                  onClick={() => optInMutation.mutate(wallet.trim())}
                  disabled={
                    wallet.trim().length === 0 || optInMutation.isPending
                  }
                >
                  {optInMutation.isPending ? "Creating…" : "Create link"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share the link with that wallet’s owner. Opening it and pressing
                Start in Telegram links their chat so you can message them.
              </p>
            </div>

            {optInLink ? (
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 p-2">
                <PaperAirplaneIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <code className="min-w-0 flex-1 truncate text-xs">
                  {optInLink.url}
                </code>
                <CopyButton value={optInLink.url} label="Copy link" />
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => activateMutation.mutate()}
                disabled={activateMutation.isPending}
              >
                {activateMutation.isPending
                  ? "Re-registering…"
                  : "Re-register webhook"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-rose-600 hover:text-rose-600 dark:text-rose-400"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
              >
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </div>
    </SettingsCard>
  );
}
