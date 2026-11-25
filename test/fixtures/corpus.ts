/**
 * Representative HTML inputs, as found in the clipboard after copying from
 * web pages, word processors and code hosts. Used both for explicit
 * expectations and for differential testing against the original converter.
 */
export const corpus: Record<string, string> = {
  // Headings
  'h1 setext': '<h1>Title</h1>',
  'h2 setext': '<h2>Subtitle</h2>',
  'h3-h6 atx': '<h3>Three</h3><h4>Four</h4><h5>Five</h5><h6>Six</h6>',
  'heading with inline markup': '<h1>Hello <em>big</em> world</h1>',
  'empty heading': '<h2>  </h2><p>after</p>',

  // Paragraphs and line breaks
  'paragraphs': '<p>One</p><p>Two</p>',
  'line breaks': '<p>line one<br>line two<br>line three</p>',
  'trailing br': '<p>text<br></p><p>next</p>',
  'double br': '<p>a<br><br>b</p>',
  'br between divs': '<div>a</div><br><div>b</div>',
  'whitespace collapse': '<p>  lots   of\n\n spaces\tand\ttabs  </p>',
  'nbsp': '<p>a&nbsp;b&nbsp;&nbsp;c</p>',
  'plain text': 'just some text',
  'plain text multiline (pasted text)': 'line 1<div>line 2</div><div><br></div><div>line 4</div>',

  // Inline formatting
  'emphasis variants': '<p><em>em</em> <i>i</i> <cite>cite</cite> <var>var</var></p>',
  'strong variants': '<p><strong>strong</strong> and <b>b</b></p>',
  'nested strong emphasis': '<p><b><i>both</i></b></p>',
  'emphasis with inner spaces': '<p>a<em> spaced </em>b</p>',
  'emphasis leading space nested': '<b><i> x</i></b>',
  'strikethrough': '<p><del>del</del> <s>s</s> <strike>strike</strike></p>',
  'sup sub': '<p>H<sub>2</sub>O and E=mc<sup>2</sup></p>',
  'inline code variants': '<p><code>code</code> <kbd>Ctrl</kbd> <samp>out</samp> <tt>tt</tt></p>',
  'markdown chars are not escaped': '<p>a * b _ c [d] `e` # f</p>',
  'blank span': 'a<span> </span>b',
  'blank bold': 'a<b> </b>b',
  'styled spans (chrome)': '<span style="color: rgb(0, 0, 0);">Hello</span><span style="color: rgb(0, 0, 0);"> </span><span style="font-weight: bold;">world</span>',

  // Links and images
  'link': '<p><a href="http://example.com">Example</a></p>',
  'link with title': '<a href="http://example.com" title="The title">Example</a>',
  'autolink': '<a href="http://example.com">http://example.com</a>',
  'mailto link': '<a href="mailto:me@example.com">me@example.com</a>',
  'mailto link with text': '<a href="mailto:me@example.com">Email me</a>',
  'anchor without href': '<a name="top">Top</a>',
  'empty link': '<a href="http://example.com"></a>',
  'link wrapping image': '<a href="http://x.com"><img src="a.png" alt="A"></a>',
  'image': '<img src="http://example.com/a.png" alt="Alt text">',
  'image with title': '<img src="a.png" alt="A" title="T">',
  'image without src': '<p><img alt="nothing"></p>',

  // Lists
  'unordered list': '<ul><li>one</li><li>two</li><li>three</li></ul>',
  'ordered list': '<ol><li>one</li><li>two</li></ol>',
  'pretty printed list': '<ul>\n  <li>a</li>\n  <li>b</li>\n</ul>',
  'long ordered list': '<ol>' + Array.from({ length: 12 }, (_, i) => `<li>item ${i + 1}</li>`).join('') + '</ol>',
  'nested list': '<ul><li>one<ul><li>nested a</li><li>nested b</li></ul></li><li>two</li></ul>',
  'nested ordered in unordered': '<ul><li>x<ol><li>a</li><li>b</li></ol></li></ul>',
  'list with paragraphs': '<ul><li><p>para one</p><p>para two</p></li><li><p>next</p></li></ul>',
  'task list': '<ul><li><input type="checkbox" checked> done</li><li><input type="checkbox"> todo</li></ul>',
  'text starting with number': '<p>1. not a list</p><p>2015. A year</p>',
  'number with nbsp': '<p>3.&nbsp;three</p>',
  'number mid sentence': '<p>Version 2. Then</p>',

  // Block quotes, rules, code
  'blockquote': '<blockquote><p>Quoted</p><p>Second</p></blockquote>',
  'nested blockquote': '<blockquote><p>outer</p><blockquote><p>inner</p></blockquote></blockquote>',
  'horizontal rule': '<p>above</p><hr><p>below</p>',
  'pre code': '<pre><code>function x() {\n  return 1;\n}</code></pre>',
  'pre without code': '<pre>raw   preformatted\n  text</pre>',
  'pre with code and siblings': '<pre>x <code>y</code></pre>',
  'github highlighted': '<div class="highlight highlight-js"><pre>var a = 1;\nvar b = 2;</pre></div>',

  // Tables
  'table with thead': '<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>',
  'table alignment': '<table><thead><tr><th align="left">L</th><th align="center">C</th><th align="right">R</th><th>N</th></tr></thead><tbody><tr><td>1</td><td>2</td><td>3</td><td>4</td></tr></tbody></table>',
  'table without thead': '<table><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></table>',
  'table with empty cell': '<table><thead><tr><th>A</th><th></th></tr></thead><tbody><tr><td></td><td>x</td></tr></tbody></table>',

  // Smart punctuation
  'smart quotes': '<p>‘single’ “double” it´s 5″</p>',
  'dashes': '<p>a – b ― c — d − e</p>',
  'bullets and ellipsis': '<p>• one · two ▪ three…</p>',

  // Structural noise
  'divs and sections': '<div><section><p>deep</p></section></div><article>art</article>',
  'comments are dropped': '<p>a<!-- comment -->b</p>',
  'unknown inline elements': '<p><mark>marked</mark> <abbr title="x">abbr</abbr> <u>u</u></p>',
  'definition list': '<dl><dt>Term</dt><dd>Definition</dd></dl>',
  'empty input': '',
  'whitespace only': '   \n  ',
  'empty paragraphs': '<p></p><p> </p><p>x</p>',

  // A realistic article fragment
  'article': `<h1>Getting started</h1>
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
<p>Contact <a href="mailto:hi@example.com">hi@example.com</a></p>`,
};
