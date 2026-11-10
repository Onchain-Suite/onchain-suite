/*
 * Home's to-do list: what needs someone today (2.7, 7 Nov 2026).
 *
 * Home used to be a report that Campaigns repeated and Analytics answered
 * better. People open the product to find out what is waiting for them, so
 * Home reads the same records the other screens read and turns them into
 * things to do, most pressing first, each with the one button that does it.
 *
 * Every item is worked out from data the API returns today; nothing is typed
 * in, so Home cannot disagree with the screen its button opens. Items the
 * reference has that the backend cannot back yet (follow-ups, unsubscribe
 * requests, valuable contacts going quiet, duplicate contacts) are left out
 * rather than faked.
 */

export type Urgency = "now" | "today" | "soon";

export type TodayIcon = "inbox" | "loop" | "clock" | "draft" | "mail";

export interface TodayItem {
  /** Steady across renders, so "done for today" sticks to the same item. */
  id: string;
  urgency: Urgency;
  icon: TodayIcon;
  title: string;
  why: string;
  action: { label: string; href: string };
}

export interface TodayInput {
  unread: {
    count: number;
    /** The newest unread thread, for the "Latest:" line. */
    latest?: { id: string; from?: string; snippet?: string };
  };
  pausedLoops: { id: string; name: string; entries: number }[];
  campaigns: {
    id: string;
    name: string;
    status: string;
    recipients?: number;
    scheduledFor?: Date;
  }[];
  /** Undefined while unknown, so a slow read never shows a false alarm. */
  domainVerified?: boolean;
}

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/** "“A” and “B”", "“A”, “B” and 2 others". */
export const listOf = (names: string[], max = 2) =>
  names.length <= max
    ? names.join(" and ")
    : `${names.slice(0, max).join(", ")} and ${plural(names.length - max, "other")}`;

const quote = (s: string) => `“${s}”`;

const shorten = (s: string, max = 90) =>
  s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;

const ORDER: Record<Urgency, number> = { now: 0, today: 1, soon: 2 };

export function todayItems(input: TodayInput): TodayItem[] {
  const out: TodayItem[] = [];

  // Replies a person wrote, waiting for an answer.
  if (input.unread.count > 0) {
    const { latest } = input.unread;
    const said = latest?.snippet?.trim();
    out.push({
      id: "replies",
      urgency: "now",
      icon: "inbox",
      title:
        input.unread.count === 1
          ? "1 reply is waiting for you"
          : `${plural(input.unread.count, "reply", "replies")} are waiting for you`,
      why: said
        ? `Latest${latest?.from ? ` from ${latest.from}` : ""}: ${quote(shorten(said))}`
        : "People answered your campaigns.",
      action: {
        label: "Open Inbox",
        href: latest
          ? `/inbox?thread=${encodeURIComponent(latest.id)}`
          : "/inbox",
      },
    });
  }

  // A paused Loop is a promise nobody is keeping: people keep qualifying and hear nothing.
  for (const loop of input.pausedLoops) {
    out.push({
      id: `loop-paused:${loop.id}`,
      urgency: "today",
      icon: "loop",
      title: `${loop.name} is paused`,
      why:
        loop.entries > 0
          ? `${plural(loop.entries, "person", "people")} entered it in the last 30 days. Nobody new hears from it until you turn it back on.`
          : "Nobody new hears from it until you turn it back on.",
      action: {
        label: "Open Loop",
        href: `/automations/${encodeURIComponent(loop.id)}`,
      },
    });
  }

  // Sends that go out on their own: the last chance to check a message is before it leaves.
  const scheduled = input.campaigns
    .filter((c) => c.status === "scheduled")
    .sort(
      (a, b) =>
        (a.scheduledFor?.getTime() ?? Infinity) -
        (b.scheduledFor?.getTime() ?? Infinity)
    );
  const [next] = scheduled;
  if (next) {
    const when = next.scheduledFor
      ? ` on ${next.scheduledFor.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
      : "";
    const to =
      typeof next.recipients === "number" && next.recipients > 0
        ? `Goes to ${plural(next.recipients, "person", "people")}${when}.`
        : `Goes out${when}.`;
    out.push({
      id: "scheduled",
      urgency: "soon",
      icon: "clock",
      title:
        scheduled.length === 1
          ? `${next.name} is scheduled`
          : `${scheduled.length} sends are scheduled`,
      why:
        scheduled.length === 1
          ? `${to} Give it a last read before it sends.`
          : `${listOf(scheduled.map((c) => quote(c.name)))}. Give each a last read before it sends.`,
      action: {
        label: scheduled.length === 1 ? "Review" : "Review them",
        href:
          scheduled.length === 1
            ? `/campaigns/${encodeURIComponent(next.id)}`
            : "/campaigns",
      },
    });
  }

  // Drafts left unfinished, as one item.
  const drafts = input.campaigns.filter((c) => c.status === "draft");
  const [firstDraft] = drafts;
  if (firstDraft) {
    out.push({
      id: "drafts",
      urgency: "soon",
      icon: "draft",
      title:
        drafts.length === 1
          ? `${firstDraft.name} is still a draft`
          : `${drafts.length} campaigns are still drafts`,
      why: "Finish them, or delete the ones you no longer need so they stop waiting here.",
      action: {
        label: drafts.length === 1 ? "Finish it" : "See drafts",
        href:
          drafts.length === 1
            ? `/campaigns/${encodeURIComponent(firstDraft.id)}`
            : "/campaigns",
      },
    });
  }

  // Email without a verified domain lands in spam, or does not send at all.
  if (input.domainVerified === false) {
    out.push({
      id: "sender",
      urgency: "soon",
      icon: "mail",
      title: "Your sending domain is not verified",
      why: "Until it is, campaigns cannot send email from your own address.",
      action: {
        label: "Set it up",
        href: "/integrations?tab=channels&channel=email",
      },
    });
  }

  return out.sort((a, b) => ORDER[a.urgency] - ORDER[b.urgency]);
}

/** The header sentence: how many things, and how many of them are urgent. */
export function todaySummary(items: TodayItem[]): {
  count: number;
  now: number;
} {
  return {
    count: items.length,
    now: items.filter((i) => i.urgency === "now").length,
  };
}

/* ---------------- dismissals ----------------
 * "Done for today" hides an item until tomorrow, on this device. It comes
 * back if it is still true tomorrow: a to-do list, not a mute button. */
const KEY = "ocs-today-dismissed";
const stamp = (d: Date) => d.toISOString().slice(0, 10);

export function parseDismissed(raw: string | null, today: Date): Set<string> {
  try {
    const parsed = JSON.parse(raw ?? "{}") as { day?: unknown; ids?: unknown };
    if (parsed.day !== stamp(today) || !Array.isArray(parsed.ids))
      return new Set();
    return new Set(
      parsed.ids.filter((x): x is string => typeof x === "string")
    );
  } catch {
    return new Set();
  }
}

export function readDismissed(today = new Date()): Set<string> {
  try {
    return parseDismissed(window.localStorage.getItem(KEY), today);
  } catch {
    return new Set();
  }
}

export function dismissForToday(id: string, today = new Date()): Set<string> {
  const ids = readDismissed(today);
  ids.add(id);
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ day: stamp(today), ids: [...ids] })
    );
  } catch {
    // Storage blocked: the item just stays visible.
  }
  return ids;
}
