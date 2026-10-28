// Test corpus (corpus/*.xml) and the evidence produced for it. Examples on the site are cut out of
// these files at build time, so they always match the downloadable invoices.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJson } from './paths.mjs';
import { findTerm, termUrl } from './registry.mjs';

const examples = readJson('corpus/index.json');
const validationJson = readJson('corpus/validation.json');
const checkerJson = readJson('corpus/checker-expected.json');

/**
 * @typedef {object} CorpusFile
 * @property {string} name
 * @property {string} xml
 * @property {number} bytes
 * @property {'CII' | 'UBL'} syntax
 * @property {string} carrier
 * @property {string} scenario
 * @property {string} description
 * @property {boolean} negative
 */

/** @type {Record<string, string>} */
const carriers = examples.carriers;
/** @type {Record<string, string>} */
const scenarios = examples.scenarios;

const corpusDir = path.join(ROOT, 'corpus');

/**
 * The corpus files are published unchanged as /examples/<name>.xml, and a browser that opens one
 * renders it as XML on the site's origin, without the CSP the HTML pages carry. A file that brings
 * XHTML or SVG elements (which can run script) or a stylesheet instruction is therefore refused.
 * @param {string} name
 * @param {string} xml
 */
function assertPassive(name, xml) {
  const active = [
    [/http:\/\/www\.w3\.org\/1999\/xhtml/i, 'the XHTML namespace'],
    [/http:\/\/www\.w3\.org\/2000\/svg/i, 'the SVG namespace'],
    [/<\?\s*xml-stylesheet/i, 'an xml-stylesheet instruction'],
    [/<!DOCTYPE/i, 'a DOCTYPE'],
  ];
  for (const [re, what] of active)
    if (re.test(xml))
      throw new Error(`[corpus] corpus/${name} uses ${what}; test invoices must not`);
}

/** @type {CorpusFile[]} */
export const corpus = fs
  .readdirSync(corpusDir, { withFileTypes: true })
  // Plain files only: a symlink must not pull a file from outside the repository into the site.
  .filter((e) => e.isFile() && e.name.endsWith('.xml'))
  .map((e) => e.name)
  .map((name) => {
    const xml = fs.readFileSync(path.join(corpusDir, name), 'utf8');
    assertPassive(name, xml);
    const parts = name.replace(/\.xml$/, '').split('.');
    const syntax = parts.at(-1) === 'ubl' ? 'UBL' : 'CII';
    const carrierId = parts.length > 2 ? /** @type {string} */ (parts.at(-2)) : '';
    const scenario = parts[0];
    return {
      name,
      xml,
      bytes: new TextEncoder().encode(xml).length,
      syntax,
      carrier: carriers[carrierId] ?? carrierId,
      scenario,
      description: scenarios[scenario] ?? scenario.replace(/-/g, ' '),
      negative: scenario.startsWith('neg'),
    };
  })
  .sort((a, b) => Number(a.negative) - Number(b.negative) || a.name.localeCompare(b.name));

/** @param {string} name */
const corpusFile = (name) => corpus.find((f) => f.name === name);
export const featured = {
  cii: /** @type {CorpusFile} */ (
    corpusFile(examples.featured.cii) ?? corpus.find((f) => f.syntax === 'CII')
  ),
  ubl: /** @type {CorpusFile} */ (
    corpusFile(examples.featured.ubl) ?? corpus.find((f) => f.syntax === 'UBL')
  ),
};

/** @param {string} s */
const decode = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

/**
 * @param {string} xml
 * @param {string} open
 * @param {string} close
 */
function between(xml, open, close) {
  const start = xml.indexOf(open);
  if (start < 0) return null;
  const end = xml.indexOf(close, start);
  return end < 0 ? null : xml.slice(start, end + close.length);
}

/**
 * First invoice line of a file, as written (indentation removed).
 * @param {CorpusFile} f
 */
export function firstLine(f) {
  const block =
    f.syntax === 'CII'
      ? between(
          f.xml,
          '<ram:IncludedSupplyChainTradeLineItem>',
          '</ram:IncludedSupplyChainTradeLineItem>'
        )
      : (between(f.xml, '<cac:InvoiceLine>', '</cac:InvoiceLine>') ??
        between(f.xml, '<cac:CreditNoteLine>', '</cac:CreditNoteLine>'));
  if (!block) return '';
  const lineStart = f.xml.lastIndexOf('\n', f.xml.indexOf(block)) + 1;
  const indent = f.xml.slice(lineStart, f.xml.indexOf(block)).length;
  return block
    .split('\n')
    .map((l, i) => (i === 0 ? l : l.slice(Math.min(indent, l.length - l.trimStart().length))))
    .join('\n');
}

