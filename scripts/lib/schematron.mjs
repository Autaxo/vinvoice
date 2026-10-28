// Generates generated/vinvoice.sch, an ISO Schematron (queryBinding xslt2) version of the reference
// checker's rules (checker/vehicle_check.py), so that VINvoice checks can run in the same
// validators as EN 16931, XRechnung and Peppol. Rule ids follow the checker (V-01 ... V-22).
// Checker only: V-05 (VIN check digit, due by first registration date), the 6,000 km / six months test of V-08, V-18
// (registration number in BT-128 vs row), V-19 and V-20 (reader notes).
//
// Like the reference reader, the rules first drop values that fail their grammar and then judge the
// remaining facts: vv:fact() returns a key's first value only if it is valid. Keys the rules need by
// role come from the registry's refs.

const xml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
const str = (s) => `'${String(s).replace(/'/g, "''")}'`; // XPath string literal
const seq = (items) => `(${items.map(str).join(', ')})`;
// A VIN as BT-128 with scheme VT must have the ISO 3779 form; UNTDID 1153 VT is normally a registration number.
const VIN_FORM = '^[A-HJ-NPR-Z0-9]{17}$';
const reEscape = (s) => s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');

// Negated character class body such as "\x00-\x1F\x7F\u200E" as an XPath expression that builds
// the same class for matches(). C0 controls and DEL become \p{Cc}; other code points are spelled
// with codepoints-to-string() so that no invisible character ends up in the generated file.
function negatedClass(body) {
  const toks = [];
  for (let i = 0; i < body.length;) {
    if (body.startsWith('\\x', i)) (toks.push(parseInt(body.slice(i + 2, i + 4), 16)), (i += 4));
    else if (body.startsWith('\\u', i))
      (toks.push(parseInt(body.slice(i + 2, i + 6), 16)), (i += 6));
    else if (body[i] === '-') (toks.push('-'), i++);
    else if (body[i] === '\\') return null;
    else {
      const cp = body.codePointAt(i);
      toks.push(cp);
      i += cp > 0xffff ? 2 : 1;
    }
  }
  const parts = [`'[\\p{Cc}'`];
  for (let j = 0; j < toks.length; j++) {
    const a = toks[j];
    const b = toks[j + 1] === '-' ? toks[j + 2] : a;
    if (toks[j + 1] === '-') j += 2;
    if (b <= 0x1f || (a === 0x7f && b === 0x7f)) continue; // inside \p{Cc}
    parts.push(
      a === b
        ? `codepoints-to-string(${a})`
        : `codepoints-to-string(${a}), '-', codepoints-to-string(${b})`
    );
  }
  return `concat(${parts.join(', ')}, ']')`;
}

/** XPath test that $value matches the key's grammar, or null if it cannot be expressed. */
export function grammarTest(k) {
  const g = k.grammar;
  let test = null;
  if (!/\(\?|\\[xubBdDwW]/.test(g)) {
    test = `matches($value, ${str(g)})`;
  } else {
    // Free text: ^(?![<first>])(?!.*\s$)[^<excluded>]{min,max}$
    const m = g.match(
      /^\^\(\?!\[([^\]]+)\]\)\(\?!\.\*\\s\$\)\[\^([^\]]+)\]\{([0-9]+),([0-9]+)\}\$$/
    );
    const cls = m && negatedClass(m[2]);
    if (cls) {
      test =
        `string-length($value) ge ${m[3]} and string-length($value) le ${m[4]}` +
        ` and not(matches($value, ${str('^[' + m[1] + ']')})) and not(matches($value, '\\s$'))` +
        ` and not(matches($value, ${cls}))`;
    }
  }
  if (test && k.representationTerm === 'Date') {
    test += ` and (if (string-length($value) = 7) then concat($value, '-01') castable as xs:date else $value castable as xs:date)`;
  }
  return test;
}

// Art. 226(14) wording in the main language versions, as in the reference checker.
const MARGIN_NOTE =
  'Gebrauchtgegenst(ä|ae)nde\\s*/\\s*Sonderregelung|Differenzbesteuerung|Margin scheme|R[ée]gime (particulier|de la marge)|Regime del margine|R[ée]gimen especial|Margeregeling|Procedura mar[żz]y';

