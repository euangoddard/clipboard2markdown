/**
 * Specification of the HTML → Markdown conversion.
 *
 * Every expectation is checked against BOTH the new Turndown-based converter
 * and the original to-markdown implementation (loaded verbatim from
 * legacy/), so this file doubles as documentation of the original behaviour.
 */
import { describe, expect, it } from 'vitest';
import { htmlToMarkdown } from '../src/converter';
import { loadLegacy } from './legacy/oracle';

const legacy = loadLegacy();

function expectConversion(html: string, markdown: string): void {
  expect(legacy.convert(html), 'original converter').toBe(markdown);
  expect(htmlToMarkdown(html), 'new converter').toBe(markdown);
}

describe('headings', () => {
  it('renders <h1> as a setext heading underlined with "="', () => {
    expectConversion('<h1>Title</h1>', 'Title\n=====');
  });

  it('renders <h2> as a setext heading underlined with "-"', () => {
    expectConversion('<h2>Subtitle</h2>', 'Subtitle\n--------');
  });

  it('renders <h3>–<h6> as ATX headings', () => {
    expectConversion('<h3>Three</h3><h4>Four</h4><h5>Five</h5><h6>Six</h6>', '### Three\n\n#### Four\n\n##### Five\n\n###### Six');
  });

  it('sizes the setext underline to the converted heading text', () => {
    expectConversion('<h1>Hello <em>big</em> world</h1>', 'Hello *big* world\n=================');
  });

  it('drops empty headings', () => {
    expectConversion('<h2>  </h2><p>after</p>', 'after');
  });
});

describe('paragraphs, whitespace and line breaks', () => {
  it('separates paragraphs with a blank line', () => {
    expectConversion('<p>One</p><p>Two</p>', 'One\n\nTwo');
  });

  it('renders <br> as a Pandoc backslash hard line break', () => {
    expectConversion('<p>line one<br>line two</p>', 'line one\\\nline two');
  });

  it('drops a hard line break that ends a paragraph', () => {
    expectConversion('<p>text<br></p><p>next</p>', 'text\n\nnext');
  });

  it('turns two consecutive line breaks into a paragraph break', () => {
    expectConversion('<p>a<br><br>b</p>', 'a\n\nb');
  });

  it('collapses runs of whitespace, as a browser would render them', () => {
    expectConversion('<p>  lots   of\n\n spaces\tand\ttabs  </p>', 'lots of spaces and tabs');
  });

  it('keeps non-breaking spaces', () => {
    expectConversion('<p>a&nbsp;b</p>', 'a b');
  });

  it('passes plain text through unchanged', () => {
    expectConversion('just some text', 'just some text');
  });

  it('handles the <div>-per-line structure produced by pasting plain text', () => {
    expectConversion('line 1<div>line 2</div><div><br></div><div>line 4</div>', 'line 1\n\nline 2\n\nline 4');
  });

  it('returns an empty string for empty or whitespace-only input', () => {
    expectConversion('', '');
    expectConversion('   \n  ', '');
  });

  it('drops empty paragraphs', () => {
    expectConversion('<p></p><p> </p><p>x</p>', 'x');
  });

  it('drops HTML comments', () => {
    expectConversion('<p>a<!-- comment -->b</p>', 'ab');
  });
});

describe('inline formatting', () => {
  it('renders <em>, <i>, <cite> and <var> as *emphasis*', () => {
    expectConversion('<p><em>em</em> <i>i</i> <cite>cite</cite> <var>var</var></p>', '*em* *i* *cite* *var*');
  });

  it('renders <strong> and <b> as **strong**', () => {
    expectConversion('<p><strong>strong</strong> and <b>b</b></p>', '**strong** and **b**');
  });

  it('nests emphasis inside strong', () => {
    expectConversion('<p><b><i>both</i></b></p>', '***both***');
  });

  it('moves whitespace inside emphasis outside the markers', () => {
    expectConversion('<p>a<em> spaced </em>b</p>', 'a *spaced* b');
  });

  it('renders <del>, <s> and <strike> as ~~strikethrough~~', () => {
    expectConversion('<p><del>del</del> <s>s</s> <strike>strike</strike></p>', '~~del~~ ~~s~~ ~~strike~~');
  });

  it('renders <sup> as ^superscript^ and <sub> as ~subscript~ (Pandoc)', () => {
    expectConversion('<p>H<sub>2</sub>O and E=mc<sup>2</sup></p>', 'H~2~O and E=mc^2^');
  });

  it('renders <code>, <kbd>, <samp> and <tt> as `code`', () => {
    expectConversion('<p><code>code</code> <kbd>Ctrl</kbd> <samp>out</samp> <tt>tt</tt></p>', '`code` `Ctrl` `out` `tt`');
  });

  it('does not escape Markdown characters in text', () => {
    expectConversion('<p>a * b _ c [d] `e` # f</p>', 'a * b _ c [d] `e` # f');
  });

  it('decodes HTML entities', () => {
    expectConversion('<p>x &amp; y &lt;tag&gt;</p>', 'x & y <tag>');
  });

  it('keeps the content of elements with no Markdown equivalent', () => {
    expectConversion('<p><mark>marked</mark> <abbr title="x">abbr</abbr> <u>u</u></p>', 'marked abbr u');
  });
});

