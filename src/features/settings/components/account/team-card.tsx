"use client";

import { PlusIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";

import { usePagination } from "../../hooks/use-pagination";
import { ListPager } from "../list-pager";
import { SettingsCard } from "../settings-card";
import { BILLING_HREF, TeamSeats } from "./team-seats";
import { useAccountOrg } from "./use-account-org";
import { billingService } from "@/features/billing/billing.service";
import {
  includedSeatsForPlan,
  seatUsage,
} from "@/features/billing/seat-pricing";
import {
  type AssignableRole,
  isSeatLimitError,
  organizationMembersService,
  SEATS_FULL_MESSAGE,
} from "@/features/settings/organization-members.service";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";

const ROLES: AssignableRole[] = ["ADMIN", "EDITOR", "VIEWER"];

const TEAM_PER_PAGE = 5;

const membersKey = (orgId: string | null) =>
  ["account", "members", orgId] as const;

export function TeamCard() {
  const { organizationId } = useAccountOrg();
  const queryClient = useQueryClient();
  const [inviting, setInviting] = useState(false);
  const [draft, setDraft] = useState<{ email: string; role: AssignableRole }>({
    email: "",
    role: "EDITOR",
  });

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

  // Seat usage. Prefer the backend's seats meter; fall back to counting members
  // + pending invites against the plan's included allowance so the card still
  // shows "X of Y" before the meter is populated.
  const planUsageQuery = useQuery({
    queryKey: ["billing", "plan-usage", organizationId],
    enabled: Boolean(organizationId),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
    queryFn: () => billingService.getPlanUsage(organizationId ?? undefined),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: membersKey(organizationId) });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization selected");
      const email = draft.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Enter a valid email address");
      }
      return organizationMembersService.createInvite(organizationId, {
        email,
        role: draft.role,
      });
    },
    onSuccess: async () => {
      await invalidate();
      setInviting(false);
      setDraft({ email: "", role: "EDITOR" });
      toast.success("Invite sent");
    },
    onError: (e: unknown) => {
      // Someone else may have taken the last seat since this card loaded: say
      // where a seat is added, and re-read so the card shows it as full.
      if (isSeatLimitError(e)) {
        toast.error(SEATS_FULL_MESSAGE);
        invalidate().catch(() => undefined);
        return;
      }
      toast.error(e instanceof Error ? e.message : "Failed to send invite");
    },
  });

  const roleMutation = useMutation({
    mutationFn: (input: { userId: string; role: AssignableRole }) => {
      if (!organizationId) throw new Error("No organization selected");
      return organizationMembersService.updateMember(
        organizationId,
        input.userId,
        { role: input.role }
      );
    },
    onSuccess: async () => {
      await invalidate();
      toast.success("Role updated");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to update role"),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => {
      if (!organizationId) throw new Error("No organization selected");
      return organizationMembersService.removeMember(organizationId, userId);
    },
    onSuccess: async () => {
      await invalidate();
      toast.success("Member removed");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to remove member"),
  });

  const resendMutation = useMutation({
    mutationFn: (inviteId: string) => {
      if (!organizationId) throw new Error("No organization selected");
      return organizationMembersService.resendInvite(organizationId, inviteId);
    },
    onSuccess: () => toast.success("Invite resent"),
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to resend invite"),
  });

  const cancelMutation = useMutation({
    mutationFn: (inviteId: string) =>
      apiClient.delete(`/organizations/${organizationId}/invites/${inviteId}`, {
        headers: { "x-org-id": organizationId ?? "" },
      }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Invite cancelled");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to cancel invite"),
  });

  const members = useMemo(
    () => membersQuery.data?.members ?? [],
    [membersQuery.data]
  );
  const invites = useMemo(
    () => membersQuery.data?.invites ?? [],
    [membersQuery.data]
  );
  const isEmpty =
    !membersQuery.isLoading && members.length === 0 && invites.length === 0;

  // Members and pending invites share one paginated roster (members first),
  // each row tagged so the list can render the right controls per kind.
  const teamRows = useMemo(
    () => [
      ...members.map((member) => ({ kind: "member" as const, member })),
      ...invites.map((invite) => ({ kind: "invite" as const, invite })),
    ],
    [members, invites]
  );
  const pager = usePagination(teamRows, TEAM_PER_PAGE);

  // Seats are bought ahead (the plan's, plus any added in Billing) and the
  // backend refuses an invite once members and pending invites fill them.
  // Pending invites are not in the backend's meter, so they are added here.
  const seatMeter = planUsageQuery.data?.meters?.seats;
  const seats = seatUsage({
    members: seatMeter?.used ?? members.length,
    pendingInvites: invites.length,
    limit:
      seatMeter?.limit ??
      (planUsageQuery.data?.plan
        ? includedSeatsForPlan(planUsageQuery.data.plan)
        : undefined),
  });
  const seatsFull = seats?.isFull === true;

  return (
    <SettingsCard
      replayBlock
      title="Team"
      description="Access and member roles"
      action={
        seatsFull ? (
          // No seat to give: the next step is adding one, not an invite the
          // backend would refuse.
          <Button size="sm" asChild>
            <Link href={BILLING_HREF}>Add a seat</Link>
          </Button>
        ) : !inviting ? (
          <Button
            size="sm"
            onClick={() => setInviting(true)}
            disabled={!organizationId}
          >
            <PlusIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
            Invite member
          </Button>
        ) : null
      }
    >
      {seats ? (
        <TeamSeats usage={seats} pendingInvites={invites.length} />
      ) : null}

      {inviting && !seatsFull ? (
        <form
          className="mb-4 grid gap-3 rounded-xl border border-border/60 bg-background/40 p-4 sm:grid-cols-[1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            inviteMutation.mutate();
          }}
        >
          <Input
            type="email"
            value={draft.email}
            onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
            placeholder="teammate@company.com"
          />
          <Select
            value={draft.role}
            onValueChange={(v) =>
              setDraft((d) => ({ ...d, role: v as AssignableRole }))
            }
          >
            <SelectTrigger className="sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {role.charAt(0) + role.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? "Sending…" : "Send invite"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setInviting(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

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
          {pager.items.map((row) => {
            if (row.kind === "member") {
              const { member } = row;
              return (
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
                    {member.role === "OWNER" ? (
                      <span className="rounded-full border border-border/70 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        Owner
                      </span>
                    ) : (
                      <>
                        <Select
                          value={member.role}
                          onValueChange={(v) =>
                            roleMutation.mutate({
                              userId: member.userId,
                              role: v as AssignableRole,
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role.charAt(0) + role.slice(1).toLowerCase()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMutation.mutate(member.userId)}
                          disabled={removeMutation.isPending}
                        >
                          Remove
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              );
            }
            const { invite } = row;
            return (
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
                      Pending · {invite.roleLabel}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resendMutation.mutate(invite.id)}
                    disabled={resendMutation.isPending}
                  >
                    Resend
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => cancelMutation.mutate(invite.id)}
                    disabled={cancelMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <ListPager pagination={pager} label="teammates" />
    </SettingsCard>
  );
}

export default TeamCard;
