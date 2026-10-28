// Single access point to generated/registry.json, which scripts/generate.mjs builds from
// registry/. Pages and components never spell out a key name: they iterate over the registry or
// use REF, the keys that registry/registry.yaml names by role. A rename is an edit of the YAML
// sources; the site follows on the next build.
import { parseCsv } from '../../scripts/lib/csv.mjs';
import { escape, html, raw } from './html.mjs';
import { readJson, readText } from './paths.mjs';

/**
 * @typedef {object} Term
 * @property {string} key
 * @property {string} tier
 * @property {string} status
 * @property {boolean} statutory
 * @property {boolean} repeatable
 * @property {string | null} unit
 * @property {string} representationTerm
 * @property {string} labelDe
 * @property {string} labelEn
 * @property {string} definition
 * @property {string} valueFormat
 * @property {string} grammar
 * @property {string[]} tokens
 * @property {string} codeList
 * @property {string} conditionality
 * @property {string} carrier
 * @property {string} anchors
 *
 * @typedef {object} ReservedName
 * @property {string} key
 * @property {string} labelEn
 * @property {string} labelDe
 * @property {string} [was]
 *
 * @typedef {object} TokenListData
 * @property {string} list
 * @property {string[]} tokens
 * @property {string} source
 *
 * @typedef {object} NamingRule
 * @property {string} id
 * @property {string} rule
 * @property {string} [rationale]
 * @property {string} [source]
 *
 * @typedef {object} Registry
 * @property {string} version
 * @property {string} date
 * @property {string} licence
 * @property {string} root
 * @property {string} markerKey
 * @property {string} markerGrammar
 * @property {string} keyGrammar
 * @property {string} keyGrammarAuthoring
 * @property {string} vendorKeyGrammar
 * @property {number} keyCap
 * @property {number} nameCap
 * @property {string} iriBase
 * @property {Record<string, number>} counts
 * @property {Term[]} keys
 * @property {ReservedName[]} reserved
 * @property {TokenListData[]} tokenLists
 * @property {NamingRule[]} namingRules
 * @property {string} nameLengthCap
 * @property {string} nationalKeysPattern
 * @property {string} tokenPolicy
 * @property {Record<string, string>} refs
 */

/** @type {Registry} */
export const registry = readJson('generated/registry.json');
export const terms = registry.keys;
export const reserved = registry.reserved;

/** @type {Record<string, string>} */
const TIER_LABELS = {
  core: 'Core',
  recommended: 'Recommended',
  optional: 'Optional',
};
export const tiers = Object.keys(registry.counts);
/** @param {string} tier */
export const tierLabel = (tier) =>
  TIER_LABELS[tier] ?? tier.charAt(0).toUpperCase() + tier.slice(1);
/** @param {string} tier */
export const termsByTier = (tier) => terms.filter((t) => t.tier === tier);

/** Key prefix including the dot, e.g. "vehicle." */
export const prefix = registry.root + '.';
/** @param {string} key */
export const localName = (key) => key.slice(prefix.length);

// Roles the site text refers to. Each must be named in registry/registry.yaml (refs).
const ROLES = [
  'marker',
  'role',
  'vin',
  'make',
  'model',
  'condition',
  'firstRegistrationDate',
  'odometerKm',
  'odometerMi',
  'odometerStatus',
  'power',
  'engineCapacity',
  'newMeansOfTransport',
  'firstEntryIntoService',
  'marginScheme',
  'registrationNumber',
  'registrationCountry',
  'category',
  'stateOfHealth',
  'stateOfHealthDate',
  'stateOfHealthMethod',
];

/** @type {Record<string, Term>} */
export const REF = Object.fromEntries(
  ROLES.map((role) => {
    const t = terms.find((x) => x.key === registry.refs[role]);
    if (!t) throw new Error(`[vinvoice] refs.${role} is missing in registry/registry.yaml`);
    return [role, t];
  })
);

// --- Derived facts --------------------------------------------------------------------------

/**
 * Value of the first BT-161 example in the carrier text, e.g. "vehicle/1.0" for the marker.
 * @param {Term} t
 */
export function carrierValue(t) {
  return t.carrier.match(/BT-161 (?:e\.g\. )?'([^']+)'/)?.[1];
}
export const markerValue = carrierValue(REF.marker) ?? '';
/** Major.minor of this release as written in the marker, e.g. "1.0". */
export const markerVersion = markerValue.slice(markerValue.indexOf('/') + 1);

