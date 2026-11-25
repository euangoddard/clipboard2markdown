/**
 * Test oracle: loads the ORIGINAL clipboard2markdown implementation
 * (legacy/to-markdown.js + legacy/clipboard2markdown.js, byte-for-byte as
 * they shipped) into jsdom so that the rewrite can be differentially tested
 * against it — both the converter and the page's behaviour.
 */
import toMarkdownSource from '../../legacy/to-markdown.js?raw';
import appSource from '../../legacy/clipboard2markdown.js?raw';
import pageSource from '../../legacy/index.html?raw';

export interface LegacyApi {
  /** The legacy `convert(html)` function (to-markdown + pandoc rules + smart punctuation). */
  convert(html: string): string;
  /** The legacy `insert(textarea, text)` helper. */
  insert(field: HTMLTextAreaElement, value: string): void;
}

/** The original page, running in its own document. */
export interface LegacyPage {
  document: Document;
  info: HTMLElement;
  pastebin: HTMLElement;
  output: HTMLTextAreaElement;
  wrapper: HTMLElement;
  remove(): void;
}

const EXPORT_HOOK = '// http://stackoverflow.com/questions/2176861';

function loadToMarkdown(): unknown {
  // The bundle is UMD; give it a CommonJS-style module object to populate.
  const mod: { exports: unknown } = { exports: {} };
  new Function('module', 'exports', toMarkdownSource)(mod, mod.exports);
  return mod.exports;
}

/**
 * Evaluates the original clipboard2markdown.js with `document` bound to `doc`,
 * returning its private `convert`/`insert` functions and its DOMContentLoaded
 * handler (as `boot`).
 */
function instantiate(doc: Document): LegacyApi & { boot(): void } {
  if (!appSource.includes(EXPORT_HOOK)) {
    throw new Error('legacy/clipboard2markdown.js has changed; oracle hook not found');
  }
  // Expose the private closures, and capture the DOMContentLoaded handler
  // instead of letting it bind to the (already loaded) document.
  const instrumented = appSource
    .replace(EXPORT_HOOK, 'exported.convert = convert; exported.insert = insert;\n' + EXPORT_HOOK)
    .replace(
      "document.addEventListener('DOMContentLoaded', function () {",
      'exported.boot = (function () {',
    );
  const exported = {} as LegacyApi & { boot(): void };
  new Function('toMarkdown', 'exported', 'document', instrumented)(loadToMarkdown(), exported, doc);
  if (typeof exported.boot !== 'function') {
    throw new Error('legacy/clipboard2markdown.js has changed; boot hook not found');
  }
  return exported;
}

let cached: LegacyApi | undefined;

/** The original conversion functions. */
export function loadLegacy(): LegacyApi {
  cached ??= instantiate(document);
  return cached;
}

/**
 * Loads the original page (legacy/index.html markup and script) into an
 * <iframe>, so that it has its own document and event listeners.
 */
export function mountLegacyPage(): LegacyPage {
  const frame = document.createElement('iframe');
  document.body.append(frame);
  const doc = frame.contentDocument!;
  const body = pageSource.match(/<body>([\s\S]*)<\/body>/)![1]!;
  doc.body.innerHTML = body;
  // The original stylesheet's only behaviour-relevant rule.
  const style = doc.createElement('style');
  style.textContent = '.hidden { display: none !important; }';
  doc.head.append(style);
  instantiate(doc).boot();
  const byId = <T extends HTMLElement>(id: string) => doc.getElementById(id) as T;
  return {
    document: doc,
    info: byId('info'),
    pastebin: byId('pastebin'),
    output: byId<HTMLTextAreaElement>('output'),
    wrapper: byId('wrapper'),
    remove: () => frame.remove(),
  };
}
