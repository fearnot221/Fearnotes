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
    tags: z.array(z.string()).default([]),
    lang: z.enum(["zh", "en"]).default("zh"),
    /** path relative to the post, e.g. ./cover.jpg next to an index.md; resized and converted at build time */
    cover: image().optional(),
    coverAlt: z.string().optional(),
  }),
});

export const collections = { posts };
