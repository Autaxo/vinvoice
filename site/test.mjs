#!/usr/bin/env node
// Link and structure test for the built site.
//
//   node site/test.mjs [dir]
//
// Without an argument the site is built into a temporary directory first, so the test does not
// depend on a previous `npm run build`. With a directory it tests that build.
//
// Checks, for every HTML page: title, meta description and canonical URL (a page marked noindex
// needs no canonical); every internal href and src resolves to a file; every #fragment exists on
// its target page; nothing is loaded from a third party (no external src, stylesheet, preload or
// icon, no @import or url() to another host in the stylesheet); no inline event handlers, style
// attributes, style elements or javascript: URLs; every script is a file or a JSON-LD block that
// parses; the tags are balanced (Prettier does not format the markup inside html`` templates, so
// nothing else would notice a missing </div>). Across the site: the sitemap lists exactly the
// indexable pages, every internal link in llms.txt and llms-full.txt resolves, and the rules
// listed on the validation page are the rules the reference checker raises. The html`` tag
// itself is exercised at the top.
//
// The tag reader below is deliberately small. It does not understand comments, CDATA or unquoted
// attribute values that contain ">"; the generator writes none of them. If a page needs one, extend
// tags() and balanced() rather than excusing the page.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from './build.mjs';
import { attr, escape, html, httpUrl, raw, toHtmlString } from './lib/html.mjs';
import { ROOT } from './lib/paths.mjs';
import { SITE } from './lib/site.mjs';

const problems = /** @type {string[]} */ ([]);
/** @param {string} where @param {string} what */
const fail = (where, what) => problems.push(`${where}: ${what}`);

// --- the html`` tag ---------------------------------------------------------------------------
/** @param {string} what @param {unknown} got @param {unknown} want */
const same = (what, got, want) => {
  if (got !== want)
    fail(
      'site/lib/html.mjs',
      `${what}: got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`
    );
};
same(
  'escaping',
  toHtmlString(html`<a title="${`"x" & 'y'`}">${'<b>'}</a>`),
  `<a title="&quot;x&quot; &amp; &#39;y&#39;">&lt;b&gt;</a>`
);
same(
  'nesting is not escaped twice',
  toHtmlString(html`<p>${html`<b>${'&'}</b>`}</p>`),
  '<p><b>&amp;</b></p>'
);
same('arrays flatten', toHtmlString(html`${[1, [html`<i>${'a'}</i>`, 'b<']]}`), '1<i>a</i>b&lt;');
same(
  'null, undefined, false, true',
  toHtmlString(html`[${null}${undefined}${false}${true}]`),
  '[]'
);
same('zero and empty string are values', toHtmlString(html`[${0}][${''}]`), '[0][]');
same('raw', toHtmlString(html`${raw('<b>x</b>')}`), '<b>x</b>');
same(
  'attr',
  toHtmlString(html`<a href="/"${attr('lang', 'de')}${attr('hidden', false)}>`),
  '<a href="/" lang="de">'
);
same('escape', escape(`<&>"'`), '&lt;&amp;&gt;&quot;&#39;');
for (const [what, value] of /** @type {[string, unknown][]} */ ([
  ['an object', { a: 1 }],
  ['a Set', new Set([1])],
  ['an object without prototype', Object.create(null)],
  ['a function', () => 1],
])) {
  try {
    toHtmlString(html`${value}`);
    fail('site/lib/html.mjs', `printing ${what} must throw`);
  } catch {}
}
for (const bad of [
  'javascript:alert(1)',
  '\tjavascript:alert(1)',
  'java\nscript:alert(1)',
  'data:text/html,x',
  '/relative',
])
  try {
    httpUrl(bad);
    fail('site/lib/html.mjs', `httpUrl accepted ${JSON.stringify(bad)}`);
  } catch {}
same('httpUrl', httpUrl('https://example.org/a?b=c'), 'https://example.org/a?b=c');

