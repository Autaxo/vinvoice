import { html } from '../lib/html.mjs';

/**
 * Breadcrumbs, the page title and a lead paragraph. `children` is further html`` that follows the
 * lead (what the default slot was in PageHead.astro).
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.lead]
 * @param {{ href: string, label: string }[]} [props.crumbs]
 * @param {import('../lib/html.mjs').Html} [children]
 */
export function PageHead({ title, lead, crumbs }, children) {
  return html`<div class="page-head">
  ${
    crumbs &&
    html`<nav class="breadcrumb" aria-label="Breadcrumb">
    <ol>
      ${crumbs.map(
        (c) => html`<li>
          <a href="${c.href}">${c.label}</a>
        </li>`
      )}
    </ol>
  </nav>`
  }
  <h1>${title}</h1>
  ${lead && html`<p class="lead">${lead}</p>`}
  ${children}
</div>`;
}
