/** Format a number as HK money, e.g. HK$13,500.00 */
export function formatMoney(n: number): string {
  return `HK$${n.toLocaleString('en-HK', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

/** ISO yyyy-mm-dd -> dd/mm/yyyy */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** Today as ISO yyyy-mm-dd (local time) */
export function todayISO(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

/** Add calendar months to an ISO date; returns ISO. e.g. 2026-11-27 + 6 -> 2027-05-27 */
export function addMonthsISO(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, (m - 1) + months, 1);
  // Clamp the day to the target month's length (e.g. 31 Aug + 6 months -> 28/29 Feb).
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(d, lastDay));
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
