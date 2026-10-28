// llms.txt (https://llmstxt.org) and llms-full.txt: plain-text entry points for language models
// and coding agents. Built from the same data as the pages; key names come from the registry.
import {
  registry,
  terms,
  reserved,
  tokenLists,
  REF,
  markerValue,
  rowName,
  carrierValue,
  unitInfo,
  statutoryTerms,
  conditionalLabelCases,
  prefix,
} from './registry.mjs';
import { corpus, featured, firstLine } from './corpus.mjs';
import { BINDINGS } from './bindings.mjs';
import { SITE, REPO } from './site.mjs';

/** @param {string} path */
const url = (path) => SITE.url + path;
/** @param {string[]} items */
const list = (items) => items.map((i) => `- ${i}`).join('\n');
/** @param {import('./registry.mjs').Term[]} ts */
const keys = (ts) => ts.map((t) => `\`${t.key}\``).join(', ');

const SUMMARY = `VINvoice is an open, vendor-neutral convention for structured vehicle data in EN 16931 e-invoices (Factur-X / ZUGFeRD, XRechnung, Peppol BIS Billing). It adds no XML: the vehicle identification number (VIN) goes into the invoice line object identifier BT-128 with scheme \`AKG\`; every other vehicle fact is one BG-32 item attribute (BT-160 name, BT-161 value) named \`Label [key]\` with a plain value; the marker row \`${REF.marker.key}\` = \`${markerValue}\` makes a line a vehicle line. Invoices stay valid EN 16931 invoices.`;

const STATUS = `Status: draft for review (registry ${registry.version}, ${registry.date}). Not yet a published standard. VINvoice is not endorsed by CEN, FeRD, KoSIT, OpenPeppol or any public authority.`;

/** @returns {string} */
export function llmsTxt() {
  return `# VINvoice

> ${SUMMARY}

${STATUS}

Use VINvoice when software writes or reads e-invoices about vehicles (sales, trade-ins, workshop and service, leasing, rental, transport) and needs machine-readable vehicle data such as VIN, make, model, first registration, odometer reading, power or the margin-scheme flag. For a complete implementation guide in one file, read llms-full.txt.

## Specification

${list([
  `[Implementation guide (llms-full.txt)](${url('/llms-full.txt')}): everything an implementer needs in one plain-text file`,
  `[Specification](${url('/specification/')}): vehicle lines, row names and values, conformance levels 0 to 2, CII and UBL bindings, reading rules, VAT and margin scheme`,
  `[Naming rules](${url('/naming-rules/')}): how keys, labels and tokens are named`,
  `[Vocabulary](${url('/vocabulary/')}): all ${terms.length} keys with definitions, grammars and legal anchors`,
  `[Code lists](${url('/code-lists/')}): token lists, EU code lists and units`,
])}

## Machine-readable registry

${list([
  `[registry.json](${url('/downloads/registry.json')}): the normative registry (CC0-1.0)`,
  `[vehicle-facts.schema.json](${url('/downloads/vehicle-facts.schema.json')}): JSON Schema for the facts of one vehicle line`,
  `[vinvoice.sch](${url('/downloads/vinvoice.sch')}): ISO Schematron rules for CII and UBL invoices`,
  `[context.jsonld](${url('/downloads/context.jsonld')}): JSON-LD context`,
  `[registry.csv](${url('/downloads/registry.csv')}): the registry as a table`,
])}

## Examples

${list([
  `[${featured.cii.name}](${url('/examples/' + featured.cii.name)}) (CII): ${featured.cii.description}`,
  `[${featured.ubl.name}](${url('/examples/' + featured.ubl.name)}): the same sale in UBL`,
  `[All ${corpus.length} test invoices](${url('/examples/')})`,
])}

## Tools

${list([
  `[Validation](${url('/validation/')}): how the test invoices were validated; reference checker rules V-01 to V-22`,
  ...(REPO
    ? [`[Source repository](${REPO.url}): registry sources, reference checker (Python), tests`]
    : []),
])}

## Optional

${list([
  `[Governance](${url('/governance/')}): neutrality charter, change process, how to propose a key, licences`,
  `[Implementations](${url('/implementations/')}): software that writes or reads VINvoice`,
])}
`;
}