describe('links and images', () => {
  it('renders inline links', () => {
    expectConversion('<p><a href="http://example.com">Example</a></p>', '[Example](http://example.com)');
  });

  it('includes the link title', () => {
    expectConversion('<a href="http://example.com" title="The title">Example</a>', '[Example](http://example.com "The title")');
  });

  it('renders a link whose text is its URL as an <autolink>', () => {
    expectConversion('<a href="http://example.com">http://example.com</a>', '<http://example.com>');
  });

  it('renders a mailto: link showing the address as an <autolink>', () => {
    expectConversion('<a href="mailto:me@example.com">me@example.com</a>', '<me@example.com>');
  });

  it('renders other mailto: links as inline links', () => {
    expectConversion('<a href="mailto:me@example.com">Email me</a>', '[Email me](mailto:me@example.com)');
  });

  it('keeps just the text of anchors without an href', () => {
    expectConversion('<a name="top">Top</a>', 'Top');
  });

  it('keeps empty links', () => {
    expectConversion('<a href="http://example.com"></a>', '[](http://example.com)');
  });

  it('renders images with alt text and title', () => {
    expectConversion('<img src="http://example.com/a.png" alt="Alt text">', '![Alt text](http://example.com/a.png)');
    expectConversion('<img src="a.png" alt="A" title="T">', '![A](a.png "T")');
  });

  it('drops images without a src', () => {
    expectConversion('<p>before<img alt="nothing">after</p>', 'beforeafter');
  });

  it('renders linked images', () => {
    expectConversion('<a href="http://x.com"><img src="a.png" alt="A"></a>', '[![A](a.png)](http://x.com)');
  });
});

describe('lists', () => {
  it('renders unordered lists with "-" markers indented to four columns', () => {
    expectConversion('<ul><li>one</li><li>two</li></ul>', '-   one\n-   two');
  });

  it('renders ordered lists with numbers padded to four columns', () => {
    expectConversion('<ol><li>one</li><li>two</li></ol>', '1.  one\n2.  two');
  });

  it('keeps the marker width at four columns for two-digit numbers', () => {
    const html = '<ol>' + Array.from({ length: 10 }, (_, i) => `<li>item ${i + 1}</li>`).join('') + '</ol>';
    expect(htmlToMarkdown(html).split('\n').slice(-2)).toEqual(['9.  item 9', '10. item 10']);
    expectConversion(html, legacy.convert(html));
  });

  it('ignores the source formatting between list items', () => {
    expectConversion('<ul>\n  <li>a</li>\n  <li>b</li>\n</ul>', '-   a\n-   b');
  });

  it('indents nested lists by four spaces', () => {
    expectConversion(
      '<ul><li>one<ul><li>nested a</li><li>nested b</li></ul></li><li>two</li></ul>',
      '-   one\n    -   nested a\n    -   nested b\n-   two',
    );
  });

  it('nests ordered lists inside unordered ones', () => {
    expectConversion('<ul><li>x<ol><li>a</li><li>b</li></ol></li></ul>', '-   x\n    1.  a\n    2.  b');
  });

  it('separates a nested list from a preceding line break with a blank line', () => {
    expectConversion('<ul><li>x<br><ul><li>y</li></ul></li></ul>', '-   x\n\n    -   y');
  });

  it('indents continuation paragraphs inside list items', () => {
    expectConversion(
      '<ul><li><p>para one</p><p>para two</p></li><li><p>next</p></li></ul>',
      '-   para one\n\n    para two\n\n-   next',
    );
  });

  it('indents hard line breaks inside list items', () => {
    expectConversion('<ul><li>first<br>second</li></ul>', '-   first\\\n    second');
  });

  it('renders GitHub task list checkboxes', () => {
    expectConversion(
      '<ul><li><input type="checkbox" checked>done</li><li><input type="checkbox">todo</li></ul>',
      '-   [x] done\n-   [ ] todo',
    );
    // As GitHub renders them, with a space after the checkbox: the original
    // kept that space too, giving two.
    expectConversion(
      '<ul><li><input type="checkbox" checked> done</li><li><input type="checkbox"> todo</li></ul>',
      '-   [x]  done\n-   [ ]  todo',
    );
  });

  it('escapes text that would otherwise start an ordered list', () => {
    expectConversion('<p>1. not a list</p><p>2015. A year</p>', '1\\. not a list\n\n2015\\. A year');
    expectConversion('<p>3.&nbsp;three</p>', '3\\. three');
  });

  it('does not escape numbers in the middle of a line', () => {
    expectConversion('<p>Version 2. Then</p>', 'Version 2. Then');
  });
});

