// Where VINvoice data sits in the two syntaxes. Shared by the specification page and llms-full.txt.
// Backticks mark code; codeSpans() turns them into <code> for HTML.
import { escapeHtml } from './registry';

export interface Binding {
  term: string;
  cii: string;
  ubl: string;
}

export const BINDINGS: Binding[] = [
  {
    term: 'Invoice line',
    cii: '`/rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:IncludedSupplyChainTradeLineItem`',
    ubl: '`/Invoice/cac:InvoiceLine`, `/CreditNote/cac:CreditNoteLine`',
  },
  {
    term: 'BG-32 item attribute (one row)',
    cii: '`ram:SpecifiedTradeProduct/ram:ApplicableProductCharacteristic`',
    ubl: '`cac:Item/cac:AdditionalItemProperty`',
  },
  { term: 'BT-160 name', cii: '`ram:Description`', ubl: '`cbc:Name`' },
  { term: 'BT-161 value', cii: '`ram:Value`', ubl: '`cbc:Value`' },
  {
    term: 'BT-128 line object identifier',
    cii: '`ram:SpecifiedLineTradeSettlement/ram:AdditionalReferencedDocument` with `ram:IssuerAssignedID` = VIN, `ram:TypeCode` = `130`',
    ubl: '`cac:DocumentReference` with `cbc:ID` = VIN, `cbc:DocumentTypeCode` = `130`',
  },
  {
    term: 'BT-128-1 scheme',
    cii: '`ram:ReferenceTypeCode` = `AKG`',
    ubl: '`cbc:ID/@schemeID` = `AKG`',
  },
  {
    term: 'BT-18 invoice object identifier',
    cii: '`/rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeAgreement/ram:AdditionalReferencedDocument` (`ram:TypeCode` = `130`, `ram:ReferenceTypeCode` = `AKG`)',
    ubl: '`/Invoice/cac:AdditionalDocumentReference` (`cbc:ID/@schemeID` = `AKG`, `cbc:DocumentTypeCode` = `130`)',
  },
  {
    term: 'BG-1 invoice note',
    cii: '`/rsm:CrossIndustryInvoice/rsm:ExchangedDocument/ram:IncludedNote/ram:Content`',
    ubl: '`/Invoice/cbc:Note`',
  },
];

export const codeSpans = (s: string) => escapeHtml(s).replace(/`([^`]+)`/g, '<code>$1</code>');
