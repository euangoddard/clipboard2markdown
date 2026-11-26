/**
 * Behavioural parity between the new app and the ORIGINAL page
 * (legacy/index.html + legacy/clipboard2markdown.js, running in an iframe).
 *
 * Both are driven through identical user journeys, and after every step
 * their observable state is compared: which panels are visible, what has
 * focus, the Markdown in the output and the selection within it. The new app
 * has Pandoc ASCII punctuation switched on, as the original always wrote it.
 *
 * One difference is intentional (#28): the original inserted a paste at the
 * caret, so with the caret placed in the output the old Markdown stayed and
 * the new was spliced into it. The new app replaces the whole output on every
 * paste. Journeys that place the caret before pasting are listed separately.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@solidjs/testing-library';
import { flush } from 'solid-js';
import { App, PASTE_SETTLE_DELAY_MS } from '../src/App';
import { mountLegacyPage } from './legacy/oracle';
import { PUNCTUATION_STORAGE_KEY } from '../src/punctuationPreference';

interface Page {
  document: Document;
  info: HTMLElement;
  wrapper: HTMLElement;
  output: HTMLTextAreaElement;
  pastebin: HTMLElement;
}

type Step =
  | { kind: 'shortcut'; init: KeyboardEventInit & { keyCode?: number; which?: number } }
  | { kind: 'browserPastes'; html: string }
  | { kind: 'wait'; ms: number }
  | { kind: 'select'; start: number; end?: number }
  | { kind: 'type'; text: string };

const ctrlV: Step = { kind: 'shortcut', init: { key: 'v', keyCode: 86, which: 86, ctrlKey: true } };
const cmdV: Step = { kind: 'shortcut', init: { key: 'v', keyCode: 86, which: 86, metaKey: true } };
const settle: Step = { kind: 'wait', ms: PASTE_SETTLE_DELAY_MS };
const pasteOf = (html: string): Step[] => [ctrlV, { kind: 'browserPastes', html }, settle];

function perform(page: Page, step: Step): void {
  switch (step.kind) {
    case 'shortcut':
      page.document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...step.init }));
      break;
    case 'browserPastes':
      page.pastebin.innerHTML = step.html;
      page.pastebin.dispatchEvent(new Event('paste', { bubbles: true }));
      break;
    case 'wait':
      vi.advanceTimersByTime(step.ms);
      break;
    case 'select':
      page.output.setSelectionRange(step.start, step.end ?? step.start);
      break;
    case 'type':
      page.output.setRangeText(step.text, page.output.selectionStart, page.output.selectionEnd, 'end');
      page.output.dispatchEvent(new Event('input', { bubbles: true }));
      break;
  }
  flush();
}

const isShown = (element: HTMLElement) => element.ownerDocument.defaultView!.getComputedStyle(element).display !== 'none';

function observe(page: Page) {
  const active = page.document.activeElement;
  return {
    instructionsShown: isShown(page.info),
    outputShown: isShown(page.wrapper),
    focus: active === page.output ? 'output' : active === page.pastebin ? 'pastebin' : 'elsewhere',
    markdown: page.output.value,
    selection: [page.output.selectionStart, page.output.selectionEnd],
  };
}

function mountNewApp(): Page {
  localStorage.setItem(PUNCTUATION_STORAGE_KEY, 'ascii');
  const { container } = render(() => <App />);
  flush();
  const $ = <T extends HTMLElement>(selector: string) => container.querySelector(selector) as T;
  return { document, info: $('#info'), wrapper: $('#wrapper'), output: $('#output'), pastebin: $('#pastebin') };
}

const journeys: Record<string, Step[]> = {
  'initial page': [],
  'pressing Ctrl+V': [ctrlV],
  'pressing ⌘+V': [cmdV],
  'pressing Ctrl+Shift+V': [{ kind: 'shortcut', init: { key: 'V', keyCode: 86, which: 86, ctrlKey: true, shiftKey: true } }],
  'pressing V alone': [{ kind: 'shortcut', init: { key: 'v', keyCode: 86, which: 86 } }],
  'pressing Ctrl+C': [{ kind: 'shortcut', init: { key: 'c', keyCode: 67, which: 67, ctrlKey: true } }],
  'paste, before the conversion delay elapses': [ctrlV, { kind: 'browserPastes', html: '<b>x</b>' }, { kind: 'wait', ms: PASTE_SETTLE_DELAY_MS - 1 }],
  'a single paste': pasteOf('<h1>Title</h1><p>Some <em>rich</em> text with a <a href="http://x.com">link</a>.</p>'),
  'a paste of a list and a table': pasteOf(
    '<ul><li>one</li><li>two<ol><li>a</li></ol></li></ul><table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>',
  ),
  'pasting twice replaces the output': [...pasteOf('<p>first</p>'), ...pasteOf('<p>second</p>')],
  'pressing Ctrl+V again hides the previous output': [...pasteOf('<p>first</p>'), ctrlV],
  'an empty paste': pasteOf(''),
};

/**
 * Journeys where the original inserted the last paste at the caret and the
 * new app replaces the whole output with it (#28). `original` is the
 * original's final Markdown and `now` the new app's.
 */
