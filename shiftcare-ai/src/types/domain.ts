// ShiftCare AI — ドメイン型定義
// 将来の権限管理・DB移行(Supabase/Postgres等)を見据え、ID参照ベースの正規化した構造にする。

export type FacilityMode = 'care' | 'nursing';

export type Severity = 'error' | 'warning' | 'suggestion';

/** 職種。介護・看護モードでプリセットが変わるが、自由追加も可能。 */
export interface JobRole {
  id: string;
  name: string;
  mode: FacilityMode | 'both';
  isPreset?: boolean;
}

/** 保有資格。職種と分離し、複数資格を持てるようにする。 */
export interface Qualification {
  id: string;
  name: string;
  mode: FacilityMode | 'both';
  isPreset?: boolean;
}

export type EmploymentType = '常勤' | '非常勤' | 'パート' | '派遣' | 'その他';

export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** スタッフごとの勤務可否設定 (StaffAvailability) */
export interface StaffAvailability {
  /** 夜勤可能か */
  canWorkNight: boolean;
  /** 夜勤回数上限(月)。null=上限なし */
  maxNightShiftsPerMonth: number | null;
  /** 週あたり勤務回数上限。null=上限なし */
  maxShiftsPerWeek: number | null;
  /** 月あたり勤務回数目安。null=指定なし */
  targetShiftsPerMonth: number | null;
  /** 勤務不可の曜日 (0=日 ... 6=土) */
  restrictedWeekdays: WeekdayIndex[];
  /** 勤務可能時間帯の自由記述(例: 9:00-17:00のみ可) */
  availableTimeNote: string;
}

export interface Staff {
  id: string;
  fullName: string;
  displayName: string;
  jobRoleIds: string[];
  employmentType: EmploymentType;
  qualificationIds: string[];
  availability: StaffAvailability;
  /** 希望休 (YYYY-MM-DD の配列) */
  desiredOffDates: string[];
  /** 有休希望 (YYYY-MM-DD の配列)。希望休と違い、有休消化を意図している */
  desiredPaidLeaveDates: string[];
  /** 勤務不可日 (YYYY-MM-DD の配列)。曜日制限と違い特定日をピンポイントで指定する強い制約 */
  unavailableDates: string[];
  /** 希望勤務 (日付 -> 希望する勤務種別ID。夜勤希望もここで対象勤務種別を夜勤にして表現する) */
  desiredWorkDates: Record<string, string>;
  note: string;
  active: boolean;
  /** 夜勤専従スタッフ(公平性判定から除外可能) */
  isNightSpecialist: boolean;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

/** 勤務種別 (ShiftType)。デフォルト+自由追加。 */
export interface ShiftType {
  id: string;
  name: string;
  shortLabel: string;
  /** 休み系(休み/有休/希望休)など、勤務時間を持たない種別かどうか */
  isTimeOff: boolean;
  /** 夜勤として扱うか(夜勤関連ルールの対象になる) */
  isNightShift: boolean;
  /** "夜勤明け"のように前日夜勤の翌日に強制されるような種別か */
  isNightShiftFollowUp: boolean;
  startTime: string | null; // "HH:mm"
  endTime: string | null; // "HH:mm" (日をまたぐ場合は翌日扱い)
  color: string; // hex
  isPreset?: boolean;
  sortOrder: number;
}

/** 勤務帯ごとの資格配置ルール */
export interface QualificationRequirement {
  id: string;
  shiftTypeId: string;
  qualificationId: string;
  minCount: number;
}

/** 勤務種別ごとの必要人数(日別上書き可) */
export interface ShiftRequirement {
  id: string;
  shiftTypeId: string;
  /** 既定の最低人数 */
  defaultMinCount: number;
  /** 日付(YYYY-MM-DD) -> 上書き人数 */
  overrides: Record<string, number>;
}

export type PairAvoidLevel = 1 | 2 | 3;

/** 組み合わせ回避ルール */
export interface PairRule {
  id: string;
  staffIdA: string;
  staffIdB: string;
  level: PairAvoidLevel;
  /** 理由(管理者のみ閲覧) */
  reason: string;
  active: boolean;
}

/** 配置サポートルール(組み合わせ必須) */
export interface SupportPairRule {
  id: string;
  /** サポートが必要なスタッフ */
  targetStaffId: string;
  /** このうち最低1人が同勤務にいる必要がある */
  supporterStaffIds: string[];
  purpose: string;
  active: boolean;
}

/** 施設全体の勤務ルール(ON/OFF・数値は施設ごとに変更可能) */
export interface FacilityRules {
  maxConsecutiveDaysEnabled: boolean;
  maxConsecutiveDays: number;

