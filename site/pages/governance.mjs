import { Base } from '../layouts/base.mjs';
import { PageHead } from '../components/page-head.mjs';
import { html } from '../lib/html.mjs';
import { prefix, markerValue, termsByTier, tiers } from '../lib/registry.mjs';
import { LICENCES, REPO } from '../lib/site.mjs';

const coreTier = tiers[0];
const coreCount = termsByTier(coreTier).length;
const nextMajor = markerValue.replace(/\/([0-9]+)\.[0-9]+$/, (_, m) => `/${Number(m) + 1}.0`);

export function render({ path }) {
  return Base(
    {
      path,
      title: 'Governance',
      description:
        'VINvoice neutrality charter, change process, how to propose a key, and licences: specification CC BY 4.0, registry CC0, code Apache-2.0.',
    },
    html`
  ${PageHead({ title: 'Governance', lead: 'VINvoice is meant to belong to its implementers. These rules apply from the public draft onwards and are themselves open for comment.' })}

  <div class="prose">
    <nav class="toc" aria-labelledby="toc-title">
      <h2 id="toc-title">On this page</h2>
      <ol>
        <li><a href="#charter">Neutrality charter</a></li>
        <li><a href="#change-process">Change process</a></li>
        <li><a href="#propose">How to propose a key</a></li>
        <li><a href="#format-owners">Relation to format owners</a></li>
        <li><a href="#licences">Licences</a></li>
      </ol>
    </nav>

    <h2 id="charter">Neutrality charter</h2>
    <ul>
      <li>
        At least three editors from at least two organisations. No organisation holds more than a
        third of the votes. The sponsoring organisation holds at most one editor seat and has no
        veto.
      </li>
      <li>
        Free to implement, forever. No membership, licence or certification fees. Funding is
        disclosed; the sponsor is named at the foot of every page.
      </li>
      <li>
        No vendor-specific keys in the registry. A vendor that needs its own rows names them with
        the reverse-DNS name of a domain it controls, such as <code>com.example.stockNumber</code>;
        readers ignore them.
      </li>
      <li>
        A key is registered only if two independent organisations will write or read it. Promotion
        to the core tier needs three implementers. The core tier is capped at 15 keys (currently ${coreCount}).
      </li>
      <li>
        Decisions by lazy consensus on a public list: a proposal passes if no editor objects within
        14 days, or 28 days for changes to the core tier.
      </li>
      <li>
        Within 12 months after version 1.0, the repository, the identifier path, the domain and the
        name are assigned to a neutral steward, such as a W3C Community Group or an industry
        association. If the editors are inactive for six months, a succession clause lets such a
        body take over.
      </li>
    </ul>

    <h2 id="change-process">Change process</h2>
    <ul>
      <li>
        The marker <code>${markerValue}</code> carries major and minor version. A minor release only adds
        keys, tokens or labels. Receivers ignore what they do not know, so a minor release never breaks
        a reader.
      </li>
      <li>
        A major release gets a new marker value (<code>${nextMajor}</code>). Receivers keep reading
        the previous major version for 24 months.
      </li>
      <li>
        Keys are never removed or redefined, only deprecated. New keys are provisional for 12 months
        after their first release.
      </li>
      <li>
        At most two minor releases a year, timed around the release windows of the e-invoice formats
        and the EN 16931 code lists.
      </li>
      <li>
        Every release is generated from one source, one YAML file per key in the repository's
        <code>registry/</code> folder: registry, CSV, JSON-LD context, JSON Schema, Schematron, crosswalk
        and test corpus are published together.
      </li>
    </ul>
    <p>
      Key names were reviewed against ISO/IEC 11179, the UN/CEFACT Core Components Technical
      Specification and the terms used in EU law; the result is the <a href="/naming-rules/">naming rules</a>, which every new key follows. The stability rules above apply from version 1.0.
    </p>

    <h2 id="propose">How to propose a key</h2>
    <ol>
      <li>
        Check the <a href="/vocabulary/">vocabulary</a> and the <a href="/downloads/crosswalk.csv">crosswalk</a> for an existing key with the same meaning.
      </li>
      <li>
        Describe the key in the form of a <a href="/vocabulary/">term page</a>: name (after <code>${prefix}</code>, following the <a href="/naming-rules/">naming rules</a>), English and German label,
        definition, representation term, value format and grammar, unit (UN/ECE Rec. 20 code) or
        code list, the conditions under which it is required, and an example value.
      </li>
      <li>
        Anchor the meaning in a source others can check: a field of the EU registration certificate,
        an item of the certificate of conformity, a provision of law, or an existing standard.
      </li>
      <li>Name two independent organisations that will write or read the key.</li>
      ${
        REPO
          ? html`<li>
            Open a <a href="${REPO.issue('propose-key.yml')}">key proposal</a> on GitHub. Once the
            editors agree, the key is added as a pull request with one new file under 
            <a href="${REPO.tree('registry/keys')}">registry/keys/</a>; see 
            <a href="${REPO.file('CONTRIBUTING.md')}">CONTRIBUTING.md</a>.
          </li>`
          : html`<li>
            Send the proposal to the editors. Until the public repository opens, use the contact
            address in the 
            <a href="/impressum/" hreflang="de">
              Impressum
            </a>
            .
          </li>`
      }
    </ol>
    <p>
      Corrections to definitions, labels and examples follow the same route and need no
      implementers.
    </p>

    <h2 id="format-owners">Relation to format owners</h2>
    <p>
      VINvoice is a usage convention. It uses only business terms that EN 16931 already defines, so
      no format owner has to approve or change anything for it to work. VINvoice is not a profile,
      extension or publication of CEN/TC 434, FeRD, KoSIT, OpenPeppol, the European Commission or
      any tax authority, and none of them endorses it. Where one of these bodies publishes names for
      vehicle attributes, VINvoice will align with them and publish a rename table.
    </p>

    <h2 id="licences">Licences</h2>
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th scope="col">Part</th>
          <th scope="col">Licence</th>
        </tr>
      </thead>
      <tbody>
        ${LICENCES.map(
          (l) =>
            html`<tr>
              <td>${l.part}</td>
              <td>
                <a href="${l.url}">${l.licence}</a>
              </td>
            </tr>`
        )}
      </tbody>
    </table>
  </div>
  <div class="prose">
    <p>
      Contributors to the specification grant a royalty-free non-assert for any patent claims
      necessary to implement it. The crosswalk names third-party works and states its sources; it is
      licensed separately so that the registry itself can stay in the public domain.
    </p>
    <p>
      Official validation artefacts (CEN, KoSIT, Peppol, Factur-X) are never bundled with VINvoice.
      They keep their own licences and are obtained from their publishers.
    </p>
  </div>
`
  );
}
