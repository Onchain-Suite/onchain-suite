export type AudienceTab = "contacts" | "segments" | "lists";

const n = (v: number) => v.toLocaleString("en-US");
const s = (v: number, one: string, many = `${one}s`) =>
  `${n(v)} ${v === 1 ? one : many}`;

/**
 * The Audience header's one sentence, per tab (2.7): what is here and what to
 * know about it. It replaced four stat cards. Reachability is per channel, so
 * a wallet with no email is counted as a contact, never as a gap.
 */
export function AudienceAnswerLine({
  tab,
  total,
  withWallet,
  emailReachable,
  pushReachable,
  segments,
  lists,
  tags,
}: {
  tab: AudienceTab;
  total: number;
  withWallet: number;
  emailReachable?: number;
  pushReachable?: number;
  segments?: number;
  lists: number;
  tags: number;
}) {
  if (tab === "segments") {
    if (segments === undefined)
      return "Groups defined by rules, kept up to date as people start and stop matching.";
    return (
      <>
        <b>{s(segments, "segment")}</b>, each kept up to date as people start
        and stop matching its rules.
      </>
    );
  }
  if (tab === "lists") {
    return (
      <>
        <b>{s(lists, "list")}</b> and <b>{s(tags, "tag")}</b>. A list is people
        you add, by hand, by import or through a form. A tag is a label on a
        person.
      </>
    );
  }
  if (total === 0) {
    return "Everyone you can reach: imported contacts, form sign-ups and wallets that connect to your app.";
  }
  const reach = [
    emailReachable !== undefined ? `${n(emailReachable)} by email` : null,
    pushReachable !== undefined ? `${n(pushReachable)} by in-app push` : null,
  ].filter(Boolean);
  return (
    <>
      <b>{s(total, "contact")}</b>, {n(withWallet)} with a wallet.
      {reach.length > 0 ? ` You can reach ${reach.join(" and ")}.` : null}
    </>
  );
}
