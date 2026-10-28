// A tiny HTML template tag. Every interpolated value is escaped for text and attribute context
// (& < > " '), so a registry string can never become markup by accident.
//
//   html`<a href="${url}">${label}</a>`      -> escaped
//   html`<ul>${items.map((i) => html`<li>${i}</li>`)}</ul>`   -> arrays are flattened
//   html`${cond && html`<b>yes</b>`}`        -> null, undefined, false and true print nothing
//   raw('<b>x</b>')                          -> inserted as written
//
// html`` returns a Raw value, so nesting one template in another does not escape it twice. The
// literal parts of a template are trusted markup; only the values between them are escaped.
// raw() is for the few places that build HTML in a helper (linkKeys, codeSpans) and for the
// JSON-LD block. It is the only way to get unescaped text into a page. Attributes that appear
// only sometimes are written with attr().

class Raw {
  /** @param {string} value */
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape text for use in element content or in a quoted attribute value. */
export const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ESCAPES[c]);

/**
 * Mark a string as trusted HTML. Use it only for markup built by a helper in this repository,
 * never for text that comes from the registry, the corpus or any other data file.
 * @param {string} s
 */
export const raw = (s) => new Raw(String(s));

/** @param {unknown} v */
function render(v) {
  if (v === null || v === undefined || v === false || v === true) return '';
  if (v instanceof Raw) return v.value;
  if (Array.isArray(v)) return v.map(render).join('');
  return escape(v);
}

/**
 * Template tag: literal parts as written, values escaped.
 * @param {TemplateStringsArray} strings
 * @param {...unknown} values
 * @returns {Raw}
 */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += render(values[i]) + strings[i + 1];
  return new Raw(out);
}

/**
 * An optional attribute with a leading space: ` name="value"`, or nothing when the value is
 * null, undefined or false. Write it right behind the previous attribute: <a href="/"${attr(...)}>.
 * @param {string} name
 * @param {unknown} value
 */
export const attr = (name, value) =>
  value === null || value === undefined || value === false
    ? raw('')
    : raw(` ${name}="${escape(value)}"`);

/** The finished string of a template, raw value or plain text. */
export const text = (/** @type {unknown} */ v) => render(v);

/** @typedef {ReturnType<typeof html>} Html */