// --- the build ------------------------------------------------------------------------------
let dir = process.argv[2] ? path.resolve(process.argv[2]) : null;
let temp = null;
if (!dir) {
  temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vinvoice-site-'));
  dir = temp;
  await build(dir);
}
const root = dir;

/** @type {string[]} every file below root, as "a/b.html" */
const files = fs
  .readdirSync(root, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile())
  .map((e) => path.relative(root, path.join(e.parentPath, e.name)).split(path.sep).join('/'));
const fileSet = new Set(files);
const pages = files.filter((f) => f.endsWith('.html'));

// --- reading HTML without a parser ----------------------------------------------------------
/** @param {string} s */
const decode = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

/**
 * @param {string} html
 * @returns {{ tag: string, attrs: Map<string, string> }[]}
 */
function tags(html) {
  const out = [];
  for (const m of html.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g)) {
    /** @type {Map<string, string>} */
    const attrs = new Map();
    for (const a of m[2].matchAll(
      /([^\s=/"'>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g
    )) {
      attrs.set(a[1].toLowerCase(), decode(a[2] ?? a[3] ?? a[4] ?? ''));
    }
    out.push({ tag: m[1].toLowerCase(), attrs });
  }
  return out;
}

/** The URL path of a built file: "a/index.html" -> "/a/". */
const urlOf = (/** @type {string} */ file) =>
  '/' + (file === '404.html' ? '404/' : file.replace(/index\.html$/, ''));

/** Page facts for the fragment check: the ids of every HTML page. */
const idsOf = new Map(
  pages.map((f) => [
    f,
    new Set(
      [...fs.readFileSync(path.join(root, f), 'utf8').matchAll(/\sid="([^"]*)"/g)].map((m) =>
        decode(m[1])
      )
    ),
  ])
);

/**
 * Resolve an internal reference from `from` (a built file) to a built file and fragment.
 * Returns null for references that leave the site.
 * @param {string} from
 * @param {string} ref
 */
function resolveRef(from, ref) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(ref) || ref.startsWith('//')) return null;
  const hash = ref.indexOf('#');
  const fragment = hash < 0 ? undefined : ref.slice(hash + 1);
  const pathPart = (hash < 0 ? ref : ref.slice(0, hash)).split('?')[0];
  if (pathPart === '') return { target: from, fragment };
  const abs = pathPart.startsWith('/') ? pathPart : path.posix.join(urlOf(from), pathPart);
  let target = decodeURIComponent(abs.replace(/^\//, ''));
  if (target === '' || target.endsWith('/')) target += 'index.html';
  return { target, fragment };
}

const VOID = new Set(
  'area base br col embed hr img input link meta param source track wbr'.split(' ')
);

/**
 * Whether the tags of a page are balanced. Returns a description of the first problem, or null.
 * Every non-void element must be closed explicitly, optional end tags (li, p, td ...) included.
 * @param {string} markup the page without script bodies
 */
function balanced(markup) {
  /** @type {string[]} */
  const open = [];
  // Strip comments until none is left, so that no nested '<!--' survives one pass.
  let text = markup;
  for (let previous = ''; previous !== text;) {
    previous = text;
    text = text.replace(/<!--[\s\S]*?-->/g, '');
  }
  text = text.replace(/<!doctype[^>]*>/i, '');
  for (const m of text.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g)) {
    const [, closing, name] = m;
    const tag = name.toLowerCase();
    if (VOID.has(tag) || m[3].endsWith('/')) continue;
    if (!closing) open.push(tag);
    else if (open.at(-1) === tag) open.pop();
    else return `</${tag}> closes <${open.at(-1) ?? 'nothing'}>`;
  }
  return open.length ? `<${open.at(-1)}> is never closed` : null;
}

// --- per page -------------------------------------------------------------------------------
const RESOURCE_LINK =
  /\b(stylesheet|preload|modulepreload|prefetch|icon|apple-touch-icon|manifest|dns-prefetch|preconnect)\b/i;
