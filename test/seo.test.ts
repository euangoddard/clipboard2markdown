import { describe, expect, it } from 'vitest';
import pageSource from '../index.html?raw';
import manifestSource from '../public/manifest.webmanifest?raw';

const SITE_URL = 'https://euangoddard.github.io/clipboard2markdown/';

const head = new DOMParser().parseFromString(pageSource, 'text/html').head;

/** Paths of the files in public/, which are published at the site root (lazy glob: only the keys are used). */
const published = new Set(Object.keys(import.meta.glob('../public/**/*')).map((key) => key.slice('../public/'.length)));
const isPublished = (path: string) => published.has(path.replace(/^\.?\//, ''));

const meta = (key: string) =>
  head.querySelector(`meta[property="${key}"], meta[name="${key}"]`)?.getAttribute('content') ?? null;

/** Whether an absolute URL on the deployed site is served from a file in public/. */
const isPublishedUrl = (url: string) => url.startsWith(SITE_URL) && isPublished(url.slice(SITE_URL.length));

describe('page metadata', () => {
  it('names the canonical URL, and Open Graph uses the same one', () => {
    expect(head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(SITE_URL);
    expect(meta('og:url')).toBe(SITE_URL);
  });

  it('keeps the description within what search results show', () => {
    expect(meta('description')!.length).toBeLessThanOrEqual(160);
  });

  it('has the Open Graph and Twitter tags that link previews need', () => {
    for (const key of ['og:type', 'og:title', 'og:description', 'og:image', 'og:image:alt', 'twitter:card']) {
      expect(meta(key), key).toBeTruthy();
    }
  });

  it('points og:image at an absolute URL of an image that is published', () => {
    const image = meta('og:image')!;
    expect(isPublishedUrl(image), image).toBe(true);
  });

  it('links icons and the manifest to files that are published', () => {
    const hrefs = [...head.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"], link[rel="manifest"]')].map(
      (link) => link.getAttribute('href')!,
    );
    expect(hrefs.length).toBeGreaterThanOrEqual(4);
    for (const href of hrefs) expect(isPublished(href), href).toBe(true);
  });

  it('describes the app with valid JSON-LD at the canonical URL', () => {
    const data = JSON.parse(head.querySelector('script[type="application/ld+json"]')!.textContent!);
    expect(data['@type']).toBe('WebApplication');
    expect(data.url).toBe(SITE_URL);
    expect(isPublishedUrl(data.image), data.image).toBe(true);
  });

  it('lists only icons in the manifest that are published', () => {
    const manifest = JSON.parse(manifestSource);
    for (const icon of manifest.icons) expect(isPublished(icon.src), icon.src).toBe(true);
  });
});
