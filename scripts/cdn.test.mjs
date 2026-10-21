import assert from "node:assert/strict";
import { test } from "node:test";
import { cdnOrigin, rewriteAssets } from "./cdn.mjs";

const origin = "https://cdn.fearnot.tw";
const page = new URL("https://blog.fearnot.tw/p/example/");
const assets = new Set(["/favicon.ico", "/images/圖.png", "/downloads/notes.pdf", "/images/large.png"]);

test("CDN configuration requires an HTTPS origin", () => {
  assert.equal(cdnOrigin(), "");
  assert.equal(cdnOrigin(origin + "/"), origin);
  for (const value of ["http://cdn.fearnot.tw", origin + "/files", origin + "?x=1", "https://user:pass@cdn.fearnot.tw", "invalid"]) {
    assert.throws(() => cdnOrigin(value));
  }
});

test("public images, downloads, favicon, srcset, and OG images use the CDN", () => {
  const html = '<link rel="icon" href="/favicon.ico"><a href="../../downloads/notes.pdf?x=1&amp;y=2#page=3">PDF</a><img src="/images/圖.png" srcset="/images/圖.png 400w, /images/large.png 800w"><meta property="og:image" content="https://blog.fearnot.tw/images/large.png">';
  const result = rewriteAssets(html, page, assets, origin);
  assert.ok(result.includes(`href="${origin}/favicon.ico"`));
  assert.ok(result.includes(`href="${origin}/downloads/notes.pdf?x=1&amp;y=2#page=3"`));
  assert.ok(result.includes(`src="${origin}/images/%E5%9C%96.png"`));
  assert.ok(result.includes(`srcset="${origin}/images/%E5%9C%96.png 400w, ${origin}/images/large.png 800w"`));
  assert.ok(result.includes(`content="${origin}/images/large.png"`));
});

test("page navigation, external images, data URLs, code, and scripts remain intact", () => {
  const html = '<a href="/p/example/">Post</a><a href="/rss.xml">RSS</a><a href="#title">Title</a><img src="https://example.com/favicon.ico"><img src="data:image/png;base64,AAAA"><img srcset="data:image/png;base64,AAAA 1x, /images/large.png 2x"><pre>&lt;img src="/favicon.ico"&gt;</pre><script>const s = "/favicon.ico";</script>';
  const result = rewriteAssets(html, page, assets, origin);
  assert.equal(result, html.replace('/images/large.png 2x', `${origin}/images/large.png 2x`));
  assert.equal(rewriteAssets(result, page, assets, origin), result);
});
