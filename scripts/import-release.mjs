#!/usr/bin/env node
// Imports a registry release produced outside this repository (for example by a naming review)
// into the YAML sources, the corpus and the reference checker. Afterwards the YAML files are the
// source: edit them directly and run npm run generate.
//
// Usage: npm run import:release -- <release dir>
//   <release dir>/out/registry.json    the release registry (single source of the release)
//   <release dir>/out/crosswalk.csv    informative crosswalk
//   <release dir>/corpus/*.xml         test invoices                         (optional)
//   <release dir>/reports/             validator reports and vehicle_check.json (optional)
//   <release dir>/vehicle_check.py     reference checker                     (optional)
//
// On the way in: grammars get \uXXXX escapes instead of invisible format characters; vendor
// columns are dropped from the crosswalk; registry/registry.yaml keeps its tiers and refs.
import fs from 'node:fs';
import path from 'node:path';
import { Document, Scalar, parse } from 'yaml';
import { parseCsv } from './lib/csv.mjs';
import {
  ROOT,
  SOURCE_ORDER,
  META_ORDER,
  POLICY_FIELDS,
  INVISIBLE,
  keyFile,
  localName,
} from './lib/registry.mjs';

const src = process.argv[2];
if (!src) {
  console.error('usage: import-release.mjs <release dir>');
  process.exit(1);
}
const at = (...p) => path.join(src, ...p);
const escapeInvisible = (s) =>
  s.replace(INVISIBLE, (c) => '\\u' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'));
const write = (file, text) => {
  fs.mkdirSync(path.dirname(path.join(ROOT, file)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, file), text);
  console.log('  ' + file);
};
const yamlDoc = (value, comment, quoted = []) => {
  const doc = new Document(value);
  doc.commentBefore = comment;
  for (const p of quoted) {
    const node = doc.getIn(p, true);
    if (node) node.type = Scalar.QUOTE_SINGLE;
  }
  const text = doc.toString({ lineWidth: 100, minContentWidth: 20 });
  if (JSON.stringify(parse(text)) !== JSON.stringify(value)) {
    throw new Error(`YAML round trip changed: ${comment}`);
  }
  return text;
};
const CC0 = ' SPDX-License-Identifier: CC0-1.0';

const release = JSON.parse(fs.readFileSync(at('out/registry.json'), 'utf8'));
const metaPath = path.join(ROOT, 'registry/registry.yaml');
const old = fs.existsSync(metaPath) ? parse(fs.readFileSync(metaPath, 'utf8')) : {};
console.log(`import ${src}`);

// Keys
const keysDir = path.join(ROOT, 'registry/keys');
fs.mkdirSync(keysDir, { recursive: true });
for (const f of fs.readdirSync(keysDir)) fs.unlinkSync(path.join(keysDir, f));
for (const k of release.keys) {
  const value = Object.fromEntries(SOURCE_ORDER.map((f) => [f, k[f] ?? null]));
  value.grammar = escapeInvisible(value.grammar);
  const local = localName(k.key, release.root);
  fs.writeFileSync(keyFile(local), yamlDoc(value, CC0, [['grammar']]));
}
console.log(`  registry/keys/ (${release.keys.length} files)`);

// Metadata, token lists, reserved names, naming rules
const meta = Object.fromEntries(META_ORDER.map((f) => [f, release[f]]));
for (const f of ['markerGrammar', 'keyGrammar', 'keyGrammarAuthoring', 'vendorKeyGrammar']) {
  meta[f] = escapeInvisible(meta[f]);
}
meta.tiers = old.tiers ?? Object.keys(release.counts);
meta.refs = old.refs ?? {};
meta.keys = release.keys.map((k) => localName(k.key, release.root));
write(
  'registry/registry.yaml',
  yamlDoc(
    meta,
    ' VINvoice registry: release metadata, grammars, caps, tiers and the order of keys.\n' +
      ' refs name the keys that the specification text and the tools refer to by role.\n' +
      CC0,
    [['date'], ['markerGrammar'], ['keyGrammar'], ['keyGrammarAuthoring'], ['vendorKeyGrammar']]
  )
);
write('registry/token-lists.yaml', yamlDoc(release.tokenLists, CC0));
// Reserved names are published without the history of earlier draft names.
write(
  'registry/reserved.yaml',
  yamlDoc(
    release.reserved.map(({ was: _was, ...r }) => r),
    CC0
  )
);
write(
  'registry/naming-rules.yaml',
  yamlDoc(
    {
      rules: release.namingRules,
      ...Object.fromEntries(POLICY_FIELDS.map((f) => [f, release[f]])),
    },
    CC0
  )
);

// Crosswalk (separate licence, so a separate file)
const cw = parseCsv(fs.readFileSync(at('out/crosswalk.csv'), 'utf8'));
const vendorColumns = ['autaxo'];
const col = cw[0].findIndex((h, i) => i > 0 && !vendorColumns.includes(h.trim().toLowerCase()));
write(
  'registry/crosswalk.yaml',
  yamlDoc(
    {
      note: cw[0][col].replace(/^crosswalk \((.*)\)$/, '$1'),
      entries: Object.fromEntries(
        cw
          .slice(1)
          .filter((r) => r[col])
          .map((r) => [r[0], r[col]])
      ),
    },
    ' SPDX-License-Identifier: CC-BY-4.0'
  )
);

// Corpus, evidence and checker
if (fs.existsSync(at('corpus'))) {
  const corpusDir = path.join(ROOT, 'corpus');
  for (const f of fs.readdirSync(corpusDir).filter((f) => f.endsWith('.xml'))) {
    fs.unlinkSync(path.join(corpusDir, f));
  }
  const files = fs
    .readdirSync(at('corpus'))
    .filter((f) => f.endsWith('.xml'))
    .sort();
  for (const f of files) fs.copyFileSync(at('corpus', f), path.join(corpusDir, f));
  console.log(`  corpus/ (${files.length} invoices)`);

  if (fs.existsSync(at('reports'))) {
    write('corpus/validation.json', JSON.stringify(summariseReports(files), null, 2) + '\n');
    const report = at('reports/vehicle_check.json');
    if (fs.existsSync(report)) {
      const all = JSON.parse(fs.readFileSync(report, 'utf8'));
      const expected = Object.fromEntries(files.filter((f) => all[f]).map((f) => [f, all[f]]));
      write('corpus/checker-expected.json', JSON.stringify(expected, null, 1) + '\n');
    }
  }
}
if (fs.existsSync(at('vehicle_check.py'))) {
  fs.copyFileSync(at('vehicle_check.py'), path.join(ROOT, 'checker/vehicle_check.py'));
  console.log('  checker/vehicle_check.py');
}
console.log('done; now update refs in registry/registry.yaml if needed and run npm run validate');

// Validation evidence. Each validator says which corpus files it was run on and where its result
// lives. An XSD run writes one text file per batch; an empty file means no schema error.
function summariseReports(files) {
  const reports = at('reports');
  const isFx = (f) => f.endsWith('.fx.cii.xml');
  const validators = [
    {
      id: 'xsd-fx',
      name: 'Factur-X 1.09.2 EN 16931 XSD',
      kind: 'xsd',
      batch: () => 'xsd-fx.txt',
      runs: (f) => isFx(f) || f.endsWith('.xr.cii.xml'),
    },
    {
      id: 'xsd-d16b',
      name: 'UN/CEFACT CII D16B XSD',
      kind: 'xsd',
      batch: () => 'xsd-d16b.txt',
      runs: (f) => f.endsWith('.cii.xml'),
    },
    {
      id: 'xsd-ext',
      name: 'Factur-X 1.09.2 EXTENDED XSD',
      kind: 'xsd',
      batch: () => 'xsd-ext.txt',
      runs: (f) => f.endsWith('.ext.cii.xml'),
    },
    {
      id: 'xsd-ubl',
      name: 'UBL 2.1 Invoice / CreditNote XSD',
      kind: 'xsd',
      batch: (f) => (f.startsWith('credit') ? 'xsd-ublcn.txt' : 'xsd-ubl.txt'),
      runs: (f) => f.endsWith('.ubl.xml'),
    },
    { id: 'cen', name: 'CEN EN 16931 validation 1.3.17', kind: 'svrl', suffix: 'cen' },
    { id: 'fx', name: 'Factur-X 1.09.2 EN 16931 schematron', kind: 'svrl', suffix: 'fx' },
    { id: 'fxext', name: 'Factur-X 1.09.2 EXTENDED schematron', kind: 'svrl', suffix: 'fxext' },
    { id: 'xr', name: 'KoSIT XRechnung 3.0.2 schematron 2.6.0', kind: 'svrl', suffix: 'xr' },
    { id: 'peppol', name: 'Peppol BIS Billing 3.0.20', kind: 'svrl', suffix: 'peppol' },
  ];
  const count = (text, tag) => (text.match(new RegExp(`<svrl:${tag}[\\s>]`, 'g')) || []).length;
  const out = {};
  for (const f of files) {
    const base = f.replace(/\.xml$/, '');
    const results = {};
    for (const v of validators) {
      if (v.kind === 'xsd') {
        const batch = path.join(reports, v.batch(f));
        if (!v.runs(f) || !fs.existsSync(batch)) continue;
        const log = fs.readFileSync(batch, 'utf8');
        results[v.id] = { errors: log.split('\n').filter((l) => l.includes(f)).length };
      } else {
        const svrl = path.join(reports, `${base}.${v.suffix}.svrl`);
        if (!fs.existsSync(svrl)) continue;
        const text = fs.readFileSync(svrl, 'utf8');
        results[v.id] = {
          firedRules: count(text, 'fired-rule'),
          failedAsserts: count(text, 'failed-assert'),
          reports: count(text, 'successful-report'),
        };
      }
    }
    out[f] = results;
  }
  return {
    source: path.basename(path.resolve(src)),
    validators: validators.map(({ id, name, kind }) => ({ id, name, kind })),
    files: out,
  };
}