/** @param {import('./registry.mjs').Term} t */
function keyBlock(t) {
  const unit = unitInfo(t);
  const example = carrierValue(t);
  const facts = [
    `German label: ${t.labelDe}`,
    `Tier: ${t.tier}; status: ${t.status}; representation term: ${t.representationTerm}`,
    `Statutory: ${t.statutory ? 'yes (always write the labelled name)' : 'no'}${
      t.labelRequiredWhen
        ? `; labelled name required while \`${t.labelRequiredWhen}\` = \`true\`${[
            t.labelRequiredVatCategory && `VAT category ${t.labelRequiredVatCategory}`,
            t.labelRequiredSellerCountry && `seller country ${t.labelRequiredSellerCountry}`,
          ]
            .filter(Boolean)
            .map((x) => `, ${x}`)
            .join('')}`
        : ''
    }; repeatable: ${t.repeatable ? 'yes' : 'no'}`,
    ...(unit ? [`Unit: ${unit.name}${unit.code ? ` (UN/ECE Rec. 20 ${unit.code})` : ''}`] : []),
    `Grammar: \`${t.grammar}\``,
    ...(t.tokens.length ? [`Tokens: ${t.tokens.map((x) => `\`${x}\``).join(', ')}`] : []),
    `Value format: ${t.valueFormat}`,
    `Required when: ${t.conditionality}`,
    `Row: \`${rowName(t)}\`${example ? ` = \`${example}\`` : ''}`,
    `Anchors: ${t.anchors}`,
  ];
  return `### ${t.key}: ${t.labelEn}

${t.definition}

${list(facts)}`;
}

/** @returns {string} */
export function llmsFullTxt() {
  return `# VINvoice: vehicle data in EU e-invoices (implementation guide)

> ${SUMMARY}

${STATUS}

Licences: registry data CC0-1.0; specification text CC BY 4.0; code and Schematron Apache-2.0. Canonical, machine-readable source: ${url('/downloads/registry.json')}. If this file and registry.json differ, registry.json wins.

## How to write a vehicle line

