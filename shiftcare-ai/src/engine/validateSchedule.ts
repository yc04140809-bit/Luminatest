import type {
  AppData,
  FeasibilityIssue,
  Schedule,
  Staff,
  ShiftType,
  ValidationIssue,
  ValidationSuggestion,
  Severity,
  WeekdayIndex,
} from '../types/domain';
import { getDateKeysInMonth, getWeekdayIndex, isJapaneseHoliday, addDays } from '../utils/date';
import { generateId } from '../utils/id';
import { getAssignment, shiftTypeById, staffById, isWorkingShift } from './scheduleHelpers';

export interface ValidationContext {
  data: AppData;
  yearMonth: string;
  schedule: Schedule;
  dateKeys: string[];
  activeStaff: Staff[];
}

function makeIssue(
  severity: Severity,
  ruleType: string,
  message: string,
  opts: Partial<ValidationIssue> = {},
): ValidationIssue {
  return {
    id: generateId('issue'),
    severity,
    date: null,
    staffId: null,
    ruleType,
    message,
    suggestions: [],
    ...opts,
  };
}

function shiftHoursSpan(shiftType: ShiftType): { startMin: number; endMin: number } | null {
  if (!shiftType.startTime || !shiftType.endTime) return null;
  const [sh, sm] = shiftType.startTime.split(':').map(Number);
  const [eh, em] = shiftType.endTime.split(':').map(Number);
  let startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin <= startMin) endMin += 24 * 60; // 日をまたぐ
  return { startMin, endMin };
}

/** 指定スタッフの指定日を含む連続勤務日数を求める(休み・希望休・有休は非勤務扱い) */
function consecutiveWorkingDaysAt(ctx: ValidationContext, staffId: string, date: string): number {
  let count = 0;
  let cursor = date;
  // 遡って数える
  for (let i = 0; i < 62; i++) {
    const a = getAssignment(ctx.schedule, staffId, cursor);
    const st = shiftTypeById(ctx.data.shiftTypes, a?.shiftTypeId);
    if (isWorkingShift(st)) {
      count++;
      cursor = addDays(cursor, -1);
    } else {
      break;
    }
  }
  return count;
}

function findCandidatesForShortage(
  ctx: ValidationContext,
  date: string,
  shiftType: ShiftType,
  requiredQualificationId?: string,
): ValidationSuggestion[] {
  const weekday = getWeekdayIndex(date);
  const suggestions: ValidationSuggestion[] = [];

  const scored = ctx.activeStaff
    .map((s) => {
      const a = getAssignment(ctx.schedule, s.id, date);
      const currentShift = shiftTypeById(ctx.data.shiftTypes, a?.shiftTypeId);
      if (a?.locked) return null;
      if (currentShift && !currentShift.isTimeOff) return null; // 既に勤務中
      if (shiftType.isNightShift && !s.availability.canWorkNight) return null;
      if (s.availability.restrictedWeekdays.includes(weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6)) return null;
      if (s.desiredOffDates.includes(date)) return null;
      if (requiredQualificationId && !s.qualificationIds.includes(requiredQualificationId)) return null;

      // 今月の勤務数が少ない人を優先(簡易公平性)
      const monthlyCount = ctx.dateKeys.filter((d) => {
        const st = shiftTypeById(ctx.data.shiftTypes, getAssignment(ctx.schedule, s.id, d)?.shiftTypeId);
        return isWorkingShift(st);
      }).length;
      return { staff: s, monthlyCount };
    })
    .filter((x): x is { staff: Staff; monthlyCount: number } => !!x)
    .sort((a, b) => a.monthlyCount - b.monthlyCount)
    .slice(0, 3);

  for (const { staff } of scored) {
    suggestions.push({
      id: generateId('sugg'),
      label: `${staff.displayName}さんを${shiftType.name}へ追加`,
      action: { type: 'assign', staffId: staff.id, date, shiftTypeId: shiftType.id },
    });
  }
  return suggestions;
}

// --- 個別ルール ---

function checkDesiredOffConflict(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const staff of ctx.activeStaff) {
    for (const date of staff.desiredOffDates) {
      if (!ctx.dateKeys.includes(date)) continue;
      const a = getAssignment(ctx.schedule, staff.id, date);
      const st = shiftTypeById(ctx.data.shiftTypes, a?.shiftTypeId);
      if (isWorkingShift(st)) {
        issues.push(
          makeIssue('warning', 'desiredOffConflict', `${staff.displayName}さんは${dateLabel(date)}を希望休にしていますが、${st!.name}が設定されています。`, {
            date,
            staffId: staff.id,
          }),
        );
      }
    }
  }
  return issues;
}

