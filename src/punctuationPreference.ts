import type { Punctuation } from './converter';

/** The key under which the punctuation choice is remembered in the browser's storage. */
export const PUNCTUATION_STORAGE_KEY = 'clipboard2markdown.punctuation';

/**
 * Reads the remembered punctuation choice. Falls back to typographic
 * punctuation when nothing (or anything unexpected) is stored, or when the
 * storage cannot be used at all, as when the browser blocks site data.
 *
 * `storage` is a function because merely accessing `localStorage` can throw.
 */
export function loadPunctuation(storage: () => Storage): Punctuation {
  try {
    return storage().getItem(PUNCTUATION_STORAGE_KEY) === 'ascii' ? 'ascii' : 'typographic';
  } catch (error) {
    console.warn('Could not read the punctuation choice; using typographic punctuation', error);
    return 'typographic';
  }
}

/**
 * Remembers the punctuation choice. When the storage cannot be used, the
 * choice still applies until the page is closed.
 */
export function savePunctuation(storage: () => Storage, punctuation: Punctuation): void {
  try {
    storage().setItem(PUNCTUATION_STORAGE_KEY, punctuation);
  } catch (error) {
    console.warn('Could not remember the punctuation choice', error);
  }
}
