const V_KEY_CODE = 86;

/**
 * True for the paste keyboard shortcut: Ctrl+V, or ⌘+V on a Mac (with or
 * without Shift, i.e. including "paste as plain text").
 */
export function isPasteShortcut(event: KeyboardEvent): boolean {
  if (!event.ctrlKey && !event.metaKey) return false;
  // `keyCode` identifies the physical V key on any keyboard layout, so the
  // shortcut also works where the V key produces another character.
  return event.key?.toLowerCase() === 'v' || event.keyCode === V_KEY_CODE;
}
