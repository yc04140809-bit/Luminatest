import type { AppData, Assignment, ShiftType, Staff, WeekdayIndex } from '../types/domain';
import { getDateKeysInMonth, getWeekdayIndex, isJapaneseHoliday, addDays } from '../utils/date';
import { shiftTypeById, isWorkingShift } from './scheduleHelpers';

export type AutoAssignMode = 'full' | 'fillEmpty';

interface StaffStats {
  worked: number;
  night: number;
  weekend: number;
}

function keyOf(staffId: string, date: string): string {
  return `${staffId}__${date}`;
}

function findShiftType(shiftTypes: ShiftType[], predicate: (s: ShiftType) => boolean): ShiftType | undefined {
  return shiftTypes.find(predicate);
}

/**
 * 簡易自動作成エンジン。完全最適化はせず、優先順位に従ってたたき台を生成する。
 * mode='full'   : ロックされたセル以外を全て再計算する
 * mode='fillEmpty' : 既に入力済みのセル(値がある)は一切変更せず、空欄のみ埋める
 */
export function runAutoAssign(data: AppData, yearMonth: string, mode: AutoAssignMode): Assignment[] {
  const dateKeys = getDateKeysInMonth(yearMonth);
  const activeStaff = data.staff.filter((s) => s.active);
  const schedule = data.schedules[yearMonth] ?? { yearMonth, assignments: {} };
  const workingMap = new Map(Object.entries(schedule.assignments));

  const desiredOffShiftType =
    findShiftType(data.shiftTypes, (s) => s.id === 'st_kiboyasumi') ??
    findShiftType(data.shiftTypes, (s) => s.isTimeOff);
  const defaultOffShiftType =
    findShiftType(data.shiftTypes, (s) => s.id === 'st_yasumi') ??
    findShiftType(data.shiftTypes, (s) => s.isTimeOff);
  const followUpShiftType = findShiftType(data.shiftTypes, (s) => s.isNightShiftFollowUp);

  const stats = new Map<string, StaffStats>();
  activeStaff.forEach((s) => stats.set(s.id, { worked: 0, night: 0, weekend: 0 }));

  // 既存(ロック済み等)の割当を統計に先に反映させておく(処理ループ内でも積み上げるが、
  // fillEmpty時に過去日の既存データを正しく評価するため、最初のstats初期化はループ内で行う)

  const shiftRequirementsSorted = [...data.shiftRequirements].sort((a, b) => {
    const stA = shiftTypeById(data.shiftTypes, a.shiftTypeId);
    const stB = shiftTypeById(data.shiftTypes, b.shiftTypeId);
    const nightA = stA?.isNightShift ? 0 : 1;
    const nightB = stB?.isNightShift ? 0 : 1;
    if (nightA !== nightB) return nightA - nightB;
    return (stA?.sortOrder ?? 99) - (stB?.sortOrder ?? 99);
  });

  const isWeekendOrHoliday = (date: string) => {
    const wd = getWeekdayIndex(date);
    return wd === 0 || wd === 6 || isJapaneseHoliday(date);
  };

  function isEligible(staff: Staff, date: string, shiftType: ShiftType, conflictSetForShift: Set<string>): boolean {
    const weekday = getWeekdayIndex(date) as WeekdayIndex;
    if (staff.availability.restrictedWeekdays.includes(weekday)) return false;
    if (shiftType.isNightShift && !staff.availability.canWorkNight) return false;
    if (data.facilityRules.nightShiftRestrictedToEligibleEnabled && shiftType.isNightShift && !staff.availability.canWorkNight) {
      return false;
    }
    // 同時勤務禁止(レベル3)
    for (const rule of data.pairRules) {
      if (!rule.active || rule.level !== 3) continue;
      const other = rule.staffIdA === staff.id ? rule.staffIdB : rule.staffIdB === staff.id ? rule.staffIdA : null;
      if (other && conflictSetForShift.has(other)) return false;
    }
    // 夜勤翌日制限
    const yesterday = addDays(date, -1);
    const yesterdayShift = shiftTypeById(data.shiftTypes, workingMap.get(keyOf(staff.id, yesterday))?.shiftTypeId);
    if (
      data.facilityRules.nightShiftNextDayRestrictionEnabled &&
      yesterdayShift?.isNightShift &&
      data.facilityRules.nightShiftNextDayForbiddenShiftTypeIds.includes(shiftType.id)
    ) {
      return false;
    }
    if (
      data.facilityRules.nightShiftFollowUpRestrictionEnabled &&
      yesterdayShift?.isNightShiftFollowUp &&
      data.facilityRules.nightShiftFollowUpForbiddenShiftTypeIds.includes(shiftType.id)
    ) {
      return false;
    }
    return true;
  }

  function consecutiveStreakIfAssigned(staffId: string, date: string): number {
    let count = 1;
    let cursor = addDays(date, -1);
    for (let i = 0; i < 60; i++) {
      const st = shiftTypeById(data.shiftTypes, workingMap.get(keyOf(staffId, cursor))?.shiftTypeId);
      if (isWorkingShift(st)) {
        count++;
        cursor = addDays(cursor, -1);
      } else break;
    }
    return count;
  }

  function scoreCandidate(staff: Staff, date: string, shiftType: ShiftType, conflictSetForShift: Set<string>): number {
    let penalty = 0;
    const s = stats.get(staff.id)!;

    if (data.facilityRules.maxConsecutiveDaysEnabled) {
      const streak = consecutiveStreakIfAssigned(staff.id, date);
      if (streak > data.facilityRules.maxConsecutiveDays) penalty += 1000;
    }
    if (shiftType.isNightShift && staff.availability.maxNightShiftsPerMonth !== null) {
      if (s.night >= staff.availability.maxNightShiftsPerMonth) penalty += 500;
    }
    for (const rule of data.pairRules) {
      if (!rule.active) continue;
      const other = rule.staffIdA === staff.id ? rule.staffIdB : rule.staffIdB === staff.id ? rule.staffIdA : null;
      if (other && conflictSetForShift.has(other)) {
        if (rule.level === 2) penalty += 300;
        else if (rule.level === 1) penalty += 20;
      }
    }
    penalty += s.worked * 3;
    if (shiftType.isNightShift) penalty += s.night * 5;
    if (isWeekendOrHoliday(date)) penalty += s.weekend * 4;
    if (staff.desiredWorkDates[date] === shiftType.id) penalty -= 200;
    return penalty;
  }

  for (const date of dateKeys) {
    const dayFixed = new Set<string>(); // staffId with a fixed assignment already for this date

    for (const staff of activeStaff) {
      const key = keyOf(staff.id, date);
      const existing = workingMap.get(key);
      if (mode === 'fillEmpty') {
        if (existing && existing.shiftTypeId) {
          dayFixed.add(staff.id);
        }
      } else {
        if (existing?.locked) {
          dayFixed.add(staff.id);
        }
      }
    }

    let pool = activeStaff.filter((s) => !dayFixed.has(s.id));

    // full再作成モードでは、固定されていないセルの既存値が後段のcountForShift等に
    // 誤って残存しないよう、この日の分をいったん空にしてから組み立て直す。
    if (mode === 'full') {
      for (const staff of pool) {
        workingMap.delete(keyOf(staff.id, date));
      }
    }

    // 1) 夜勤明け強制(前日が夜勤なら翌日は夜勤明けにする)
    if (followUpShiftType) {
      for (const staff of [...pool]) {
        const yesterday = addDays(date, -1);
        const yesterdayShift = shiftTypeById(data.shiftTypes, workingMap.get(keyOf(staff.id, yesterday))?.shiftTypeId);
        if (yesterdayShift?.isNightShift) {
          workingMap.set(keyOf(staff.id, date), { staffId: staff.id, date, shiftTypeId: followUpShiftType.id, locked: false });
          pool = pool.filter((p) => p.id !== staff.id);
        }
      }
    }

    // 2) 希望休を優先反映
    if (desiredOffShiftType) {
      for (const staff of [...pool]) {
        if (staff.desiredOffDates.includes(date)) {
          workingMap.set(keyOf(staff.id, date), { staffId: staff.id, date, shiftTypeId: desiredOffShiftType.id, locked: false });
          pool = pool.filter((p) => p.id !== staff.id);
        }
      }
    }

    const countForShift = (shiftTypeId: string) =>
      activeStaff.filter((s) => workingMap.get(keyOf(s.id, date))?.shiftTypeId === shiftTypeId).length;

    // 3) 必要人数・資格配置を満たすように割当
    for (const req of shiftRequirementsSorted) {
      const shiftType = shiftTypeById(data.shiftTypes, req.shiftTypeId);
      if (!shiftType) continue;
      const minCount = req.overrides[date] ?? req.defaultMinCount;
      let currentCount = countForShift(shiftType.id);
      if (currentCount >= minCount) continue;

      const conflictSet = new Set(
        activeStaff.filter((s) => workingMap.get(keyOf(s.id, date))?.shiftTypeId === shiftType.id).map((s) => s.id),
      );

      const qualReqs = data.qualificationRequirements.filter((q) => q.shiftTypeId === shiftType.id);

      const pickBest = (filterFn: (s: Staff) => boolean): Staff | null => {
        const candidates = pool.filter((s) => filterFn(s) && isEligible(s, date, shiftType, conflictSet));
        if (candidates.length === 0) return null;
        candidates.sort((a, b) => scoreCandidate(a, date, shiftType, conflictSet) - scoreCandidate(b, date, shiftType, conflictSet));
        return candidates[0];
      };

      // 資格要件を優先的に満たす
      for (const qreq of qualReqs) {
        let qualHolders = activeStaff.filter(
          (s) => workingMap.get(keyOf(s.id, date))?.shiftTypeId === shiftType.id && s.qualificationIds.includes(qreq.qualificationId),
        ).length;
        while (qualHolders < qreq.minCount && currentCount < minCount) {
          const chosen = pickBest((s) => s.qualificationIds.includes(qreq.qualificationId));
          if (!chosen) break;
          workingMap.set(keyOf(chosen.id, date), { staffId: chosen.id, date, shiftTypeId: shiftType.id, locked: false });
          pool = pool.filter((p) => p.id !== chosen.id);
          conflictSet.add(chosen.id);
          qualHolders++;
          currentCount++;
        }
      }

      while (currentCount < minCount) {
        const chosen = pickBest(() => true);
        if (!chosen) break;
        workingMap.set(keyOf(chosen.id, date), { staffId: chosen.id, date, shiftTypeId: shiftType.id, locked: false });
        pool = pool.filter((p) => p.id !== chosen.id);
        conflictSet.add(chosen.id);
        currentCount++;
      }
    }

    // 4) 残りは休みで埋める(fillEmptyでも空欄は必ず何かで埋める)
    if (defaultOffShiftType) {
      for (const staff of pool) {
        workingMap.set(keyOf(staff.id, date), { staffId: staff.id, date, shiftTypeId: defaultOffShiftType.id, locked: false });
      }
    }

    // 統計更新
    for (const staff of activeStaff) {
      const shiftId = workingMap.get(keyOf(staff.id, date))?.shiftTypeId;
      const st = shiftTypeById(data.shiftTypes, shiftId);
      const s = stats.get(staff.id)!;
      if (isWorkingShift(st)) {
        s.worked++;
        if (st!.isNightShift) s.night++;
        if (isWeekendOrHoliday(date)) s.weekend++;
      }
    }
  }

  return Array.from(workingMap.values());
}
