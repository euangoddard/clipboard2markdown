import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@solidjs/testing-library';
import { flush } from 'solid-js';
import { App, PASTE_SETTLE_DELAY_MS, type AppProps } from '../src/App';

function setup(props: AppProps = {}) {
  const result = render(() => <App {...props} />);
  flush(); // run onSettled so the keyboard shortcut is registered
  const $ = <T extends HTMLElement>(selector: string) => result.container.querySelector(selector) as T;
  const ui = {
    info: $('#info'),
    wrapper: $('#wrapper'),
    output: $<HTMLTextAreaElement>('#output'),
    pastebin: $('#pastebin'),
    status: screen.getByRole('status', { hidden: true }),
    copyButton: () => screen.getByRole('button', { name: /cop/i, hidden: true }),
  };

  /** Presses Ctrl+V (or ⌘+V), as the user does to paste. */
  const pressPaste = (modifier: 'ctrlKey' | 'metaKey' = 'ctrlKey') =>
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', keyCode: 86, [modifier]: true, bubbles: true }));

  /** What the browser does next: put the clipboard HTML into the focused paste target. */
  const browserPastes = (html: string) => {
    ui.pastebin.innerHTML = html;
    ui.pastebin.dispatchEvent(new Event('paste', { bubbles: true }));
  };

  /** The full user gesture: Ctrl+V, the browser pastes, conversion completes. */
  const paste = (html: string) => {
    pressPaste();
    browserPastes(html);
    vi.advanceTimersByTime(PASTE_SETTLE_DELAY_MS);
  };

  return { ...result, ui, pressPaste, browserPastes, paste };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('initial state', () => {
  it('shows the instructions and hides the output', () => {
    const { ui } = setup();
    expect(ui.info).toBeVisible();
    expect(ui.wrapper).not.toBeVisible();
    expect(ui.status).not.toBeVisible();
  });

  it('lists the four steps of the original instructions', () => {
    const { ui } = setup();
    const steps = Array.from(ui.info.querySelectorAll('ol > li'), (li) => li.textContent);
    expect(steps).toEqual([
      'Find the text to convert to Markdown (e.g., in another browser tab)',
      'Copy it to the clipboard (Ctrl+C, or ⌘+C on Mac)',
      'Paste it into this window (Ctrl+V, or ⌘+V on Mac)',
      'The converted Markdown will appear!',
    ]);
  });

  it('credits the converter library', () => {
    setup();
    expect(screen.getByRole('link', { name: 'Turndown' })).toHaveAttribute('href', 'https://github.com/mixmark-io/turndown');
  });

  it('keeps an editable paste target in the page', () => {
    const { ui } = setup();
    expect(ui.pastebin).toHaveAttribute('contenteditable', 'true');
  });
});

describe('pressing Ctrl+V / ⌘+V', () => {
  it.each(['ctrlKey', 'metaKey'] as const)('with %s: hides the instructions and moves focus to the paste target', (modifier) => {
    const { ui, pressPaste } = setup();
    pressPaste(modifier);
    expect(ui.info).not.toBeVisible();
    expect(ui.wrapper).not.toBeVisible();
    expect(document.activeElement).toBe(ui.pastebin);
    expect(ui.status).toBeVisible();
    expect(ui.status).toHaveTextContent('Converting…');
  });

  it('empties the paste target of any previous paste', () => {
    const { ui, pressPaste } = setup();
    ui.pastebin.innerHTML = '<p>stale</p>';
    pressPaste();
    expect(ui.pastebin).toBeEmptyDOMElement();
  });

  it('is ignored without a modifier key', () => {
    const { ui } = setup();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true }));
    expect(ui.info).toBeVisible();
    expect(document.activeElement).not.toBe(ui.pastebin);
  });

  it('ignores other shortcuts', () => {
    const { ui } = setup();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true }));
    expect(ui.info).toBeVisible();
  });

  it('hides the previous output while the next paste is converted', () => {
    const { ui, paste, pressPaste } = setup();
    paste('<p>first</p>');
    expect(ui.wrapper).toBeVisible();
    pressPaste();
    expect(ui.wrapper).not.toBeVisible();
    expect(ui.info).not.toBeVisible();
  });
});

