// A tiny HTML template tag. Every interpolated value is escaped for text and attribute context
// (& < > " '), so a registry string can never become markup by accident.
//
//   html`<a href="${url}">${label}</a>`      -> escaped
//   html`<ul>${items.map((i) => html`<li>${i}</li>`)}</ul>`   -> arrays are flattened
//   html`${cond && html`<b>yes</b>`}`        -> null, undefined, false and true print nothing
//
// Guard with a boolean (`n > 0 && html...`), never with a number or a string: 0 and '' are values
// and print as "0" and "". A plain object (not html``, raw() or an array) throws, so a mixed-up
// argument fails the build instead of printing [object Object].
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
function renderValue(v) {
  if (v === null || v === undefined || v === false || v === true) return '';
  if (v instanceof Raw) return v.value;
  if (Array.isArray(v)) return v.map(renderValue).join('');
  if (typeof v === 'object')
    throw new TypeError(`html: cannot print an object (${v.constructor?.name ?? 'object'})`);
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
  for (let i = 0; i < values.length; i++) out += renderValue(values[i]) + strings[i + 1];
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
export const toHtmlString = (/** @type {unknown} */ v) => renderValue(v);

/** True for the result of html`` and raw(). */
export const isHtml = (/** @type {unknown} */ v) => v instanceof Raw;

/**
 * A web address from a data file, for an href. Throws unless it is an http(s) URL, so data cannot
 * put a javascript: or data: link on a page. The result is still escaped by html``.
 * @param {string} value
 */
export function httpUrl(value) {
  let u;
  try {
    u = new URL(value);
  } catch {
    throw new Error(`not a URL: ${value}`);
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:')
    throw new Error(`only http(s) URLs may be linked, got ${value}`);
  return value;
}

/** @typedef {ReturnType<typeof html>} Html */
