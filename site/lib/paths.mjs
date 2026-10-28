// Where things are. Everything is resolved from the repository root, so the generator behaves the
// same whatever directory it is started from.
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(import.meta.dirname, '../..');
export const SITE_DIR = path.join(ROOT, 'site');
export const DIST = path.join(ROOT, 'dist');

/** Text file below the repository root, e.g. readText('generated/registry.csv'). */
export const readText = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
/** JSON file below the repository root. */
export const readJson = (file) => JSON.parse(readText(file));
