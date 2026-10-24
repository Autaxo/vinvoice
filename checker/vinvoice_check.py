# SPDX-License-Identifier: Apache-2.0
"""Reference reader and checker for the VINvoice convention.

Reads CII (rsm:CrossIndustryInvoice) or UBL (Invoice, CreditNote). Never rejects an invoice:
findings only say whether a line conforms to VINvoice. Key names, grammars, labels and the
statutory flag come from generated/registry.json, so the checker follows the registry without
code changes; keys it needs by role (marker, VIN, ...) are looked up in registry["refs"].

Usage: python3 -I checker/vinvoice_check.py generated/registry.json invoice.xml ...
Prints one JSON report per file. Implements the reading rules of the specification and the
rules V-01 to V-22.
"""
import datetime
import json
import re
import sys
import xml.etree.ElementTree as ET

NS = {'ram': 'urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100',
      'rsm': 'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100',
      'udt': 'urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100',
      'cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
      'cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'}
# ISO 3779 / Reg. (EU) 2021/535 Annex II check digit
TR = {**{str(i): i for i in range(10)},
      **dict(zip('ABCDEFGHJKLMNPRSTUVWXYZ', [1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 7, 9, 2, 3, 4, 5, 6, 7, 8, 9]))}
W = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]
MARGIN_NOTE = re.compile(r'Gebrauchtgegenst(ä|ae)nde\s*/\s*Sonderregelung|Margin scheme', re.I)


def vin_ok(v):
    if not re.fullmatch(r'[A-HJ-NPR-Z0-9]{17}', v):
        return False
    s = sum(TR[c] * w for c, w in zip(v, W)) % 11
    return v[8] == ('X' if s == 10 else str(s))


def real_date(v):
    try:
        if len(v) == 10:
            return datetime.date.fromisoformat(v)
        if len(v) == 7:
            return datetime.date.fromisoformat(v + '-01')
    except ValueError:
        return False
    return None


def t(el, path):
    x = el.find(path, NS)
    return x.text.strip() if x is not None and x.text else None


def parse(path):
    root = ET.parse(path).getroot()
    doc = {'lines': []}
    if root.tag.endswith('CrossIndustryInvoice'):
        doc['syntax'] = 'CII'
        doc['typeCode'] = t(root, 'rsm:ExchangedDocument/ram:TypeCode')
        doc['notes'] = [n.text or '' for n in root.findall('rsm:ExchangedDocument/ram:IncludedNote/ram:Content', NS)]
        d = t(root, './/ram:ApplicableHeaderTradeDelivery/ram:ActualDeliverySupplyChainEvent/ram:OccurrenceDateTime/udt:DateTimeString') \
            or t(root, 'rsm:ExchangedDocument/ram:IssueDateTime/udt:DateTimeString')
        doc['refDate'] = datetime.date(int(d[:4]), int(d[4:6]), int(d[6:8])) if d else None
        doc['bt18'] = [(t(x, 'ram:IssuerAssignedID'), t(x, 'ram:ReferenceTypeCode'))
                       for x in root.findall('.//ram:ApplicableHeaderTradeAgreement/ram:AdditionalReferencedDocument', NS)
                       if t(x, 'ram:TypeCode') == '130']
        for li in root.findall('.//ram:IncludedSupplyChainTradeLineItem', NS):
            chars = li.findall('ram:SpecifiedTradeProduct/ram:ApplicableProductCharacteristic', NS)
            doc['lines'].append(dict(
                id=t(li, 'ram:AssociatedDocumentLineDocument/ram:LineID'),
                rows=[(t(c, 'ram:Description'), t(c, 'ram:Value')) for c in chars],
                valueMeasure=[t(c, 'ram:Description') for c in chars if c.find('ram:ValueMeasure', NS) is not None],
                refs=[(t(x, 'ram:IssuerAssignedID'), t(x, 'ram:ReferenceTypeCode'))
                      for x in li.findall('ram:SpecifiedLineTradeSettlement/ram:AdditionalReferencedDocument', NS)]
                + [(t(x, 'ram:IssuerAssignedID'), t(x, 'ram:ReferenceTypeCode'))
                   for x in li.findall('ram:AdditionalReferencedDocument', NS)],
                qty=t(li, 'ram:SpecifiedLineTradeDelivery/ram:BilledQuantity'),
                cat=t(li, 'ram:SpecifiedLineTradeSettlement/ram:ApplicableTradeTax/ram:CategoryCode')))
    else:
        doc['syntax'] = 'UBL'
        doc['typeCode'] = t(root, 'cbc:InvoiceTypeCode') or t(root, 'cbc:CreditNoteTypeCode')
        doc['notes'] = [n.text or '' for n in root.findall('cbc:Note', NS)]
        d = t(root, 'cac:Delivery/cbc:ActualDeliveryDate') or t(root, 'cbc:IssueDate')
        doc['refDate'] = datetime.date.fromisoformat(d) if d else None
        doc['bt18'] = [(t(x, 'cbc:ID'), x.find('cbc:ID', NS).get('schemeID'))
                       for x in root.findall('cac:AdditionalDocumentReference', NS) if t(x, 'cbc:DocumentTypeCode') == '130']
        for li in root.findall('cac:InvoiceLine', NS) + root.findall('cac:CreditNoteLine', NS):
            doc['lines'].append(dict(
                id=t(li, 'cbc:ID'),
                rows=[(t(p, 'cbc:Name'), t(p, 'cbc:Value')) for p in li.findall('cac:Item/cac:AdditionalItemProperty', NS)],
                valueMeasure=[t(p, 'cbc:Name') for p in li.findall('cac:Item/cac:AdditionalItemProperty', NS)
                              if p.find('cbc:ValueQuantity', NS) is not None],
                refs=[(t(x, 'cbc:ID'), x.find('cbc:ID', NS).get('schemeID')) for x in li.findall('cac:DocumentReference', NS)],
                qty=t(li, 'cbc:InvoicedQuantity') or t(li, 'cbc:CreditedQuantity'),
                cat=t(li, 'cac:Item/cac:ClassifiedTaxCategory/cbc:ID')))
    return doc


