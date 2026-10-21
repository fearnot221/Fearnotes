// Subsets the site fonts to the glyphs the site actually uses and writes woff2 files to public/fonts.
// With --dist the character set is read from the built HTML and the fonts go into dist/ only (public/fonts and
// src/fonts.json stay the development cut, which also holds drafts); without it, from src/ for development.
// Every face receives every non-ASCII character the site renders; a face simply keeps the ones it has, and the
// CSS fallback order (Latin face → Noto Serif TC) then always lands on one of our own fonts, never a system font.
// Each file's content hash goes to src/fonts.json (read by src/fonts.ts) and, with --dist, into the built HTML,
// so a re-cut font always gets a new URL and no browser keeps a cached copy that lacks new characters.
// Source fonts (OFL, google/fonts) are downloaded once into .fonts-cache/ (cached between CI runs too).
import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, extname } from "node:path";
import subsetFont from "subset-font";
import { Blob, Face } from "harfbuzzjs";

const ROOT = new URL("..", import.meta.url).pathname;
const CACHE = join(ROOT, ".fonts-cache");
const OUT = join(ROOT, "public/fonts");
const MANIFEST = join(ROOT, "src/fonts.json");
const FROM_DIST = process.argv.includes("--dist");
const TEXT_EXT = new Set(FROM_DIST ? [".html"] : [".astro", ".ts", ".md", ".mdx", ".css"]);
const GF = "https://raw.githubusercontent.com/google/fonts/main/ofl/";

// the hero word and the year numerals
const DISPLAY = "Fearnotes0123456789";
// ASCII plus the typographic marks copy commonly uses
const LATIN = range(0x20, 0x7e) + " ©·×éèüöä–—‘’“”…•→←↑↓↗€№";
// CJK punctuation and full-width forms, kept even before any copy uses them
const CJK_PUNCT = "，。、；：？！「」『』（）《》〈〉【】—…・～　％＃＆＊＋－／＝";

const fonts = [
  // body text: optical size pinned to text size, which halves the file
  { src: "literata/Literata[opsz,wght].ttf", out: "literata", text: () => LATIN + extra, axes: { opsz: 18, wght: { min: 400, max: 600 } } },
  // display: only the glyphs of the hero word and year numerals, cut at the display optical size
  { src: "literata/Literata[opsz,wght].ttf", out: "literata-display", text: () => DISPLAY, axes: { opsz: 72, wght: 600 } },
  { src: "fragmentmono/FragmentMono-Regular.ttf", out: "fragment-mono", text: () => LATIN + extra },
  // two static cuts are ~40% smaller than one variable file; both carry the full set, so bold text can never miss a glyph
  { src: "notoseriftc/NotoSerifTC[wght].ttf", out: "noto-serif-tc-400", text: () => " " + CJK_PUNCT + extra, axes: { wght: 400 } },
  { src: "notoseriftc/NotoSerifTC[wght].ttf", out: "noto-serif-tc-600", text: () => " " + CJK_PUNCT + extra, axes: { wght: 600 } },
];

function range(a, b) { let s = ""; for (let i = a; i <= b; i++) s += String.fromCodePoint(i); return s; }

async function walk(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const p = join(dir, name);
    if ((await stat(p)).isDirectory()) out.push(...(await walk(p)));
    else if (TEXT_EXT.has(extname(p))) out.push(p);
  }
  return out;
}

// JSON-LD and CSS are never rendered; entities are decoded so "&#39;" counts as "'", not as "&", "#", "3"…
const visible = (html) => html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, "")
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d));

/** every non-ASCII character in the site's text */
async function siteChars() {
  const chars = new Set();
  for (const f of await walk(join(ROOT, FROM_DIST ? "dist" : "src"))) {
    const text = await readFile(f, "utf8");
    for (const ch of FROM_DIST ? visible(text) : text) if (ch.codePointAt(0) > 0x7e && !/\s/.test(ch)) chars.add(ch);
  }
  return [...chars].join("");
}

