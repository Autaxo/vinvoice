// Files served under /downloads/: the contents of generated/, so the pages and the downloads are
// built from the same release and cannot disagree.
import { readText } from './paths.mjs';

/**
 * @typedef {object} Download
 * @property {string} file
 * @property {string} body
 * @property {number} bytes size of body in bytes
 * @property {string} type
 * @property {string} licence
 * @property {string} description
 */

/** @type {Omit<Download, 'bytes'>[]} */
const sources = [
  {
    file: 'registry.json',
    body: readText('generated/registry.json'),
    type: 'application/json',
    licence: 'CC0 1.0',
    description:
      'The key registry: every key with tier, labels, definition, value format, grammar, unit, code list, conditions, binding and anchors. The normative source.',
  },
  {
    file: 'registry.csv',
    body: readText('generated/registry.csv'),
    type: 'text/csv; charset=utf-8',
    licence: 'CC0 1.0',
    description:
      'The same registry as a flat table: key, tier, status, labels, grammar, code list.',
  },
  {
    file: 'context.jsonld',
    body: readText('generated/context.jsonld'),
    type: 'application/ld+json',
    licence: 'CC0 1.0',
    description: 'JSON-LD context that maps each local key name to an IRI.',
  },
  {
    file: 'vehicle-facts.schema.json',
    body: readText('generated/vehicle-facts.schema.json'),
    type: 'application/schema+json',
    licence: 'CC0 1.0',
    description:
      'JSON Schema for the facts of one vehicle line as a JSON object, for systems that store or exchange VINvoice data outside the invoice.',
  },
  {
    file: 'vinvoice.sch',
    body: readText('generated/vinvoice.sch'),
    type: 'application/xml',
    licence: 'Apache-2.0',
    description:
      'ISO Schematron rules (XSLT 2 binding) for CII and UBL invoices, the same checks as the reference checker, to run next to the EN 16931 validation.',
  },
  {
    file: 'crosswalk.csv',
    body: readText('generated/crosswalk.csv'),
    type: 'text/csv; charset=utf-8',
    licence: 'CC BY 4.0',
    description:
      'Informative mapping of each key to related vocabularies and message standards, such as schema.org and VDA 4938, with sources.',
  },
];

/** @type {Download[]} */
export const downloads = sources.map((d) => ({
  ...d,
  bytes: new TextEncoder().encode(d.body).length,
}));
