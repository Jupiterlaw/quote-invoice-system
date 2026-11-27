// Google Sheet 後端設定
// WEB_APP_URL：Apps Script 網頁應用程式部署後嘅 /exec 網址（部署完填入；
// 呢條網址本身唔係秘密，真正把關嘅係每部機各自輸入、唔入 repo 嘅存取密鑰）。
export const WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbwGM-h6wKQCmZvHcVyfUSdeH7mFAZfmWSvgiYFj_hSFI5NXO2VCM4GxGb8w_vR50H6O/exec';

export const SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1cK9po73ST1ji0tesSre80JG-_L3OOJdT5NSNcUIRnCg/edit';

const SECRET_KEY = 'quote-invoice-system-secret';

export function loadSecret(): string {
  try {
    return localStorage.getItem(SECRET_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveSecret(secret: string): void {
  try {
    if (secret) localStorage.setItem(SECRET_KEY, secret);
    else localStorage.removeItem(SECRET_KEY);
  } catch {
    // ignore
  }
}
