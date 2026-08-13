"use client";

import {
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

import type {
  AudienceProfile,
  AudienceSegmentMember,
} from "../audience.service";
import {
  extractWalletFields,
  formatUsd,
  isAddressLike,
  isSyntheticWalletEmail,
  lifetimeUsd,
  readChannels,
} from "../utils";

/** Shared, normalized member shape for the tag/list detail member tables. */
export interface DetailMember {
  id: string;
  name?: string;
  email?: string;
  walletFull: string;
  walletShort: string;
  emailReachable: boolean;
  pushReachable: boolean;
  /** Real on-chain lifetime USD when the API returned it, else null. */
  lifetimeUsd: number | null;
}

export function toDetailMemberFromProfile(p: AudienceProfile): DetailMember {
  const { walletFull, wallet } = extractWalletFields(p);
  const rawEmail = typeof p.email === "string" ? p.email : undefined;
  const email =
    rawEmail && !isSyntheticWalletEmail(rawEmail) ? rawEmail : undefined;
  const nameField = typeof p.name === "string" ? p.name.trim() : "";
  const name = nameField && !isAddressLike(nameField) ? nameField : undefined;
  const verified = p.status === "verified";
  // Prefer the server's real per-channel reachability; fall back to a heuristic
  // only when the API didn't return a `channels` object.
  const channels = readChannels(p);
  return {
    id: p.id,
    name,
    email,
    walletFull,
    walletShort: wallet,
    emailReachable: channels
      ? Boolean(channels.email)
      : Boolean(email) || (verified && Boolean(walletFull)),
    pushReachable: channels ? Boolean(channels.inapp) : Boolean(walletFull),
    lifetimeUsd: lifetimeUsd(p),
  };
}

export function toDetailMemberFromSegment(
  m: AudienceSegmentMember
): DetailMember {
  const walletFull = typeof m.walletAddress === "string" ? m.walletAddress : "";
  const walletShort = walletFull
    ? `${walletFull.slice(0, 6)}…${walletFull.slice(-4)}`
    : "";
  const rawEmail = typeof m.email === "string" ? m.email : undefined;
  const email =
    rawEmail && !isSyntheticWalletEmail(rawEmail) ? rawEmail : undefined;
  return {
    id: m.id,
    name: typeof m.name === "string" ? m.name : undefined,
    email,
    walletFull,
    walletShort,
    emailReachable: Boolean(m.emailReachable) || Boolean(email),
    pushReachable: Boolean(m.pushReachable),
    lifetimeUsd: lifetimeUsd(m),
  };
}

export function MemberTable({ members }: { members: DetailMember[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-5 py-3 font-medium">Contact</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Reachable via</th>
            <th className="px-4 py-3 text-right font-medium">Lifetime</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="border-b border-border last:border-0">
              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  {m.name ? (
                    <span className="font-medium text-foreground">
                      {m.name}
                    </span>
                  ) : null}
                  {m.walletShort ? (
                    <span className="font-mono text-xs text-muted-foreground">
                      {m.walletShort}
                    </span>
                  ) : !m.name ? (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <EnvelopeIcon className="size-4" aria-hidden="true" />
                      No wallet
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-4">
                {m.email ? (
                  <span className="font-mono text-xs text-foreground">
                    {m.email}
                  </span>
                ) : m.walletFull ? (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <ShieldCheckIcon
                      className="size-4 text-primary"
                      aria-hidden="true"
                    />
                    ZK-protected
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-1.5">
                  {m.emailReachable ? (
                    <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <EnvelopeIcon className="size-4" aria-hidden="true" />
                    </span>
                  ) : null}
                  {m.pushReachable ? (
                    <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <DevicePhoneMobileIcon
                        className="size-4"
                        aria-hidden="true"
                      />
                    </span>
                  ) : null}
                  {!m.emailReachable && !m.pushReachable ? (
                    <span className="text-muted-foreground">-</span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-4 text-right tabular-nums text-foreground">
                {typeof m.lifetimeUsd === "number"
                  ? formatUsd(m.lifetimeUsd)
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
