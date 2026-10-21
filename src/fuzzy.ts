// Fuzzy matching for the home page finder. Each query word must match the title, tags or summary in one of three ways,
// from strongest to weakest: as a substring ("dns"), as letters in order with gaps ("wrshk" → "wireshark",
// "緩衝溢位" → "緩衝區溢位"), or as a word with one or two typos ("wireshrak" → "wireshark"). Title hits weigh most.

export interface Doc { title: string; tags: string; desc: string }
export interface Hit { score: number; title: number[] } // title: indexes of matched title characters, for highlighting

const fields = [["title", 3], ["tags", 2], ["desc", 1]] as const;

/** Damerau–Levenshtein distance (with adjacent swaps), stopping early once it exceeds max */
function distance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

/** best way one word matches one text: a score in 0–1 and the matched character positions */
function matchWord(word: string, text: string): { score: number; at: number[] } | null {
  const lower = text.toLowerCase();
  // string searches return UTF-16 offsets; highlighting counts characters, and an emoji is two UTF-16 units
  const char = (i: number) => [...lower.slice(0, i)].length;
  const pos = lower.indexOf(word);
  if (pos >= 0) return { score: pos === 0 || /\W/.test(lower[pos - 1]) ? 1 : 0.9, at: [...word].map((_, i) => char(pos) + i) };

  // letters in order: tight runs score higher; a match spread over too much text is noise, not a hit
  const at: number[] = [];
  let from = 0;
  for (const ch of word) {
    const i = lower.indexOf(ch, from);
    if (i < 0) { at.length = 0; break; }
    at.push(i);
    from = i + ch.length;
  }
  if (at.length && word.length > 1) {
    const span = at.at(-1)! - at[0] + 1;
    if (span <= word.length * 3) return { score: 0.4 + 0.4 * (word.length / span), at: at.map(char) };
  }

  // typos: only for Latin words long enough that one wrong letter still leaves them recognisable
  if (word.length >= 4 && /^[\x00-\x7f]+$/.test(word)) {
    const max = word.length >= 8 ? 2 : 1;
    for (const m of lower.matchAll(/[a-z0-9]+/g)) {
      const d = distance(word, m[0], max);
      if (d <= max) return { score: 0.35 - d * 0.1, at: [...m[0]].map((_, i) => char(m.index!) + i) };
    }
  }
  return null;
}

/** null when some query word matches nothing; otherwise a relevance score (higher is better) */
export function fuzzy(query: string, doc: Doc): Hit | null {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  let score = 0;
  const title = new Set<number>();
  for (const word of words) {
    let best = 0;
    for (const [field, weight] of fields) {
      const m = matchWord(word, doc[field]);
      if (m && m.score * weight > best) best = m.score * weight;
      if (m && field === "title") m.at.forEach((i) => title.add(i));
    }
    if (!best) return null;
    score += best;
  }
  return { score, title: [...title].sort((a, b) => a - b) };
}
