# SPDX-License-Identifier: Apache-2.0
"""Rule tests on small variants of one corpus file: the VIN rules (BT-128 scheme VT, V-04).

The corpus itself is covered by test_corpus.py; these cases would need new corpus files with
validator results, so they are derived in memory from sale-25a.fx.cii.xml instead.
Run: python3 -I -m unittest discover -s checker -v
"""
import json
import pathlib
import sys
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
import vehicle_check  # noqa: E402

REGISTRY = json.loads((ROOT / 'generated/registry.json').read_text(encoding='utf-8'))
BASE = (ROOT / 'corpus/sale-25a.fx.cii.xml').read_text(encoding='utf-8')
VIN = 'TSTVEH016N0000001'          # valid check digit


def findings(xml):
    with tempfile.TemporaryDirectory() as d:
        p = pathlib.Path(d) / 'case.xml'
        p.write_text(xml, encoding='utf-8')
        return vehicle_check.check(REGISTRY, str(p))


def variant(ref_scheme='AKG', ref_value=VIN, row_vin=VIN):
    xml = BASE.replace('<ram:ReferenceTypeCode>AKG</ram:ReferenceTypeCode>', f'<ram:ReferenceTypeCode>{ref_scheme}</ram:ReferenceTypeCode>')
    xml = xml.replace(f'<ram:IssuerAssignedID>{VIN}</ram:IssuerAssignedID>', f'<ram:IssuerAssignedID>{ref_value}</ram:IssuerAssignedID>')
    return xml.replace(f'<ram:Value>{VIN}</ram:Value>', f'<ram:Value>{row_vin}</ram:Value>')


def rules(out, rule):
    return [(f['severity'], f['msg']) for f in out['findings'] if f['rule'] == rule]


class SchemeVT(unittest.TestCase):
    def test_base_is_clean(self):
        out = findings(BASE)
        self.assertEqual([f for f in out['findings'] if f['severity'] in ('error', 'warning')], [])

    def test_vt_with_vin_form_is_taken_as_a_vin(self):
        out = findings(variant('VT'))
        self.assertEqual(out['vehicles'][0]['vin'], VIN)
        self.assertEqual(out['vehicles'][0]['level'], 2)

    def test_vt_with_registration_number_is_ignored(self):
        out = findings(variant('VT', ref_value='M-AB 1234', row_vin=VIN))
        self.assertEqual(out['vehicles'][0]['vin'], VIN)          # from the row, not from the plate
        self.assertEqual(out['vehicles'][0]['level'], 1)
        self.assertEqual(rules(out, 'V-04'), [])
        self.assertEqual(rules(out, 'V-05'), [])

    def test_row_wins_over_vt(self):
        other = 'TSTVEH018N0000009'
        out = findings(variant('VT', ref_value=other))
        self.assertEqual(out['vehicles'][0]['vin'], VIN)
        self.assertEqual([s for s, m in rules(out, 'V-04')], ['warning'])
        self.assertIn('vehicle.vin wins', rules(out, 'V-04')[0][1])

    def test_akg_still_wins_over_the_row(self):
        other = 'TSTVEH018N0000009'
        out = findings(variant('AKG', ref_value=other))
        self.assertEqual(out['vehicles'][0]['vin'], other)
        self.assertIn('BT-128 wins', rules(out, 'V-04')[0][1])


if __name__ == '__main__':
    unittest.main()
