# Test corpus

Complete invoices that exercise VINvoice. All parties, VINs and plates are fictional; VINs use the
test prefix `TST` with a valid check digit. File names read `scenario.carrier.syntax.xml`
(`fx` Factur-X EN 16931 profile, `ext` Factur-X EXTENDED, `xr` XRechnung, `peppol` Peppol BIS
Billing). Files starting with `neg` are negative controls: valid EN 16931 invoices that the
VINvoice checker must flag.

| File | Content |
|---|---|
| `index.json` | Scenario descriptions and carrier names, shown on the website. |
| `checker-expected.json` | What `checker/vehicle_check.py` reports for every file. The checker tests compare against it; refresh with `python3 -I checker/test_corpus.py --update` after an intended change. |
| `validation.json` | Evidence from the official validators (Factur-X and UBL XSD, CEN EN 16931 1.3.17, Factur-X 1.09.2, KoSIT XRechnung 3.0.2, Peppol BIS 3.0.20), reduced to counts per file. Produced outside this repository, because the validators are not redistributed. |

Licence: CC0-1.0.
