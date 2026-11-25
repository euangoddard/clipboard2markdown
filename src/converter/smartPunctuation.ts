/**
 * Pandoc-flavoured clean-up applied to the Markdown produced by Turndown.
 *
 * - Typographic ("smart") punctuation is turned back into the ASCII forms
 *   Pandoc understands (http://pandoc.org/README.html#smart-punctuation).
 * - Hard line breaks (`\` + newline) are tidied so they never trail a
 *   paragraph or stack up into blank lines.
 * - Runs of blank lines are collapsed and the document is trimmed.
 *
 * The order of the replacements matters: each step relies on the previous.
 */
const REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/[‘’´]/g, "'"], // ‘ ’ ´
  [/[“”″]/g, '"'], // “ ” ″
  [/[−•·▪]/g, '-'], // − • · ▪
  [/[–―]/g, '--'], // – ―
  [/—/g, '---'], // —
  [/…/g, '...'], // …
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

export function smartPunctuation(markdown: string): string {
  return REPLACEMENTS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), markdown);
}
