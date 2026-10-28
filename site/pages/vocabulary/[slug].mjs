import { Base } from '../../layouts/base.mjs';
import { PageHead } from '../../components/page-head.mjs';
import { html } from '../../lib/html.mjs';
import {
  terms,
  slug,
  termUrl,
  tierLabel,
  rowName,
  unitInfo,
  tokenListsFor,
  countryScope,
  linkKeys,
  splitList,
  crosswalkFor,
  crosswalkHeader,
  registry,
} from '../../lib/registry.mjs';
import { corpusValues } from '../../lib/corpus.mjs';
import { SITE, REPO } from '../../lib/site.mjs';

/** One page per key (what getStaticPaths was): the term and its neighbours in registry order. */
export function paths() {
  return terms.map((t, i) => ({
    params: { slug: slug(t) },
    props: { t, prev: terms[i - 1], next: terms[i + 1] },
  }));
}

/**
 * @param {object} ctx
 * @param {string} ctx.path
 * @param {{ t: import('../../lib/registry.mjs').Term, prev?: import('../../lib/registry.mjs').Term, next?: import('../../lib/registry.mjs').Term }} ctx.props
 */
export function render({ path, props: { t, prev, next } }) {
  const unit = unitInfo(t);
  const lists = tokenListsFor(t);
  const scope = countryScope(t);
  const anchors = splitList(t.anchors);
  const examples = corpusValues(t.key).slice(0, 5);
  const crosswalk = crosswalkFor(t);
  const crosswalkNote = crosswalkHeader[1]?.match(/\(([^)]*)\)/)?.[1];
  // One source file per key: registry/keys/<key without the root>.yaml
  const keyFile = `registry/keys/${t.key.replace(/^vehicle\./, '')}.yaml`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    '@id': SITE.url + termUrl(t),
    identifier: registry.iriBase + t.key.slice(registry.root.length + 1),
    termCode: t.key,
    name: t.labelEn,
    alternateName: { '@language': 'de', '@value': t.labelDe },
    description: t.definition,
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      '@id': `${SITE.url}/vocabulary/`,
      version: registry.version,
    },
  };

  return Base(
    { path, title: `${t.key}: ${t.labelEn}`, description: t.definition, jsonLd },
    html`
  ${PageHead(
    {
      title: t.key,
      crumbs: [
        { href: '/vocabulary/', label: 'Vocabulary' },
        { href: `/vocabulary/#tier-${t.tier}`, label: tierLabel(t.tier) },
      ],
    },
    html`
    <p class="lead">
      ${t.labelEn}
      <span class="muted">·</span>
      <span lang="de">${t.labelDe}</span> 
      ${t.statutory && html`<span class="tag statutory">statutory</span>`}
      ${t.status !== 'draft' && html`<span class="tag provisional">${t.status}</span>`}
    </p>
  `
  )}

  <div class="prose">
    <p>${linkKeys(t.definition)}</p>
  </div>

  <dl class="facts">
    <dt>Key</dt>
    <dd><code>${t.key}</code></dd>

    <dt>Row name (BT-160)</dt>
    <dd>
      <code>${rowName(t)}</code><br />
      <code>${rowName(t, t.labelEn)}</code>
      ${
        t.statutory
          ? html`<p class="small muted dd-note">
            The labelled form is mandatory: VAT law requires the feature to be readable in the
            invoice.
          </p>`
          : html`<p class="small muted dd-note">
            The bare key <code>${t.key}</code> is also accepted.
          </p>`
      }
    </dd>

    <dt>Tier</dt>
    <dd><a href="${`/vocabulary/#tier-${t.tier}`}">${tierLabel(t.tier)}</a></dd>

    <dt>Status</dt>
    <dd>${t.status}</dd>

    ${
      scope &&
      html`
          <dt>Country scope</dt>
          <dd>
            <code>${scope}</code>: a national key, used only for facts that the law or an authority
            of that state defines. See the <a href="/naming-rules/#national">naming rules</a>.
          </dd>
        `
    }

    <dt>Representation term</dt>
    <dd>${t.representationTerm}</dd>

    <dt>Value format</dt>
    <dd>${linkKeys(t.valueFormat)}</dd>

    <dt>Grammar</dt>
    <dd><code>${t.grammar}</code></dd>

    <dt>Unit</dt>
    <dd>
      ${
        unit
          ? html`
            ${unit.name}${
              unit.code &&
              html`<span class="muted">
                 
                (UN/ECE Rec. 20 code <code>${unit.code}</code>)
              </span>`
            }${unit.note && html`<span class="muted"> (${unit.note})</span>`}
            <br />
            <span class="small muted dd-note">
              The unit is part of the key and never part of the value.
            </span>
          `
          : html`<span class="muted">none</span>`
      }
    </dd>

    <dt>Code list</dt>
    <dd>
      ${
        lists.length > 0
          ? lists.map(
              (l) =>
                html`<p class="flush">
              <a href="${`/code-lists/#${l.anchor}`}">${l.title}</a>
            </p>`
            )
          : html`<span>${linkKeys(t.codeList)}</span>`
      }
      ${
        t.tokens.length > 0 &&
        html`<ul class="tokens dd-note">
            ${t.tokens.map(
              (tok) =>
                html`<li>
                <code>${tok}</code>
              </li>`
            )}
          </ul>`
      }
    </dd>

    <dt>Required when</dt>
    <dd>${linkKeys(t.conditionality)}</dd>

    <dt>Statutory feature</dt>
    <dd>${t.statutory ? 'Yes' : 'No'}</dd>

    <dt>Repeatable</dt>
    <dd>${t.repeatable ? 'Yes, one row per value' : 'No, at most one row per line'}</dd>

    <dt>Anchors</dt>
    <dd>
      ${
        anchors.length > 1
          ? html`<ul>
            ${anchors.map((a) => html`<li>${linkKeys(a)}</li>`)}
          </ul>`
          : html`<span>${linkKeys(t.anchors)}</span>`
      }
    </dd>

    <dt>Carrier and binding</dt>
    <dd>${linkKeys(t.carrier)}</dd>

    ${
      examples.length > 0 &&
      html`
          <dt>Values in the test corpus</dt>
          <dd>
            <ul class="tokens">
              ${examples.map(
                (v) =>
                  html`<li>
                  <code>${v}</code>
                </li>`
              )}
            </ul>
          </dd>
        `
    }

    ${
      crosswalk.length > 0 &&
      html`
          <dt>Crosswalk (informative)</dt>
          <dd>
            ${crosswalk.map((c) => html`<p class="flush">${c}</p>`)}
            ${crosswalkNote && html`<p class="small muted dd-note">${crosswalkNote}</p>`}
          </dd>
        `
    }

    ${
      REPO &&
      html`
          <dt>Source and changes</dt>
          <dd>
            <a href="${REPO.file(keyFile)}">
              <code>${keyFile}</code>
            </a> 
            · 
            <a href="${`${REPO.issue('change-key.yml')}&key=${encodeURIComponent(t.key)}`}">
              Propose a change
            </a>
          </dd>
        `
    }
  </dl>

  <nav class="pager" aria-label="Neighbouring keys">
    <span>
      ${
        prev &&
        html`<a href="${termUrl(prev)}" rel="prev">
            ← <code>${prev.key}</code>
          </a>`
      }
    </span>
    <span>
      ${
        next &&
        html`<a href="${termUrl(next)}" rel="next">
            <code>${next.key}</code> →
          </a>`
      }
    </span>
  </nav>
`
  );
}
