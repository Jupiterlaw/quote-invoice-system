export type LineItem = {
  id: string;
  name: string;
  amount: number;
}

export type Quotation = {
  id: string;
  clientName: string;
  phone: string;
  address: string;
  /** ISO date string yyyy-mm-dd */
  date: string;
  items: LineItem[];
  /** invoice id once converted, otherwise null */
  invoiceId: string | null;
}

export type Invoice = {
  id: string;
  /** e.g. INV-2026-060 */
  number: string;
  clientName: string;
  phone: string;
  address: string;
  date: string;
  items: LineItem[];
  paid: boolean;
  /** source quotation id; null when the quotation was deleted and this invoice stands alone */
  quotationId: string | null;
  /** receipt id once issued, otherwise null */
  receiptId: string | null;
}

export type Receipt = {
  id: string;
  /** e.g. RCT-2026-001 */
  number: string;
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  phone: string;
  address: string;
  /** payment date, ISO yyyy-mm-dd */
  date: string;
  items: LineItem[];
}

export type Counters = {
  /** next invoice sequence (starts at 60, never reused) */
  invoice: number;
  /** next receipt sequence (starts at 1, never reused) */
  receipt: number;
}

export type AppData = {
  quotations: Quotation[];
  invoices: Invoice[];
  receipts: Receipt[];
  counters: Counters;
}

export const totalOf = (items: LineItem[]): number =>
  items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
