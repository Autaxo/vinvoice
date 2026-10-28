// BG-32 rows of the first invoice line of a corpus file, as a two-column table.
import { html } from '../lib/html.mjs';
import { rows, lineObjectId } from '../lib/corpus.mjs';

/**
 * @param {object} props
 * @param {import('../lib/corpus.mjs').CorpusFile} props.file
 * @param {string} [props.caption]
 */
export function Rows({ file, caption }) {
  const list = rows(file);
  const bt128 = lineObjectId(file);
  return html`<div class="table-wrap">
  <table>
    ${caption && html`<caption>${caption}</caption>`}
    <thead>
      <tr>
        <th scope="col">Name (BT-160)</th>
        <th scope="col">Value (BT-161)</th>
      </tr>
    </thead>
    <tbody>
      ${list.map(
        (r) => html`<tr>
          <td>
            ${
              r.href
                ? html`<a href="${r.href}">
                  <code>${r.name}</code>
                </a>`
                : html`<code>${r.name}</code>`
            }
          </td>
          <td>
            <code>${r.value}</code>
          </td>
        </tr>`
      )}
      ${
        bt128 &&
        html`<tr>
        <td>
          <span class="muted">Line object identifier (BT-128), scheme </span>
          <code>${bt128.scheme}</code>
        </td>
        <td>
          <code>${bt128.id}</code>
        </td>
      </tr>`
      }
    </tbody>
  </table>
</div>`;
}
