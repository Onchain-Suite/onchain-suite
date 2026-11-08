import {
  type JSXConverterArgs,
  type JSXConvertersFunction,
  RichText as LexicalRichText,
} from "@payloadcms/richtext-lexical/react";
import Image from "next/image";

import type { BlogPost } from "../blog.types";
import type { ArticleOutline } from "../utils/outline";
import { CopyCodeButton } from "./article/copy-code-button";
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

/** The slice of Lexical's heading node a converter reads. */
type HeadingNode = {
  type: "heading";
  tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  children: Parameters<JSXConverterArgs["nodesToJSX"]>[0]["nodes"];
};

/**
 * Renders a post's Lexical body.
 *
 * This is a Server Component and stays one deliberately: `RichText` walks the
 * serialised node tree and emits plain JSX, so none of Lexical's editor code
 * reaches the browser. Making this a client component would ship the whole
 * editor runtime to every reader (CLAUDE.md §1, §7). The only client code it
 * emits is the small copy button on code blocks.
 */

const CALLOUT_TONE_CLASS = {
  info: "blog-callout--info",
  success: "blog-callout--success",
  warning: "blog-callout--warning",
} as const;

function isMedia(value: unknown): value is Media {
  return typeof value === "object" && value !== null && "url" in value;
}

const makeConverters =
  (idFor: ArticleOutline["idFor"]): JSXConvertersFunction =>
  ({ defaultConverters }) => ({
    ...defaultConverters,

    // Headings carry the id the outline computed for this same node object, so
    // outline links, shared "#section" URLs and the hover anchor all agree.
    heading: ({ node, nodesToJSX }: JSXConverterArgs<HeadingNode>) => {
      const Tag = node.tag;
      const id = idFor(node);
      const children = nodesToJSX({ nodes: node.children });

      if (!id) {
        return <Tag>{children}</Tag>;
      }

      return (
        <Tag id={id}>
          {children}
          {/* A mouse convenience for copying a section link. Hidden from
              assistive tech so the heading's name stays its own text; the
              outline already gives keyboard and screen-reader navigation. */}
          <a
            href={`#${id}`}
            className="blog-anchor"
            aria-hidden="true"
            tabIndex={-1}
          >
            #
          </a>
        </Tag>
      );
    },

    // Route inline images through next/image so they get responsive srcsets and
    // lazy loading. Width/height come from Payload's stored dimensions, which
    // keeps CLS at zero (CLAUDE.md §8). Clicking opens the original, full size.
    upload: ({ node }) => {
      const { value } = node;

      if (!isMedia(value) || !value.url) {
        return null;
      }

      return (
        <figure className="blog-figure">
          <a
            href={value.url}
            target="_blank"
            rel="noopener noreferrer"
            className="blog-figure__link"
            aria-label={
              value.alt ? `Open full size: ${value.alt}` : "Open full size"
            }
          >
            <Image
              src={value.url}
              alt={value.alt}
              width={value.width ?? 1600}
              height={value.height ?? 900}
              sizes="(min-width: 1200px) 736px, 100vw"
              className="blog-figure__img"
            />
          </a>
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
        <div className="blog-code-wrap">
          <pre
            className="blog-code"
            data-language={node.fields.language ?? "text"}
          >
            <code>{node.fields.code}</code>
          </pre>
          <CopyCodeButton code={node.fields.code} />
        </div>
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

export function BlogRichText({
  content,
  outline,
}: {
  content: BlogPost["content"];
  /** Heading ids from `buildOutline(content)`; headings render without ids when omitted. */
  outline?: ArticleOutline;
}) {
  const idFor = outline?.idFor ?? (() => undefined);

  return (
    // No `disableContainer` here: the container div is what carries .blog-prose,
    // and the prose styles are descendant selectors on it.
    <LexicalRichText
      data={content}
      converters={makeConverters(idFor)}
      className="blog-prose"
    />
  );
}
