import { parse } from "parse5";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";

export function cdnOrigin(value = "") {
  if (!value) return "";
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("PUBLIC_CDN_URL must be an HTTPS origin, e.g. https://cdn.fearnot.tw");
  }
  return url.origin;
}

// Only published files move to the CDN; page links, third-party URLs and inline data stay intact.
export function rewriteAssets(html, page, assets, origin) {
  const edits = [];
  const assetURL = (value) => {
    if (!value || /^(?:#|data:|blob:)/i.test(value)) return value;
    const url = new URL(value, page);
    if (url.origin !== "https://blog.fearnot.tw" || !assets.has(decodeURIComponent(url.pathname))) return value;
    return origin + url.pathname + url.search + url.hash;
  };
  const visit = (node) => {
    for (const attr of node.attrs ?? []) {
      let next = attr.value;
      if (["src", "href", "poster"].includes(attr.name) ||
          (node.tagName === "meta" && ["og:image", "twitter:image"].includes(node.attrs.find((a) => a.name === "property" || a.name === "name")?.value) && attr.name === "content")) {
        next = assetURL(next);
      } else if (attr.name === "srcset") {
        // Data URLs can contain commas; leave those candidates intact.
        next = next.replace(/(^|,\s*)(\S+)(\s+[^,]+)?/g, (_, separator, url, descriptor = "") => separator + assetURL(url) + descriptor);
      }
      if (next !== attr.value) {
        const loc = node.sourceCodeLocation.attrs[attr.name];
        edits.push([loc.startOffset, loc.endOffset, `${attr.name}="${next.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}"`]);
      }
    }
    for (const child of node.childNodes ?? []) visit(child);
    if (node.content) visit(node.content);
  };
  visit(parse(html, { sourceCodeLocationInfo: true }));
  for (const [start, end, text] of edits.sort((a, b) => b[0] - a[0])) html = html.slice(0, start) + text + html.slice(end);
  return html;
}

async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map((e) => e.isDirectory() ? files(join(dir, e.name)) : join(dir, e.name)))).flat();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const origin = cdnOrigin(process.env.PUBLIC_CDN_URL);
  if (origin) {
    const root = fileURLToPath(new URL("../", import.meta.url));
    const assets = new Set((await files(join(root, "public"))).map((f) => "/" + relative(join(root, "public"), f)));
    // robots.txt describes the blog itself, not a downloadable asset.
    assets.delete("/robots.txt");
    for (const file of await files(join(root, "dist"))) {
      if (!file.endsWith(".html")) continue;
      const path = relative(join(root, "dist"), file).replace(/index\.html$/, "");
      const html = await readFile(file, "utf8");
      await writeFile(file, rewriteAssets(html, new URL(path, "https://blog.fearnot.tw/"), assets, origin));
    }
    console.log(`cdn: public files use ${origin}`);
  }
}
