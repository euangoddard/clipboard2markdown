/**
 * Inserts `text` into a textarea at the caret, replacing any selected text,
 * and leaves the caret just after the inserted text. The field is not
 * focused, so that the caller decides whether to bring up a keyboard.
 *
 * This is what lets repeated pastes build up a document: a paste replaces
 * whatever is selected (after a conversion, that is the whole document) or
 * is inserted wherever the user has placed the caret.
 */
export function insertText(field: HTMLTextAreaElement, text: string): void {
  field.setRangeText(text, field.selectionStart, field.selectionEnd, 'end');
}
