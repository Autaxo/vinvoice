// Single access point to generated/registry.json, which scripts/generate.mjs builds from
// registry/. Pages and components never spell out a key name: they iterate over the registry or
// use REF, the keys that registry/registry.yaml names by role. A rename is an edit of the YAML
// sources; the site follows on the next build.
import registryJson from '../../generated/registry.json';
import crosswalkCsv from '../../generated/crosswalk.csv?raw';
import { parseCsv } from './csv';

export interface Term {
  key: string;
  tier: string;
  status: string;
  statutory: boolean;
  repeatable: boolean;
  unit: string | null;
  representationTerm: string;
  labelDe: string;
  labelEn: string;
  definition: string;
  valueFormat: string;
  grammar: string;
  tokens: string[];
  codeList: string;
  conditionality: string;
  carrier: string;
  anchors: string;
}
export interface ReservedName {
  key: string;
  labelEn: string;
  labelDe: string;
  was?: string;
}
export interface TokenListData {
  list: string;
  tokens: string[];
  source: string;
}
export interface NamingRule {
  id: string;
  rule: string;
  rationale?: string;
  source?: string;
}

export const registry = registryJson as {
  version: string;
  date: string;
  licence: string;
  root: string;
  markerKey: string;
  markerGrammar: string;
  keyGrammar: string;
  keyGrammarAuthoring: string;
  vendorKeyGrammar: string;
  keyCap: number;
  nameCap: number;
  iriBase: string;
  counts: Record<string, number>;
  keys: Term[];
  reserved: ReservedName[];
  tokenLists: TokenListData[];
  namingRules: NamingRule[];
  nameLengthCap: string;
  nationalKeysPattern: string;
  tokenPolicy: string;
  refs: Record<string, string>;
};
export const terms: Term[] = registry.keys;
export const reserved: ReservedName[] = registry.reserved;

const TIER_LABELS: Record<string, string> = {
  core: 'Core',
  recommended: 'Recommended',
  optional: 'Optional',
};
export const tiers: string[] = Object.keys(registry.counts);
export const tierLabel = (tier: string) =>
  TIER_LABELS[tier] ?? tier.charAt(0).toUpperCase() + tier.slice(1);
export const termsByTier = (tier: string) => terms.filter((t) => t.tier === tier);

/** Key prefix including the dot, e.g. "vehicle." */
export const prefix = registry.root + '.';
export const localName = (key: string) => key.slice(prefix.length);

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
] as const;

export const REF = Object.fromEntries(
  ROLES.map((role) => {
    const t = terms.find((x) => x.key === registry.refs[role]);
    if (!t) throw new Error(`[vinvoice] refs.${role} is missing in registry/registry.yaml`);
    return [role, t];
  })
) as Record<(typeof ROLES)[number], Term>;

// --- Derived facts --------------------------------------------------------------------------

/** Value of the first BT-161 example in the carrier text, e.g. "vehicle/1.0" for the marker. */
export function carrierValue(t: Term): string | undefined {
  return t.carrier.match(/BT-161 (?:e\.g\. )?'([^']+)'/)?.[1];
}
export const markerValue = carrierValue(REF.marker) ?? '';
/** Major.minor of this release as written in the marker, e.g. "1.0". */
export const markerVersion = markerValue.slice(markerValue.indexOf('/') + 1);

export const slug = (t: Term) => localName(t.key).replace(/\./g, '-');
export const termUrl = (t: Term) => `/vocabulary/${slug(t)}/`;
export const findTerm = (key: string) => terms.find((t) => t.key === key);
export const findReserved = (key: string) => reserved.find((r) => r.key === key);

/** National keys carry a two-letter country scope after the root (naming rule NR-02). */
export const countryScope = (t: Term) => localName(t.key).match(/^([a-z]{2})\./)?.[1] ?? null;

/** BT-160 name in its labelled form: "<registry label> [<key>]". */
export const rowName = (t: Term, label: string = t.labelDe) => `${label} [${t.key}]`;

/** "unit fixed: kilometre (Rec 20 KMT)" -> { name: "kilometre", code: "KMT" } */
export function unitInfo(t: Term): { name: string; code: string | null; note?: string } | null {
  const m = t.codeList.match(/^unit fixed: ([^(;]+?)\s*\(([^)]*)\)/);
  if (!m) return t.unit ? { name: t.unit, code: t.unit } : null;
  const code = m[2].match(/Rec 20 ([A-Z0-9]{2,3})/)?.[1] ?? null;
  return { name: m[1], code, note: code ? undefined : m[2] };
}

/** Representation term without its explanation, for tables: "Number", "Measure, km", "Code". */
export const valueSummary = (t: Term) =>
  t.representationTerm
    .replace(/ \(implicit[^)]*\)$/, '')
    .replace(/^Measure, unit (\S+) \(.*\)$/, 'Measure, $1') + (t.repeatable ? ', repeatable' : '');

// --- Token lists ----------------------------------------------------------------------------
export interface TokenList extends TokenListData {
  title: string;
  anchor: string;
  note: string;
  external: boolean;
  terms: Term[];
}
const KEY_RE = new RegExp(registry.keyGrammar.replace(/^\^/, '').replace(/\$$/, ''), 'g');
export const tokenLists: TokenList[] = registry.tokenLists.map((l) => {
  const title = l.list.replace(/\s*\(.*$/, '');
  const mentioned = [...l.list.matchAll(KEY_RE)].map((m) => findTerm(m[0])).filter(Boolean);
  const listTerms = mentioned.length
    ? (mentioned as Term[])
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
export const tokenListsFor = (t: Term) => tokenLists.filter((l) => l.terms.includes(t));

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Registry text as HTML, with every mention of a key linked to its term page. */
export function linkKeys(text: string): string {
  return escapeHtml(text).replace(KEY_RE, (key) => {
    const t = findTerm(key);
    if (t) return `<a href="${termUrl(t)}"><code>${key}</code></a>`;
    if (findReserved(key)) return `<a href="/vocabulary/#reserved"><code>${key}</code></a>`;
    return `<code>${key}</code>`;
  });
}

/** "a; b; c" -> ["a", "b", "c"] (semicolons inside parentheses are kept). */
export function splitList(text: string): string[] {
  const parts: string[] = [];
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
const crosswalkRows = parseCsv(crosswalkCsv);
export const crosswalkHeader = crosswalkRows[0] ?? [];
const crosswalk = new Map(crosswalkRows.slice(1).map((r) => [r[0], r.slice(1)]));
export const crosswalkFor = (t: Term) => (crosswalk.get(t.key) ?? []).filter((c) => c.trim());

export const statutoryTerms = terms.filter((t) => t.statutory);
