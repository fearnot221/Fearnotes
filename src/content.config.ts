import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    // YAML reads an unquoted YYYY-MM-DD as a date; anything else (2026/5/20, 2026-13-45, quoted) stays text and fails here
    date: z.date(),
    updated: z.date().optional(),
    // cards keep their tags space-separated for the home filter, so a tag must be one word
    tags: z.array(z.string().regex(/^\S+$/, "標籤不能含空白，請改用連字號，例如 red-team")).default([]),
    lang: z.enum(["zh", "en"]).default("zh"),
    /** path relative to the post, e.g. ./cover.jpg next to an index.md; resized and converted at build time */
    cover: image().optional(),
    coverAlt: z.string().optional(),
  }),
});

export const collections = { posts };
