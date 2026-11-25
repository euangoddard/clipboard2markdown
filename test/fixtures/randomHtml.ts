/**
 * Deterministic (seeded) random HTML generator for differential fuzzing.
 */
export function createRandom(seed: number): () => number {
  // mulberry32
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const INLINE = ['em', 'i', 'strong', 'b', 'code', 'kbd', 'sup', 'sub', 'del', 's', 'span', 'cite', 'var', 'u', 'mark'];
const BLOCK = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'section'];
const WORDS = ['alpha', 'beta', 'gamma', 'delta', '“quoted”', 'it’s', 'a—b', 'wait…', '1.', '42', '*star*', '_u_', '#hash', 'x&amp;y', '&lt;tag&gt;'];
const SPACES = ['', ' ', '  ', '\n', '\t', ' \n '];

export interface RandomHtmlOptions {
  /**
   * Generate only well-formed content: no whitespace just inside inline
   * elements and only inline content inside headings. This is the shape of
   * HTML browsers put on the clipboard for ordinary documents.
   */
  wellFormed?: boolean;
}

export function randomHtml(random: () => number, { wellFormed = false }: RandomHtmlOptions = {}): string {
  let depth = 0;
  const pick = <T,>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!;
  const words = () => Array.from({ length: 1 + Math.floor(random() * 3) }, () => pick(WORDS)).join(' ');
  const text = () => (wellFormed ? words() : pick(SPACES) + words() + pick(SPACES));
  const gap = () => (wellFormed ? pick([' ', '\n', '']) : pick(SPACES));
  const children = (max: number) => Array.from({ length: Math.floor(random() * max) + 1 }, () => node()).join(gap());

  function inline(): string {
    const r = random();
    if (depth > 3 || r < 0.35) return text();
    if (r < 0.45) return '<br>';
    if (r < 0.55) return `<a href="http://e.com/${Math.floor(random() * 3)}">${depth++ < 4 ? inline() : 'link'}</a>`;
    if (r < 0.6) return '<img src="i.png" alt="pic">';
    const tag = pick(INLINE);
    depth++;
    const inner = Array.from({ length: 1 + Math.floor(random() * 2) }, inline).join(wellFormed ? ' ' : pick(SPACES));
    depth--;
    return `<${tag}>${inner}</${tag}>`;
  }

  function node(): string {
    const r = random();
    if (depth > 3 || r < 0.4) return inline();
    depth++;
    let out: string;
    if (r < 0.55) {
      const list = random() < 0.5 ? 'ul' : 'ol';
      out = `<${list}>${Array.from({ length: 1 + Math.floor(random() * 3) }, () => `${gap()}<li>${children(2)}</li>`).join('')}</${list}>`;
    } else if (r < 0.6) {
      out = '<hr>';
    } else if (r < 0.65) {
      out = `<pre><code>${text()}\n${text()}</code></pre>`;
    } else if (r < 0.7) {
      out = `<table><thead><tr><th>${text()}</th><th>${inline()}</th></tr></thead><tbody><tr><td>${inline()}</td><td>${text()}</td></tr></tbody></table>`;
    } else {
      const tag = pick(BLOCK);
      const inlineOnly = wellFormed && /^(h\d|p)$/.test(tag);
      const body = inlineOnly ? Array.from({ length: 1 + Math.floor(random() * 3) }, inline).join(' ') : children(3);
      out = `<${tag}>${body}</${tag}>`;
    }
    depth--;
    return out;
  }

  return children(5);
}