function checkWeekdayRestriction(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const staff of ctx.activeStaff) {
    if (staff.availability.restrictedWeekdays.length === 0) continue;
    for (const date of ctx.dateKeys) {
      const weekday = getWeekdayIndex(date);
      if (!staff.availability.restrictedWeekdays.includes(weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6)) continue;
      const a = getAssignment(ctx.schedule, staff.id, date);
      const st = shiftTypeById(ctx.data.shiftTypes, a?.shiftTypeId);
      if (isWorkingShift(st)) {
        issues.push(
          makeIssue('error', 'weekdayRestriction', `${staff.displayName}さんは勤務不可の曜日に${st!.name}が設定されています。`, {
            date,
            staffId: staff.id,
          }),
        );
      }
    }
  }
  return issues;
}

function checkUnavailableDateConflict(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const staff of ctx.activeStaff) {
    for (const date of staff.unavailableDates) {
      if (!ctx.dateKeys.includes(date)) continue;
      const a = getAssignment(ctx.schedule, staff.id, date);
      const st = shiftTypeById(ctx.data.shiftTypes, a?.shiftTypeId);
      if (isWorkingShift(st)) {
        issues.push(
          makeIssue('error', 'unavailableDateConflict', `${staff.displayName}さんは${dateLabel(date)}を勤務不可日として提出していますが、${st!.name}が設定されています。`, {
            date,
            staffId: staff.id,
          }),
        );
      }
    }
  }
  return issues;
}

function checkNightIneligible(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!ctx.data.facilityRules.nightShiftRestrictedToEligibleEnabled) return issues;
  for (const staff of ctx.activeStaff) {
    if (staff.availability.canWorkNight) continue;
    for (const date of ctx.dateKeys) {
      const a = getAssignment(ctx.schedule, staff.id, date);
      const st = shiftTypeById(ctx.data.shiftTypes, a?.shiftTypeId);
      if (st?.isNightShift) {
        issues.push(
          makeIssue('error', 'nightIneligible', `${staff.displayName}さんは夜勤不可ですが、${dateLabel(date)}に夜勤が設定されています。`, {
            date,
            staffId: staff.id,
          }),
        );
      }
    }
  }
  return issues;
}

function checkHeadcount(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const req of ctx.data.shiftRequirements) {
    const shiftType = shiftTypeById(ctx.data.shiftTypes, req.shiftTypeId);
    if (!shiftType) continue;
    for (const date of ctx.dateKeys) {
      const minCount = req.overrides[date] ?? req.defaultMinCount;
      if (minCount <= 0) continue;
      const actual = ctx.activeStaff.filter(
        (s) => getAssignment(ctx.schedule, s.id, date)?.shiftTypeId === shiftType.id,
      ).length;
      if (actual < minCount) {
        issues.push(
          makeIssue(
            'error',
            'headcountShortage',
            `${dateLabel(date)} ${shiftType.name}：必要人数${minCount}名 → 現在${actual}名`,
            {
              date,
              staffId: null,
              suggestions: findCandidatesForShortage(ctx, date, shiftType),
            },
          ),
        );
      }
    }
  }
  return issues;
}

function checkQualificationCoverage(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const req of ctx.data.qualificationRequirements) {
    const shiftType = shiftTypeById(ctx.data.shiftTypes, req.shiftTypeId);
    const qualification = ctx.data.qualifications.find((q) => q.id === req.qualificationId);
    if (!shiftType || !qualification) continue;
    for (const date of ctx.dateKeys) {
      const holders = ctx.activeStaff.filter(
        (s) =>
          getAssignment(ctx.schedule, s.id, date)?.shiftTypeId === shiftType.id &&
          s.qualificationIds.includes(qualification.id),
      );
      if (holders.length < req.minCount) {
        issues.push(
          makeIssue(
            'error',
            'qualificationShortage',
            `${dateLabel(date)} ${shiftType.name}：${qualification.name}が配置されていません(必要${req.minCount}名 / 現在${holders.length}名)`,
            {
              date,
              staffId: null,
              suggestions: findCandidatesForShortage(ctx, date, shiftType, qualification.id),
            },
          ),
        );
      }
    }
  }
  return issues;
}

