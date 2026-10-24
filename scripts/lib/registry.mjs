// Loads and checks the registry sources under registry/. Used by validate, generate and import.
//
//   registry/registry.yaml      release metadata, grammars, caps, tiers, refs, key order
//   registry/keys/<name>.yaml   one file per key (<name> = key without the root, e.g. de.hsn)
//   registry/token-lists.yaml   token lists, registry-owned and external
//   registry/reserved.yaml      reserved names (never usable keys)
//   registry/naming-rules.yaml  naming rules NR-xx and the policies on length, national keys, tokens
//   registry/crosswalk.yaml     informative crosswalk (CC BY 4.0)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import Ajv2020 from 'ajv/dist/2020.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Field order of a key file (readable first). */
export const SOURCE_ORDER = [
  'key',
  'tier',
  'status',
  'labelEn',
  'labelDe',
  'definition',
  'representationTerm',
  'valueFormat',
  'grammar',
  'unit',
  'tokens',
  'codeList',
  'conditionality',
  'statutory',
  'repeatable',
  'carrier',
  'anchors',
];
/** Field order of a key in generated/registry.json. */
export const JSON_ORDER = [
  'key',
  'tier',
  'status',
  'statutory',
  'repeatable',
  'unit',
  'representationTerm',
  'labelDe',
  'labelEn',
  'definition',
  'valueFormat',
  'grammar',
  'tokens',
  'codeList',
  'conditionality',
  'carrier',
  'anchors',
];
/** Top-level field order of generated/registry.json. */
export const META_ORDER = [
  'version',
  'date',
  'licence',
  'root',
  'markerKey',
  'markerGrammar',
  'keyGrammar',
  'keyGrammarAuthoring',
  'vendorKeyGrammar',
  'keyCap',
  'nameCap',
  'iriBase',
];
export const POLICY_FIELDS = ['nameLengthCap', 'nationalKeysPattern', 'tokenPolicy'];

export const CORE_CAP = 15; // neutrality charter: the core tier holds at most 15 keys
export const INVISIBLE = new RegExp(
  '[\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2064\\u2066-\\u206F\\uFEFF]',
  'g'
);

export const localName = (key, root) => key.slice(root.length + 1);
export const keyFile = (local) => path.join(ROOT, 'registry/keys', `${local}.yaml`);
const readYaml = (file) =>
  parse(fs.readFileSync(path.join(ROOT, file), 'utf8'), { prettyErrors: true });

export function loadSources() {
  const meta = readYaml('registry/registry.yaml');
  const files = fs
    .readdirSync(path.join(ROOT, 'registry/keys'))
    .filter((f) => f.endsWith('.yaml'))
    .sort();
  const byLocal = new Map(
    files.map((f) => [f.replace(/\.yaml$/, ''), readYaml(path.join('registry/keys', f))])
  );
  return {
    meta,
    byLocal,
    tokenLists: readYaml('registry/token-lists.yaml'),
    reserved: readYaml('registry/reserved.yaml'),
    naming: readYaml('registry/naming-rules.yaml'),
    crosswalk: readYaml('registry/crosswalk.yaml'),
  };
}

