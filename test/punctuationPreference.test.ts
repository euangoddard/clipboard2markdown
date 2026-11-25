import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadPunctuation, PUNCTUATION_STORAGE_KEY, savePunctuation } from '../src/punctuationPreference';
import type { Punctuation } from '../src/converter';

const browserStorage = () => localStorage;
const blockedStorage = (): Storage => {
  throw new DOMException('The operation is insecure.', 'SecurityError');
};

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('loadPunctuation', () => {
  it('defaults to typographic punctuation when nothing is stored', () => {
    expect(loadPunctuation(browserStorage)).toBe('typographic');
  });

  it.each(['typographic', 'ascii'] as const)('returns %j once saved', (punctuation: Punctuation) => {
    savePunctuation(browserStorage, punctuation);
    expect(localStorage.getItem(PUNCTUATION_STORAGE_KEY)).toBe(punctuation);
    expect(loadPunctuation(browserStorage)).toBe(punctuation);
  });

  it.each(['ASCII', 'true', ''])('treats the unexpected stored value %j as typographic', (value) => {
    localStorage.setItem(PUNCTUATION_STORAGE_KEY, value);
    expect(loadPunctuation(browserStorage)).toBe('typographic');
  });

  it('falls back to typographic punctuation, with a warning, when the storage is blocked', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(loadPunctuation(blockedStorage)).toBe('typographic');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Could not read'), expect.any(DOMException));
  });
});

describe('savePunctuation', () => {
  it('warns rather than throws when the storage is blocked', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => savePunctuation(blockedStorage, 'ascii')).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Could not remember'), expect.any(DOMException));
  });
});
