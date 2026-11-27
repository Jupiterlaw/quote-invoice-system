import type {AppData} from './types';
import {WEB_APP_URL} from './sheetsConfig';

// Storage layer:
// - 本地 localStorage 做即時快取（離線都開到、唔會因網絡問題搞丟畫面狀態）
// - Google Sheet 做中央後端：設定咗存取密鑰之後，開機由 Sheet 讀最新狀態，
//   每次改動自動同步返去 Sheet；電話同電腦睇到同一份資料。
// Sheet 端嘅對口係 apps-script/Code.gs（Apps Script Web App）。

const STORAGE_KEY = 'quote-invoice-system-v1';

export const emptyData = (): AppData => ({
  quotations: [],
  invoices: [],
  receipts: [],
  counters: {invoice: 60, receipt: 1},
});

function normalize(parsed: unknown): AppData | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const p = parsed as Partial<AppData>;
  if (!Array.isArray(p.quotations) || !Array.isArray(p.invoices)) return null;
  return {
    quotations: p.quotations,
    invoices: p.invoices,
    receipts: Array.isArray(p.receipts) ? p.receipts : [],
    counters: {
      invoice: p.counters?.invoice ?? 60,
      receipt: p.counters?.receipt ?? 1,
    },
  };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    return normalize(JSON.parse(raw)) ?? emptyData();
  } catch {
    return emptyData();
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage full / unavailable
  }
}

export const isEmptyData = (d: AppData): boolean =>
  d.quotations.length === 0 && d.invoices.length === 0 && d.receipts.length === 0;

// ---------- Google Sheet remote ----------

export async function fetchRemoteState(secret: string): Promise<AppData> {
  const url = WEB_APP_URL + '?action=getState&secret=' + encodeURIComponent(secret);
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = (await res.json()) as {ok: boolean; state?: unknown; error?: string};
  if (!json.ok) throw new Error(json.error || 'remote error');
  const state = normalize(json.state);
  if (!state) throw new Error('bad remote state');
  return state;
}

export async function pushRemoteState(secret: string, data: AppData): Promise<void> {
  // text/plain 避免 CORS preflight；Apps Script 會 redirect 去 content 網址，
  // fetch 預設跟隨 redirect。
  const res = await fetch(WEB_APP_URL, {
    method: 'POST',
    headers: {'Content-Type': 'text/plain;charset=utf-8'},
    body: JSON.stringify({secret, action: 'saveState', state: data}),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = (await res.json()) as {ok: boolean; error?: string};
  if (!json.ok) throw new Error(json.error || 'remote error');
}
