/* The product lane (2.7).
 *
 * The plan's whole argument is a join across two lanes: what a wallet does on the chain, and
 * what the same customer does inside the company's own application. The chain lane has been
 * readable since contracts went into Data. This is the other one, and without it none of the
 * worked examples in the plan could be built — "signed up and connected a wallet but has not
 * placed a position" needs three product events and one contract event in a single rule.
 *
 * Events arrive through the SDK's track(). We do not invent them: the names are the
 * operator's own vocabulary, which is why the catalogue below is a record of what has been
 * seen rather than a list of what is allowed. An event we have never received is not an error
 * to show a growth manager — it is a conversation with their engineer, and the catalogue is
 * what makes that conversation specific.
 */

export interface ProductEvent {
  name: string;
  /** What a growth manager should understand it to mean. Set by the operator, not by us. */
  label: string;
  /** Events in the last 30 days. */
  volume: number;
  lastSeen: string;
  /** Distinct wallets that have fired it. */
  wallets: number;
  /* An event nobody has described is still usable in a rule — it just reads as a raw name on
     a screen where everything else reads as English, which is how a segment ends up built on
     the wrong one. */
  mapped: boolean;
  properties: string[];
}

export const PRODUCT_EVENTS: ProductEvent[] = [
  { name: 'signed_up', label: 'Created an account', volume: 4_182, lastSeen: '2m ago', wallets: 4_182, mapped: true, properties: ['method', 'referrer'] },
  { name: 'completed_setup', label: 'Finished onboarding', volume: 3_104, lastSeen: '6m ago', wallets: 3_104, mapped: true, properties: ['steps', 'seconds'] },
  { name: 'connected_wallet', label: 'Connected a wallet', volume: 2_940, lastSeen: '1m ago', wallets: 2_871, mapped: true, properties: ['provider', 'chain'] },
  { name: 'viewed_market', label: 'Opened a market', volume: 28_410, lastSeen: 'just now', wallets: 5_209, mapped: true, properties: ['market', 'source'] },
  { name: 'placed_position', label: 'Placed a position', volume: 1_864, lastSeen: '4m ago', wallets: 1_204, mapped: true, properties: ['market', 'size'] },
  { name: 'kyc_submitted', label: 'Submitted verification', volume: 612, lastSeen: '22m ago', wallets: 612, mapped: true, properties: ['tier'] },
  /* Arriving and unexplained — the state the catalogue exists to make visible. */
  { name: 'vault_modal_open', label: '', volume: 9_330, lastSeen: 'just now', wallets: 3_017, mapped: false, properties: ['variant'] },
  { name: 'ref_click', label: '', volume: 1_205, lastSeen: '31m ago', wallets: 788, mapped: false, properties: ['code'] },
];
export const unmappedEvents = () => PRODUCT_EVENTS.filter((e) => !e.mapped);

/** Segment and Loop vocabulary. A described event reads as English; an undescribed one has
 *  only its raw name, which is the honest thing to show rather than a guess at its meaning. */
export const productEventFields = () => PRODUCT_EVENTS.map((e) => e.label || e.name);
