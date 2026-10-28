# SPDX-License-Identifier: Apache-2.0
"""Rule tests on small variants of corpus files: the VIN rules (BT-128 scheme VT, V-04, V-05) and V-11 (labelRequiredWhen, with its VAT category and seller country).

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
BAD_DIGIT = 'TSTVEH017N0000001'    # position 9 is wrong
REG_DATE = '2022-03-18'


def findings(xml):
    with tempfile.TemporaryDirectory() as d:
        p = pathlib.Path(d) / 'case.xml'
        p.write_text(xml, encoding='utf-8')
        return vehicle_check.check(REGISTRY, str(p))


def without_vin_row(xml):
    return re.sub(r'<ram:ApplicableProductCharacteristic>\s*<ram:Description>[^<]*\[vehicle\.vin\]</ram:Description>.*?</ram:ApplicableProductCharacteristic>\s*', '', xml, count=1, flags=re.S)


def variant(ref_scheme='AKG', ref_value=VIN, row_vin=VIN, reg_date=REG_DATE):
    xml = BASE.replace('<ram:ReferenceTypeCode>AKG</ram:ReferenceTypeCode>', f'<ram:ReferenceTypeCode>{ref_scheme}</ram:ReferenceTypeCode>')
    xml = xml.replace(f'<ram:IssuerAssignedID>{VIN}</ram:IssuerAssignedID>', f'<ram:IssuerAssignedID>{ref_value}</ram:IssuerAssignedID>')
    xml = xml.replace(f'<ram:Value>{VIN}</ram:Value>', f'<ram:Value>{row_vin}</ram:Value>')
    return xml.replace(f'<ram:Value>{REG_DATE}</ram:Value>', f'<ram:Value>{reg_date}</ram:Value>')


def with_category(xml, code):
    """Add a vehicle.categoryCode row after the role row."""
    role = '<ram:Value>supply</ram:Value>\n        </ram:ApplicableProductCharacteristic>'
    row = f'\n        <ram:ApplicableProductCharacteristic>\n          <ram:Description>Fahrzeugklasse [vehicle.categoryCode]</ram:Description>\n          <ram:Value>{code}</ram:Value>\n        </ram:ApplicableProductCharacteristic>'
    assert role in xml
    return xml.replace(role, role + row, 1)


def rules(out, rule):
    return [(f['severity'], f['msg']) for f in out['findings'] if f['rule'] == rule]


class SchemeVT(unittest.TestCase):
    def test_base_is_clean(self):
        out = findings(BASE)
        self.assertEqual([f for f in out['findings'] if f['severity'] in ('error', 'warning')], [])

    def test_vt_with_vin_form_is_taken_as_a_vin(self):
        out = findings(variant('VT'))
        self.assertEqual(out['vehicles'][0]['vin'], VIN)
        self.assertEqual(out['vehicles'][0]['level'], 1)          # Level 2 needs scheme AKG

    def test_akg_is_level_2(self):
        out = findings(variant('AKG'))
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
        xml = without_vin_row(variant('VT', ref_value='M-AB 1234'))
        self.assertNotIn('[vehicle.vin]', xml)
        out = findings(xml)
        self.assertIsNone(out['vehicles'][0]['vin'])
        self.assertEqual(out['vehicles'][0]['level'], 1)
        self.assertEqual(rules(out, 'V-04') + rules(out, 'V-05'), [])

    def test_vt_in_vin_form_with_surrounding_spaces_is_read(self):
        out = findings(without_vin_row(variant('VT', ref_value=f' {VIN} ')))
        self.assertEqual(out['vehicles'][0]['vin'], VIN)          # no row: the VIN can only come from VT
        self.assertEqual(out['vehicles'][0]['level'], 1)

    def test_vt_with_i_o_or_q_is_not_a_vin(self):
        out = findings(variant('VT', ref_value='TSTVEH016N000000O'))
        self.assertEqual(out['vehicles'][0]['vin'], VIN)
        self.assertEqual(out['vehicles'][0]['level'], 1)
        self.assertEqual(rules(out, 'V-04'), [])

    def test_vin_from_refs_reads_vt_only_in_vin_form(self):
        self.assertEqual(vehicle_check.vin_from_refs([('M-AB 1234', 'VT')]), None)
        self.assertEqual(vehicle_check.vin_from_refs([(VIN, 'VT')]), VIN)
        self.assertEqual(vehicle_check.vin_from_refs([(VIN, 'VT'), (VIN, 'AKG')]), VIN)


class CheckDigit(unittest.TestCase):
    def test_format_failure_is_a_warning(self):
        out = findings(variant(ref_value='TSTVEH016N000000O', row_vin='TSTVEH016N000000O'))
        self.assertEqual([s for s, m in rules(out, 'V-05')], ['warning'])

    def test_bad_check_digit_before_the_due_date_is_info(self):
        out = findings(variant(ref_value=BAD_DIGIT, row_vin=BAD_DIGIT, reg_date='2026-07-06'))
        self.assertEqual([s for s, m in rules(out, 'V-05')], ['info'])

    def test_bad_check_digit_from_the_due_date_is_a_warning(self):
        out = findings(variant(ref_value=BAD_DIGIT, row_vin=BAD_DIGIT, reg_date='2026-07-07'))
        self.assertEqual([s for s, m in rules(out, 'V-05')], ['warning'])

    def test_partial_date_counts_as_its_last_day(self):
        out = findings(variant(ref_value=BAD_DIGIT, row_vin=BAD_DIGIT, reg_date='2026-07'))
        self.assertEqual([s for s, m in rules(out, 'V-05')], ['warning'])
        out = findings(variant(ref_value=BAD_DIGIT, row_vin=BAD_DIGIT, reg_date='2026-06'))
        self.assertEqual([s for s, m in rules(out, 'V-05')], ['info'])

    def test_bad_check_digit_after_the_due_date_depends_on_the_category(self):
        xml = variant(ref_value=BAD_DIGIT, row_vin=BAD_DIGIT, reg_date='2026-08-01')
        for category, severity in (('M1', 'warning'), ('N2', 'warning'), ('O3', 'warning'), ('L3e-A1', 'info'), ('T1', 'info')):
            with self.subTest(category=category):
                out = findings(with_category(xml, category))
                self.assertEqual([s for s, m in rules(out, 'V-05')], [severity])

    def test_bad_check_digit_without_a_registration_date_is_info(self):
        xml = variant(ref_value=BAD_DIGIT, row_vin=BAD_DIGIT)
        xml = re.sub(r'<ram:ApplicableProductCharacteristic>\s*<ram:Description>[^<]*\[vehicle\.firstRegistrationDate\]</ram:Description>.*?</ram:ApplicableProductCharacteristic>\s*', '', xml, count=1, flags=re.S)
        self.assertNotIn('[vehicle.firstRegistrationDate]', xml)
        found = rules(findings(xml), 'V-05')
        self.assertEqual([s for s, m in found], ['info'])
        self.assertNotIn('not required', found[0][1])           # Art. 12(2) also covers vehicles placed on the market
        self.assertIn('cannot tell', found[0][1])

    def test_unknown_category_after_the_due_date_is_a_warning(self):
        xml = variant(ref_value=BAD_DIGIT, row_vin=BAD_DIGIT, reg_date='2026-08-01')
        self.assertNotIn('[vehicle.categoryCode]', xml)
        self.assertEqual([s for s, m in rules(findings(xml), 'V-05')], ['warning'])

    def test_valid_check_digit_has_no_finding(self):
        self.assertEqual(rules(findings(BASE), 'V-05'), [])


NEW_VEHICLE = (ROOT / 'corpus/new-intra-eu.fx.cii.xml').read_text(encoding='utf-8')
POWER_LABEL = 'Höchste Nutzleistung (kW) [vehicle.maximumNetPowerKw]'
CAPACITY_LABEL = 'Hubraum (cm3) [vehicle.engineCapacityCm3]'
INDICATOR_ROW = re.compile(r'<ram:ApplicableProductCharacteristic>\s*<ram:Description>[^<]*\[vehicle\.newMeansOfTransportIndicator\]</ram:Description>.*?</ram:ApplicableProductCharacteristic>\s*', re.S)


def bare(xml, label, key):
    assert f'<ram:Description>{label}</ram:Description>' in xml
    return xml.replace(f'<ram:Description>{label}</ram:Description>', f'<ram:Description>{key}</ram:Description>')


class NewVehicleNationalParticulars(unittest.TestCase):
    """V-11 with labelRequiredWhen: power and capacity are labelled on a new-vehicle line (DE UStG 14a(4) with 1b(2))."""

    def test_base_is_clean(self):
        out = findings(NEW_VEHICLE)
        self.assertEqual([f for f in out['findings'] if f['severity'] in ('error', 'warning')], [])

    def test_labelled_power_and_capacity_are_fine(self):
        self.assertEqual(rules(findings(NEW_VEHICLE), 'V-11'), [])

    def test_bare_power_on_a_new_vehicle_line_is_an_error(self):
        out = findings(bare(NEW_VEHICLE, POWER_LABEL, 'vehicle.maximumNetPowerKw'))
        self.assertEqual([s for s, m in rules(out, 'V-11')], ['error'])
        self.assertIn('vehicle.maximumNetPowerKw', rules(out, 'V-11')[0][1])
        self.assertEqual(out['vehicles'][0]['facts']['vehicle.maximumNetPowerKw'], '110')   # still read

    def test_bare_capacity_on_a_new_vehicle_line_is_an_error(self):
        out = findings(bare(NEW_VEHICLE, CAPACITY_LABEL, 'vehicle.engineCapacityCm3'))
        self.assertEqual([s for s, m in rules(out, 'V-11')], ['error'])
        self.assertIn('vehicle.engineCapacityCm3', rules(out, 'V-11')[0][1])

    def test_both_bare_give_two_errors(self):
        xml = bare(bare(NEW_VEHICLE, POWER_LABEL, 'vehicle.maximumNetPowerKw'), CAPACITY_LABEL, 'vehicle.engineCapacityCm3')
        self.assertEqual([s for s, m in rules(findings(xml), 'V-11')], ['error', 'error'])

    def test_english_label_is_a_label(self):
        xml = NEW_VEHICLE.replace(POWER_LABEL, 'Maximum net power (kW) [vehicle.maximumNetPowerKw]')
        self.assertEqual(rules(findings(xml), 'V-11'), [])

    def test_bare_power_without_the_indicator_is_no_error(self):
        xml = INDICATOR_ROW.sub('', bare(NEW_VEHICLE, POWER_LABEL, 'vehicle.maximumNetPowerKw'), count=1)
        self.assertNotIn('[vehicle.newMeansOfTransportIndicator]', xml)
        self.assertEqual(rules(findings(xml), 'V-11'), [])

    def test_bare_power_with_indicator_false_is_no_error(self):
        xml = bare(NEW_VEHICLE, POWER_LABEL, 'vehicle.maximumNetPowerKw')
        xml = re.sub(r'(\[vehicle\.newMeansOfTransportIndicator\]</ram:Description>\s*<ram:Value>)true', r'\1false', xml)
        self.assertEqual(rules(findings(xml), 'V-11'), [])

    def test_bare_power_on_a_used_sale_line_is_no_error(self):
        xml = bare(BASE, POWER_LABEL, 'vehicle.maximumNetPowerKw')
        out = findings(xml)
        self.assertEqual(rules(out, 'V-11'), [])
        self.assertEqual([f for f in out['findings'] if f['severity'] in ('error', 'warning')], [])

    def test_bare_power_from_a_seller_in_another_state_is_no_error(self):
        xml = bare(NEW_VEHICLE, POWER_LABEL, 'vehicle.maximumNetPowerKw')
        seller = xml.index('<ram:SellerTradeParty>')
        xml = xml[:seller] + xml[seller:].replace('<ram:CountryID>DE</ram:CountryID>', '<ram:CountryID>FR</ram:CountryID>', 1)
        self.assertIn('<ram:CountryID>FR</ram:CountryID>', xml)
        self.assertEqual(rules(findings(xml), 'V-11'), [])

    def test_bare_power_on_a_line_outside_category_k_is_no_error(self):
        xml = bare(NEW_VEHICLE, POWER_LABEL, 'vehicle.maximumNetPowerKw')
        xml = xml.replace('<ram:CategoryCode>K</ram:CategoryCode>', '<ram:CategoryCode>S</ram:CategoryCode>', 1)
        self.assertEqual(rules(findings(xml), 'V-11'), [])

    def test_one_labelled_row_next_to_a_bare_one_is_still_an_error(self):
        xml = bare(NEW_VEHICLE, CAPACITY_LABEL, 'vehicle.engineCapacityCm3')
        self.assertEqual([s for s, m in rules(findings(xml), 'V-11')], ['error'])

    def test_seller_country_is_read_from_ubl(self):
        ubl = vehicle_check.parse(str(ROOT / 'corpus/sale-25a.peppol.ubl.xml'))
        self.assertEqual(ubl['seller'], 'DE')

    def test_statutory_key_is_still_an_error_when_bare(self):
        xml = bare(NEW_VEHICLE, 'Neues Fahrzeug (USt) [vehicle.newMeansOfTransportIndicator]', 'vehicle.newMeansOfTransportIndicator')
        self.assertEqual([s for s, m in rules(findings(xml), 'V-11')], ['error'])


class RegistryField(unittest.TestCase):
    def test_only_power_and_capacity_depend_on_the_indicator(self):
        conditional = {k['key']: k['labelRequiredWhen'] for k in REGISTRY['keys'] if 'labelRequiredWhen' in k}
        self.assertEqual(conditional, {'vehicle.maximumNetPowerKw': 'vehicle.newMeansOfTransportIndicator',
                                       'vehicle.engineCapacityCm3': 'vehicle.newMeansOfTransportIndicator'})

    def test_the_case_is_german_intra_community_supply(self):
        for k in REGISTRY['keys']:
            if 'labelRequiredWhen' in k:
                self.assertEqual((k['labelRequiredVatCategory'], k['labelRequiredSellerCountry']), ('K', 'DE'), k['key'])

    def test_they_stay_non_statutory(self):
        statutory = {k['key'] for k in REGISTRY['keys'] if k['statutory']}
        self.assertFalse({'vehicle.maximumNetPowerKw', 'vehicle.engineCapacityCm3'} & statutory)


if __name__ == '__main__':
    unittest.main()
