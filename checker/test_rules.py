# SPDX-License-Identifier: Apache-2.0
"""Rule tests on small variants of one corpus file: the VIN rules (BT-128 scheme VT, V-04).

The corpus itself is covered by test_corpus.py; these cases would need new corpus files with
validator results, so they are derived in memory from sale-25a.fx.cii.xml instead.
Run: python3 -I -m unittest discover -s checker -v
"""
import json
import pathlib
import re
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


    def test_vt_registration_number_never_becomes_the_vin(self):
        # no vehicle.vin row either: the plate must not turn into the VIN, and V-04/V-05 stay silent
        xml = variant('VT', ref_value='M-AB 1234')
        xml = re.sub(r'<ram:ApplicableProductCharacteristic>\s*<ram:Description>[^<]*\[vehicle\.vin\]</ram:Description>.*?</ram:ApplicableProductCharacteristic>\s*', '', xml, count=1, flags=re.S)
        self.assertNotIn('[vehicle.vin]', xml)
        out = findings(xml)
        self.assertIsNone(out['vehicles'][0]['vin'])
        self.assertEqual(out['vehicles'][0]['level'], 1)
        self.assertEqual(rules(out, 'V-04') + rules(out, 'V-05'), [])

    def test_vt_with_a_differing_registration_number_does_not_warn(self):
        out = findings(variant('VT', ref_value='B-XY 99'))
        self.assertEqual(out['vehicles'][0]['vin'], VIN)
        self.assertEqual(rules(out, 'V-04'), [])

    def test_vt_with_i_o_or_q_is_not_a_vin(self):
        out = findings(variant('VT', ref_value='TSTVEH016N000000O'))
        self.assertEqual(out['vehicles'][0]['vin'], VIN)
        self.assertEqual(out['vehicles'][0]['level'], 1)
        self.assertEqual(rules(out, 'V-04'), [])

    def test_vt_in_bt18_follows_the_same_rule(self):
        self.assertEqual(vehicle_check.vin_from_refs([('M-AB 1234', 'VT')]), None)
        self.assertEqual(vehicle_check.vin_from_refs([(VIN, 'VT')]), VIN)
        self.assertEqual(vehicle_check.vin_from_refs([(VIN, 'VT'), ('M-AB 1234', 'AKG')]), 'M-AB 1234')


if __name__ == '__main__':
    unittest.main()
