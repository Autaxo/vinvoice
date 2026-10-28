# Reference checker

`vehicle_check.py` reads a CII or UBL invoice, applies the reading rules of the specification and
reports, per vehicle line, the facts it found and any departures from VINvoice (rules V-01 to
V-22). It never rejects an invoice. Python standard library only.

```bash
python3 -I checker/vehicle_check.py generated/registry.json invoice.xml [more.xml ...]
```

Grammars, labels, the statutory flag, `labelRequiredWhen` and the reserved names come from `registry.json`. This
repository is the source of `vehicle_check.py`: change the checker here, together with
`test_rules.py`, the Schematron generator and the pages (see "When a rule changes" in
[site/README.md](../site/README.md)). `npm run import:release` copies a `vehicle_check.py` from an
external release folder over this file if the folder has one, and would overwrite local edits to
the checker, so do not run it for a checker change. Vendor rows (reverse-DNS names outside
`vehicle.`) are listed under `ignored` and never produce findings.

- `test_corpus.py`: regression test against `corpus/checker-expected.json`
  (`python3 -I -m unittest discover -s checker -v`).
- `test_rules.py`: rule tests on small variants of corpus files (BT-128 scheme `VT`, V-04, V-05,
  V-11 for `labelRequiredWhen`).
- `compare_schematron.py`: checks that `generated/vinvoice.sch` reports the same errors and
  warnings on the corpus (run through `npm run test:schematron`).

Licence: Apache-2.0.
