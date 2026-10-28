// A registry key, linked to its term page. Pass the term, never a spelled-out key name.
import { html } from '../lib/html.mjs';
import { termUrl } from '../lib/registry.mjs';

/**
 * @param {object} props
 * @param {import('../lib/registry.mjs').Term} props.t
 * @param {string} [props.value] shown as " = value" behind the key
 */
export function Key({ t, value }) {
  return html`<a href="${termUrl(t)}"><code>${t.key}</code></a>${value === undefined ? '' : html` = <code>${value}</code>`}`;
}
