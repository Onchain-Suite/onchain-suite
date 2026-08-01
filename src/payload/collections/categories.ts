import type { CollectionConfig } from "payload";

import { isBlogManager, publicRead } from "@/payload/access";
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
    read: publicRead,
    create: isBlogManager,
    update: isBlogManager,
    delete: isBlogManager,
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
