import { beforeEach, describe, expect, it } from 'vitest';
import { insertText } from '../src/insertText';
import { loadLegacy } from './legacy/oracle';

const legacy = loadLegacy();

function textarea(value: string, start: number, end = start): HTMLTextAreaElement {
  const field = document.createElement('textarea');
  document.body.append(field);
  field.value = value;
  field.setSelectionRange(start, end);
  return field;
}

describe('insertText', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('inserts into an empty field', () => {
    const field = textarea('', 0);
    insertText(field, 'hello');
    expect(field.value).toBe('hello');
    expect([field.selectionStart, field.selectionEnd]).toEqual([5, 5]);
  });

  it('inserts at the caret', () => {
    const field = textarea('ac', 1);
    insertText(field, 'b');
    expect(field.value).toBe('abc');
    expect([field.selectionStart, field.selectionEnd]).toEqual([2, 2]);
  });

  it('replaces the selection', () => {
    const field = textarea('one two three', 4, 7);
    insertText(field, '2');
    expect(field.value).toBe('one 2 three');
    expect([field.selectionStart, field.selectionEnd]).toEqual([5, 5]);
  });

  it('replaces everything when everything is selected', () => {
    const field = textarea('old', 0, 3);
    insertText(field, 'new');
    expect(field.value).toBe('new');
  });

  it('focuses the field', () => {
    const field = textarea('', 0);
    insertText(field, 'x');
    expect(document.activeElement).toBe(field);
  });

  it.each([
    ['', 0, 0, 'abc'],
    ['hello world', 5, 5, ','],
    ['hello world', 0, 11, 'bye'],
    ['line 1\nline 2', 6, 6, '\nline 1.5'],
    ['x', 1, 1, ''],
  ])('matches the original insert() for %j selecting [%i, %i] with %j', (value, start, end, text) => {
    const original = textarea(value, start, end);
    legacy.insert(original, text);
    const rewritten = textarea(value, start, end);
    insertText(rewritten, text);
    expect(rewritten.value).toBe(original.value);
    expect([rewritten.selectionStart, rewritten.selectionEnd]).toEqual([original.selectionStart, original.selectionEnd]);
  });
});
