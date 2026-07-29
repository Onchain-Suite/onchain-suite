import {
  BlocksFeature,
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from "@payloadcms/richtext-lexical";
import type { CollectionConfig } from "payload";

import { blogBlocks } from "@/payload/blocks";
import { slugField } from "@/payload/fields/slug";
import {
  revalidatePostAfterChange,
  revalidatePostAfterDelete,
} from "@/payload/hooks/revalidate-post";

export const Posts: CollectionConfig = {
  slug: "posts",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "_status", "publishedAt", "updatedAt"],
    group: "Content",
    // Wired to the draft preview route, which flips Next into draft mode and
    // renders the unpublished document. See src/app/(frontend)/api/preview.
    livePreview: {
      url: ({ data }) =>
        `/blog/preview/${String(data?.slug ?? "")}?secret=${
          process.env.PAYLOAD_PREVIEW_SECRET ?? ""
        }`,
    },
    preview: (data) =>
      `/blog/preview/${String(data?.slug ?? "")}?secret=${
        process.env.PAYLOAD_PREVIEW_SECRET ?? ""
      }`,
  },
  // Drafts are what make live preview possible: an unpublished document exists
  // in the DB with _status: "draft" and is invisible to the public read access
  // rule below.
  versions: {
    drafts: true,
    maxPerDoc: 20,
  },
  access: {
    /**
     * Anonymous visitors see published posts only. Returning a query constraint
     * (rather than false) lets Payload filter at the database level, so a draft
     * can never leak through the Local API, REST or GraphQL.
     */
    read: ({ req: { user } }) => {
      if (user) {
        return true;
      }
      return { _status: { equals: "published" } };
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => user?.role === "admin",
  },
  hooks: {
    afterChange: [revalidatePostAfterChange],
    afterDelete: [revalidatePostAfterDelete],
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "excerpt",
      type: "textarea",
      required: true,
      maxLength: 300,
      admin: {
        description:
          "One or two sentences. Shown on the blog index and used as the social share description.",
      },
    },
    {
      name: "coverImage",
      type: "upload",
      relationTo: "media",
      admin: {
        description:
          "Shown at the top of the post and as the social share image.",
      },
    },
    {
      name: "content",
      type: "richText",
      required: true,
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
          // h1 is reserved for the post title, so the body starts at h2 to keep
          // a single, correctly ordered heading outline per page.
          HeadingFeature({ enabledHeadingSizes: ["h2", "h3", "h4"] }),
          HorizontalRuleFeature(),
          FixedToolbarFeature(),
          InlineToolbarFeature(),
          BlocksFeature({ blocks: blogBlocks }),
        ],
      }),
    },
    // Sidebar: metadata rather than body content.
    {
      name: "authors",
      type: "relationship",
      relationTo: "users",
      hasMany: true,
      admin: { position: "sidebar" },
    },
    {
      name: "categories",
      type: "relationship",
      relationTo: "categories",
      hasMany: true,
      admin: { position: "sidebar" },
    },
    {
      name: "tags",
      type: "array",
      admin: {
        position: "sidebar",
        description: "Freeform tags. Rendered as chips on the post.",
      },
      fields: [
        {
          name: "tag",
          type: "text",
          required: true,
        },
      ],
    },
    {
      name: "publishedAt",
      type: "date",
      index: true,
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayAndTime" },
        description:
          "Controls ordering on the blog index. Defaults to the moment you first publish.",
      },
      hooks: {
        beforeChange: [
          ({ siblingData, value }) => {
            // Stamp on first publish so editors never have to set it by hand,
            // but never overwrite a date they chose deliberately.
            if (siblingData._status === "published" && !value) {
              return new Date();
            }
            return value;
          },
        ],
      },
    },
    slugField(),
  ],
};
