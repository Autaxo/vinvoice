#!/usr/bin/env node
// Converts a registry release in JSON form (registry.json, crosswalk.csv, context.jsonld) into
// the YAML sources under registry/. Use it once per external release, for example when a
// naming review delivers a new registry.json; afterwards edit the YAML files directly.
//
// Usage: npm run import:json -- <dir with registry.json, crosswalk.csv, context.jsonld>
//
// On the way in:
//   - the old key prefix "veh." and marker "veh/" become "vehicle." and "vehicle/";
//   - invisible format characters in grammars are written as \uXXXX regex escapes;
//   - registry/registry.yaml keeps its refs and tiers; version, date, key order and the
//     JSON-LD namespace are taken from the release.
import fs from 'node:fs';
import path from 'node:path';
import { Document, Scalar, parse } from 'yaml';
import { parseCsv } from './lib/csv.mjs';
import { ROOT, FIELD_ORDER, keyFile, localName } from './lib/registry.mjs';

const src = process.argv[2];
if (!src) {
  console.error('usage: import-json.mjs <release dir>');
  process.exit(1);
}

const normalise = (text) =>
  text.replace(/(?<![\w/.:-])veh(?=[./])/g, 'vehicle').replace(/\bveh rows\b/g, 'vehicle rows');
// Invisible format characters (zero-width, bidi controls, BOM), built from a string so that the
// pattern itself stays visible in the source.
const INVISIBLE = new RegExp(
  '[\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2064\\u2066-\\u206F\\uFEFF]',
  'g'
);
const escapeInvisible = (s) =>
  s.replace(INVISIBLE, (c) => '\\u' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'));
const read = (f) => normalise(fs.readFileSync(path.join(src, f), 'utf8'));

const release = JSON.parse(read('registry.json'));
const metaPath = path.join(ROOT, 'registry/registry.yaml');
const meta = fs.existsSync(metaPath) ? parse(fs.readFileSync(metaPath, 'utf8')) : {};

// Key files
const keysDir = path.join(ROOT, 'registry/keys');
fs.mkdirSync(keysDir, { recursive: true });
for (const f of fs.readdirSync(keysDir)) fs.unlinkSync(path.join(keysDir, f));
const prefix = release.keys[0].key.slice(0, release.keys[0].key.indexOf('.') + 1);
for (const k of release.keys) {
  const ordered = Object.fromEntries(FIELD_ORDER.map((f) => [f, k[f] ?? null]));
  ordered.grammar = escapeInvisible(ordered.grammar);
  const doc = new Document(ordered);
  doc.commentBefore = ' SPDX-License-Identifier: CC0-1.0';
  doc.get('grammar', true).type = Scalar.QUOTE_SINGLE;
  const text = doc.toString({ lineWidth: 100, minContentWidth: 20 });
  const back = parse(text);
  for (const f of FIELD_ORDER) {
    if (JSON.stringify(back[f]) !== JSON.stringify(ordered[f])) {
      throw new Error(`YAML round trip changed ${k.key}.${f}`);
    }
  }
  fs.writeFileSync(keyFile(localName(k.key, prefix)), text);
}

// Crosswalk (separate licence, so a separate file)
const cw = parseCsv(read('crosswalk.csv'));
const vendor = ['autaxo'];
const col = cw[0].findIndex((h, i) => i > 0 && !vendor.includes(h.trim().toLowerCase()));
const cwDoc = new Document({
  note: cw[0][col].replace(/^crosswalk \((.*)\)$/, '$1'),
  entries: Object.fromEntries(
    cw
      .slice(1)
      .filter((r) => r[col])
      .map((r) => [r[0], r[col]])
  ),
});
cwDoc.commentBefore = ' SPDX-License-Identifier: CC-BY-4.0';
fs.writeFileSync(
  path.join(ROOT, 'registry/crosswalk.yaml'),
  cwDoc.toString({ lineWidth: 100, minContentWidth: 20 })
);

// Release metadata
const ctx = JSON.parse(read('context.jsonld'))['@context'];
const nsPrefix = Object.keys(ctx).find((k) => /^https?:\/\//.test(ctx[k]));
const next = {
  version: release.version,
  date: release.date,
  licence: release.licence,
  prefix,
  jsonld: { prefix: nsPrefix, namespace: ctx[nsPrefix] },
  tiers: meta.tiers ?? [...new Set(release.keys.map((k) => k.tier))],
  refs: meta.refs ?? {},
  keys: release.keys.map((k) => localName(k.key, prefix)),
};
const metaDoc = new Document(next);
metaDoc.commentBefore =
  ' VINvoice registry: release metadata and the order of keys.\n' +
  ' refs name the keys that the specification text and the tools refer to by role.\n' +
  ' SPDX-License-Identifier: CC0-1.0';
metaDoc.get('date', true).type = Scalar.QUOTE_SINGLE;
fs.writeFileSync(metaPath, metaDoc.toString({ lineWidth: 100 }));
console.log(`imported ${release.keys.length} keys from ${src}; now run npm run validate`);
