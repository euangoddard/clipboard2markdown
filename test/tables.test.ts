/**
 * Specification of pipe tables (GFM and Pandoc) where the new converter
 * deliberately differs from the original, which wrote rows that GFM and
 * Pandoc don't read as a table. Asserted against the new converter only.
 */
import { describe, expect, it } from 'vitest';
import { htmlToMarkdown } from '../src/converter';

const convert = (html: string) => htmlToMarkdown(html, 'typographic');

describe('header row', () => {
  it.each([
    ['the first row of a table without a <thead>', '<table><tr><td>time</td><td>ip</td></tr><tr><td>5/23/18</td><td>69.75</td></tr></table>', '| time | ip |\n| --- | --- |\n| 5/23/18 | 69.75 |'],
    ['<th> cells in a <tbody>', '<table><tbody><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></tbody></table>', '| A | B |\n| --- | --- |\n| 1 | 2 |'],
    ['only the first row of a <thead> with several', '<table><thead><tr><th>A</th></tr><tr><th>B</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>', '| A |\n| --- |\n| B |\n| 1 |'],
    ['the first row with cells, skipping empty rows', '<table><tr></tr><tr><td>A</td></tr><tr><td>1</td></tr></table>', '| A |\n| --- |\n| 1 |'],
    ['a first row of empty cells', '<table><tr><td></td><td></td></tr><tr><td>1</td><td>2</td></tr></table>', '|  |  |\n| --- | --- |\n| 1 | 2 |'],
    ['the only row of a table', '<table><tr><td>A</td><td>B</td></tr></table>', '| A | B |\n| --- | --- |'],
    ['the first row whatever the markup between the tags', '<table>\n  <tr>\n    <td>A</td>\n    <td>B</td>\n  </tr>\n  <tr>\n    <td>1</td>\n    <td>2</td>\n  </tr>\n</table>', '| A | B |\n| --- | --- |\n| 1 | 2 |'],
  ])('is %s', (_, html, markdown) => {
    expect(convert(html)).toBe(markdown);
  });

  it('takes the alignment from the first row without a <thead>', () => {
    expect(convert('<table><tr><td align="right">A</td><td align="center">B</td></tr><tr><td>1</td><td>2</td></tr></table>')).toBe(
      '| A | B |\n| --: | :-: |\n| 1 | 2 |',
    );
  });

  it('is chosen for each table separately', () => {
    expect(convert('<table><tr><td>A</td></tr><tr><td>1</td></tr></table><table><tr><td>B</td><td>C</td></tr></table>')).toBe(
      '| A |\n| --- |\n| 1 |\n\n| B | C |\n| --- | --- |',
    );
  });
});

describe('cell content', () => {
  const tableOf = (cell: string) => `<table><tr><td>${cell}</td><td>z</td></tr></table>`;
  const rowOf = (cell: string) => `| ${cell} | z |\n| --- | --- |`;

  it.each([
    ['a single paragraph', '<p>1</p>', '1'],
    ['a single heading', '<h3>Title</h3>', '### Title'],
    ['paragraphs, joined with <br>', '<p>a</p><p>b</p>', 'a<br>b'],
    ['line breaks, as <br>', 'a<br>b', 'a<br>b'],
    ['consecutive line breaks, as a single <br>', 'a<br><br>b', 'a<br>b'],
    ['line breaks at the edges, dropped', '<br>a<br>', 'a'],
    ['a list, one item per line', '<ul><li>one</li><li>two</li></ul>', '-   one<br>-   two'],
    ['divs, as Notion and Confluence nest them', '<div><div>a</div><div><strong>b</strong></div></div>', 'a<br>**b**'],
  ])('puts %s on the row', (_, cell, markdown) => {
    expect(convert(tableOf(cell))).toBe(rowOf(markdown));
  });

  it.each([
    ['in text', 'x | y', 'x \\| y'],
    ['in a link', '<a href="http://e.com/?a|b">l</a>', '[l](http://e.com/?a\\|b)'],
    ['in inline code', '<code>a|b</code>', '`a\\|b`'],
  ])('escapes a pipe %s', (_, cell, markdown) => {
    expect(convert(tableOf(cell))).toBe(rowOf(markdown));
  });

  it('flattens block content in header cells too', () => {
    expect(convert('<table><thead><tr><th><p>a</p></th><th><p>b</p></th></tr></thead><tbody><tr><td><p>1</p></td><td><p>2</p></td></tr></tbody></table>')).toBe(
      '| a | b |\n| --- | --- |\n| 1 | 2 |',
    );
  });
});

describe('column count', () => {
  it.each([
    ['a body row shorter than the header', '<table><tr><td>A</td><td>B</td></tr><tr><td>1</td></tr></table>', '| A | B |\n| --- | --- |\n| 1 |  |'],
    ['a header shorter than a body row', '<table><tr><td>A</td></tr><tr><td>1</td><td>2</td><td>3</td></tr></table>', '| A |  |  |\n| --- | --- | --- |\n| 1 | 2 | 3 |'],
    ['a cell spanning columns', '<table><tr><td colspan="2">A</td><td>B</td></tr><tr><td>1</td><td>2</td><td>3</td></tr></table>', '| A |  | B |\n| --- | --- | --- |\n| 1 | 2 | 3 |'],
  ])('pads every row to the widest: %s', (_, html, markdown) => {
    expect(convert(html)).toBe(markdown);
  });

  it('repeats the alignment of a header cell spanning columns', () => {
    expect(convert('<table><tr><th colspan="2" align="center">A</th></tr><tr><td>1</td><td>2</td></tr></table>')).toBe(
      '| A |  |\n| :-: | :-: |\n| 1 | 2 |',
    );
  });
});

describe('nested tables', () => {
  it('keep the outer row on one line', () => {
    expect(convert('<table><tr><td>out<table><tr><td>in</td><td>x</td></tr></table></td></tr></table>')).toBe(
      '| out<br>\\| in \\| x \\|<br>\\| --- \\| --- \\| |\n| --- |',
    );
  });
});
