const ORIGIN = "https://blog.fearnot.tw";

export default {
  async fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    const url = new URL(request.url);
    // Keep the sample photo URL shared before it moved to a permanent filename.
    if (url.pathname === "/_astro/night-shift-demo.doBC5Ccp_xB3RB.webp") {
      return Response.redirect("https://cdn.fearnot.tw/blog/night-shift-demo.webp", 301);
    }
    // Assign the path after fixing the origin: //example.com must never turn this into an open proxy.
    const upstream = new URL(ORIGIN);
    upstream.pathname = url.pathname;
    upstream.search = url.search;
    const headers = new Headers();
    for (const name of ["Range", "If-Range", "If-None-Match", "If-Modified-Since"]) {
      if (request.headers.has(name)) headers.set(name, request.headers.get(name));
    }
    let response;
    try {
      response = await fetch(upstream, {
        method: request.method, headers, redirect: "manual",
        cf: { cacheEverything: true, cacheTtlByStatus: { "200-299": 600, "300-599": 0 } },
      });
    } catch {
      return new Response("Origin unavailable", { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    if (response.headers.get("Content-Type")?.includes("text/html") || response.status >= 300 && response.status < 400 && response.status !== 304) {
      return new Response(null, { status: 302, headers: { Location: upstream.href, "Cache-Control": "no-store" } });
    }
    const result = new Response(response.body, response);
    result.headers.delete("Set-Cookie");
    result.headers.set("Access-Control-Allow-Origin", "*");
    result.headers.set("X-Robots-Tag", "noindex");
    result.headers.set("X-Content-Type-Options", "nosniff");
    // public/ files have stable names; revalidate so replacing a file never pins an old copy for a year.
    result.headers.set("Cache-Control", response.ok ? "public, max-age=600" : "no-store");
    return result;
  },
};
