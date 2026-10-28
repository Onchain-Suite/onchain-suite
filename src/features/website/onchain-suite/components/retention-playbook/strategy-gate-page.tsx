import "./playbook-styles";
import "./styles/book.css";
import "./styles/gate.css";
import { BookEndpaper } from "@/onchain-suite-website/components/retention-playbook/book/book-endpaper";
import { PlaybookHeader } from "@/onchain-suite-website/components/retention-playbook/playbook-header";
import { NsShell } from "@/onchain-suite-website/components/site/ns-shell";
import type { ClientStrategy } from "@/onchain-suite-website/data/clients";

/**
 * What a gated strategy shows at its own address until the reader enters its
 * passcode: the two logos, the strategy's title and who it is for, and one
 * field. A plain form post, so it works before any script loads.
 */
export function StrategyGatePage({
  strategy,
  wrong,
}: {
  strategy: ClientStrategy;
  /** The last passcode entered did not match. */
  wrong: boolean;
}) {
  return (
    <NsShell>
      <div className="rp-page">
        <PlaybookHeader />
        <main className="rp-gate">
          {strategy.client && <BookEndpaper client={strategy.client} />}
          <h1 className="rp-gate-title">{strategy.chapter.title}</h1>
          <p className="rp-gate-lede">
            {strategy.preparedFor
              ? `Prepared for ${strategy.preparedFor}. `
              : ""}
            Enter the passcode we sent you to read it.
          </p>
          <form
            className="rp-gate-form"
            method="post"
            action="/api/strategy-gate"
          >
            <input type="hidden" name="slug" value={strategy.slug} />
            <label className="rp-gate-label" htmlFor="passcode">
              Passcode
            </label>
            <input
              className="rp-gate-input"
              id="passcode"
              name="passcode"
              type="password"
              autoComplete="off"
              autoCapitalize="none"
              autoFocus
              required
              aria-invalid={wrong || undefined}
              aria-describedby={wrong ? "passcode-error" : undefined}
            />
            {wrong && (
              <p className="rp-gate-error" id="passcode-error" role="alert">
                That passcode did not match, so please try again.
              </p>
            )}
            <button className="btn lg solid" type="submit">
              Open the strategy
            </button>
          </form>
        </main>
      </div>
    </NsShell>
  );
}
