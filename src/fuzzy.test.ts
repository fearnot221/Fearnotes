// Self-check for the finder's fuzzy matching: node src/fuzzy.test.ts
import assert from "node:assert/strict";
import { fuzzy } from "./fuzzy.ts";

const doc = (title: string, tags = "", desc = "") => ({ title, tags, desc });
const shark = doc("Wireshark 追封包：一次 TLS handshake 的全部細節", "network forensics", "打開一份 pcap");
const bof = doc("緩衝區溢位入門：從 gets() 到控制 RIP", "pwn ctf", "一支刻意寫壞的 C 程式");

assert.ok(fuzzy("wireshark", shark), "substring");
assert.ok(fuzzy("wrshk", shark), "letters in order");
assert.ok(fuzzy("wireshrak", shark), "swapped letters");
assert.ok(fuzzy("wiresharc", shark), "one wrong letter");
assert.ok(fuzzy("緩衝溢位", bof), "CJK with a character skipped");
assert.ok(fuzzy("pwn 溢位", bof), "words may hit different fields");
assert.equal(fuzzy("xss", shark), null, "unrelated word");
assert.equal(fuzzy("wireshark xss", shark), null, "every word must match");
assert.equal(fuzzy("wk", doc("w" + "x".repeat(20) + "k")), null, "letters spread too far apart are noise");
assert.ok(fuzzy("tls", shark)!.score > fuzzy("pcap", shark)!.score, "title hits outrank summary hits");
assert.ok(fuzzy("wireshark", shark)!.score > fuzzy("wrshk", shark)!.score, "exact beats scattered");
assert.deepEqual(fuzzy("wire", shark)!.title, [0, 1, 2, 3], "highlight positions");
assert.deepEqual(fuzzy("xss", doc("🔥 XSS"))!.title, [2, 3, 4], "positions count characters, not UTF-16 units");
assert.deepEqual(fuzzy("xs", doc("🔥 X🔥S"))!.title, [2, 4], "scattered match after an emoji");
console.log("fuzzy: all checks passed");
