export const SITE = {
  name: 'VINvoice',
  url: 'https://vinvoice.org',
  tagline: 'Vehicle data in EU e-invoices',
  sponsor: { name: 'Autaxo GmbH', url: 'https://www.autaxo.de' },
};

// Public repository. A fork that has no public repository yet sets the __GITHUB_ORG__ placeholder
// here; the site then leaves out every repository link and points to the contact address instead.
const REPO_URL = 'https://github.com/Autaxo/vinvoice';
export const REPO = REPO_URL.includes('__GITHUB_ORG__')
  ? null
  : {
      url: REPO_URL,
      file: (/** @type {string} */ path) => `${REPO_URL}/blob/main/${path}`,
      tree: (/** @type {string} */ path) => `${REPO_URL}/tree/main/${path}`,
      issue: (/** @type {string} */ template) => `${REPO_URL}/issues/new?template=${template}`,
    };

export const NAV = [
  { href: '/specification/', label: 'Specification' },
  { href: '/vocabulary/', label: 'Vocabulary' },
  { href: '/naming-rules/', label: 'Naming rules' },
  { href: '/code-lists/', label: 'Code lists' },
  { href: '/examples/', label: 'Examples' },
  { href: '/validation/', label: 'Validation' },
  { href: '/governance/', label: 'Governance' },
  { href: '/implementations/', label: 'Implementations' },
];

/** Licence name -> licence text URL. The one place these addresses are written. */
export const LICENCE_URL = {
  'CC0 1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'Apache-2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
};

/** Which licence covers which part of the repository (the table on the governance page). */
export const LICENCES = /** @type {const} */ ([
  ['Specification text', 'CC BY 4.0'],
  ['Registry data (keys, labels, grammars, token lists, examples)', 'CC0 1.0'],
  ['Crosswalk to third-party vocabularies', 'CC BY 4.0'],
  ['Code: reference checker, reader, generators, test runner', 'Apache-2.0'],
]).map(([part, licence]) => ({ part, licence, url: LICENCE_URL[licence] }));

/** @param {number} n */
export const formatBytes = (n) =>
  n < 1024 ? `${n} B` : `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;

/** @param {string} iso e.g. "2026-10-24" */
export const formatDate = (iso) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
