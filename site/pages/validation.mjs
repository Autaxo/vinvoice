import { Base } from '../layouts/base.mjs';
import { PageHead } from '../components/page-head.mjs';
import { Key } from '../components/key.mjs';
import { html } from '../lib/html.mjs';
import { REF, linkKeys, registry, prefix } from '../lib/registry.mjs';
import { corpus, validation, checker, levels, problemsOf } from '../lib/corpus.mjs';
import { REPO } from '../lib/site.mjs';

/** @type {Record<string, string>} */
const SHORT = {
  'xsd-fx': 'Factur-X XSD',
  'xsd-d16b': 'CII D16B XSD',
  'xsd-ext': 'Factur-X EXT XSD',
  'xsd-ubl': 'UBL 2.1 XSD',
  cen: 'CEN',
  fx: 'Factur-X',
  fxext: 'Factur-X EXT',
  xr: 'XRechnung',
  peppol: 'Peppol',
};
const validators = validation.validators.filter((v) =>
  Object.values(validation.files).some((r) => r[v.id])
);

const summary = validators.map((v) => {
  const results = corpus.map((f) => validation.files[f.name]?.[v.id]).filter(Boolean);
  return {
    ...v,
    files: results.length,
    problems: results.reduce((n, r) => n + problemsOf(r), 0),
    fired: results.reduce((n, r) => n + ('firedRules' in r ? r.firedRules : 0), 0),
  };
});

/** @param {string} name */
const findings = (name) => checker[name]?.findings ?? [];
/**
 * @param {string} name
 * @param {string} sev
 */
const count = (name, sev) => findings(name).filter((f) => f.severity === sev).length;
const negatives = corpus.filter((f) => f.negative);

