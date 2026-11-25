# Original implementation (test oracle)

These files are the original clipboard2markdown page, kept **unmodified** so
the test suite can run the rewrite side by side with them:

- `to-markdown.js`: the bundled to-markdown converter (since renamed Turndown)
- `clipboard2markdown.js`: the original Pandoc rules and page behaviour
- `index.html`: the original page markup

`test/legacy/oracle.ts` loads them into jsdom. They are not part of the app
build. The original stylesheet and background images were removed because
the tests do not need them.
