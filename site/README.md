# The VINvoice website

A small Node script (Node 22.12 or later, Node built-ins only; the one import from outside `site/`
is `scripts/lib/csv.mjs`) that turns `generated/` and `corpus/` into static HTML in `dist/`.
Prettier formats the JavaScript but not the markup inside `html` templates (`.prettierrc` turns
embedded formatting off), so `test.mjs` checks that the tags of every page are balanced. Nothing
else is installed for the site.

```bash
npm run dev      # generate, build, serve at http://localhost:4321; rebuilds when site/, generated/ or corpus/ change
npm run build    # validate, generate, then node site/build.mjs -> dist/
npm run preview  # serve an existing dist/ (site/serve.mjs)
npm run check    # Prettier, then node site/test.mjs (builds into a temporary folder and tests it)
```

## Layout

| Path               | What it is                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| `build.mjs`        | Entry point. Renders every module in `pages/`, copies `public/` and `styles/site.css` (to `/site.css`).        |
| `serve.mjs`        | Static server for `dist/` (development and preview only).                                                      |
| `test.mjs`         | Link and structure test over a build.                                                                          |
| `lib/html.mjs`     | The `html` template tag: escapes every interpolated value; `raw()` marks trusted markup; `attr()` is optional. |
| `lib/*.mjs`        | Data access: `registry`, `corpus`, `downloads`, `bindings`, `llms`, `site` constants.                          |
| `layouts/base.mjs` | Page shell: `Base(meta, body)`.                                                                                |
| `components/*.mjs` | `Key`, `KeyList`, `PageHead`, `Rows`.                                                                          |
| `pages/**`         | One module per page or file. Routes follow the file names.                                                     |
| `public/`          | Copied to the root of the site as it is (favicon, robots.txt, CNAME, `vocabulary-filter.js`).                  |
| `styles/site.css`  | The one stylesheet.                                                                                            |
| `data/`            | `implementations.json`, the list on the implementations page.                                                  |

## Pages

A module in `pages/` exports `render({ path, props })`. It returns `html` for a page, which
`build.mjs` writes to `<route>/index.html`, or a string for a file. `pages/index.mjs` is `/`,
`pages/404.mjs` is `404.html`. A dynamic route has `[name]` in the file name and must export
`paths()`, a list of `{ params, props }`, one per output (`vocabulary/[slug].mjs`): `params` fills the
`[name]` parts of the file name, `props` is handed to `render`. A module that exports
`kind = 'file'` is written under its own name (`llms.txt.mjs` becomes `llms.txt`,
`downloads/[file].mjs` the files below `downloads/`). `pages/` holds routes only: every `.mjs`
file in it is built, so helpers belong in `lib/` or `components/`. The build refuses symbolic
links in `pages/` and `public/`, and an output directory that holds the repository.

A minimal page:

```js
import { Base } from '../layouts/base.mjs';
import { PageHead } from '../components/page-head.mjs';
import { html } from '../lib/html.mjs';

export function render({ path }) {
  return Base(
    { path, title: 'Example', description: 'One sentence for search results.' },
    html`
      ${PageHead({ title: 'Example', lead: 'A short introduction.' })}
      <div class="prose"><p>Text goes here.</p></div>
    `
  );
}
```

The text of a page is JavaScript: a template literal. The fixed text between the tags is HTML as
written, so type `&amp;` and `&lt;` as in any HTML file; only the values between `${` and `}` are
escaped for you. To write a literal backtick in running text use `` \` ``, for a literal `${` use
`\${`, and for a backslash `\\`.

Templates are written with the `html` tag. Interpolated values are escaped, arrays are flattened,
and `null`, `undefined`, `false` and `true` print nothing:

```js
html`<ul>${items.map((i) => html`<li>${i.name}</li>`)}</ul>`;
```

Guard optional markup with a boolean (`items.length > 0 && html...`), never with a number or a
string: `0` and `''` are values and print. An object that is not `html`, `raw()` or an array throws,
so a mixed-up argument fails the build. A link to an address from a data file goes through
`httpUrl()` (only http and https), for example `<a href="${httpUrl(i.url)}">`.

Registry text that contains key names goes through `linkKeys()`, which returns trusted markup.
Never type a key name into a template: use `REF` or iterate over `terms` (`lib/registry.mjs`).

## Common tasks

- **Change text:** edit the module in `pages/` (for example `pages/specification.mjs`), then
  `npm run check`.
- **Add a page:** create `pages/foo.mjs` as in the example above. To show it in the header, add it
  to `NAV` in `lib/site.mjs`; to list it in the sitemap, add it in `pages/sitemap.xml.mjs` unless
  `NAV` has it. Link to it from the pages that should (the cards in `pages/index.mjs`, the lists
  in `lib/llms.mjs`). `npm run check` reports a page that is missing from the sitemap and every
  broken link.
- **Change a term page:** `pages/vocabulary/[slug].mjs`. The data comes from `registry/`; edit the
  YAML there and run `npm run generate`, not the page.
- **Add a helper:** in `lib/` or `components/`. Every `.mjs` file in `pages/` is built as a page.

## When a rule changes

The text of a rule exists in the checker, in the Schematron generator and on the pages. Change
them in one commit:

1. `checker/vehicle_check.py` (the reference); refresh
   `corpus/checker-expected.json` with `python3 -I checker/test_corpus.py --update`.
2. `scripts/lib/schematron.mjs`, then `npm run generate` and `npm run test:schematron`.
3. `pages/specification.mjs` (the rule, and the reader steps in section 9), `pages/validation.mjs`
   (the rule table) and `lib/llms.mjs` (the same sentences for language models).
4. The key's YAML in `registry/keys/` if it states the rule.

`test.mjs` checks that the rule IDs on the validation page are the ones the checker raises; it
cannot check the sentences.

The `@param` and `@type` comments in the code are documentation. Nothing checks them: no type
checker is installed. An editor with TypeScript support shows them as hints.

## Rules

The site loads nothing from third parties, sets no cookies and has no tracking. The page header
sets a Content-Security-Policy (`default-src 'self'`) that enforces it in the browser, and
`test.mjs` enforces it at build time.
