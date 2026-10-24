<?xml version="1.0" encoding="UTF-8"?>
<!--
  VINvoice rules as ISO Schematron. GENERATED from registry/ by scripts/generate.mjs: do not edit.
  Registry vehicle/1.0-draft (2026-10-24). SPDX-License-Identifier: Apache-2.0

  Works on CII (Factur-X, ZUGFeRD, XRechnung) and UBL (Peppol, XRechnung) invoices. Findings say
  whether a line conforms to VINvoice; they never make an EN 16931 invoice invalid.
  Grammars that XPath regular expressions cannot express are left to the reference checker:
  none.
-->
<schema xmlns="http://purl.oclc.org/dsdl/schematron" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  queryBinding="xslt2">
  <title>VINvoice vehicle/1.0-draft</title>
  <ns prefix="xs" uri="http://www.w3.org/2001/XMLSchema"/>
  <ns prefix="vv" uri="https://vinvoice.org/ns/schematron"/>
  <ns prefix="rsm" uri="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"/>
  <ns prefix="ram" uri="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"/>
  <ns prefix="cac" uri="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"/>
  <ns prefix="cbc" uri="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"/>

  <xsl:function name="vv:trim" as="xs:string">
    <xsl:param name="s"/>
    <xsl:sequence select="replace(string($s), '^\s+|\s+$', '')"/>
  </xsl:function>
  <xsl:function name="vv:name" as="xs:string">
    <xsl:param name="row" as="element()"/>
    <xsl:sequence select="vv:trim(($row/ram:Description, $row/cbc:Name)[1])"/>
  </xsl:function>
  <xsl:function name="vv:key" as="xs:string">
    <xsl:param name="row" as="element()"/>
    <xsl:variable name="n" select="vv:name($row)"/>
    <xsl:sequence select="if (matches($n, '^\S(.*\S)? \[vehicle\.[a-z][A-Za-z0-9]*(\.[a-z][A-Za-z0-9]*)*\]$')) then replace($n, '^.* \[(vehicle\.[a-z][A-Za-z0-9]*(\.[a-z][A-Za-z0-9]*)*)\]$', '$1')
      else if (matches($n, '^vehicle\.[a-z][A-Za-z0-9]*(\.[a-z][A-Za-z0-9]*)*$')) then $n else ''"/>
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
    <xsl:sequence select="if ($key = 'vehicle.profile') then (matches($value, '^vehicle/[1-9][0-9]*[.](0|[1-9][0-9]*)$'))
      else if ($key = 'vehicle.role') then (matches($value, '^(supply|trade-in|service|lease|rental|agency|transport|other)$'))
      else if ($key = 'vehicle.vin') then (matches($value, '^[A-Z0-9]{1,17}$'))
      else if ($key = 'vehicle.make') then (string-length($value) ge 1 and string-length($value) le 60 and not(matches($value, '^[=+@\s-]')) and not(matches($value, '\s$')) and not(matches($value, concat('[\p{Cc}', codepoints-to-string(8206), codepoints-to-string(8207), codepoints-to-string(8234), '-', codepoints-to-string(8238), codepoints-to-string(8294), '-', codepoints-to-string(8297), ']'))))
      else if ($key = 'vehicle.model') then (string-length($value) ge 1 and string-length($value) le 60 and not(matches($value, '^[=+@\s-]')) and not(matches($value, '\s$')) and not(matches($value, concat('[\p{Cc}', codepoints-to-string(8206), codepoints-to-string(8207), codepoints-to-string(8234), '-', codepoints-to-string(8238), codepoints-to-string(8294), '-', codepoints-to-string(8297), ']'))))
      else if ($key = 'vehicle.condition') then (matches($value, '^(new|pre-registered|demonstrator|used)$'))
      else if ($key = 'vehicle.firstRegistration') then (matches($value, '^([0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])|[0-9]{4}-(0[1-9]|1[0-2]))$') and (if (string-length($value) = 7) then concat($value, '-01') castable as xs:date else $value castable as xs:date))
      else if ($key = 'vehicle.odometerKm') then (matches($value, '^(0|[1-9][0-9]{0,6})$'))
      else if ($key = 'vehicle.odometerMi') then (matches($value, '^(0|[1-9][0-9]{0,6})$'))
      else if ($key = 'vehicle.powerKw') then (matches($value, '^(0|[1-9][0-9]{0,3})([.][0-9])?$'))
      else if ($key = 'vehicle.newMeansOfTransport') then (matches($value, '^(true|false)$'))
      else if ($key = 'vehicle.firstUse') then (matches($value, '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$') and (if (string-length($value) = 7) then concat($value, '-01') castable as xs:date else $value castable as xs:date))
      else if ($key = 'vehicle.marginScheme') then (matches($value, '^(true)$'))
      else if ($key = 'vehicle.plate') then (matches($value, '^[A-ZÄÖÜ0-9][A-ZÄÖÜ0-9 -]{0,14}$'))
      else if ($key = 'vehicle.registrationCountry') then (matches($value, '^[A-Z]{2}$'))
      else if ($key = 'vehicle.odometerStatus') then (matches($value, '^(displayed|replaced|rolled-over|defective|unknown)$'))
      else if ($key = 'vehicle.odometerDate') then (matches($value, '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$') and (if (string-length($value) = 7) then concat($value, '-01') castable as xs:date else $value castable as xs:date))
      else if ($key = 'vehicle.variant') then (string-length($value) ge 1 and string-length($value) le 100 and not(matches($value, '^[=+@\s-]')) and not(matches($value, '\s$')) and not(matches($value, concat('[\p{Cc}', codepoints-to-string(8206), codepoints-to-string(8207), codepoints-to-string(8234), '-', codepoints-to-string(8238), codepoints-to-string(8294), '-', codepoints-to-string(8297), ']'))))
      else if ($key = 'vehicle.displacementCm3') then (matches($value, '^[1-9][0-9]{0,5}$'))
      else if ($key = 'vehicle.fuel') then (matches($value, '^(petrol|diesel|electric|lpg|cng|lng|hydrogen|ethanol|biodiesel|biomethane|other)(,(petrol|diesel|electric|lpg|cng|lng|hydrogen|ethanol|biodiesel|biomethane|other))*$'))
      else if ($key = 'vehicle.powertrain') then (matches($value, '^(combustion|hybrid|plug-in-hybrid|battery-electric|fuel-cell|other)$'))
      else if ($key = 'vehicle.category') then (matches($value, '^((M[1-3]|N[1-3]|O[1-4])G?|L[1-7]e(-[A-Z][0-9]?)?)$'))
      else if ($key = 'vehicle.colour') then (matches($value, '^(white|yellow|orange|red|violet|blue|green|grey|brown|black|beige|gold|silver|other)$'))
      else if ($key = 'vehicle.hsn') then (matches($value, '^[0-9A-Z]{4}$'))
      else if ($key = 'vehicle.tsn') then (matches($value, '^[0-9A-Z]{3}$'))
      else if ($key = 'vehicle.inspectionDue') then (matches($value, '^[0-9]{4}-(0[1-9]|1[0-2])$') and (if (string-length($value) = 7) then concat($value, '-01') castable as xs:date else $value castable as xs:date))
      else if ($key = 'vehicle.batteryCapacityKwh') then (matches($value, '^[0-9]{1,3}([.][0-9]{1,2})?$'))
      else if ($key = 'vehicle.typeApprovalNumber') then (string-length($value) ge 1 and string-length($value) le 60 and not(matches($value, '^[=+@\s-]')) and not(matches($value, '\s$')) and not(matches($value, concat('[\p{Cc}', codepoints-to-string(8206), codepoints-to-string(8207), codepoints-to-string(8234), '-', codepoints-to-string(8238), codepoints-to-string(8294), '-', codepoints-to-string(8297), ']'))))
      else if ($key = 'vehicle.emissionClass') then (matches($value, '^(euro-1|euro-2|euro-3|euro-4|euro-5|euro-6|euro-6b|euro-6c|euro-6d-temp|euro-6d|euro-6e|euro-7|euro-iv|euro-v|euro-vi|other)$'))
      else if ($key = 'vehicle.co2GPerKm') then (matches($value, '^(0|[1-9][0-9]{0,3})$'))
      else if ($key = 'vehicle.bodyType') then (matches($value, '^[A-Z]{2}$'))
      else if ($key = 'vehicle.seats') then (matches($value, '^[1-9][0-9]?$'))
      else if ($key = 'vehicle.modelYear') then (matches($value, '^(19|20)[0-9]{2}$'))
      else if ($key = 'vehicle.productionDate') then (matches($value, '^([0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])|[0-9]{4}-(0[1-9]|1[0-2]))$') and (if (string-length($value) = 7) then concat($value, '-01') castable as xs:date else $value castable as xs:date))
      else if ($key = 'vehicle.electricRangeKm') then (matches($value, '^[1-9][0-9]{0,3}$'))
      else if ($key = 'vehicle.batterySohPct') then (matches($value, '^(100([.]0)?|[1-9]?[0-9]([.][0-9])?)$'))
      else if ($key = 'vehicle.batterySohDate') then (matches($value, '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$') and (if (string-length($value) = 7) then concat($value, '-01') castable as xs:date else $value castable as xs:date))
      else if ($key = 'vehicle.batteryPassport') then (matches($value, '^https://[^\s]{1,240}$'))
      else if ($key = 'vehicle.maxMassKg') then (matches($value, '^[1-9][0-9]{0,5}$'))
      else if ($key = 'vehicle.catalogId') then (matches($value, '^[a-z][a-z0-9-]{1,19}:[A-Za-z0-9._][A-Za-z0-9._-]{0,39}$'))
      else if ($key = 'vehicle.registeredKeepers') then (matches($value, '^(0|[1-9][0-9]?)$'))
      else if ($key = 'vehicle.accidentDamaged') then (matches($value, '^(true|false)$'))
      else if ($key = 'vehicle.damageUnrepaired') then (matches($value, '^(true|false)$'))
      else true()"/>
  </xsl:function>
  <xsl:function name="vv:fact" as="xs:string">
    <xsl:param name="line" as="element()"/>
    <xsl:param name="key" as="xs:string"/>
    <xsl:variable name="v" select="vv:first($line, $key)"/>
    <xsl:sequence select="if ($v != '' and vv:valid($key, $v)) then $v else ''"/>
  </xsl:function>
  <xsl:function name="vv:current" as="xs:boolean">
    <xsl:param name="line" as="element()"/>
    <xsl:variable name="m" select="vv:first($line, 'vehicle.profile')"/>
    <xsl:sequence select="matches($m, '^vehicle/[1-9][0-9]*[.](0|[1-9][0-9]*)$') and starts-with($m, 'vehicle/1.')"/>
  </xsl:function>

  <pattern id="vehicle-lines">
    <rule context="ram:IncludedSupplyChainTradeLineItem | cac:InvoiceLine | cac:CreditNoteLine">
      <let name="keys" value="for $r in vv:rows(.) return vv:key($r)"/>
      <let name="marked" value="$keys = 'vehicle.profile'"/>
      <let name="markerValue" value="vv:first(., 'vehicle.profile')"/>
      <let name="valid" value="$marked and matches($markerValue, '^vehicle/[1-9][0-9]*[.](0|[1-9][0-9]*)$')"/>
      <let name="current" value="vv:current(.)"/>
      <let name="single" value="$keys[. != '' and not(. = ('vehicle.catalogId'))]"/>
      <let name="bt128" value="ram:SpecifiedLineTradeSettlement/ram:AdditionalReferencedDocument[ram:TypeCode = '130'] | cac:DocumentReference[cbc:DocumentTypeCode = '130']"/>
      <let name="vin128" value="string((ram:SpecifiedLineTradeSettlement/ram:AdditionalReferencedDocument[ram:ReferenceTypeCode = ('AKG', 'VT')]/ram:IssuerAssignedID, cac:DocumentReference/cbc:ID[@schemeID = ('AKG', 'VT')])[1])"/>
      <let name="abz" value="exists(ram:SpecifiedLineTradeSettlement/ram:AdditionalReferencedDocument[ram:ReferenceTypeCode = 'ABZ'] | cac:DocumentReference/cbc:ID[@schemeID = 'ABZ'])"/>
      <let name="vin18" value="exists(/rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeAgreement/ram:AdditionalReferencedDocument[ram:TypeCode = '130'][ram:ReferenceTypeCode = ('AKG', 'VT')] | /*/cac:AdditionalDocumentReference[cbc:DocumentTypeCode = '130']/cbc:ID[@schemeID = ('AKG', 'VT')])"/>
      <let name="role" value="vv:fact(., 'vehicle.role')"/>
      <let name="odometer" value="vv:fact(., 'vehicle.odometerKm') != '' or vv:fact(., 'vehicle.odometerMi') != ''"/>
      <let name="noReading" value="vv:fact(., 'vehicle.odometerStatus') = ('defective', 'unknown')"/>
      <let name="margin" value="vv:fact(., 'vehicle.marginScheme') = 'true'"/>
      <let name="newMeans" value="vv:fact(., 'vehicle.newMeansOfTransport') = 'true'"/>
      <let name="qty" value="string((ram:SpecifiedLineTradeDelivery/ram:BilledQuantity, cbc:InvoicedQuantity, cbc:CreditedQuantity)[1])"/>
      <let name="category" value="string((ram:SpecifiedLineTradeSettlement/ram:ApplicableTradeTax/ram:CategoryCode, cac:Item/cac:ClassifiedTaxCategory/cbc:ID)[1])"/>
      <let name="marginNote" value="some $n in (/rsm:CrossIndustryInvoice/rsm:ExchangedDocument/ram:IncludedNote/ram:Content, /*/cbc:Note) satisfies matches($n, 'Gebrauchtgegenst(ä|ae)nde\s*/\s*Sonderregelung|Margin scheme', 'i')"/>
      <assert id="V-02-marker" role="error" test="not($marked) or $valid">The marker vehicle.profile has the malformed value '<value-of select="$markerValue"/>'; the line is treated as unmarked.</assert>
      <assert id="V-21" role="warning" test="not($valid) or $current">Unknown major version '<value-of select="$markerValue"/>'; the rows of this line are skipped.</assert>
      <assert id="V-15" role="information" test="$marked or not($keys != '')">Rows with VINvoice keys on a line without the marker vehicle.profile are ignored.</assert>
      <assert id="V-01" role="error" test="not($current) or $keys = 'vehicle.role'">A vehicle line needs the role row vehicle.role.</assert>
      <assert id="V-03" role="warning" test="not($current) or count($single) = count(distinct-values($single))">A key that is not repeatable appears more than once; readers keep the first value.</assert>
      <assert id="V-12" role="error" test="not($current) or count($bt128) le 1">More than one line object identifier (BT-128) on a vehicle line.</assert>
      <assert id="V-04" role="warning" test="not($current and $vin128 != '' and vv:fact(., 'vehicle.vin') != '') or $vin128 = vv:fact(., 'vehicle.vin')">BT-128 (<value-of select="$vin128"/>) differs from vehicle.vin; BT-128 wins.</assert>
      <assert id="V-13" role="error" test="not($current and vv:fact(., 'vehicle.odometerKm') != '' and vv:fact(., 'vehicle.odometerMi') != '')">vehicle.odometerKm and vehicle.odometerMi on the same line.</assert>
      <assert id="V-17" role="error" test="not($current and $odometer and $noReading)">An odometer reading is given although vehicle.odometerStatus says no reading is available.</assert>
      <assert id="V-06" role="error" test="not($current and $role = ('supply', 'trade-in') and $qty != '') or number($qty) = 1">A line with role '<value-of select="$role"/>' has quantity <value-of select="$qty"/>; one vehicle per line.</assert>
      <assert id="V-07-K" role="error" test="not($current and $margin) or $category != 'K'">vehicle.marginScheme on a line with VAT category K: the margin scheme excludes the intra-community exemption.</assert>
      <assert id="V-07-category" role="warning" test="not($current and $margin) or $category = ('E', 'F', 'G', 'K')">vehicle.marginScheme with VAT category '<value-of select="$category"/>'; expected E (2017 model), F (2026 model) or G (export).</assert>
      <assert id="V-07-note" role="warning" test="not($current and $margin) or $marginNote">Margin-scheme line, but no invoice note (BG-1) with 'Gebrauchtgegenstände/Sonderregelung' or the Art. 226(14) wording.</assert>
      <assert id="V-07-new" role="warning" test="not($current and $margin) or vv:fact(., 'vehicle.condition') != 'new'">vehicle.marginScheme together with vehicle.condition = new is unusual.</assert>
      <assert id="V-08-power" role="error" test="not($current and $newMeans) or vv:fact(., 'vehicle.powerKw') != '' or vv:fact(., 'vehicle.displacementCm3') != ''">A new means of transport needs vehicle.powerKw or vehicle.displacementCm3.</assert>
      <assert id="V-08-newness" role="error" test="not($current and $newMeans) or $odometer or vv:fact(., 'vehicle.firstUse') != ''">A new means of transport needs an odometer reading or vehicle.firstUse.</assert>
      <assert id="V-08-odometer" role="warning" test="not($current and $newMeans and vv:fact(., 'vehicle.firstUse') != '') or $odometer">A new means of transport without an odometer reading.</assert>
      <assert id="V-08-first-use" role="warning" test="not($current and $newMeans and ($odometer or vv:fact(., 'vehicle.firstUse') != '') and vv:fact(., 'vehicle.firstRegistration') != '') or vv:fact(., 'vehicle.firstUse') != ''">A registered new means of transport without vehicle.firstUse.</assert>
      <assert id="V-09" role="warning" test="not($current and $role = ('supply', 'trade-in') and vv:fact(., 'vehicle.condition') = ('used', 'demonstrator', 'pre-registered')) or (($odometer or $noReading) and vv:fact(., 'vehicle.firstRegistration') != '')">A used, demonstrator or pre-registered vehicle without an odometer reading (or status) or without vehicle.firstRegistration.</assert>
      <assert id="V-10-id" role="warning" test="not($current and $role = 'service') or $vin128 != '' or vv:fact(., 'vehicle.vin') != '' or vv:fact(., 'vehicle.plate') != '' or $abz or $vin18">A service line without VIN or plate.</assert>
      <assert id="V-10-odometer" role="warning" test="not($current and $role = 'service') or $odometer or $noReading">A service line without an odometer reading or status.</assert>
      <assert id="V-16" role="warning" test="not($current and vv:fact(., 'vehicle.batterySohPct') != '') or vv:fact(., 'vehicle.batterySohDate') != ''">vehicle.batterySohPct without vehicle.batterySohDate.</assert>
    </rule>
  </pattern>

  <pattern id="rows">
    <rule context="ram:ApplicableProductCharacteristic | cac:AdditionalItemProperty">
      <let name="line" value="(ancestor::ram:IncludedSupplyChainTradeLineItem | ancestor::cac:InvoiceLine | ancestor::cac:CreditNoteLine)[1]"/>
      <let name="current" value="exists($line) and vv:current($line)"/>
      <let name="name" value="vv:name(.)"/>
      <let name="key" value="vv:key(.)"/>
      <let name="bare" value="$name = $key"/>
      <let name="label" value="if ($bare) then '' else replace($name, ' \[[^\]]*\]$', '')"/>
      <let name="value" value="vv:value(.)"/>
      <assert id="V-02" role="error" test="not($current) or $key = '' or vv:valid($key, $value)"><value-of select="$key"/> = '<value-of select="$value"/>' does not match its grammar; readers drop the value.</assert>
      <assert id="V-14" role="error" test="$key = '' or not(ram:ValueMeasure or cbc:ValueQuantity)">Row '<value-of select="$name"/>' uses a measure or quantity element; BT-161 stays in the text value.</assert>
      <assert id="V-11-statutory" role="error" test="not($current and $bare and $key = ('vehicle.odometerKm', 'vehicle.odometerMi', 'vehicle.powerKw', 'vehicle.newMeansOfTransport', 'vehicle.firstUse', 'vehicle.marginScheme', 'vehicle.displacementCm3'))">The statutory key <value-of select="$key"/> must be written with its label.</assert>
      <assert id="V-11-length" role="information" test="not($current) or $key = '' or string-length($name) le 64">Row name '<value-of select="$name"/>' is longer than 64 characters.</assert>
      <assert id="V-11-label" role="information" test="not($current) or $bare or $key = '' or not($key = ('vehicle.profile', 'vehicle.role', 'vehicle.vin', 'vehicle.make', 'vehicle.model', 'vehicle.condition', 'vehicle.firstRegistration', 'vehicle.odometerKm', 'vehicle.odometerMi', 'vehicle.powerKw', 'vehicle.newMeansOfTransport', 'vehicle.firstUse', 'vehicle.marginScheme', 'vehicle.plate', 'vehicle.registrationCountry', 'vehicle.odometerStatus', 'vehicle.odometerDate', 'vehicle.variant', 'vehicle.displacementCm3', 'vehicle.fuel', 'vehicle.powertrain', 'vehicle.category', 'vehicle.colour', 'vehicle.hsn', 'vehicle.tsn', 'vehicle.inspectionDue', 'vehicle.batteryCapacityKwh', 'vehicle.typeApprovalNumber', 'vehicle.emissionClass', 'vehicle.co2GPerKm', 'vehicle.bodyType', 'vehicle.seats', 'vehicle.modelYear', 'vehicle.productionDate', 'vehicle.electricRangeKm', 'vehicle.batterySohPct', 'vehicle.batterySohDate', 'vehicle.batteryPassport', 'vehicle.maxMassKg', 'vehicle.catalogId', 'vehicle.registeredKeepers', 'vehicle.accidentDamaged', 'vehicle.damageUnrepaired')) or concat($key, '|', $label) = ('vehicle.profile|Fahrzeugdaten-Standard', 'vehicle.profile|Vehicle data standard', 'vehicle.role|Fahrzeugbezug', 'vehicle.role|Vehicle role', 'vehicle.vin|FIN', 'vehicle.vin|VIN', 'vehicle.make|Marke', 'vehicle.make|Make', 'vehicle.model|Modell', 'vehicle.model|Model', 'vehicle.condition|Zustand', 'vehicle.condition|Condition', 'vehicle.firstRegistration|Erstzulassung', 'vehicle.firstRegistration|First registration', 'vehicle.odometerKm|Kilometerstand (km)', 'vehicle.odometerKm|Odometer (km)', 'vehicle.odometerMi|Kilometerstand (Meilen)', 'vehicle.odometerMi|Odometer (miles)', 'vehicle.powerKw|Leistung (kW)', 'vehicle.powerKw|Power (kW)', 'vehicle.newMeansOfTransport|Neues Fahrzeug (§ 1b UStG)', 'vehicle.newMeansOfTransport|New means of transport (VAT)', 'vehicle.firstUse|Erste Inbetriebnahme', 'vehicle.firstUse|First entry into service', 'vehicle.marginScheme|Differenzbesteuerung', 'vehicle.marginScheme|Margin scheme (second-hand goods)', 'vehicle.plate|Kennzeichen', 'vehicle.plate|Registration plate', 'vehicle.registrationCountry|Zulassungsland', 'vehicle.registrationCountry|Country of registration', 'vehicle.odometerStatus|Kilometerstand-Status', 'vehicle.odometerStatus|Odometer status', 'vehicle.odometerDate|Kilometerstand am', 'vehicle.odometerDate|Odometer reading date', 'vehicle.variant|Ausführung', 'vehicle.variant|Variant / trim', 'vehicle.displacementCm3|Hubraum (cm³)', 'vehicle.displacementCm3|Displacement (cm³)', 'vehicle.fuel|Kraftstoff', 'vehicle.fuel|Fuel / energy source', 'vehicle.powertrain|Antriebsart', 'vehicle.powertrain|Powertrain', 'vehicle.category|EU-Fahrzeugklasse', 'vehicle.category|EU vehicle category', 'vehicle.colour|Farbe', 'vehicle.colour|Basic colour', 'vehicle.hsn|HSN', 'vehicle.hsn|Manufacturer key (HSN)', 'vehicle.tsn|TSN', 'vehicle.tsn|Type key (TSN)', 'vehicle.inspectionDue|Nächste HU', 'vehicle.inspectionDue|Next roadworthiness test', 'vehicle.batteryCapacityKwh|Batteriekapazität (kWh)', 'vehicle.batteryCapacityKwh|Battery capacity (kWh)', 'vehicle.typeApprovalNumber|Typgenehmigungsnummer', 'vehicle.typeApprovalNumber|Type-approval number', 'vehicle.emissionClass|Schadstoffklasse', 'vehicle.emissionClass|Emission class', 'vehicle.co2GPerKm|CO2-Emissionen (g/km)', 'vehicle.co2GPerKm|CO2 emissions (g/km)', 'vehicle.bodyType|Aufbau', 'vehicle.bodyType|Bodywork code', 'vehicle.seats|Sitzplätze', 'vehicle.seats|Seats', 'vehicle.modelYear|Modelljahr', 'vehicle.modelYear|Model year', 'vehicle.productionDate|Herstellungsdatum', 'vehicle.productionDate|Date of manufacture', 'vehicle.electricRangeKm|Elektrische Reichweite (km)', 'vehicle.electricRangeKm|Electric range (km)', 'vehicle.batterySohPct|Batteriezustand SoH (%)', 'vehicle.batterySohPct|Battery state of health (%)', 'vehicle.batterySohDate|Batteriezustand ermittelt am', 'vehicle.batterySohDate|Battery SoH date', 'vehicle.batteryPassport|Batteriepass', 'vehicle.batteryPassport|Battery passport link', 'vehicle.maxMassKg|Techn. zul. Gesamtmasse (kg)', 'vehicle.maxMassKg|Maximum laden mass (kg)', 'vehicle.catalogId|Katalog-ID', 'vehicle.catalogId|Catalogue reference', 'vehicle.registeredKeepers|Anzahl Halter', 'vehicle.registeredKeepers|Registered keepers', 'vehicle.accidentDamaged|Unfallschaden (Angabe Verkäufer)', 'vehicle.accidentDamaged|Accident damage declared', 'vehicle.damageUnrepaired|Unreparierter Schaden (Angabe Verkäufer)', 'vehicle.damageUnrepaired|Unrepaired damage declared')">Label '<value-of select="$label"/>' is not a registry label of <value-of select="$key"/>.</assert>
      <assert id="V-22" role="information" test="not($current) or $key = '' or $key = ('vehicle.profile', 'vehicle.role', 'vehicle.vin', 'vehicle.make', 'vehicle.model', 'vehicle.condition', 'vehicle.firstRegistration', 'vehicle.odometerKm', 'vehicle.odometerMi', 'vehicle.powerKw', 'vehicle.newMeansOfTransport', 'vehicle.firstUse', 'vehicle.marginScheme', 'vehicle.plate', 'vehicle.registrationCountry', 'vehicle.odometerStatus', 'vehicle.odometerDate', 'vehicle.variant', 'vehicle.displacementCm3', 'vehicle.fuel', 'vehicle.powertrain', 'vehicle.category', 'vehicle.colour', 'vehicle.hsn', 'vehicle.tsn', 'vehicle.inspectionDue', 'vehicle.batteryCapacityKwh', 'vehicle.typeApprovalNumber', 'vehicle.emissionClass', 'vehicle.co2GPerKm', 'vehicle.bodyType', 'vehicle.seats', 'vehicle.modelYear', 'vehicle.productionDate', 'vehicle.electricRangeKm', 'vehicle.batterySohPct', 'vehicle.batterySohDate', 'vehicle.batteryPassport', 'vehicle.maxMassKg', 'vehicle.catalogId', 'vehicle.registeredKeepers', 'vehicle.accidentDamaged', 'vehicle.damageUnrepaired') or starts-with($key, 'vehicle.x.')">Unknown key <value-of select="$key"/>, ignored.</assert>
    </rule>
  </pattern>
</schema>
