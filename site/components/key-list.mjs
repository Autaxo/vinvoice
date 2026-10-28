// Comma-separated list of registry keys, each linked to its term page.
import { linkKeys } from '../lib/registry.mjs';

/** @param {{ terms: import('../lib/registry.mjs').Term[] }} props */
export function KeyList({ terms }) {
  return linkKeys(terms.map((t) => t.key).join(', '));
}
