import type { Block } from "payload";

/**
 * Rich-text blocks available inside a post body.
 *
 * Each one is rendered by a matching converter in
 * src/features/website/onchain-suite/blog/components/rich-text.tsx. Adding a
 * block here without adding its converter there renders nothing, so the two
 * must be changed together.
 */

export const CodeBlock: Block = {
  slug: "code",
  interfaceName: "CodeBlock",
  fields: [
    {
      name: "language",
      type: "select",
      defaultValue: "typescript",
      options: [
        { label: "TypeScript", value: "typescript" },
        { label: "JavaScript", value: "javascript" },
        { label: "JSON", value: "json" },
        { label: "Bash", value: "bash" },
        { label: "Solidity", value: "solidity" },
        { label: "SQL", value: "sql" },
        { label: "Plain text", value: "text" },
      ],
    },
    {
      name: "code",
      type: "code",
      required: true,
    },
  ],
};

export const CalloutBlock: Block = {
  slug: "callout",
  interfaceName: "CalloutBlock",
  fields: [
    {
      name: "tone",
      type: "select",
      defaultValue: "info",
      options: [
        { label: "Info", value: "info" },
        { label: "Success", value: "success" },
        { label: "Warning", value: "warning" },
      ],
    },
    {
      name: "body",
      type: "textarea",
      required: true,
    },
  ],
};

export const EmbedBlock: Block = {
  slug: "embed",
  interfaceName: "EmbedBlock",
  fields: [
    {
      name: "url",
      type: "text",
      required: true,
      admin: {
        description:
          "Full URL to embed (YouTube, X post, Figma, Dune dashboard).",
      },
    },
    {
      name: "title",
      type: "text",
      required: true,
      admin: {
        description:
          "Accessible title for the embedded frame. Required for screen readers.",
      },
    },
  ],
};

export const blogBlocks = [CodeBlock, CalloutBlock, EmbedBlock];
