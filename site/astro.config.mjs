import { defineConfig } from 'astro/config';

// The website, built from the repository: registry and schemas from ../generated/, test invoices
// and evidence from ../corpus/. Plain static HTML: no integrations, no client framework, one
// stylesheet. Published to GitHub Pages by .github/workflows/pages.yml.
export default defineConfig({
  site: 'https://vinvoice.org',
  srcDir: '.',
  publicDir: './public',
  outDir: '../dist',
  build: {
    // One cached stylesheet instead of a copy inlined into every page.
    inlineStylesheets: 'never',
  },
  devToolbar: { enabled: false },
  vite: {
    server: { fs: { allow: ['..'] } },
  },
});