/** Checks the sources. Errors stop generation; warnings are reported and allowed. */
export function check({ meta, byLocal, tokenLists, reserved, naming, crosswalk }) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);

  for (const f of [...META_ORDER, 'tiers', 'refs', 'keys']) {
    if (meta[f] === undefined) err(`registry.yaml: missing ${f}`);
  }
  if (errors.length) return { errors, warnings };
  const { root } = meta;
  const keyRe = new RegExp(meta.keyGrammar, 'u');
  const authoringRe = new RegExp(meta.keyGrammarAuthoring, 'u');
  const vendorRe = new RegExp(meta.vendorKeyGrammar, 'u');

  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validateKey = ajv.compile(
    JSON.parse(fs.readFileSync(path.join(ROOT, 'schemas/key.schema.json'), 'utf8'))
  );

  const listed = new Set(meta.keys);
  if (listed.size !== meta.keys.length) err('registry.yaml: a key is listed twice');
  for (const local of meta.keys) {
    if (!byLocal.has(local)) {
      err(`registry.yaml lists ${local}, but registry/keys/${local}.yaml is missing`);
    }
  }
  for (const local of byLocal.keys()) {
    if (!listed.has(local)) err(`registry/keys/${local}.yaml is not listed in registry.yaml`);
  }

  const known = new Set();
  const reservedKeys = new Set(reserved.map((r) => r.key));
  for (const [local, k] of byLocal) {
    const where = `registry/keys/${local}.yaml`;
    if (!validateKey(k)) {
      for (const e of validateKey.errors) err(`${where}: ${e.instancePath || '/'} ${e.message}`);
      continue;
    }
    if (k.key !== `${root}.${local}`) err(`${where}: key must be ${root}.${local}`);
    if (!keyRe.test(k.key)) err(`${where}: key does not match keyGrammar`);
    if (!authoringRe.test(k.key)) err(`${where}: key does not match keyGrammarAuthoring`);
    if (k.key.length > meta.keyCap) err(`${where}: key longer than ${meta.keyCap} characters`);
    if (reservedKeys.has(k.key)) err(`${where}: ${k.key} is a reserved name`);
    if (!meta.tiers.includes(k.tier)) err(`${where}: unknown tier ${k.tier}`);
    let grammar;
    try {
      grammar = new RegExp(k.grammar, 'u');
    } catch (e) {
      err(`${where}: grammar does not compile: ${e.message}`);
    }
    for (const label of [k.labelDe, k.labelEn]) {
      const name = `${label} [${k.key}]`.normalize('NFC');
      if ([...name].length > meta.nameCap) {
        err(`${where}: row name "${name}" is longer than ${meta.nameCap} characters`);
      }
    }
    for (const tok of k.tokens) {
      if (grammar && !grammar.test(tok)) err(`${where}: token ${tok} does not match the grammar`);
    }
    for (const v of k.carrier.matchAll(/BT-161 (?:e\.g\. )?'([^']+)'/g)) {
      if (grammar && !v[1].includes('<') && !grammar.test(v[1])) {
        err(`${where}: carrier example '${v[1]}' does not match the grammar`);
      }
    }
    for (const f of SOURCE_ORDER.filter((x) => typeof k[x] === 'string' && x !== 'grammar')) {
      if (INVISIBLE.test(k[f])) err(`${where}: ${f} contains an invisible format character`);
      INVISIBLE.lastIndex = 0;
    }
    known.add(k.key);
  }

  // Every key mentioned in a key's text must exist or be reserved (catches stale names).
  const mention = new RegExp(`\\b${root}(?:\\.[a-z][A-Za-z0-9]*)+`, 'g');
  const isKnown = (m) => known.has(m) || reservedKeys.has(m);
  for (const [local, k] of byLocal) {
    for (const f of SOURCE_ORDER.filter((x) => typeof k[x] === 'string' && x !== 'key')) {
      for (const m of k[f].matchAll(mention)) {
        if (!isKnown(m[0])) err(`registry/keys/${local}.yaml: ${f} mentions unknown key ${m[0]}`);
      }
    }
  }
  for (const t of tokenLists) {
    for (const m of t.list.matchAll(mention)) {
      if (!isKnown(m[0])) err(`token-lists.yaml: list "${t.list}" mentions unknown key ${m[0]}`);
    }
  }
  for (const r of reserved) {
    if (!keyRe.test(r.key)) err(`reserved.yaml: ${r.key} does not match keyGrammar`);
  }
  if (!Array.isArray(naming.rules) || !naming.rules.every((r) => r.id && r.rule)) {
    err('naming-rules.yaml: rules must be a list of {id, rule, rationale, source}');
  }
  for (const f of POLICY_FIELDS) {
    if (typeof naming[f] !== 'string') err(`naming-rules.yaml: missing ${f}`);
  }
  for (const [ref, local] of Object.entries(meta.refs)) {
    if (!byLocal.has(local)) err(`registry.yaml: refs.${ref} points to unknown key ${local}`);
  }
  if (`${root}.${meta.refs.marker}` !== meta.markerKey) {
    err('registry.yaml: refs.marker must name the markerKey');
  }
  if (vendorRe.test(`${root}x`) || !vendorRe.test('com.example.stockNumber')) {
    err(
      'registry.yaml: vendorKeyGrammar must match reverse-DNS names such as com.example.stockNumber'
    );
  }
  for (const key of Object.keys(crosswalk.entries ?? {})) {
    if (!known.has(key)) err(`registry/crosswalk.yaml: entry for unknown key ${key}`);
  }

  const core = meta.keys.filter((l) => byLocal.get(l)?.tier === meta.tiers[0]).length;
  if (core > CORE_CAP) {
    err(`the ${meta.tiers[0]} tier has ${core} keys; the charter allows ${CORE_CAP}`);
  }
  return { errors, warnings };
}

export function loadChecked() {
  const sources = loadSources();
  const { errors, warnings } = check(sources);
  for (const w of warnings) console.warn('warning:', w);
  if (errors.length) {
    for (const e of errors) console.error('error:', e);
    process.exit(1);
  }
  return sources;
}