let references = 0;
for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  const where = page;
  // Script bodies are data, not markup: look at tags outside them.
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script[^>]*>/gi)];
  const markup = html.replace(/(<script\b[^>]*>)[\s\S]*?<\/script[^>]*>/gi, '$1</script>');
  const all = tags(markup);
  const unbalanced = balanced(markup);
  if (unbalanced) fail(where, `unbalanced tags: ${unbalanced}`);

  const title = markup.match(/<title>([\s\S]*?)<\/title>/)?.[1].trim();
  if (!title) fail(where, 'no <title>');
  const meta = (/** @type {string} */ name) =>
    all.find((t) => t.tag === 'meta' && t.attrs.get('name') === name)?.attrs.get('content');
  if (!meta('description')?.trim()) fail(where, 'no meta description');
  const canonical = all.find((t) => t.tag === 'link' && t.attrs.get('rel') === 'canonical');
  const noindex = meta('robots')?.includes('noindex');
  if (!canonical && !noindex) fail(where, 'no canonical link (and not noindex)');
  if (canonical) {
    const expected = new URL(urlOf(page), SITE.url).href;
    if (canonical.attrs.get('href') !== expected) {
      fail(where, `canonical is ${canonical.attrs.get('href')}, expected ${expected}`);
    }
  }
  if (!/<html[^>]*\slang="[a-z-]+"/.test(markup)) fail(where, 'no lang on <html>');
  if ((markup.match(/<h1[\s>]/g) ?? []).length !== 1) fail(where, 'expected exactly one <h1>');
  if ((markup.match(/<main[\s>]/g) ?? []).length !== 1) fail(where, 'expected exactly one <main>');

  for (const s of scripts) {
    const attrs = tags(`<script${s[1]}>`)[0].attrs;
    if (attrs.has('src')) continue;
    if (attrs.get('type') === 'application/ld+json') {
      try {
        JSON.parse(s[2]);
      } catch (e) {
        fail(where, `JSON-LD does not parse: ${/** @type {Error} */ (e).message}`);
      }
    } else fail(where, 'inline script (the Content-Security-Policy would block it)');
  }
  if (/<style[\s>]/i.test(markup)) fail(where, 'inline <style> element');

  for (const { tag, attrs } of all) {
    for (const name of attrs.keys()) {
      if (/^on[a-z]+$/.test(name)) fail(where, `inline event handler ${name} on <${tag}>`);
    }
    if (attrs.has('style')) fail(where, `inline style attribute on <${tag}>`);

    // Loads: everything that makes the browser fetch something on its own.
    const loads = [];
    if (attrs.has('src')) loads.push(attrs.get('src'));
    if (attrs.has('srcset'))
      loads.push(...(attrs.get('srcset') ?? '').split(',').map((x) => x.trim().split(/\s+/)[0]));
    if (tag === 'link' && RESOURCE_LINK.test(attrs.get('rel') ?? '')) loads.push(attrs.get('href'));
    if (tag === 'object' || tag === 'embed') loads.push(attrs.get('data'));
    if (tag === 'form') loads.push(attrs.get('action'));
    for (const url of loads) {
      if (url && (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//'))) {
        fail(where, `<${tag}> loads ${url} from outside the site`);
      }
    }

    // Links and loads that stay on the site must resolve.
    const refs = [];
    if (tag === 'a' || tag === 'area' || tag === 'link') refs.push(attrs.get('href'));
    refs.push(...loads);
    for (const ref of refs) {
      if (ref === undefined || ref === '') continue;
      if (/^javascript:/i.test(ref)) {
        fail(where, `javascript: URL on <${tag}>`);
        continue;
      }
      const hit = resolveRef(page, ref);
      if (!hit) continue;
      references++;
      if (!fileSet.has(hit.target)) {
        fail(where, `<${tag}> ${ref} -> ${hit.target} does not exist`);
      } else if (hit.fragment) {
        const ids = idsOf.get(hit.target);
        if (!ids) fail(where, `${ref}: fragment on a file that is not a page`);
        else if (!ids.has(decodeURIComponent(hit.fragment))) {
          fail(where, `${ref}: no element with id "${hit.fragment}" in ${hit.target}`);
        }
      }
    }
  }
}

