"use client";

import {
  CheckmarkCircle02Icon,
  File01Icon,
  Globe02Icon,
  GridViewIcon,
  Mail01Icon,
  PlusSignIcon,
  SentIcon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { connectorFor } from "../../data/connectors";
import {
  MIGRATION_CATEGORIES,
  MIGRATION_CONSENT,
  MIGRATIONS,
} from "../../data/migrations";
import { useConnections } from "../../hooks/use-connections";
import {
  requestSource,
  useRequestedSources,
} from "../../hooks/use-requested-sources";
import type { Migration, MigrationCategory } from "../../types/sources";
import { findConnection } from "../../utils/connections";
import {
  migrationCoverage,
  migrationsOfCategory,
  searchMigrations,
} from "../../utils/sources";
import { DirectoryFrame, DirectoryGroup } from "../directory/directory-frame";
import { DirectoryRail, type RailItem } from "../directory/directory-rail";
import { DirectorySearch } from "../directory/directory-search";
import { MigrateDialog } from "./migrate-dialog";
import { MigrationCard } from "./migration-card";
import { Icon, type IconSvgElement } from "@/shared/components/common/hugeicon";

const CATEGORY_ICON: Record<MigrationCategory, IconSvgElement> = {
  email: Mail01Icon,
  lifecycle: SentIcon,
  crm: UserMultipleIcon,
  web3: Globe02Icon,
  file: File01Icon,
};

const CATEGORY_LABEL = new Map(
  MIGRATION_CATEGORIES.map((c) => [c.id, c.label])
);

const RAIL_ICON = "size-[15px] shrink-0";

/** Every category with how many tools it holds: static, so built once. */
const RAIL: RailItem<MigrationCategory | "all">[] = [
  {
    key: "all",
    label: "All",
    icon: <Icon icon={GridViewIcon} className={RAIL_ICON} />,
    count: MIGRATIONS.length,
  },
  ...MIGRATION_CATEGORIES.map((c) => ({
    key: c.id,
    label: c.label,
    icon: <Icon icon={CATEGORY_ICON[c.id]} className={RAIL_ICON} />,
    count: migrationsOfCategory(c.id).length,
  })),
];

const CSV = MIGRATIONS.find((m) => m.category === "file");

/**
 * Migrating in from another tool. Laid out exactly like Sources next door:
 * search across the top, categories down one side, a card per tool. Two tabs
 * that both answer "what can I plug in" should not need learning twice. Tools
 * with a backend importer connect and run in the dialog; the rest take the CSV
 * route, and their cards say so.
 */
export function MigrateList({ reopen = null }: { reopen?: string | null }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<MigrationCategory | "all">("all");
  const [picked, setPicked] = useState<Migration | null>(null);
  // Back from OAuth: reopen that tool's dialog so the migration can start.
  useEffect(() => {
    if (!reopen) return;
    const m = MIGRATIONS.find((x) => connectorFor(x.id)?.id === reopen);
    if (m) setPicked(m);
  }, [reopen]);
  const { connections } = useConnections();
  const requested = useRequestedSources();

  const term = q.trim();
  const results = useMemo(() => searchMigrations(q), [q]);
  const asked = requested.some((r) => r.toLowerCase() === term.toLowerCase());

  const groups = term
    ? [
        {
          id: "results",
          label: `${results.length} ${results.length === 1 ? "tool" : "tools"}`,
          items: results,
        },
      ]
    : MIGRATION_CATEGORIES.filter((c) => cat === "all" || c.id === cat).map(
        (c) => ({
          id: c.id,
          label: c.label,
          items: migrationsOfCategory(c.id),
        })
      );

  const card = (m: Migration) => {
    const def = connectorFor(m.id);
    return (
      <MigrationCard
        key={m.id}
        migration={m}
        categoryLabel={CATEGORY_LABEL.get(m.category) ?? ""}
        coverage={migrationCoverage(m, Boolean(def))}
        connected={
          def ? Boolean(findConnection(connections, def.id)?.verified) : false
        }
        onOpen={setPicked}
      />
    );
  };

  return (
    <>
      <DirectoryFrame
        search={
          <DirectorySearch
            value={q}
            onChange={setQ}
            label="Search tools to migrate from"
            placeholder="What are you moving from? Mailchimp, Klaviyo, HubSpot, a CSV…"
          />
        }
        rail={
          term ? undefined : (
            <DirectoryRail
              label="Migration categories"
              items={RAIL}
              value={cat}
              onChange={setCat}
            >
              <p className="mx-2.5 mt-3.5 hidden text-[11.5px] leading-relaxed text-(--text-tertiary) md:block">
                {MIGRATION_CONSENT}
              </p>
            </DirectoryRail>
          )
        }
      >
        {term && results.length === 0 ? (
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-(--text-primary)">
              No migration built for &ldquo;{term}&rdquo; yet
            </h2>
            <p className="max-w-xl text-sm text-(--text-secondary)">
              Tell us and it goes on the list. Either way your contacts can come
              in today: export a CSV from it, with a wallet or email column, and
              import that.
            </p>
            {asked ? (
              <p className="inline-flex items-center gap-1.5 text-sm text-(--status-success-text)">
                <Icon icon={CheckmarkCircle02Icon} className="size-4" />
                Asked for. We&rsquo;ll email you when it lands.
              </p>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  if (requestSource(term))
                    toast.success(`Noted. We'll look at ${term}`);
                }}
              >
                <Icon icon={PlusSignIcon} className="mr-1.5 size-4" />
                Ask for {term}
              </Button>
            )}
            {CSV ? (
              <div className="grid gap-3 pt-2 sm:grid-cols-2 xl:grid-cols-3">
                {card(CSV)}
              </div>
            ) : null}
          </section>
        ) : (
          groups.map((g) => (
            <DirectoryGroup key={g.id} label={g.label}>
              {g.items.map(card)}
            </DirectoryGroup>
          ))
        )}
      </DirectoryFrame>

      <MigrateDialog
        migration={picked}
        onOpenChange={(open) => {
          if (!open) setPicked(null);
        }}
      />
    </>
  );
}
