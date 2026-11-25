/**
 * Bold and italic expressed with inline CSS rather than <b>/<i>, as pasted
 * from Google Docs, Word and OneNote (#27, #15, #5). The original converter
 * ignored these styles, so these expectations are for the new converter only.
 */
import { describe, expect, it } from 'vitest';
import { htmlToMarkdown } from '../src/converter';

const convert = (html: string) => htmlToMarkdown(html, 'typographic');

describe('pastes from editors that style formatting inline', () => {
  it('converts Google Docs, ignoring its normal-weight <b> wrapper', () => {
    const html =
      '<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1a2b3c4d-7fff-1234-5678-9abcdef01234">' +
      '<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;">' +
      '<span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">details </span>' +
      '<span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">for</span>' +
      '<span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> bold</span>' +
      '<span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> the writer</span>' +
      '</p><br>' +
      '<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;">' +
      '<span style="font-size:11pt;font-family:Arial,sans-serif;font-weight:700;font-style:italic;">Both</span>' +
      '<span style="font-size:11pt;font-family:Arial,sans-serif;font-weight:400;font-style:normal;"> plain</span>' +
      '</p></b>';
    expect(convert(html)).toBe('details *for* **bold** the writer\n\n***Both*** plain');
  });

  it('converts OneNote', () => {
    const html =
      "<ul type=disc style='margin-left:.375in;direction:ltr;unicode-bidi:embed;margin-top:0in;margin-bottom:0in'>" +
      " <li style='margin-top:0;margin-bottom:0;vertical-align:middle'><span style='font-family:Calibri;font-size:11.0pt'>Cognitive workload: the readers read the paper because they think it can solve </span>" +
      "<span style='font-weight:bold;font-style:italic;font-family:Calibri;font-size: 11.0pt'>their</span>" +
      "<span style='font-family:Calibri;font-size:11.0pt'> problems, not the author's problem. </span></li>" +
      '</ul>';
    expect(convert(html)).toBe(
      "-   Cognitive workload: the readers read the paper because they think it can solve ***their*** problems, not the author's problem.",
    );
  });

  it('converts Word', () => {
    const html =
      '<p class="MsoNormal"><span lang="EN-GB">A </span>' +
      '<b style="mso-bidi-font-weight:normal"><span lang="EN-GB">bold</span></b>' +
      '<span lang="EN-GB"> and <span style="font-weight:bold;mso-bidi-font-weight:normal">styled</span> word</span></p>';
    expect(convert(html)).toBe('A **bold** and **styled** word');
  });
});

describe('font-weight', () => {
  it.each([
    ['bold', '**x**'],
    ['bolder', '**x**'],
    ['600', '**x**'],
    ['900', '**x**'],
    ['500', 'x'],
    ['100', 'x'],
    ['normal', 'x'],
    ['lighter', 'x'],
    ['inherit', 'x'],
  ])('font-weight: %s on a <span> gives %j', (fontWeight, markdown) => {
    expect(convert(`<span style="font-weight: ${fontWeight}">x</span>`)).toBe(markdown);
  });

  it.each([
    ['<b style="font-weight: normal">x</b>', 'x'],
    ['<strong style="font-weight: 500">x</strong>', 'x'],
    ['<b style="font-weight: 600">x</b>', '**x**'],
    ['<b style="color: red">x</b>', '**x**'],
  ])('%s gives %j', (html, markdown) => {
    expect(convert(html)).toBe(markdown);
  });
});

describe('font-style', () => {
  it.each([
    ['italic', '*x*'],
    ['oblique', '*x*'],
    ['oblique 10deg', '*x*'],
    ['normal', 'x'],
    ['inherit', 'x'],
  ])('font-style: %s on a <span> gives %j', (fontStyle, markdown) => {
    expect(convert(`<span style="font-style: ${fontStyle}">x</span>`)).toBe(markdown);
  });

  it.each([
    ['<i style="font-style: normal">x</i>', 'x'],
    ['<em style="font-style: normal">x</em>', 'x'],
    ['<i style="font-style: oblique">x</i>', '*x*'],
  ])('%s gives %j', (html, markdown) => {
    expect(convert(html)).toBe(markdown);
  });
});

describe('combined formatting', () => {
  it.each([
    ['both styles on one element', '<span style="font-weight: bold; font-style: italic">x</span>', '***x***'],
    ['the font shorthand', '<span style="font: italic bold 12px Arial">x</span>', '***x***'],
    ['italic style on <b>', '<b style="font-style: italic">x</b>', '***x***'],
    ['bold style on <i>', '<i style="font-weight: bold">x</i>', '***x***'],
    ['<b> cancelled, italic kept', '<b style="font-weight: normal; font-style: italic">x</b>', '*x*'],
    ['styled bold link', '<a href="https://example.com/" style="font-weight: bold">link</a>', '**[link](https://example.com/)**'],
  ])('%s', (_name, html, markdown) => {
    expect(convert(html)).toBe(markdown);
  });
});

describe('no duplicate markers', () => {
  it.each([
    ['styled bold inside <b>', '<b><span style="font-weight: bold">x</span></b>', '**x**'],
    ['bold style on <b>', '<b style="font-weight: bold">x</b>', '**x**'],
    ['styled bold inside styled bold', '<span style="font-weight: bold">a <span style="font-weight: 700">b</span></span>', '**a b**'],
    ['styled italic inside <em>', '<em>a <span style="font-style: italic">b</span></em>', '*a b*'],
  ])('%s', (_name, html, markdown) => {
    expect(convert(html)).toBe(markdown);
  });

  it.each([
    ['bold runs', '<span style="font-weight: 700">foo</span><span style="font-weight: 700; color: red">bar</span>', '**foobar**'],
    ['bold italic runs', '<span style="font-weight: 700; font-style: italic">foo</span><span style="font-weight: 700; font-style: italic">bar</span>', '***foobar***'],
    ['bold then bold italic', '<span style="font-weight: 700">foo</span><span style="font-weight: 700; font-style: italic">bar</span>', '**foo*bar***'],
  ])('merges adjacent %s', (_name, html, markdown) => {
    expect(convert(html)).toBe(markdown);
  });

  it('keeps runs separated by text apart', () => {
    expect(convert('<span style="font-weight: 700">foo</span> <span style="font-weight: 700">bar</span>')).toBe('**foo** **bar**');
  });
});

describe('whitespace at the edges of styled elements', () => {
  it.each([
    ['leading and trailing spaces', 'a<span style="font-weight: bold"> b </span>c', 'a **b** c'],
    ['trailing space', 'a<span style="font-style: italic">b </span>c', 'a*b* c'],
    ['whitespace only', 'a<span style="font-weight: bold"> </span>b', 'a b'],
  ])('keeps %s outside the markers', (_name, html, markdown) => {
    expect(convert(html)).toBe(markdown);
  });
});

describe('styles that are not converted', () => {
  it.each([
    ['inside preformatted text', '<pre><code><span style="font-weight: bold">x</span></code></pre>', '```\nx\n```'],
    ['on a block element', '<p style="font-weight: bold">x</p>', 'x'],
    ['cancelling an ancestor’s bold', '<b>a <span style="font-weight: normal">b</span></b>', '**a b**'],
  ])('%s', (_name, html, markdown) => {
    expect(convert(html)).toBe(markdown);
  });
});