  nightShiftLimitEnabled: boolean;
  // (Staff.availability.maxNightShiftsPerMonthで個別上限、こちらは全体ルールON/OFF)

  nightShiftConsecutiveEnabled: boolean;
  maxConsecutiveNightShifts: number;

  nightShiftNextDayRestrictionEnabled: boolean;
  /** 夜勤翌日に許可しない勤務種別ID一覧(空なら休み以外全部制限のような使い方も可) */
  nightShiftNextDayForbiddenShiftTypeIds: string[];

  nightShiftFollowUpRestrictionEnabled: boolean;
  /** 夜勤明け翌日に許可しない勤務種別ID一覧 */
  nightShiftFollowUpForbiddenShiftTypeIds: string[];

  nightShiftIntervalEnabled: boolean;
  /** 夜勤と次の夜勤の間に空けるべき最低日数 */
  minNightShiftIntervalDays: number;

  nightShiftRestrictedToEligibleEnabled: boolean;

  restIntervalEnabled: boolean;
  /** 勤務終了から次の勤務開始までの最低休息時間(h) */
  minRestHours: number;

  fairnessCheckEnabled: boolean;
  /** 公平性チェックの許容偏差(回) */
  fairnessToleranceCount: number;
}

/** 管理者メモ(スタッフ×日) */
export interface DayNote {
  id: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  text: string;
}

/** 1マスの勤務割当 */
export interface Assignment {
  staffId: string;
  date: string; // YYYY-MM-DD
  shiftTypeId: string | null;
  locked: boolean;
}

/** 月間シフト(施設×年月 に対して1つ) */
/** 公開ステータス。draft=作成中、review=確認待ち、published=スタッフへ公開済み */
export type ScheduleStatus = 'draft' | 'review' | 'published';

export interface Schedule {
  yearMonth: string; // "YYYY-MM"
  /** key: `${staffId}__${date}` */
  assignments: Record<string, Assignment>;
  status: ScheduleStatus;
  publishedAt: string | null;
}

/** 自動作成前の成立チェック結果 */
export interface FeasibilityIssue {
  id: string;
  date: string;
  shiftTypeId: string;
  requiredCount: number;
  eligibleCount: number;
  message: string;
}

export interface ValidationSuggestion {
  id: string;
  label: string;
  /** クリック適用用: 実行内容 */
  action:
    | { type: 'assign'; staffId: string; date: string; shiftTypeId: string }
    | { type: 'swap'; staffIdA: string; dateA: string; staffIdB: string; dateB: string };
}

export interface ValidationIssue {
  id: string;
  severity: Severity;
  date: string | null;
  staffId: string | null;
  staffIdB?: string | null;
  ruleType: string;
  message: string;
  detail?: string;
  suggestions: ValidationSuggestion[];
}

export type FairnessLevel = '偏り小' | '偏りあり' | '要確認';

export interface FairnessResult {
  staffId: string;
  nightCount: number;
  saturdayCount: number;
  sundayCount: number;
  holidayCount: number;
  desiredOffUnmet: number;
  maxConsecutive: number;
  level: FairnessLevel;
  notes: string[];
}

/** 施設全体設定 */
export interface FacilitySettings {
  facilityName: string;
  mode: FacilityMode;
  onboardingCompleted: boolean;
}

/** アプリ全体のデータ(将来: サーバDBのテーブル群に相当) */
export interface AppData {
  version: number;
  facility: FacilitySettings;
  jobRoles: JobRole[];
  qualifications: Qualification[];
  staff: Staff[];
  shiftTypes: ShiftType[];
  qualificationRequirements: QualificationRequirement[];
  shiftRequirements: ShiftRequirement[];
  pairRules: PairRule[];
  supportPairRules: SupportPairRule[];
  facilityRules: FacilityRules;
  dayNotes: DayNote[];
  schedules: Record<string, Schedule>; // key: yearMonth
}