/** @param {Term} t */
export const slug = (t) => localName(t.key).replace(/\./g, '-');
/** @param {Term} t */
export const termUrl = (t) => `/vocabulary/${slug(t)}/`;
/** @param {string} key */
export const findTerm = (key) => terms.find((t) => t.key === key);
/** @param {string} key */
const findReserved = (key) => reserved.find((r) => r.key === key);

/**
 * National keys carry a two-letter country scope after the root (naming rule NR-02).
 * @param {Term} t
 */
export const countryScope = (t) => localName(t.key).match(/^([a-z]{2})\./)?.[1] ?? null;

/**
 * BT-160 name in its labelled form: "<registry label> [<key>]".
 * @param {Term} t
 * @param {string} [label]
 */
export const rowName = (t, label = t.labelDe) => `${label} [${t.key}]`;

/**
 * "unit fixed: kilometre (Rec 20 KMT)" -> { name: "kilometre", code: "KMT" }
 * @param {Term} t
 * @returns {{ name: string, code: string | null, note?: string } | null}
 */
export function unitInfo(t) {
  const m = t.codeList.match(/^unit fixed: ([^(;]+?)\s*\(([^)]*)\)/);
  if (!m) return t.unit ? { name: t.unit, code: t.unit } : null;
  const code = m[2].match(/Rec 20 ([A-Z0-9]{2,3})/)?.[1] ?? null;
  return { name: m[1], code, note: code ? undefined : m[2] };
}

/**
 * Representation term without its explanation, for tables: "Number", "Measure, km", "Code".
 * @param {Term} t
 */
export const valueSummary = (t) =>
  t.representationTerm
    .replace(/ \(implicit[^)]*\)$/, '')
    .replace(/^Measure, unit (\S+) \(.*\)$/, 'Measure, $1') + (t.repeatable ? ', repeatable' : '');

// --- Token lists ----------------------------------------------------------------------------
/**
 * @typedef {TokenListData & {
 *   title: string, anchor: string, note: string, external: boolean, terms: Term[]
 * }} TokenList
 */
const KEY_RE = new RegExp(registry.keyGrammar.replace(/^\^/, '').replace(/\$$/, ''), 'g');
/** @type {TokenList[]} */
export const tokenLists = registry.tokenLists.map((l) => {
  const title = l.list.replace(/\s*\(.*$/, '');
  const mentioned = [...l.list.matchAll(KEY_RE)].map((m) => findTerm(m[0])).filter(Boolean);
  const listTerms = mentioned.length
    ? /** @type {Term[]} */ (mentioned)
    : /Indicator/.test(l.list)
      ? terms.filter((t) => t.representationTerm === 'Indicator')
      : [];
  return {
    ...l,
    title,
    anchor: title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    note: l.list.match(/\)\s*,?\s*(.*)$/)?.[1] ?? '',
    external: /\bexternal\b/.test(l.list),
    terms: listTerms,
  };
});
/** @param {Term} t */
export const tokenListsFor = (t) => tokenLists.filter((l) => l.terms.includes(t));

/**
 * Registry text as HTML, with every mention of a key linked to its term page.
 * @param {string} text
 */
export function linkKeys(text) {
  return raw(
    escape(text).replace(KEY_RE, (key) => {
      const t = findTerm(key);
      if (t) return String(html`<a href="${termUrl(t)}"><code>${key}</code></a>`);
      if (findReserved(key))
        return String(html`<a href="/vocabulary/#reserved"><code>${key}</code></a>`);
      return String(html`<code>${key}</code>`);
    })
  );
}

/**
 * "a; b; c" -> ["a", "b", "c"] (semicolons inside parentheses are kept).
 * @param {string} text
 */
export function splitList(text) {
  /** @type {string[]} */
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const c of text) {
    if (c === '(') depth++;
    if (c === ')') depth = Math.max(0, depth - 1);
    if (c === ';' && depth === 0) {
      parts.push(cur.trim());
      cur = '';
    } else cur += c;
  }
  if (cur.trim()) parts.push(cur.trim().replace(/\.$/, ''));
  return parts.filter(Boolean);
}

// --- Crosswalk (informative, CC BY 4.0) -----------------------------------------------------
const crosswalkRows = parseCsv(readText('generated/crosswalk.csv'));
export const crosswalkHeader = crosswalkRows[0] ?? [];
const crosswalk = new Map(crosswalkRows.slice(1).map((r) => [r[0], r.slice(1)]));
/** @param {Term} t */
export const crosswalkFor = (t) => (crosswalk.get(t.key) ?? []).filter((c) => c.trim());

export const statutoryTerms = terms.filter((t) => t.statutory);
