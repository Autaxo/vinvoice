#!/usr/bin/env node
// Checks generated/ against the published JSON Schemas:
//   - generated/registry.json against schemas/registry.schema.json;
//   - the facts of every vehicle line in the conforming corpus files (as read by the reference
//     checker) against generated/vehicle-facts.schema.json.
import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { ROOT } from './lib/registry.mjs';

const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addSchema(read('schemas/key.schema.json'));
let failed = 0;
const report = (what, validate) => {
  if (validate.errors?.length) {
    failed++;
    for (const e of validate.errors)
      console.error(`${what}: ${e.instancePath || '/'} ${e.message}`);
  }
};

const registrySchema = ajv.compile(read('schemas/registry.schema.json'));
registrySchema(read('generated/registry.json'));
report('generated/registry.json', registrySchema);

const facts = ajv.compile(read('generated/vehicle-facts.schema.json'));
const expected = read('corpus/checker-expected.json');
let lines = 0;
for (const file of fs.readdirSync(path.join(ROOT, 'corpus')).filter((f) => f.endsWith('.xml'))) {
  if (file.startsWith('neg')) continue;
  for (const v of expected[file]?.vehicles ?? []) {
    lines++;
    facts(v.facts);
    report(`${file} line ${v.line}`, facts);
  }
}
if (failed) process.exit(1);
console.log(
  `registry.json matches its schema; ${lines} vehicle lines match vehicle-facts.schema.json`
);
