"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { authClient } from "@/lib/auth-client";

import { completionService, type OnboardingState } from "../completion.service";
import {
  hasCompleteCookie,
  isOnboardingDone,
  isServerConfirmed,
  markCompleteOnDevice,
  markServerConfirmed,
  readPendingCompletion,
  shouldRepairServer,
} from "../utils/completion";
import { useWorkspaceMode } from "./use-workspace-mode";

export const onboardingStateKey = (userId: string | undefined) =>
  ["onboarding", "state", userId ?? ""] as const;

interface DeviceRecord {
  cookie: boolean;
  pending: boolean;
  confirmed: boolean;
}

/**
 * Whether the signed-in person has finished onboarding, and the upkeep that
 * keeps the server's record true.
 *
 * Someone who finished must never be told to finish again. The server's record
 * can be missing (its write was lost), so this takes any evidence as "done":
 * this browser's cookie, a completion still waiting to be confirmed, the
 * session's `onboardingCompleted` flag, the server's record, or a workspace
 * that is plainly in use. Then it puts the server right, once:
 *
 * - a completion asked for here but never confirmed is sent again;
 * - a record stuck "in progress" for someone this device saw finish (or whose
 *   workspace is in use) is repaired;
 * - a completion the server already holds is remembered on this device, so it
 *   is not asked about again.
 *
 * Mounted once in the dashboard shell for the upkeep; the reminder on Home
 * reads the same state (React Query dedupes the request).
 */
export function useOnboardingCompletion(): {
  /** Something says they finished: never remind, never redirect. */
  isDone: boolean;
  /** Still working out the answer; show nothing rather than guess. */
  isChecking: boolean;
  /** Started the wizard, did not finish, and nothing says otherwise. */
  inProgress: boolean;
  completionPercentage: number | null;
} {
  const qc = useQueryClient();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const userId = session?.user?.id;
  const userFlag =
    (session?.user as { onboardingCompleted?: unknown } | undefined)
      ?.onboardingCompleted === true;

  // Client-only storage: read after mount so server and first render agree.
  const [device, setDevice] = useState<DeviceRecord | null>(null);
  useEffect(() => {
    setDevice({
      cookie: hasCompleteCookie(document.cookie),
      pending: readPendingCompletion() !== null,
      confirmed: isServerConfirmed(),
    });
  }, []);

  const { mode, isLoading: modeLoading } = useWorkspaceMode();
  const workspaceLive = !modeLoading && mode === "live";

  // Once the server has confirmed completion to this device, do not ask again.
  const state = useQuery({
    queryKey: onboardingStateKey(userId),
    enabled: Boolean(userId) && device !== null && !device.confirmed,
    queryFn: ({ signal }) => completionService.getState(signal),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const serverStatus = device?.confirmed ? "completed" : state.data?.status;

  const confirm = () => {
    markServerConfirmed();
    setDevice({ cookie: true, pending: false, confirmed: true });
    qc.setQueryData<OnboardingState>(onboardingStateKey(userId), (prev) => ({
      completionPercentage: prev?.completionPercentage ?? 100,
      status: "completed",
    }));
  };
  const confirmRef = useRef(confirm);
  confirmRef.current = confirm;
  const sent = useRef(false);

  useEffect(() => {
    if (!userId || !device || device.confirmed || sent.current) return;

    // A completion asked for here that the server never confirmed: send it again.
    const pending = readPendingCompletion();
    if (pending) {
      sent.current = true;
      completionService
        .complete(pending)
        .then(() => confirmRef.current())
        .catch(() => {
          sent.current = false; // tried again on the next load
        });
      return;
    }

    if (serverStatus === "completed") {
      confirmRef.current();
      return;
    }

    if (
      shouldRepairServer(serverStatus, { cookie: device.cookie, workspaceLive })
    ) {
      sent.current = true;
      completionService
        .complete({ repaired: true, flowVersion: "repair" })
        .then(() => confirmRef.current())
        .catch(() => {
          sent.current = false;
        });
      return;
    }

    // The session already says so: let this browser remember it too.
    if (userFlag && !device.cookie) {
      markCompleteOnDevice();
      setDevice({ ...device, cookie: true });
    }
  }, [userId, device, serverStatus, workspaceLive, userFlag]);

  const isDone = isOnboardingDone({
    cookie: device?.cookie ?? false,
    pending: device?.pending ?? false,
    userFlag,
    serverCompleted: serverStatus === "completed",
    workspaceLive,
  });
  const isChecking =
    sessionPending || device === null || modeLoading || state.isLoading;

  return {
    isDone,
    isChecking,
    inProgress: !isDone && !isChecking && serverStatus === "in_progress",
    completionPercentage: state.data?.completionPercentage ?? null,
  };
}
