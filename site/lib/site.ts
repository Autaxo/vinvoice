export const SITE = {
  name: 'VINvoice',
  url: 'https://vinvoice.org',
  tagline: 'Vehicle data in EU e-invoices',
  sponsor: { name: 'Autaxo GmbH', url: 'https://www.autaxo.de' },
};

// Public repository. Replace __GITHUB_ORG__ once the GitHub organisation exists; until then the
// site leaves out every repository link and points to the contact address instead.
const REPO_URL = 'https://github.com/__GITHUB_ORG__/vinvoice';
export const REPO = REPO_URL.includes('__GITHUB_ORG__')
  ? null
  : {
      url: REPO_URL,
      file: (path: string) => `${REPO_URL}/blob/main/${path}`,
      tree: (path: string) => `${REPO_URL}/tree/main/${path}`,
      issue: (template: string) => `${REPO_URL}/issues/new?template=${template}`,
    };

export const NAV = [
  { href: '/specification/', label: 'Specification' },
  { href: '/vocabulary/', label: 'Vocabulary' },
  { href: '/code-lists/', label: 'Code lists' },
  { href: '/examples/', label: 'Examples' },
  { href: '/validation/', label: 'Validation' },
  { href: '/governance/', label: 'Governance' },
  { href: '/implementations/', label: 'Implementations' },
];

export const LICENCES = [
  {
    part: 'Specification text',
    licence: 'CC BY 4.0',
    url: 'https://creativecommons.org/licenses/by/4.0/',
  },
  {
    part: 'Registry data (keys, labels, grammars, token lists, examples)',
    licence: 'CC0 1.0',
    url: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  {
    part: 'Crosswalk to third-party vocabularies',
    licence: 'CC BY 4.0',
    url: 'https://creativecommons.org/licenses/by/4.0/',
  },
  {
    part: 'Code: reference checker, reader, generators, test runner',
    licence: 'Apache-2.0',
    url: 'https://www.apache.org/licenses/LICENSE-2.0',
  },
];

export const formatBytes = (n: number) =>
  n < 1024 ? `${n} B` : `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;

export const formatDate = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
