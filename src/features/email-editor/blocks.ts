/**
 * In-repo email document model (v2), mirroring the EmailBuilder.js data model
 * in a dependency-light way (no zod / MUI / document-core).
 *
 * A document is a flat MAP of blockId -> node. The root is an `EmailLayout`
 * node holding global styles + `childrenIds`. `Container` and `ColumnsContainer`
 * reference their children by id too - so blocks nest arbitrarily while the map
 * stays flat (every node is individually selectable / inspectable).
 *
 * The serializer walks from the root and emits table-based, inline-styled HTML
 * with Outlook (MSO) fallbacks, plus the always-on compliance footer.
 */

/* ------------------------------------------------------------------ fonts */

export type FontFamily =
  | "MODERN_SANS"
  | "BOOK_SANS"
  | "ORGANIC_SANS"
  | "GEOMETRIC_SANS"
  | "HEAVY_SANS"
  | "ROUNDED_SANS"
  | "MODERN_SERIF"
  | "BOOK_SERIF"
  | "MONOSPACE";

// Font names are single-quoted so the stacks embed safely inside a
// double-quoted inline `style="…"` attribute (double quotes would terminate it).
export const FONT_FAMILIES: {
  key: FontFamily;
  label: string;
  value: string;
}[] = [
  {
    key: "MODERN_SANS",
    label: "Modern sans",
    value: "'Helvetica Neue', 'Arial Nova', 'Nimbus Sans', Arial, sans-serif",
  },
  {
    key: "BOOK_SANS",
    label: "Book sans",
    value: "Optima, Candara, 'Noto Sans', source-sans-pro, sans-serif",
  },
  {
    key: "ORGANIC_SANS",
    label: "Organic sans",
    value:
      "Seravek, 'Gill Sans Nova', Ubuntu, Calibri, 'DejaVu Sans', source-sans-pro, sans-serif",
  },
  {
    key: "GEOMETRIC_SANS",
    label: "Geometric sans",
    value:
      "Avenir, 'Avenir Next LT Pro', Montserrat, Corbel, 'URW Gothic', source-sans-pro, sans-serif",
  },
  {
    key: "HEAVY_SANS",
    label: "Heavy sans",
    value:
      "Bahnschrift, 'DIN Alternate', 'Franklin Gothic Medium', 'Nimbus Sans Narrow', sans-serif-condensed, sans-serif",
  },
  {
    key: "ROUNDED_SANS",
    label: "Rounded sans",
    value:
      "ui-rounded, 'Hiragino Maru Gothic ProN', Quicksand, Comfortaa, Manjari, 'Arial Rounded MT Bold', Calibri, source-sans-pro, sans-serif",
  },
  {
    key: "MODERN_SERIF",
    label: "Modern serif",
    value: "Charter, 'Bitstream Charter', 'Sitka Text', Cambria, serif",
  },
  {
    key: "BOOK_SERIF",
    label: "Book serif",
    value:
      "'Iowan Old Style', 'Palatino Linotype', 'URW Palladio L', P052, serif",
  },
  {
    key: "MONOSPACE",
    label: "Monospace",
    value: "'Nimbus Mono PS', 'Courier New', 'Cutive Mono', monospace",
  },
];

export function fontFamilyToCss(
  f: FontFamily | null | undefined
): string | null {
  if (!f) return null;
  return FONT_FAMILIES.find((x) => x.key === f)?.value ?? null;
}

/* ------------------------------------------------------------------ style */

