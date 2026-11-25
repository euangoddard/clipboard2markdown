/**
 * Normalises Markdown for "same content and structure" comparisons.
 *
 * Turndown decides where whitespace that sits at the edge of an inline element
 * goes using the element's text (ignoring images and line breaks), whereas the
 * original to-markdown used its raw HTML. The two therefore occasionally
 * disagree about *where* a space or blank line lands, without disagreeing
 * about content. This normalisation erases exactly those degrees of freedom:
 *
 * - horizontal whitespace (spaces and tabs) is removed,
 * - blank lines (including blank quoted `>` lines) are removed,
 * - setext heading underlines are reduced to a single marker character
 *   (their length tracks the heading text, including any stray spaces).
 *
 * Everything else — every character of text, every Markdown marker, every
 * line break and its order — must still match.
 */
export function normalizeMarkdown(markdown: string): string {
  return markdown
    .replace(/[ \t]+/g, '')
    .split('\n')
    .filter((line) => !/^>*$/.test(line))
    .map((line) => line.replace(/^(>*)(=+|-{2,})(\\?)$/, (_m, quote: string, rule: string, br: string) => quote + rule[0] + br))
    .join('\n');
}

const TABLE_DELIMITER_ROW = /^\|( *:?-+:? *\|)+$/;

/**
 * A looser comparison for malformed HTML (block elements inside inline ones,
 * stray whitespace inside tags, …): only the sequence of visible characters
 * must match. Whitespace, hard-break backslashes and setext underlines are
 * ignored, since the two converters legitimately place line breaks
 * differently in such input (the original sometimes lost them altogether).
 * So are table delimiter rows, which the original left out of tables
 * without a `<thead>`.
 */
export function textSignature(markdown: string): string {
  return markdown
    .split('\n')
    .filter((line) => !/^[>\s]*((=+|-{2,})\\?)?$/.test(line) && !TABLE_DELIMITER_ROW.test(line))
    .join('\n')
    .replace(/[\s\\]+/g, '');
}