const replacesInsteadOfInserting: Record<string, { steps: Step[]; original: string; now: string }> = {
  'pasting at the caret': {
    steps: [...pasteOf('<p>alpha omega</p>'), { kind: 'select', start: 6 }, ...pasteOf('<b>beta</b> ')],
    original: 'alpha **beta**omega',
    now: '**beta**',
  },
  'pasting at the end': {
    steps: [...pasteOf('<p>start</p>'), { kind: 'select', start: 5 }, ...pasteOf('<p>end</p>')],
    original: 'startend',
    now: 'end',
  },
  'pasting over a selection': {
    steps: [...pasteOf('<p>keep this keep</p>'), { kind: 'select', start: 5, end: 9 }, ...pasteOf('<i>that</i>')],
    original: 'keep *that* keep',
    now: '*that*',
  },
  'pasting after editing': {
    steps: [...pasteOf('<p>one</p>'), { kind: 'select', start: 3 }, { kind: 'type', text: '\n\n' }, ...pasteOf('<p>two</p>')],
    original: 'one\n\ntwo',
    now: 'two',
  },
  'three pastes with the caret placed between them': {
    steps: [
      ...pasteOf('<h2>Notes</h2>'),
      { kind: 'select', start: 13 },
      { kind: 'type', text: '\n\n' },
      ...pasteOf('<p>Intro “quoted” — text…</p>'),
      { kind: 'select', start: 0 },
      ...pasteOf('<h1>Top</h1><br>'),
    ],
    original: 'Top\n===Notes\n-----\n\nIntro "quoted" --- text...',
    now: 'Top\n===',
  },
};

/** Runs a journey on a page, recording its observable state before and after each step. */
function record(page: Page, steps: Step[]) {
  const states = [observe(page)];
  for (const step of steps) {
    perform(page, step);
    states.push(observe(page));
  }
  return states;
}

/** Records a journey on the original page and then on the new app. */
function recordBoth(steps: Step[]) {
  const original = mountLegacyPage();
  const expected = record(original, steps);
  original.remove();
  vi.clearAllTimers();
  return [expected, record(mountNewApp(), steps)] as const;
}

const describeStep = (steps: Step[], index: number) =>
  index === 0 ? 'before any step' : `after step ${index} (${steps[index - 1]!.kind})`;

describe('the new app behaves like the original page', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.useRealTimers();
  });

  // The pages are driven one after the other rather than interleaved: they
  // would otherwise share the fake clock and steal focus from each other.
  for (const [name, steps] of Object.entries(journeys)) {
    it(name, () => {
      const [expected, actual] = recordBoth(steps);
      actual.forEach((state, index) => {
        expect(state, describeStep(steps, index)).toEqual(expected[index]);
      });
    });
  }
});

describe('the new app replaces the output where the original inserted at the caret (#28)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.useRealTimers();
  });

  for (const [name, { steps, original, now }] of Object.entries(replacesInsteadOfInserting)) {
    it(name, () => {
      const [expected, actual] = recordBoth(steps);
      expect(expected.at(-1)!.markdown).toBe(original);
      expect(actual.at(-1)!.markdown).toBe(now);
      expect(actual.at(-1)!.selection).toEqual([0, now.length]);
      // Apart from the Markdown and the selection spanning it, the pages agree.
      const withoutText = ({ markdown: _markdown, selection: _selection, ...rest }: ReturnType<typeof observe>) => rest;
      actual.forEach((state, index) => {
        expect(withoutText(state), describeStep(steps, index)).toEqual(withoutText(expected[index]!));
      });
    });
  }
});
