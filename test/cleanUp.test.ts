import { describe, expect, it } from 'vitest';
import { cleanUpMarkdown, type Punctuation } from '../src/converter';

const PUNCTUATIONS: Punctuation[] = ['typographic', 'ascii'];

describe('cleanUpMarkdown', () => {
  describe('with typographic punctuation', () => {
    it.each([
      ['curly quotes and primes', '‘a’ ´ “b” 5″'],
      ['dashes and the minus sign', 'a–b a―b a—b −1'],
      ['the ellipsis', 'wait…'],
      ['bullet glyphs within a line', 'one • two · three ▪ four'],
    ])('keeps %s', (_, text) => {
      expect(cleanUpMarkdown(text, 'typographic')).toBe(text);
    });

    it.each([
      ['•', '• one\n• two', '- one\n- two'],
      ['·', '·   one\n·   two', '-   one\n-   two'],
      ['▪', 'list:\\\n▪ one', 'list:\\\n- one'],
      ['indented ·', 'a\n\n  · one', 'a\n\n  - one'],
    ])('turns %s bullet glyphs that start a line into list markers', (_, input, expected) => {
      expect(cleanUpMarkdown(input, 'typographic')).toBe(expected);
    });

    it('drops a bullet glyph alone on a line', () => {
      expect(cleanUpMarkdown('a\n•\nb', 'typographic')).toBe('a\nb');
    });
  });

  describe('with ASCII punctuation', () => {
    it.each([
      ['‘a’ ´', "'a' '"],
      ['“a” 5″', '"a" 5"'],
      ['a − • · ▪', 'a - - - -'],
      ['a–b a―b', 'a--b a--b'],
      ['a—b', 'a---b'],
      ['wait…', 'wait...'],
    ])('replaces typographic punctuation in %j', (input, expected) => {
      expect(cleanUpMarkdown(input, 'ascii')).toBe(expected);
    });

    it('drops a bullet glyph alone on a line', () => {
      expect(cleanUpMarkdown('a\n•\nb', 'ascii')).toBe('a\nb');
    });
  });

  describe.each(PUNCTUATIONS)('with %s punctuation', (punctuation) => {
    it.each([
      ['removes trailing spaces from lines', 'a   \nb  ', 'a\nb'],
      ['removes whitespace before a hard line break', 'a  \t\\\nb', 'a\\\nb'],
      ['turns two consecutive hard line breaks into a paragraph break', 'a\\\n\\\nb', 'a\n\nb'],
      ['drops a hard line break that ends a paragraph', 'a\\\n\nb', 'a\n\nb'],
      // `\s*\\\n` runs first and swallows the blank line (as in the original).
      ['pulls a hard line break that starts a paragraph back onto the previous line', 'a\n\n\\\nb', 'a\\\nb'],
      ['drops lines containing only a hyphen', 'a\n-\nb', 'a\nb'],
      ['collapses runs of blank lines', 'a\n\n\n\n\nb', 'a\n\nb'],
      ['trims leading whitespace and trailing whitespace or backslashes', '\n\n  a\\\n\\ \n', 'a'],
    ])('%s', (_, input, expected) => {
      expect(cleanUpMarkdown(input, punctuation)).toBe(expected);
    });
  });
});
