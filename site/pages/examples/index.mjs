import { Base } from '../../layouts/base.mjs';
import { PageHead } from '../../components/page-head.mjs';
import { Rows } from '../../components/rows.mjs';
import { html } from '../../lib/html.mjs';
import { corpus, featured, firstLine, levels } from '../../lib/corpus.mjs';
import { downloads } from '../../lib/downloads.mjs';
import { formatBytes, SITE } from '../../lib/site.mjs';
import { registry, terms } from '../../lib/registry.mjs';

const positive = corpus.filter((f) => !f.negative);
const negative = corpus.filter((f) => f.negative);
const bytes = (/** @type {string} */ s) => new TextEncoder().encode(s).length;
/** @type {Record<string, string>} */
const LICENCE_URL = {
  'CC0 1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'Apache-2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
};
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'VINvoice registry',
  description: `Machine-readable registry of VINvoice, the open convention for vehicle data in EN 16931 e-invoices (Factur-X, ZUGFeRD, XRechnung, Peppol): ${terms.length} keys with English and German labels, definitions, value grammars, units, token lists and legal anchors, a JSON Schema, Schematron rules and ${corpus.length} test invoices.`,
  url: `${SITE.url}/examples/`,
  version: registry.version,
  dateModified: registry.date,
  inLanguage: ['en', 'de'],
  isAccessibleForFree: true,
  license: LICENCE_URL['CC0 1.0'],
  keywords: [
    'e-invoicing',
    'EN 16931',
    'ZUGFeRD',
    'Factur-X',
    'XRechnung',
    'Peppol',
    'vehicle identification number',
    'VIN',
    'automotive',
    'vehicle data',
  ],
  distribution: downloads.map((d) => ({
    '@type': 'DataDownload',
    name: d.file,
    encodingFormat: d.type.split(';')[0],
    contentUrl: `${SITE.url}/downloads/${d.file}`,
    license: LICENCE_URL[d.licence],
  })),
};
/** @type {[string, string, import('../../lib/corpus.mjs').CorpusFile[]][]} */
const groups = [
  ['valid', 'Conforming invoices', positive],
  [
    'negative',
    'Negative controls: valid EN 16931 invoices that the VINvoice checker must flag',
    negative,
  ],
];

export function render({ path }) {
  return Base(
    {
      path,
      title: 'Examples and downloads',
      description:
        'VINvoice test invoices in CII and UBL (Factur-X, XRechnung, Peppol) and the registry as JSON, CSV, JSON-LD, JSON Schema and Schematron.',
      jsonLd,
    },
    html`
  ${PageHead({ title: 'Examples and downloads', lead: 'The registry in machine-readable form, and the test invoices that every example on this site is taken from.' })}

  <h2 id="downloads">Registry files</h2>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th scope="col">File</th>
          <th scope="col">Content</th>
          <th scope="col">Licence</th>
          <th scope="col" class="num">Size</th>
        </tr>
      </thead>
      <tbody>
        ${downloads.map(
          (d) =>
            html`<tr>
              <td>
                <a href="${`/downloads/${d.file}`}" download>
                  <code>${d.file}</code>
                </a>
              </td>
              <td>${d.description}</td>
              <td class="nowrap">
                <a href="/governance/#licences">${d.licence}</a>
              </td>
              <td class="num">${formatBytes(bytes(d.body))}</td>
            </tr>`
        )}
      </tbody>
    </table>
  </div>

  <h2 id="line">One vehicle line in both syntaxes</h2>
  <div class="prose">
    <p>
      The first line of the margin-scheme sale, cut unchanged from the test invoices. The rows and
      the line object identifier carry the same facts in CII and in UBL.
    </p>
  </div>
  ${Rows({ file: featured.cii, caption: `Rows of line 1 in ${featured.cii.name}` })}
  <h3>CII: <code>${featured.cii.name}</code></h3>
  <pre><code>${firstLine(featured.cii)}</code></pre>
  <h3>UBL: <code>${featured.ubl.name}</code></h3>
  <pre><code>${firstLine(featured.ubl)}</code></pre>

  <h2 id="corpus">Test invoices</h2>
  <div class="prose">
    <p>
      ${corpus.length} complete invoices. File names read <code>scenario.carrier.syntax.xml</code>.
      All parties, VINs and plates are fictional; VINs use the test prefix <code>TST</code> with a valid
      check digit. The validation results for every file are on the <a href="/validation/">validation page</a>.
    </p>
  </div>
  ${groups.map(
    ([id, title, files]) =>
      html`<div class="table-wrap">
        <table>
          <caption id="${`corpus-${id}`}">${title}</caption>
          <thead>
            <tr>
              <th scope="col">File</th>
              <th scope="col">Scenario</th>
              <th scope="col">Carrier</th>
              <th scope="col">Level</th>
              <th scope="col" class="num">
                Size
              </th>
            </tr>
          </thead>
          <tbody>
            ${files.map(
              (f) =>
                html`<tr id="${f.name}">
                <td>
                  <a href="${`/examples/${f.name}`}">
                    <code>${f.name}</code>
                  </a>
                </td>
                <td>${f.description}</td>
                <td>
                  ${f.carrier} <span class="muted">(${f.syntax})</span>
                </td>
                <td>${levels(f.name).join(', ')}</td>
                <td class="num">${formatBytes(f.bytes)}</td>
              </tr>`
            )}
          </tbody>
        </table>
      </div>`
  )}
`
  );
}
