import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getPosts } from "../posts";

export async function GET(context: APIContext) {
  const entries = await getPosts();
  return rss({
    title: "Fearnotes",
    description: "資訊安全、CTF 與網路維運的工作日誌。",
    site: context.site!,
    items: entries.map(({ post }) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      categories: post.data.tags,
      link: `/posts/${post.id}/`,
    })),
    customData: "<language>zh-tw</language>",
  });
}