def check(registry, path):
    R = {k['key']: k for k in registry['keys']}
    K = registry['refs']                     # role -> key, e.g. K['marker'] = 'vehicle.profile'
    prefix = registry['prefix']
    word = prefix.rstrip('.')                # 'vehicle', used in messages
    current_major = re.match(r'^[a-z]+/([0-9]+)\.', registry['version']).group(1)
    key_re = re.escape(prefix) + r'[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)*'
    NAME = re.compile(r'^(?:(?P<label>\S(?:.*\S)?) \[(?P<k1>' + key_re + r')\]|(?P<k2>' + key_re + r'))$')
    ODO = (K['odometerKm'], K['odometerMi'])
    labels = {k['key']: {k['labelDe'], k['labelEn']} for k in registry['keys']}
    doc = parse(path)
    out = {'file': path.split('/')[-1], 'syntax': doc['syntax'], 'vehicles': [], 'level0': [], 'attached': [],
           'ignored': [], 'findings': []}

    def F(sev, rule, line, msg):
        out['findings'].append({'severity': sev, 'rule': rule, 'line': line, 'msg': msg})

    hdr_vin = next((i for i, s in doc['bt18'] if s in ('AKG', 'VT')), None)
    pending = []
    for ln in doc['lines']:
        lid = ln['id']
        kv = {}
        for n, v in ln['rows']:                                   # step 1: labelled or bare names
            m = NAME.match((n or '').strip())
            if not m:
                continue
            k = m.group('k1') or m.group('k2')
            if len(n) > 64:
                F('info', 'V-11', lid, f'name longer than 64 characters: {n!r}')
            if m.group('k1') and k in labels and m.group('label') not in labels[k]:
                F('info', 'V-11', lid, f'label {m.group("label")!r} not in the registry set for {k}')
            if m.group('k2') and R.get(k, {}).get('statutory'):
                F('error', 'V-11', lid, f'statutory key {k} in bare form; the labelled form is mandatory')
            if k in kv and not R.get(k, {}).get('repeatable'):
                F('warning', 'V-03', lid, f'duplicate {k}; first value kept')
                continue
            kv.setdefault(k, []).append(v or '')
        for nm in ln['valueMeasure']:
            if nm and NAME.match(nm.strip()):
                F('error', 'V-14', lid, f'ValueMeasure/ValueQuantity used for {nm!r}; BT-161 must stay in Value')
        vin128 = next((i for i, s in ln['refs'] if s in ('AKG', 'VT')), None)
        abz = next((i for i, s in ln['refs'] if s == 'ABZ'), None)
        if K['marker'] not in kv:                                 # step 2: Level 0 / unmarked
            if any(k.startswith(prefix) for k in kv):
                F('info', 'V-15', lid, f'{word} rows on an unmarked line are ignored')
            if vin128 or abz:
                pending.append((lid, vin128, abz))
            continue
        marker = kv[K['marker']][0]
        if not re.fullmatch(R[K['marker']]['grammar'], marker):
            F('error', 'V-02', lid, f'bad marker value {marker!r}; line treated as unmarked')
            continue
        if marker.split('/')[1].split('.')[0] != current_major:   # step 3
            F('warning', 'V-21', lid, f'unknown major version {marker}; {word} rows skipped')
            continue
        first = NAME.match((ln['rows'][0][0] or '').strip()) if ln['rows'] else None
        if first and (first.group('k1') or first.group('k2')) != K['marker']:
            F('info', 'V-11', lid, 'marker is not the first row (SHOULD)')
        rec = {}
        for k, vals in kv.items():                                # step 4: grammars
            if k.startswith(prefix + 'x.'):
                continue                                          # vendor keys: ignored
            if k not in R:
                F('info', 'V-22', lid, f'unknown key {k} ignored')
                continue
            good = []
            for v in vals:
                ok = re.fullmatch(R[k]['grammar'], v) is not None
                if ok and ('date' in R[k]['valueFormat'].lower() or R[k]['valueFormat'].startswith('YYYY')):
                    ok = real_date(v) is not False
                if ok:
                    good.append(v)
                else:
                    F('error', 'V-02', lid, f'{k}={v!r} violates the registry grammar; value dropped by the reader')
            if good:
                rec[k] = good if R[k]['repeatable'] else good[0]
        role = rec.get(K['role'])
        if K['role'] not in kv:
            F('error', 'V-01', lid, f'marker without {K["role"]}')
        if len(ln['refs']) > 1:
            F('error', 'V-12', lid, 'more than one BT-128 on the line')
        vin = vin128 or rec.get(K['vin']) or hdr_vin              # step 5
        if vin128 and rec.get(K['vin']) and vin128 != rec[K['vin']]:
            F('warning', 'V-04', lid, f'BT-128 {vin128} differs from {K["vin"]} {rec[K["vin"]]}; BT-128 wins')
        if vin and not vin_ok(vin):
            F('warning', 'V-05', lid, f'VIN {vin} is not 17 ISO 3779 characters or its check digit fails')
        if abz:                                                   # step 7
            if rec.get(K['plate']) and re.sub('[ -]', '', abz) != re.sub('[ -]', '', rec[K['plate']]):
                F('warning', 'V-18', lid, f'BT-128 ABZ plate differs from {K["plate"]}')
        odo = [k for k in ODO if k in rec]
        status = rec.get(K['odometerStatus'], 'displayed')
        no_reading_ok = status in ('defective', 'unknown')
        if len(odo) == 2:
            F('error', 'V-13', lid, f'{ODO[0]} and {ODO[1]} on the same line')
        if odo and no_reading_ok:
            F('error', 'V-17', lid, f'odometer value given although {K["odometerStatus"]} = {status}')
        qty = ln['qty']
        if role in ('supply', 'trade-in') and qty is not None and float(qty) != 1:
            F('error', 'V-06', lid, f'role {role} with quantity {qty}; one vehicle per line')
        cat = ln['cat']
        if rec.get(K['marginScheme']) == 'true':
            if cat == 'K':
                F('error', 'V-07', lid, 'margin scheme on an intra-EU supply (category K): excluded by Art. 313(2) Directive, § 25a Abs. 7 Nr. 1 b and Nr. 3 UStG')
            elif cat not in ('E', 'F', 'G'):
                F('warning', 'V-07', lid, f'margin scheme with VAT category {cat}; expected E (2017), F (2026) or G (export)')
            if not any(MARGIN_NOTE.search(n) for n in doc['notes']):
                F('warning', 'V-07', lid, "margin line but no BG-1 note with 'Gebrauchtgegenstände/Sonderregelung' or the Art. 226(14) mention")
            if rec.get(K['condition']) == 'new':
                F('warning', 'V-07', lid, 'margin scheme with condition = new is unusual; check § 25a Abs. 1 Nr. 2')
        if rec.get(K['newMeansOfTransport']) == 'true':
            if not {K['power'], K['displacement']} & rec.keys():
                F('error', 'V-08', lid, f'new means of transport without {K["power"]} or {K["displacement"]}')
            if not odo and K['firstUse'] not in rec:
                F('error', 'V-08', lid, f'new means of transport without any newness feature (no odometer value, no {K["firstUse"]})')
            else:
                if not odo:
                    F('warning', 'V-08', lid, 'new means of transport without an odometer value (KoSIT/FeRD row Laufleistung)')
                if K['firstUse'] not in rec and K['firstRegistration'] in rec:
                    F('warning', 'V-08', lid, f'registered new means of transport without {K["firstUse"]} (row Zeitpunkt der ersten Inbetriebnahme)')
            km = int(rec[ODO[0]]) if ODO[0] in rec else (int(rec[ODO[1]]) * 1.609344 if ODO[1] in rec else None)
            fu = real_date(rec[K['firstUse']]) if K['firstUse'] in rec else None
            ref = doc['refDate']
            if km is not None and km > 6000 and fu and ref:
                six = datetime.date(fu.year + (fu.month + 5) // 12, (fu.month + 5) % 12 + 1, min(fu.day, 28))
                if ref > six:
                    F('warning', 'V-08', lid, 'over 6,000 km and first use more than 6 months before the reference date: not new under § 1b Abs. 3')
        if role in ('supply', 'trade-in') and rec.get(K['condition']) in ('used', 'demonstrator', 'pre-registered'):
            if not (odo or no_reading_ok) or K['firstRegistration'] not in rec:
                F('warning', 'V-09', lid, 'used/demonstrator/pre-registered supply without odometer (or status) or first registration')
        if role == 'service':
            if not (vin or rec.get(K['plate']) or abz):
                F('warning', 'V-10', lid, 'service line without VIN and plate')
            if not (odo or no_reading_ok):
                F('warning', 'V-10', lid, 'service line without odometer reading or status')
        if K['batterySoh'] in rec and K['batterySohDate'] not in rec:
            F('warning', 'V-16', lid, f'{K["batterySoh"]} without {K["batterySohDate"]}')
        out['vehicles'].append({'line': lid, 'level': 2 if vin128 else 1, 'vin': vin, 'plate': rec.get(K['plate']) or abz,
                                'version': marker, 'facts': rec})
    known = {v['vin'] for v in out['vehicles'] if v['vin']}
    for lid, vin128, abz in pending:                              # step 6
        if vin128 and vin128 in known:
            out['attached'].append({'line': lid, 'vin': vin128})
            F('info', 'V-20', lid, f'unmarked line attached to vehicle {vin128} by BT-128')
        else:
            out['level0'].append({'line': lid, 'vin': vin128, 'plate': abz})
            F('info', 'V-19', lid, 'Level 0: vehicle identified by BT-128 only' + (' (ABZ = plate, never a VIN)' if abz and not vin128 else ''))
    if hdr_vin and not out['vehicles'] and not out['level0']:
        out['level0'].append({'line': None, 'vin': hdr_vin, 'plate': None})
        F('info', 'V-19', None, 'Level 0: vehicle identified by BT-18 only')
    return out                                                    # step 9: never rejects


if __name__ == '__main__':
    reg = json.load(open(sys.argv[1], encoding='utf-8'))
    for p in sys.argv[2:]:
        print(json.dumps(check(reg, p), ensure_ascii=False, indent=1, default=str))
