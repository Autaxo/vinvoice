# Contributing to VINvoice

Thank you for helping. VINvoice is a draft; proposals, corrections and test invoices are all
welcome. Decisions follow the rules on the [governance page](https://vinvoice.org/governance/):
lazy consensus, 14 days for most changes and 28 days for the core tier.

## Propose a new key

1. Check the [vocabulary](https://vinvoice.org/vocabulary/) and `registry/crosswalk.yaml` for a key
   with the same meaning.
2. Open an issue with the **Propose a key** form. It asks for the local name, labels, definition,
   value format, unit or code list, the conditions, a source that anchors the meaning, and two
   independent organisations that will write or read the key. Names follow the
   [naming rules](https://vinvoice.org/naming-rules/) (`registry/naming-rules.yaml`).
3. When the editors agree, open a pull request:
   - add `registry/keys/<name>.yaml`, where `<name>` is the key without the root, e.g.
     `de.hsn.yaml` (copy a similar key and adapt every field);
   - add the local name to `keys:` in `registry/registry.yaml`, in the right tier position;
   - run `npm run validate` and `npm run generate`, and commit `generated/` too;
   - if the key affects the rules, add or adjust a test invoice in `corpus/` and refresh the
     expectations with `python3 -I checker/test_corpus.py --update`.

Changes to the checker logic (`checker/vehicle_check.py`) and to token lists, reserved names and
naming rules follow the same route.

New keys start with `status: provisional` and stay provisional for 12 months.

## Change or correct a key

- **Corrections** to labels, definitions, anchors or examples: open an issue with the
  **Change a key** form or send a pull request directly.
- **Changes of meaning** are not allowed after 1.0: keys are never removed or redefined. Deprecate
  the key (`status: deprecated`) and propose a new one.
- **Renames before 1.0**: rename the file, the `key` field and every mention (`npm run validate`
  lists stale mentions), and update `refs` in `registry/registry.yaml` if the key is named there.

## Code

- `scripts/` and `site/` are formatted with Prettier: `npm run format`.
- `checker/` uses the Python standard library only. Keep it that way.
- `generated/` is never edited by hand.
- Check before pushing: `npm test`, `npm run check`, `npm run build`, and
  `npm run test:schematron` if you touched the rules.

## Licences of contributions

You contribute under the licence of the part you change: CC0-1.0 for registry data and test
invoices, CC-BY-4.0 for the specification text and the crosswalk, Apache-2.0 for code (see
[LICENSE.md](LICENSE.md)). Contributors to the specification grant a royalty-free non-assert for
any patent claims necessary to implement it.

Your contributions are public, together with your GitHub name.
