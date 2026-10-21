// Guards the guard: the font coverage check must still fail when a page uses a character no site font can draw.
// Run after `npm run build` (it needs dist/ and the source fonts): node scripts/fonts.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";

const page = new URL("../dist/zz-font-test.html", import.meta.url);
// U+3400 㐀 is in CJK Extension A, which Noto Serif TC does not cover
writeFileSync(page, "<!doctype html><p>㐀</p>");
try {
  const run = spawnSync("node", ["--no-warnings", "scripts/subset-fonts.mjs", "--dist"], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
  assert.equal(run.status, 1, `expected the coverage check to fail, it exited with ${run.status}\n${run.stdout}${run.stderr}`);
  assert.match(run.stderr, /U\+3400 \(dist\/zz-font-test\.html\)/, `the failure should name the character and page\n${run.stderr}`);
  console.log("fonts: coverage check rejects an undrawable character");
} finally {
  rmSync(page, { force: true });
}
