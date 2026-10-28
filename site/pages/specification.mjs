import { Base } from '../layouts/base.mjs';
import { PageHead } from '../components/page-head.mjs';
import { Key } from '../components/key.mjs';
import { KeyList } from '../components/key-list.mjs';
import { html } from '../lib/html.mjs';
import {
  registry,
  terms,
  prefix,
  REF,
  markerValue,
  markerVersion,
  statutoryTerms,
  linkKeys,
  rowName,
} from '../lib/registry.mjs';
import { featured, firstLine } from '../lib/corpus.mjs';
import { BINDINGS, codeSpans } from '../lib/bindings.mjs';
import { formatDate, LICENCE_URL, SITE } from '../lib/site.mjs';

const roles = REF.role.tokens;
const repeatable = terms.filter((t) => t.repeatable);
const markerMajor = markerVersion.split('.')[0];
const repeatableNote = repeatable.length
  ? html`Exception: repeatable keys (${KeyList({ terms: repeatable })}) take one row per value.`
  : '';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'VINvoice specification: vehicle data in EN 16931 e-invoices',
  url: `${SITE.url}/specification/`,
  version: registry.version,
  dateModified: registry.date,
  inLanguage: 'en',
  license: LICENCE_URL['CC BY 4.0'],
  about: ['EN 16931', 'electronic invoicing', 'vehicle identification number', 'vehicle data'],
  isAccessibleForFree: true,
};

const toc = [
  ['status', 'Status of this document'],
  ['introduction', 'Introduction'],
  ['conformance-language', 'Conformance language'],
  ['vehicle-lines', 'Vehicle lines'],
  ['rows', 'Rows: names and values'],
  ['identification', 'Identifying the vehicle'],
  ['levels', 'Conformance levels'],
  ['bindings', 'Syntax bindings'],
  ['reading', 'Reading rules'],
  ['vat', 'VAT and the margin scheme'],
  ['never-in-rows', 'What never goes into rows'],
  ['versioning', 'Versions and EN 16931-1:2026'],
  ['personal-data', 'Personal data'],
  ['references', 'References'],
];

