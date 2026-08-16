import type { AppData, FairnessLevel, FairnessResult } from '../types/domain';
import { getDateKeysInMonth, getWeekdayIndex, isJapaneseHoliday } from '../utils/date';
import { getAssignment, shiftTypeById, isWorkingShift } from './scheduleHelpers';
import { consecutiveWorkingDaysAt } from './validateSchedule';

export function computeFairness(data: AppData, yearMonth: string): FairnessResult[] {
  const schedule = data.schedules[yearMonth] ?? { yearMonth, assignments: {}, status: 'draft' as const, publishedAt: null };
  const dateKeys = getDateKeysInMonth(yearMonth);
  const activeStaff = data.staff.filter((s) => s.active);

  const results: FairnessResult[] = activeStaff.map((staff) => {
    let nightCount = 0;
    let saturdayCount = 0;
    let sundayCount = 0;
    let holidayCount = 0;
    let maxConsecutive = 0;

    for (const date of dateKeys) {
      const st = shiftTypeById(data.shiftTypes, getAssignment(schedule, staff.id, date)?.shiftTypeId);
      if (!isWorkingShift(st)) continue;
      if (st!.isNightShift) nightCount++;
      const wd = getWeekdayIndex(date);
      if (wd === 6) saturdayCount++;
      if (wd === 0) sundayCount++;
      if (isJapaneseHoliday(date)) holidayCount++;
      const streak = consecutiveWorkingDaysAt({ data, yearMonth, schedule, dateKeys, activeStaff }, staff.id, date);
      if (streak > maxConsecutive) maxConsecutive = streak;
    }

    const desiredOffUnmet = staff.desiredOffDates.filter((d) => {
      if (!dateKeys.includes(d)) return false;
      const st = shiftTypeById(data.shiftTypes, getAssignment(schedule, staff.id, d)?.shiftTypeId);
      return isWorkingShift(st);
    }).length;

    return {
      staffId: staff.id,
      nightCount,
      saturdayCount,
      sundayCount,
      holidayCount,
      desiredOffUnmet,
      maxConsecutive,
      level: '偏り小' as FairnessLevel,
      notes: [],
    };
  });

  // グループ内平均と比較して偏り判定(夜勤専従は夜勤の判定から除外)
  const nightTargets = results.filter((r) => {
    const s = activeStaff.find((a) => a.id === r.staffId)!;
    return !s.isNightSpecialist && s.availability.canWorkNight;
  });
  const avgNight = average(nightTargets.map((r) => r.nightCount));
  const avgSat = average(results.map((r) => r.saturdayCount));
  const avgSun = average(results.map((r) => r.sundayCount));
  const tolerance = data.facilityRules.fairnessToleranceCount;

  for (const r of results) {
    const staff = activeStaff.find((a) => a.id === r.staffId)!;
    const notes: string[] = [];
    let score = 0; // 高いほど偏りあり

    if (!staff.isNightSpecialist && staff.availability.canWorkNight) {
      if (r.nightCount - avgNight > tolerance) {
        notes.push('夜勤回数が多め');
        score += 2;
      }
    }
    if (r.saturdayCount - avgSat > tolerance || r.sundayCount - avgSun > tolerance) {
      notes.push('土日勤務が多め');
      score += 1;
    }
    if (r.desiredOffUnmet > 0) {
      notes.push(`希望休が${r.desiredOffUnmet}件通っていません`);
      score += 2;
    }
    if (data.facilityRules.maxConsecutiveDaysEnabled && r.maxConsecutive > data.facilityRules.maxConsecutiveDays) {
      notes.push('連勤が多め');
      score += 1;
    }

    let level: FairnessLevel = '偏り小';
    if (score >= 3) level = '要確認';
    else if (score >= 1) level = '偏りあり';

    r.level = level;
    r.notes = notes;
  }

  return results;
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
