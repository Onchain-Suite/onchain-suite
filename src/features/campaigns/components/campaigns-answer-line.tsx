import type { Campaign } from "../types/campaign";
import { campaignsAnswer, capitalise, formatRate } from "../utils/answer";

/** The header sentence: what was sent, what did best, what is still to go. */
export function CampaignsAnswerLine({ campaigns }: { campaigns: Campaign[] }) {
  const a = campaignsAnswer(campaigns);
  return (
    <>
      {a.sent > 0 ? (
        <>
          You sent{" "}
          <b>
            {a.sent} {a.sent === 1 ? "campaign" : "campaigns"}
          </b>
          {a.delivered !== undefined ? (
            <>
              , <b>{a.delivered.toLocaleString("en-US")} messages</b> delivered
              in all
            </>
          ) : null}
          .
        </>
      ) : (
        "Nothing has gone out yet."
      )}
      {a.best ? (
        <>
          {" "}
          &ldquo;{a.best.name}&rdquo; did best:{" "}
          <b>{formatRate(a.best.openRate)}</b> opened it.
        </>
      ) : null}
      {a.waiting ? <> {capitalise(a.waiting)}.</> : null}
    </>
  );
}