function checkPairRules(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const rule of ctx.data.pairRules) {
    if (!rule.active) continue;
    const staffA = staffById(ctx.activeStaff, rule.staffIdA);
    const staffB = staffById(ctx.activeStaff, rule.staffIdB);
    if (!staffA || !staffB) continue;
    for (const date of ctx.dateKeys) {
      const aShift = shiftTypeById(ctx.data.shiftTypes, getAssignment(ctx.schedule, staffA.id, date)?.shiftTypeId);
      const bShift = shiftTypeById(ctx.data.shiftTypes, getAssignment(ctx.schedule, staffB.id, date)?.shiftTypeId);
      if (!isWorkingShift(aShift) || !isWorkingShift(bShift)) continue;
      if (aShift!.id !== bShift!.id) continue; // 同じ勤務帯のみ対象

      const severity: Severity = rule.level === 3 ? 'error' : 'warning';
      const label = rule.level === 3 ? '同時勤務禁止の組み合わせです' : rule.level === 2 ? 'できるだけ避けたい組み合わせです' : '組み合わせ注意の設定があります';
      issues.push(
        makeIssue(severity, 'pairRule', `${staffA.displayName}さん × ${staffB.displayName}さん：${dateLabel(date)} ${aShift!.name}で${label}`, {
          date,
          staffId: staffA.id,
          staffIdB: staffB.id,
        }),
      );
    }
  }
  return issues;
}

function checkSupportPairRules(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const rule of ctx.data.supportPairRules) {
    if (!rule.active) continue;
    const target = staffById(ctx.activeStaff, rule.targetStaffId);
    if (!target) continue;
    for (const date of ctx.dateKeys) {
      const targetShift = shiftTypeById(ctx.data.shiftTypes, getAssignment(ctx.schedule, target.id, date)?.shiftTypeId);
      if (!isWorkingShift(targetShift)) continue;
      const hasSupporter = rule.supporterStaffIds.some((supporterId) => {
        const supporterShift = shiftTypeById(
          ctx.data.shiftTypes,
          getAssignment(ctx.schedule, supporterId, date)?.shiftTypeId,
        );
        return supporterShift?.id === targetShift!.id;
      });
      if (!hasSupporter) {
        issues.push(
          makeIssue(
            'warning',
            'supportPairMissing',
            `${target.displayName}さん：${dateLabel(date)} ${targetShift!.name}にサポート要員(${rule.purpose || '配置サポート'})が不在です。`,
            { date, staffId: target.id },
          ),
        );
      }
    }
  }
  return issues;
}

function checkMaxConsecutiveDays(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!ctx.data.facilityRules.maxConsecutiveDaysEnabled) return issues;
  const limit = ctx.data.facilityRules.maxConsecutiveDays;
  for (const staff of ctx.activeStaff) {
    let streak = 0;
    let reported = false;
    for (const date of ctx.dateKeys) {
      const st = shiftTypeById(ctx.data.shiftTypes, getAssignment(ctx.schedule, staff.id, date)?.shiftTypeId);
      if (isWorkingShift(st)) {
        streak++;
      } else {
        streak = 0;
        reported = false;
      }
      if (streak > limit && !reported) {
        issues.push(
          makeIssue('warning', 'maxConsecutiveDays', `${staff.displayName}さん：${streak}連勤になっています(上限${limit}日)`, {
            date,
            staffId: staff.id,
          }),
        );
        reported = true;
      }
    }
  }
  return issues;
}

function checkNightShiftLimit(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!ctx.data.facilityRules.nightShiftLimitEnabled) return issues;
  for (const staff of ctx.activeStaff) {
    const limit = staff.availability.maxNightShiftsPerMonth;
    if (limit === null) continue;
    const count = ctx.dateKeys.filter(
      (d) => shiftTypeById(ctx.data.shiftTypes, getAssignment(ctx.schedule, staff.id, d)?.shiftTypeId)?.isNightShift,
    ).length;
    if (count > limit) {
      issues.push(
        makeIssue('warning', 'nightShiftLimit', `${staff.displayName}さん：今月の夜勤回数が${count}回で上限(${limit}回)を超えています。`, {
          staffId: staff.id,
        }),
      );
    }
  }
  return issues;
}

