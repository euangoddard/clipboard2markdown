/**
 * Conversion rules, ported from the original clipboard2markdown + to-markdown
 * rule set onto Turndown (to-markdown's successor).
 *
 * Rules are listed in priority order — the first rule whose filter matches a
 * node wins — mirroring the original precedence:
 *
 *   1. Pandoc rules   (clipboard2markdown's own house style)
 *   2. GFM rules      (to-markdown's `gfm: true` converters)
 *   3. Markdown rules (to-markdown's core converters)
 *   4. Fallbacks      (block elements → paragraphs, everything else → content)
 */

export interface LegacyRule {
  readonly key: string;
  readonly filter: (node: HTMLElement) => boolean;
  readonly replacement: (content: string, node: HTMLElement) => string;
}

const BLOCK_ELEMENTS = new Set([
  'ADDRESS', 'ARTICLE', 'ASIDE', 'AUDIO', 'BLOCKQUOTE', 'BODY', 'CANVAS', 'CENTER', 'DD', 'DIR',
  'DIV', 'DL', 'DT', 'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'FRAMESET', 'H1', 'H2',
  'H3', 'H4', 'H5', 'H6', 'HEADER', 'HGROUP', 'HR', 'HTML', 'ISINDEX', 'LI', 'MAIN', 'MENU', 'NAV',
  'NOFRAMES', 'NOSCRIPT', 'OL', 'OUTPUT', 'P', 'PRE', 'SECTION', 'TABLE', 'TBODY', 'TD', 'TFOOT',
  'TH', 'THEAD', 'TR', 'UL',
]);

const VOID_ELEMENTS = new Set([
  'AREA', 'BASE', 'BR', 'COL', 'COMMAND', 'EMBED', 'HR', 'IMG', 'INPUT', 'KEYGEN', 'LINK', 'META',
  'PARAM', 'SOURCE', 'TRACK', 'WBR',
]);

export const isBlock = (node: Node): boolean => BLOCK_ELEMENTS.has(node.nodeName);
export const isVoid = (node: Node): boolean => VOID_ELEMENTS.has(node.nodeName);

/**
 * The original converter dropped any non-void element whose converted content
 * was only whitespace. Its exemption test was a bare `/A|TH|TD/` match against
 * the tag name, so any tag *containing* those letters (A, SPAN, TABLE, THEAD,
 * VAR, …) is kept. Reproduced exactly.
 */
export function isLegacyBlank(node: HTMLElement, content: string): boolean {
  return !isVoid(node) && !/A|TH|TD/.test(node.nodeName) && /^\s*$/i.test(content);
}

const is =
  (...tags: string[]) =>
  (node: HTMLElement): boolean =>
    tags.includes(node.nodeName);

const indexIn = (siblings: ArrayLike<Node>, node: Node): number =>
  Array.prototype.indexOf.call(siblings, node);

const setextHeading = (underlineChar: string) => (content: string) =>
  '\n\n' + content + '\n' + underlineChar.repeat(content.length) + '\n\n';

function tableCell(content: string, node: Node): string {
  const prefix = indexIn(node.parentNode!.childNodes, node) === 0 ? '| ' : ' ';
  return prefix + content + ' |';
}

const HIGHLIGHT = /highlight highlight-(\S+)/;
const ALIGNMENT: Record<string, string> = { left: ':--', right: '--:', center: ':-:' };

/**
 * Builds the ordered rule list.
 *
 * `lineBreak` is a placeholder character emitted in place of the newline that
 * ends a `<br>` hard break. Turndown trims whitespace (newlines included) from
 * the content of inline elements with surrounding spaces, which would silently
 * swallow a hard break; a non-whitespace placeholder survives that trimming and
 * is turned back into a newline by the rules that work line-by-line and by the
 * final output step. (It also makes Turndown add newlines up across a hard
 * break, exactly as the original string-concatenating converter did.)
 */
