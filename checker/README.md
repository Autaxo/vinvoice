# Reference checker

`vinvoice_check.py` reads a CII or UBL invoice, applies the reading rules of the specification and
reports, per vehicle line, the facts it found and any departures from VINvoice (rules V-01 to
V-22). It never rejects an invoice. Python standard library only.

```bash
python3 -I checker/vinvoice_check.py generated/registry.json invoice.xml [more.xml ...]
```

Key names, grammars, labels and the statutory flag come from `registry.json`; the keys the rules
need by role (marker, VIN, odometer, ...) come from its `refs`.

- `test_corpus.py`: regression test against `corpus/checker-expected.json`
  (`python3 -I -m unittest discover -s checker -v`).
- `compare_schematron.py`: checks that `generated/vinvoice.sch` reports the same errors and
  warnings on the corpus (run through `npm run test:schematron`).

Licence: Apache-2.0.
