import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"posts">;
export type Lang = Post["data"]["lang"];

/** Newest first. Drafts show in `astro dev` only. */
export async function getPosts() {
  const posts = (await getCollection("posts", (p) => import.meta.env.DEV || !p.data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  return posts.map((post) => ({ post }));
}

/** 2026-10-21, in Taiwan time so a late-night post never lands on the next day */
export const ymd = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });

/** ~400 CJK characters or ~220 English words a minute */
export function minutes(body = "") {
  const text = body.replace(/```[\s\S]*?```/g, " ").replace(/<[^>]+>|[#>*_`~\[\]()!-]/g, " ");
  const cjk = (text.match(/[㐀-鿿豈-﫿]/g) ?? []).length;
  const words = (text.replace(/[㐀-鿿豈-﫿]/g, " ").match(/[A-Za-z0-9]+/g) ?? []).length;
  return Math.max(1, Math.round(cjk / 400 + words / 220));
}

/** view-transition-name must be a CSS ident: links a ledger row's title to the article heading */
export const vtName = (id: string) => `t-${id.replace(/[^\p{L}\p{N}_-]/gu, "-")}`;

export const tagHref = (t: string) => `/tags/${encodeURIComponent(t)}/`;

export const ui = {
  min: { zh: (n: number) => `${n} 分鐘`, en: (n: number) => `${n} min read` },
  contents: { zh: "目錄", en: "Contents" },
  updated: { zh: "更新於", en: "Updated" },
  prev: { zh: "較舊", en: "Older" },
  next: { zh: "較新", en: "Newer" },
  back: { zh: "回到日誌", en: "Back to the log" },
  copy: { zh: "複製", en: "Copy" },
  copied: { zh: "已複製", en: "Copied" },
} as const;
