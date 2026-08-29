"use client";

import {
  ArrowLeftIcon,
  ArrowPathIcon,
  BoltIcon,
  Cog6ToothIcon,
  CpuChipIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  FunnelIcon,
  HandThumbDownIcon,
  HandThumbUpIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon,
  PlusCircleIcon,
  SparklesIcon,
  Squares2X2Icon,
  UserGroupIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
  CommandOption,
  CommandSeparator,
} from "@kmenu/react";
import { useQuery } from "@tanstack/react-query";
import { fuzzyFilter } from "kmenu";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/dialog";

import { PRIVATE_ROUTES } from "@/config/app-routes";
import { authClient } from "@/lib/auth-client";

import { AiCitations } from "@/features/ai-search/ai-citations";
import { aiSearchService } from "@/features/ai-search/ai-search.service";
import { useAiAnswer } from "@/features/ai-search/use-ai-answer";
import { isWipHref, SHOW_WIP_SECTIONS } from "@/shared/config/wip-sections";

type PaletteOptionData =
  | { kind: "navigate"; href: string }
  | { kind: "ai"; query: string }
  | { kind: "result"; href: string };

type PaletteOption = {
  id: string;
  label: string;
  group: "ai" | "navigate" | "actions" | "search";
  keywords?: string[];
  icon: React.ReactNode;
  hint?: string;
  description?: string;
  data: PaletteOptionData;
};

type CommandPaletteApi = {
  open: (prefill?: string) => void;
  close: () => void;
  setQuery: (value: string) => void;
};

const CommandPaletteContext = createContext<CommandPaletteApi | null>(null);

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error("CommandPaletteProvider missing");
  return ctx;
}

