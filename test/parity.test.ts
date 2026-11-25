/**
 * Differential tests: the new Turndown-based converter against the original
 * to-markdown implementation, on a hand-written corpus and on thousands of
 * seeded, randomly generated documents. The original always wrote ASCII
 * punctuation, so the new converter is run with it.
 */
import { describe, expect, it } from 'vitest';
import { htmlToMarkdown } from '../src/converter';
import { loadLegacy } from './legacy/oracle';
import { corpus } from './fixtures/corpus';
import { createRandom, randomHtml } from './fixtures/randomHtml';
import { normalizeMarkdown, textSignature } from './fixtures/normalize';

const legacy = loadLegacy();

/**
 * Inputs where the new converter intentionally differs from the original.
 * All involve whitespace around inline elements, which Turndown positions
 * from the element's text rather than its raw HTML. In each case the original
 * output was a bug (words run together, or doubled spaces).
 */
const deviations: Record<string, { html: string; original: string; now: string }> = {
  'blank inline element between words keeps a single space (was: words joined)': {
    html: 'a<b> </b>b',
    original: 'ab',
    now: 'a b',
  },
  'whitespace-only <span> is a single space (was: doubled)': {
    html: 'a<span> </span>b',
    original: 'a  b',
    now: 'a b',
  },
  'no-break spaces become ordinary spaces, collapsed as such (was: kept)': {
    html: '<p>a&nbsp;b&nbsp;&nbsp;c</p>',
    original: 'a\u00a0b\u00a0\u00a0c',
    now: 'a b c',
  },
  'a no-break space after an escaped number becomes an ordinary space (was: kept)': {
    html: '<p>3.&nbsp;three</p>',
    original: '3\\.\u00a0three',
    now: '3\\. three',
  },
  'Chrome-style styled spans keep single spacing (was: doubled)': {
    html: '<span style="color: rgb(0, 0, 0);">Hello</span><span style="color: rgb(0, 0, 0);"> </span><span style="font-weight: bold;">world</span>',
    original: 'Hello  world',
    now: 'Hello world',
  },
  'whitespace inside nested inline elements stays outside the markers (was: invalid "** *x***")': {
    html: '<p><b><i>x </i></b>y</p>',
    original: '***x* **y',
    now: '***x*** y',
  },
  'hard line break at the end of a spaced inline element is kept (was: lost)': {
    html: '<p>a<em> b<br></em>c</p>',
    original: 'a *b\\*c',
    now: 'a *b\\\n*c',
  },
  // Tables (#4, #23, #21): the original wrote rows that GFM and Pandoc don't read as a table.
  'table without a <thead> takes its first row as the header (was: no delimiter row)': {
    html: '<table><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></table>',
    original: '| 1 | 2 |\n| 3 | 4 |',
    now: '| 1 | 2 |\n| --- | --- |\n| 3 | 4 |',
  },
  '<th> header cells in a <tbody> are the header (was: no delimiter row)': {
    html: '<table><tbody><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></tbody></table>',
    original: '| A | B |\n| 1 | 2 |',
    now: '| A | B |\n| --- | --- |\n| 1 | 2 |',
  },
  'paragraphs in cells stay on the row (was: the table split over blank lines)': {
    html: '<table><thead><tr><th><p>A</p></th><th><p>B</p></th></tr></thead><tbody><tr><td><p>1</p></td><td><p>2</p></td></tr></tbody></table>',
    original: '|\n\nA\n\n |\n\nB\n\n |\n| --- | --- |\n|\n\n1\n\n |\n\n2\n\n |',
    now: '| A | B |\n| --- | --- |\n| 1 | 2 |',
  },
  'a pipe in a cell is escaped (was: an extra cell)': {
    html: '<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>x | y</td></tr></tbody></table>',
    original: '| A |\n| --- |\n| x | y |',
    now: '| A |\n| --- |\n| x \\| y |',
  },
};

describe('corpus: identical output to the original converter', () => {
  const deviatingInputs = new Set(Object.values(deviations).map((d) => d.html));
  for (const [name, html] of Object.entries(corpus)) {
    if (deviatingInputs.has(html)) continue;
    it(name, () => {
      expect(htmlToMarkdown(html, 'ascii')).toBe(legacy.convert(html));
    });
  }
});

describe('documented deviations from the original converter', () => {
  for (const [name, { html, original, now }] of Object.entries(deviations)) {
    it(name, () => {
      expect(legacy.convert(html), 'original output').toBe(original);
      expect(htmlToMarkdown(html, 'ascii'), 'new output').toBe(now);
      expect(textSignature(now)).toBe(textSignature(original));
    });
  }
});

describe('fuzzing against the original converter', () => {
  const SEEDS = 1500;

  it(`well-formed documents (${SEEDS} seeds): same content and structure, mostly byte-identical`, () => {
    let identical = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const html = randomHtml(createRandom(seed), { wellFormed: true });
      const expected = legacy.convert(html);
      const actual = htmlToMarkdown(html, 'ascii');
      if (actual === expected) {
        identical++;
        continue;
      }
      expect(normalizeMarkdown(actual), `seed ${seed}: ${html}`).toBe(normalizeMarkdown(expected));
    }
    // Byte-for-byte differences are limited to the whitespace placement
    // described in normalizeMarkdown(); guard against that growing.
    expect(identical / SEEDS).toBeGreaterThan(0.9);
  });

  it(`malformed documents (${SEEDS} seeds): same text and Markdown markers`, () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const html = randomHtml(createRandom(seed));
      expect(textSignature(htmlToMarkdown(html, 'ascii')), `seed ${seed}: ${html}`).toBe(textSignature(legacy.convert(html)));
    }
  });
});

describe('the test oracle', () => {
  it('normalisation does not hide real differences', () => {
    expect(normalizeMarkdown('**a** b')).not.toBe(normalizeMarkdown('*a* b'));
    expect(normalizeMarkdown('-   a\n-   b')).not.toBe(normalizeMarkdown('-   a b'));
    expect(normalizeMarkdown('a\\\nb')).not.toBe(normalizeMarkdown('a\\b'));
    expect(textSignature('[a](b)')).not.toBe(textSignature('a'));
  });
});
