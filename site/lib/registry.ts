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
  labelDe: string;
  labelEn: string;
  definition: string;
  valueFormat: string;
  grammar: string;
  codeList: string;
  conditionality: string;
  carrier: string;
  anchors: string;
  signOff: string | null;
}

export const registry = registryJson as {
  version: string;
  date: string;
  licence: string;
  prefix: string;
  counts: Record<string, number>;
  refs: Record<string, string>;
  keys: Term[];
};
export const terms: Term[] = registry.keys;

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
export const prefix = registry.prefix;
export const localName = (key: string) => key.slice(prefix.length);

// Roles the site text refers to. Each must be named in registry/registry.yaml (refs).
const ROLES = [
  'marker',
  'role',
  'vin',
  'make',
  'model',
  'condition',
  'firstRegistration',
  'odometerKm',
  'odometerMi',
  'odometerStatus',
  'power',
  'displacement',
  'newMeansOfTransport',
  'firstUse',
  'marginScheme',
  'plate',
  'batterySoh',
  'batterySohDate',
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

/** BT-160 name in its labelled form: "<registry label> [<key>]". */
export const rowName = (t: Term, label: string = t.labelDe) => `${label} [${t.key}]`;

/** "unit fixed: kilometre (Rec 20 KMT)" -> { name: "kilometre", code: "KMT" } */
export function unitInfo(t: Term): { name: string; code: string | null; note?: string } | null {
  const m = t.codeList.match(/^unit fixed: ([^(]+?)\s*\((.*)\)\s*$/);
  if (!m) return t.unit ? { name: t.unit, code: t.unit } : null;
  const code = m[2].match(/Rec 20 ([A-Z0-9]{2,3})/)?.[1] ?? null;
  return { name: m[1], code, note: code ? undefined : m[2] };
}

/** Tokens of a closed list, read from the grammar: ^(a|b|c)$ or ^(a|b)(,(a|b))*$ */
export function grammarTokens(t: Term): string[] | null {
  const m = t.grammar.match(/^\^\(([a-z0-9-]+(?:\|[a-z0-9-]+)+)\)/);
  if (!m) return null;
  const tokens = m[1].split('|');
  return tokens.every((x) => x === 'true' || x === 'false') ? null : tokens;
}
export const isBoolean = (t: Term) => /^\^\(true(\|false)?\)\$$/.test(t.grammar);
export const isListValue = (t: Term) => /\(,\(/.test(t.grammar);

/** Short value type for overview tables: "token", "YYYY-MM-DD", "integer", "pattern", ... */
export function valueSummary(t: Term): string {
  if (t.key === REF.marker.key) return 'version';
  if (isBoolean(t)) return t.grammar.includes('false') ? 'true | false' : 'true';
  if (grammarTokens(t)) return isListValue(t) ? 'token list' : 'token';
  const m = t.valueFormat.match(
    /^(integer|decimal|text, [0-9]+-[0-9]+ characters|YYYY-MM(?:-DD)?(?: or YYYY-MM)?)/
  );
  if (!m) return 'pattern';
  return m[1].replace(/^text, [0-9]+-([0-9]+) characters$/, 'text, max. $1');
}

export interface CodeList {
  id: string;
  version: string | null;
  provisional: boolean;
  qualifier: string | null;
  tokens: string[];
  terms: Term[];
  source: string;
}

/** Lists defined by this specification: codeList text starts with an upper-case list id. */
export function ownCodeList(t: Term): Omit<CodeList, 'terms'> | null {
  const m = t.codeList.match(
    /^([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)(?: ([0-9]+\.[0-9]+))?( \(provisional\))?(?: \(([^)]*)\))?:\s*(.*)$/
  );
  if (!m) return null;
  const tokens = grammarTokens(t) ?? m[5].split(/,\s*/).map((s) => s.trim());
  return {
    id: m[1],
    version: m[2] ?? null,
    provisional: Boolean(m[3]) || t.status === 'provisional',
    qualifier: m[4] ?? null,
    tokens,
    source: t.codeList,
  };
}

export const codeLists: CodeList[] = (() => {
  const byId = new Map<string, CodeList>();
  for (const t of terms) {
    const cl = ownCodeList(t);
    if (!cl) continue;
    const seen = byId.get(cl.id);
    if (seen) seen.terms.push(t);
    else byId.set(cl.id, { ...cl, terms: [t] });
  }
  return [...byId.values()];
})();
export const codeListAnchor = (id: string) => id.toLowerCase();

export type CodeListKind = 'own' | 'unit' | 'none' | 'external';
export function codeListKind(t: Term): CodeListKind {
  if (ownCodeList(t)) return 'own';
  if (t.codeList.startsWith('unit fixed')) return 'unit';
  if (/^none\b/.test(t.codeList)) return 'none';
  return 'external';
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Registry text as HTML, with every mention of a known key linked to its term page. */
export function linkKeys(text: string): string {
  const re = new RegExp(`${prefix.replace(/\./g, '\\.')}[a-z][A-Za-z0-9]*`, 'g');
  return escapeHtml(text).replace(re, (key) => {
    const t = findTerm(key);
    return t ? `<a href="${termUrl(t)}"><code>${key}</code></a>` : `<code>${key}</code>`;
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
export const signOffTerms = terms.filter((t) => t.signOff);