// --- stylesheet -----------------------------------------------------------------------------
const sheets = files.filter((f) => f.endsWith('.css'));
if (sheets.length !== 1)
  fail('site', `expected one stylesheet, found ${sheets.join(', ') || 'none'}`);
for (const sheet of sheets) {
  const css = fs.readFileSync(path.join(root, sheet), 'utf8');
  if (/@import\b/.test(css)) fail(sheet, '@import');
  for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)/g)) {
    if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(m[1]) && !m[1].startsWith('data:')) {
      fail(sheet, `url(${m[1]}) points outside the site`);
    }
  }
}

// --- sitemap and llms files -----------------------------------------------------------------
const siteFile = (/** @type {string} */ f) => fs.readFileSync(path.join(root, f), 'utf8');
const indexable = new Set(
  pages
    .filter((f) => !/<meta name="robots" content="noindex"/.test(siteFile(f)))
    .map((f) => SITE.url + urlOf(f))
);
const listed = new Set(
  [...siteFile('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
);
const sitemapHint =
  '(a new page needs an entry in NAV in site/lib/site.mjs, or a line in site/pages/sitemap.xml.mjs)';
for (const u of indexable)
  if (!listed.has(u)) fail('sitemap.xml', `${u} is missing ${sitemapHint}`);
for (const u of listed) if (!indexable.has(u)) fail('sitemap.xml', `${u} is not an indexable page`);

for (const file of ['llms.txt', 'llms-full.txt']) {
  for (const m of siteFile(file).matchAll(/\bhttps:\/\/vinvoice\.org(\/[^\s)`>\]]*)/g)) {
    references++;
    const hit = resolveRef('index.html', m[1].replace(/[.,;:]+$/, ''));
    if (hit && !fileSet.has(hit.target)) fail(file, `${m[0]} does not exist`);
    else if (hit?.fragment && !idsOf.get(hit.target)?.has(hit.fragment)) {
      fail(file, `${m[0]}: no such id`);
    }
  }
}

// --- the rules on the validation page are the checker's rules --------------------------------
// The rule table is typed by hand in site/pages/validation.mjs; the reference checker
// (checker/vehicle_check.py) is the source of truth. When a rule is added or removed, edit both.
{
  const checker = fs.readFileSync(path.join(ROOT, 'checker/vehicle_check.py'), 'utf8');
  const raised = new Set(
    [...checker.matchAll(/F\('(?:error|warning|info)', '(V-\d\d)'/g)].map((m) => m[1])
  );
  const shown = new Set(
    [
      ...siteFile('validation/index.html').matchAll(/<th scope="row" class="nowrap">(V-\d\d)</g),
    ].map((m) => m[1])
  );
  for (const r of raised)
    if (!shown.has(r)) fail('validation/', `${r} is raised by the checker but not listed`);
  for (const r of shown)
    if (!raised.has(r)) fail('validation/', `${r} is listed but the checker never raises it`);
  const last = [...raised].sort().at(-1);
  if (!siteFile('llms.txt').includes(`rules V-01 to ${last}`))
    fail('llms.txt', `should say "rules V-01 to ${last}" (site/lib/llms.mjs)`);
}

if (temp) fs.rmSync(temp, { recursive: true, force: true });
if (problems.length) {
  console.error(problems.map((p) => `FAIL ${p}`).join('\n'));
  console.error(`\n${problems.length} problem(s) in ${pages.length} pages`);
  process.exit(1);
}
console.log(`ok: ${pages.length} pages, ${files.length} files, ${references} internal references`);
