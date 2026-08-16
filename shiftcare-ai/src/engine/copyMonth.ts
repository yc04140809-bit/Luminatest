import type { AppData, Assignment } from '../types/domain';
import { getDateKeysInMonth, shiftYearMonth, toDateKey, parseYearMonth, daysInMonth } from '../utils/date';

export interface CopyMonthOptions {
  /** 実際の勤務割当をコピーするか。falseの場合は何もしない(スタッフ・ルール・必要人数・資格条件は
   *  そもそも施設全体で共有されており月をまたいで自動的に適用されるため、コピー操作は不要) */
  copyAssignments: boolean;
  /** ロック状態も引き継ぐか */
  copyLocks: boolean;
}

/**
 * 前月の勤務割当を「同じ日番号」で当月へコピーする(例: 前月1日 → 当月1日)。
 * 当月側に既に値が入っているセルは上書きしない(安全側に倒す)。
 */
export function buildCopyFromPreviousMonth(
  data: AppData,
  targetYearMonth: string,
  options: CopyMonthOptions,
): Assignment[] {
  if (!options.copyAssignments) return [];

  const prevYearMonth = shiftYearMonth(targetYearMonth, -1);
  const prevSchedule = data.schedules[prevYearMonth];
  if (!prevSchedule) return [];

  const targetSchedule = data.schedules[targetYearMonth];
  const { year: prevYear, month: prevMonth } = parseYearMonth(prevYearMonth);
  const prevMonthLength = daysInMonth(prevYearMonth);
  const targetDateKeys = getDateKeysInMonth(targetYearMonth);
  const activeStaff = data.staff.filter((s) => s.active);

  const results: Assignment[] = [];

  for (const targetDate of targetDateKeys) {
    const dayNumber = Number(targetDate.split('-')[2]);
    if (dayNumber > prevMonthLength) continue;
    const prevDate = toDateKey(prevYear, prevMonth, dayNumber);

    for (const staff of activeStaff) {
      const prevAssignment = prevSchedule.assignments[`${staff.id}__${prevDate}`];
      if (!prevAssignment || !prevAssignment.shiftTypeId) continue;

      const targetExisting = targetSchedule?.assignments[`${staff.id}__${targetDate}`];
      if (targetExisting && targetExisting.shiftTypeId) continue; // 既存の入力は保護する

      results.push({
        staffId: staff.id,
        date: targetDate,
        shiftTypeId: prevAssignment.shiftTypeId,
        locked: options.copyLocks ? prevAssignment.locked : false,
      });
    }
  }

  return results;
}
