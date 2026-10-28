import { Base } from '../layouts/base.mjs';
import { PageHead } from '../components/page-head.mjs';
import { KeyList } from '../components/key-list.mjs';
import { html } from '../lib/html.mjs';
import { terms, tokenLists, unitInfo, linkKeys, registry } from '../lib/registry.mjs';

const own = tokenLists.filter((l) => !l.external);
/** @param {import('../lib/registry.mjs').TokenList} l */
const usedBy = (l) =>
  html`Used by ${KeyList({ terms: l.terms })}${l.note ? html`; ${linkKeys(l.note)}` : ''}.`;
const external = tokenLists.filter((l) => l.external);

/** @type {Map<string, { name: string, code: string | null, note?: string, terms: typeof terms }>} */
const units = new Map();
for (const t of terms) {
  const u = unitInfo(t);
  if (!u) continue;
  const id = u.code ?? u.name;
  const seen = units.get(id);
  if (seen) seen.terms.push(t);
  else units.set(id, { ...u, terms: [t] });
}

export function render({ path }) {
  return Base(
    {
      path,
      title: 'Code lists',
      description:
        'Token lists defined by VINvoice, the EU and international code lists its values follow, and the units of measure fixed by its keys.',
    },
    html`
  ${PageHead({ title: 'Code lists', lead: 'Two kinds of value: codes that an EU or international instrument publishes are used verbatim; everything else is a registry-owned lower-case token.' })}

  <nav class="toc" aria-labelledby="toc-title">
    <h2 id="toc-title">On this page</h2>
    <ol>
      <li><a href="#policy">Token policy</a></li>
      ${own.map(
        (l) =>
          html`<li>
            <a href="#${l.anchor}">${l.title}</a>
          </li>`
      )}
      <li><a href="#external">External code lists</a></li>
      <li><a href="#units">Units of measure</a></li>
    </ol>
  </nav>

  <div class="prose">
    <h2 id="policy">Token policy</h2>
    <p>${linkKeys(registry.tokenPolicy)}</p>
    <p>
      A minor release may add tokens; receivers treat a token they do not know like a missing value.
      Tokens are never removed or redefined. The naming of tokens follows the <a href="/naming-rules/">naming rules</a>.
    </p>
  </div>

  <h2 id="lists">Lists owned by the registry</h2>
  ${own.map(
    (l) =>
      html`<section aria-labelledby="${l.anchor}">
        <h3 id="${l.anchor}">
          <code>${l.title}</code>
        </h3>
        ${l.terms.length > 0 && html`<p>${usedBy(l)}</p>`}
        <ul class="tokens" aria-label="Tokens of ${l.title}">
          ${l.tokens.map(
            (tok) =>
              html`<li>
              <code>${tok}</code>
            </li>`
          )}
        </ul>
        <p class="small muted">${linkKeys(l.source)}</p>
      </section>`
  )}

  <h2 id="external">External code lists</h2>
  <div class="prose">
    <p>
      These values come from lists that VINvoice does not maintain. They are written exactly as the
      instrument publishes them; the key's grammar fixes the written form.
    </p>
  </div>
  ${external.map(
    (l) =>
      html`<section aria-labelledby="${l.anchor}">
        <h3 id="${l.anchor}">${l.title}</h3>
        ${l.terms.length > 0 && html`<p>${usedBy(l)}</p>`}
        <ul class="tokens" aria-label="Codes of ${l.title}">
          ${l.tokens.map(
            (tok) =>
              html`<li>
              <code>${tok}</code>
            </li>`
          )}
        </ul>
        <p class="small muted">${linkKeys(l.source)}</p>
      </section>`
  )}

  <h2 id="units">Units of measure</h2>
  <div class="prose">
    <p>
      Each quantity has exactly one unit, fixed by its key and named with its UN/ECE Recommendation
      20 code. The value is a bare number. If EN 16931-1:2026 adds a unit to item attributes
      (BT-212; assumed, not yet checked against the standard), the code below is the one to use.
    </p>
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th scope="col">Rec. 20 code</th>
          <th scope="col">Unit</th>
          <th scope="col">Keys</th>
        </tr>
      </thead>
      <tbody>
        ${[...units.values()].map(
          (u) =>
            html`<tr>
              <td>${u.code ? html`<code>${u.code}</code>` : html`<span class="muted">none</span>`}</td>
              <td>
                ${u.name}
                ${u.note && html`<span class="small muted"> (${u.note})</span>`}
              </td>
              <td>
                ${KeyList({ terms: u.terms })}
              </td>
            </tr>`
        )}
      </tbody>
    </table>
  </div>
`
  );
}