async function source(path) {
  const file = join(CACHE, path.split("/").pop());
  if (!existsSync(file)) {
    const url = GF + path.replace("[", "%5B").replace("]", "%5D");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download failed ${res.status}: ${url}`);
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
  }
  return readFile(file);
}

const extra = await siteChars();
const hash = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 10);
const hashes = {};
const drawn = new Set(); // every code point the written fonts can actually draw

await mkdir(CACHE, { recursive: true });
await mkdir(OUT, { recursive: true });
for (const f of fonts) {
  // without the source font a new character could never be added: a deploy stops here (the live site keeps its
  // previous, consistent version); local dev keeps the committed subset
  const src = await source(f.src).catch((e) => {
    if (FROM_DIST) { console.error(`fonts: ${e.message}; stopping so no page ships with characters its fonts lack`); process.exit(1); }
    console.warn(`fonts: ${e.message}; keeping public/fonts/${f.out}.woff2`);
  });
  const file = join(OUT, `${f.out}.woff2`);
  // dev only (a deploy has already stopped above): keep the committed subset and its hash
  if (!src) { hashes[f.out] = hash(await readFile(file)); continue; }
  const buf = await subsetFont(src, f.text(), { targetFormat: "woff2", variationAxes: f.axes });
  await writeFile(FROM_DIST ? join(ROOT, "dist/fonts", `${f.out}.woff2`) : file, buf);
  hashes[f.out] = hash(buf);
  // a subset holds exactly the requested characters its source has (harfbuzz reads the source TTF, not woff2)
  const has = new Set(new Face(new Blob(src), 0).collectUnicodes());
  for (const ch of f.text()) if (has.has(ch.codePointAt(0))) drawn.add(ch.codePointAt(0));
  console.log(`${(f.out + ".woff2").padEnd(24)} ${(buf.length / 1024).toFixed(1).padStart(7)} KB  (${[...f.text()].length} glyphs requested)`);
}

// only rewrite the manifest when it changes: in dev, writing it reloads the page
const json = JSON.stringify(hashes, null, 2) + "\n";
if (!FROM_DIST && (!existsSync(MANIFEST) || (await readFile(MANIFEST, "utf8")) !== json)) await writeFile(MANIFEST, json);

if (FROM_DIST) {
  // the HTML was built with the previous hashes: point it at the files just written
  const files = await walk(join(ROOT, "dist"));
  for (const f of files) {
    const html = await readFile(f, "utf8");
    const next = html.replace(/\/fonts\/([a-z0-9-]+)\.woff2\?v=[0-9a-f]+/g, (m, name) => (hashes[name] ? `/fonts/${name}.woff2?v=${hashes[name]}` : m));
    if (next !== html) await writeFile(f, next);
  }
  // coverage check against the glyphs really inside the written files: a character none of our fonts can draw would
  // fall back to a system font and sit in the line in a different face, so it fails the build instead
  const missing = new Map();
  const shown = (html) => visible(html).replace(/<[^>]*\b(?:placeholder|data-copy|data-copied)="([^"]*)"[^>]*>/g, " $1 ").replace(/<[^>]+>/g, " ")
    .replace(/&(amp|lt|gt|quot|nbsp);/g, (_, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"', nbsp: "\u00a0" })[e]);
  // emoji are always drawn by the system's color emoji font, on every site; they are not a mismatch
  for (const f of files) for (const ch of shown(await readFile(f, "utf8"))) if (!drawn.has(ch.codePointAt(0)) && !/\s|\p{Extended_Pictographic}|\uFE0F|\u200D/u.test(ch)) missing.set(ch, f.slice(ROOT.length));
  if (missing.size) {
    console.error("fonts: no site font can draw these characters:", [...missing].map(([c, f]) => `${c} U+${c.codePointAt(0).toString(16).toUpperCase()} (${f})`).join(", "));
    process.exit(1);
  }
  console.log(`fonts: coverage ok, ${files.length} pages`);
}
