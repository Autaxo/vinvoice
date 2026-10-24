#!/usr/bin/env node
// Checks registry/ against schemas/key.schema.json and the cross-file rules in lib/registry.mjs.
import { loadChecked } from './lib/registry.mjs';

const { meta } = loadChecked();
console.log(`registry ${meta.version}: ${meta.keys.length} keys valid`);
