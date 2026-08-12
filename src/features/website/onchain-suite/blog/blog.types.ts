import type { Category, Media, Post, User } from "@/payload-types";

/**
 * View models for the public blog.
 *
 * Payload types relations as `number | Media` because they are IDs until a query
 * populates them. Every read in blog.service.ts uses `depth: 1`, so these narrow
 * the unions once at the boundary and components never re-check.
 */

export type BlogAuthor = Pick<
  User,
  "id" | "name" | "bio" | "walletAddress" | "farcaster" | "x"
> & {
  avatar: Media | null;
};

export type BlogCategory = Pick<Category, "id" | "title" | "slug"> & {
  description: string | null;
};

/** A post as rendered on the index / category listings - no body content. */
export type BlogPostSummary = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: string | null;
  coverImage: Media | null;
  authors: BlogAuthor[];
  categories: BlogCategory[];
  tags: string[];
  readingTimeMinutes: number;
};

/** A full post, including the Lexical body and SEO overrides. */
export type BlogPost = BlogPostSummary & {
  content: Post["content"];
  meta: {
    title: string | null;
    description: string | null;
    image: Media | null;
  };
  updatedAt: string;
};

export type BlogPostPage = {
  posts: BlogPostSummary[];
  page: number;
  totalPages: number;
  totalDocs: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};
