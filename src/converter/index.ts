import TurndownService from 'turndown';
import { createRules, isLegacyBlank, ruleFor } from './rules';
import { cleanUpMarkdown, NO_BREAK_SPACES, type Punctuation } from './cleanUp';

export { cleanUpMarkdown, type Punctuation } from './cleanUp';

/**
 * Builds a Turndown service configured with clipboard2markdown's rules.
 *
 * Every rule is registered through Turndown's public `addRule` API. Turndown
 * gives the most recently added rule the highest priority, so the list is
 * registered back-to-front to keep the first rule in the list winning.
 */
export function createTurndownService(lineBreak: string): TurndownService {
  const rules = createRules(lineBreak);
  const service = new TurndownService({
    // Turndown only calls this for nodes *it* considers blank (whitespace
    // text, no void/meaningful descendants). The original converter used a
    // slightly different test, so defer to the matching rule when the
    // original would have kept the node.
    blankReplacement: (content, node) =>
      isLegacyBlank(node, content) ? '' : ruleFor(rules, node).replacement(content, node),
  });

  for (const rule of [...rules].reverse()) {
    service.addRule(rule.key, {
      filter: (node) => rule.filter(node),
      replacement: (content, node) => (isLegacyBlank(node, content) ? '' : rule.replacement(content, node)),
    });
  }

  // The original converter never escaped Markdown characters in text.
  service.escape = (text) => text;
  return service;
}

/** Picks a private-use character that does not occur in `text`, for use as a placeholder. */
function unusedPrivateUseCharacter(text: string): string {
  for (let code = 0xe000; code <= 0xf8ff; code++) {
    const candidate = String.fromCharCode(code);
    if (!text.includes(candidate)) return candidate;
  }
  throw new Error('No free placeholder character available');
}

/** Escapes `1. ` at the start of an element's text so it is not read as an ordered list. */
function escapeOrderedListTriggers(html: string): string {
  return html.replace(/(>[\r\n\s]*)(\d+)\.(&nbsp;| )/g, '$1$2\\.$3');
}

/**
 * Whitespace directly before a `<br>` never reaches the output (the Pandoc
 * clean-up strips it), but Turndown would count it as trailing whitespace of
 * the enclosing inline element and move it outside. Drop it up front.
 * Preformatted text is left untouched.
 */
function trimWhitespaceBeforeLineBreaks(root: HTMLElement): void {
  for (const br of Array.from(root.getElementsByTagName('br'))) {
    const previous = br.previousSibling;
    if (previous?.nodeType !== Node.TEXT_NODE || br.closest('pre')) continue;
    const text = previous as Text;
    text.data = text.data.replace(/[ \t\r\n]+$/, '');
    if (!text.data) text.remove();
  }
}

/**
 * Turns no-break spaces outside code into ordinary spaces, for Turndown to
 * collapse and trim like any other whitespace: a paragraph indented with
 * `&nbsp;` must not become an indented code block. Within code, spaces are
 * content, so the Pandoc clean-up replaces those one for one instead.
 */
function replaceNoBreakSpacesInProse(root: HTMLElement): void {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    if (text.parentElement?.closest('pre, code, kbd, samp, tt')) continue;
    text.data = text.data.replace(NO_BREAK_SPACES, ' ');
  }
}

/** Final tidy-up the original to-markdown applied to its output. */
function tidy(markdown: string): string {
  return markdown
    .replace(/^[\t\r\n]+|[\t\r\n\s]+$/g, '')
    .replace(/\n\s+\n/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n');
}

/** Converts HTML (as pasted from the clipboard) into Pandoc-flavoured Markdown. */
export function htmlToMarkdown(html: string, punctuation: Punctuation): string {
  const lineBreak = unusedPrivateUseCharacter(html);
  // Parse exactly as the original did: as a full document, converting <body>.
  const body = new DOMParser().parseFromString(escapeOrderedListTriggers(html), 'text/html').body;
  if (punctuation === 'ascii') replaceNoBreakSpacesInProse(body);
  trimWhitespaceBeforeLineBreaks(body);
  const markdown = createTurndownService(lineBreak).turndown(body).replaceAll(lineBreak, '\n');
  return cleanUpMarkdown(tidy(markdown), punctuation);
}
