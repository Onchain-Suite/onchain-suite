"use client";

import { PlusIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import InviteUser from "../invite-user";
import { SettingsCard, StatusPill } from "../settings-card";
import { useAccountOrg } from "./use-account-org";
import { organizationMembersService } from "@/features/settings/organization-members.service";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

const membersKey = (orgId: string | null) =>
  ["account", "members", orgId] as const;

export function TeamCard() {
  const { organizationId } = useAccountOrg();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);

  const membersQuery = useQuery({
    queryKey: membersKey(organizationId),
    enabled: Boolean(organizationId),
    retry: false,
    queryFn: async () => {
      if (!organizationId) return { members: [], invites: [] };
      const [members, invites] = await Promise.all([
        organizationMembersService.listMembers(organizationId).catch(() => []),
        organizationMembersService.listInvites(organizationId).catch(() => []),
      ]);
      return { members, invites };
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: membersKey(organizationId) });

  const removeMutation = useMutation({
    mutationFn: (userId: string) =>
      organizationMembersService.removeMember(organizationId!, userId),
    onSuccess: async () => {
      await invalidate();
      toast.success("Member removed");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to remove member"),
  });

  const cancelInviteMutation = useMutation({
    mutationFn: (inviteId: string) =>
      organizationMembersService.resendInvite(organizationId!, inviteId),
    onSuccess: () => toast.success("Invite resent"),
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to resend invite"),
  });

  const members = membersQuery.data?.members ?? [];
  const invites = membersQuery.data?.invites ?? [];
  const isEmpty =
    !membersQuery.isLoading && members.length === 0 && invites.length === 0;

  return (
    <SettingsCard
      title="Team"
      description="Access and member roles"
      action={
        <Button
          size="sm"
          onClick={() => setInviteOpen(true)}
          disabled={!organizationId}
        >
          <PlusIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
          Invite member
        </Button>
      }
    >
      {membersQuery.isLoading ? (
        <div className="space-y-3">
          {["a", "b"].map((k) => (
            <Skeleton key={k} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-background/40 px-6 py-10 text-center">
          <p className="text-sm font-semibold text-foreground">
            No team members yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite teammates to collaborate on segments, campaigns, and sending.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border/50">
          {members.map((member) => (
            <li
              key={member.userId}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">
                  {(member.name || member.email).charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">
                    {member.name || member.email}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {member.email}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusPill tone="neutral">{member.roleLabel}</StatusPill>
                {member.role !== "OWNER" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMutation.mutate(member.userId)}
                    disabled={removeMutation.isPending}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                  {invite.email.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">
                    {invite.email}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    Pending invite
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusPill tone="pending">{invite.roleLabel}</StatusPill>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => cancelInviteMutation.mutate(invite.id)}
                  disabled={cancelInviteMutation.isPending}
                >
                  Resend
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <InviteUser
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSuccess={invalidate}
      />
    </SettingsCard>
  );
}

export default TeamCard;