describe('pasting', () => {
  it('converts the pasted HTML after the browser has inserted it', () => {
    const { ui, pressPaste, browserPastes } = setup();
    pressPaste();
    browserPastes('<h1>Title</h1><p>Some <b>bold</b> text</p>');

    vi.advanceTimersByTime(PASTE_SETTLE_DELAY_MS - 1);
    expect(ui.output.value).toBe('');
    expect(ui.wrapper).not.toBeVisible();

    vi.advanceTimersByTime(1);
    expect(ui.output.value).toBe('Title\n=====\n\nSome **bold** text');
    expect(ui.wrapper).toBeVisible();
    expect(ui.status).not.toBeVisible();
  });

  it('focuses the output and selects all of it, ready to copy', () => {
    const { ui, paste } = setup();
    paste('<p>hello <em>world</em></p>');
    expect(document.activeElement).toBe(ui.output);
    expect(ui.output.selectionStart).toBe(0);
    expect(ui.output.selectionEnd).toBe('hello *world*'.length);
  });

  it('replaces the previous conversion when pasting again (everything is selected)', () => {
    const { ui, paste } = setup();
    paste('<p>first</p>');
    paste('<p>second</p>');
    expect(ui.output.value).toBe('second');
  });

  it('inserts at the caret when the user has placed it in the output', () => {
    const { ui, paste } = setup();
    paste('<p>one three</p>');
    ui.output.setSelectionRange(4, 4);
    paste('<b>two</b> ');
    expect(ui.output.value).toBe('one **two**three');
  });

  it('appends when the caret is at the end, building up a document', () => {
    const { ui, paste } = setup();
    paste('<h2>Notes</h2>');
    ui.output.setSelectionRange(ui.output.value.length, ui.output.value.length);
    paste('<ul><li>a</li><li>b</li></ul>');
    expect(ui.output.value).toBe('Notes\n-----' + '-   a\n-   b');
  });

  it('replaces only the selected text', () => {
    const { ui, paste } = setup();
    paste('<p>keep REPLACE keep</p>');
    ui.output.setSelectionRange(5, 12);
    paste('<i>new</i>');
    expect(ui.output.value).toBe('keep *new* keep');
  });

  it('never shows the instructions again', () => {
    const { ui, paste } = setup();
    paste('<p>x</p>');
    paste('<p>y</p>');
    expect(ui.info).not.toBeVisible();
  });

  it('uses the injected converter', () => {
    const convert = vi.fn(() => 'converted!');
    const { ui, paste } = setup({ convert });
    paste('<p>x</p>');
    expect(convert).toHaveBeenCalledWith('<p>x</p>');
    expect(ui.output.value).toBe('converted!');
  });

  it('stops converting after the app is unmounted', () => {
    const { ui, pressPaste, browserPastes, unmount } = setup();
    pressPaste();
    browserPastes('<p>late</p>');
    unmount();
    vi.advanceTimersByTime(PASTE_SETTLE_DELAY_MS);
    expect(ui.output.value).toBe('');
  });

  it('stops listening for the shortcut after the app is unmounted', () => {
    const { ui, unmount } = setup();
    const focus = vi.spyOn(ui.pastebin, 'focus');
    unmount();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true }));
    expect(focus).not.toHaveBeenCalled();
  });
});

describe('output toolbar', () => {
  it('shows line and character counts', () => {
    const { paste } = setup();
    paste('<p>a</p><p>b</p>');
    expect(screen.getByText('3 lines · 4 characters')).toBeInTheDocument();
  });

  it('uses singular units', () => {
    const { paste } = setup();
    paste('<p>a</p>');
    expect(screen.getByText('1 line · 1 character')).toBeInTheDocument();
  });

  it('updates the counts as the user edits the Markdown', () => {
    const { ui, paste } = setup();
    paste('<p>a</p>');
    ui.output.value = 'abc\ndef';
    ui.output.dispatchEvent(new Event('input', { bubbles: true }));
    flush();
    expect(screen.getByText('2 lines · 7 characters')).toBeInTheDocument();
  });

  it('copies the Markdown, including edits, and confirms briefly', async () => {
    const copyToClipboard = vi.fn(() => Promise.resolve());
    const { ui, paste } = setup({ copyToClipboard });
    paste('<p>copy me</p>');
    ui.output.value += '!';

    ui.copyButton().click();
    await vi.waitFor(() => expect(ui.copyButton()).toHaveTextContent('Copied!'));
    expect(copyToClipboard).toHaveBeenCalledWith('copy me!');

    vi.advanceTimersByTime(2000);
    flush();
    expect(ui.copyButton()).toHaveTextContent('Copy');
  });
});
