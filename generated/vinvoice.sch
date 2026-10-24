<?xml version="1.0" encoding="UTF-8"?>
<!--
  VINvoice rules as ISO Schematron. GENERATED from registry/ by scripts/generate.mjs: do not edit.
  Registry vehicle/1.0-draft (2026-10-24). SPDX-License-Identifier: Apache-2.0

  Works on CII (Factur-X, ZUGFeRD, XRechnung) and UBL (Peppol, XRechnung) invoices. Findings say
  whether a line conforms to VINvoice; they never make an EN 16931 invoice invalid. Rows whose key
  is not under 'vehicle.' (vendor rows with reverse-DNS names) are ignored.
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
    <xsl:sequence select="if (matches($n, '^\S(.*\S)? \[vehicle([.][a-z][A-Za-z0-9]*)+\]$')) then replace($n, '^.* \[(vehicle([.][a-z][A-Za-z0-9]*)+)\]$', '$1')
      else if (matches($n, '^vehicle([.][a-z][A-Za-z0-9]*)+$')) then $n else ''"/>
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
    <xsl:sequence select="if ($key = 'vehicle.specificationId') then (matches($value, '^vehicle/[1-9][0-9]*[.](0|[1-9][0-9]*)$'))
      else if ($key = 'vehicle.roleCode') then (matches($value, '^(supply|trade-in|service|rental|lease|agency|transport|other)$'))
      else if ($key = 'vehicle.vin') then (matches($value, '^[A-Z0-9]{1,17}$'))
      else if ($key = 'vehicle.make') then (string-length($value) ge 1 and string-length($value) le 60 and not(matches($value, '^[=+@\s-]')) and not(matches($value, '\s$')) and not(matches($value, concat('[\p{Cc}', codepoints-to-string(8206), codepoints-to-string(8207), codepoints-to-string(8234), '-', codepoints-to-string(8238), codepoints-to-string(8294), '-', codepoints-to-string(8297), ']'))))
      else if ($key = 'vehicle.model') then (string-length($value) ge 1 and string-length($value) le 60 and not(matches($value, '^[=+@\s-]')) and not(matches($value, '\s$')) and not(matches($value, concat('[\p{Cc}', codepoints-to-string(8206), codepoints-to-string(8207), codepoints-to-string(8234), '-', codepoints-to-string(8238), codepoints-to-string(8294), '-', codepoints-to-string(8297), ']'))))
      else if ($key = 'vehicle.conditionCode') then (matches($value, '^(new|used)$'))
      else if ($key = 'vehicle.firstRegistrationDate') then (matches($value, '^([0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])|[0-9]{4}-(0[1-9]|1[0-2]))$') and (if (string-length($value) = 7) then concat($value, '-01') castable as xs:date else $value castable as xs:date))
      else if ($key = 'vehicle.odometerReadingKm') then (matches($value, '^(0|[1-9][0-9]{0,6})$'))
      else if ($key = 'vehicle.odometerReadingMi') then (matches($value, '^(0|[1-9][0-9]{0,6})$'))
      else if ($key = 'vehicle.maximumNetPowerKw') then (matches($value, '^(0|[1-9][0-9]{0,3})([.][0-9])?$'))
      else if ($key = 'vehicle.newMeansOfTransportIndicator') then (matches($value, '^(true|false)$'))
      else if ($key = 'vehicle.firstEntryIntoServiceDate') then (matches($value, '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$') and (if (string-length($value) = 7) then concat($value, '-01') castable as xs:date else $value castable as xs:date))
      else if ($key = 'vehicle.marginSchemeIndicator') then (matches($value, '^(true|false)$'))
      else if ($key = 'vehicle.registrationNumber') then (matches($value, '^[\p{Lu}0-9][\p{Lu}0-9 -]{0,14}$'))
      else if ($key = 'vehicle.registrationCountryCode') then (matches($value, '^([A-Z]{2}|1A)$'))
      else if ($key = 'vehicle.odometerReadingStatusCode') then (matches($value, '^(displayed|replaced|rolled-over|inoperative|unknown|other)$'))
      else if ($key = 'vehicle.odometerReadingDate') then (matches($value, '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$') and (if (string-length($value) = 7) then concat($value, '-01') castable as xs:date else $value castable as xs:date))
      else if ($key = 'vehicle.configuration') then (string-length($value) ge 1 and string-length($value) le 100 and not(matches($value, '^[=+@\s-]')) and not(matches($value, '\s$')) and not(matches($value, concat('[\p{Cc}', codepoints-to-string(8206), codepoints-to-string(8207), codepoints-to-string(8234), '-', codepoints-to-string(8238), codepoints-to-string(8294), '-', codepoints-to-string(8297), ']'))))
      else if ($key = 'vehicle.engineCapacityCm3') then (matches($value, '^[1-9][0-9]{0,5}$'))
      else if ($key = 'vehicle.energySourceCode') then (matches($value, '^(petrol|diesel|lpg|cng|lng|ethanol|biodiesel|hydrogen|electricity|other)$'))
      else if ($key = 'vehicle.powertrainTypeCode') then (matches($value, '^(internal-combustion|hybrid-electric|plug-in-hybrid-electric|pure-electric|fuel-cell|other)$'))
      else if ($key = 'vehicle.categoryCode') then (matches($value, '^((M[1-3]|N[1-3])G?S?|O[1-4]S?|L(1e(-[AB])?|2e(-[PU])?|3e(-A[123][ET]?)?|4e|5e(-[AB])?|6e(-A|-B[PU]?)?|7e(-(A[12]?|B[12]?|C[PU]?))?)|[TC]([1-4](\.[1-3])?[ab]?)?|T5|R([1-4][ab]?)?|S([12][ab]?)?)$'))
      else if ($key = 'vehicle.basicColourCode') then (matches($value, '^(white|yellow|orange|red|violet|blue|green|grey|brown|black|other)$'))
      else if ($key = 'vehicle.nextRoadworthinessTestDate') then (matches($value, '^([0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])|[0-9]{4}-(0[1-9]|1[0-2]))$') and (if (string-length($value) = 7) then concat($value, '-01') castable as xs:date else $value castable as xs:date))
      else if ($key = 'vehicle.usableBatteryEnergyKwh') then (matches($value, '^[0-9]{1,3}([.][0-9]{1,2})?$'))
      else if ($key = 'vehicle.typeApprovalNumber') then (string-length($value) ge 1 and string-length($value) le 60 and not(matches($value, '^[=+@\s-]')) and not(matches($value, '\s$')) and not(matches($value, concat('[\p{Cc}', codepoints-to-string(8206), codepoints-to-string(8207), codepoints-to-string(8234), '-', codepoints-to-string(8238), codepoints-to-string(8294), '-', codepoints-to-string(8297), ']'))))
      else if ($key = 'vehicle.de.hsn') then (matches($value, '^[0-9A-Z]{4}$'))
      else if ($key = 'vehicle.de.tsn') then (matches($value, '^[0-9A-Z]{3}$'))
      else if ($key = 'vehicle.exhaustEmissionLevelCode') then (matches($value, '^(euro-([1-7][a-z0-9]*(-[a-z0-9]+)*|(i|ii|iii|iv|v|vi)(-[a-e])?)|stage-(i|ii|iiia|iiib|iv|v)|other)$'))
      else if ($key = 'vehicle.wltpCo2EmissionsGPerKm') then (matches($value, '^(0|[1-9][0-9]{0,3})$'))
      else if ($key = 'vehicle.nedcCo2EmissionsGPerKm') then (matches($value, '^(0|[1-9][0-9]{0,3})$'))
      else if ($key = 'vehicle.bodyworkCode') then (matches($value, '^(A[A-G]|B[A-E]|BX|C[A-J]|CX|D[ABCE]|S[A-HJ])([0-9]{2})?$'))
      else if ($key = 'vehicle.seatingPositionCount') then (matches($value, '^[1-9][0-9]{0,2}$'))
      else if ($key = 'vehicle.modelYear') then (matches($value, '^(19|20)[0-9]{2}$'))
      else if ($key = 'vehicle.manufactureDate') then (matches($value, '^([0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])|[0-9]{4}-(0[1-9]|1[0-2])|[0-9]{4})$') and (if (string-length($value) = 7) then concat($value, '-01') castable as xs:date else $value castable as xs:date))
      else if ($key = 'vehicle.wltpElectricRangeKm') then (matches($value, '^[1-9][0-9]{0,3}$'))
      else if ($key = 'vehicle.batteryStateOfHealthPercent') then (matches($value, '^(100([.]0)?|[1-9]?[0-9]([.][0-9])?)$'))
      else if ($key = 'vehicle.batteryStateOfHealthDate') then (matches($value, '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$') and (if (string-length($value) = 7) then concat($value, '-01') castable as xs:date else $value castable as xs:date))
      else if ($key = 'vehicle.batteryStateOfHealthMethodCode') then (matches($value, '^(on-board|manufacturer-test|independent-test|other)$'))
      else if ($key = 'vehicle.batteryPassportUrl') then (matches($value, '^https://[^\s]{1,240}$'))
      else if ($key = 'vehicle.maximumMassKg') then (matches($value, '^[1-9][0-9]{0,5}$'))
      else if ($key = 'vehicle.registeredMaximumMassKg') then (matches($value, '^[1-9][0-9]{0,5}$'))
      else if ($key = 'vehicle.catalogueId') then (matches($value, '^[a-z][a-z0-9-]{1,19}:[A-Za-z0-9._][A-Za-z0-9._-]{0,39}$'))
      else if ($key = 'vehicle.approvedType') then (string-length($value) ge 1 and string-length($value) le 25 and not(matches($value, '^[=+@\s-]')) and not(matches($value, '\s$')) and not(matches($value, concat('[\p{Cc}', codepoints-to-string(8206), codepoints-to-string(8207), codepoints-to-string(8234), '-', codepoints-to-string(8238), codepoints-to-string(8294), '-', codepoints-to-string(8297), ']'))))
      else if ($key = 'vehicle.approvedVariant') then (string-length($value) ge 1 and string-length($value) le 25 and not(matches($value, '^[=+@\s-]')) and not(matches($value, '\s$')) and not(matches($value, concat('[\p{Cc}', codepoints-to-string(8206), codepoints-to-string(8207), codepoints-to-string(8234), '-', codepoints-to-string(8238), codepoints-to-string(8294), '-', codepoints-to-string(8297), ']'))))
      else if ($key = 'vehicle.approvedVersion') then (string-length($value) ge 1 and string-length($value) le 35 and not(matches($value, '^[=+@\s-]')) and not(matches($value, '\s$')) and not(matches($value, concat('[\p{Cc}', codepoints-to-string(8206), codepoints-to-string(8207), codepoints-to-string(8234), '-', codepoints-to-string(8238), codepoints-to-string(8294), '-', codepoints-to-string(8297), ']'))))
      else if ($key = 'vehicle.axleCount') then (matches($value, '^[1-9]$'))
      else if ($key = 'vehicle.cumulativeOperatingHours') then (matches($value, '^(0|[1-9][0-9]{0,6})$'))
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
    <xsl:variable name="m" select="vv:first($line, 'vehicle.specificationId')"/>
    <xsl:sequence select="matches($m, '^vehicle/[1-9][0-9]*[.](0|[1-9][0-9]*)$') and starts-with($m, 'vehicle/1.')"/>
  </xsl:function>

  <pattern id="vehicle-lines">
    <rule context="ram:IncludedSupplyChainTradeLineItem | cac:InvoiceLine | cac:CreditNoteLine">
      <let name="keys" value="for $r in vv:rows(.) return vv:key($r)"/>
      <let name="marked" value="$keys = 'vehicle.specificationId'"/>
      <let name="markerValue" value="vv:first(., 'vehicle.specificationId')"/>
      <let name="valid" value="$marked and matches($markerValue, '^vehicle/[1-9][0-9]*[.](0|[1-9][0-9]*)$')"/>
      <let name="current" value="vv:current(.)"/>
      <let name="single" value="$keys[. != '' and not(. = ('vehicle.energySourceCode', 'vehicle.basicColourCode', 'vehicle.catalogueId'))]"/>
      <let name="bt128" value="ram:SpecifiedLineTradeSettlement/ram:AdditionalReferencedDocument | ram:AdditionalReferencedDocument | cac:DocumentReference"/>
      <let name="vin128" value="string((ram:SpecifiedLineTradeSettlement/ram:AdditionalReferencedDocument[ram:ReferenceTypeCode = ('AKG', 'VT')]/ram:IssuerAssignedID, cac:DocumentReference/cbc:ID[@schemeID = ('AKG', 'VT')])[1])"/>
      <let name="abz" value="exists(ram:SpecifiedLineTradeSettlement/ram:AdditionalReferencedDocument[ram:ReferenceTypeCode = 'ABZ'] | cac:DocumentReference/cbc:ID[@schemeID = 'ABZ'])"/>
      <let name="vin18" value="exists(/rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeAgreement/ram:AdditionalReferencedDocument[ram:TypeCode = '130'][ram:ReferenceTypeCode = ('AKG', 'VT')] | /*/cac:AdditionalDocumentReference[cbc:DocumentTypeCode = '130']/cbc:ID[@schemeID = ('AKG', 'VT')])"/>
      <let name="role" value="vv:fact(., 'vehicle.roleCode')"/>
      <let name="odometer" value="vv:fact(., 'vehicle.odometerReadingKm') != '' or vv:fact(., 'vehicle.odometerReadingMi') != ''"/>
      <let name="noReading" value="vv:fact(., 'vehicle.odometerReadingStatusCode') = ('inoperative', 'unknown')"/>
      <let name="odometerExpected" value="vv:fact(., 'vehicle.categoryCode') = '' or substring(vv:fact(., 'vehicle.categoryCode'), 1, 1) = ('M', 'N', 'L')"/>
      <let name="margin" value="vv:fact(., 'vehicle.marginSchemeIndicator') = 'true'"/>
      <let name="newMeans" value="vv:fact(., 'vehicle.newMeansOfTransportIndicator') = 'true'"/>
      <let name="qty" value="string((ram:SpecifiedLineTradeDelivery/ram:BilledQuantity, cbc:InvoicedQuantity, cbc:CreditedQuantity)[1])"/>
      <let name="category" value="string((ram:SpecifiedLineTradeSettlement/ram:ApplicableTradeTax/ram:CategoryCode, cac:Item/cac:ClassifiedTaxCategory/cbc:ID)[1])"/>
      <let name="marginNote" value="some $n in (/rsm:CrossIndustryInvoice/rsm:ExchangedDocument/ram:IncludedNote/ram:Content, /*/cbc:Note) satisfies matches($n, 'Gebrauchtgegenst(ä|ae)nde\s*/\s*Sonderregelung|Differenzbesteuerung|Margin scheme|R[ée]gime (particulier|de la marge)|Regime del margine|R[ée]gimen especial|Margeregeling|Procedura mar[żz]y', 'i')"/>
      <assert id="V-02-marker" role="error" test="not($marked) or $valid">The marker vehicle.specificationId has the malformed value '<value-of select="$markerValue"/>'; the line is treated as unmarked.</assert>
      <assert id="V-21" role="warning" test="not($valid) or $current">Unknown major version '<value-of select="$markerValue"/>'; the rows of this line are skipped.</assert>
      <assert id="V-15" role="information" test="$marked or not($keys != '')">Rows with registry keys on a line without the marker vehicle.specificationId are ignored.</assert>
      <assert id="V-01" role="error" test="not($current) or $keys = 'vehicle.roleCode'">A vehicle line needs the role row vehicle.roleCode.</assert>
      <assert id="V-03" role="warning" test="not($current) or count($single) = count(distinct-values($single))">A key that is not repeatable appears more than once; readers keep the first value.</assert>
      <assert id="V-12" role="error" test="not($current) or count($bt128) le 1">More than one line object identifier (BT-128) on a vehicle line.</assert>
      <assert id="V-04" role="warning" test="not($current and $vin128 != '' and vv:fact(., 'vehicle.vin') != '') or $vin128 = vv:fact(., 'vehicle.vin')">BT-128 (<value-of select="$vin128"/>) differs from vehicle.vin; BT-128 wins.</assert>
      <assert id="V-13" role="error" test="not($current and vv:fact(., 'vehicle.odometerReadingKm') != '' and vv:fact(., 'vehicle.odometerReadingMi') != '')">vehicle.odometerReadingKm and vehicle.odometerReadingMi on the same line.</assert>
      <assert id="V-17" role="error" test="not($current and $odometer and $noReading)">An odometer reading is given although vehicle.odometerReadingStatusCode says no reading is available.</assert>
      <assert id="V-06" role="error" test="not($current and $role = ('supply', 'trade-in') and $qty != '') or number($qty) = 1">A line with role '<value-of select="$role"/>' has quantity <value-of select="$qty"/>; one vehicle per line.</assert>
      <assert id="V-07-K" role="error" test="not($current and $margin) or $category != 'K'">vehicle.marginSchemeIndicator on a line with VAT category K: Art. 139(3) and 313(2) of Directive 2006/112/EC exclude the intra-community exemption.</assert>
      <assert id="V-07-category" role="warning" test="not($current and $margin) or $category = ('E', 'F', 'G', 'K')">vehicle.marginSchemeIndicator with VAT category '<value-of select="$category"/>'; expected E (2017 model), F (2026 model) or G (export).</assert>
      <assert id="V-07-note" role="warning" test="not($current and $margin) or $marginNote">Margin-scheme line, but no invoice note (BG-1) with the Art. 226(14) wording.</assert>
      <assert id="V-07-new" role="warning" test="not($current and $margin) or vv:fact(., 'vehicle.conditionCode') != 'new'">vehicle.marginSchemeIndicator together with vehicle.conditionCode = new is unusual.</assert>
      <assert id="V-08-power" role="error" test="not($current and $newMeans) or vv:fact(., 'vehicle.maximumNetPowerKw') != '' or vv:fact(., 'vehicle.engineCapacityCm3') != ''">A new means of transport needs vehicle.maximumNetPowerKw or vehicle.engineCapacityCm3.</assert>
      <assert id="V-08-newness" role="error" test="not($current and $newMeans) or $odometer or vv:fact(., 'vehicle.firstEntryIntoServiceDate') != ''">A new means of transport needs an odometer reading or vehicle.firstEntryIntoServiceDate.</assert>
      <assert id="V-08-odometer" role="warning" test="not($current and $newMeans and vv:fact(., 'vehicle.firstEntryIntoServiceDate') != '') or $odometer">A new means of transport without an odometer reading.</assert>
      <assert id="V-08-first-entry" role="warning" test="not($current and $newMeans and ($odometer or vv:fact(., 'vehicle.firstEntryIntoServiceDate') != '') and vv:fact(., 'vehicle.firstRegistrationDate') != '') or vv:fact(., 'vehicle.firstEntryIntoServiceDate') != ''">A registered new means of transport without vehicle.firstEntryIntoServiceDate.</assert>
      <assert id="V-09-odometer" role="warning" test="not($current and $role = ('supply', 'trade-in') and vv:fact(., 'vehicle.conditionCode') = 'used' and $odometerExpected) or $odometer or $noReading">A used vehicle supplied without an odometer reading (or a status saying none is available).</assert>
      <assert id="V-09-first-registration" role="information" test="not($current and $role = ('supply', 'trade-in') and vv:fact(., 'vehicle.conditionCode') = 'used') or vv:fact(., 'vehicle.firstRegistrationDate') != ''">A used vehicle supplied without vehicle.firstRegistrationDate; correct only if it was never registered.</assert>
      <assert id="V-10-id" role="warning" test="not($current and $role = 'service') or $vin128 != '' or vv:fact(., 'vehicle.vin') != '' or vv:fact(., 'vehicle.registrationNumber') != '' or $abz or $vin18">A service line without VIN or registration number.</assert>
      <assert id="V-10-odometer" role="warning" test="not($current and $role = 'service' and $odometerExpected) or $odometer or $noReading">A service line without an odometer reading or status.</assert>
      <assert id="V-16-date" role="warning" test="not($current and vv:fact(., 'vehicle.batteryStateOfHealthPercent') != '') or vv:fact(., 'vehicle.batteryStateOfHealthDate') != ''">vehicle.batteryStateOfHealthPercent without vehicle.batteryStateOfHealthDate.</assert>
      <assert id="V-16-method" role="warning" test="not($current and vv:fact(., 'vehicle.batteryStateOfHealthPercent') != '') or vv:fact(., 'vehicle.batteryStateOfHealthMethodCode') != ''">vehicle.batteryStateOfHealthPercent without vehicle.batteryStateOfHealthMethodCode.</assert>
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
      <assert id="V-02" role="error" test="not($current) or $key = '' or not($key = ('vehicle.specificationId', 'vehicle.roleCode', 'vehicle.vin', 'vehicle.make', 'vehicle.model', 'vehicle.conditionCode', 'vehicle.firstRegistrationDate', 'vehicle.odometerReadingKm', 'vehicle.odometerReadingMi', 'vehicle.maximumNetPowerKw', 'vehicle.newMeansOfTransportIndicator', 'vehicle.firstEntryIntoServiceDate', 'vehicle.marginSchemeIndicator', 'vehicle.registrationNumber', 'vehicle.registrationCountryCode', 'vehicle.odometerReadingStatusCode', 'vehicle.odometerReadingDate', 'vehicle.configuration', 'vehicle.engineCapacityCm3', 'vehicle.energySourceCode', 'vehicle.powertrainTypeCode', 'vehicle.categoryCode', 'vehicle.basicColourCode', 'vehicle.nextRoadworthinessTestDate', 'vehicle.usableBatteryEnergyKwh', 'vehicle.typeApprovalNumber', 'vehicle.de.hsn', 'vehicle.de.tsn', 'vehicle.exhaustEmissionLevelCode', 'vehicle.wltpCo2EmissionsGPerKm', 'vehicle.nedcCo2EmissionsGPerKm', 'vehicle.bodyworkCode', 'vehicle.seatingPositionCount', 'vehicle.modelYear', 'vehicle.manufactureDate', 'vehicle.wltpElectricRangeKm', 'vehicle.batteryStateOfHealthPercent', 'vehicle.batteryStateOfHealthDate', 'vehicle.batteryStateOfHealthMethodCode', 'vehicle.batteryPassportUrl', 'vehicle.maximumMassKg', 'vehicle.registeredMaximumMassKg', 'vehicle.catalogueId', 'vehicle.approvedType', 'vehicle.approvedVariant', 'vehicle.approvedVersion', 'vehicle.axleCount', 'vehicle.cumulativeOperatingHours')) or vv:valid($key, $value)"><value-of select="$key"/> = '<value-of select="$value"/>' does not match its grammar; readers drop the value.</assert>
      <assert id="V-14" role="error" test="$key = '' or not(ram:ValueMeasure or cbc:ValueQuantity)">Row '<value-of select="$name"/>' uses a measure or quantity element; BT-161 stays in the text value.</assert>
      <assert id="V-11-statutory" role="error" test="not($current and $bare and $key = ('vehicle.odometerReadingKm', 'vehicle.odometerReadingMi', 'vehicle.newMeansOfTransportIndicator', 'vehicle.firstEntryIntoServiceDate', 'vehicle.marginSchemeIndicator'))">The statutory key <value-of select="$key"/> must be written with its label.</assert>
      <assert id="V-11-key-length" role="information" test="not($current) or string-length($key) le 40">Key <value-of select="$key"/> is longer than 40 characters.</assert>
      <assert id="V-11-name-length" role="information" test="not($current) or $key = '' or string-length($name) le 64">Row name '<value-of select="$name"/>' is longer than 64 characters.</assert>
      <assert id="V-11-label" role="information" test="not($current) or $bare or $key = '' or not($key = ('vehicle.specificationId', 'vehicle.roleCode', 'vehicle.vin', 'vehicle.make', 'vehicle.model', 'vehicle.conditionCode', 'vehicle.firstRegistrationDate', 'vehicle.odometerReadingKm', 'vehicle.odometerReadingMi', 'vehicle.maximumNetPowerKw', 'vehicle.newMeansOfTransportIndicator', 'vehicle.firstEntryIntoServiceDate', 'vehicle.marginSchemeIndicator', 'vehicle.registrationNumber', 'vehicle.registrationCountryCode', 'vehicle.odometerReadingStatusCode', 'vehicle.odometerReadingDate', 'vehicle.configuration', 'vehicle.engineCapacityCm3', 'vehicle.energySourceCode', 'vehicle.powertrainTypeCode', 'vehicle.categoryCode', 'vehicle.basicColourCode', 'vehicle.nextRoadworthinessTestDate', 'vehicle.usableBatteryEnergyKwh', 'vehicle.typeApprovalNumber', 'vehicle.de.hsn', 'vehicle.de.tsn', 'vehicle.exhaustEmissionLevelCode', 'vehicle.wltpCo2EmissionsGPerKm', 'vehicle.nedcCo2EmissionsGPerKm', 'vehicle.bodyworkCode', 'vehicle.seatingPositionCount', 'vehicle.modelYear', 'vehicle.manufactureDate', 'vehicle.wltpElectricRangeKm', 'vehicle.batteryStateOfHealthPercent', 'vehicle.batteryStateOfHealthDate', 'vehicle.batteryStateOfHealthMethodCode', 'vehicle.batteryPassportUrl', 'vehicle.maximumMassKg', 'vehicle.registeredMaximumMassKg', 'vehicle.catalogueId', 'vehicle.approvedType', 'vehicle.approvedVariant', 'vehicle.approvedVersion', 'vehicle.axleCount', 'vehicle.cumulativeOperatingHours')) or concat($key, '|', $label) = ('vehicle.specificationId|VINvoice-Spezifikation', 'vehicle.specificationId|VINvoice specification', 'vehicle.roleCode|Fahrzeugrolle', 'vehicle.roleCode|Vehicle role', 'vehicle.vin|Fahrzeug-Identifizierungsnummer (FIN)', 'vehicle.vin|Vehicle identification number (VIN)', 'vehicle.make|Marke', 'vehicle.make|Make', 'vehicle.model|Modell', 'vehicle.model|Model', 'vehicle.conditionCode|Fahrzeugzustand', 'vehicle.conditionCode|Vehicle condition', 'vehicle.firstRegistrationDate|Datum der Erstzulassung', 'vehicle.firstRegistrationDate|Date of first registration', 'vehicle.odometerReadingKm|Kilometerstand (km)', 'vehicle.odometerReadingKm|Odometer reading (km)', 'vehicle.odometerReadingMi|Meilenstand (mi)', 'vehicle.odometerReadingMi|Odometer reading (mi)', 'vehicle.maximumNetPowerKw|Höchste Nutzleistung (kW)', 'vehicle.maximumNetPowerKw|Maximum net power (kW)', 'vehicle.newMeansOfTransportIndicator|Neues Fahrzeug (USt)', 'vehicle.newMeansOfTransportIndicator|New means of transport', 'vehicle.firstEntryIntoServiceDate|Erste Inbetriebnahme', 'vehicle.firstEntryIntoServiceDate|First entry into service', 'vehicle.marginSchemeIndicator|Differenzbesteuerung', 'vehicle.marginSchemeIndicator|Margin scheme', 'vehicle.registrationNumber|Amtliches Kennzeichen', 'vehicle.registrationNumber|Registration number', 'vehicle.registrationCountryCode|Zulassungsland', 'vehicle.registrationCountryCode|Country of registration', 'vehicle.odometerReadingStatusCode|Status des Zählerstands', 'vehicle.odometerReadingStatusCode|Odometer reading status', 'vehicle.odometerReadingDate|Datum des Zählerstands', 'vehicle.odometerReadingDate|Date of odometer reading', 'vehicle.configuration|Modellausführung', 'vehicle.configuration|Vehicle configuration', 'vehicle.engineCapacityCm3|Hubraum (cm3)', 'vehicle.engineCapacityCm3|Engine capacity (cm3)', 'vehicle.energySourceCode|Kraftstoffart oder Energiequelle', 'vehicle.energySourceCode|Fuel or power source', 'vehicle.powertrainTypeCode|Antriebsart', 'vehicle.powertrainTypeCode|Powertrain type', 'vehicle.categoryCode|Fahrzeugklasse', 'vehicle.categoryCode|Vehicle category', 'vehicle.basicColourCode|Grundfarbe', 'vehicle.basicColourCode|Basic colour', 'vehicle.nextRoadworthinessTestDate|Nächste technische Prüfung', 'vehicle.nextRoadworthinessTestDate|Next roadworthiness test', 'vehicle.usableBatteryEnergyKwh|Nutzbare Batterieenergie (kWh)', 'vehicle.usableBatteryEnergyKwh|Usable battery energy (kWh)', 'vehicle.typeApprovalNumber|Typgenehmigungsnummer', 'vehicle.typeApprovalNumber|Type-approval number', 'vehicle.de.hsn|Herstellerschlüsselnummer (HSN)', 'vehicle.de.hsn|German manufacturer key number (HSN)', 'vehicle.de.tsn|Typschlüsselnummer (TSN)', 'vehicle.de.tsn|German type key number (TSN)', 'vehicle.exhaustEmissionLevelCode|Abgasnorm', 'vehicle.exhaustEmissionLevelCode|Exhaust emission level', 'vehicle.wltpCo2EmissionsGPerKm|CO2-Emissionen WLTP (g/km)', 'vehicle.wltpCo2EmissionsGPerKm|WLTP CO2 emissions (g/km)', 'vehicle.nedcCo2EmissionsGPerKm|CO2-Emissionen NEFZ (g/km)', 'vehicle.nedcCo2EmissionsGPerKm|NEDC CO2 emissions (g/km)', 'vehicle.bodyworkCode|Code des Aufbaus', 'vehicle.bodyworkCode|Code for bodywork', 'vehicle.seatingPositionCount|Anzahl der Sitzplätze', 'vehicle.seatingPositionCount|Number of seating positions', 'vehicle.modelYear|Modelljahr', 'vehicle.modelYear|Model year', 'vehicle.manufactureDate|Herstellungsdatum', 'vehicle.manufactureDate|Date of manufacture', 'vehicle.wltpElectricRangeKm|Elektrische Reichweite WLTP (km)', 'vehicle.wltpElectricRangeKm|WLTP electric range (km)', 'vehicle.batteryStateOfHealthPercent|Alterungszustand (%)', 'vehicle.batteryStateOfHealthPercent|State of health (%)', 'vehicle.batteryStateOfHealthDate|Alterungszustand ermittelt am', 'vehicle.batteryStateOfHealthDate|State of health date', 'vehicle.batteryStateOfHealthMethodCode|Ermittlungsmethode', 'vehicle.batteryStateOfHealthMethodCode|State of health method', 'vehicle.batteryPassportUrl|Batteriepass-Link', 'vehicle.batteryPassportUrl|Battery passport link', 'vehicle.maximumMassKg|Technisch zulässige Gesamtmasse (kg)', 'vehicle.maximumMassKg|Maximum mass (kg)', 'vehicle.registeredMaximumMassKg|Zulässige Gesamtmasse (kg)', 'vehicle.registeredMaximumMassKg|Registered maximum mass (kg)', 'vehicle.catalogueId|Katalogkennung', 'vehicle.catalogueId|Catalogue identifier', 'vehicle.approvedType|Typ (Typgenehmigung)', 'vehicle.approvedType|Type (type-approval)', 'vehicle.approvedVariant|Variante (Typgenehmigung)', 'vehicle.approvedVariant|Variant (type-approval)', 'vehicle.approvedVersion|Version (Typgenehmigung)', 'vehicle.approvedVersion|Version (type-approval)', 'vehicle.axleCount|Anzahl der Achsen', 'vehicle.axleCount|Number of axles', 'vehicle.cumulativeOperatingHours|Betriebsstundenstand', 'vehicle.cumulativeOperatingHours|Cumulative operating hours')">Label '<value-of select="$label"/>' is not a registry label of <value-of select="$key"/>.</assert>
      <assert id="V-22-reserved" role="information" test="not($current) or not($key = ('vehicle.previousHolderCount', 'vehicle.knownAccidentDamageIndicator', 'vehicle.knownUnrepairedDamageIndicator'))"><value-of select="$key"/> is a reserved name, not a key; ignored.</assert>
      <assert id="V-22-unknown" role="information" test="not($current) or $key = '' or $key = (('vehicle.specificationId', 'vehicle.roleCode', 'vehicle.vin', 'vehicle.make', 'vehicle.model', 'vehicle.conditionCode', 'vehicle.firstRegistrationDate', 'vehicle.odometerReadingKm', 'vehicle.odometerReadingMi', 'vehicle.maximumNetPowerKw', 'vehicle.newMeansOfTransportIndicator', 'vehicle.firstEntryIntoServiceDate', 'vehicle.marginSchemeIndicator', 'vehicle.registrationNumber', 'vehicle.registrationCountryCode', 'vehicle.odometerReadingStatusCode', 'vehicle.odometerReadingDate', 'vehicle.configuration', 'vehicle.engineCapacityCm3', 'vehicle.energySourceCode', 'vehicle.powertrainTypeCode', 'vehicle.categoryCode', 'vehicle.basicColourCode', 'vehicle.nextRoadworthinessTestDate', 'vehicle.usableBatteryEnergyKwh', 'vehicle.typeApprovalNumber', 'vehicle.de.hsn', 'vehicle.de.tsn', 'vehicle.exhaustEmissionLevelCode', 'vehicle.wltpCo2EmissionsGPerKm', 'vehicle.nedcCo2EmissionsGPerKm', 'vehicle.bodyworkCode', 'vehicle.seatingPositionCount', 'vehicle.modelYear', 'vehicle.manufactureDate', 'vehicle.wltpElectricRangeKm', 'vehicle.batteryStateOfHealthPercent', 'vehicle.batteryStateOfHealthDate', 'vehicle.batteryStateOfHealthMethodCode', 'vehicle.batteryPassportUrl', 'vehicle.maximumMassKg', 'vehicle.registeredMaximumMassKg', 'vehicle.catalogueId', 'vehicle.approvedType', 'vehicle.approvedVariant', 'vehicle.approvedVersion', 'vehicle.axleCount', 'vehicle.cumulativeOperatingHours'), ('vehicle.previousHolderCount', 'vehicle.knownAccidentDamageIndicator', 'vehicle.knownUnrepairedDamageIndicator'))">Unknown key <value-of select="$key"/>, ignored.</assert>
    </rule>
  </pattern>
</schema>
