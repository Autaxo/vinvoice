#!/usr/bin/env node
// Builds generated/ from registry/: the files that are published and that the site, the checker
// and implementers read. Output is deterministic; CI fails if generated/ is not up to date.
import fs from 'node:fs';
import path from 'node:path';
import { loadChecked, ROOT, FIELD_ORDER } from './lib/registry.mjs';
import { toCsv } from './lib/csv.mjs';
import { schematron } from './lib/schematron.mjs';

const { meta, byLocal, crosswalk } = loadChecked();
const out = path.join(ROOT, 'generated');
fs.mkdirSync(out, { recursive: true });
const write = (file, text) => {
  fs.writeFileSync(path.join(out, file), text);
  console.log('  generated/' + file);
};
const json = (x) => JSON.stringify(x, null, 2) + '\n';

const keys = meta.keys.map((local) =>
  Object.fromEntries(FIELD_ORDER.map((f) => [f, byLocal.get(local)[f]]))
);
const refs = Object.fromEntries(
  Object.entries(meta.refs).map(([role, local]) => [role, meta.prefix + local])
);
const counts = Object.fromEntries(
  meta.tiers.map((t) => [t, keys.filter((k) => k.tier === t).length])
);

write(
  'registry.json',
  json({
    version: meta.version,
    date: meta.date,
    licence: meta.licence,
    prefix: meta.prefix,
    counts,
    refs,
    keys,
  })
);

const csvCols = [
  'key',
  'tier',
  'status',
  'statutory',
  'unit',
  'labelDe',
  'labelEn',
  'grammar',
  'codeList',
];
write('registry.csv', toCsv([csvCols, ...keys.map((k) => csvCols.map((c) => k[c]))]));

write(
  'context.jsonld',
  json({
    '@context': {
      [meta.jsonld.prefix]: meta.jsonld.namespace,
      ...Object.fromEntries(
        keys.map((k) => {
          const local = k.key.slice(meta.prefix.length);
          return [local, `${meta.jsonld.prefix}:${local}`];
        })
      ),
    },
  })
);

write(
  'crosswalk.csv',
  toCsv([
    ['key', `crosswalk (${crosswalk.note})`],
    ...keys.map((k) => [k.key, crosswalk.entries?.[k.key] ?? '']),
  ])
);

// JSON Schema for the facts of one vehicle line as a JSON object, for systems that store or
// exchange VINvoice data outside the invoice. Unknown keys stay allowed: readers ignore them.
const property = (k) => {
  const one = { type: 'string', pattern: k.grammar };
  return {
    title: `${k.labelEn} (${k.labelDe})`,
    description: k.definition,
    ...(k.repeatable ? { type: 'array', items: one, minItems: 1 } : one),
    ...(k.status === 'deprecated' ? { deprecated: true } : {}),
  };
};
write(
  'vehicle-facts.schema.json',
  json({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://vinvoice.org/downloads/vehicle-facts.schema.json',
    title: `VINvoice vehicle facts (${meta.version})`,
    description:
      'The VINvoice facts of one vehicle line as a JSON object, keyed by full key. Value grammars are the registry grammars. Unknown keys are allowed, because readers ignore keys they do not know. Generated from the registry; licence CC0-1.0.',
    type: 'object',
    required: [refs.marker, refs.role],
    properties: Object.fromEntries(keys.map((k) => [k.key, property(k)])),
    patternProperties: {
      [`^${meta.prefix.replace('.', '\\.')}x\\.`]: {
        description: 'Vendor key, ignored by readers.',
      },
    },
  })
);

write('vinvoice.sch', schematron({ meta, keys, refs }));
