import type { Assignment, Schedule, Staff, ShiftType } from '../types/domain';

export function getAssignment(schedule: Schedule, staffId: string, date: string): Assignment | undefined {
  return schedule.assignments[`${staffId}__${date}`];
}

export function assignmentKey(staffId: string, date: string): string {
  return `${staffId}__${date}`;
}

export function shiftTypeById(shiftTypes: ShiftType[], id: string | null | undefined): ShiftType | undefined {
  if (!id) return undefined;
  return shiftTypes.find((s) => s.id === id);
}

export function staffById(staff: Staff[], id: string | null | undefined): Staff | undefined {
  if (!id) return undefined;
  return staff.find((s) => s.id === id);
}

/** ある日・ある勤務種別に配置されているスタッフID一覧 */
export function staffAssignedTo(schedule: Schedule, date: string, shiftTypeId: string, staffIds: string[]): string[] {
  return staffIds.filter((id) => getAssignment(schedule, id, date)?.shiftTypeId === shiftTypeId);
}

export function isWorkingShift(shiftType: ShiftType | undefined): boolean {
  return !!shiftType && !shiftType.isTimeOff;
}

/** 既存の割当にincomingをマージする。ロック済みのセルは上書きしない(自動作成・前月コピー・一括反映で共通の規則) */
export function mergeAssignments(
  existing: Record<string, Assignment>,
  incoming: Assignment[],
): Record<string, Assignment> {
  const merged = { ...existing };
  for (const a of incoming) {
    const key = assignmentKey(a.staffId, a.date);
    if (merged[key]?.locked) continue;
    merged[key] = a;
  }
  return merged;
}
