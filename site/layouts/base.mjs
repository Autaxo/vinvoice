// The page shell: head, header with navigation, status banner, footer. Pages call Base(meta, body)
// where body is the html`` of the page's content.
import { attr, html, raw } from '../lib/html.mjs';
import { SITE, NAV, REPO } from '../lib/site.mjs';
import { registry, markerValue } from '../lib/registry.mjs';

/** Public path of the one stylesheet. The build copies site/styles/site.css there. */
export const STYLESHEET = '/site.css';

/**
 * JSON for a <script type="application/ld+json"> block. "<" is written as \u003c, so that text
 * from the registry can never end the script element; JSON parsers read the same data.
 * @param {object} data
 */
const jsonLdText = (data) => raw(JSON.stringify(data).replace(/</g, '\\u003c'));

/**
 * @param {object} meta
 * @param {string} meta.path URL path of the page, e.g. "/vocabulary/make/" (canonical URL, active nav item)
 * @param {string} meta.title
 * @param {string} meta.description
 * @param {object} [meta.jsonLd] schema.org data, written as a JSON-LD script
 * @param {string} [meta.lang] language of the content when it is not English
 * @param {boolean} [meta.noindex]
 * @param {import('../lib/html.mjs').Html} body html`` of the page content
 */
export function Base({ path, title, description, jsonLd, lang = 'en', noindex = false }, body) {
  const canonical = new URL(path, SITE.url).href;
  const fullTitle = path === '/' ? `${SITE.name}: ${SITE.tagline}` : `${title} · ${SITE.name}`;
  const current = (/** @type {string} */ href) => path.startsWith(href);
  return html`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"
    />
    <meta name="referrer" content="strict-origin-when-cross-origin" />
    <title>${fullTitle}</title>
    <meta name="description" content="${description}" />
    ${noindex ? html`<meta name="robots" content="noindex" />` : html`<link rel="canonical" href="${canonical}" />`}
    <meta name="color-scheme" content="light dark" />
    <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
    <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0f1318" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt" />
    <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${SITE.name}" />
    <meta property="og:title" content="${fullTitle}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${canonical}" />
    ${jsonLd && html`<script type="application/ld+json">${jsonLdText(jsonLd)}</script>`}
    <link rel="stylesheet" href="${STYLESHEET}" />
  </head>
  <body>
    <a class="skip" href="#main">Skip to content</a>
    <header class="site-header">
      <div class="wrap">
        <a class="brand" href="/" aria-label="${SITE.name} home">
          <img src="/favicon.svg" alt="" width="34" height="34" />
          <div>
            <strong class="wordmark"><span>VIN</span>voice</strong>
            <span>${SITE.tagline}</span>
          </div>
        </a>
        <nav class="site-nav" aria-label="Main">
          <ul>
            ${NAV.map(
              (item) => html`<li>
                <a href="${item.href}"${attr('aria-current', current(item.href) ? 'page' : undefined)}>
                  ${item.label}
                </a>
              </li>`
            )}
          </ul>
        </nav>
      </div>
    </header>
    <div class="status" role="note" aria-label="Document status">
      <div class="wrap">
        <p>
          <span class="badge-draft">Draft</span>Draft for review, not yet a published standard.
          Registry <code>${registry.version}</code> of ${registry.date}, marker <code>${markerValue}</code>. <a href="/governance/#change-process">How changes are made</a>.
        </p>
      </div>
    </div>
    <main id="main" class="wrap"${attr('lang', lang === 'en' ? undefined : lang)}>
      ${body}
    </main>
    <footer class="site-footer">
      <div class="wrap">
        <p class="sponsor">
          This initiative is sponsored by <a href="${SITE.sponsor.url}">${SITE.sponsor.name}</a>.
        </p>
        <p>
          VINvoice is an independent usage convention for EN 16931 e-invoices. It is not endorsed by
          CEN, FeRD, KoSIT, OpenPeppol or any public authority.
        </p>
        <ul>
          <li><a href="/governance/#licences">Licences</a></li>
          ${
            REPO &&
            html`<li>
            <a href="${REPO.url}">Source on GitHub</a>
          </li>`
          }
          <li><a href="/impressum/" hreflang="de">Impressum</a></li>
          <li><a href="/datenschutz/" hreflang="de">Datenschutz</a></li>
          <li>No cookies, no tracking.</li>
        </ul>
      </div>
    </footer>
  </body>
</html>
`;
}
