"use client";

import {
  ArrowsUpDownIcon,
  BoltIcon,
  CheckIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  StarIcon,
  TagIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { cn } from "@/lib/utils";

import type { List as CampaignList, Segment } from "../../../campaigns/types";
import {
  ALL_CONTACTS_SELECTION_ID,
  isAllContactsSelected,
} from "../../lib/audience";

/** A single audience profile pickable by email (`profileIds` at save time). */
export interface ContactOption {
  id: string;
  name: string;
  email: string;
}

interface AudienceSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  lists: CampaignList[];
  /** Audience tags as pickable groups (`tag:<name>` ids). */
  tags?: CampaignList[];
  segments: Segment[];
  /** Individual contacts (with an email) selectable directly. */
  contacts?: ContactOption[];
  isSegmentsLoading?: boolean;
  isContactsLoading?: boolean;
  unresolvedSelectionCount?: number;
}

export function AudienceSelector({
  value,
  onChange,
  lists,
  tags = [],
  segments,
  contacts = [],
  isSegmentsLoading = false,
  isContactsLoading = false,
  unresolvedSelectionCount = 0,
}: AudienceSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // We filter here (shouldFilter={false} on Command) so "Select all" can act on
  // exactly the contacts currently matching the search box.
  const q = query.trim().toLowerCase();
  const matches = (text: string) =>
    q.length === 0 || text.toLowerCase().includes(q);

  const filteredContacts = useMemo(
    () => contacts.filter((c) => matches(`${c.name} ${c.email}`)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contacts, q]
  );
  const filteredLists = useMemo(
    () => lists.filter((l) => matches(l.name)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lists, q]
  );
  const filteredTags = useMemo(
    () => tags.filter((t) => matches(t.name)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tags, q]
  );
  const filteredSegments = useMemo(
    () => segments.filter((s) => matches(s.name)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [segments, q]
  );

  const hasAnyResults =
    filteredContacts.length > 0 ||
    filteredLists.length > 0 ||
    filteredTags.length > 0 ||
    filteredSegments.length > 0;

  const allSelected = isAllContactsSelected(value);
  // Specific selections and the "all contacts" sentinel are mutually
  // exclusive, so any specific pick starts from a base with the sentinel
  // stripped out.
  const specificValue = value.filter((id) => id !== ALL_CONTACTS_SELECTION_ID);

  const toggleSendToAll = () => {
    onChange(allSelected ? [] : [ALL_CONTACTS_SELECTION_ID]);
  };

  const toggleAudience = (audienceId: string) => {
    const newValue = specificValue.includes(audienceId)
      ? specificValue.filter((id) => id !== audienceId)
      : [...specificValue, audienceId];
    onChange(newValue);
  };

  // Select-all scoped to the currently-matching contacts.
  const filteredContactIds = filteredContacts.map((c) => c.id);
  const selectedContactTotal = contacts.reduce(
    (n, c) => (specificValue.includes(c.id) ? n + 1 : n),
    0
  );
  const allFilteredContactsSelected =
    filteredContactIds.length > 0 &&
    filteredContactIds.every((id) => specificValue.includes(id));

  const toggleAllFilteredContacts = () => {
    if (allFilteredContactsSelected) {
      const remove = new Set(filteredContactIds);
      onChange(specificValue.filter((id) => !remove.has(id)));
    } else {
      onChange(Array.from(new Set([...specificValue, ...filteredContactIds])));
    }
  };

  const checkboxClass = (checked: boolean) =>
    cn(
      "flex items-center justify-center h-4 w-4 shrink-0 border-2 rounded transition-colors",
      checked ? "bg-primary border-primary" : "border-border bg-background"
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full h-12 justify-between rounded-xl border-border bg-background text-foreground hover:bg-muted/50 transition-colors"
        >
          <span
            className={cn(
              "text-muted-foreground",
              value.length > 0 && "text-foreground"
            )}
          >
            {allSelected
              ? "All contacts"
              : specificValue.length > 0
                ? `${specificValue.length} selected`
                : "Select contacts or segments"}
          </span>
          <ArrowsUpDownIcon
            aria-hidden="true"
            className="ml-2 h-4 w-4 shrink-0 opacity-50"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl border-border"
        align="start"
      >
        <Command className="rounded-xl" shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search contacts, tags or segments…"
            className="h-11 border-0 focus:ring-0"
          />
          <CommandList className="max-h-[340px]">
            {/* Send to everyone — mutually exclusive with any specific pick.
                Always shown (even mid-search) so it's a one-click target. */}
            <CommandGroup className="p-1.5">
              <CommandItem
                value="all contacts everyone entire audience"
                onSelect={toggleSendToAll}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 cursor-pointer",
                  allSelected && "bg-primary/5"
                )}
              >
                <div className={checkboxClass(allSelected)}>
                  {allSelected && (
                    <CheckIcon
                      aria-hidden="true"
                      className="h-3 w-3 text-primary-foreground"
                    />
                  )}
                </div>
                <GlobeAltIcon
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-primary"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium text-foreground">
                    All contacts
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Send to every contact in your audience
                  </span>
                </div>
              </CommandItem>
            </CommandGroup>

            {q.length > 0 && !hasAnyResults ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No matches found.
              </div>
            ) : null}

            {/* Individual contacts — pick emails directly when you have no
                tags or segments ready. Compact, dense rows. */}
            <CommandGroup heading="Contacts" className="p-1.5">
              {isContactsLoading ? (
                <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  Loading contacts…
                </div>
              ) : contacts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  No contacts with an email yet. Add profiles in{" "}
                  <Link
                    href="/audience"
                    className="font-medium text-primary underline underline-offset-2"
                  >
                    Audience
                  </Link>
                  .
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-2.5 pb-1 pt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {selectedContactTotal} of {contacts.length} selected
                    </span>
                    {filteredContacts.length > 0 ? (
                      <button
                        type="button"
                        onClick={toggleAllFilteredContacts}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {allFilteredContactsSelected
                          ? "Clear"
                          : q.length > 0
                            ? `Select all ${filteredContacts.length} matching`
                            : `Select all ${filteredContacts.length}`}
                      </button>
                    ) : null}
                  </div>
                  {filteredContacts.length > 0 ? (
                    filteredContacts.map((contact) => {
                      const checked = value.includes(contact.id);
                      return (
                        <CommandItem
                          key={contact.id}
                          value={`${contact.name} ${contact.email} ${contact.id}`}
                          onSelect={() => toggleAudience(contact.id)}
                          className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 cursor-pointer"
                        >
                          <div className={checkboxClass(checked)}>
                            {checked && (
                              <CheckIcon
                                aria-hidden="true"
                                className="h-3 w-3 text-primary-foreground"
                              />
                            )}
                          </div>
                          <EnvelopeIcon
                            aria-hidden="true"
                            className="h-4 w-4 shrink-0 text-muted-foreground"
                          />
                          <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
                            <span className="truncate text-sm text-foreground">
                              {contact.name}
                            </span>
                            <span className="shrink-0 truncate text-xs text-muted-foreground">
                              {contact.email}
                            </span>
                          </div>
                        </CommandItem>
                      );
                    })
                  ) : (
                    <div className="px-2.5 py-1.5 text-xs text-muted-foreground">
                      No contacts match “{query}”.
                    </div>
                  )}
                </>
              )}
            </CommandGroup>

            {/* Lists Group — only when a real list source exists. */}
            {filteredLists.length > 0 ? (
              <CommandGroup heading="List" className="p-1.5">
                {filteredLists.map((list) => (
                  <CommandItem
                    key={list.id}
                    value={`${list.name} ${list.id}`}
                    onSelect={() => toggleAudience(list.id)}
                    className="flex items-center justify-between rounded-lg px-2.5 py-1.5 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={checkboxClass(value.includes(list.id))}>
                        {value.includes(list.id) && (
                          <CheckIcon
                            aria-hidden="true"
                            className="h-3 w-3 text-primary-foreground"
                          />
                        )}
                      </div>
                      <UserGroupIcon
                        aria-hidden="true"
                        className="h-4 w-4 text-muted-foreground"
                      />
                      <span className="text-sm font-medium text-foreground">
                        {list.name} ({list.count})
                      </span>
                    </div>
                    {list.starred ? (
                      <StarIcon
                        aria-hidden="true"
                        className="h-4 w-4 fill-amber-500 text-amber-500"
                      />
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {/* Tags Group — audience tags; expanded to tagged contacts at
                save time. */}
            {filteredTags.length > 0 ? (
              <CommandGroup heading="Tag" className="p-1.5">
                {filteredTags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={`${tag.name} ${tag.id}`}
                    onSelect={() => toggleAudience(tag.id)}
                    className="flex items-center justify-between rounded-lg px-2.5 py-1.5 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={checkboxClass(value.includes(tag.id))}>
                        {value.includes(tag.id) && (
                          <CheckIcon
                            aria-hidden="true"
                            className="h-3 w-3 text-primary-foreground"
                          />
                        )}
                      </div>
                      <TagIcon
                        aria-hidden="true"
                        className="h-4 w-4 text-muted-foreground"
                      />
                      <span className="text-sm font-medium text-foreground">
                        {tag.name}
                        {tag.count > 0 ? ` (${tag.count})` : ""}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {/* Segments Group */}
            {isSegmentsLoading ||
            segments.length === 0 ||
            filteredSegments.length > 0 ? (
              <CommandGroup heading="Segment" className="p-1.5">
                {isSegmentsLoading ? (
                  <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    Loading saved segments…
                  </div>
                ) : filteredSegments.length > 0 ? (
                  filteredSegments.map((segment) => (
                    <CommandItem
                      key={segment.id}
                      value={`${segment.name} ${segment.id}`}
                      onSelect={() => toggleAudience(segment.id)}
                      className="flex items-center justify-between rounded-lg px-2.5 py-1.5 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={checkboxClass(value.includes(segment.id))}
                        >
                          {value.includes(segment.id) && (
                            <CheckIcon
                              aria-hidden="true"
                              className="h-3 w-3 text-primary-foreground"
                            />
                          )}
                        </div>
                        <BoltIcon
                          aria-hidden="true"
                          className="h-4 w-4 text-muted-foreground"
                        />
                        <span className="text-sm font-medium text-foreground">
                          {segment.name} ({segment.count})
                        </span>
                      </div>
                      {segment.starred ? (
                        <StarIcon
                          aria-hidden="true"
                          className="h-4 w-4 fill-amber-500 text-amber-500"
                        />
                      ) : null}
                    </CommandItem>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    No segments yet. Create one in{" "}
                    <Link
                      href="/intelligence/segments/create"
                      className="font-medium text-primary underline underline-offset-2"
                    >
                      Intelligence → Segments
                    </Link>
                    .
                  </div>
                )}
              </CommandGroup>
            ) : null}
            {unresolvedSelectionCount > 0 ? (
              <div className="border-t border-border/60 px-3 py-2 text-xs text-muted-foreground">
                {unresolvedSelectionCount} saved audience selection
                {unresolvedSelectionCount > 1 ? "s are" : " is"} attached to
                this campaign but cannot be resolved into current segments.
              </div>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