describe('block quotes, rules and code', () => {
  it('prefixes block quotes with "> "', () => {
    expectConversion('<blockquote><p>Quoted</p><p>Second</p></blockquote>', '> Quoted\n>\n> Second');
  });

  it('nests block quotes', () => {
    expectConversion('<blockquote><p>outer</p><blockquote><p>inner</p></blockquote></blockquote>', '> outer\n>\n> > inner');
  });

  it('keeps hard line breaks inside block quotes', () => {
    expectConversion('<blockquote>a<br>b</blockquote>', '> a\\\n> b');
  });

  it('renders <hr> as a Pandoc "* * * * *" rule', () => {
    expectConversion('<p>above</p><hr><p>below</p>', 'above\n\n* * * * *\n\nbelow');
  });

  it('renders <pre><code> as a fenced code block, preserving whitespace', () => {
    expectConversion('<pre><code>function x() {\n  return 1;\n}</code></pre>', '```\nfunction x() {\n  return 1;\n}\n```');
  });

  it('does not convert typographic punctuation… except that it does, even in code', () => {
    // The smart-punctuation pass runs over the whole document.
    expectConversion('<pre><code>“a” — b</code></pre>', '```\n"a" --- b\n```');
  });

  it('keeps <pre> without <code> as preformatted text', () => {
    expectConversion('<pre>raw   preformatted\n  text</pre>', 'raw   preformatted\n  text');
  });

  it('treats <code> with siblings inside <pre> as inline code', () => {
    expectConversion('<pre>x <code>y</code></pre>', 'x `y`');
  });

  it('renders GitHub "highlight" blocks as fenced code with the language', () => {
    expectConversion(
      '<div class="highlight highlight-js"><pre>var a = 1;\nvar b = 2;</pre></div>',
      '```js\nvar a = 1;\nvar b = 2;\n```',
    );
  });
});

describe('tables (GitHub Flavoured Markdown)', () => {
  it('renders tables with a header row', () => {
    expectConversion(
      '<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>',
      '| A | B |\n| --- | --- |\n| 1 | 2 |',
    );
  });

  it('honours the align attribute of header cells', () => {
    expectConversion(
      '<table><thead><tr><th align="left">L</th><th align="center">C</th><th align="right">R</th><th>N</th></tr></thead>' +
        '<tbody><tr><td>1</td><td>2</td><td>3</td><td>4</td></tr></tbody></table>',
      '| L | C | R | N |\n| :-- | :-: | --: | --- |\n| 1 | 2 | 3 | 4 |',
    );
  });

  it('renders tables without a header as rows only', () => {
    expectConversion('<table><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></table>', '| 1 | 2 |\n| 3 | 4 |');
  });

  it('keeps empty cells', () => {
    expectConversion(
      '<table><thead><tr><th>A</th><th></th></tr></thead><tbody><tr><td></td><td>x</td></tr></tbody></table>',
      '| A |  |\n| --- | --- |\n|  | x |',
    );
  });
});

describe('smart punctuation (Pandoc)', () => {
  it('straightens curly quotes and primes', () => {
    expectConversion('<p>‘single’ “double” it´s 5″</p>', `'single' "double" it's 5"`);
  });

  it('turns dashes into Pandoc dash sequences', () => {
    expectConversion('<p>a – b ― c — d − e</p>', 'a -- b -- c --- d - e');
  });

  it('turns bullets into hyphens and the ellipsis into three dots', () => {
    expectConversion('<p>• one · two ▪ three…</p>', '- one - two - three...');
  });
});

describe('document structure', () => {
  it('flattens structural containers into paragraphs', () => {
    expectConversion('<div><section><p>deep</p></section></div><article>art</article>', 'deep\n\nart');
  });

  it('renders definition lists as plain paragraphs', () => {
    expectConversion('<dl><dt>Term</dt><dd>Definition</dd></dl>', 'Term\n\nDefinition');
  });

  it('converts a realistic article', () => {
    const html = `<h1>Getting started</h1>
<p>This is a <strong>quick</strong> guide to the <a href="https://example.com/docs" title="Docs">documentation</a>.</p>
<h2>Install</h2>
<pre><code>npm install example</code></pre>
<h3>Features</h3>
<ul>
  <li>Fast — really “fast”</li>
  <li>Small<br>and light</li>
</ul>
<blockquote><p>It’s great…</p></blockquote>
<hr>
<p>Contact <a href="mailto:hi@example.com">hi@example.com</a></p>`;
    expectConversion(
      html,
      [
        'Getting started',
        '===============',
        '',
        'This is a **quick** guide to the [documentation](https://example.com/docs "Docs").',
        '',
        'Install',
        '-------',
        '',
        '```',
        'npm install example',
        '```',
        '',
        '### Features',
        '',
        '-   Fast --- really "fast"',
        '-   Small\\',
        '    and light',
        '',
        "> It's great...",
        '',
        '* * * * *',
        '',
        'Contact <hi@example.com>',
      ].join('\n'),
    );
  });

  it('never leaks the internal line-break placeholder, even if the input uses it', () => {
    const html = 'ab<br>c';
    expectConversion(html, 'ab\\\nc');
  });
});
