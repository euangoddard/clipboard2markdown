clipboard2markdown
==================

> Easily convert richly formatted text or HTML to
> [Markdown](http://daringfireball.net/projects/markdown/syntax).
> Use the clipboard and paste to Markdown with a single keypress.
>
> The conversion is carried out by
> [Turndown](https://github.com/mixmark-io/turndown) (formerly
> to-markdown), a Markdown converter running in the browser.

Demo
----

### Interactive

<http://euangoddard.github.io/clipboard2markdown/>

### Video

![Screencast: copying a formatted article, pasting it into the app and copying the converted Markdown](screencast.webp)

Usage
-----

Open the app, copy some rich text and press `Ctrl+V` (or `⌘+V` on Mac)
anywhere on the page.

On a phone or tablet, tap and hold the paste area at the top of the page,
then choose **Paste**. The area stays above the converted Markdown, so you
can paste again from there. On a tablet with a keyboard, the shortcut
works too.

The converted Markdown is selected, ready to copy with `Ctrl+C`
(or `⌘+C`), or use the **Copy** button.

One can paste multiple times. A paste replaces the selected text, so
pasting straight after a conversion overwrites it; place the cursor in
the output first to insert at that point instead.

Bold and italic are kept whether the source marks them up or sets them
with styles, as Google Docs, Word and OneNote do.

Typographic punctuation (“curly quotes”, en and em dashes, the
ellipsis) and no-break spaces are kept as pasted. Switch on **Pandoc
ASCII punctuation** to write the punctuation the way [Pandoc's smart
extension](http://pandoc.org/README.html#smart-punctuation) expects
instead (`"`, `'`, `--`, `---`, `...`), and no-break spaces as ordinary
spaces, which LaTeX accepts. The browser remembers the choice.

Tables become pipe tables, which GitHub and Pandoc both read. The first
row is the header, whether or not it was marked up as one. A line break or
paragraph inside a cell is written as `<br>`, and a `|` in a cell as `\|`.

Development
-----------

The app is built with [Solid](https://www.solidjs.com/) 2 and
[Vite](https://vite.dev/), and tested with [Vitest](https://vitest.dev/).

```sh
npm install
npm run dev        # start a development server
npm test           # run the test suite
npm run typecheck  # type-check with TypeScript
npm run build      # production build in dist/
```

### Layout

-   `src/converter/` holds the HTML to Markdown conversion: Turndown
    configured with the original Pandoc, GFM and Markdown rules, plus the
    Pandoc clean-up of line breaks and, optionally, punctuation. The
    switch's "Pandoc ASCII punctuation" is `'ascii'` punctuation in the
    code; off is `'typographic'`.
-   `src/App.tsx` is the page: the paste shortcut, the hidden paste target,
    the paste area shown on touch devices, the punctuation switch, and the
    output.
-   `src/punctuationPreference.ts` remembers the punctuation choice in
    `localStorage`.
-   `index.html` carries the search and link-preview metadata: the
    canonical URL, Open Graph and Twitter card tags, and JSON-LD. Open
    Graph needs absolute URLs, so the deployed address
    `https://euangoddard.github.io/clipboard2markdown/` is written out
    there and in `public/sitemap.xml`; change both if the site moves.
-   `public/` is published as is: icons, the web app manifest, the
    sitemap and the link-preview image. `public/icon.svg` follows the
    light or dark theme.
-   `design/` holds the sources of the PNG images in `public/`. After
    editing one, render the PNGs again:

    ```sh
    rsvg-convert -w 1200 -h 630 design/og-image.svg -o public/og-image.png
    rsvg-convert -w 180 -h 180 design/app-icon.svg -o public/apple-touch-icon.png
    rsvg-convert -w 192 -h 192 design/app-icon.svg -o public/icon-192.png
    rsvg-convert -w 512 -h 512 design/app-icon.svg -o public/icon-512.png
    ```
-   `legacy/` is the original implementation, kept unmodified as a test
    oracle.

### Tests

The suite checks that the rewrite reproduces the original behaviour.
The original always wrote ASCII punctuation, so the parity tests run with
it switched on:

-   `test/converter.test.ts` specifies every conversion rule. Expectations
    shared with the original are asserted against both the original
    converter and the new one; the rest cover the punctuation options.
-   `test/parity.test.ts` compares the two converters on a corpus and on
    thousands of seeded random documents. The intentional differences are
    listed there, each fixing a bug in the original: styled bold and
    italic, whitespace around inline elements, no-break spaces, and
    tables.
-   `test/styledFormatting.test.ts` and `test/tables.test.ts` specify
    behaviour that is new in the rewrite: bold and italic set with inline
    styles, and pipe tables that GFM and Pandoc read.
-   `test/appParity.test.tsx` runs the original page and the new app
    through the same user journeys (shortcut, paste, caret placement,
    repeated pastes) and compares their state after every step.
-   `test/app.test.tsx`, `test/insertText.test.ts`,
    `test/pasteShortcut.test.ts`, `test/cleanUp.test.ts` and
    `test/punctuationPreference.test.ts` cover the individual pieces.
-   `test/seo.test.ts` checks the page metadata, and that every icon,
    image and manifest it links to is published.

About
-----

[clipboard2markdown](https://github.com/euangoddard/clipboard2markdown)
was created by [Euan Goddard](https://github.com/euangoddard).
The original version used
[html2markdown](https://github.com/kates/html2markdown) by
[Kates Gasis](https://github.com/kates) and
[Himanshu Gilani](https://github.com/hgilani).
[Vegard Øye](https://github.com/epsil) ported it to
[to-markdown](https://github.com/domchristie/to-markdown) by
[Dom Christie](https://github.com/domchristie), which has since become
[Turndown](https://github.com/mixmark-io/turndown). Version 2 is a
rewrite in [Solid](https://www.solidjs.com/) on Turndown.

### License

[![License][license-image]][license-url]

Released under the MIT License. See the [LICENSE](LICENSE) file
for details.

[license-image]: https://img.shields.io/npm/l/markdownlint.svg
[license-url]: http://opensource.org/licenses/MIT
