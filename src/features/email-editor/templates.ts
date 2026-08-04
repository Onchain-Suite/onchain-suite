import {
  type BlockNode,
  type ButtonNode,
  createNode,
  DEFAULT_FOOTER,
  defaultEmailLayout,
  type EmailDocument,
  newBlockId,
} from "./blocks";

/** Build a single-column document from an ordered list of nodes. */
function docFrom(nodes: BlockNode[]): EmailDocument {
  const blocks: Record<string, BlockNode> = {};
  const childrenIds: string[] = [];
  for (const node of nodes) {
    const id = newBlockId();
    blocks[id] = node;
    childrenIds.push(id);
  }
  blocks.root = defaultEmailLayout(childrenIds);
  return { version: 2, root: "root", blocks, footer: { ...DEFAULT_FOOTER } };
}

const heading = (
  text: string,
  level: "h1" | "h2" | "h3" = "h2"
): BlockNode => ({
  type: "Heading",
  data: {
    props: { text, level },
    style: { padding: { top: 24, bottom: 8, left: 24, right: 24 } },
  },
});
const text = (t: string): BlockNode => ({
  type: "Text",
  data: {
    props: { text: t },
    style: { padding: { top: 0, bottom: 16, left: 24, right: 24 } },
  },
});
const button = (label: string, accent: string): BlockNode => {
  const node = createNode("Button") as ButtonNode;
  node.data.props.text = label;
  node.data.props.buttonBackgroundColor = accent;
  return node;
};
const divider = (): BlockNode => ({
  type: "Divider",
  data: {
    props: { lineColor: "#E6E8EB", lineHeight: 1 },
    style: { padding: { top: 8, bottom: 8, left: 24, right: 24 } },
  },
});

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  build: () => EmailDocument;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "blank",
    name: "Blank",
    description: "Start from an empty canvas.",
    build: () => docFrom([]),
  },
  {
    id: "welcome",
    name: "Welcome",
    description: "Greet a new wallet and point them to the app.",
    build: () =>
      docFrom([
        heading("Welcome, {{ first_name }} 👋", "h1"),
        text(
          "Thanks for connecting your wallet. You're all set — here's where to start."
        ),
        button("Open the app", "#4f46e5"),
        divider(),
        text("Questions? Just reply to this email."),
      ]),
  },
  {
    id: "announcement",
    name: "Announcement",
    description: "Ship news with a hero heading and CTA.",
    build: () =>
      docFrom([
        heading("Season 2 is live", "h1"),
        text(
          "New drops, new tiers, bigger prize pool. Connect to claim your spot."
        ),
        button("Claim now", "#f97316"),
      ]),
  },
  {
    id: "receipt",
    name: "Receipt",
    description: "Confirm an on-chain action with details.",
    build: () =>
      docFrom([
        heading("Transaction confirmed", "h2"),
        text("Your transaction has been confirmed on-chain."),
        divider(),
        text("Amount: {{ wallet_short }}\nStatus: Confirmed"),
        button("View on explorer", "#111111"),
      ]),
  },
];
