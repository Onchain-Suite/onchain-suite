"use client";

import { useQuery } from "@tanstack/react-query";

import { campaignsService } from "../campaigns.service";
import type { CampaignChannel } from "../validations";

/**
 * Maps a wizard channel to its backend connector key. Email and in-app push are
 * not gated here: email is always available, and push has its own readiness
 * check (`useInAppReadiness`).
 */
const CONNECTOR_FOR: Partial<Record<CampaignChannel, string>> = {
  telegram: "telegram",
  discord: "discord",
  whatsapp: "whatsapp",
  x: "x",
  farcaster: "farcaster",
};

/**
 * The org's connected channels, as a per-channel "is this usable?" check.
 * A channel is usable only when its connection is present AND verified. Used to
 * enable/disable channel cards in the wizard and to block launch.
 */
export function useChannelConnections() {
  const query = useQuery({
    queryKey: ["campaigns", "channel-connections"],
    queryFn: () => campaignsService.getChannelConnections(),
  });

  const verified = new Set(
    (query.data ?? [])
      .filter((c) => c.verified)
      .map((c) => c.connector.toLowerCase())
  );

  const isConnected = (channel: CampaignChannel): boolean => {
    const connector = CONNECTOR_FOR[channel];
    if (!connector) return true;
    return verified.has(connector);
  };

  return {
    isConnected,
    loading: query.isLoading,
    connections: query.data ?? [],
  } as const;
}
