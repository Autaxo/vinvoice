# SPDX-License-Identifier: Apache-2.0
"""Regression test: the checker must reproduce corpus/checker-expected.json for every corpus file.

Run: python3 -I -m unittest discover -s checker -v
After an intended change of the checker or the corpus, refresh the expectations with
  python3 -I checker/test_corpus.py --update
and review the diff.
"""
import json
import pathlib
import re
import sys
import unittest

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
import vehicle_check  # noqa: E402

REGISTRY = json.loads((ROOT / 'generated/registry.json').read_text(encoding='utf-8'))
EXPECTED_FILE = ROOT / 'corpus/checker-expected.json'
CORPUS = sorted((ROOT / 'corpus').glob('*.xml'))


def run(path):
    # Round trip through JSON so that dates and tuples compare like the stored expectations.
    return json.loads(json.dumps(vehicle_check.check(REGISTRY, str(path)), ensure_ascii=False, default=str))


class Corpus(unittest.TestCase):
    def test_every_file_matches_expectations(self):
        expected = json.loads(EXPECTED_FILE.read_text(encoding='utf-8'))
        for path in CORPUS:
            with self.subTest(file=path.name):
                self.assertIn(path.name, expected, 'no expectation; run with --update')
                self.assertEqual(run(path), expected[path.name])

    def test_conforming_files_have_no_errors_or_warnings(self):
        for path in CORPUS:
            if path.name.startswith('neg'):
                continue
            with self.subTest(file=path.name):
                bad = [f for f in run(path)['findings'] if f['severity'] in ('error', 'warning')]
                self.assertEqual(bad, [])

    def test_negative_controls_have_errors(self):
        for path in CORPUS:
            if path.name.startswith('neg'):
                with self.subTest(file=path.name):
                    self.assertTrue(any(f['severity'] == 'error' for f in run(path)['findings']))

    def test_grammars_compile_in_python(self):
        for k in REGISTRY['keys']:
            with self.subTest(key=k['key']):
                re.compile(k['grammar'].replace('\\p{Lu}', vehicle_check.lu_class()))


if __name__ == '__main__':
    if '--update' in sys.argv:
        EXPECTED_FILE.write_text(
            json.dumps({p.name: run(p) for p in CORPUS}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
        print(f'wrote {EXPECTED_FILE.relative_to(ROOT)}')
    else:
        unittest.main()
