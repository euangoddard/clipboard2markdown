import { createMemo, createSignal, flush, onSettled } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { htmlToMarkdown, type Punctuation } from './converter';
import { isPasteShortcut } from './pasteShortcut';
import { Logo } from './Logo';
import { loadPunctuation, savePunctuation } from './punctuationPreference';

/**
 * How long to wait after the `paste` event before reading the pasted HTML.
 * The browser inserts the clipboard contents into the paste target after the
 * event has been dispatched, so the content is read on a short delay.
 */
export const PASTE_SETTLE_DELAY_MS = 200;

/** Instructions → (Ctrl+V pressed) waiting for paste → converted Markdown shown. */
export type Phase = 'instructions' | 'pasting' | 'result';

export interface AppProps {
  /** HTML → Markdown conversion; defaults to the clipboard2markdown converter. */
  convert?: (html: string, punctuation: Punctuation) => string;
  /** Writes text to the system clipboard; defaults to the async Clipboard API. */
  copyToClipboard?: (text: string) => Promise<void>;
  /** Returns the storage that remembers the user's choices; defaults to `localStorage`. */
  storage?: () => Storage;
}

const COPIED_FEEDBACK_MS = 2000;

export function App(props: AppProps): JSX.Element {
  const [phase, setPhase] = createSignal<Phase>('instructions');
  const [markdown, setMarkdown] = createSignal('');
  const [copied, setCopied] = createSignal(false);
  const storage = () => props.storage?.() ?? localStorage;
  const [punctuation, setPunctuation] = createSignal(loadPunctuation(storage));
  const stats = createMemo(() => {
    const text = markdown();
    return { lines: text ? text.split('\n').length : 0, characters: text.length };
  });

  let pastebin!: HTMLDivElement;
  let pasteArea!: HTMLDivElement;
  let output!: HTMLTextAreaElement;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      callback();
    }, delay);
    timers.add(timer);
  };

  // Ctrl+V / ⌘+V anywhere on the page: redirect the paste into the hidden,
  // content-editable paste target so the browser hands us rich HTML.
  onSettled(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPasteShortcut(event)) return;
      pastebin.innerHTML = '';
      pastebin.focus();
      setPhase('pasting');
      flush();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      timers.forEach(clearTimeout);
    };
  });

  const convertPaste = (pasteTarget: HTMLElement) => {
    const convert = props.convert ?? htmlToMarkdown;
    // Every paste replaces the whole output, wherever the caret is (#28).
    output.value = convert(pasteTarget.innerHTML, punctuation());
    setMarkdown(output.value);
    setPhase('result');
    flush(); // reveal the output before focusing or selecting it
  };

  const onPaste = () => {
    later(() => {
      convertPaste(pastebin);
      output.focus();
      output.select();
    }, PASTE_SETTLE_DELAY_MS);
  };

  // On a touch device, focusing the output would bring up the on-screen
  // keyboard over the result, so the output is selected without focus.
  const onPasteAreaPaste = () => {
    later(() => {
      convertPaste(pasteArea);
      pasteArea.innerHTML = '';
      pasteArea.blur();
      output.setSelectionRange(0, output.value.length);
    }, PASTE_SETTLE_DELAY_MS);
  };

  const choosePunctuation = (event: Event & { currentTarget: HTMLInputElement }) => {
    const chosen: Punctuation = event.currentTarget.checked ? 'ascii' : 'typographic';
    setPunctuation(chosen);
    savePunctuation(storage, chosen);
  };

  const copy = async () => {
    const write = props.copyToClipboard ?? ((text: string) => navigator.clipboard.writeText(text));
    await write(output.value);
    setCopied(true);
    later(() => setCopied(false), COPIED_FEEDBACK_MS);
  };

  return (
    <div class="app">
      <Logo class="watermark" />

      <header class="masthead">
        <Logo class="masthead-logo" />
        <div>
          <h1 class="masthead-title">Paste to Markdown</h1>
          <p class="masthead-tagline">Rich text in, clean Markdown out.</p>
        </div>
        <div class="option">
          <input
            id="ascii-punctuation"
            class="switch"
            type="checkbox"
            role="switch"
            checked={punctuation() === 'ascii'}
            aria-describedby="ascii-punctuation-hint"
            onChange={choosePunctuation}
          />
          <div>
            <label for="ascii-punctuation" class="option-label">
              Pandoc ASCII punctuation
            </label>
            <p id="ascii-punctuation-hint" class="option-hint">
              “Quotes” – — … become "Quotes" -- --- ... and no-break spaces become ordinary spaces from the next paste
            </p>
          </div>
        </div>
      </header>

      <main class="stage">
        <div class={['paste-area-frame', { 'paste-area-frame-compact': phase() !== 'instructions' }]}>
          <div
            id="paste-area"
            ref={pasteArea}
            class="paste-area"
            contenteditable="true"
            inputmode="none"
            role="textbox"
            aria-labelledby="paste-area-label"
            onFocus={() => (pasteArea.innerHTML = '')}
            onPaste={onPasteAreaPaste}
          />
          <p id="paste-area-label" class="paste-area-label" aria-hidden="true">
            Tap and hold here, then choose <strong>Paste</strong>
          </p>
        </div>

        <section id="info" class="instructions" hidden={phase() !== 'instructions'} aria-labelledby="instructions-title">
          <div class="hero">
            <div class="keys" aria-hidden="true">
              <kbd class="key">Ctrl</kbd>
              <span class="key-plus">+</span>
              <kbd class="key key-letter">V</kbd>
            </div>
            <p class="hero-text">
              Copy something rich, then press <kbd>Ctrl+V</kbd> (or <kbd>⌘+V</kbd> on Mac) anywhere on this page.
            </p>
          </div>

          <h2 id="instructions-title" class="section-title">
            Instructions
          </h2>
          <ol class="steps">
            <li class="step">
              Find the text to convert to Markdown (<i>e.g.</i>, in another browser tab)
            </li>
            <li class="step">
              <span class="for-keyboard">
                Copy it to the clipboard (<code>Ctrl+C</code>, or <code>&#8984;+C</code> on Mac)
              </span>
              <span class="for-touch">
                Copy it to the clipboard (select it, then choose <strong>Copy</strong>)
              </span>
            </li>
            <li class="step">
              <span class="for-keyboard">
                Paste it into this window (<code>Ctrl+V</code>, or <code>&#8984;+V</code> on Mac)
              </span>
              <span class="for-touch">
                Paste it into the area above (tap and hold, then choose <strong>Paste</strong>)
              </span>
            </li>
            <li class="step">The converted Markdown will appear!</li>
          </ol>
          <p class="credit">
            The conversion is carried out by{' '}
            <a href="https://github.com/mixmark-io/turndown">Turndown</a>, an HTML to Markdown converter written in
            JavaScript and running locally in the browser.
          </p>
        </section>

        <p class="converting" role="status" hidden={phase() !== 'pasting'}>
          <span class="spinner" aria-hidden="true" />
          Converting…
        </p>

        <section id="wrapper" class="result" hidden={phase() !== 'result'} aria-label="Converted Markdown">
          <div class="toolbar">
            <span class="toolbar-title">Markdown</span>
            <span class="toolbar-stats">
              {stats().lines} {stats().lines === 1 ? 'line' : 'lines'} · {stats().characters}{' '}
              {stats().characters === 1 ? 'character' : 'characters'}
            </span>
            <button type="button" class={['copy', { 'copy-done': copied() }]} onClick={copy}>
              {copied() ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <textarea
            id="output"
            ref={output}
            class="output"
            aria-label="Markdown output"
            spellcheck={false}
            onInput={(event) => setMarkdown(event.currentTarget.value)}
          />
          <p class="hint for-keyboard">
            Paste again to replace this Markdown.
          </p>
          <p class="hint for-touch">
            Paste into the area above again to replace this Markdown.
          </p>
        </section>

        <div
          id="pastebin"
          ref={pastebin}
          class="pastebin"
          contenteditable="true"
          role="textbox"
          aria-multiline="true"
          aria-label="Paste target"
          onPaste={onPaste}
        />
      </main>
    </div>
  );
}
