import {
  ArchiveBoxIcon,
  CheckIcon,
  ClockIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import React, { type RefObject } from "react";

import { inboxService } from "../inbox.service";
import { type InboxThreadListItem } from "../types";

interface Folder {
  name: string;
  count: number;
  icon: React.ElementType;
}

interface EmailListPanelProps {
  threads: InboxThreadListItem[];
  isLoading: boolean;
  selectedThreadId: string | null;
  setSelectedThreadId: (threadId: string) => void;
  selectedThreadIds: string[];
  toggleSelectAll: () => void;
  toggleThreadSelection: (threadId: string) => void;
  folders: Folder[];
  selectedFolder: string;
  setSelectedFolder: (folder: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  emailListRef: RefObject<HTMLDivElement | null>;
  focusedIndex: number;
  setSelectedThreadIds: (ids: string[]) => void;
}

const EmailListPanel = ({
  threads,
  isLoading,
  selectedThreadId,
  setSelectedThreadId,
  selectedThreadIds,
  toggleSelectAll,
  toggleThreadSelection,
  folders,
  selectedFolder,
  setSelectedFolder,
  searchQuery,
  setSearchQuery,
  searchInputRef,
  emailListRef,
  focusedIndex,
  setSelectedThreadIds,
}: EmailListPanelProps) => {
  const queryClient = useQueryClient();
  const toggleStarMutation = useMutation({
    mutationFn: async (threadId: string) =>
      inboxService.toggleThreadStar(threadId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inbox", "threads"] });
      await queryClient.invalidateQueries({
        queryKey: ["inbox", "unread-count"],
      });
    },
  });

  return (
    <div className="flex w-full min-h-0 flex-col">
      {/* Search + Folder Tabs / Bulk Actions */}
      <div className="border-b border-border p-3">
        <div className="relative mb-3">
          <MagnifyingGlassIcon
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search ( / )"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
          />
        </div>

        <div className="flex items-center justify-between">
          {selectedThreadIds.length > 0 ? (
            // Bulk actions when emails selected
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedThreadIds.length === threads.length}
                onChange={toggleSelectAll}
                className="h-3.5 w-3.5 rounded border-border accent-primary"
              />
              <span className="text-xs font-medium text-primary">
                {selectedThreadIds.length}
              </span>
              <div className="mx-1 h-4 w-px bg-border" />
              <button
                type="button"
                className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Send"
              >
                <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Star"
              >
                <StarIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Archive"
              >
                <ArchiveBoxIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedThreadIds([])}
                className="ml-auto rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                title="Clear selection"
              >
                <CheckIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            // Folder tabs when no selection
            <div className="flex items-center gap-0.5">
              {folders.map((folder) => {
                const Icon = folder.icon;
                const isActive = selectedFolder === folder.name;
                return (
                  <button
                    type="button"
                    key={folder.name}
                    onClick={() => setSelectedFolder(folder.name)}
                    className={`relative flex items-center justify-center rounded-lg p-2 transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    title={`${folder.name} (${folder.count})`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {folder.count > 0 && folder.name === "Unread" && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {folder.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Email List */}
      <div
        ref={emailListRef}
        className="min-h-0 flex-1 divide-y divide-border overflow-y-auto"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <EnvelopeIcon
              className="h-6 w-6 text-muted-foreground"
              aria-hidden="true"
            />
            <h3 className="mt-3 text-sm font-medium text-foreground">
              Loading messages
            </h3>
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <EnvelopeIcon
              className="h-6 w-6 text-muted-foreground"
              aria-hidden="true"
            />
            <h3 className="mt-3 text-sm font-medium text-foreground">
              No messages
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchQuery.length > 0
                ? "Try a different search term."
                : "Replies and notifications will show up here."}
            </p>
          </div>
        ) : (
          threads.map((thread, index) => (
            <motion.div
              key={thread.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`group relative transition-colors ${
                selectedThreadId === thread.id
                  ? "bg-primary/10"
                  : focusedIndex === index
                    ? "bg-muted/50"
                    : "hover:bg-muted/50"
              }`}
            >
              <div className="absolute left-2 top-4 z-10">
                <input
                  type="checkbox"
                  checked={selectedThreadIds.includes(thread.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleThreadSelection(thread.id);
                  }}
                  className="h-3.5 w-3.5 rounded border-border opacity-0 accent-primary transition-opacity group-hover:opacity-100"
                  style={{
                    opacity: selectedThreadIds.includes(thread.id)
                      ? 1
                      : undefined,
                  }}
                />
              </div>

              <div
                onClick={() => setSelectedThreadId(thread.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setSelectedThreadId(thread.id);
                  }
                }}
                role="button"
                tabIndex={0}
                className="w-full cursor-pointer p-4 pl-8 text-left"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                        thread.unreadCount > 0
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {(thread.from ?? thread.subject ?? "?")
                        .trim()
                        .slice(0, 1)
                        .toUpperCase()}
                    </span>
                    <span
                      className={`truncate text-sm ${
                        thread.unreadCount > 0
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {thread.from && thread.from.length > 0
                        ? thread.from
                        : "Unknown"}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {thread.hasAttachment && (
                      <PaperClipIcon
                        className="h-3.5 w-3.5 text-muted-foreground"
                        aria-hidden="true"
                      />
                    )}
                    {thread.starred && (
                      <StarSolidIcon
                        className="h-3.5 w-3.5 text-amber-500"
                        aria-hidden="true"
                      />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {thread.updatedAt
                        ? new Date(thread.updatedAt).toLocaleString()
                        : "-"}
                    </span>
                  </div>
                </div>
                <p
                  className={`mb-1 truncate text-sm ${
                    thread.unreadCount > 0
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {thread.subject}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {thread.snippet}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="inline-block truncate rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {(thread.labels?.[0]?.name ?? selectedFolder).toString()}
                  </span>
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Archive"
                    >
                      <ArchiveBoxIcon
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStarMutation.mutate(thread.id);
                      }}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-amber-500"
                      title="Star"
                    >
                      <StarIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Snooze"
                    >
                      <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default EmailListPanel;