/**
 * @typedef {object} Row
 * @property {string} name
 * @property {string} value
 * @property {string | null} key
 * @property {string | null} href
 */

/**
 * BG-32 rows (BT-160 name, BT-161 value) of the first invoice line.
 * @param {CorpusFile} f
 * @returns {Row[]}
 */
export function rows(f) {
  const line = firstLine(f);
  const [item, nameTag, valueTag] =
    f.syntax === 'CII'
      ? ['ram:ApplicableProductCharacteristic', 'ram:Description', 'ram:Value']
      : ['cac:AdditionalItemProperty', 'cbc:Name', 'cbc:Value'];
  /** @type {Row[]} */
  const out = [];
  const re = new RegExp(`<${item}>([\\s\\S]*?)</${item}>`, 'g');
  for (const m of line.matchAll(re)) {
    const name = decode(m[1].match(new RegExp(`<${nameTag}>([\\s\\S]*?)</${nameTag}>`))?.[1] ?? '');
    const value = decode(
      m[1].match(new RegExp(`<${valueTag}>([\\s\\S]*?)</${valueTag}>`))?.[1] ?? ''
    );
    const key = name.match(/\[([^\]]+)\]$/)?.[1] ?? null;
    const term = key ? findTerm(key) : undefined;
    out.push({ name, value, key, href: term ? termUrl(term) : null });
  }
  return out;
}

/**
 * VIN carried in BT-128 of the first line, with its scheme.
 * @param {CorpusFile} f
 * @returns {{ id: string, scheme: string } | null}
 */
export function lineObjectId(f) {
  const line = firstLine(f);
  if (f.syntax === 'CII') {
    const doc = line.match(
      /<ram:AdditionalReferencedDocument>([\s\S]*?)<\/ram:AdditionalReferencedDocument>/
    )?.[1];
    const id = doc?.match(/<ram:IssuerAssignedID>([^<]+)</)?.[1];
    const scheme = doc?.match(/<ram:ReferenceTypeCode>([^<]+)</)?.[1];
    return id && scheme ? { id, scheme } : null;
  }
  const m = line.match(/<cac:DocumentReference>\s*<cbc:ID schemeID="([^"]+)">([^<]+)</);
  return m ? { id: m[2], scheme: m[1] } : null;
}

/**
 * Every value used for a key anywhere in the positive corpus, most frequent first.
 * @param {string} key
 */
export function corpusValues(key) {
  /** @type {Map<string, number>} */
  const seen = new Map();
  for (const f of corpus.filter((c) => !c.negative)) {
    const re =
      /<(?:ram:Description|cbc:Name)>([^<]*)<\/(?:ram:Description|cbc:Name)>\s*<(?:ram|cbc):Value>([^<]*)</g;
    for (const m of f.xml.matchAll(re)) {
      if (decode(m[1]).endsWith(`[${key}]`) || decode(m[1]) === key) {
        const v = decode(m[2]);
        seen.set(v, (seen.get(v) ?? 0) + 1);
      }
    }
  }
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
}

// --- Validation evidence ---------------------------------------------------------------------
/**
 * @typedef {{ firedRules: number, failedAsserts: number, reports: number }} SvrlResult
 * @typedef {{ errors: number }} XsdResult
 * @typedef {{
 *   source: string,
 *   validators: { id: string, name: string, kind: 'xsd' | 'svrl' }[],
 *   files: Record<string, Record<string, SvrlResult | XsdResult>>
 * }} Validation
 */
/** @type {Validation} */
export const validation = validationJson;

/**
 * @typedef {object} Finding
 * @property {'error' | 'warning' | 'info'} severity
 * @property {string} rule
 * @property {string | null} line
 * @property {string} msg
 *
 * @typedef {object} CheckerFile
 * @property {string} file
 * @property {string} syntax
 * @property {{ line: string, level: number, facts: Record<string, string | string[]> }[]} vehicles
 * @property {{ line: string | null }[]} level0
 * @property {{ line: string }[]} attached
 * @property {Finding[]} findings
 */
/** @type {Record<string, CheckerFile>} */
export const checker = checkerJson;

/**
 * Number of problems one validator found in one file (XSD errors, or failed asserts and reports).
 * @param {SvrlResult | XsdResult} r
 */
export const problemsOf = (r) => ('errors' in r ? r.errors : r.failedAsserts + r.reports);

/**
 * Conformance levels found by the reference checker in a file.
 * @param {string} name
 */
export function levels(name) {
  const c = checker[name];
  if (!c) return [];
  const found = new Set(c.vehicles.map((v) => v.level));
  if (c.level0.length) found.add(0);
  return [...found].sort((a, b) => a - b);
}
