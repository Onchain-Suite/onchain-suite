"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useSyncExternalStore } from "react";

import { answersService, type WorkspaceAnswers } from "../answers.service";
import {
  readStartPath,
  saveStartPath,
  type StartPath,
  subscribeStartPath,
} from "../utils/start-path";

export const workspaceAnswersKey = (organizationId: string | null) =>
  ["onboarding", "answers", organizationId ?? ""] as const;

/** Workspaces whose browser-only answer has been sent up, so it is sent once. */
const sentUp = new Set<string>();

/**
 * What the workspace has today (its start path), which orders Home's setup.
 *
 * The server holds it, so it is the same for the whole team on any device and
 * can be analysed. The browser keeps a copy too: it paints instantly on the
 * next visit, and it is the fallback when the server cannot be reached, so a
 * failed read never sends anyone back to the question.
 *
 * `isResolved` is false only while nothing is known locally and the server has
 * not answered yet: Home waits on it (bounded) rather than flash the question
 * at a team that already answered it in the wizard or on another device.
 */
export function useStartPath(organizationId: string | null): {
  startPath: StartPath | null;
  isResolved: boolean;
  setStartPath: (path: StartPath) => void;
} {
  const qc = useQueryClient();
  const local = useSyncExternalStore(
    subscribeStartPath,
    () => readStartPath(organizationId),
    () => null
  );

  const answers = useQuery({
    queryKey: workspaceAnswersKey(organizationId),
    enabled: Boolean(organizationId),
    queryFn: ({ signal }) =>
      answersService.get(organizationId ?? undefined, signal),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const server = answers.data?.startPath?.value ?? null;

  useEffect(() => {
    if (!organizationId || !answers.isSuccess) return;
    if (server) {
      // Keep the browser's copy in step, for an instant first paint next time.
      if (server !== local) saveStartPath(organizationId, server);
      return;
    }
    // Answered here before the server could hold it: send it up, once.
    if (local && !sentUp.has(organizationId)) {
      sentUp.add(organizationId);
      answersService
        .set({ startPath: local, source: "home" }, organizationId)
        .then((next) =>
          qc.setQueryData(workspaceAnswersKey(organizationId), next)
        )
        .catch(() => undefined);
    }
  }, [organizationId, answers.isSuccess, server, local, qc]);

  const setStartPath = useCallback(
    (path: StartPath) => {
      if (!organizationId) return;
      // Instant, in both places Home reads from; the request follows.
      saveStartPath(organizationId, path);
      qc.setQueryData<WorkspaceAnswers>(
        workspaceAnswersKey(organizationId),
        (prev) => ({
          goal: prev?.goal ?? null,
          startPath: {
            value: path,
            setAt: new Date().toISOString(),
            source: "home",
          },
        })
      );
      answersService
        .set({ startPath: path, source: "home" }, organizationId)
        .then((next) =>
          qc.setQueryData(workspaceAnswersKey(organizationId), next)
        )
        .catch(() => undefined);
    },
    [organizationId, qc]
  );

  return {
    startPath: server ?? local,
    isResolved: Boolean(local) || !organizationId || answers.isFetched,
    setStartPath,
  };
}