export interface Padding {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Shared style bag; each block type exposes a subset (see STYLE_KEYS). */
export interface BlockStyle {
  color?: string | null;
  backgroundColor?: string | null;
  borderColor?: string | null;
  borderRadius?: number | null;
  fontFamily?: FontFamily | null;
  fontSize?: number | null;
  fontWeight?: "bold" | "normal" | null;
  textAlign?: "left" | "center" | "right" | null;
  padding?: Padding | null;
}

export type StyleKey = keyof BlockStyle;

/** Which style controls each block type shows in the Inspect panel. */
export const STYLE_KEYS: Record<string, StyleKey[]> = {
  Heading: [
    "color",
    "backgroundColor",
    "fontFamily",
    "fontWeight",
    "textAlign",
    "padding",
  ],
  Text: [
    "color",
    "backgroundColor",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "textAlign",
    "padding",
  ],
  Button: [
    "backgroundColor",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "textAlign",
    "padding",
  ],
  Image: ["backgroundColor", "textAlign", "padding"],
  Avatar: ["textAlign", "padding"],
  Divider: ["backgroundColor", "padding"],
  Html: [
    "color",
    "backgroundColor",
    "fontFamily",
    "fontSize",
    "textAlign",
    "padding",
  ],
  ColumnsContainer: ["backgroundColor", "padding"],
  Container: ["backgroundColor", "borderColor", "borderRadius", "padding"],
};

/* ------------------------------------------------------------------ nodes */

export interface HeadingNode {
  type: "Heading";
  data: {
    props: { text: string; level: "h1" | "h2" | "h3" };
    style: BlockStyle;
  };
}
export interface TextNode {
  type: "Text";
  data: { props: { text: string }; style: BlockStyle };
}
export interface ButtonNode {
  type: "Button";
  data: {
    props: {
      text: string;
      url: string;
      size: "x-small" | "small" | "medium" | "large";
      fullWidth: boolean;
      buttonStyle: "rectangle" | "rounded" | "pill";
      buttonBackgroundColor: string;
      buttonTextColor: string;
    };
    style: BlockStyle;
  };
}
export interface ImageNode {
  type: "Image";
  data: {
    props: {
      url: string;
      alt: string;
      linkHref: string | null;
      contentAlignment: "top" | "middle" | "bottom";
      width: number | null;
      height: number | null;
    };
    style: BlockStyle;
  };
}
export interface AvatarNode {
  type: "Avatar";
  data: {
    props: {
      imageUrl: string;
      alt: string;
      shape: "circle" | "square" | "rounded";
      size: number;
    };
    style: BlockStyle;
  };
}
export interface DividerNode {
  type: "Divider";
  data: { props: { lineColor: string; lineHeight: number }; style: BlockStyle };
}
export interface SpacerNode {
  type: "Spacer";
  data: { props: { height: number } };
}
export interface HtmlNode {
  type: "Html";
  data: { props: { contents: string }; style: BlockStyle };
}
export interface ContainerNode {
  type: "Container";
  data: { props: { childrenIds: string[] }; style: BlockStyle };
}
export interface ColumnsContainerNode {
  type: "ColumnsContainer";
  data: {
    props: {
      columnsCount: 2 | 3;
      columnsGap: number;
      contentAlignment: "top" | "middle" | "bottom";
      columns: { childrenIds: string[] }[];
    };
    style: BlockStyle;
  };
}
export interface EmailLayoutNode {
  type: "EmailLayout";
  data: {
    backdropColor: string;
    canvasColor: string;
    borderColor: string | null;
    borderRadius: number;
    fontFamily: FontFamily;
    textColor: string;
    childrenIds: string[];
  };
}

export type BlockNode =
  | HeadingNode
  | TextNode
  | ButtonNode
  | ImageNode
  | AvatarNode
  | DividerNode
  | SpacerNode
  | HtmlNode
  | ContainerNode
  | ColumnsContainerNode
  | EmailLayoutNode;

export type BlockType = BlockNode["type"];
/** Block types the palette can add (everything except the root EmailLayout). */
export type InsertableType = Exclude<BlockType, "EmailLayout">;

/** The always-on compliance footer (opt-in reason + address + unsub links). */
export interface EmailFooter {
  enabled: boolean;
  optInReason: string;
}

export const DEFAULT_FOOTER: EmailFooter = {
  enabled: true,
  optInReason:
    "You're receiving this because you opted in at {{ sender_name }}.",
};

export interface EmailDocument {
  version: 2;
  root: string;
  blocks: Record<string, BlockNode>;
  footer: EmailFooter;
}

/** Merge tags offered in inspect panels; resolved per-recipient at send time. */
export const MERGE_TAGS: { label: string; token: string }[] = [
  { label: "First name", token: "first_name" },
  { label: "ENS or wallet", token: "ens_or_wallet" },
  { label: "Wallet (short)", token: "wallet_short" },
  { label: "Sender name", token: "sender_name" },
  { label: "Postal address", token: "postal_address" },
  { label: "Sender email", token: "sender_email" },
  { label: "Campaign name", token: "campaign_name" },
  { label: "Unsubscribe link", token: "unsubscribe_url" },
  { label: "Manage preferences", token: "manage_preferences_url" },
];

/* --------------------------------------------------------------- id + new */

let idCounter = 0;
export function newBlockId(): string {
  idCounter += 1;
  return `blk_${idCounter}_${Math.floor(idCounter * 2654435761) % 100000}`;
}

const PAD = (t: number, b: number, l: number, r: number): Padding => ({
  top: t,
  bottom: b,
  left: l,
  right: r,
});

/** Factory for a fresh node of each insertable type (matches reference defaults). */
export function createNode(type: InsertableType): BlockNode {
  switch (type) {
    case "Heading":
      return {
        type,
        data: {
          props: { text: "Hello friend", level: "h2" },
          style: { padding: PAD(16, 16, 24, 24) },
        },
      };
    case "Text":
      return {
        type,
        data: {
          props: { text: "My new text block" },
          style: { padding: PAD(16, 16, 24, 24) },
        },
      };
    case "Button":
      return {
        type,
        data: {
          props: {
            text: "Button",
            url: "https://",
            size: "medium",
            fullWidth: false,
            buttonStyle: "rounded",
            buttonBackgroundColor: "#111111",
            buttonTextColor: "#FFFFFF",
          },
          style: { padding: PAD(16, 16, 24, 24) },
        },
      };
    case "Image":
      return {
        type,
        data: {
          props: {
            url: "",
            alt: "",
            linkHref: null,
            contentAlignment: "middle",
            width: null,
            height: null,
          },
          style: { padding: PAD(16, 16, 24, 24) },
        },
      };
    case "Avatar":
      return {
        type,
        data: {
          props: { imageUrl: "", alt: "", shape: "circle", size: 64 },
          style: { padding: PAD(16, 16, 24, 24), textAlign: "center" },
        },
      };
    case "Divider":
      return {
        type,
        data: {
          props: { lineColor: "#CCCCCC", lineHeight: 1 },
          style: { padding: PAD(16, 16, 0, 0) },
        },
      };
    case "Spacer":
      return { type, data: { props: { height: 16 } } };
    case "Html":
      return {
        type,
        data: {
          props: { contents: "<strong>Hello</strong> world" },
          style: { padding: PAD(16, 16, 24, 24) },
        },
      };
    case "Container":
      return {
        type,
        data: {
          props: { childrenIds: [] },
          style: { padding: PAD(16, 16, 24, 24) },
        },
      };
    case "ColumnsContainer":
      return {
        type,
        data: {
          props: {
            columnsCount: 3,
            columnsGap: 16,
            contentAlignment: "middle",
            columns: [
              { childrenIds: [] },
              { childrenIds: [] },
              { childrenIds: [] },
            ],
          },
          style: { padding: PAD(16, 16, 24, 24) },
        },
      };
  }
}

/** Palette + insert-menu metadata (label + which group). */
export const BLOCK_BUTTONS: {
  type: InsertableType;
  label: string;
  group: "block" | "layout";
}[] = [
  { type: "Heading", label: "Heading", group: "block" },
  { type: "Text", label: "Text", group: "block" },
  { type: "Button", label: "Button", group: "block" },
  { type: "Image", label: "Image", group: "block" },
  { type: "Avatar", label: "Avatar", group: "block" },
  { type: "Divider", label: "Divider", group: "block" },
  { type: "Spacer", label: "Spacer", group: "block" },
  { type: "Html", label: "Html", group: "block" },
  { type: "ColumnsContainer", label: "Columns", group: "layout" },
  { type: "Container", label: "Container", group: "layout" },
];

export function defaultEmailLayout(childrenIds: string[]): EmailLayoutNode {
  return {
    type: "EmailLayout",
    data: {
      backdropColor: "#F5F5F5",
      canvasColor: "#FFFFFF",
      borderColor: null,
      borderRadius: 0,
      fontFamily: "MODERN_SANS",
      textColor: "#262626",
      childrenIds,
    },
  };
}

export function defaultDocument(): EmailDocument {
  const h = newBlockId();
  const t = newBlockId();
  const b = newBlockId();
  return {
    version: 2,
    root: "root",
    blocks: {
      root: defaultEmailLayout([h, t, b]),
      [h]: {
        type: "Heading",
        data: {
          props: { text: "Hello friend", level: "h2" },
          style: { padding: PAD(16, 16, 24, 24) },
        },
      },
      [t]: {
        type: "Text",
        data: {
          props: {
            text: "This is a new email. Add blocks from the left, and style each one in Inspect.",
          },
          style: { padding: PAD(0, 16, 24, 24) },
        },
      },
      [b]: {
        ...createNode("Button"),
      } as ButtonNode,
    },
    footer: { ...DEFAULT_FOOTER },
  };
}

/* --------------------------------------------------------------- children */

/** All child-id arrays a container-like node owns (flattened, in order). */
export function childListsOf(node: BlockNode): string[][] {
  if (node.type === "EmailLayout") return [node.data.childrenIds];
  if (node.type === "Container") return [node.data.props.childrenIds];
  if (node.type === "ColumnsContainer")
    return node.data.props.columns.map((c) => c.childrenIds);
  return [];
}

/* ----------------------------------------------------------------- parse */

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

/**
 * Parse a saved document. Accepts the v2 map format, migrates the old v1 flat
 * `{ blocks: EmailBlock[] }` format, and returns null if unrecognizable.
 */
export function parseDocument(raw: unknown): EmailDocument | null {
  if (!isRecord(raw)) return null;

  const footer: EmailFooter = isRecord(raw.footer)
    ? {
        enabled: raw.footer.enabled !== false,
        optInReason:
          typeof raw.footer.optInReason === "string"
            ? raw.footer.optInReason
            : DEFAULT_FOOTER.optInReason,
      }
    : { ...DEFAULT_FOOTER };

  // v2 map format
  if (
    raw.version === 2 &&
    isRecord(raw.blocks) &&
    typeof raw.root === "string"
  ) {
    const blocks = raw.blocks as Record<string, BlockNode>;
    if (!blocks.root) return null;
    return { version: 2, root: "root", blocks, footer };
  }

  // v1 flat migration
  if (Array.isArray(raw.blocks)) {
    return migrateV1(raw.blocks, footer);
  }

  return null;
}

/** Convert the old flat block list into the v2 map model. */
function migrateV1(v1Blocks: unknown[], footer: EmailFooter): EmailDocument {
  const blocks: Record<string, BlockNode> = {};
  const childrenIds: string[] = [];
  for (const b of v1Blocks) {
    if (!isRecord(b) || typeof b.type !== "string") continue;
    const id = newBlockId();
    const node = migrateV1Block(b);
    if (!node) continue;
    blocks[id] = node;
    childrenIds.push(id);
  }
  blocks.root = defaultEmailLayout(childrenIds);
  return { version: 2, root: "root", blocks, footer };
}

function migrateV1Block(b: Record<string, unknown>): BlockNode | null {
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  switch (b.type) {
    case "heading":
      return {
        type: "Heading",
        data: { props: { text: str(b.content), level: "h2" }, style: {} },
      };
    case "text":
      return {
        type: "Text",
        data: { props: { text: str(b.content) }, style: {} },
      };
    case "button": {
      const node = createNode("Button") as ButtonNode;
      node.data.props.text = str(b.content) || "Button";
      node.data.props.url = str(b.url) || "https://";
      return node;
    }
    case "image":
      return {
        type: "Image",
        data: {
          props: {
            url: str(b.src),
            alt: str(b.alt),
            linkHref: null,
            contentAlignment: "middle",
            width: null,
            height: null,
          },
          style: {},
        },
      };
    case "divider":
      return {
        type: "Divider",
        data: { props: { lineColor: "#CCCCCC", lineHeight: 1 }, style: {} },
      };
    case "spacer":
      return {
        type: "Spacer",
        data: { props: { height: typeof b.size === "number" ? b.size : 16 } },
      };
    default:
      return null;
  }
}

/* -------------------------------------------------------------- serialize */

const esc = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const escMultiline = (value: string) => esc(value).replace(/\n/g, "<br />");

const paddingToCss = (p?: Padding | null) =>
  p ? `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px` : undefined;

/** Build inline CSS from a BlockStyle (only the requested keys). */
function styleToCss(style: BlockStyle | undefined, keys: StyleKey[]): string {
  if (!style) return "";
  const out: string[] = [];
  for (const k of keys) {
    const v = style[k];
    if (v === null || v === undefined) continue;
    switch (k) {
      case "color":
        out.push(`color:${v}`);
        break;
      case "backgroundColor":
        out.push(`background-color:${v}`);
        break;
      case "borderColor":
        out.push(`border:1px solid ${v}`);
        break;
      case "borderRadius":
        out.push(`border-radius:${v}px`);
        break;
      case "fontFamily": {
        const css = fontFamilyToCss(v as FontFamily);
        if (css) out.push(`font-family:${css}`);
        break;
      }
      case "fontSize":
        out.push(`font-size:${v}px`);
        break;
      case "fontWeight":
        out.push(`font-weight:${v}`);
        break;
      case "textAlign":
        out.push(`text-align:${v}`);
        break;
      case "padding":
        out.push(`padding:${paddingToCss(v as Padding)}`);
        break;
    }
  }
  return out.join(";");
}

const FALLBACK_FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const BUTTON_SIZE_PAD: Record<
  ButtonNode["data"]["props"]["size"],
  [number, number]
> = {
  "x-small": [4, 8],
  small: [8, 12],
  medium: [12, 20],
  large: [16, 32],
};
const buttonRadius = (s: ButtonNode["data"]["props"]["buttonStyle"]) =>
  s === "rectangle" ? 0 : s === "pill" ? 64 : 4;

/** Render a single node (by id) to inline HTML. Recurses into containers. */
function renderNode(id: string, doc: EmailDocument): string {
  const node = doc.blocks[id];
  if (!node) return "";
  switch (node.type) {
    case "Heading": {
      const { level, text } = node.data.props;
      const size = level === "h1" ? 32 : level === "h3" ? 20 : 24;
      const css = styleToCss(node.data.style, STYLE_KEYS.Heading);
      return `<${level} style="margin:0;font-size:${size}px;line-height:1.25;font-weight:bold;${css}">${escMultiline(text)}</${level}>`;
    }
    case "Text": {
      const css = styleToCss(node.data.style, STYLE_KEYS.Text);
      return `<div style="line-height:1.6;${css}">${escMultiline(node.data.props.text)}</div>`;
    }
    case "Button": {
      const p = node.data.props;
      const [vy, vx] = BUTTON_SIZE_PAD[p.size];
      const radius = buttonRadius(p.buttonStyle);
      const wrapCss = styleToCss(node.data.style, [
        "backgroundColor",
        "textAlign",
        "padding",
      ]);
      const fontCss = styleToCss(node.data.style, [
        "fontFamily",
        "fontSize",
        "fontWeight",
      ]);
      const width = p.fullWidth ? "width:100%;" : "";
      const display = p.fullWidth ? "block" : "inline-block";
      const anchor = `<a href="${esc(p.url || "#")}" target="_blank" style="${width}display:${display};padding:${vy}px ${vx}px;background-color:${esc(
        p.buttonBackgroundColor
      )};color:${esc(p.buttonTextColor)};border-radius:${radius}px;text-decoration:none;text-align:center;font-weight:600;${fontCss}">${esc(p.text)}</a>`;
      return `<div style="${wrapCss}">${anchor}</div>`;
    }
    case "Image": {
      const p = node.data.props;
      const wrapCss = styleToCss(node.data.style, STYLE_KEYS.Image);
      const dims = `${p.width ? `width:${p.width}px;` : "width:100%;max-width:100%;"}${p.height ? `height:${p.height}px;` : "height:auto;"}`;
      const va =
        p.contentAlignment === "top"
          ? "top"
          : p.contentAlignment === "bottom"
            ? "bottom"
            : "middle";
      const img = p.url
        ? `<img src="${esc(p.url)}" alt="${esc(p.alt)}" style="display:inline-block;border:0;outline:none;vertical-align:${va};${dims}" />`
        : `<div style="padding:40px;background:#f2f3f5;color:#9aa0a6;font-size:13px;text-align:center;border-radius:8px;">Image</div>`;
      const linked = p.linkHref
        ? `<a href="${esc(p.linkHref)}" target="_blank">${img}</a>`
        : img;
      return `<div style="${wrapCss}">${linked}</div>`;
    }
    case "Avatar": {
      const p = node.data.props;
      const radius =
        p.shape === "circle"
          ? 9999
          : p.shape === "rounded"
            ? Math.round(p.size * 0.125)
            : 0;
      const wrapCss = styleToCss(node.data.style, STYLE_KEYS.Avatar);
      const img = p.imageUrl
        ? `<img src="${esc(p.imageUrl)}" alt="${esc(p.alt)}" width="${p.size}" height="${p.size}" style="width:${p.size}px;height:${p.size}px;border-radius:${radius}px;object-fit:cover;display:inline-block;border:0;" />`
        : `<div style="width:${p.size}px;height:${p.size}px;border-radius:${radius}px;background:#e6e8eb;display:inline-block;"></div>`;
      return `<div style="${wrapCss}">${img}</div>`;
    }
    case "Divider": {
      const p = node.data.props;
      const wrapCss = styleToCss(node.data.style, STYLE_KEYS.Divider);
      return `<div style="${wrapCss}"><hr style="border:0;border-top:${p.lineHeight}px solid ${esc(p.lineColor)};margin:0;font-size:0;" /></div>`;
    }
    case "Spacer": {
      const h = Math.max(0, node.data.props.height);
      return `<div style="height:${h}px;line-height:${h}px;font-size:1px;mso-line-height-rule:exactly;">&nbsp;</div>`;
    }
    case "Html": {
      const wrapCss = styleToCss(node.data.style, STYLE_KEYS.Html);
      return `<div style="${wrapCss}">${node.data.props.contents}</div>`;
    }
    case "Container": {
      const wrapCss = styleToCss(node.data.style, STYLE_KEYS.Container);
      const inner = node.data.props.childrenIds
        .map((c) => renderNode(c, doc))
        .join("");
      return `<div style="${wrapCss}">${inner}</div>`;
    }
    case "ColumnsContainer": {
      const p = node.data.props;
      const wrapCss = styleToCss(node.data.style, STYLE_KEYS.ColumnsContainer);
      const count = p.columnsCount;
      const gap = p.columnsGap;
      const va =
        p.contentAlignment === "top"
          ? "top"
          : p.contentAlignment === "bottom"
            ? "bottom"
            : "middle";
      const cells: string[] = [];
      for (let i = 0; i < count; i += 1) {
        const col = p.columns[i]?.childrenIds ?? [];
        const inner = col.map((c) => renderNode(c, doc)).join("");
        const padL = i === 0 ? 0 : gap / 2;
        const padR = i === count - 1 ? 0 : gap / 2;
        cells.push(
          `<td width="${Math.floor(100 / count)}%" valign="${va}" style="padding-left:${padL}px;padding-right:${padR}px;">${inner}</td>`
        );
      }
      return `<div style="${wrapCss}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;"><tr>${cells.join("")}</tr></table></div>`;
    }
    case "EmailLayout":
      return node.data.childrenIds.map((c) => renderNode(c, doc)).join("");
  }
}

function renderFooterRow(footer: EmailFooter): string {
  if (!footer.enabled) return "";
  const reason = escMultiline(footer.optInReason);
  return `<tr><td style="padding:24px 32px;border-top:1px solid #e6e8eb;font-family:${FALLBACK_FONT};font-size:12px;line-height:1.6;color:#8a9099;">${reason}<br />{{ sender_name }} · {{ postal_address }}<br /><a href="{{ unsubscribe_url }}" target="_blank" style="color:#8a9099;text-decoration:underline;">Unsubscribe</a> · <a href="{{ manage_preferences_url }}" target="_blank" style="color:#8a9099;text-decoration:underline;">Manage preferences</a></td></tr>`;
}

/** Render the full document to email-safe HTML (MSO fallbacks + footer). */
export function renderDocumentToHtml(doc: EmailDocument): string {
  const root = doc.blocks[doc.root];
  const layout =
    root?.type === "EmailLayout" ? root.data : defaultEmailLayout([]).data;
  const font = fontFamilyToCss(layout.fontFamily) ?? FALLBACK_FONT;
  const body = renderNode(doc.root, doc);
  const canvasBorder = layout.borderColor
    ? `border:1px solid ${layout.borderColor};`
    : "";
  const footer = renderFooterRow(doc.footer ?? DEFAULT_FOOTER);
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="color-scheme" content="light dark" />
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style>
  html,body{margin:0!important;padding:0!important;width:100%!important;}
  *{-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%;}
  table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
  img{-ms-interpolation-mode:bicubic;border:0;line-height:100%;outline:none;text-decoration:none;}
  a{text-decoration:none;}
  @media only screen and (max-width:600px){.ocs-container{width:100%!important;}}
</style>
</head>
<body style="margin:0;padding:0;background:${layout.backdropColor};color:${layout.textColor};font-family:${font};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${layout.backdropColor};">
<tr><td align="center" style="padding:32px 12px;">
<!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="ocs-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:${layout.canvasColor};${canvasBorder}border-radius:${layout.borderRadius}px;color:${layout.textColor};font-family:${font};">
<tr><td>
${body}
</td></tr>
${footer}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;
}

/** Plain-text fallback for deliverability. */
export function renderDocumentToText(doc: EmailDocument): string {
  const lines: string[] = [];
  const walk = (id: string) => {
    const node = doc.blocks[id];
    if (!node) return;
    switch (node.type) {
      case "Heading":
      case "Text":
        if (node.data.props.text.trim())
          lines.push(node.data.props.text.trim());
        break;
      case "Button":
        lines.push(`${node.data.props.text}: ${node.data.props.url}`);
        break;
      case "Image":
        if (node.data.props.alt) lines.push(node.data.props.alt);
        break;
      case "Avatar":
        if (node.data.props.alt) lines.push(node.data.props.alt);
        break;
      case "Divider":
        lines.push("----");
        break;
      case "Html":
        lines.push(
          node.data.props.contents
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
        );
        break;
      case "Container":
        node.data.props.childrenIds.forEach(walk);
        break;
      case "ColumnsContainer":
        node.data.props.columns.forEach((c) => c.childrenIds.forEach(walk));
        break;
      case "EmailLayout":
        node.data.childrenIds.forEach(walk);
        break;
      case "Spacer":
        break;
    }
  };
  walk(doc.root);
  const body = lines.filter(Boolean).join("\n\n");
  const footer = doc.footer?.enabled
    ? `\n\n----\n${doc.footer.optInReason}\n{{ sender_name }} · {{ postal_address }}\nUnsubscribe: {{ unsubscribe_url }} · Manage preferences: {{ manage_preferences_url }}`
    : "";
  return `${body}${footer}`;
}

/* ------------------------------------------------------------ HTML import */

/**
 * Best-effort HTML → document parser for the Import HTML flow (browser only).
 * Produces a v2 document whose root children are the recognised blocks.
 */
export function parseHtmlToDocument(html: string): EmailDocument {
  const blocks: Record<string, BlockNode> = {};
  const childrenIds: string[] = [];
  const push = (node: BlockNode) => {
    const id = newBlockId();
    blocks[id] = node;
    childrenIds.push(id);
  };
  const pushText = (raw: string) => {
    const text = raw.replace(/\s+/g, " ").trim();
    if (text)
      push({
        type: "Text",
        data: { props: { text }, style: { padding: PAD(0, 16, 24, 24) } },
      });
  };

  const finish = () => {
    blocks.root = defaultEmailLayout(childrenIds);
    return {
      version: 2 as const,
      root: "root",
      blocks,
      footer: { ...DEFAULT_FOOTER },
    };
  };

  if (typeof DOMParser === "undefined") {
    pushText(html.replace(/<[^>]+>/g, " "));
    return finish();
  }

  const parsed = new DOMParser().parseFromString(html, "text/html");
  const root = parsed.body ?? parsed.documentElement;

  const isButtonLike = (a: HTMLAnchorElement) => {
    const style = (a.getAttribute("style") ?? "").toLowerCase();
    const role = (a.getAttribute("role") ?? "").toLowerCase();
    return (
      role === "button" ||
      style.includes("background") ||
      style.includes("border-radius")
    );
  };
  const textFromBr = (el: Element) =>
    el.innerHTML
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .split("\n")
      .map((l) => l.trim())
      .join("\n")
      .trim();

  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      const tag = child.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag)) {
        const text = child.textContent?.trim() ?? "";
        const level =
          tag === "h1" ? "h1" : tag === "h3" || tag === "h4" ? "h3" : "h2";
        if (text)
          push({
            type: "Heading",
            data: {
              props: { text, level },
              style: { padding: PAD(16, 16, 24, 24) },
            },
          });
      } else if (tag === "p") {
        const text = textFromBr(child);
        if (text)
          push({
            type: "Text",
            data: { props: { text }, style: { padding: PAD(0, 16, 24, 24) } },
          });
      } else if (tag === "img") {
        const url = child.getAttribute("src") ?? "";
        if (url)
          push({
            type: "Image",
            data: {
              props: {
                url,
                alt: child.getAttribute("alt") ?? "",
                linkHref: null,
                contentAlignment: "middle",
                width: null,
                height: null,
              },
              style: { padding: PAD(16, 16, 24, 24) },
            },
          });
      } else if (tag === "hr") {
        push({
          type: "Divider",
          data: {
            props: { lineColor: "#CCCCCC", lineHeight: 1 },
            style: { padding: PAD(16, 16, 0, 0) },
          },
        });
      } else if (tag === "a") {
        const a = child as HTMLAnchorElement;
        const label = a.textContent?.trim() ?? "";
        if (label && isButtonLike(a)) {
          const node = createNode("Button") as ButtonNode;
          node.data.props.text = label;
          node.data.props.url = a.getAttribute("href") ?? "#";
          push(node);
        } else if (label) {
          pushText(label);
        }
      } else if (child.querySelector("img, a, h1, h2, h3, p, hr")) {
        walk(child);
      } else {
        pushText(child.textContent ?? "");
      }
    }
  };

  walk(root);
  return finish();
}
