/** How typographic punctuation (curly quotes, dashes, the ellipsis and the like) is written in the Markdown. */
export type Punctuation =
  /** Left as it was pasted. */
  | 'typographic'
  /**
   * Replaced with the ASCII forms that Pandoc turns back into typographic
   * punctuation (http://pandoc.org/README.html#smart-punctuation). No-break
   * spaces become ordinary spaces, as LaTeX may reject them.
   */
  | 'ascii';

type Replacements = ReadonlyArray<readonly [RegExp, string]>;

/** The no-break space (U+00A0, `&nbsp;`) and the narrow no-break space (U+202F). */
export const NO_BREAK_SPACES = /[\u00a0\u202f]/g;

const ASCII_PUNCTUATION: Replacements = [
  [/[‘’´]/g, "'"], // ‘ ’ ´
  [/[“”″]/g, '"'], // “ ” ″
  [/[−•·▪]/g, '-'], // − • · ▪
  [/[–―]/g, '--'], // – ―
  [/—/g, '---'], // —
  [/…/g, '...'], // …
  [NO_BREAK_SPACES, ' '],
];

/**
 * Applies whatever the punctuation. The order matters: each step relies on
 * the previous.
 */
const LAYOUT_CLEAN_UP: Replacements = [
  // A list pasted with its bullets as glyphs in the text (as Word does)
  // becomes a Markdown list, and a bullet left alone on a line is dropped
  // further down. Elsewhere on a line, these glyphs are punctuation.
  [/^([^\S\n]*)[•·▪]/gm, '$1-'],
  [/[ ]+\n/g, '\n'],
  [/\s*\\\n/g, '\\\n'],
  [/\s*\\\n\s*\\\n/g, '\n\n'],
  [/\s*\\\n\n/g, '\n\n'],
  [/\n-\n/g, '\n'],
  [/\n\n\s*\\\n/g, '\n\n'],
  [/\n\n\n*/g, '\n\n'],
  [/[ ]+$/gm, ''],
  [/^\s+|[\s\\]+$/g, ''],
];

/**
 * Pandoc-flavoured clean-up of the Markdown produced by Turndown: hard line
 * breaks (`\` + newline) are tidied so they never trail a paragraph or stack
 * up into blank lines, runs of blank lines are collapsed, the document is
 * trimmed, and typographic punctuation is written as `punctuation` says.
 */
export function cleanUpMarkdown(markdown: string, punctuation: Punctuation): string {
  const replacements = punctuation === 'ascii' ? [...ASCII_PUNCTUATION, ...LAYOUT_CLEAN_UP] : LAYOUT_CLEAN_UP;
  return replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), markdown);
}
