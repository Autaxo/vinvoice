# Reference checker

`vehicle_check.py` reads a CII or UBL invoice, applies the reading rules of the specification and
reports, per vehicle line, the facts it found and any departures from VINvoice (rules V-01 to
V-22). It never rejects an invoice. Python standard library only.

```bash
python3 -I checker/vehicle_check.py generated/registry.json invoice.xml [more.xml ...]
```

Grammars, labels, the statutory flag and the reserved names come from `registry.json`. The file is
the reference checker of the registry release, imported unchanged by `npm run import:release`;
update it there rather than editing it here. Vendor rows (reverse-DNS names outside `vehicle.`)
are listed under `ignored` and never produce findings.

- `test_corpus.py`: regression test against `corpus/checker-expected.json`
  (`python3 -I -m unittest discover -s checker -v`).
- `test_rules.py`: rule tests on small variants of one corpus file (BT-128 scheme `VT`, V-04).
- `compare_schematron.py`: checks that `generated/vinvoice.sch` reports the same errors and
  warnings on the corpus (run through `npm run test:schematron`).

Licence: Apache-2.0.