function Kbd({ keys }: { keys: string[] }) {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {keys.map((k) => (
        <kbd
          key={k}
          className="pointer-events-none inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-md border border-border bg-muted px-1.5 font-mono text-[10px] font-semibold text-muted-foreground"
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}

const NAVIGATE_OPTIONS: PaletteOption[] = [
  {
    id: "nav-dashboard",
    label: "Dashboard",
    group: "navigate",
    keywords: ["home", "overview"],
    icon: <Squares2X2Icon className="h-4 w-4" aria-hidden="true" />,
    data: { kind: "navigate", href: PRIVATE_ROUTES.DASHBOARD },
  },
  {
    id: "nav-campaigns",
    label: "Campaigns",
    group: "navigate",
    keywords: ["email", "send", "broadcast"],
    icon: <MegaphoneIcon className="h-4 w-4" aria-hidden="true" />,
    data: { kind: "navigate", href: PRIVATE_ROUTES.CAMPAIGNS },
  },
  {
    id: "nav-audience",
    label: "Audience",
    group: "navigate",
    keywords: ["contacts", "wallets", "users"],
    icon: <UserGroupIcon className="h-4 w-4" aria-hidden="true" />,
    data: { kind: "navigate", href: PRIVATE_ROUTES.AUDIENCE },
  },
  {
    id: "nav-forms",
    label: "Forms",
    group: "navigate",
    keywords: ["signup", "capture"],
    icon: <DocumentTextIcon className="h-4 w-4" aria-hidden="true" />,
    data: { kind: "navigate", href: PRIVATE_ROUTES.FORMS },
  },
  {
    id: "nav-inbox",
    label: "Inbox",
    group: "navigate",
    keywords: ["email", "messages", "replies"],
    icon: <EnvelopeIcon className="h-4 w-4" aria-hidden="true" />,
    data: { kind: "navigate", href: PRIVATE_ROUTES.INBOX },
  },
  {
    id: "nav-automations",
    label: "Automations",
    group: "navigate",
    keywords: ["workflow", "triggers", "plays"],
    icon: <BoltIcon className="h-4 w-4" aria-hidden="true" />,
    data: { kind: "navigate", href: PRIVATE_ROUTES.AUTOMATIONS },
  },
  {
    id: "nav-intelligence",
    label: "Intelligence",
    group: "navigate",
    keywords: ["ai", "query", "reports", "segments", "sql"],
    icon: <CpuChipIcon className="h-4 w-4" aria-hidden="true" />,
    data: { kind: "navigate", href: PRIVATE_ROUTES.INTELLIGENCE },
  },
  {
    id: "nav-settings",
    label: "Settings",
    group: "navigate",
    keywords: ["preferences", "billing", "profile", "account"],
    icon: <Cog6ToothIcon className="h-4 w-4" aria-hidden="true" />,
    data: { kind: "navigate", href: PRIVATE_ROUTES.SETTINGS },
  },
];

const ACTION_OPTIONS: PaletteOption[] = [
  {
    id: "action-new-campaign",
    label: "Create campaign",
    group: "actions",
    keywords: ["new", "campaign", "send", "email"],
    icon: <PlusCircleIcon className="h-4 w-4" aria-hidden="true" />,
    data: { kind: "navigate", href: PRIVATE_ROUTES.NEW_CAMPAIGN },
  },
  {
    id: "action-new-automation",
    label: "Create automation",
    group: "actions",
    keywords: ["new", "automation", "workflow"],
    icon: <BoltIcon className="h-4 w-4" aria-hidden="true" />,
    data: { kind: "navigate", href: PRIVATE_ROUTES.NEW_AUTOMATION },
  },
  {
    id: "action-create-segment",
    label: "Create segment",
    group: "actions",
    keywords: ["new", "segment", "audience", "filter"],
    icon: <FunnelIcon className="h-4 w-4" aria-hidden="true" />,
    data: { kind: "navigate", href: "/intelligence?tab=segments" },
  },
  {
    id: "action-import-contacts",
    label: "Import contacts",
    group: "actions",
    keywords: ["import", "csv", "wallets", "upload"],
    icon: <UserPlusIcon className="h-4 w-4" aria-hidden="true" />,
    data: { kind: "navigate", href: "/audience/import-export" },
  },
  {
    id: "action-personalize",
    label: "Personalize workspace",
    group: "actions",
    keywords: ["onboarding", "setup"],
    icon: <SparklesIcon className="h-4 w-4" aria-hidden="true" />,
    data: { kind: "navigate", href: "/onboarding" },
  },
];

function PaletteRow({ option }: { option: PaletteOption }) {
  const isAi = option.group === "ai";
  return (
    <CommandOption
      value={option}
      className="group relative flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-muted/40 data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
    >
      <span
        aria-hidden="true"
        className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary opacity-0 transition-opacity group-data-[active=true]:opacity-100"
      />
      <span
        className={
          isAi
            ? "flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary"
            : "flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition-colors group-data-[active=true]:border-primary/30 group-data-[active=true]:bg-primary/15 group-data-[active=true]:text-primary"
        }
      >
        {option.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium leading-snug">
          {option.label}
        </span>
        {option.description ? (
          <span className="block truncate text-xs text-muted-foreground">
            {option.description}
          </span>
        ) : null}
      </span>
      {option.hint ? (
        <span className="shrink-0 text-[11px] text-muted-foreground opacity-0 transition-opacity group-data-[active=true]:opacity-100">
          {option.hint}
        </span>
      ) : null}
    </CommandOption>
  );
}

const GROUP_HEADING_CLASSES =
  "px-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-muted-foreground";

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"commands" | "answer">("commands");
  const [query, setQuery] = useState("");
  const ai = useAiAnswer();
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const lastShortcutAtRef = useRef<number>(0);
  const openRef = useRef<boolean>(false);
  const viewRef = useRef<"commands" | "answer">("commands");

  const stopStreaming = ai.stop;
  const resetAi = ai.reset;

  const backToCommands = useCallback(() => {
    stopStreaming();
    setView("commands");
  }, [stopStreaming]);

  // Debounce the semantic-search input; skip when closed or in answer view.
  useEffect(() => {
    if (!open || view !== "commands") return;
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => window.clearTimeout(t);
  }, [open, view, query]);

  // Live semantic search over the org's ingested content - plain vector
  // search (no LLM, no AI-credit spend). Fails silently: no results group.
  const siteSearchQuery = useQuery({
    queryKey: ["palette", "site-search", debouncedQuery],
    enabled: open && view === "commands" && debouncedQuery.length >= 3,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: () => aiSearchService.search(debouncedQuery, 5),
  });
  const searchResults = useMemo(
    () =>
      debouncedQuery.length >= 3 && siteSearchQuery.isSuccess
        ? siteSearchQuery.data
        : [],
    [debouncedQuery, siteSearchQuery.isSuccess, siteSearchQuery.data]
  );

  const api = useMemo<CommandPaletteApi>(
    () => ({
      open: (prefill) => {
        setView("commands");
        resetAi();
        if (typeof prefill === "string") setQuery(prefill);
        setOpen(true);
      },
      close: () => setOpen(false),
      setQuery,
    }),
    [resetAi]
  );

  useEffect(() => {
    openRef.current = open;
  }, [open]);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isK =
        e.code === "KeyK" ||
        (typeof e.key === "string" && e.key.toLowerCase() === "k");
      const hasPrimaryModifier = e.metaKey || e.ctrlKey;
      const hasExtraModifier = e.altKey || e.shiftKey;

      if (isK && hasPrimaryModifier && !hasExtraModifier) {
        const target = e.target as
          | HTMLElement
          | null
          | (EventTarget & { tagName?: string; isContentEditable?: boolean });
        const tag =
          typeof target?.tagName === "string"
            ? target.tagName.toLowerCase()
            : "";
        const isEditable =
          tag === "input" ||
          tag === "textarea" ||
          tag === "select" ||
          Boolean(
            target && "isContentEditable" in target && target.isContentEditable
          );
        if (isEditable) return;

        const now = Date.now();
        if (now - lastShortcutAtRef.current < 450) return;
        lastShortcutAtRef.current = now;

        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") {
          e.stopImmediatePropagation();
        }

        if (openRef.current) {
          const input = document.querySelector<HTMLInputElement>(
            "[data-slot='dialog-content'] input"
          );
          input?.focus();
          return;
        }

        setOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, []);

  // Reset transient state when the palette closes; abort in-flight streams.
  useEffect(() => {
    if (!open) {
      resetAi();
      setView("commands");
      setQuery("");
      return;
    }
    const t = window.setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(
        "[data-slot='dialog-content'] input"
      );
      input?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, resetAi]);

  const askQuestion = ai.ask;
  const askAi = useCallback(
    (question: string) => {
      setView("answer");
      askQuestion(question, { user: session?.user });
    },
    [askQuestion, session?.user]
  );

  const sendAiFeedback = ai.sendFeedback;

  const options = useMemo<PaletteOption[]>(() => {
    const q = query.trim();
    // WIP sections stay listed in production but flagged - their routes
    // render a coming-soon panel until they ship (see wip-sections.ts).
    const all = [...NAVIGATE_OPTIONS, ...ACTION_OPTIONS].map((option) =>
      !SHOW_WIP_SECTIONS &&
      option.data.kind === "navigate" &&
      isWipHref(option.data.href)
        ? { ...option, hint: "Coming in v1" }
        : option
    );
    // Semantic-search hits. The current query is added to keywords so the
    // fuzzy filter never drops them (titles rarely contain the query text).
    for (const [index, result] of searchResults.entries()) {
      all.push({
        id: `search-${index}-${result.sourceUri}`,
        label: result.title,
        group: "search",
        keywords: [q],
        icon: <MagnifyingGlassIcon className="h-4 w-4" aria-hidden="true" />,
        description: result.snippet,
        data: { kind: "result", href: result.sourceUri },
      });
    }
    if (q.length > 0) {
      all.unshift({
        id: "ask-ai",
        label: `Ask AI: “${q}”`,
        group: "ai",
        keywords: ["ai", "ask", "help", "search"],
        icon: <SparklesIcon className="h-4 w-4" aria-hidden="true" />,
        hint: "Enter",
        data: { kind: "ai", query: q },
      });
    }
    return all;
  }, [query, searchResults]);

  const handleSelect = useCallback(
    (opt: PaletteOption) => {
      if (opt.data.kind === "navigate") {
        setOpen(false);
        router.push(opt.data.href);
        return;
      }
      if (opt.data.kind === "result") {
        const { href } = opt.data;
        setOpen(false);
        if (href.startsWith("/")) {
          router.push(href);
        } else {
          window.open(href, "_blank", "noopener,noreferrer");
        }
        return;
      }
      askAi(opt.data.query);
    },
    [askAi, router]
  );

  return (
    <CommandPaletteContext.Provider value={api}>
      {children}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          onEscapeKeyDown={(e) => {
            // Esc steps back from the answer view instead of closing.
            if (viewRef.current === "answer") {
              e.preventDefault();
              backToCommands();
            }
          }}
          className="max-w-[640px] gap-0 overflow-hidden rounded-2xl border border-border/70 bg-background/95 p-0 shadow-[0_40px_120px_-40px_rgba(15,23,42,0.65)] ring-1 ring-black/5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/85 sm:max-w-[640px]"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Command palette</DialogTitle>
          </DialogHeader>

          {view === "answer" ? (
            <div className="flex flex-col">
              {/* Answer header */}
              <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
                <button
                  type="button"
                  onClick={backToCommands}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                >
                  <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  Back
                </button>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <SparklesIcon
                    className="h-3.5 w-3.5 text-primary"
                    aria-hidden="true"
                  />
                  AI answer
                </div>
                <div className="ml-auto">
                  {ai.loading ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={stopStreaming}
                    >
                      Stop
                    </Button>
                  ) : null}
                </div>
              </div>

              {/* Question */}
              <div className="border-b border-border/60 bg-muted/20 px-4 py-2.5">
                <p className="line-clamp-2 text-sm font-medium text-foreground">
                  {ai.question}
                </p>
              </div>

              {/* Answer body */}
              <div className="max-h-[min(50vh,360px)] overflow-y-auto">
                <div
                  className="px-4 py-4 text-sm leading-relaxed text-foreground"
                  aria-live="polite"
                >
                  {ai.error ? (
                    <div className="space-y-3">
                      <p className="text-destructive">{ai.error}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => askAi(ai.question)}
                      >
                        <ArrowPathIcon
                          className="mr-1.5 h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                        Try again
                      </Button>
                    </div>
                  ) : ai.answer.length > 0 ? (
                    <div className="whitespace-pre-wrap">{ai.answer}</div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="flex gap-1" aria-hidden="true">
                        {[0, 1, 2].map((d) => (
                          <span
                            key={d}
                            className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
                            style={{ animationDelay: `${d * 0.18}s` }}
                          />
                        ))}
                      </span>
                      Thinking…
                    </div>
                  )}
                </div>
              </div>

              <AiCitations citations={ai.citations} />

              {/* Answer footer */}
              <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/20 px-4 py-2.5 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Kbd keys={["Esc"]} />
                  Back to commands
                </span>
                {!ai.loading && !ai.error && ai.answer.length > 0 ? (
                  ai.feedback ? (
                    <span>Thanks for the feedback.</span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <span>Helpful?</span>
                      <button
                        type="button"
                        aria-label="Answer was helpful"
                        className="rounded p-1 hover:bg-muted hover:text-foreground"
                        onClick={() => sendAiFeedback("up")}
                      >
                        <HandThumbUpIcon
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      </button>
                      <button
                        type="button"
                        aria-label="Answer was not helpful"
                        className="rounded p-1 hover:bg-muted hover:text-foreground"
                        onClick={() => sendAiFeedback("down")}
                      >
                        <HandThumbDownIcon
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      </button>
                    </span>
                  )
                ) : (
                  <span>AI answers can be wrong - verify important data.</span>
                )}
              </div>
            </div>
          ) : (
            <Command
              options={options}
              filter={fuzzyFilter}
              value={query}
              onValueChange={setQuery}
              onSelect={(selected) => handleSelect(selected as PaletteOption)}
            >
              {/* Search row */}
              <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
                <MagnifyingGlassIcon
                  className="h-5 w-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <CommandInput
                  placeholder="Search, jump to a page, or ask AI…"
                  aria-label="Command palette input"
                  className="h-7 flex-1 bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground/60"
                />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close command palette"
                  className="shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                >
                  Esc
                </button>
              </div>

              {/* CommandList must be its own scroll container - kmenu scrolls
                  this element directly for keyboard navigation. Its internal
                  `.command-active-indicator` div is unstyled (we don't ship
                  kmenu's CSS) and would occupy flow space, so hide it - the
                  active row is styled via data-[active=true] instead. */}
              <CommandList className="max-h-[min(60vh,420px)] overflow-y-auto px-2 pb-2 pt-1.5 [&_.command-active-indicator]:hidden">
                <CommandEmpty>
                  <div className="flex flex-col items-center gap-1.5 px-2 py-10 text-center">
                    <MagnifyingGlassIcon
                      className="h-6 w-6 text-muted-foreground/40"
                      aria-hidden="true"
                    />
                    <p className="text-sm font-medium text-foreground">
                      No matching commands
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Press <Kbd keys={["↵"]} /> to ask AI instead.
                    </p>
                  </div>
                </CommandEmpty>

                {options.some((o) => o.group === "ai") ? (
                  <CommandGroup heading="Ask" className={GROUP_HEADING_CLASSES}>
                    {options
                      .filter((o) => o.group === "ai")
                      .map((o) => (
                        <PaletteRow key={o.id} option={o} />
                      ))}
                  </CommandGroup>
                ) : null}

                {options.some((o) => o.group === "search") ? (
                  <CommandGroup
                    heading="From your workspace"
                    className={GROUP_HEADING_CLASSES}
                  >
                    {options
                      .filter((o) => o.group === "search")
                      .map((o) => (
                        <PaletteRow key={o.id} option={o} />
                      ))}
                  </CommandGroup>
                ) : null}

                <CommandGroup heading="Go to" className={GROUP_HEADING_CLASSES}>
                  {options
                    .filter((o) => o.group === "navigate")
                    .map((o) => (
                      <PaletteRow key={o.id} option={o} />
                    ))}
                </CommandGroup>

                <CommandSeparator className="my-2 h-px bg-border/60" />

                <CommandGroup
                  heading="Actions"
                  className={GROUP_HEADING_CLASSES}
                >
                  {options
                    .filter((o) => o.group === "actions")
                    .map((o) => (
                      <PaletteRow key={o.id} option={o} />
                    ))}
                </CommandGroup>
              </CommandList>

              {/* Footer hints */}
              <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/20 px-4 py-2.5 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <Kbd keys={["↑", "↓"]} />
                    Navigate
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Kbd keys={["↵"]} />
                    Select
                  </span>
                </div>
                <span className="flex items-center gap-1.5">
                  <SparklesIcon
                    className="h-3.5 w-3.5 text-primary"
                    aria-hidden="true"
                  />
                  Type a question to ask AI
                </span>
              </div>
            </Command>
          )}
        </DialogContent>
      </Dialog>
    </CommandPaletteContext.Provider>
  );
}
