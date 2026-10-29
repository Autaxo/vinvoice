# AGENTS.md

Guidance for AI coding agents. Two cases: you are implementing VINvoice in some other codebase,
or you are working in this repository.

## Implementing VINvoice elsewhere

VINvoice puts structured vehicle data into EN 16931 e-invoices (Factur-X / ZUGFeRD, XRechnung,
Peppol BIS Billing) without new XML. Read, in this order:

1. <https://vinvoice.org/llms-full.txt>: the complete implementation guide in one file (rules,
   bindings, examples, every key with its grammar).
2. <https://vinvoice.org/downloads/registry.json> (here: `generated/registry.json`): the normative
   registry. Generate code from it; do not copy key names by hand.
3. The test invoices in `corpus/` (conforming files, and `neg-*` files your reader must flag).

Rules that are easy to get wrong:

- The VIN goes into BT-128 with scheme `AKG` and document type code `130`, and also into its own
  row. Never into BT-157 or BT-158.
- A row name is `<registry label> [<key>]` or the bare key; statutory keys always need the label.
- Values are plain: ISO dates, no thousands separators, no unit text, lower-case registry tokens,
  EU codes (vehicle categories, bodywork, countries) verbatim.
- The marker row (`registry.json` → `markerKey`) comes first on every vehicle line.
- Vendor rows use a reverse-DNS name of your own domain (`com.example.stockNumber`), never the
  registry root. Never write a name from `registry.json` → `reserved`.
- Validate with the EN 16931 validators and with `generated/vinvoice.sch` or
  `python3 -I checker/vehicle_check.py generated/registry.json invoice.xml`.

## Working in this repository

- **Sources** are in `registry/` (one YAML file per key, plus `registry.yaml`, `token-lists.yaml`,
  `reserved.yaml`, `naming-rules.yaml`, `crosswalk.yaml`). **Never edit `generated/`**; run
  `npm run generate` and commit both.
- A release delivered as JSON comes in with `npm run import:release -- <dir>`; it also replaces
  `corpus/` and `checker/vehicle_check.py`.
- `site/` is a dependency-free Node generator (`node site/build.mjs`, see `site/README.md`). It
  renders everything from `generated/` and `corpus/`. Never type a key name into a template or into
  prose: iterate over the registry, or use `REF` (`site/lib/registry.mjs`), whose roles are named
  in `registry/registry.yaml` → `refs`.
- Templates use the `html` tag from `site/lib/html.mjs`, which escapes every interpolated value.
  `raw()` marks trusted markup built by a helper (`linkKeys`, `codeSpans`); never pass it text that
  comes from a data file.
- The site loads nothing from third parties, sets no cookies and has no tracking. Keep it that way;
  the only script is `site/public/vocabulary-filter.js`. `node site/test.mjs` (part of
  `npm run check`) fails on external loads, inline scripts and handlers, broken links and
  missing fragments.
- The text of EN 16931-1:2026 is not freely available (CEN and DIN sell it). Every statement about it (VAT categories for margin
  schemes, BT-211, BT-212, category `N`) cites a public source with section and page (today the
  XRechnung 4.0.0 pre-release, specification section 12) or is marked as an assumption "to be
  confirmed against DIN EN 16931-1:2026". Do not state it as fact without one of the two.
- Write regular expressions with `\uXXXX` escapes, never with literal invisible characters.
- Before committing: `npm test`, `npm run check`, `npm run build`, and `npm run test:schematron`
  when rules change. Conventional Commits.
