import { terms, termUrl, registry } from '../lib/registry.mjs';
import { escape } from '../lib/html.mjs';
import { NAV, SITE } from '../lib/site.mjs';

export const kind = 'file';

export function render() {
  const paths = [
    '/',
    ...NAV.map((n) => n.href),
    ...terms.map(termUrl),
    '/impressum/',
    '/datenschutz/',
  ];
  const urls = paths
    .map(
      (p) =>
        `  <url><loc>${escape(SITE.url + p)}</loc><lastmod>${escape(registry.date)}</lastmod></url>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
