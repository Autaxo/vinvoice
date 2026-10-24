// Test corpus (data/corpus/*.xml) and the evidence produced for it. Examples on the site are
// cut out of these files at build time, so they always match the downloadable invoices.
import examples from '../../corpus/index.json';
import validationJson from '../../corpus/validation.json';
import checkerJson from '../../corpus/checker-expected.json';
import { findTerm, termUrl } from './registry';

const raw = import.meta.glob<string>('../../corpus/*.xml', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export interface CorpusFile {
  name: string;
  xml: string;
  bytes: number;
  syntax: 'CII' | 'UBL';
  carrier: string;
  scenario: string;
  description: string;
  negative: boolean;
}

const carriers = examples.carriers as Record<string, string>;
const scenarios = examples.scenarios as Record<string, string>;

export const corpus: CorpusFile[] = Object.entries(raw)
  .map(([path, xml]) => {
    const name = path.split('/').pop()!;
    const parts = name.replace(/\.xml$/, '').split('.');
    const syntax = parts.at(-1) === 'ubl' ? 'UBL' : 'CII';
    const carrierId = parts.length > 2 ? parts.at(-2)! : '';
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
    } satisfies CorpusFile;
  })
  .sort((a, b) => Number(a.negative) - Number(b.negative) || a.name.localeCompare(b.name));

export const corpusFile = (name: string) => corpus.find((f) => f.name === name);
export const featured = {
  cii: corpusFile(examples.featured.cii) ?? corpus.find((f) => f.syntax === 'CII')!,
  ubl: corpusFile(examples.featured.ubl) ?? corpus.find((f) => f.syntax === 'UBL')!,
};

const decode = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

function between(xml: string, open: string, close: string): string | null {
  const start = xml.indexOf(open);
  if (start < 0) return null;
  const end = xml.indexOf(close, start);
  return end < 0 ? null : xml.slice(start, end + close.length);
}

/** First invoice line of a file, as written (indentation removed). */
export function firstLine(f: CorpusFile): string {
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

export interface Row {
  name: string;
  value: string;
  key: string | null;
  href: string | null;
}

/** BG-32 rows (BT-160 name, BT-161 value) of the first invoice line. */
export function rows(f: CorpusFile): Row[] {
  const line = firstLine(f);
  const [item, nameTag, valueTag] =
    f.syntax === 'CII'
      ? ['ram:ApplicableProductCharacteristic', 'ram:Description', 'ram:Value']
      : ['cac:AdditionalItemProperty', 'cbc:Name', 'cbc:Value'];
  const out: Row[] = [];
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

/** VIN carried in BT-128 of the first line, with its scheme. */
export function lineObjectId(f: CorpusFile): { id: string; scheme: string } | null {
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

/** Every value used for a key anywhere in the positive corpus, most frequent first. */
export function corpusValues(key: string): string[] {
  const seen = new Map<string, number>();
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
interface SvrlResult {
  firedRules: number;
  failedAsserts: number;
  reports: number;
}
interface XsdResult {
  errors: number;
}
export const validation = validationJson as {
  source: string;
  validators: { id: string; name: string; kind: 'xsd' | 'svrl' }[];
  files: Record<string, Record<string, SvrlResult | XsdResult>>;
};

export interface Finding {
  severity: 'error' | 'warning' | 'info';
  rule: string;
  line: string | null;
  msg: string;
}
interface CheckerFile {
  file: string;
  syntax: string;
  vehicles: { line: string; level: number; facts: Record<string, string | string[]> }[];
  level0: { line: string | null }[];
  attached: { line: string }[];
  findings: Finding[];
}
export const checker = checkerJson as unknown as Record<string, CheckerFile>;

/** Conformance levels found by the reference checker in a file. */
export function levels(name: string): number[] {
  const c = checker[name];
  if (!c) return [];
  const found = new Set(c.vehicles.map((v) => v.level));
  if (c.level0.length) found.add(0);
  return [...found].sort();
}
