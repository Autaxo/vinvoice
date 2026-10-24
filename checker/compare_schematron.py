# SPDX-License-Identifier: Apache-2.0
"""Compares the Schematron findings (SVRL) with the reference checker's expected findings.

Usage: python3 -I checker/compare_schematron.py <dir with one .svrl per corpus file>

Conforming corpus files must produce no Schematron error or warning. For every file, the errors
and warnings the Schematron raises must equal the reference checker's, restricted to the rules
the Schematron implements.
"""
import json
import pathlib
import re
import sys
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parent.parent
SVRL = '{http://purl.oclc.org/dsdl/svrl}'
# Checker-only rules: VIN check digit, plate comparison, reader notes. (The 6,000 km / six months
# test of V-08 is checker-only too; no corpus file triggers it.) Information findings are not compared.
CHECKER_ONLY = {'V-05', 'V-18', 'V-19', 'V-20'}
SEVERITY = {'error': 'error', 'warning': 'warning'}


def svrl_findings(path):
    root = ET.parse(path).getroot()
    found = set()
    for el in root.iter():
        if el.tag in (SVRL + 'failed-assert', SVRL + 'successful-report'):
            role = el.get('role', 'error')
            if role in SEVERITY:
                found.add((re.match(r'V-\d\d', el.get('id', '')).group(0), role))
    return found


def main(svrl_dir):
    expected = json.loads((ROOT / 'corpus/checker-expected.json').read_text())
    failures = []
    for xml in sorted((ROOT / 'corpus').glob('*.xml')):
        got = svrl_findings(pathlib.Path(svrl_dir) / (xml.stem + '.svrl'))
        want = {(f['rule'], f['severity']) for f in expected[xml.name]['findings']
                if f['severity'] in SEVERITY and f['rule'] not in CHECKER_ONLY}
        status = 'ok' if got == want else 'MISMATCH'
        print(f'{status:8} {xml.name}: {sorted(got)}')
        if got != want:
            failures.append(f'{xml.name}: schematron {sorted(got - want)} extra, {sorted(want - got)} missing')
    if failures:
        print('\n'.join(failures), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1]))