function checkNightConsecutive(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!ctx.data.facilityRules.nightShiftConsecutiveEnabled) return issues;
  const limit = ctx.data.facilityRules.maxConsecutiveNightShifts;
  for (const staff of ctx.activeStaff) {
    let streak = 0;
    let reported = false;
    for (const date of ctx.dateKeys) {
      const st = shiftTypeById(ctx.data.shiftTypes, getAssignment(ctx.schedule, staff.id, date)?.shiftTypeId);
      if (st?.isNightShift) {
        streak++;
      } else if (isWorkingShift(st)) {
        // 勤務だが夜勤ではない -> 継続扱いにしない
        streak = 0;
        reported = false;
      } else {
        streak = 0;
        reported = false;
      }
      if (streak > limit && !reported) {
        issues.push(
          makeIssue('warning', 'nightConsecutive', `${staff.displayName}さん：夜勤が${streak}回連続しています(上限${limit}回)`, {
            date,
            staffId: staff.id,
          }),
        );
        reported = true;
      }
    }
  }
  return issues;
}

function checkNightNextDayRestriction(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!ctx.data.facilityRules.nightShiftNextDayRestrictionEnabled) return issues;
  const forbidden = new Set(ctx.data.facilityRules.nightShiftNextDayForbiddenShiftTypeIds);
  for (const staff of ctx.activeStaff) {
    for (const date of ctx.dateKeys) {
      const st = shiftTypeById(ctx.data.shiftTypes, getAssignment(ctx.schedule, staff.id, date)?.shiftTypeId);
      if (!st?.isNightShift) continue;
      const nextDate = addDays(date, 1);
      if (!ctx.dateKeys.includes(nextDate)) continue;
      const nextShift = shiftTypeById(ctx.data.shiftTypes, getAssignment(ctx.schedule, staff.id, nextDate)?.shiftTypeId);
      if (nextShift && forbidden.has(nextShift.id)) {
        issues.push(
          makeIssue(
            'warning',
            'nightNextDayRestriction',
            `${staff.displayName}さん：${dateLabel(date)}の夜勤翌日(${dateLabel(nextDate)})に${nextShift.name}が設定されています。`,
            { date: nextDate, staffId: staff.id },
          ),
        );
      }
    }
  }
  return issues;
}

function checkNightFollowUpRestriction(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!ctx.data.facilityRules.nightShiftFollowUpRestrictionEnabled) return issues;
  const forbidden = new Set(ctx.data.facilityRules.nightShiftFollowUpForbiddenShiftTypeIds);
  for (const staff of ctx.activeStaff) {
    for (const date of ctx.dateKeys) {
      const st = shiftTypeById(ctx.data.shiftTypes, getAssignment(ctx.schedule, staff.id, date)?.shiftTypeId);
      if (!st?.isNightShiftFollowUp) continue;
      const nextDate = addDays(date, 1);
      if (!ctx.dateKeys.includes(nextDate)) continue;
      const nextShift = shiftTypeById(ctx.data.shiftTypes, getAssignment(ctx.schedule, staff.id, nextDate)?.shiftTypeId);
      if (nextShift && forbidden.has(nextShift.id)) {
        issues.push(
          makeIssue(
            'warning',
            'nightFollowUpRestriction',
            `${staff.displayName}さん：${dateLabel(date)}の夜勤明け翌日(${dateLabel(nextDate)})に${nextShift.name}が設定されています。`,
            { date: nextDate, staffId: staff.id },
          ),
        );
      }
    }
  }
  return issues;
}

function checkNightInterval(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!ctx.data.facilityRules.nightShiftIntervalEnabled) return issues;
  const minInterval = ctx.data.facilityRules.minNightShiftIntervalDays;
  for (const staff of ctx.activeStaff) {
    let lastNightDate: string | null = null;
    for (const date of ctx.dateKeys) {
      const st = shiftTypeById(ctx.data.shiftTypes, getAssignment(ctx.schedule, staff.id, date)?.shiftTypeId);
      if (st?.isNightShift) {
        if (lastNightDate) {
          const gap = dayDiff(lastNightDate, date);
          if (gap < minInterval + 1 && gap > 1) {
            issues.push(
              makeIssue(
                'warning',
                'nightInterval',
                `${staff.displayName}さん：夜勤の間隔が${gap - 1}日しかありません(推奨${minInterval}日以上)`,
                { date, staffId: staff.id },
              ),
            );
          }
        }
        lastNightDate = date;
      }
    }
  }
  return issues;
}