export function render({ path }) {
  return Base(
    {
      path,
      title: 'Specification',
      description:
        'The VINvoice convention: vehicle lines, row names and value grammars, conformance levels 0 to 2, CII and UBL bindings, reading rules and VAT handling.',
      jsonLd,
    },
    html`
  ${PageHead(
    {
      title: 'VINvoice specification',
      lead: "Vehicle data in EN 16931 e-invoices. Editor's draft.",
    },
    html`
    <p class="small muted">
      Registry <code>${registry.version}</code> · ${formatDate(registry.date)} · marker <code>${markerValue}</code>
    </p>
  `
  )}

  <nav class="toc" aria-labelledby="toc-title">
    <h2 id="toc-title">Contents</h2>
    <ol>
      ${toc.map(
        ([id, label]) =>
          html`<li>
            <a href="#${id}">${label}</a>
          </li>`
      )}
    </ol>
  </nav>

  <div class="prose">
    <h2 id="status">1. Status of this document</h2>
    <div class="note draft">
      <p>
        This is a draft for review. It is not yet a published standard; do not rely on it for
        production systems before version 1.0. Comments and proposals are welcome; see <a href="/governance/">Governance</a>.
      </p>
    </div>
    <p>
      The normative content consists of this page and the key registry (<a href="/downloads/registry.json">registry.json</a>). Where they differ, the registry wins for anything about a single key; this page wins for
      everything else. Examples, the crosswalk and the reference checker are informative.
    </p>

    <h2 id="introduction">2. Introduction</h2>
    <p>
      EN 16931, the European model for electronic invoices, has no business term for a vehicle.
      Factur-X and ZUGFeRD, XRechnung and Peppol BIS Billing all implement that model, so an invoice
      for a car, a repair or a lease can carry vehicle data only in generic places. Exactly one of
      them is structured enough for an identifier: the invoice line object identifier BT-128, which
      accepts the UNTDID 1153 scheme <code>AKG</code> (vehicle identification number). Everything else
      ends up in free text or in item attributes (BG-32) that nobody has named.
    </p>
    <p>
      VINvoice names those item attributes. It adds no XML element, no extension and no
      specification identifier (BT-24), so every invoice that follows it remains a valid EN 16931
      invoice in each syntax and each national profile. A receiver that does not know VINvoice shows
      the rows as ordinary item attributes.
    </p>

    <h2 id="conformance-language">3. Conformance language</h2>
    <p>
      The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are to be interpreted as described in <a href="https://www.rfc-editor.org/rfc/rfc2119">RFC 2119</a> and <a href="https://www.rfc-editor.org/rfc/rfc8174">RFC 8174</a> when, and only when, they appear
      in capitals. The conditions under which each key is required are part of the registry and are shown
      on each <a href="/vocabulary/">term page</a>.
    </p>

    <h2 id="vehicle-lines">4. Vehicle lines</h2>
    <p>
      A <dfn>vehicle line</dfn> is an invoice line that carries exactly one marker row ${Key({ t: REF.marker, value: markerValue })}. The marker states the major and minor version of the convention. It SHOULD be the first
      row of the line and MUST NOT appear on any other line. The marker stands in for a
      specification identifier: Factur-X hybrid invoices accept only a closed list in BT-24, and
      Peppol fixes its prefix, so a separate VINvoice identifier could not be announced there.
    </p>
    <p>
      Every vehicle line MUST carry the role row ${Key({ t: REF.role })}, which SHOULD be the second
      row. It says why the vehicle appears on the line, seen from the seller:
    </p>
    <ul class="tokens">
      ${roles.map(
        (r) =>
          html`<li>
            <code>${r}</code>
          </li>`
      )}
    </ul>
    <p class="small">${linkKeys(REF.role.definition)}</p>
    <p>
      <strong>Scope of version ${markerVersion}.</strong> One vehicle per invoice line; a line with the
      role <code>${roles[0]}</code> or <code>${roles[1]}</code> has the quantity 1. Motorised land vehicles
      only; vessels and aircraft are left for a later version.
    </p>
    <p>
      <strong>Workshop and service invoices.</strong> The rows go on one vehicle reference line with the
      value 0.00. Every other line about the same vehicle (labour, parts) carries the VIN in BT-128. A
      document about a single vehicle MAY also carry it once in the invoice object identifier BT-18.
    </p>

    <h2 id="rows">5. Rows: names and values</h2>
    <p>
      Each fact is one BG-32 item attribute: the name goes into BT-160, the value into BT-161. The
      name is the registry label followed by one space and the key in square brackets:
    </p>
    <pre><code>${[
      rowName(REF.make),
      rowName(REF.make, REF.make.labelEn),
      REF.make.statutory ? '' : REF.make.key,
    ]
      .filter(Boolean)
      .join('\n')}</code></pre>
    <p>The three names above are equivalent: German label, English label and bare key.</p>
    <ul>
      <li>
        The label MUST be the German or the English label from the registry. Viewers show it to
        people; software reads only the key in brackets.
      </li>
      <li>
        Keys are case-sensitive, start with <code>${prefix}</code> and follow the <a href="/naming-rules/">naming rules</a>: at most ${registry.keyCap} characters per key and ${registry.nameCap} per name. A two-letter
        segment after the root is a country scope for national facts, as in <code>${prefix}de.</code>.
      </li>
      <li>
        A key MAY be written bare, without label and brackets, unless it is a statutory key. Keys
        that carry a feature required by VAT law MUST always be written with their label, because
        the mandatory particulars of an invoice have to be readable in the structured data:
        ${KeyList({ terms: statutoryTerms })}.
      </li>
      <li>
        A key appears at most once per line. ${repeatableNote}
      </li>
    </ul>
    <p>Values follow the grammar of their key in the registry. In general:</p>
    <ul>
      <li>
        Dates are ISO 8601: <code>YYYY-MM-DD</code>, or <code>YYYY-MM</code> where the key allows it.
      </li>
      <li>
        Numbers have no group separator and use a full stop as decimal mark: <code>48200</code>, not <code>48.200</code> or <code>48,200 km</code>.
      </li>
      <li>
        The unit is part of the key (for example ${Key({ t: REF.odometerKm })} and ${Key({ t: REF.power })}) and never part of the value. See <a href="/code-lists/#units">units</a>.
      </li>
      <li>
        Registry-owned lists use lower-case tokens such as <code>used</code>; codes that an EU or
        international list publishes (vehicle categories, bodywork codes, countries) keep their
        official form, such as <code>M1</code>. Neither is ever translated. See <a href="/code-lists/">code lists</a>.
      </li>
      <li>
        Free text is Unicode NFC, trimmed, without control or bidirectional formatting characters,
        and does not start with <code>=</code>, <code>+</code>, <code>-</code> or <code>@</code>.
      </li>
      <li>
        The value stays in the text element of BT-161. Measure or quantity variants of the element (<code>ram:ValueMeasure</code>, <code>cbc:ValueQuantity</code>) MUST NOT be used for rows.
      </li>
    </ul>

    <h2 id="identification">6. Identifying the vehicle</h2>
    <p>
      The VIN is written twice: as the row ${Key({ t: REF.vin })}, which every invoice viewer shows,
      and in the line object identifier BT-128 with the scheme identifier BT-128-1 = <code>AKG</code> and the document type code <code>130</code>. Both MUST hold the same value. Receivers SHOULD
      also accept <code>VT</code> as scheme on input.
    </p>
    <p>
      BT-157 (item standard identifier) and BT-158 (item classification) MUST NOT be used for the
      VIN: neither has a scheme for it, and custom schemes fail validation outside individual
      national validators.
    </p>
    <p>
      When no VIN is known, BT-128 MAY carry the registration number with the scheme <code>ABZ</code>; the row ${Key({ t: REF.registrationNumber })} then repeats it. A registration number is never a
      VIN.
    </p>

    <h2 id="levels">7. Conformance levels</h2>
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th scope="col">Level</th>
          <th scope="col">Name</th>
          <th scope="col">What the invoice carries</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="num">0</td>
          <td>Identify</td>
          <td>
            The VIN in BT-128 with scheme <code>AKG</code> (or in BT-18 for a single-vehicle document).
            No rows.
          </td>
        </tr>
        <tr>
          <td class="num">1</td>
          <td>Describe</td>
          <td>
            On each vehicle line: the marker, the role and the core rows that apply, including the
            VIN as a row. BT-128 is not required.
          </td>
        </tr>
        <tr>
          <td class="num">2</td>
          <td>Describe and identify</td>
          <td>Level 1, plus the VIN in BT-128 with scheme <code>AKG</code> on every line about the vehicle.</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="prose">
    <p>
      Level 1 exists because some invoice libraries map BG-32 correctly but cannot yet write BT-128
      with its scheme in every syntax. Level 2 is the target. Conformance is self-declared against
      the public <a href="/examples/">test corpus</a>; there is no certification.
    </p>

    <h2 id="bindings">8. Syntax bindings</h2>
    <p>
      VINvoice uses only business terms that EN 16931 already binds to both syntaxes. Paths are
      relative to the invoice line unless they start at the document root.
    </p>
  </div>
  <div class="table-wrap">
    <table class="wrapcode">
      <thead>
        <tr>
          <th scope="col">Business term</th>
          <th scope="col">CII (Factur-X, ZUGFeRD, XRechnung CII)</th>
          <th scope="col">UBL 2.1 (Peppol, XRechnung UBL)</th>
        </tr>
      </thead>
      <tbody>
        ${BINDINGS.map(
          (b) =>
            html`<tr>
              <th scope="row">${b.term}</th>
              <td>${codeSpans(b.cii)}</td>
              <td>${codeSpans(b.ubl)}</td>
            </tr>`
        )}
      </tbody>
    </table>
  </div>
  <div class="prose">
    <p>
      Factur-X EXTENDED MAY additionally mirror ${Key({ t: REF.make })} and ${Key({ t: REF.model })} in its
      own product elements; the rows stay. Other richer syntax elements (CII <code>IndividualTradeProductInstance</code>, UBL <code>ItemInstance</code>) are outside EN 16931 and are not used.
    </p>
    <details>
      <summary>Example: the first line of <code>${featured.cii.name}</code> (CII)</summary>
      <pre><code>${firstLine(featured.cii)}</code></pre>
    </details>
    <details>
      <summary>Example: the first line of <code>${featured.ubl.name}</code> (UBL)</summary>
      <pre><code>${firstLine(featured.ubl)}</code></pre>
    </details>

    <h2 id="reading">9. Reading rules</h2>
    <p>A receiver that reads VINvoice rows SHOULD proceed as follows.</p>
    <ol>
      <li>
        On each line, read the item attributes whose name is <code>Label [key]</code> or a bare key. Other
        item attributes are not VINvoice rows.
      </li>
      <li>
        Treat a line as a vehicle line only if it has a marker with a valid value. Rows on lines
        without a marker are ignored.
      </li>
      <li>
        If the major version in the marker is not one the receiver knows (version ${markerMajor} for this
        draft), skip the rows of that line. Never reject the invoice for it.
      </li>
      <li>
        Check each value against the grammar of its key and drop values that do not match. Ignore
        unknown keys and <a href="/vocabulary/#reserved">reserved names</a>. Ignore vendor rows:
        rows whose name in brackets is not under <code>${prefix}</code> but a reverse-DNS name of a domain
        the vendor controls, such as <code>com.example.stockNumber</code>.
      </li>
      <li>If a key that is not repeatable appears twice, keep the first value.</li>
      <li>
        Take the VIN from BT-128 (scheme <code>AKG</code> or <code>VT</code>); if it is absent, from
        the row ${Key({ t: REF.vin })}; if that is absent too, from BT-18. If BT-128 and the row
        differ, BT-128 wins.
      </li>
      <li>
        A line without a marker whose BT-128 equals the VIN of a vehicle line belongs to that
        vehicle (labour and parts on a workshop invoice). Otherwise such a line identifies a vehicle
        at level 0.
      </li>
      <li>
        VINvoice findings never make an invoice invalid. They only say whether a line claims
        conformance to this convention.
      </li>
    </ol>
    <p>
      The <a href="/validation/#checker">reference checker</a> implements these steps and the rules that
      follow from the registry.
    </p>

    <h2 id="vat">10. VAT and the margin scheme</h2>
    <div class="note draft">
      <p>
        The encodings in this section are provisional until a tax adviser has signed them off in
        writing.
      </p>
    </div>
    <h3>Margin scheme for second-hand goods</h3>
    <p>
      Most used vehicles are sold under the margin scheme (Art. 311 to 325 of the VAT Directive; §
      25a UStG in Germany). EN 16931:2017 has no VAT category for a margin-scheme supply. Every
      margin-scheme vehicle line therefore carries ${Key({ t: REF.marginScheme, value: 'true' })}, so
      that a receiver can tell the margin scheme from a real exemption.
    </p>
    <ul>
      <li>
        Domestic and intra-EU margin-scheme supplies use VAT category <code>E</code> with an exemption
        reason text, and the invoice carries the note
        <q lang="de">Gebrauchtgegenstände/Sonderregelung</q> in BG-1 (Art. 226(14) VAT Directive, § 14a(6)
        UStG).
      </li>
      <li>
        A margin-scheme export to a country outside the EU uses category <code>G</code> with
        <code>VATEX-EU-G</code> and keeps the flag.
      </li>
      <li>
        A margin-scheme line MUST NOT use category <code>K</code> (intra-community supply): the exemption
        for intra-community supplies does not apply to goods taxed under the margin scheme (Art. 139(3)
        VAT Directive; § 25a(7) no. 3 UStG).
      </li>
      <li>
        Under EN 16931-1:2026, category <code>F</code> (margin scheme, second-hand goods) replaces the
        <code>E</code> workaround. The flag MAY still be given.
      </li>
    </ul>
    <h3>New means of transport</h3>
    <p>
      An intra-EU supply of a new means of transport (Art. 2(2)(b) and 138 VAT Directive; §§ 1b, 6a
      and 14a(4) UStG) MUST carry ${Key({ t: REF.newMeansOfTransport, value: 'true' })}. The line then
      states the features that make the vehicle new: ${Key({ t: REF.power })} or ${Key({ t: REF.engineCapacity })}, and an odometer reading or ${Key({ t: REF.firstEntryIntoService })}. A land vehicle counts as
      new if it was first put into service at most six months before the supply or has travelled at
      most 6,000 km.
    </p>
    <p>
      Supplies of new vehicles to buyers in another member state who have no VAT identification
      number (Art. 138(2)(a)) cannot currently be written as a valid EN 16931 invoice, because
      category <code>K</code> requires both VAT identifiers. They are outside the scope of version
      ${markerVersion}.
    </p>
    <p>
      The opposite case is excluded by law as well: a new means of transport supplied to another
      member state under Art. 138(1) or (2)(a) is never a margin-scheme supply (Art. 313(2) VAT
      Directive; § 25a(7) no. 1 b UStG), so such a line does not carry
      ${Key({ t: REF.marginScheme, value: 'true' })}.
    </p>

    <h2 id="never-in-rows">11. What never goes into rows</h2>
    <ul>
      <li>
        Prices, VAT amounts, purchase prices and margins. They stay in the EN 16931 amount and VAT
        terms.
      </li>
      <li>
        Legal wording, such as the margin-scheme statement or an exemption reason. It stays in BG-1
        (invoice note) and BT-120 (VAT exemption reason text).
      </li>
      <li>
        Data about people. A row describes the vehicle, not the buyer, the previous owner or the
        driver.
      </li>
    </ul>

    <h2 id="versioning">12. Versions and EN 16931-1:2026</h2>
    <p>
      The marker carries <code>major.minor</code>. A minor version only adds keys, tokens or labels,
      and receivers ignore what they do not know. A major version gets a new marker value, and
      receivers keep reading the previous major version for 24 months. Keys are never removed or
      redefined, only deprecated. The full rules are under <a href="/governance/#change-process">Governance</a>.
    </p>
    <p>
      EN 16931-1:2026 runs in parallel with the 2017 model during a migration period. It adds an
      attribute code (BT-211) and a unit (BT-212) to BG-32, and margin-scheme VAT categories. It
      adds no vehicle terms. VINvoice rows stay unchanged under both models; once BT-212 is
      available it MAY repeat the unit code that the key already fixes.
    </p>

    <h2 id="personal-data">13. Personal data</h2>
    <p>
      A VIN or a registration number can identify a person when the buyer or keeper is a natural
      person. Write the registration number only where the receiver needs it (service, lease and
      rental) and leave it out on invoices to private persons unless it is required. All examples on
      this site use fictional data.
    </p>

    <h2 id="references">14. References</h2>
    <ul>
      <li>
        EN 16931-1:2017 Electronic invoicing, semantic data model of the core elements of an
        electronic invoice; CEN/TS 16931-3-2 and 3-3 (UBL and CII syntax bindings).
      </li>
      <li>
        <a href="https://docs.peppol.eu/poacc/billing/3.0/codelist/UNCL1153/">UNTDID 1153 Reference code qualifier</a> (scheme <code>AKG</code>, <code>ABZ</code>, <code>VT</code>).
      </li>
      <li>UN/ECE Recommendation 20, codes for units of measure used in international trade.</li>
      <li>
        <a href="https://eur-lex.europa.eu/eli/dir/2006/112/oj">Council Directive 2006/112/EC</a>
        on the common system of value added tax.
      </li>
      <li>
        <a href="https://www.gesetze-im-internet.de/ustg_1980/">Umsatzsteuergesetz (UStG)</a>, in
        particular §§ 1b, 14, 14a and 25a.
      </li>
      <li>
        <a href="https://eur-lex.europa.eu/eli/dir/1999/37/oj">Council Directive 1999/37/EC</a> on the
        registration documents for vehicles (harmonised codes of the registration certificate).
      </li>
      <li>
        <a href="https://eur-lex.europa.eu/eli/reg/2018/858/oj">Regulation (EU) 2018/858</a> on the approval
        of motor vehicles (vehicle categories, certificate of conformity).
      </li>
      <li>
        <a href="https://eur-lex.europa.eu/eli/reg_impl/2021/535/oj">Regulation (EU) 2021/535</a>
        (structure and check digit of the vehicle identification number).
      </li>
    </ul>
  </div>
`
  );
}
