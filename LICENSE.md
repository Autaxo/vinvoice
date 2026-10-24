# Licences

VINvoice uses different licences for its parts, so that the registry can be used without any
condition while the specification text and third-party references keep their attribution.

| Part                                                                                        | Paths                                                                                                                                                        | Licence    | Text                                               |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------------------------------------------------- |
| Registry data: keys, labels, grammars, token lists, examples, test invoices, JSON Schemas   | `registry/keys/`, `registry/registry.yaml`, `schemas/`, `corpus/`, `generated/registry.*`, `generated/context.jsonld`, `generated/vehicle-facts.schema.json` | CC0-1.0    | [LICENSES/CC0-1.0.txt](LICENSES/CC0-1.0.txt)       |
| Specification text and website content                                                      | `site/pages/`, the prose of this repository's Markdown files                                                                                                 | CC-BY-4.0  | [LICENSES/CC-BY-4.0.txt](LICENSES/CC-BY-4.0.txt)   |
| Crosswalk to third-party vocabularies (names and IRIs of third-party works, sources stated) | `registry/crosswalk.yaml`, `generated/crosswalk.csv`                                                                                                         | CC-BY-4.0  | [LICENSES/CC-BY-4.0.txt](LICENSES/CC-BY-4.0.txt)   |
| Code: reference checker, generators, Schematron rules, scripts, website code                | `checker/`, `scripts/`, `generated/vinvoice.sch`, `site/` (except page text)                                                                                 | Apache-2.0 | [LICENSES/Apache-2.0.txt](LICENSES/Apache-2.0.txt) |

Source files carry an `SPDX-License-Identifier` where the format allows it.

Contributors to the specification grant a royalty-free non-assert for any patent claims necessary
to implement it.

Official validation artefacts (CEN, KoSIT, Peppol, Factur-X) and the Schematron toolchain (Saxon-HE,
SchXslt) are never redistributed here; `scripts/fetch-jars.sh` downloads the toolchain for tests.

The name VINvoice and its logo (`site/public/favicon.svg`) are not covered by these licences.