function dayDiff(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.round((db - da) / (1000 * 60 * 60 * 24));
}

function checkRestInterval(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!ctx.data.facilityRules.restIntervalEnabled) return issues;
  const minRest = ctx.data.facilityRules.minRestHours;
  for (const staff of ctx.activeStaff) {
    for (let i = 0; i < ctx.dateKeys.length - 1; i++) {
      const date = ctx.dateKeys[i];
      const nextDate = ctx.dateKeys[i + 1];
      const st = shiftTypeById(ctx.data.shiftTypes, getAssignment(ctx.schedule, staff.id, date)?.shiftTypeId);
      const nextSt = shiftTypeById(ctx.data.shiftTypes, getAssignment(ctx.schedule, staff.id, nextDate)?.shiftTypeId);
      if (!isWorkingShift(st) || !isWorkingShift(nextSt)) continue;
      const span = shiftHoursSpan(st!);
      const nextSpan = shiftHoursSpan(nextSt!);
      if (!span || !nextSpan) continue;
      const endAbsolute = span.endMin; // 分(当日0時基点、日またぎ考慮済み)
      const restHours = (24 * 60 - endAbsolute + nextSpan.startMin) / 60;
      if (restHours < minRest) {
        issues.push(
          makeIssue(
            'warning',
            'restInterval',
            `${staff.displayName}さん：${dateLabel(date)}${st!.name}→${dateLabel(nextDate)}${nextSt!.name}の休息時間が${restHours.toFixed(1)}時間です(施設設定の最低休息時間${minRest}時間未満)`,
            { date: nextDate, staffId: staff.id },
          ),
        );
      }
    }
  }
  return issues;
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function checkWeekendHolidayFairness(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!ctx.data.facilityRules.fairnessCheckEnabled) return issues;
  const tolerance = ctx.data.facilityRules.fairnessToleranceCount;

  const countFor = (predicate: (d: string) => boolean) => {
    const map = new Map<string, number>();
    for (const staff of ctx.activeStaff) {
      let count = 0;
      for (const date of ctx.dateKeys) {
        if (!predicate(date)) continue;
        const st = shiftTypeById(ctx.data.shiftTypes, getAssignment(ctx.schedule, staff.id, date)?.shiftTypeId);
        if (isWorkingShift(st)) count++;
      }
      map.set(staff.id, count);
    }
    return map;
  };

  const dims: { key: string; label: string; predicate: (d: string) => boolean }[] = [
    { key: 'saturday', label: '土曜勤務', predicate: (d) => getWeekdayIndex(d) === 6 },
    { key: 'sunday', label: '日曜勤務', predicate: (d) => getWeekdayIndex(d) === 0 },
    { key: 'holiday', label: '祝日勤務', predicate: (d) => isJapaneseHoliday(d) },
  ];

  for (const dim of dims) {
    const counts = countFor(dim.predicate);
    const avg = average(Array.from(counts.values()));
    for (const staff of ctx.activeStaff) {
      const c = counts.get(staff.id) ?? 0;
      if (c - avg > tolerance) {
        issues.push(
          makeIssue('warning', 'weekendFairness', `${staff.displayName}さんの${dim.label}が他スタッフより多くなっています(${c}回 / 平均${avg.toFixed(1)}回)`, {
            staffId: staff.id,
          }),
        );
      }
    }
  }
  return issues;
}

function checkNightFairness(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!ctx.data.facilityRules.fairnessCheckEnabled) return issues;
  const tolerance = ctx.data.facilityRules.fairnessToleranceCount;
  const target = ctx.activeStaff.filter((s) => !s.isNightSpecialist && s.availability.canWorkNight);
  const counts = target.map((staff) => ({
    staff,
    count: ctx.dateKeys.filter(
      (d) => shiftTypeById(ctx.data.shiftTypes, getAssignment(ctx.schedule, staff.id, d)?.shiftTypeId)?.isNightShift,
    ).length,
  }));
  const avg = average(counts.map((c) => c.count));
  for (const { staff, count } of counts) {
    if (count - avg > tolerance) {
      issues.push(
        makeIssue('warning', 'nightFairness', `${staff.displayName}さんの夜勤回数が他スタッフより多くなっています(${count}回 / 平均${avg.toFixed(1)}回)`, {
          staffId: staff.id,
        }),
      );
    }
  }
  return issues;
}

