#!/usr/bin/env node
// A small static file server for dist/, for `npm run dev` and `npm run preview`. It behaves like
// GitHub Pages: /dir/ serves /dir/index.html, /dir redirects to /dir/, and a miss answers 404 with
// the site's 404.html. Never use it in production; it sends no caching headers on purpose.
//
//   node site/serve.mjs [--build] [--port 4321] [--host 127.0.0.1] [--dir dist]
//
// With --build the site is built first. `npm run dev` runs this under `node --watch-path`, which
// restarts the process (and so rebuilds) whenever site/, generated/ or corpus/ change.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIST } from './lib/paths.mjs';
import { build } from './build.mjs';

/** @type {Record<string, string>} */
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jsonld': 'application/ld+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.sch': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const { values: opts } = parseArgs({
  options: {
    build: { type: 'boolean', default: false },
    port: { type: 'string', default: process.env.PORT ?? '4321' },
    host: { type: 'string', default: '127.0.0.1' },
    dir: { type: 'string', default: DIST },
  },
});
const root = path.resolve(opts.dir);

if (opts.build) {
  const { pages, files } = await build(root);
  console.log(`built ${pages} pages, ${files} files`);
}
if (!fs.existsSync(root)) {
  console.error(`${root} does not exist. Run "npm run build" first.`);
  process.exit(1);
}

/** @param {string} p */
const isFile = (p) => fs.statSync(p, { throwIfNoEntry: false })?.isFile() ?? false;
/** @param {string} p */
const isDir = (p) => fs.statSync(p, { throwIfNoEntry: false })?.isDirectory() ?? false;

/**
 * Map a URL path to a file below root. Returns the file, a redirect target or null.
 * @param {string} pathname
 * @returns {{ file: string } | { redirect: string } | null}
 */
function resolve(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const target = path.join(root, decoded);
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  if (decoded.endsWith('/')) {
    const index = path.join(target, 'index.html');
    return isFile(index) ? { file: index } : null;
  }
  if (isFile(target)) return { file: target };
  if (isDir(target)) return { redirect: pathname + '/' };
  return null;
}

const server = http.createServer((req, res) => {
  const method = req.method ?? 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const url = new URL(req.url ?? '/', 'http://localhost');
  const hit = resolve(url.pathname);
  /** @type {string} */
  let file;
  let status = 200;
  if (hit && 'redirect' in hit) {
    res.writeHead(301, { Location: hit.redirect + url.search }).end();
    return;
  } else if (hit) {
    file = hit.file;
  } else {
    file = path.join(root, '404.html');
    status = 404;
    if (!isFile(file)) {
      res.writeHead(404, { 'Content-Type': TYPES['.txt'] }).end('Not found\n');
      return;
    }
  }
  const body = fs.readFileSync(file);
  res.writeHead(status, {
    'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
  });
  res.end(method === 'HEAD' ? undefined : body);
  console.log(`${status} ${method} ${url.pathname}`);
});

server.on('error', (err) => {
  console.error(
    /** @type {NodeJS.ErrnoException} */ (err).code === 'EADDRINUSE'
      ? `Port ${opts.port} is in use. Pick another with --port or PORT=...`
      : err
  );
  process.exit(1);
});
server.listen(Number(opts.port), opts.host, () => {
  console.log(
    `serving ${path.relative(process.cwd(), root) || '.'} at http://${opts.host}:${opts.port}/`
  );
});
