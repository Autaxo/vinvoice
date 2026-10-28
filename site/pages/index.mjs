import { Base } from '../layouts/base.mjs';
import { Rows } from '../components/rows.mjs';
import { Key } from '../components/key.mjs';
import { html } from '../lib/html.mjs';
import { REF, markerValue, terms, tiers, tierLabel, termsByTier } from '../lib/registry.mjs';
import { corpus, featured, validation, problemsOf } from '../lib/corpus.mjs';
import { SITE } from '../lib/site.mjs';

const runs = Object.values(validation.files).flatMap((r) => Object.values(r));
const problems = runs.reduce((n, r) => n + problemsOf(r), 0);

const sections = [
  {
    href: '/specification/',
    title: 'Specification',
    text: 'Rules, conformance levels, CII and UBL bindings, VAT handling.',
  },
  {
    href: '/vocabulary/',
    title: 'Vocabulary',
    text: `All ${terms.length} keys with definitions, value formats and legal anchors.`,
  },
  {
    href: '/code-lists/',
    title: 'Code lists',
    text: 'Closed token lists, units and external lists.',
  },
  {
    href: '/examples/',
    title: 'Examples and downloads',
    text: 'Test invoices in CII and UBL, registry as JSON, CSV and JSON-LD.',
  },
  {
    href: '/validation/',
    title: 'Validation',
    text: 'How the test corpus was validated, and the reference checker.',
  },
  {
    href: '/governance/',
    title: 'Governance',
    text: 'Neutrality charter, change process, how to propose a key, licences.',
  },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE.name,
  url: SITE.url + '/',
  description: 'An open, vendor-neutral convention for structured vehicle data in EU e-invoices.',
  inLanguage: 'en',
};

export function render({ path }) {
  return Base(
    {
      path,
      title: SITE.name,
      description:
        'VINvoice is an open, vendor-neutral convention for vehicle data in EN 16931 e-invoices (Factur-X, ZUGFeRD, XRechnung, Peppol): VIN in BT-128, every other fact as a named BG-32 row.',
      jsonLd,
    },
    html`
  <div class="page-head prose">
    <div class="hero">
      <img src="/favicon.svg" alt="" width="56" height="56" />
      <h1 class="wordmark"><span>VIN</span>voice</h1>
    </div>
    <p class="lead">An open, vendor-neutral convention for vehicle data in EU e-invoices.</p>
  </div>

  <div class="prose">
    <p>
      VINvoice is a usage convention for invoices that follow EN 16931, such as Factur-X and
      ZUGFeRD, XRechnung and Peppol BIS Billing. It is not a new XML format. The vehicle
      identification number goes into the line object identifier BT-128 with the UNTDID 1153 scheme <code>AKG</code>. Every other vehicle fact is one item-attribute row (BG-32), named
      <code>Label [key]</code> and holding a plain value: an ISO date, an integer without separators or
      a lower-case token. A marker row ${Key({ t: REF.marker, value: markerValue })} makes the line a vehicle
      line. Invoices that follow the convention remain valid EN 16931 invoices, so no format owner has
      to change anything.
    </p>

    <ul class="facts-inline" aria-label="Facts about this draft">
      ${tiers.map(
        (tier) =>
          html`<li>
            <strong>${termsByTier(tier).length}</strong> ${tierLabel(tier).toLowerCase()} keys
          </li>`
      )}
      <li><strong>${corpus.length}</strong> test invoices</li>
      <li>
        <strong>${problems}</strong> failed rules in ${runs.length} validator runs
      </li>
    </ul>

    <h2 id="example">Example: a used car on one invoice line</h2>
    <p>
      The rows of a dealer-to-dealer sale under the margin scheme, as they appear in the Factur-X
      invoice <a href="/examples/#${featured.cii.name}"><code>${featured.cii.name}</code></a>. A
      viewer shows the readable label; software reads only the key in brackets.
    </p>
  </div>
  ${Rows({ file: featured.cii, caption: 'BG-32 item attributes and BT-128 of invoice line 1' })}
  <p class="prose small muted">
    All data in examples is fictional. VINs use the test prefix <code>TST</code> with a valid check digit.
    The same line in UBL and the full XML are on the <a href="/examples/">examples page</a>.
  </p>

  <h2>Read further</h2>
  <ul class="cards">
    ${sections.map(
      (s) =>
        html`<li>
          <a href="${s.href}">
            <strong>${s.title}</strong>
            <span>${s.text}</span>
          </a>
        </li>`
    )}
  </ul>
`
  );
}
