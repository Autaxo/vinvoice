// Loads and checks the registry sources under registry/. Used by validate, generate and import.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import Ajv2020 from 'ajv/dist/2020.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const FIELD_ORDER = [
  'key',
  'tier',
  'status',
  'labelEn',
  'labelDe',
  'definition',
  'valueFormat',
  'grammar',
  'unit',
  'codeList',
  'conditionality',
  'statutory',
  'repeatable',
  'signOff',
  'carrier',
  'anchors',
];

export const CORE_CAP = 15; // neutrality charter: the core tier holds at most 15 keys
export const NAME_MAX = 64; // specification: a BT-160 name is at most 64 characters

export const localName = (key, prefix) => key.slice(prefix.length);
export const keyFile = (local) => path.join(ROOT, 'registry/keys', `${local}.yaml`);
const readYaml = (file) => parse(fs.readFileSync(file, 'utf8'), { prettyErrors: true });

export function loadSources() {
  const meta = readYaml(path.join(ROOT, 'registry/registry.yaml'));
  const files = fs
    .readdirSync(path.join(ROOT, 'registry/keys'))
    .filter((f) => f.endsWith('.yaml'))
    .sort();
  const byLocal = new Map(
    files.map((f) => [f.replace(/\.yaml$/, ''), readYaml(path.join(ROOT, 'registry/keys', f))])
  );
  const crosswalk = readYaml(path.join(ROOT, 'registry/crosswalk.yaml'));
  return { meta, byLocal, crosswalk };
}

/** Checks the sources. Errors stop generation; warnings are reported and allowed. */
export function check({ meta, byLocal, crosswalk }) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);

  for (const f of ['version', 'date', 'licence', 'prefix', 'jsonld', 'tiers', 'refs', 'keys']) {
    if (meta[f] === undefined) err(`registry.yaml: missing ${f}`);
  }
  if (errors.length) return { errors, warnings };
  const { prefix } = meta;
  if (!/^[a-z]+\.$/.test(prefix)) err(`registry.yaml: prefix must look like "vehicle."`);

  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validateKey = ajv.compile(
    JSON.parse(fs.readFileSync(path.join(ROOT, 'schemas/key.schema.json'), 'utf8'))
  );

  const listed = new Set(meta.keys);
  if (listed.size !== meta.keys.length) err('registry.yaml: a key is listed twice');
  for (const local of meta.keys) {
    if (!byLocal.has(local))
      err(`registry.yaml lists ${local}, but registry/keys/${local}.yaml is missing`);
  }
  for (const local of byLocal.keys()) {
    if (!listed.has(local)) err(`registry/keys/${local}.yaml is not listed in registry.yaml`);
  }

  const known = new Set();
  for (const [local, k] of byLocal) {
    const where = `registry/keys/${local}.yaml`;
    if (!validateKey(k)) {
      for (const e of validateKey.errors) err(`${where}: ${e.instancePath || '/'} ${e.message}`);
      continue;
    }
    if (k.key !== prefix + local) err(`${where}: key must be ${prefix + local}`);
    if (!meta.tiers.includes(k.tier)) err(`${where}: unknown tier ${k.tier}`);
    try {
      new RegExp(k.grammar, 'u');
    } catch (e) {
      err(`${where}: grammar does not compile: ${e.message}`);
    }
    for (const label of [k.labelDe, k.labelEn]) {
      const name = `${label} [${k.key}]`;
      if (name.length > NAME_MAX) {
        warnings.push(
          `${where}: row name "${name}" has ${name.length} characters (max ${NAME_MAX})`
        );
      }
    }
    for (const v of k.carrier.matchAll(/BT-161 (?:e\.g\. )?'([^']+)'/g)) {
      if (!v[1].includes('<') && !new RegExp(k.grammar, 'u').test(v[1])) {
        err(`${where}: carrier example '${v[1]}' does not match the grammar`);
      }
    }
    known.add(k.key);
  }

  // Every key mentioned in any text must exist (catches stale names after a rename).
  const mention = new RegExp(`${prefix.replace('.', '\\.')}[a-z][A-Za-z0-9]*`, 'g');
  for (const [local, k] of byLocal) {
    for (const f of FIELD_ORDER.filter((x) => typeof k[x] === 'string' && x !== 'key')) {
      for (const m of k[f].matchAll(mention)) {
        if (!known.has(m[0]) && !m[0].startsWith(prefix + 'x')) {
          err(`registry/keys/${local}.yaml: ${f} mentions unknown key ${m[0]}`);
        }
      }
    }
  }

  for (const [ref, local] of Object.entries(meta.refs)) {
    if (!byLocal.has(local)) err(`registry.yaml: refs.${ref} points to unknown key ${local}`);
  }
  for (const key of Object.keys(crosswalk.entries ?? {})) {
    if (!known.has(key)) err(`registry/crosswalk.yaml: entry for unknown key ${key}`);
  }

  const core = meta.keys.filter((l) => byLocal.get(l)?.tier === meta.tiers[0]).length;
  if (core > CORE_CAP)
    err(`the ${meta.tiers[0]} tier has ${core} keys; the charter allows ${CORE_CAP}`);

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