export function schematron({ meta, keys, refs, reserved }) {
  const K = refs; // role -> full key
  const keyRe = meta.keyGrammar.replace(/^\^/, '').replace(/\$$/, '');
  const statutory = keys.filter((k) => k.statutory).map((k) => k.key);
  const repeatable = keys.filter((k) => k.repeatable).map((k) => k.key);
  const known = keys.map((k) => k.key);
  const reservedKeys = reserved.map((r) => r.key);
  const labels = keys.flatMap((k) => [`${k.key}|${k.labelDe}`, `${k.key}|${k.labelEn}`]);
  const markerRe = meta.markerGrammar;
  const markerMajor = `${markerRe.match(/^\^([a-z]+\/)/)[1]}${meta.version.match(/\/([0-9]+)\./)[1]}.`;

  const tests = keys.map((k) => [k, grammarTest(k)]);
  const skipped = tests.filter(([, t]) => !t).map(([k]) => k.key);
  const validChain =
    tests
      .filter(([, t]) => t)
      .map(([k, t]) => `if ($key = ${str(k.key)}) then (${t})`)
      .join('\n      else ') + '\n      else true()';

  const has = (role) => `vv:fact(., ${str(K[role])}) != ''`;
  const val = (role) => `vv:fact(., ${str(K[role])})`;

  // prettier-ignore
  const lineAsserts = [
    ['V-02-marker', 'error', `not($marked) or $valid`, `The marker ${K.marker} has the malformed value '<value-of select="$markerValue"/>'; the line is treated as unmarked.`],
    ['V-21', 'warning', `not($valid) or $current`, `Unknown major version '<value-of select="$markerValue"/>'; the rows of this line are skipped.`],
    ['V-15', 'information', `$marked or not($keys != '')`, `Rows with registry keys on a line without the marker ${K.marker} are ignored.`],
    ['V-01', 'error', `not($current) or $keys = ${str(K.role)}`, `A vehicle line needs the role row ${K.role}.`],
    ['V-03', 'warning', `not($current) or count($single) = count(distinct-values($single))`, `A key that is not repeatable appears more than once; readers keep the first value.`],
    ['V-12', 'error', `not($current) or count($bt128) le 1`, `More than one line object identifier (BT-128) on a vehicle line.`],
    ['V-04', 'warning', `not($current and $vinAkg != '' and ${has('vin')}) or $vinAkg = ${val('vin')}`, `BT-128 (<value-of select="$vinAkg"/>) differs from ${K.vin}; BT-128 wins.`],
    ['V-04-VT', 'warning', `not($current and $vinAkg = '' and $vinVt != '' and ${has('vin')}) or $vinVt = ${val('vin')}`, `BT-128 with scheme VT (<value-of select="$vinVt"/>) differs from ${K.vin}; ${K.vin} wins.`],
    ['V-13', 'error', `not($current and ${has('odometerKm')} and ${has('odometerMi')})`, `${K.odometerKm} and ${K.odometerMi} on the same line.`],
    ['V-17', 'error', `not($current and $odometer and $noReading)`, `An odometer reading is given although ${K.odometerStatus} says no reading is available.`],
    ['V-06', 'error', `not($current and $role = ('supply', 'trade-in') and $qty != '') or number($qty) = 1`, `A line with role '<value-of select="$role"/>' has quantity <value-of select="$qty"/>; one vehicle per line.`],
    ['V-07-K', 'error', `not($current and $margin) or $category != 'K'`, `${K.marginScheme} on a line with VAT category K: Art. 139(3) of Directive 2006/112/EC and § 25a(7) no. 3 UStG exclude the intra-community exemption.`],
    ['V-07-category', 'warning', `not($current and $margin) or $category = ('E', 'F', 'G', 'K')`, `${K.marginScheme} with VAT category '<value-of select="$category"/>'; expected E (2017 model), F (2026 model) or G (export).`],
    ['V-07-note', 'warning', `not($current and $margin) or $marginNote`, `Margin-scheme line, but no invoice note (BG-1) with the Art. 226(14) wording.`],
    ['V-07-new', 'warning', `not($current and $margin) or ${val('condition')} != 'new'`, `${K.marginScheme} together with ${K.condition} = new is unusual.`],
    ['V-08-power', 'error', `not($current and $newMeans) or ${has('power')} or ${has('engineCapacity')}`, `A new means of transport needs ${K.power} or ${K.engineCapacity}.`],
    ['V-08-newness', 'error', `not($current and $newMeans) or $odometer or ${has('firstEntryIntoService')}`, `A new means of transport needs an odometer reading or ${K.firstEntryIntoService}.`],
    ['V-08-odometer', 'warning', `not($current and $newMeans and ${has('firstEntryIntoService')}) or $odometer`, `A new means of transport without an odometer reading.`],
    ['V-08-first-entry', 'warning', `not($current and $newMeans and ($odometer or ${has('firstEntryIntoService')}) and ${has('firstRegistrationDate')}) or ${has('firstEntryIntoService')}`, `A registered new means of transport without ${K.firstEntryIntoService}.`],
    ['V-09-odometer', 'warning', `not($current and $role = ('supply', 'trade-in') and ${val('condition')} = 'used' and $odometerExpected) or $odometer or $noReading`, `A used vehicle supplied without an odometer reading (or a status saying none is available).`],
    ['V-09-first-registration', 'information', `not($current and $role = ('supply', 'trade-in') and ${val('condition')} = 'used') or ${has('firstRegistrationDate')}`, `A used vehicle supplied without ${K.firstRegistrationDate}; correct only if it was never registered.`],
    ['V-10-id', 'warning', `not($current and $role = 'service') or $vin128 != '' or ${has('vin')} or ${has('registrationNumber')} or $abz or $vin18`, `A service line without VIN or registration number.`],
    ['V-10-odometer', 'warning', `not($current and $role = 'service' and $odometerExpected) or $odometer or $noReading`, `A service line without an odometer reading or status.`],
    ['V-16-date', 'warning', `not($current and ${has('stateOfHealth')}) or ${has('stateOfHealthDate')}`, `${K.stateOfHealth} without ${K.stateOfHealthDate}.`],
    ['V-16-method', 'warning', `not($current and ${has('stateOfHealth')}) or ${has('stateOfHealthMethod')}`, `${K.stateOfHealth} without ${K.stateOfHealthMethod}.`],
  ];

  // prettier-ignore
  const rowAsserts = [
    ['V-02', 'error', `not($current) or $key = '' or not($key = ${seq(known)}) or vv:valid($key, $value)`, `<value-of select="$key"/> = '<value-of select="$value"/>' does not match its grammar; readers drop the value.`],
    ['V-14', 'error', `$key = '' or not(ram:ValueMeasure or cbc:ValueQuantity)`, `Row '<value-of select="$name"/>' uses a measure or quantity element; BT-161 stays in the text value.`],
    ['V-11-statutory', 'error', `not($current and $bare and $key = ${seq(statutory)})`, `The statutory key <value-of select="$key"/> must be written with its label.`],
    ['V-11-key-length', 'information', `not($current) or string-length($key) le ${meta.keyCap}`, `Key <value-of select="$key"/> is longer than ${meta.keyCap} characters.`],
    ['V-11-name-length', 'information', `not($current) or $key = '' or string-length($name) le ${meta.nameCap}`, `Row name '<value-of select="$name"/>' is longer than ${meta.nameCap} characters.`],
    ['V-11-label', 'information', `not($current) or $bare or $key = '' or not($key = ${seq(known)}) or concat($key, '|', $label) = ${seq(labels)}`, `Label '<value-of select="$label"/>' is not a registry label of <value-of select="$key"/>.`],
    ['V-22-reserved', 'information', `not($current) or not($key = ${seq(reservedKeys.length ? reservedKeys : [''])})`, `<value-of select="$key"/> is a reserved name, not a key; ignored.`],
    ['V-22-unknown', 'information', `not($current) or $key = '' or $key = (${seq(known)}, ${seq(reservedKeys.length ? reservedKeys : [''])})`, `Unknown key <value-of select="$key"/>, ignored.`],
  ];

  const assert = ([id, role, test, msg]) =>
    `      <assert id="${id}" role="${role}" test="${xml(test)}">${msg.replace(/&/g, '&amp;')}</assert>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<!--
  VINvoice rules as ISO Schematron. GENERATED from registry/ by scripts/generate.mjs: do not edit.
  Registry ${meta.version} (${meta.date}). SPDX-License-Identifier: Apache-2.0

  Works on CII (Factur-X, ZUGFeRD, XRechnung) and UBL (Peppol, XRechnung) invoices. Findings say
  whether a line conforms to VINvoice; they never make an EN 16931 invoice invalid. Rows whose key
  is not under '${meta.root}.' (vendor rows with reverse-DNS names) are ignored.
  Grammars that XPath regular expressions cannot express are left to the reference checker:
  ${skipped.join(', ') || 'none'}.
-->
<schema xmlns="http://purl.oclc.org/dsdl/schematron" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  queryBinding="xslt2">
  <title>VINvoice ${meta.version}</title>
  <ns prefix="xs" uri="http://www.w3.org/2001/XMLSchema"/>
  <ns prefix="vv" uri="https://vinvoice.org/ns/schematron"/>
  <ns prefix="rsm" uri="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"/>
  <ns prefix="ram" uri="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"/>
  <ns prefix="cac" uri="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"/>
  <ns prefix="cbc" uri="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"/>

  <xsl:function name="vv:trim" as="xs:string">
    <xsl:param name="s"/>
    <xsl:sequence select="replace(string($s), '^\\s+|\\s+$', '')"/>
  </xsl:function>
  <xsl:function name="vv:name" as="xs:string">
    <xsl:param name="row" as="element()"/>
    <xsl:sequence select="vv:trim(($row/ram:Description, $row/cbc:Name)[1])"/>
  </xsl:function>
  <xsl:function name="vv:key" as="xs:string">
    <xsl:param name="row" as="element()"/>
    <xsl:variable name="n" select="vv:name($row)"/>
    <xsl:sequence select="if (matches($n, '^\\S(.*\\S)? \\[${keyRe}\\]$')) then replace($n, '^.* \\[(${keyRe})\\]$', '$1')
      else if (matches($n, '^${keyRe}$')) then $n else ''"/>
  </xsl:function>
  <xsl:function name="vv:value" as="xs:string">
    <xsl:param name="row" as="element()"/>
    <xsl:sequence select="vv:trim(($row/ram:Value, $row/cbc:Value)[1])"/>
  </xsl:function>
  <xsl:function name="vv:rows" as="element()*">
    <xsl:param name="line" as="element()"/>
    <xsl:sequence select="$line/ram:SpecifiedTradeProduct/ram:ApplicableProductCharacteristic | $line/cac:Item/cac:AdditionalItemProperty"/>
  </xsl:function>
  <xsl:function name="vv:first" as="xs:string">
    <xsl:param name="line" as="element()"/>
    <xsl:param name="key" as="xs:string"/>
    <xsl:sequence select="string((for $r in vv:rows($line)[vv:key(.) = $key] return vv:value($r))[1])"/>
  </xsl:function>
  <xsl:function name="vv:valid" as="xs:boolean">
    <xsl:param name="key" as="xs:string"/>
    <xsl:param name="value" as="xs:string"/>
    <xsl:sequence select="${xml(validChain)}"/>
  </xsl:function>
  <xsl:function name="vv:fact" as="xs:string">
    <xsl:param name="line" as="element()"/>
    <xsl:param name="key" as="xs:string"/>
    <xsl:variable name="v" select="vv:first($line, $key)"/>
    <xsl:sequence select="if ($v != '' and vv:valid($key, $v)) then $v else ''"/>
  </xsl:function>
  <xsl:function name="vv:current" as="xs:boolean">
    <xsl:param name="line" as="element()"/>
    <xsl:variable name="m" select="vv:first($line, ${str(K.marker)})"/>
    <xsl:sequence select="matches($m, ${xml(str(markerRe))}) and starts-with($m, ${str(markerMajor)})"/>
  </xsl:function>

  <pattern id="vehicle-lines">
    <rule context="ram:IncludedSupplyChainTradeLineItem | cac:InvoiceLine | cac:CreditNoteLine">
      <let name="keys" value="for $r in vv:rows(.) return vv:key($r)"/>
      <let name="marked" value="$keys = ${str(K.marker)}"/>
      <let name="markerValue" value="vv:first(., ${str(K.marker)})"/>
      <let name="valid" value="$marked and matches($markerValue, ${xml(str(markerRe))})"/>
      <let name="current" value="vv:current(.)"/>
      <let name="single" value="$keys[. != '' and not(. = ${seq(repeatable.length ? repeatable : [''])})]"/>
      <let name="bt128" value="ram:SpecifiedLineTradeSettlement/ram:AdditionalReferencedDocument | ram:AdditionalReferencedDocument | cac:DocumentReference"/>
      <let name="vinAkg" value="normalize-space(string((ram:SpecifiedLineTradeSettlement/ram:AdditionalReferencedDocument[ram:ReferenceTypeCode = 'AKG']/ram:IssuerAssignedID, cac:DocumentReference/cbc:ID[@schemeID = 'AKG'])[1]))"/>
      <let name="vinVt" value="normalize-space(string((ram:SpecifiedLineTradeSettlement/ram:AdditionalReferencedDocument[ram:ReferenceTypeCode = 'VT'][matches(normalize-space(ram:IssuerAssignedID), '${VIN_FORM}')]/ram:IssuerAssignedID, cac:DocumentReference/cbc:ID[@schemeID = 'VT'][matches(normalize-space(.), '${VIN_FORM}')])[1]))"/>
      <let name="vin128" value="if ($vinAkg != '') then $vinAkg else $vinVt"/>
      <let name="abz" value="exists(ram:SpecifiedLineTradeSettlement/ram:AdditionalReferencedDocument[ram:ReferenceTypeCode = 'ABZ'] | cac:DocumentReference/cbc:ID[@schemeID = 'ABZ'])"/>
      <let name="vin18" value="exists(/rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeAgreement/ram:AdditionalReferencedDocument[ram:TypeCode = '130'][ram:ReferenceTypeCode = 'AKG' or (ram:ReferenceTypeCode = 'VT' and matches(normalize-space(ram:IssuerAssignedID), '${VIN_FORM}'))] | /*/cac:AdditionalDocumentReference[cbc:DocumentTypeCode = '130']/cbc:ID[@schemeID = 'AKG' or (@schemeID = 'VT' and matches(normalize-space(.), '${VIN_FORM}'))])"/>
      <let name="role" value="${val('role')}"/>
      <let name="odometer" value="${has('odometerKm')} or ${has('odometerMi')}"/>
      <let name="noReading" value="${val('odometerStatus')} = ('inoperative', 'unknown')"/>
      <let name="odometerExpected" value="${val('category')} = '' or substring(${val('category')}, 1, 1) = ('M', 'N', 'L')"/>
      <let name="margin" value="${val('marginScheme')} = 'true'"/>
      <let name="newMeans" value="${val('newMeansOfTransport')} = 'true'"/>
      <let name="qty" value="string((ram:SpecifiedLineTradeDelivery/ram:BilledQuantity, cbc:InvoicedQuantity, cbc:CreditedQuantity)[1])"/>
      <let name="category" value="string((ram:SpecifiedLineTradeSettlement/ram:ApplicableTradeTax/ram:CategoryCode, cac:Item/cac:ClassifiedTaxCategory/cbc:ID)[1])"/>
      <let name="marginNote" value="some $n in (/rsm:CrossIndustryInvoice/rsm:ExchangedDocument/ram:IncludedNote/ram:Content, /*/cbc:Note) satisfies matches($n, ${xml(str(MARGIN_NOTE))}, 'i')"/>
${lineAsserts.map(assert).join('\n')}
    </rule>
  </pattern>

  <pattern id="rows">
    <rule context="ram:ApplicableProductCharacteristic | cac:AdditionalItemProperty">
      <let name="line" value="(ancestor::ram:IncludedSupplyChainTradeLineItem | ancestor::cac:InvoiceLine | ancestor::cac:CreditNoteLine)[1]"/>
      <let name="current" value="exists($line) and vv:current($line)"/>
      <let name="name" value="vv:name(.)"/>
      <let name="key" value="vv:key(.)"/>
      <let name="bare" value="$name = $key"/>
      <let name="label" value="if ($bare) then '' else replace($name, ' \\[[^\\]]*\\]$', '')"/>
      <let name="value" value="vv:value(.)"/>
${rowAsserts.map(assert).join('\n')}
    </rule>
  </pattern>
</schema>
`;
}
