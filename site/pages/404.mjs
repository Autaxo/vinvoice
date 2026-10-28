import { Base } from '../layouts/base.mjs';
import { PageHead } from '../components/page-head.mjs';
import { html } from '../lib/html.mjs';

export function render({ path }) {
  return Base(
    { path, title: 'Page not found', description: 'This page does not exist.', noindex: true },
    html`
  ${PageHead({ title: 'Page not found', lead: 'This page does not exist. Links to terms of earlier drafts, before the naming rules, no longer work.' })}
  <ul class="prose">
    <li><a href="/vocabulary/">Vocabulary: all keys</a></li>
    <li><a href="/specification/">Specification</a></li>
    <li><a href="/">Home</a></li>
  </ul>
`
  );
}
