import hashes from "./fonts.json";

/** Font URL with a content hash: every re-cut subset gets a new URL, so no browser keeps using a copy that lacks new characters. */
const cdn = import.meta.env.PROD ? (import.meta.env.PUBLIC_CDN_URL ?? "").replace(/\/$/, "") : "";
export const font = (name: keyof typeof hashes) => `${cdn}/fonts/${name}.woff2?v=${hashes[name]}`;

export const fontFaces = [
  `@font-face { font-family: "Literata"; src: url("${font("literata")}") format("woff2"); font-weight: 400 600; font-display: swap; }`,
  `@font-face { font-family: "Literata Display"; src: url("${font("literata-display")}") format("woff2"); font-weight: 600; font-display: swap; }`,
  `@font-face { font-family: "Fragment Mono"; src: url("${font("fragment-mono")}") format("woff2"); font-weight: 400; font-display: swap; }`,
  // the CJK serif is the largest file: "optional" means a late arrival never repaints or shifts the page; the whole page then uses
  // the system serif for that view (one face throughout, never mixed), and the cached file is used from the next view on
  `@font-face { font-family: "Noto Serif TC"; src: url("${font("noto-serif-tc-400")}") format("woff2"); font-weight: 400; font-display: optional; }`,
  `@font-face { font-family: "Noto Serif TC"; src: url("${font("noto-serif-tc-600")}") format("woff2"); font-weight: 600; font-display: optional; }`,
].join("\n");
