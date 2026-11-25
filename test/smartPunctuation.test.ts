import { describe, expect, it } from 'vitest';
import { smartPunctuation } from '../src/converter';

describe('smartPunctuation', () => {
  it.each([
    ['‘a’ ´', "'a' '"],
    ['“a” 5″', '"a" 5"'],
    ['− • · ▪', '- - - -'],
    ['a–b a―b', 'a--b a--b'],
    ['a—b', 'a---b'],
    ['wait…', 'wait...'],
  ])('replaces typographic punctuation in %j', (input, expected) => {
    expect(smartPunctuation(input)).toBe(expected);
  });

  it('removes trailing spaces from lines', () => {
    expect(smartPunctuation('a   \nb  ')).toBe('a\nb');
  });

  it('removes whitespace before a hard line break', () => {
    expect(smartPunctuation('a  \t\\\nb')).toBe('a\\\nb');
  });

  it('turns two consecutive hard line breaks into a paragraph break', () => {
    expect(smartPunctuation('a\\\n\\\nb')).toBe('a\n\nb');
  });

  it('drops a hard line break that ends a paragraph', () => {
    expect(smartPunctuation('a\\\n\nb')).toBe('a\n\nb');
  });

  it('pulls a hard line break that starts a paragraph back onto the previous line', () => {
    // `\s*\\\n` runs first and swallows the blank line (as in the original).
    expect(smartPunctuation('a\n\n\\\nb')).toBe('a\\\nb');
  });

  it('drops lines containing only a hyphen', () => {
    expect(smartPunctuation('a\n-\nb')).toBe('a\nb');
  });

  it('collapses runs of blank lines', () => {
    expect(smartPunctuation('a\n\n\n\n\nb')).toBe('a\n\nb');
  });

  it('trims leading whitespace and trailing whitespace or backslashes', () => {
    expect(smartPunctuation('\n\n  a\\\n\\ \n')).toBe('a');
  });
});
