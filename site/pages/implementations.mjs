import { Base } from '../layouts/base.mjs';
import { PageHead } from '../components/page-head.mjs';
import { html } from '../lib/html.mjs';
import { readJson } from '../lib/paths.mjs';
import { corpus } from '../lib/corpus.mjs';
import { REPO } from '../lib/site.mjs';

/**
 * @typedef {object} Implementation
 * @property {string} name
 * @property {string} organisation
 * @property {string} url
 * @property {'writes' | 'reads' | 'writes and reads'} role
 * @property {number} level
 * @property {string[]} syntaxes
 * @property {string} registry
 * @property {string} since
 */
/** @type {Implementation[]} */
const list = readJson('site/data/implementations.json');

export function render({ path }) {
  return Base(
    {
      path,
      title: 'Implementations',
      description:
        'Software that writes or reads VINvoice vehicle data in e-invoices, and how to get listed.',
    },
    html`
  ${PageHead({ title: 'Implementations', lead: 'Software that writes or reads VINvoice rows, as declared by its makers.' })}

  ${
    list.length === 0
      ? html`<div class="note prose">
        <p>No implementations are listed yet.</p>
      </div>`
      : html`<div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Software</th>
              <th scope="col">Organisation</th>
              <th scope="col">Role</th>
              <th scope="col">Level</th>
              <th scope="col">Syntax</th>
              <th scope="col">Registry</th>
              <th scope="col">Listed since</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(
              (i) =>
                html`<tr>
                <td>
                  <a href="${i.url}">${i.name}</a>
                </td>
                <td>${i.organisation}</td>
                <td>${i.role}</td>
                <td class="num">${i.level}</td>
                <td>${i.syntaxes.join(', ')}</td>
                <td>
                  <code>${i.registry}</code>
                </td>
                <td>${i.since}</td>
              </tr>`
            )}
          </tbody>
        </table>
      </div>`
  }

  <div class="prose">
    <h2 id="get-listed">How to get listed</h2>
    <p>
      Listing is free and based on self-declaration. There is no certification, and a listing is not
      an endorsement.
    </p>
    <ol>
      <li>
        <strong>If your software writes invoices:</strong> produce invoices for the scenarios you support,
        validate them with the official validators of your format and with the <a href="/validation/#checker">reference checker</a>. The checker must report no errors.
      </li>
      <li>
        <strong>If your software reads invoices:</strong> import the ${corpus.length}
        <a href="/examples/#corpus">test invoices</a> and confirm that you read the vehicle data of the
        conforming files and handle the negative controls as the <a href="/specification/#reading">reading rules</a> describe.
      </li>
      <li>
        Send the editors the name of the software, your organisation, whether it writes or reads,
        the conformance level (0, 1 or 2), the syntaxes (CII, UBL), the registry version you
        implement and a public link to your documentation. 
        ${
          REPO
            ? html`
              Use the <a href="${REPO.issue('list-implementation.yml')}">listing form</a> on GitHub.
            `
            : html`
              Until the public repository opens, use the contact address in the 
              <a href="/impressum/" hreflang="de">
                Impressum
              </a>
              .
            `
        }
      </li>
    </ol>
    <p>
      Entries are reviewed for completeness only. An entry is removed if its maker asks for it or if
      the software no longer exists.
    </p>
  </div>
`
  );
}
