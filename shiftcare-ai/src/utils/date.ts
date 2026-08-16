export function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

export function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function parseYearMonth(yearMonth: string): { year: number; month: number } {
  const [y, m] = yearMonth.split('-').map(Number);
  return { year: y, month: m };
}

export function daysInMonth(yearMonth: string): number {
  const { year, month } = parseYearMonth(yearMonth);
  return new Date(year, month, 0).getDate();
}

export function getDateKeysInMonth(yearMonth: string): string[] {
  const { year, month } = parseYearMonth(yearMonth);
  const count = daysInMonth(yearMonth);
  return Array.from({ length: count }, (_, i) => toDateKey(year, month, i + 1));
}

export function getWeekdayIndex(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
export function getWeekdayLabel(dateKey: string): string {
  return WEEKDAY_LABELS[getWeekdayIndex(dateKey)];
}

export function addDays(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return toDateKey(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

export function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

export function shiftYearMonth(yearMonth: string, delta: number): string {
  const { year, month } = parseYearMonth(yearMonth);
  const dt = new Date(year, month - 1 + delta, 1);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}`;
}

export function formatYearMonthLabel(yearMonth: string): string {
  const { year, month } = parseYearMonth(yearMonth);
  return `${year}年${month}月`;
}

export function formatDayLabel(dateKey: string): string {
  const d = Number(dateKey.split('-')[2]);
  return `${d}`;
}

// --- 日本の祝日判定(簡易実装。MVP用の近似計算) ---

function nthMonday(year: number, month: number, nth: number): Date {
  const first = new Date(year, month - 1, 1);
  const firstMonday = 1 + ((8 - first.getDay()) % 7);
  return new Date(year, month - 1, firstMonday + (nth - 1) * 7);
}

function vernalEquinox(year: number): number {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}
function autumnalEquinox(year: number): number {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function holidaySetForYear(year: number): Set<string> {
  const set = new Set<string>();
  const add = (m: number, d: number) => set.add(toDateKey(year, m, d));

  add(1, 1); // 元日
  const comingOfAge = nthMonday(year, 1, 2);
  set.add(toDateKey(year, 1, comingOfAge.getDate()));
  add(2, 11); // 建国記念の日
  add(2, 23); // 天皇誕生日
  add(3, vernalEquinox(year)); // 春分の日
  add(4, 29); // 昭和の日
  add(5, 3); // 憲法記念日
  add(5, 4); // みどりの日
  add(5, 5); // こどもの日
  const marineDay = nthMonday(year, 7, 3);
  set.add(toDateKey(year, 7, marineDay.getDate()));
  const mountainDay = new Date(year, 7, 11);
  set.add(toDateKey(year, 8, mountainDay.getDate()));
  const respectForAgedDay = nthMonday(year, 9, 3);
  set.add(toDateKey(year, 9, respectForAgedDay.getDate()));
  add(9, autumnalEquinox(year)); // 秋分の日
  const sportsDay = nthMonday(year, 10, 2);
  set.add(toDateKey(year, 10, sportsDay.getDate()));
  add(11, 3); // 文化の日
  add(11, 23); // 勤労感謝の日

  return set;
}

const holidayCache = new Map<number, Set<string>>();
export function isJapaneseHoliday(dateKey: string): boolean {
  const year = Number(dateKey.split('-')[0]);
  if (!holidayCache.has(year)) {
    holidayCache.set(year, holidaySetForYear(year));
  }
  return holidayCache.get(year)!.has(dateKey);
}
