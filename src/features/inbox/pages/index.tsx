"use client";

import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import ConversationPanel from "../components/conversation";
import EmailListPanel from "../components/email-list-panel";
import FloatingBulk from "../components/floating-bulk";
import { folders } from "../data";
import { connectInboxSocket, inboxService } from "../inbox.service";
import { type InboxThreadListItem } from "../types";
import { PageHeader } from "@/shared/components/page/page-header";

export function InboxPages() {
  const [selectedFolder, setSelectedFolder] = useState("All");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedThreadIds, setSelectedThreadIds] = useState<string[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  // Serverless hosts (Vercel) can't hold the socket - poll instead.
  const [realtimeDown, setRealtimeDown] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const emailListRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();

  const listParams = useMemo(() => {
    const q = searchQuery.trim();
    if (selectedFolder === "Archived") {
      return { folder: "ARCHIVE" as const, q: q.length > 0 ? q : undefined };
    }
    if (selectedFolder === "Unread") {
      return {
        folder: "INBOX" as const,
        unread: true as const,
        q: q.length > 0 ? q : undefined,
      };
    }
    if (selectedFolder === "Starred") {
      return {
        folder: "INBOX" as const,
        starred: true as const,
        q: q.length > 0 ? q : undefined,
      };
    }
    return { folder: "INBOX" as const, q: q.length > 0 ? q : undefined };
  }, [searchQuery, selectedFolder]);

  const threadsQuery = useQuery({
    queryKey: ["inbox", "threads", listParams],
    queryFn: () =>
      inboxService.listThreads({ ...listParams, page: 1, limit: 100 }),
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: realtimeDown ? 15000 : false,
  });

  const unreadQuery = useQuery({
    queryKey: ["inbox", "unread-count"],
    queryFn: () => inboxService.getUnreadCount(),
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: realtimeDown ? 15000 : false,
  });

  const threads = useMemo<InboxThreadListItem[]>(
    () => threadsQuery.data?.items ?? [],
    [threadsQuery.data?.items]
  );

  const selectedThread = useMemo(() => {
    if (!selectedThreadId) return null;
    return threads.find((t) => t.id === selectedThreadId) ?? null;
  }, [selectedThreadId, threads]);

  const threadDetailQuery = useQuery({
    queryKey: ["inbox", "thread", selectedThreadId],
    queryFn: () =>
      selectedThreadId
        ? inboxService.getThread(selectedThreadId)
        : Promise.resolve(null),
    enabled: !!selectedThreadId,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const markReadMutation = useMutation({
    mutationFn: async (threadId: string) =>
      inboxService.markThreadRead(threadId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inbox", "threads"] });
      await queryClient.invalidateQueries({
        queryKey: ["inbox", "unread-count"],
      });
    },
  });

  useEffect(() => {
    if (!selectedThreadId) return;
    const unreadCount =
      (selectedThread?.unreadCount ?? 0) ||
      ((threadDetailQuery.data as { unreadCount?: number } | null)
        ?.unreadCount ??
        0);
    if (unreadCount > 0) {
      markReadMutation.mutate(selectedThreadId);
    }
  }, [
    markReadMutation,
    selectedThread?.unreadCount,
    selectedThreadId,
    threadDetailQuery.data,
  ]);

  const toggleThreadSelection = (threadId: string) => {
    setSelectedThreadIds((prev) =>
      prev.includes(threadId)
        ? prev.filter((id) => id !== threadId)
        : [...prev, threadId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedThreadIds.length === threads.length) {
      setSelectedThreadIds([]);
    } else {
      setSelectedThreadIds(threads.map((t) => t.id));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        if (e.key === "Escape") {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      switch (e.key) {
        case "j":
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, threads.length - 1));
          break;
        case "k":
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (threads[focusedIndex]) {
            setSelectedThreadId(threads[focusedIndex].id);
          }
          break;
        case "x":
          e.preventDefault();
          if (threads[focusedIndex]) {
            toggleThreadSelection(threads[focusedIndex].id);
          }
          break;
        case "r":
          e.preventDefault();
          if (selectedThreadId) {
            document.querySelector("textarea")?.focus();
          }
          break;
        case "e":
          e.preventDefault();
          // Archive action
          break;
        case "s":
          e.preventDefault();
          // Star toggle
          break;
        case "/":
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusedIndex, selectedThreadId, threads]);

  useEffect(() => {
    const emailElement = emailListRef.current?.children[
      focusedIndex
    ] as HTMLElement;
    emailElement?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedIndex]);

  useEffect(() => {
    const socket = connectInboxSocket(null);
    const onNewMessage = () => {
      queryClient.invalidateQueries({ queryKey: ["inbox", "threads"] });
      queryClient.invalidateQueries({ queryKey: ["inbox", "unread-count"] });
      if (selectedThreadId) {
        queryClient.invalidateQueries({
          queryKey: ["inbox", "thread", selectedThreadId],
        });
      }
    };
    const onConnect = () => setRealtimeDown(false);
    const onConnectError = () => setRealtimeDown(true);
    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on("new_message", onNewMessage);
    socket.on("thread_updated", onNewMessage);
    socket.on("unread_count_changed", onNewMessage);
    return () => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off("new_message", onNewMessage);
      socket.off("thread_updated", onNewMessage);
      socket.off("unread_count_changed", onNewMessage);
      socket.disconnect();
    };
  }, [queryClient, selectedThreadId]);

  const unreadCount = unreadQuery.data?.unreadCount ?? 0;
  const foldersUi = useMemo(() => {
    return folders.map((f) => {
      if (f.name === "Unread") return { ...f, count: unreadCount };
      return { ...f, count: f.count };
    });
  }, [unreadCount]);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
      <PageHeader
        title="Inbox"
        description="Manage replies and notifications from your campaigns."
        actions={
          unreadCount > 0 ? (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {unreadCount} unread
            </span>
          ) : null
        }
      />

      {/* Two-pane: stacked on mobile, side-by-side on lg */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card">
        {/* List pane - hidden on mobile when a thread is open */}
        <div
          className={`min-h-0 w-full shrink-0 border-border lg:flex lg:w-80 lg:border-r ${
            selectedThreadId ? "hidden lg:flex" : "flex"
          }`}
        >
          <EmailListPanel
            threads={threads}
            isLoading={threadsQuery.isFetching}
            selectedThreadId={selectedThreadId}
            setSelectedThreadId={setSelectedThreadId}
            selectedThreadIds={selectedThreadIds}
            toggleSelectAll={toggleSelectAll}
            toggleThreadSelection={toggleThreadSelection}
            folders={foldersUi}
            selectedFolder={selectedFolder}
            setSelectedFolder={setSelectedFolder}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchInputRef={searchInputRef}
            emailListRef={emailListRef}
            focusedIndex={focusedIndex}
            setSelectedThreadIds={setSelectedThreadIds}
          />
        </div>

        {/* Reading pane - full-width on mobile when a thread is open */}
        <div
          className={`min-h-0 flex-1 flex-col ${
            selectedThreadId ? "flex" : "hidden lg:flex"
          }`}
        >
          {selectedThreadId ? (
            <button
              type="button"
              onClick={() => setSelectedThreadId(null)}
              className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            >
              <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
              Back to inbox
            </button>
          ) : null}
          <ConversationPanel
            selectedThreadId={selectedThreadId}
            selectedThread={threadDetailQuery.data ?? selectedThread}
          />
        </div>

        <FloatingBulk
          selectedThreadIds={selectedThreadIds}
          setSelectedThreadIds={setSelectedThreadIds}
        />
      </div>
    </div>
  );
}