export function render({ path }) {
  return Base(
    {
      path,
      title: 'Validation',
      description:
        'How the VINvoice test invoices were validated against the CEN, Factur-X, XRechnung and Peppol rules, and the reference checker for the convention itself.',
    },
    html`
  ${PageHead({ title: 'Validation', lead: 'Two questions, two kinds of tools: is the invoice a valid EN 16931 invoice in its syntax and profile, and does it follow VINvoice?' })}

  <div class="prose">
    <h2 id="method">How the corpus was validated</h2>
    <p>
      Every test invoice was checked with the official validation artefacts of each format it
      claims: the XML schemas, the CEN EN 16931 schematron and the schematron of the national or
      network profile. XSD validation ran on a Java 21 runtime (Eclipse Temurin); the schematron
      rules ran as compiled XSLT with Saxon-HE 12.5. The artefacts were downloaded from their
      publishers and used unchanged. They are not redistributed here.
    </p>
  </div>

  <div class="table-wrap">
    <table>
      <caption>Results by validator</caption>
      <thead>
        <tr>
          <th scope="col">Validator</th>
          <th scope="col" class="num">Files</th>
          <th scope="col" class="num">Rules fired</th>
          <th scope="col" class="num">Failed</th>
        </tr>
      </thead>
      <tbody>
        ${summary.map(
          (s) =>
            html`<tr>
              <th scope="row">${s.name}</th>
              <td class="num">${s.files}</td>
              <td class="num">${s.kind === 'svrl' ? s.fired : '–'}</td>
              <td class="num ${s.problems ? 'err' : 'ok'}">${s.problems}</td>
            </tr>`
        )}
      </tbody>
    </table>
  </div>
  <p class="small muted prose">
    “Failed” counts schema errors (XSD) and failed assertions plus reports (schematron), warnings
    included. “Rules fired” is the number of schematron rule contexts that matched, summed over all
    files.
  </p>

  <h3 id="matrix">Results per file</h3>
  <div class="table-wrap">
    <table>
      <caption>Failed rules per file and validator (– = not applicable to this file)</caption>
      <thead>
        <tr>
          <th scope="col">File</th>
          ${validators.map(
            (v) =>
              html`<th scope="col" class="num">
                <abbr title="${v.name}">${SHORT[v.id] ?? v.id}</abbr>
              </th>`
          )}
          <th scope="col">VINvoice checker</th>
        </tr>
      </thead>
      <tbody>
        ${corpus.map(
          (f) =>
            html`<tr>
              <th scope="row">
                <a href="/examples/#${f.name}">
                  <code>${f.name}</code>
                </a>
              </th>
              ${validators.map((v) => {
                const r = validation.files[f.name]?.[v.id];
                return r
                  ? html`<td class="num ${problemsOf(r) ? 'err' : 'ok'}">${problemsOf(r)}</td>`
                  : html`<td class="num muted">–</td>`;
              })}
              <td class="small">
                level ${levels(f.name).join(', ') || '–'}
                ${
                  count(f.name, 'error') > 0 &&
                  html`<span class="err"> · ${count(f.name, 'error')} errors</span>`
                }
                ${
                  count(f.name, 'warning') > 0 &&
                  html`<span class="warn"> · ${count(f.name, 'warning')} warnings</span>`
                }
                ${
                  count(f.name, 'info') > 0 &&
                  html`<span class="muted"> · ${count(f.name, 'info')} info</span>`
                }
              </td>
            </tr>`
        )}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <h3 id="liveness">Are the validators live?</h3>
    <p>
      A run with zero findings proves little unless the same setup also rejects broken input.
      Deliberately broken copies of the test invoices were rejected as expected: the scheme
      <code>VIN</code> instead of <code>AKG</code> fails the CEN rule BR-CL-07; two line object identifiers
      on one line fail the XSD and the Peppol rule R100; two invoice notes on a cross-border Peppol invoice
      fail the Peppol rule R002.
    </p>
    <h3 id="not-run">Not yet run</h3>
    <p>
      The KoSIT validator application, the official FNFE and FeRD validators, Mustangproject, Peppol
      BIS 3.0.21, delivery through Peppol access points, and import into accounting and procurement
      systems. Results will be added here as they come in.
    </p>

    <h2 id="checker">Reference checker</h2>
    <p>
      The format validators above do not know VINvoice. The reference checker reads an invoice (CII
      or UBL), applies the <a href="/specification/#reading">reading rules</a> and reports where a vehicle
      line departs from the convention. It takes grammars, labels and the statutory flag from <a href="/downloads/registry.json">registry.json</a>, so it follows the registry without code changes. It never rejects an invoice: an error
      means only that the line does not conform to VINvoice. The checker is a single Python file
      without dependencies, licensed under Apache-2.0${
        REPO
          ? html`

            (<a href="${REPO.file('checker/vehicle_check.py')}">checker/vehicle_check.py</a>)
          `
          : ''
      }. A regression test runs it on every test invoice and compares the result with the expected
      findings.
    </p>
    <h3 id="schematron">Schematron</h3>
    <p>
      The same rules are published as ISO Schematron, <a href="/downloads/vinvoice.sch">vinvoice.sch</a>, generated from the registry. It runs on CII and UBL invoices in any XSLT 2.0 Schematron
      processor, next to the EN 16931 and national rules. Rule identifiers match the checker. The
      VIN check digit (V-05), the six-months-or-6,000-km test of V-08, the registration-number
      comparison (V-18) and the reader notes on level 0 and attached lines (V-19, V-20) stay with
      the checker. On the test corpus both report the same errors and warnings; continuous
      integration checks this on every change.
    </p>
  </div>

  <div class="table-wrap">
    <table>
      <caption>Checker rules</caption>
      <thead>
        <tr>
          <th scope="col">Rule</th>
          <th scope="col">Severity</th>
          <th scope="col">Finding</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row" class="nowrap">V-01</th><td class="err">error</td>
          <td>A marker ${Key({ t: REF.marker })} without a role row ${Key({ t: REF.role })}.</td>
        </tr>
        <tr>
          <th scope="row" class="nowrap">V-02</th><td class="err">error</td>
          <td>
            A value does not match the grammar of its key and is dropped, or the marker value is
            malformed and the line is treated as unmarked.
          </td>
        </tr>
        <tr>
          <th scope="row" class="nowrap">V-03</th><td class="warn">warning</td>
          <td>A key that is not repeatable appears twice on a line; the first value is kept.</td>
        </tr>
        <tr>
          <th scope="row" class="nowrap">V-04</th><td class="warn">warning</td>
          <td>
            BT-128 and the row ${Key({ t: REF.vin })} differ. With scheme <code>AKG</code> BT-128 wins; with
            scheme <code>VT</code> (read only when the value has the form of a VIN) the row wins.
          </td>
        </tr>
        <tr>
          <th scope="row" class="nowrap">V-05</th>
          <td><span class="warn">warning</span>, <span class="muted">info</span></td>
          <td>
            <strong>Form</strong> (warning): the VIN is not 17 characters from <code>A</code> to <code>Z</code>
            and <code>0</code> to <code>9</code> without <code>I</code>, <code>O</code> and <code>Q</code>
            (Regulation (EU) 2021/535, Annex II Part 2, Section A, points 2.1 to 2.8).
            <strong>Check digit</strong>: position 9 fails the check-digit rule of Section A, point 2.4 (formula in Section C). This is a
            warning when ${Key({ t: REF.firstRegistrationDate })} is on or after 2026-07-07 and the category
            is M, N, O or not given, and information in every other case. Since 7 July 2026 Art. 12(2) of
            the regulation makes a correct check digit a condition for the registration, placing on the
            market and entry into service of M, N and O vehicles; before that it was required only for new
            types approved from 6 July 2022 (Art. 12(1)). Vehicles registered earlier, L-category vehicles
            and vehicles first registered outside the EU can therefore carry a wrong digit legitimately. The
            first registration date is a proxy, not proof; a partial date counts as its last day. A line
            without a registration date always gets information, even though Art. 12(2) also covers a
            vehicle placed on the market without a registration, which the checker cannot see. Never an
            error.
          </td>
        </tr>
        <tr>
          <th scope="row" class="nowrap">V-06</th><td class="err">error</td>
          <td>A supply or trade-in line with a quantity other than 1.</td>
        </tr>
        <tr>
          <th scope="row" class="nowrap">V-07</th><td><span class="err">error</span>, <span class="warn">warning</span></td>
          <td>
            ${Key({ t: REF.marginScheme })} on a line with VAT category <code>K</code> (error); with a category
            other than <code>E</code>, <code>F</code> or <code>G</code>, without the margin-scheme
            note in BG-1, or together with condition <code>new</code> (warnings).
          </td>
        </tr>
        <tr>
          <th scope="row" class="nowrap">V-08</th><td><span class="err">error</span>, <span class="warn">warning</span></td>
          <td>
            ${Key({ t: REF.newMeansOfTransport })} without ${Key({ t: REF.power })} or ${Key({ t: REF.engineCapacity })}, or without any newness feature (errors); without an odometer reading, registered but
            without ${Key({ t: REF.firstEntryIntoService })}, or beyond both 6,000 km and six months
            (warnings).
          </td>
        </tr>
        <tr>
          <th scope="row" class="nowrap">V-09</th><td><span class="warn">warning</span>, <span class="muted">info</span></td>
          <td>
            A used vehicle supplied or traded in without an odometer reading or a status saying none
            is available (warning; only where ${Key({ t: REF.category })} is empty or an M, N or L category);
            without ${Key({ t: REF.firstRegistrationDate })} (info: correct only if it was never registered).
          </td>
        </tr>
        <tr>
          <th scope="row" class="nowrap">V-10</th><td class="warn">warning</td>
          <td>
            A service line without VIN or registration number, or without an odometer reading or
            status (for vehicles that have an odometer).
          </td>
        </tr>
        <tr>
          <th scope="row" class="nowrap">V-11</th><td><span class="err">error</span>, <span class="muted">info</span></td>
          <td>
            A statutory key written without its label (error); a key longer than ${registry.keyCap}
            or a name longer than ${registry.nameCap} characters, a label that is not in the registry,
            or a marker that is not the first row (info).
          </td>
        </tr>
        <tr>
          <th scope="row" class="nowrap">V-12</th><td class="err">error</td>
          <td>More than one BT-128 on a line.</td>
        </tr>
        <tr>
          <th scope="row" class="nowrap">V-13</th><td class="err">error</td>
          <td>${Key({ t: REF.odometerKm })} and ${Key({ t: REF.odometerMi })} on the same line.</td>
        </tr>
        <tr>
          <th scope="row" class="nowrap">V-14</th><td class="err">error</td>
          <td>A row uses the measure or quantity variant of BT-161 instead of its text value.</td>
        </tr>
        <tr>
          <th scope="row" class="nowrap">V-15</th><td class="muted">info</td>
          <td>Rows on a line without a marker are ignored.</td>
        </tr>
        <tr>
          <th scope="row" class="nowrap">V-16</th><td class="warn">warning</td>
          <td>${Key({ t: REF.stateOfHealth })} without ${Key({ t: REF.stateOfHealthDate })} or without ${Key({ t: REF.stateOfHealthMethod })}.</td>
        </tr>
        <tr>
          <th scope="row" class="nowrap">V-17</th><td class="err">error</td>
          <td>
            An odometer reading although ${Key({ t: REF.odometerStatus })} says the reading is not available.
          </td>
        </tr>
        <tr>
          <th scope="row" class="nowrap">V-18</th><td class="warn">warning</td>
          <td>A registration number in BT-128 (scheme <code>ABZ</code>) differs from ${Key({ t: REF.registrationNumber })}.</td>
        </tr>
        <tr>
          <th scope="row" class="nowrap">V-19</th><td class="muted">info</td>
          <td>Level 0: a vehicle identified only by BT-128 or BT-18.</td>
        </tr>
        <tr>
          <th scope="row" class="nowrap">V-20</th><td class="muted">info</td>
          <td>A line without a marker is attached to a vehicle through its BT-128.</td>
        </tr>
        <tr>
          <th scope="row" class="nowrap">V-21</th><td class="warn">warning</td>
          <td>Unknown major version in the marker; the rows of that line are skipped.</td>
        </tr>
        <tr>
          <th scope="row" class="nowrap">V-22</th><td class="muted">info</td>
          <td>
            Unknown key or <a href="/vocabulary/#reserved">reserved name</a>, ignored. Vendor rows
            (reverse-DNS names outside <code>${prefix}</code>) are ignored without a finding.
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <h3 id="checker-negative">Checker output for the negative controls</h3>
  ${negatives.map(
    (f) =>
      html`<details>
        <summary>
          <code>${f.name}</code>
          <span class="muted small">(${findings(f.name).length} findings)</span>
        </summary>
        <p class="small">${f.description}</p>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Rule</th>
                <th scope="col">Severity</th>
                <th scope="col">Line</th>
                <th scope="col">Message</th>
              </tr>
            </thead>
            <tbody>
              ${findings(f.name).map(
                (x) =>
                  html`<tr>
                  <td>${x.rule}</td>
                  <td class="${x.severity === 'error' ? 'err' : x.severity === 'warning' ? 'warn' : 'muted'}">
                    ${x.severity}
                  </td>
                  <td class="num">${x.line ?? '–'}</td>
                  <td class="small">${linkKeys(x.msg)}</td>
                </tr>`
              )}
            </tbody>
          </table>
        </div>
      </details>`
  )}
`
  );
}
