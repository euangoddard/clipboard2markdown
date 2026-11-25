import { describe, expect, it } from 'vitest';
import { isPasteShortcut } from '../src/pasteShortcut';

const key = (init: KeyboardEventInit & { keyCode?: number }) => new KeyboardEvent('keydown', init);

describe('isPasteShortcut', () => {
  it('accepts Ctrl+V and ⌘+V', () => {
    expect(isPasteShortcut(key({ key: 'v', ctrlKey: true }))).toBe(true);
    expect(isPasteShortcut(key({ key: 'v', metaKey: true }))).toBe(true);
  });

  it('accepts Ctrl+Shift+V (paste as plain text)', () => {
    expect(isPasteShortcut(key({ key: 'V', ctrlKey: true, shiftKey: true }))).toBe(true);
  });

  it('accepts the V key on non-Latin keyboard layouts', () => {
    expect(isPasteShortcut(key({ key: 'м', keyCode: 86, ctrlKey: true }))).toBe(true);
  });

  it('rejects V without a modifier', () => {
    expect(isPasteShortcut(key({ key: 'v' }))).toBe(false);
    expect(isPasteShortcut(key({ key: 'v', altKey: true }))).toBe(false);
  });

  it('rejects other shortcuts', () => {
    expect(isPasteShortcut(key({ key: 'c', ctrlKey: true }))).toBe(false);
    expect(isPasteShortcut(key({ key: 'a', metaKey: true }))).toBe(false);
  });
});
