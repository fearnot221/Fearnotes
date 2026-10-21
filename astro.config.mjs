import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { execFile } from "node:child_process";

// The CJK fonts only hold the characters the site uses. In dev, re-cut them whenever a source file changes,
// or new text would fall back glyph by glyph to a system font and mix two typefaces in one line.
const refreshFonts = {
  name: "refresh-fonts",
  apply: "serve",
  configureServer(server) {
    let timer;
    const run = (file) => {
      if (!/[\\/]src[\\/].*\.(astro|ts|md|mdx)$/.test(file)) return;
      clearTimeout(timer);
      timer = setTimeout(() => execFile("node", ["--no-warnings", "scripts/subset-fonts.mjs"], (err) => {
        if (err) return server.config.logger.warn(`fonts: ${err.message}`);
        server.ws.send({ type: "full-reload" });
      }), 400);
    };
    server.watcher.on("change", run);
    server.watcher.on("add", run);
  },
};

// Code is colored by palette tokens (see prose.css), so it follows the theme toggle with no second stylesheet.
const v = (name) => `var(--code-${name})`;
const tokens = {
  comment: ["comment", "punctuation.definition.comment"],
  keyword: ["keyword", "storage", "storage.type", "storage.modifier", "keyword.operator.new"],
  string: ["string", "string.quoted", "markup.inline.raw"],
  constant: ["constant", "constant.numeric", "constant.language", "support.constant", "variable.other.enummember"],
  fn: ["entity.name.function", "support.function", "meta.function-call"],
  type: ["entity.name.type", "entity.name.class", "support.type", "support.class", "entity.other.inherited-class"],
  tag: ["entity.name.tag", "entity.other.attribute-name", "meta.tag"],
  punct: ["punctuation", "meta.brace", "keyword.operator"],
};
const nightShift = {
  name: "night-shift",
  type: "dark",
  colors: { "editor.foreground": v("fg"), "editor.background": v("bg") },
  tokenColors: [
    { settings: { foreground: v("fg"), background: v("bg") } },
    ...Object.entries(tokens).map(([k, scope]) => ({ scope, settings: { foreground: v(k), ...(k === "comment" && { fontStyle: "italic" }) } })),
  ],
};

export default defineConfig({
  site: "https://blog.fearnot.tw",
  trailingSlash: "always",
  devToolbar: { enabled: false },
  build: { inlineStylesheets: "always" },
  markdown: { shikiConfig: { theme: nightShift } },
  vite: { plugins: [refreshFonts] },
  integrations: [sitemap({ filter: (url) => !/\/404\//.test(url) })],
});
