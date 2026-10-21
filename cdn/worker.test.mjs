import assert from "node:assert/strict";
import { test } from "node:test";
import worker from "./worker.mjs";

test("fixed upstream, version query, Range, CORS, and cache policy", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url.href, "https://blog.fearnot.tw//example.com/font.woff2?v=abc");
    assert.equal(options.headers.get("Range"), "bytes=0-9");
    assert.equal(options.headers.get("Cookie"), null);
    assert.equal(options.headers.get("Authorization"), null);
    assert.equal(options.redirect, "manual");
    assert.equal(options.cf.cacheTtlByStatus["300-599"], 0);
    return new Response("font", { status: 206, headers: { "Content-Type": "font/woff2", "Set-Cookie": "private=1", "Content-Range": "bytes 0-9/100" } });
  });
  const response = await worker.fetch(new Request("https://cdn.fearnot.tw//example.com/font.woff2?v=abc", { headers: { Range: "bytes=0-9", Cookie: "session=secret", Authorization: "Bearer secret" } }));
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal(response.headers.get("Content-Range"), "bytes 0-9/100");
  assert.equal(response.headers.get("Set-Cookie"), null);
  assert.equal(response.headers.get("Cache-Control"), "public, max-age=600");
});

test("HEAD preserves conditional headers and has no body", async (t) => {
  t.mock.method(globalThis, "fetch", async (_, options) => {
    assert.equal(options.method, "HEAD");
    assert.equal(options.headers.get("If-None-Match"), '"abc"');
    return new Response(null, { headers: { "Content-Type": "image/png" } });
  });
  const response = await worker.fetch(new Request("https://cdn.fearnot.tw/a.png", { method: "HEAD", headers: { "If-None-Match": '"abc"' } }));
  assert.equal(await response.text(), "");
});

test("pages and redirects return readers to the blog", async (t) => {
  for (const upstream of [new Response("page", { headers: { "Content-Type": "text/html; charset=utf-8" } }), new Response(null, { status: 301, headers: { Location: "https://other.example/" } })]) {
    t.mock.method(globalThis, "fetch", async () => upstream);
    const response = await worker.fetch(new Request("https://cdn.fearnot.tw/p/example/"));
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("Location"), "https://blog.fearnot.tw/p/example/");
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }
});

test("errors are not cached and unavailable origins return 502", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("missing", { status: 404 }));
  const missing = await worker.fetch(new Request("https://cdn.fearnot.tw/missing.pdf"));
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get("Cache-Control"), "no-store");
  t.mock.method(globalThis, "fetch", async () => { throw new Error("offline"); });
  assert.equal((await worker.fetch(new Request("https://cdn.fearnot.tw/a.png"))).status, 502);
});

test("write requests never reach the origin", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", () => { throw new Error("must not fetch"); });
  assert.equal((await worker.fetch(new Request("https://cdn.fearnot.tw/a", { method: "POST" }))).status, 405);
  assert.equal(fetch.mock.callCount(), 0);
});


test("the previously shared sample photo redirects to its permanent filename", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", () => { throw new Error("must not fetch"); });
  const response = await worker.fetch(new Request("https://cdn.fearnot.tw/_astro/night-shift-demo.doBC5Ccp_xB3RB.webp"));
  assert.equal(response.status, 301);
  assert.equal(response.headers.get("Location"), "https://cdn.fearnot.tw/blog/night-shift-demo.webp");
  assert.equal(fetch.mock.callCount(), 0);
});
