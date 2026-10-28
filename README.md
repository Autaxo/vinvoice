# VINvoice

**Vehicle data in EU e-invoices.** VINvoice is an open, vendor-neutral convention for writing
vehicle facts into invoices that follow EN 16931 (Factur-X / ZUGFeRD, XRechnung, Peppol BIS
Billing). It adds no XML: the VIN goes into the line object identifier BT-128 with scheme `AKG`,
and every other fact is one item attribute (BG-32) named `Label [key]` with a plain value.

> **Status: draft for review.** Not yet a published standard. Key names may still change before 1.0.

Website: <https://vinvoice.org> (built from this repository).

## What is in this repository

| Path                      | Content                                                                                                                                                                                                                                | Licence                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `registry/keys/*.yaml`    | **The source.** One file per key: labels, definition, value grammar, unit, code list, conditions, binding, legal anchors.                                                                                                              | CC0-1.0                                  |
| `registry/registry.yaml`  | Release metadata, key order, and `refs`: the keys the specification and tools refer to by role.                                                                                                                                        | CC0-1.0                                  |
| `registry/crosswalk.yaml` | Informative mapping to schema.org, VDA 4938, STAR and others, with sources.                                                                                                                                                            | CC-BY-4.0                                |
| `schemas/`                | JSON Schema for a key file and for `registry.json`.                                                                                                                                                                                    | CC0-1.0                                  |
| `generated/`              | Built from `registry/` by `npm run generate`; do not edit. `registry.json`, `registry.csv`, `context.jsonld`, `crosswalk.csv`, `vehicle-facts.schema.json` (JSON Schema for a vehicle's facts), `vinvoice.sch` (ISO Schematron rules). | as the source; `vinvoice.sch` Apache-2.0 |
| `corpus/`                 | 19 test invoices (CII and UBL), their scenarios, the validation evidence and the checker's expected findings.                                                                                                                          | CC0-1.0                                  |
| `checker/`                | Reference reader and checker (Python, no dependencies) and its tests.                                                                                                                                                                  | Apache-2.0                               |
| `scripts/`                | Validation, generation, import and test scripts.                                                                                                                                                                                       | Apache-2.0                               |
| `site/`                   | The website: a Node script that writes static HTML (no framework, no tracking).                                                                                                                                                        | text CC-BY-4.0, code Apache-2.0          |

See [LICENSE.md](LICENSE.md) for the details.

## Use the published files

- Registry: `generated/registry.json` (also at <https://vinvoice.org/downloads/registry.json>)
- Check invoices with Schematron: compile `generated/vinvoice.sch` with an XSLT 2.0 Schematron
  processor (for example SchXslt) and run it next to the EN 16931 rules.
- Check invoices with Python:

  ```bash
  python3 -I checker/vehicle_check.py generated/registry.json invoice.xml
  ```

- Validate a vehicle's facts as JSON: `generated/vehicle-facts.schema.json` (JSON Schema 2020-12).

## Work on it

Needs Node.js 22.12+ and Python 3.10+; the Schematron test also needs Java 17+ or Docker.

```bash
npm ci
npm run validate          # check registry/ against schemas/ and the cross-file rules
npm run generate          # rebuild generated/ from registry/
npm test                  # validate, check generated/ against the JSON Schemas, run the checker tests
npm run test:schematron   # compile the Schematron and compare it with the checker on the corpus
npm run dev               # website at http://localhost:4321, rebuilt when site/, generated/ or corpus/ change
npm run build             # website into dist/
npm run preview           # serve an existing dist/
npm run check             # Prettier, then link and structure test of the built website
```

A change to a key is: edit `registry/keys/<key>.yaml`, run `npm run generate`, commit both the
YAML and `generated/`. CI fails if `generated/` is out of date. See
[CONTRIBUTING.md](CONTRIBUTING.md) for proposals and reviews, [GOVERNANCE.md](GOVERNANCE.md) for
the rules.

A registry release delivered as JSON (for example from a naming review) comes in with
`npm run import:release -- <folder with out/registry.json, out/crosswalk.csv, corpus/, reports/, vehicle_check.py>`.

AI coding agents: see [AGENTS.md](AGENTS.md). The website publishes `llms.txt` and
`llms-full.txt` for language models.

## Hosting

The website is deployed by `.github/workflows/pages.yml` on every push to `main` and served by
GitHub Pages at <https://vinvoice.org> (custom domain; the `CNAME` file is in `site/public/`). DNS:
`A` records for `vinvoice.org` to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
`185.199.111.153`; `AAAA` to `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`,
`2606:50c0:8003::153`; `CNAME` for `www` to `autaxo.github.io`.

Still open for the maintainers:

- [ ] Verify `vinvoice.org` for the organisation (Settings → Pages → Verified domains) to prevent
      takeover.
- [ ] **Enforce HTTPS** once GitHub has issued the certificate.
- [ ] Protect `main`: pull requests only, CI must pass.
- [ ] Repository description and topics, so that people and agents find it: description
      "Open convention for vehicle data in EN 16931 e-invoices (ZUGFeRD, Factur-X, XRechnung,
      Peppol)"; website `https://vinvoice.org`; topics `e-invoicing`, `en16931`, `zugferd`,
      `factur-x`, `xrechnung`, `peppol`, `vin`, `automotive`, `schematron`, `json-schema`,
      `open-standard`.

---

This initiative is sponsored by [Autaxo GmbH](https://www.autaxo.de). VINvoice is not endorsed by
CEN, FeRD, KoSIT, OpenPeppol or any public authority.