1. One vehicle per invoice line. A line with role \`${REF.role.tokens[0]}\` or \`${REF.role.tokens[1]}\` has quantity 1.
2. First row, the marker: \`${rowName(REF.marker)}\` = \`${markerValue}\`. Exactly once per vehicle line, never on other lines.
3. Second row, the role: \`${rowName(REF.role)}\` = one of ${REF.role.tokens.map((x) => `\`${x}\``).join(', ')}.
4. Every other fact is one BG-32 row. BT-160 is the German or English registry label, one space and the key in brackets (\`${rowName(REF.make)}\` or \`${rowName(REF.make, REF.make.labelEn)}\`), or the bare key. BT-160 is at most ${registry.nameCap} characters.
5. Statutory keys MUST use the labelled name: ${keys(statutoryTerms)}. So MUST ${conditionalLabelCases.map((c) => `${keys(c.terms)} on a line where \`${c.when.key}\` = \`true\`${c.category ? `, with VAT category \`${c.category}\`` : ''}${c.country ? `, from a seller in \`${c.country}\` (BT-40)` : ''}`).join('; and ')} (national invoice particulars for a motorised land vehicle, § 14a(4) UStG with § 1b(2) no. 1; registry fields \`labelRequiredWhen\`, \`labelRequiredVatCategory\`, \`labelRequiredSellerCountry\`; a bare row there is a V-11 error); on other lines they MAY be bare.
6. BT-161 is a plain value that matches the key's grammar: ISO dates (\`YYYY-MM-DD\`), integers without group separators, a full stop as decimal mark, no unit text (the unit is part of the key), registry tokens in lower case, codes from EU lists (vehicle categories, bodywork codes, countries) verbatim. Never translate tokens. Keep BT-161 in the text value element, never in a measure or quantity element.
7. Write the VIN twice: as the row \`${REF.vin.key}\` and in BT-128 of every line about the vehicle with scheme \`AKG\` and document type code \`130\` (conformance level 2). If no VIN exists, BT-128 may carry the registration number with scheme \`ABZ\`.
8. Workshop invoices: put the rows on one vehicle reference line with value 0.00; labour and parts lines carry the VIN in BT-128; a single-vehicle document may also carry it in BT-18.
9. Never put prices, VAT amounts, purchase prices, margins or legal wording into rows. Legal wording goes into BG-1 (invoice note) and BT-120.
10. Vendor-specific data: name the rows with the reverse-DNS name of a domain you control, such as \`com.example.stockNumber\`, never under \`${prefix}\`. Receivers ignore them.
11. Never write reserved names (listed below).
12. Validate the invoice with the official EN 16931 / national validators and with ${url('/downloads/vinvoice.sch')} (or the reference checker). VINvoice findings never make an EN 16931 invoice invalid.

## Conformance levels

- Level 0, identify: the VIN in BT-128 with scheme \`AKG\` (or BT-18 for a single-vehicle document); no rows.
- Level 1, describe: on each vehicle line the marker, the role and the core rows that apply, including the VIN as a row; BT-128 not required.
- Level 2, describe and identify: level 1 plus the VIN in BT-128 with scheme \`AKG\` on every line about the vehicle.

## Syntax bindings

${BINDINGS.map((b) => `- ${b.term}: CII ${b.cii}; UBL ${b.ubl}`).join('\n')}

## Example: first invoice line of ${featured.cii.name} (Factur-X, CII)

\`\`\`xml
${firstLine(featured.cii)}
\`\`\`

## Example: first invoice line of ${featured.ubl.name} (Peppol BIS Billing, UBL)

\`\`\`xml
${firstLine(featured.ubl)}
\`\`\`

## Reading rules for receivers

1. Read item attributes whose BT-160 is \`Label [key]\` or a bare key under \`${prefix}\`. Ignore vendor rows (reverse-DNS names) and reserved names.
2. A line is a vehicle line only if it has the marker \`${REF.marker.key}\` with a valid value; ignore rows on other lines.
3. If the major version in the marker is unknown, skip that line's rows. Never reject the invoice.
4. Check each value against its key's grammar and drop values that do not match. Ignore unknown keys.
5. A key that is not repeatable and appears twice: keep the first value.
6. VIN: BT-128 with scheme \`AKG\` wins over the row \`${REF.vin.key}\`; the row wins over BT-128 with scheme \`VT\`, which a receiver that reads it takes only if the value matches \`^[A-HJ-NPR-Z0-9]{17}$\` (UNTDID 1153 VT is normally a registration number; any other value is ignored; a VIN known only from VT is Level 1); BT-18 comes last (scheme \`AKG\`, or \`VT\` in VIN form).
7. A line without the marker whose BT-128 equals the VIN of a vehicle line belongs to that vehicle.

## VAT notes (provisional until a written tax sign-off)

- Margin scheme for second-hand goods: every margin-scheme vehicle line carries \`${REF.marginScheme.key}\` = \`true\`. Under the EN 16931:2017 model the line uses VAT category \`E\` with an exemption reason text and the invoice note "Gebrauchtgegenstände/Sonderregelung" or the Art. 226(14) wording in BG-1; an export uses \`G\` with \`VATEX-EU-G\`; never \`K\`. EN 16931-1:2026 is expected to add VAT categories for the margin schemes (\`F\` for second-hand goods, besides \`D\`, \`I\` and \`J\`, and \`N\` for national schemes; source: KoSIT, XRechnung 4.0.0 pre-release of 2026-09-15, section 4.4.8, PDF pp. 98 to 99); that \`F\` replaces the \`E\` encoding, and from when, is an assumption to be confirmed against DIN EN 16931-1:2026, whose text is not freely available (it is sold by CEN and DIN). BT-211 (item attribute code) and BT-212 (unit): the only public source we found is that pre-release (section 3.23, PDF pp. 51 to 52); for the standard itself they are assumptions too.
- New means of transport supplied intra-EU: \`${REF.newMeansOfTransport.key}\` = \`true\`, plus \`${REF.power.key}\` or \`${REF.engineCapacity.key}\` (for a land vehicle; written with their labels where the seller is in DE and the line has VAT category K: § 14a(4) UStG requires the § 1b(2) no. 1 characteristics, engine capacity or power, on the invoice besides the § 1b(3) ones; Art. 2(2)(a)(i) Directive 2006/112/EC defines the thresholds; vessels and aircraft are outside version 1.0), and an odometer reading or \`${REF.firstEntryIntoService.key}\`; never together with \`${REF.marginScheme.key}\` = \`true\` (Art. 313(2); § 25a(7) no. 1(b) UStG).

## Keys (${terms.length})

${terms.map(keyBlock).join('\n\n')}

## Reserved names (never write these)

${list(reserved.map((r) => `\`${r.key}\``))}

## Token lists

${tokenLists.map((l) => `### ${l.list}\n\n${l.tokens.map((x) => `\`${x}\``).join(', ')}\n\n${l.source}`).join('\n\n')}

## Naming rules

${list(registry.namingRules.map((r) => `${r.id}: ${r.rule}`))}

Length: ${registry.nameLengthCap}

National keys: ${registry.nationalKeysPattern}

Values and tokens: ${registry.tokenPolicy}

## More

${list([
  `Website: ${url('/')}`,
  `Specification: ${url('/specification/')}`,
  `Test invoices: ${url('/examples/')}`,
  ...(REPO ? [`Repository: ${REPO.url}`] : []),
  `Sponsor: ${SITE.sponsor.name} (${SITE.sponsor.url}); the standard is meant to move to a neutral steward.`,
])}
`;
}
