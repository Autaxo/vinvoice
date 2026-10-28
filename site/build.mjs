#!/usr/bin/env node
// The site generator: renders every page module in site/pages and writes dist/.
//
//   node site/build.mjs [outDir]
//
// A page module is one file below site/pages and exports
//   render({ path, props })          the page: html`` for a page, a string for a file
// Every .mjs file below site/pages is a route, so shared helpers belong in site/lib or
// site/components, never in site/pages.
//   paths()                          required for dynamic routes ([name] in the file name): a list
//                                    of { params, props }, one entry per output; params fills the
//                                    [name] parts of the file name, props is passed to render()
//   kind = 'file'                    only for files that are not HTML pages (llms.txt, sitemap.xml,
//                                    downloads, examples)
// Routes follow the file names: pages/specification.mjs is /specification/ and is written to
// specification/index.html; pages/index.mjs is /; pages/404.mjs is 404.html; a module with
// kind = 'file' is written to the path of its name (pages/llms.txt.mjs is llms.txt).
// The build never follows symbolic links (site/pages, site/public) and refuses an output
// directory that holds the repository.
// Next to the pages the build copies site/public/ as it is and the stylesheet to /site.css.
// Registry and corpus data are read from generated/ and corpus/; run `npm run generate` first
// (the `build` script does).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { DIST, ROOT, SITE_DIR } from './lib/paths.mjs';
import { isHtml, toHtmlString } from './lib/html.mjs';
import { STYLESHEET } from './layouts/base.mjs';

const PAGES_DIR = path.join(SITE_DIR, 'pages');

/**
 * All files below dir (absolute paths), in a fixed order. A symbolic link is an error: following
 * one would copy files from outside the repository into the published site.
 * @param {string} dir
 * @returns {string[]}
 */
function filesBelow(dir) {
  /** @type {string[]} */
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink())
      throw new Error(
        `[build] ${path.relative(ROOT, full)} is a symbolic link; links are not followed`
      );
    if (entry.isDirectory()) found.push(...filesBelow(full));
    else if (entry.isFile()) found.push(full);
  }
  return found.sort();
}

/** All page modules below site/pages, as paths relative to it, in a fixed order. */
const pageModules = () =>
  filesBelow(PAGES_DIR)
    .filter((f) => f.endsWith('.mjs'))
    .map((f) => path.relative(PAGES_DIR, f));

/**
 * Refuse an output directory that the build must not empty: the repository, anything that holds
 * it, the home directory, or a directory inside the repository other than dist.
 * @param {string} outDir absolute path
 */
function assertSafeOutDir(outDir) {
  const holdsRoot = !path.relative(outDir, ROOT).startsWith('..');
  const insideRoot = !path.relative(ROOT, outDir).startsWith('..');
  if (outDir === DIST) return;
  if (
    holdsRoot ||
    insideRoot ||
    outDir === path.resolve(os.homedir()) ||
    outDir === path.parse(outDir).root
  )
    throw new Error(`[build] refusing to empty ${outDir}: not a build output directory`);
}

/**
 * What a page module's render() is given.
 * @typedef {object} PageContext
 * @property {string} path URL path of the page, e.g. "/vocabulary/make/"
 * @property {any} props whatever paths() returned for this output
 */

/**
 * Where an output goes: the file in dist and the URL path pages see as their own.
 * For a page, "index" and a trailing "/index" mean the directory itself, and every page is a
 * directory with an index.html:
 *   index -> index.html, /               examples/index -> examples/index.html, /examples/
 *   vocabulary/make -> vocabulary/make/index.html, /vocabulary/make/
 * @param {string} route module path without ".mjs", parameters filled in: "vocabulary/make"
 * @param {boolean} isFile
 */
function target(route, isFile) {
  if (isFile) return { file: route, urlPath: '/' + route };
  if (route === '404') return { file: '404.html', urlPath: '/404/' };
  const dir = route === 'index' ? '' : route.replace(/(^|\/)index$/, '$1').replace(/\/?$/, '/');
  return { file: dir + 'index.html', urlPath: '/' + dir };
}

/**
 * Build the site into outDir (emptied first).
 * @param {string} [outDir]
 * @returns {Promise<{ pages: number, files: number }>}
 */
export async function build(outDir = DIST) {
  outDir = path.resolve(outDir);
  assertSafeOutDir(outDir);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  /** @type {Map<string, string>} output file -> source, to catch two sources writing one file */
  const written = new Map();
  /** @param {string} file @param {string | Buffer} content @param {string} source */
  const write = (file, content, source) => {
    const clash = written.get(file);
    if (clash) throw new Error(`[build] ${file} is written by both ${clash} and ${source}`);
    written.set(file, source);
    const dest = path.join(outDir, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
  };

  // Static files first, so that a page cannot silently overwrite one of them.
  const publicDir = path.join(SITE_DIR, 'public');
  for (const full of filesBelow(publicDir)) {
    const rel = path.relative(publicDir, full).split(path.sep).join('/');
    write(rel, fs.readFileSync(full), `site/public/${rel}`);
  }
  write(
    STYLESHEET.slice(1),
    fs.readFileSync(path.join(SITE_DIR, 'styles/site.css')),
    'site/styles/site.css'
  );

  let pages = 0;
  for (const rel of pageModules()) {
    const mod = await import(pathToFileURL(path.join(PAGES_DIR, rel)).href);
    if (typeof mod.render !== 'function')
      throw new Error(`[build] site/pages/${rel} must export a function render()`);
    const isFile = mod.kind === 'file';
    const stem = rel.slice(0, -'.mjs'.length).split(path.sep).join('/');
    const dynamic = /\[\w+\]/.test(stem);
    if (dynamic && typeof mod.paths !== 'function')
      throw new Error(
        `[build] site/pages/${rel} has a [name] in its file name and must export paths()`
      );
    const entries = mod.paths ? mod.paths() : [{ params: {}, props: {} }];
    for (const { params, props } of entries) {
      const route = stem.replace(/\[(\w+)\]/g, (_, name) => {
        const value = params[name];
        if (typeof value !== 'string' || !/^[\w][\w.-]*$/.test(value))
          throw new Error(`[build] ${rel}: bad ${name} "${value}"`);
        return value;
      });
      const { file, urlPath } = target(route, isFile);
      const out = mod.render({ path: urlPath, props });
      if (isFile ? typeof out !== 'string' : !isHtml(out))
        throw new Error(
          `[build] site/pages/${rel}: render() must return ${isFile ? 'a string' : 'html``'}`
        );
      write(file, isFile ? out : toHtmlString(out), `site/pages/${rel}`);
      if (!isFile) pages++;
    }
  }
  return { pages, files: written.size };
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  const outDir = process.argv[2] ? path.resolve(process.argv[2]) : DIST;
  const { pages, files } = await build(outDir);
  console.log(
    `built ${pages} pages, ${files} files into ${path.relative(process.cwd(), outDir) || '.'}`
  );
}