export function createRules(lineBreak: string): readonly LegacyRule[] {
  const restoreLineBreaks = (text: string) => text.replaceAll(lineBreak, '\n');

  // ---------------------------------------------------------------------------
  // 1. Pandoc rules — http://pandoc.org/README.html#pandocs-markdown
  // ---------------------------------------------------------------------------
  const pandocRules: LegacyRule[] = [
    { key: 'pandocH1', filter: is('H1'), replacement: setextHeading('=') },
    { key: 'pandocH2', filter: is('H2'), replacement: setextHeading('-') },
    { key: 'superscript', filter: is('SUP'), replacement: (c) => '^' + c + '^' },
    { key: 'subscript', filter: is('SUB'), replacement: (c) => '~' + c + '~' },
    { key: 'pandocLineBreak', filter: is('BR'), replacement: () => '\\' + lineBreak },
    { key: 'pandocRule', filter: is('HR'), replacement: () => '\n\n* * * * *\n\n' },
    { key: 'emphasis', filter: is('EM', 'I', 'CITE', 'VAR'), replacement: (c) => '*' + c + '*' },
    {
      key: 'inlineCode',
      filter: (node) => {
        const hasSiblings = node.previousSibling || node.nextSibling;
        const isCodeBlock = node.parentNode!.nodeName === 'PRE' && !hasSiblings;
        return ['CODE', 'KBD', 'SAMP', 'TT'].includes(node.nodeName) && !isCodeBlock;
      },
      replacement: (c) => '`' + c + '`',
    },
    {
      key: 'link',
      filter: (node) => node.nodeName === 'A' && !!node.getAttribute('href'),
      replacement: (content, node) => {
        const url = node.getAttribute('href')!;
        const titlePart = node.title ? ' "' + node.title + '"' : '';
        if (content === url) return '<' + url + '>';
        if (url === 'mailto:' + content) return '<' + content + '>';
        return '[' + content + '](' + url + titlePart + ')';
      },
    },
    {
      key: 'listItem',
      filter: is('LI'),
      replacement: (content, node) => {
        const body = restoreLineBreaks(content).replace(/^\s+/, '').replace(/\n/gm, '\n    ');
        const parent = node.parentNode as HTMLElement;
        const prefix = /ol/i.test(parent.nodeName)
          ? (indexIn(parent.children, node) + 1 + '. ').padEnd(4, ' ')
          : '-   ';
        // The original list converter joined sibling items with a newline.
        const separator = /^(UL|OL)$/.test(parent.nodeName) && node.nextSibling ? '\n' : '';
        return prefix + body + separator;
      },
    },
  ];

  // ---------------------------------------------------------------------------
  // 2. GitHub Flavoured Markdown rules
  // ---------------------------------------------------------------------------
  const gfmRules: LegacyRule[] = [
    { key: 'strikethrough', filter: is('DEL', 'S', 'STRIKE'), replacement: (c) => '~~' + c + '~~' },
    {
      key: 'taskListCheckbox',
      filter: (node) => (node as HTMLInputElement).type === 'checkbox' && node.parentNode!.nodeName === 'LI',
      replacement: (_c, node) => ((node as HTMLInputElement).checked ? '[x]' : '[ ]') + ' ',
    },
    { key: 'tableCell', filter: is('TH', 'TD'), replacement: tableCell },
    {
      key: 'tableRow',
      filter: is('TR'),
      replacement: (content, node) => {
        let borderCells = '';
        if (node.parentNode!.nodeName === 'THEAD') {
          for (const cell of Array.from(node.childNodes)) {
            const align = (cell as Element).attributes?.getNamedItem('align')?.value;
            borderCells += tableCell((align && ALIGNMENT[align]) || '---', cell);
          }
        }
        return '\n' + content + (borderCells ? '\n' + borderCells : '');
      },
    },
    { key: 'table', filter: is('TABLE'), replacement: (c) => '\n\n' + c + '\n\n' },
    { key: 'tableSection', filter: is('THEAD', 'TBODY', 'TFOOT'), replacement: (c) => c },
    {
      key: 'fencedCodeBlock',
      filter: (node) => node.nodeName === 'PRE' && node.firstChild?.nodeName === 'CODE',
      replacement: (_c, node) => '\n\n```\n' + node.firstChild!.textContent + '\n```\n\n',
    },
    {
      key: 'highlightedCodeBlock',
      filter: (node) =>
        node.nodeName === 'PRE' &&
        node.parentNode!.nodeName === 'DIV' &&
        HIGHLIGHT.test((node.parentNode as HTMLElement).className),
      replacement: (_c, node) => {
        const language = (node.parentNode as HTMLElement).className.match(HIGHLIGHT)![1];
        return '\n\n```' + language + '\n' + node.textContent + '\n```\n\n';
      },
    },
    {
      key: 'highlightWrapper',
      filter: (node) => node.nodeName === 'DIV' && HIGHLIGHT.test(node.className),
      replacement: (c) => '\n\n' + c + '\n\n',
    },
  ];

  // ---------------------------------------------------------------------------
  // 3. Core Markdown rules
  // ---------------------------------------------------------------------------
  const markdownRules: LegacyRule[] = [
    { key: 'paragraph', filter: is('P'), replacement: (c) => '\n\n' + c + '\n\n' },
    {
      key: 'atxHeading',
      filter: is('H3', 'H4', 'H5', 'H6'),
      replacement: (c, node) => '\n\n' + '#'.repeat(Number(node.nodeName.charAt(1))) + ' ' + c + '\n\n',
    },
    { key: 'strong', filter: is('STRONG', 'B'), replacement: (c) => '**' + c + '**' },
    {
      key: 'image',
      filter: is('IMG'),
      replacement: (_c, node) => {
        const img = node as HTMLImageElement;
        const src = img.getAttribute('src') || '';
        const titlePart = img.title ? ' "' + img.title + '"' : '';
        return src ? '![' + (img.alt || '') + '](' + src + titlePart + ')' : '';
      },
    },
    {
      key: 'blockquote',
      filter: is('BLOCKQUOTE'),
      replacement: (content) => {
        const quoted = restoreLineBreaks(content).trim().replace(/\n{3,}/g, '\n\n').replace(/^/gm, '> ');
        return '\n\n' + quoted + '\n\n';
      },
    },
    {
      key: 'list',
      filter: is('UL', 'OL'),
      replacement: (content, node) => {
        if (/li/i.test(node.parentNode!.nodeName)) return '\n' + content;
        return '\n\n' + content + '\n\n';
      },
    },
  ];

  // ---------------------------------------------------------------------------
  // 4. Fallbacks
  // ---------------------------------------------------------------------------
  const fallbackRules: LegacyRule[] = [
    { key: 'block', filter: isBlock, replacement: (c) => '\n\n' + c + '\n\n' },
    { key: 'inline', filter: () => true, replacement: (c) => c },
  ];

  return [...pandocRules, ...gfmRules, ...markdownRules, ...fallbackRules];
}

export function ruleFor(rules: readonly LegacyRule[], node: HTMLElement): LegacyRule {
  // The final fallback matches everything, so this always succeeds.
  return rules.find((rule) => rule.filter(node))!;
}
