import type { APIRoute } from 'astro';
import { terms, termUrl, registry } from '../lib/registry';
import { NAV, SITE } from '../lib/site';

export const GET: APIRoute = () => {
  const paths = [
    '/',
    ...NAV.map((n) => n.href),
    ...terms.map(termUrl),
    '/impressum/',
    '/datenschutz/',
  ];
  const urls = paths
    .map((p) => `  <url><loc>${SITE.url}${p}</loc><lastmod>${registry.date}</lastmod></url>`)
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
