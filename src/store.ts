import type {AppData} from './types';

// NOTE (storage): This standalone repo version has NO server and NO database.
// All data is stored in the browser's localStorage on the user's own machine.
// The Muse Space version of this system stores data in Muse's platform
// database instead. If a long-term backend is decided later, only this file
// (the storage layer) needs to change — the UI and rules stay the same.

const STORAGE_KEY = 'quote-invoice-system-v1';

export const emptyData = (): AppData => ({
  quotations: [],
  invoices: [],
  receipts: [],
  counters: {invoice: 60, receipt: 1},
});

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed || !Array.isArray(parsed.quotations) || !Array.isArray(parsed.invoices)) {
      return emptyData();
    }
    return {
      quotations: parsed.quotations,
      invoices: parsed.invoices,
      receipts: Array.isArray(parsed.receipts) ? parsed.receipts : [],
      counters: {
        invoice: parsed.counters?.invoice ?? 60,
        receipt: parsed.counters?.receipt ?? 1,
      },
    };
  } catch {
    return emptyData();
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage full / unavailable — nothing else we can do in this version
  }
}
