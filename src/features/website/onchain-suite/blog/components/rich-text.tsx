import {
  type JSXConvertersFunction,
  RichText as LexicalRichText,
} from "@payloadcms/richtext-lexical/react";
import Image from "next/image";

import type { BlogPost } from "../blog.types";
import type {
  CalloutBlock,
  CodeBlock,
  EmbedBlock,
  Media,
} from "@/payload-types";

/**
 * Payload does not publicly re-export `SerializedBlockNode`, so this mirrors the
 * only part of the shape a converter touches. Typing the `fields` payload with
 * the generated block interfaces means a schema change in
 * src/payload/blocks/index.ts surfaces here as a type error rather than as
 * `undefined` in the rendered output.
 */
type BlockNode<TFields> = { fields: TFields };

/**
 * Renders a post's Lexical body.
 *
 * This is a Server Component and stays one deliberately: `RichText` walks the
 * serialised node tree and emits plain JSX, so none of Lexical's editor code
 * reaches the browser. Making this a client component would ship the whole
 * editor runtime to every reader (CLAUDE.md §1, §7).
 */

const CALLOUT_TONE_CLASS = {
  info: "blog-callout--info",
  success: "blog-callout--success",
  warning: "blog-callout--warning",
} as const;

function isMedia(value: unknown): value is Media {
  return typeof value === "object" && value !== null && "url" in value;
}

const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,

  // Route inline images through next/image so they get responsive srcsets and
  // lazy loading. Width/height come from Payload's stored dimensions, which
  // keeps CLS at zero (CLAUDE.md §8).
  upload: ({ node }) => {
    const { value } = node;

    if (!isMedia(value) || !value.url) {
      return null;
    }

    return (
      <figure className="blog-figure">
        <Image
          src={value.url}
          alt={value.alt}
          width={value.width ?? 1600}
          height={value.height ?? 900}
          sizes="(min-width: 768px) 720px, 100vw"
          className="blog-figure__img"
        />
        {value.caption ? (
          <figcaption className="blog-figure__caption">
            {value.caption}
          </figcaption>
        ) : null}
      </figure>
    );
  },

  blocks: {
    code: ({ node }: { node: BlockNode<CodeBlock> }) => (
      <pre className="blog-code" data-language={node.fields.language ?? "text"}>
        <code>{node.fields.code}</code>
      </pre>
    ),

    callout: ({ node }: { node: BlockNode<CalloutBlock> }) => (
      <aside
        className={`blog-callout ${
          CALLOUT_TONE_CLASS[node.fields.tone ?? "info"]
        }`}
      >
        {node.fields.body}
      </aside>
    ),

    embed: ({ node }: { node: BlockNode<EmbedBlock> }) => (
      <div className="blog-embed">
        <iframe
          src={node.fields.url}
          title={node.fields.title}
          loading="lazy"
          allowFullScreen
          className="blog-embed__frame"
        />
      </div>
    ),
  },
});

export function BlogRichText({ content }: { content: BlogPost["content"] }) {
  return (
    // No `disableContainer` here: the container div is what carries .blog-prose,
    // and the prose styles are descendant selectors on it.
    <LexicalRichText
      data={content}
      converters={converters}
      className="blog-prose"
    />
  );
}
