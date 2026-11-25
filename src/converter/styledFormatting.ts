import { isBlock } from './rules';

const STRONG_TAGS = ['B', 'STRONG'];
const EMPHASIS_TAGS = ['EM', 'I', 'CITE', 'VAR'];

const MIN_BOLD_FONT_WEIGHT = 600;

/** What an element's own inline style says about a formatting, if anything. */
type DeclaredFormatting = 'on' | 'off' | undefined;

function parseFontWeight(fontWeight: string): DeclaredFormatting {
  if (fontWeight === 'bold' || fontWeight === 'bolder') return 'on';
  if (fontWeight === 'normal' || fontWeight === 'lighter') return 'off';
  if (!/^\d+(\.\d+)?$/.test(fontWeight)) return undefined;
  return MIN_BOLD_FONT_WEIGHT <= Number(fontWeight) ? 'on' : 'off';
}

function parseFontStyle(fontStyle: string): DeclaredFormatting {
  if (/^(italic|oblique)\b/.test(fontStyle)) return 'on';
  if (fontStyle === 'normal') return 'off';
  return undefined;
}

interface Formatting {
  readonly tags: readonly string[];
  readonly wrapperTag: string;
  readonly parseDeclaration: (style: CSSStyleDeclaration) => DeclaredFormatting;
}

const FORMATTINGS: readonly Formatting[] = [
  { tags: STRONG_TAGS, wrapperTag: 'strong', parseDeclaration: (style) => parseFontWeight(style.fontWeight) },
  { tags: EMPHASIS_TAGS, wrapperTag: 'em', parseDeclaration: (style) => parseFontStyle(style.fontStyle) },
];

/** Replaces a semantic element whose own style cancels its formatting with a `<span>`. */
function replaceCancelledFormattingWithSpan(element: HTMLElement): HTMLElement {
  const isCancelled = FORMATTINGS.some(
    (formatting) => formatting.tags.includes(element.nodeName) && formatting.parseDeclaration(element.style) === 'off',
  );
  if (!isCancelled) return element;
  const span = element.ownerDocument.createElement('span');
  span.setAttribute('style', element.getAttribute('style')!);
  span.append(...element.childNodes);
  element.replaceWith(span);
  return span;
}

function needsWrapper(element: HTMLElement, formatting: Formatting): boolean {
  return formatting.parseDeclaration(element.style) === 'on' && !element.closest(formatting.tags.join(','));
}

/**
 * Merges a wrapper into an identical wrapper directly before it, so that
 * adjacent runs (which editors split whenever any other style changes) read
 * `**ab**` rather than `**a****b**`, which CommonMark renders with literal
 * asterisks.
 */
function mergeIntoPreviousWrapper(wrapper: Element, wrappers: ReadonlySet<Node>): void {
  const previous = wrapper.previousSibling;
  if (!previous || !wrappers.has(previous) || previous.nodeName !== wrapper.nodeName) return;
  const firstChild = wrapper.firstChild!;
  (previous as Element).append(...wrapper.childNodes);
  wrapper.remove();
  if (firstChild instanceof Element) mergeIntoPreviousWrapper(firstChild, wrappers);
}

/**
 * Rewrites bold and italic set through inline styles (as Google Docs, Word
 * and OneNote do) as `<strong>` and `<em>`, so the Markdown rules see them,
 * and turns `<b>`/`<i>` (and the like) whose own style cancels their
 * formatting into plain spans; Google Docs wraps every paste in
 * `<b style="font-weight:normal">`.
 *
 * Only inline elements are considered, since Markdown emphasis cannot span
 * blocks, and preformatted text is left alone. An element already inside a
 * bold (or italic) element is not marked again. A style that cancels bold or
 * italic inherited from an ancestor is not represented.
 */
export function convertStyledFormatting(root: HTMLElement): void {
  const wrappers = new Set<Node>();
  for (const original of Array.from(root.querySelectorAll<HTMLElement>('[style]'))) {
    if (isBlock(original) || original.closest('pre')) continue;
    const element = replaceCancelledFormattingWithSpan(original);
    if (!element.textContent!.trim()) continue;
    let outermost: Element = element;
    // Strong goes outermost, so that a bold run and an adjacent bold italic
    // one merge into `**a*b***`.
    for (const formatting of [...FORMATTINGS].reverse()) {
      if (!needsWrapper(element, formatting)) continue;
      const wrapper = element.ownerDocument.createElement(formatting.wrapperTag);
      outermost.replaceWith(wrapper);
      wrapper.append(outermost);
      wrappers.add(wrapper);
      outermost = wrapper;
    }
    if (outermost !== element) mergeIntoPreviousWrapper(outermost, wrappers);
  }
}
