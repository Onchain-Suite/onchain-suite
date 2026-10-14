/* Email merge tags and the compliance footer.
 *
 * Every commercial email must carry an unsubscribe mechanism and the sender's identity —
 * CAN-SPAM §7704(a)(3)/(5) and GDPR Art. 21. That makes the footer a legal requirement, not
 * a design choice, so it is modelled as locked blocks that the editor injects into every
 * template (seeded, blank, or imported) and refuses to delete. */

export type MergeTag = {
  tag: string;
  label: string;
  /** What it resolves to in previews and test sends. */
  sample: string;
  group: 'Recipient' | 'Sender' | 'Campaign' | 'Compliance';
  /** Compliance tags cannot be removed from the footer. */
  required?: boolean;
};

export const MERGE_TAGS: MergeTag[] = [
  { tag: '{{first_name}}', label: 'First name', sample: 'Jordan', group: 'Recipient' },
  { tag: '{{ens_or_wallet}}', label: 'ENS or wallet', sample: 'maya.eth', group: 'Recipient' },
  { tag: '{{wallet_short}}', label: 'Wallet (short)', sample: '0x1A2b…9F3e', group: 'Recipient' },
  { tag: '{{sender_name}}', label: 'Sender name', sample: 'Acme', group: 'Sender', required: true },
  { tag: '{{sender_address}}', label: 'Postal address', sample: '2261 Market St #4523, San Francisco, CA 94114', group: 'Sender', required: true },
  { tag: '{{sender_email}}', label: 'Sender email', sample: 'no-reply@example.com', group: 'Sender' },
  { tag: '{{campaign_name}}', label: 'Campaign name', sample: 'Pack drop: Season 2', group: 'Campaign' },
  { tag: '{{unsubscribe_url}}', label: 'Unsubscribe link', sample: 'https://acme.com/u/8f3a2b', group: 'Compliance', required: true },
  { tag: '{{preferences_url}}', label: 'Manage preferences', sample: 'https://acme.com/p/8f3a2b', group: 'Compliance' },
];

/** Tags that must appear somewhere in the email for it to be sendable. */
export const REQUIRED_TAGS = MERGE_TAGS.filter((t) => t.required).map((t) => t.tag);

/** The canonical footer, expressed with merge tags so it personalises per recipient. */
export const FOOTER_REASON = 'You’re receiving this because you opted in at {{sender_name}}.';
export const FOOTER_LEGAL = '{{sender_name}} · {{sender_address}}';
export const FOOTER_LINKS = 'Unsubscribe: {{unsubscribe_url}} · Manage preferences: {{preferences_url}}';

export type FooterBlock = { id: string; type: 'divider' | 'footer'; text?: string; locked: true };

/** The locked block set appended to every template. */
export function footerBlocks(): FooterBlock[] {
  return [
    { id: 'sys-divider', type: 'divider', locked: true },
    { id: 'sys-footer', type: 'footer', text: `${FOOTER_REASON}\n${FOOTER_LEGAL}\n${FOOTER_LINKS}`, locked: true },
  ];
}

/** Resolve merge tags to their sample values for previews and test sends. */
export function renderTags(text: string): string {
  return MERGE_TAGS.reduce((out, t) => out.split(t.tag).join(t.sample), text);
}

/** Which required tags are missing from the whole email body. */
export function missingRequiredTags(allText: string): string[] {
  return REQUIRED_TAGS.filter((t) => !allText.includes(t));
}

/** Guarantees the compliance footer is present and last. Safe to call on every mutation. */
export function ensureFooter<T extends { id: string; type: string }>(blocks: T[]): (T | FooterBlock)[] {
  const body = blocks.filter((b) => !String(b.id).startsWith('sys-'));
  return [...body, ...footerBlocks()] as (T | FooterBlock)[];
}
