import { Base } from '../../layouts/base.mjs';
import { PageHead } from '../../components/page-head.mjs';
import { Key } from '../../components/key.mjs';
import { html } from '../../lib/html.mjs';
import {
  registry,
  terms,
  tiers,
  tierLabel,
  termsByTier,
  termUrl,
  unitInfo,
  valueSummary,
  reserved,
  REF,
} from '../../lib/registry.mjs';
import { SITE } from '../../lib/site.mjs';

const setUrl = `${SITE.url}/vocabulary/`;
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'DefinedTermSet',
  '@id': setUrl,
  name: 'VINvoice vocabulary',
  description: 'Keys for vehicle data in EN 16931 item attributes (BG-32).',
  version: registry.version,
  dateModified: registry.date,
  license: 'https://creativecommons.org/publicdomain/zero/1.0/',
  hasDefinedTerm: terms.map((t) => ({
    '@type': 'DefinedTerm',
    '@id': SITE.url + termUrl(t),
    termCode: t.key,
    name: t.labelEn,
  })),
};

/** @type {Record<string, string>} */
const tierText = {
  core: 'Needed to identify and describe a vehicle on sales, trade-in and workshop invoices, plus the statutory features of VAT law.',
  recommended: 'Widely available facts that receivers commonly ask for.',
  optional: 'Provisional for 12 months after first publication; some wait for a legal review.',
};

export function render({ path }) {
  return Base(
    {
      path,
      title: 'Vocabulary',
      description: `All ${terms.length} VINvoice keys by tier, with labels, value formats and units.`,
      jsonLd,
    },
    html`
  ${PageHead({ title: 'Vocabulary', lead: `${terms.length} keys in ${tiers.length} tiers. Each key has its own page with the definition, value format, conditions and legal anchors.` })}

  <div class="prose">
    <p>
      A row name is the registry label followed by the key in brackets, for example
      <code>${REF.make.labelDe} [${REF.make.key}]</code>. Keys marked <span class="tag statutory">statutory</span> carry a feature that VAT law requires on the invoice; they must always be written with their label.
      The marker ${Key({ t: REF.marker })} is listed first because every vehicle line starts with it.
    </p>
  </div>

  <div class="filter" id="filter" hidden>
    <label for="q">Filter keys</label>
    <input id="q" type="search" autocomplete="off" spellcheck="false" placeholder="key, label or unit" />
    <output for="q" id="q-count" aria-live="polite"></output>
  </div>

  ${tiers.map(
    (tier) =>
      html`<section aria-labelledby="tier-${tier}" data-tier>
        <h2 id="tier-${tier}">
          ${tierLabel(tier)} <span class="muted">(${termsByTier(tier).length})</span>
        </h2>
        ${tierText[tier] && html`<p class="prose">${tierText[tier]}</p>`}
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Key</th>
                <th scope="col">Label (EN)</th>
                <th scope="col">Label (DE)</th>
                <th scope="col">Representation</th>
                <th scope="col">Unit</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              ${termsByTier(tier).map((t) => {
                const unit = unitInfo(t);
                return html`<tr data-search="${[
                  t.key,
                  t.labelEn,
                  t.labelDe,
                  unit?.name ?? '',
                  unit?.code ?? '',
                ]
                  .join(' ')
                  .toLowerCase()}">
                    <td>
                      <a href="${termUrl(t)}">
                        <code>${t.key}</code>
                      </a>
                    </td>
                    <td>${t.labelEn}</td>
                    <td lang="de">${t.labelDe}</td>
                    <td class="small">${valueSummary(t)}</td>
                    <td class="small">${unit ? unit.name : ''}</td>
                    <td>
                      ${t.statutory && html`<span class="tag statutory">statutory</span>`}
                      ${t.status !== 'draft' && html`<span class="tag provisional">${t.status}</span>`}
                    </td>
                  </tr>`;
              })}
            </tbody>
          </table>
        </div>
      </section>`
  )}

  ${
    reserved.length > 0 &&
    html`<section aria-labelledby="reserved">
        <h2 id="reserved">
          Reserved names <span class="muted">(${reserved.length})</span>
        </h2>
        <p class="prose">
          These names are reserved and are <strong>not keys</strong>. Do not write them; readers
          ignore them. They may not be used for any other meaning.
        </p>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Reserved name</th>
                <th scope="col">Label (EN)</th>
                <th scope="col">Label (DE)</th>
              </tr>
            </thead>
            <tbody>
              ${reserved.map(
                (r) =>
                  html`<tr>
                  <td>
                    <code>${r.key}</code> <span class="tag provisional">reserved</span>
                  </td>
                  <td>${r.labelEn}</td>
                  <td lang="de">${r.labelDe}</td>
                </tr>`
              )}
            </tbody>
          </table>
        </div>
      </section>`
  }

  <p class="small muted prose">
    Also available as <a href="/downloads/registry.json">registry.json</a>, <a href="/downloads/registry.csv">registry.csv</a>, <a href="/downloads/context.jsonld">context.jsonld</a> and as a JSON Schema, <a href="/downloads/vehicle-facts.schema.json">vehicle-facts.schema.json</a> (CC0 1.0).
  </p>

  <script src="/vocabulary-filter.js" defer></script>
`
  );
}