function dateLabel(date: string): string {
  const [, m, d] = date.split('-');
  return `${Number(m)}/${Number(d)}`;
}

type RuleCheck = (ctx: ValidationContext) => ValidationIssue[];

/**
 * ルールエンジン本体。ここに関数を追加するだけで検証項目を増やせる。
 */
const RULES: RuleCheck[] = [
  checkDesiredOffConflict,
  checkWeekdayRestriction,
  checkUnavailableDateConflict,
  checkNightIneligible,
  checkHeadcount,
  checkQualificationCoverage,
  checkPairRules,
  checkSupportPairRules,
  checkMaxConsecutiveDays,
  checkNightShiftLimit,
  checkNightConsecutive,
  checkNightNextDayRestriction,
  checkNightFollowUpRestriction,
  checkNightInterval,
  checkRestInterval,
  checkWeekendHolidayFairness,
  checkNightFairness,
];

export function validateSchedule(data: AppData, yearMonth: string): ValidationIssue[] {
  const schedule = data.schedules[yearMonth] ?? { yearMonth, assignments: {}, status: 'draft' as const, publishedAt: null };
  const dateKeys = getDateKeysInMonth(yearMonth);
  const activeStaff = data.staff.filter((s) => s.active);
  const ctx: ValidationContext = { data, yearMonth, schedule, dateKeys, activeStaff };

  const issues = RULES.flatMap((rule) => rule(ctx));

  const severityOrder: Record<Severity, number> = { error: 0, warning: 1, suggestion: 2 };
  issues.sort((a, b) => {
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return (a.date ?? '').localeCompare(b.date ?? '');
  });
  return issues;
}

export function countBySeverity(issues: ValidationIssue[]): Record<Severity, number> {
  return {
    error: issues.filter((i) => i.severity === 'error').length,
    warning: issues.filter((i) => i.severity === 'warning').length,
    suggestion: issues.filter((i) => i.severity === 'suggestion').length,
  };
}

/**
 * 自動作成の実行前に、現在の登録条件だけで各勤務帯の必要人数を満たせる可能性があるかを
 * ざっくり確認する(無駄な自動計算・後からのエラー大量発生を事前に知らせるため)。
 * 希望休のような「ソフトな希望」は考慮せず、曜日制限・勤務不可日・夜勤可否のような
 * ハードな制約のみで機械的におおよその対応可能人数を数える簡易チェック。
 */
export function checkFeasibility(
  data: AppData,
  yearMonth: string,
  scope: 'all' | 'nightOnly' = 'all',
): FeasibilityIssue[] {
  const dateKeys = getDateKeysInMonth(yearMonth);
  const activeStaff = data.staff.filter((s) => s.active);
  const issues: FeasibilityIssue[] = [];

  for (const req of data.shiftRequirements) {
    const shiftType = shiftTypeById(data.shiftTypes, req.shiftTypeId);
    if (!shiftType) continue;
    if (scope === 'nightOnly' && !shiftType.isNightShift) continue;

    for (const date of dateKeys) {
      const requiredCount = req.overrides[date] ?? req.defaultMinCount;
      if (requiredCount <= 0) continue;
      const weekday = getWeekdayIndex(date) as WeekdayIndex;

      const eligibleCount = activeStaff.filter((s) => {
        if (s.availability.restrictedWeekdays.includes(weekday)) return false;
        if (s.unavailableDates.includes(date)) return false;
        if (shiftType.isNightShift && data.facilityRules.nightShiftRestrictedToEligibleEnabled && !s.availability.canWorkNight) {
          return false;
        }
        return true;
      }).length;

      if (eligibleCount < requiredCount) {
        issues.push({
          id: generateId('feas'),
          date,
          shiftTypeId: shiftType.id,
          requiredCount,
          eligibleCount,
          message: `${dateLabel(date)} ${shiftType.name}：必要${requiredCount}名に対し、対応可能なスタッフが${eligibleCount}名しかいません。`,
        });
      }
    }
  }

  return issues;
}

export { consecutiveWorkingDaysAt };
