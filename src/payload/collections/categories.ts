import type { CollectionConfig } from "payload";

import { slugField } from "@/payload/fields/slug";

export const Categories: CollectionConfig = {
  slug: "categories",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "updatedAt"],
    group: "Content",
  },
  access: {
    // Public: drives /blog/category/[slug] and the category chips on posts.
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "description",
      type: "textarea",
      admin: {
        description:
          "Used as the meta description on the category archive page.",
      },
    },
    slugField(),
  ],
};
