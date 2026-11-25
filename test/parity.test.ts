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
