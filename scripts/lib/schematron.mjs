// Generates generated/vinvoice.sch, an ISO Schematron (queryBinding xslt2) version of the reference
// checker's rules, so that VINvoice checks can run in the same validators as EN 16931, XRechnung and
// Peppol. Rule ids follow the reference checker (V-01 ... V-22). Checker only: V-05 (VIN check
// digit), the 6,000 km / six months test of V-08, V-18 (plate comparison), V-19 and V-20.
//
// Like the reference reader, the rules first drop values that fail their grammar and then judge the
// remaining facts: vv:fact() returns a key's first value only if it is valid.

const xml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
const str = (s) => `'${String(s).replace(/'/g, "''")}'`; // XPath string literal
const seq = (items) => `(${items.map(str).join(', ')})`;
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
  if (test && /^\^\(?\[0-9\]\{4\}-/.test(g)) {
    test += ` and (if (string-length($value) = 7) then concat($value, '-01') castable as xs:date else $value castable as xs:date)`;
  }
  return test;
}

export function schematron({ meta, keys, refs }) {
  const p = meta.prefix;
  const K = refs; // role -> full key
  const keyRe = `${reEscape(p)}[a-z][A-Za-z0-9]*(\\.[a-z][A-Za-z0-9]*)*`;
  const statutory = keys.filter((k) => k.statutory).map((k) => k.key);
  const repeatable = keys.filter((k) => k.repeatable).map((k) => k.key);
  const known = keys.map((k) => k.key);
  const labels = keys.flatMap((k) => [`${k.key}|${k.labelDe}`, `${k.key}|${k.labelEn}`]);
  const marker = keys.find((k) => k.key === K.marker);
  const markerRe = grammarTest(marker).match(/^matches\(\$value, ('.*')\)$/)[1];
  const markerMajor = `${marker.grammar.match(/^\^([a-z]+\/)/)[1]}${meta.version.match(/\/([0-9]+)\./)[1]}.`;

  const tests = keys.map((k) => [k, grammarTest(k)]);
  const skipped = tests.filter(([, t]) => !t).map(([k]) => k.key);
  const validChain =
    tests
      .filter(([, t]) => t)
      .map(([k, t]) => `if ($key = ${str(k.key)}) then (${t})`)
      .join('\n      else ') + '\n      else true()';

  const has = (role) => `vv:fact(., ${str(K[role])}) != ''`;
  const val = (role) => `vv:fact(., ${str(K[role])})`;

  const lineAsserts = [
    [
      'V-02-marker',
      'error',
      `not($marked) or $valid`,
      `The marker ${K.marker} has the malformed value '<value-of select="$markerValue"/>'; the line is treated as unmarked.`,
    ],
    [
      'V-21',
      'warning',
      `not($valid) or $current`,
      `Unknown major version '<value-of select="$markerValue"/>'; the rows of this line are skipped.`,
    ],
    [
      'V-15',
      'information',
      `$marked or not($keys != '')`,
      `Rows with VINvoice keys on a line without the marker ${K.marker} are ignored.`,
    ],
    [
      'V-01',
      'error',
      `not($current) or $keys = ${str(K.role)}`,
      `A vehicle line needs the role row ${K.role}.`,
    ],
    [
      'V-03',
      'warning',
      `not($current) or count($single) = count(distinct-values($single))`,
      `A key that is not repeatable appears more than once; readers keep the first value.`,
    ],
    [
      'V-12',
      'error',
      `not($current) or count($bt128) le 1`,
      `More than one line object identifier (BT-128) on a vehicle line.`,
    ],
    [
      'V-04',
      'warning',
      `not($current and $vin128 != '' and ${has('vin')}) or $vin128 = ${val('vin')}`,
      `BT-128 (<value-of select="$vin128"/>) differs from ${K.vin}; BT-128 wins.`,
    ],
    [
      'V-13',
      'error',
      `not($current and ${has('odometerKm')} and ${has('odometerMi')})`,
      `${K.odometerKm} and ${K.odometerMi} on the same line.`,
    ],
    [
      'V-17',
      'error',
      `not($current and $odometer and $noReading)`,
      `An odometer reading is given although ${K.odometerStatus} says no reading is available.`,
    ],
    [
      'V-06',
      'error',
      `not($current and $role = ('supply', 'trade-in') and $qty != '') or number($qty) = 1`,
      `A line with role '<value-of select="$role"/>' has quantity <value-of select="$qty"/>; one vehicle per line.`,
    ],
    [
      'V-07-K',
      'error',
      `not($current and $margin) or $category != 'K'`,
      `${K.marginScheme} on a line with VAT category K: the margin scheme excludes the intra-community exemption.`,
    ],
    [
      'V-07-category',
      'warning',
      `not($current and $margin) or $category = ('E', 'F', 'G', 'K')`,
      `${K.marginScheme} with VAT category '<value-of select="$category"/>'; expected E (2017 model), F (2026 model) or G (export).`,
    ],
    [
      'V-07-note',
      'warning',
      `not($current and $margin) or $marginNote`,
      `Margin-scheme line, but no invoice note (BG-1) with 'Gebrauchtgegenstände/Sonderregelung' or the Art. 226(14) wording.`,
    ],
    [
      'V-07-new',
      'warning',
      `not($current and $margin) or ${val('condition')} != 'new'`,
      `${K.marginScheme} together with ${K.condition} = new is unusual.`,
    ],
    [
      'V-08-power',
      'error',
      `not($current and $newMeans) or ${has('power')} or ${has('displacement')}`,
      `A new means of transport needs ${K.power} or ${K.displacement}.`,
    ],
    [
      'V-08-newness',
      'error',
      `not($current and $newMeans) or $odometer or ${has('firstUse')}`,
      `A new means of transport needs an odometer reading or ${K.firstUse}.`,
    ],
    [
      'V-08-odometer',
      'warning',
      `not($current and $newMeans and ${has('firstUse')}) or $odometer`,
      `A new means of transport without an odometer reading.`,
    ],
    [
      'V-08-first-use',
      'warning',
      `not($current and $newMeans and ($odometer or ${has('firstUse')}) and ${has('firstRegistration')}) or ${has('firstUse')}`,
      `A registered new means of transport without ${K.firstUse}.`,
    ],
    [
      'V-09',
      'warning',
      `not($current and $role = ('supply', 'trade-in') and ${val('condition')} = ('used', 'demonstrator', 'pre-registered')) or (($odometer or $noReading) and ${has('firstRegistration')})`,
      `A used, demonstrator or pre-registered vehicle without an odometer reading (or status) or without ${K.firstRegistration}.`,
    ],
    [
      'V-10-id',
      'warning',
      `not($current and $role = 'service') or $vin128 != '' or ${has('vin')} or ${has('plate')} or $abz or $vin18`,
      `A service line without VIN or plate.`,
    ],
    [
      'V-10-odometer',
      'warning',
      `not($current and $role = 'service') or $odometer or $noReading`,
      `A service line without an odometer reading or status.`,
    ],
    [
      'V-16',
      'warning',
      `not($current and ${has('batterySoh')}) or ${has('batterySohDate')}`,
      `${K.batterySoh} without ${K.batterySohDate}.`,
    ],
  ];

  const rowAsserts = [
    [
      'V-02',
      'error',
      `not($current) or $key = '' or vv:valid($key, $value)`,
      `<value-of select="$key"/> = '<value-of select="$value"/>' does not match its grammar; readers drop the value.`,
    ],
    [
      'V-14',
      'error',
      `$key = '' or not(ram:ValueMeasure or cbc:ValueQuantity)`,
      `Row '<value-of select="$name"/>' uses a measure or quantity element; BT-161 stays in the text value.`,
    ],
    [
      'V-11-statutory',
      'error',
      `not($current and $bare and $key = ${seq(statutory)})`,
      `The statutory key <value-of select="$key"/> must be written with its label.`,
    ],
    [
      'V-11-length',
      'information',
      `not($current) or $key = '' or string-length($name) le 64`,
      `Row name '<value-of select="$name"/>' is longer than 64 characters.`,
    ],
    [
      'V-11-label',
      'information',
      `not($current) or $bare or $key = '' or not($key = ${seq(known)}) or concat($key, '|', $label) = ${seq(labels)}`,
      `Label '<value-of select="$label"/>' is not a registry label of <value-of select="$key"/>.`,
    ],
    [
      'V-22',
      'information',
      `not($current) or $key = '' or $key = ${seq(known)} or starts-with($key, ${str(p + 'x.')})`,
      `Unknown key <value-of select="$key"/>, ignored.`,
    ],
  ];

  const assert = ([id, role, test, msg]) =>
    `      <assert id="${id}" role="${role}" test="${xml(test)}">${msg.replace(/&/g, '&amp;')}</assert>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<!--
  VINvoice rules as ISO Schematron. GENERATED from registry/ by scripts/generate.mjs: do not edit.
  Registry ${meta.version} (${meta.date}). SPDX-License-Identifier: Apache-2.0

  Works on CII (Factur-X, ZUGFeRD, XRechnung) and UBL (Peppol, XRechnung) invoices. Findings say
  whether a line conforms to VINvoice; they never make an EN 16931 invoice invalid.
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
    <xsl:sequence select="matches($m, ${xml(markerRe)}) and starts-with($m, ${str(markerMajor)})"/>
  </xsl:function>

  <pattern id="vehicle-lines">
    <rule context="ram:IncludedSupplyChainTradeLineItem | cac:InvoiceLine | cac:CreditNoteLine">
      <let name="keys" value="for $r in vv:rows(.) return vv:key($r)"/>
      <let name="marked" value="$keys = ${str(K.marker)}"/>
      <let name="markerValue" value="vv:first(., ${str(K.marker)})"/>
      <let name="valid" value="$marked and matches($markerValue, ${xml(markerRe)})"/>
      <let name="current" value="vv:current(.)"/>
      <let name="single" value="$keys[. != '' and not(. = ${seq(repeatable.length ? repeatable : [''])})]"/>
      <let name="bt128" value="ram:SpecifiedLineTradeSettlement/ram:AdditionalReferencedDocument[ram:TypeCode = '130'] | cac:DocumentReference[cbc:DocumentTypeCode = '130']"/>
      <let name="vin128" value="string((ram:SpecifiedLineTradeSettlement/ram:AdditionalReferencedDocument[ram:ReferenceTypeCode = ('AKG', 'VT')]/ram:IssuerAssignedID, cac:DocumentReference/cbc:ID[@schemeID = ('AKG', 'VT')])[1])"/>
      <let name="abz" value="exists(ram:SpecifiedLineTradeSettlement/ram:AdditionalReferencedDocument[ram:ReferenceTypeCode = 'ABZ'] | cac:DocumentReference/cbc:ID[@schemeID = 'ABZ'])"/>
      <let name="vin18" value="exists(/rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeAgreement/ram:AdditionalReferencedDocument[ram:TypeCode = '130'][ram:ReferenceTypeCode = ('AKG', 'VT')] | /*/cac:AdditionalDocumentReference[cbc:DocumentTypeCode = '130']/cbc:ID[@schemeID = ('AKG', 'VT')])"/>
      <let name="role" value="${val('role')}"/>
      <let name="odometer" value="${has('odometerKm')} or ${has('odometerMi')}"/>
      <let name="noReading" value="${val('odometerStatus')} = ('defective', 'unknown')"/>
      <let name="margin" value="${val('marginScheme')} = 'true'"/>
      <let name="newMeans" value="${val('newMeansOfTransport')} = 'true'"/>
      <let name="qty" value="string((ram:SpecifiedLineTradeDelivery/ram:BilledQuantity, cbc:InvoicedQuantity, cbc:CreditedQuantity)[1])"/>
      <let name="category" value="string((ram:SpecifiedLineTradeSettlement/ram:ApplicableTradeTax/ram:CategoryCode, cac:Item/cac:ClassifiedTaxCategory/cbc:ID)[1])"/>
      <let name="marginNote" value="some $n in (/rsm:CrossIndustryInvoice/rsm:ExchangedDocument/ram:IncludedNote/ram:Content, /*/cbc:Note) satisfies matches($n, 'Gebrauchtgegenst(ä|ae)nde\\s*/\\s*Sonderregelung|Margin scheme', 'i')"/>
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
