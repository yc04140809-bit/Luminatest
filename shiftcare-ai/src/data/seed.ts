import type {
  AppData,
  Assignment,
  FacilityMode,
  PairRule,
  Schedule,
  Staff,
  StaffAvailability,
  SupportPairRule,
} from '../types/domain';
import {
  DEFAULT_FACILITY_RULES,
  DEFAULT_JOB_ROLES,
  DEFAULT_QUALIFICATIONS,
  DEFAULT_SHIFT_TYPES,
} from './defaults';
import { currentYearMonth, getDateKeysInMonth, toDateKey } from '../utils/date';
import { generateId } from '../utils/id';

function availability(overrides: Partial<StaffAvailability> = {}): StaffAvailability {
  return {
    canWorkNight: true,
    maxNightShiftsPerMonth: 6,
    maxShiftsPerWeek: null,
    targetShiftsPerMonth: 20,
    restrictedWeekdays: [],
    availableTimeNote: '',
    ...overrides,
  };
}

interface StaffTemplate {
  fullName: string;
  displayName: string;
  jobRoleIds: string[];
  employmentType: Staff['employmentType'];
  qualificationIds: string[];
  availability: StaffAvailability;
  isNightSpecialist?: boolean;
  note?: string;
  color: string;
}

function careStaffTemplates(): StaffTemplate[] {
  return [
    {
      fullName: '田中 花子',
      displayName: '田中',
      jobRoleIds: ['role_kaigofukushi'],
      employmentType: '常勤',
      qualificationIds: ['qual_kaigofukushi'],
      availability: availability(),
      color: '#f472b6',
    },
    {
      fullName: '山田 誠',
      displayName: '山田',
      jobRoleIds: ['role_kaigofukushi'],
      employmentType: '常勤',
      qualificationIds: ['qual_kaigofukushi'],
      availability: availability({ maxNightShiftsPerMonth: 10, targetShiftsPerMonth: 22 }),
      isNightSpecialist: true,
      note: '夜勤専従',
      color: '#6366f1',
    },
    {
      fullName: '佐藤 恵子',
      displayName: '佐藤',
      jobRoleIds: ['role_jitsumusha'],
      employmentType: '常勤',
      qualificationIds: ['qual_jitsumusha'],
      availability: availability(),
      color: '#22c55e',
    },
    {
      fullName: '鈴木 一郎',
      displayName: '鈴木',
      jobRoleIds: ['role_shonin'],
      employmentType: '非常勤',
      qualificationIds: ['qual_shonin'],
      availability: availability({ canWorkNight: false, maxNightShiftsPerMonth: 0, targetShiftsPerMonth: 14 }),
      color: '#f59e0b',
    },
    {
      fullName: '高橋 直人',
      displayName: '高橋(新)',
      jobRoleIds: ['role_mushikaku'],
      employmentType: '常勤',
      qualificationIds: [],
      availability: availability({ canWorkNight: false, maxNightShiftsPerMonth: 0 }),
      note: '入職2ヶ月目の新人。単独夜勤不可。',
      color: '#0ea5e9',
    },
    {
      fullName: '伊藤 まゆみ',
      displayName: '伊藤',
      jobRoleIds: ['role_kaigofukushi'],
      employmentType: '常勤',
      qualificationIds: ['qual_kaigofukushi'],
      availability: availability(),
      note: 'ベテラン。新人指導担当。',
      color: '#14b8a6',
    },
    {
      fullName: '渡辺 さくら',
      displayName: '渡辺',
      jobRoleIds: ['role_mushikaku'],
      employmentType: 'パート',
      qualificationIds: [],
      availability: availability({
        canWorkNight: false,
        maxNightShiftsPerMonth: 0,
        restrictedWeekdays: [0, 6],
        targetShiftsPerMonth: 10,
        availableTimeNote: '土日不可・平日9-16時のみ',
      }),
      color: '#a855f7',
    },
    {
      fullName: '中村 陽子',
      displayName: '中村',
      jobRoleIds: ['role_caremane'],
      employmentType: '常勤',
      qualificationIds: ['qual_caremane', 'qual_kaigofukushi'],
      availability: availability({ canWorkNight: false, maxNightShiftsPerMonth: 0 }),
      note: '日勤中心。ケアプラン業務あり。',
      color: '#84cc16',
    },
    {
      fullName: '小林 健太',
      displayName: '小林(管)',
      jobRoleIds: ['role_kanri_care'],
      employmentType: '常勤',
      qualificationIds: ['qual_kaigofukushi'],
      availability: availability({ targetShiftsPerMonth: 18 }),
      color: '#ef4444',
    },
    {
      fullName: '加藤 悠斗',
      displayName: '加藤',
      jobRoleIds: ['role_kaigofukushi'],
      employmentType: '常勤',
      qualificationIds: ['qual_kaigofukushi'],
      availability: availability({ maxNightShiftsPerMonth: 7 }),
      color: '#f97316',
    },
  ];
}

function nursingStaffTemplates(): StaffTemplate[] {
  return [
    {
      fullName: '田中 花子',
      displayName: '田中',
      jobRoleIds: ['role_kangoshi'],
      employmentType: '常勤',
      qualificationIds: ['qual_kangoshi'],
      availability: availability(),
      color: '#f472b6',
    },
    {
      fullName: '山田 誠',
      displayName: '山田',
      jobRoleIds: ['role_kangoshi'],
      employmentType: '常勤',
      qualificationIds: ['qual_kangoshi'],
      availability: availability({ maxNightShiftsPerMonth: 10, targetShiftsPerMonth: 22 }),
      isNightSpecialist: true,
      note: '夜勤専従',
      color: '#6366f1',
    },
    {
      fullName: '佐藤 恵子',
      displayName: '佐藤',
      jobRoleIds: ['role_junkangoshi'],
      employmentType: '常勤',
      qualificationIds: ['qual_junkangoshi'],
      availability: availability(),
      color: '#22c55e',
    },
    {
      fullName: '鈴木 一郎',
      displayName: '鈴木',
      jobRoleIds: ['role_kangojoshu'],
      employmentType: '非常勤',
      qualificationIds: [],
      availability: availability({ canWorkNight: false, maxNightShiftsPerMonth: 0, targetShiftsPerMonth: 14 }),
      color: '#f59e0b',
    },
    {
      fullName: '高橋 直人',
      displayName: '高橋(新)',
      jobRoleIds: ['role_kangoshi'],
      employmentType: '常勤',
      qualificationIds: ['qual_kangoshi'],
      availability: availability({ canWorkNight: false, maxNightShiftsPerMonth: 0 }),
      note: '新人看護師。単独夜勤不可。',
      color: '#0ea5e9',
    },
    {
      fullName: '伊藤 まゆみ',
      displayName: '伊藤',
      jobRoleIds: ['role_kangoshi'],
      employmentType: '常勤',
      qualificationIds: ['qual_kangoshi'],
      availability: availability(),
      note: 'ベテラン看護師。新人指導担当。',
      color: '#14b8a6',
    },
    {
      fullName: '渡辺 さくら',
      displayName: '渡辺',
      jobRoleIds: ['role_kangojoshu'],
      employmentType: 'パート',
      qualificationIds: [],
      availability: availability({
        canWorkNight: false,
        maxNightShiftsPerMonth: 0,
        restrictedWeekdays: [0, 6],
        targetShiftsPerMonth: 10,
        availableTimeNote: '土日不可・平日9-16時のみ',
      }),
      color: '#a855f7',
    },
    {
      fullName: '中村 陽子',
      displayName: '中村',
      jobRoleIds: ['role_junkangoshi'],
      employmentType: '常勤',
      qualificationIds: ['qual_junkangoshi'],
      availability: availability({ canWorkNight: false, maxNightShiftsPerMonth: 0 }),
      color: '#84cc16',
    },
    {
      fullName: '小林 健太',
      displayName: '小林(管)',
      jobRoleIds: ['role_kanri_nursing'],
      employmentType: '常勤',
      qualificationIds: ['qual_kangoshi'],
      availability: availability({ targetShiftsPerMonth: 18 }),
      color: '#ef4444',
    },
    {
      fullName: '加藤 悠斗',
      displayName: '加藤',
      jobRoleIds: ['role_kangoshi'],
      employmentType: '常勤',
      qualificationIds: ['qual_kangoshi'],
      availability: availability({ maxNightShiftsPerMonth: 7 }),
      color: '#f97316',
    },
  ];
}

function buildStaff(templates: StaffTemplate[]): Staff[] {
  const now = new Date().toISOString();
  return templates.map((t) => ({
    id: generateId('staff'),
    fullName: t.fullName,
    displayName: t.displayName,
    jobRoleIds: t.jobRoleIds,
    employmentType: t.employmentType,
    qualificationIds: t.qualificationIds,
    availability: t.availability,
    desiredOffDates: [],
    desiredPaidLeaveDates: [],
    unavailableDates: [],
    desiredWorkDates: {},
    note: t.note ?? '',
    active: true,
    isNightSpecialist: !!t.isNightSpecialist,
    color: t.color,
    createdAt: now,
    updatedAt: now,
  }));
}

/** デモ用のサンプルシフト・希望休・組み合わせルールを含む初期データを生成する */
export function createSeedData(mode: FacilityMode, facilityName: string): AppData {
  const templates = mode === 'care' ? careStaffTemplates() : nursingStaffTemplates();
  const staff = buildStaff(templates);
  const [
    tanaka, yamada, sato, suzuki, takahashi, ito, watanabe, nakamura, kobayashi, kato,
  ] = staff;

  const yearMonth = currentYearMonth();
  const dateKeys = getDateKeysInMonth(yearMonth);

  // 希望休を数件登録(意図的に競合を発生させる)
  if (dateKeys.length >= 12) {
    tanaka.desiredOffDates = [dateKeys[11]]; // 12日
  }
  if (dateKeys.length >= 20) {
    sato.desiredOffDates = [dateKeys[19]];
  }
  // 希望休が重なりやすい日のサンプル(希望集中デモ用)
  if (dateKeys.length >= 16) {
    const congestedDate = dateKeys[15];
    for (const s of [yamada, ito, nakamura, kobayashi]) {
      s.desiredOffDates = [...s.desiredOffDates, congestedDate];
    }
  }
  // 有休希望・勤務不可日のサンプル
  if (dateKeys.length >= 9) {
    kato.desiredPaidLeaveDates = [dateKeys[8]];
  }
  if (dateKeys.length >= 25) {
    takahashi.unavailableDates = [dateKeys[24]]; // 通院等でピンポイント勤務不可
  }

  const qualCareId = mode === 'care' ? 'qual_kaigofukushi' : 'qual_kangoshi';
  const nightShiftId = 'st_yakin';
  const dayShiftId = 'st_nikkin';
  const earlyShiftId = 'st_hayaban';
  const lateShiftId = 'st_osoban';
  const offId = 'st_yasumi';
  const desiredOffShiftId = 'st_kiboyasumi';

  const assignments: Record<string, Assignment> = {};
  const setAssign = (s: Staff, date: string, shiftTypeId: string | null, locked = false) => {
    assignments[`${s.id}__${date}`] = { staffId: s.id, date, shiftTypeId, locked };
  };

  // ベースとなる簡易ローテーションを最初の3週間程度だけ入れておき、
  // 残りは空欄(自動補完のデモ用)にする。
  const rotation: { staff: Staff; pattern: (string | null)[] }[] = [
    { staff: tanaka, pattern: [dayShiftId, earlyShiftId, offId] },
    { staff: yamada, pattern: [nightShiftId, 'st_yakinake', offId] },
    { staff: sato, pattern: [earlyShiftId, dayShiftId, lateShiftId, offId] },
    { staff: suzuki, pattern: [dayShiftId, offId] },
    { staff: takahashi, pattern: [dayShiftId, earlyShiftId, offId] },
    { staff: ito, pattern: [lateShiftId, nightShiftId, 'st_yakinake', offId] },
    { staff: watanabe, pattern: [dayShiftId, offId, offId] },
    { staff: nakamura, pattern: [dayShiftId, offId] },
    { staff: kobayashi, pattern: [earlyShiftId, dayShiftId, offId] },
    { staff: kato, pattern: [nightShiftId, 'st_yakinake', offId, offId] },
  ];

  const partialDays = Math.min(21, dateKeys.length);
  for (const { staff: s, pattern } of rotation) {
    for (let i = 0; i < partialDays; i++) {
      const date = dateKeys[i];
      if (s.desiredOffDates.includes(date)) {
        setAssign(s, date, desiredOffShiftId, true);
        continue;
      }
      const shift = pattern[i % pattern.length];
      setAssign(s, date, shift, false);
    }
  }

  // 意図的な問題サンプルを仕込む
  // 1) 希望休なのに勤務が入っているケース(田中さん 12日)
  if (dateKeys.length >= 12) {
    setAssign(tanaka, dateKeys[11], dayShiftId, false);
  }
  // 2) 夜勤の人数不足(6日目の夜勤を1人にする)
  if (dateKeys.length >= 6) {
    setAssign(yamada, dateKeys[5], nightShiftId, false);
    setAssign(ito, dateKeys[5], offId, false);
  }
  // 3) 連勤過多サンプル(鈴木さんを6連勤にする)
  if (dateKeys.length >= 6) {
    for (let i = 0; i < 6; i++) {
      setAssign(suzuki, dateKeys[i], dayShiftId, false);
    }
  }
  // 4) 資格者不足サンプル(9日目の日勤から資格者を外す)
  if (dateKeys.length >= 9) {
    setAssign(nakamura, dateKeys[8], offId, false);
    setAssign(kobayashi, dateKeys[8], offId, false);
  }

  const schedule: Schedule = { yearMonth, assignments, status: 'draft', publishedAt: null };

  const pairRules: PairRule[] = [
    {
      id: generateId('pair'),
      staffIdA: suzuki.id,
      staffIdB: watanabe.id,
      level: 2,
      reason: '',
      active: true,
    },
    {
      id: generateId('pair'),
      staffIdA: takahashi.id,
      staffIdB: kobayashi.id,
      level: 1,
      reason: '',
      active: true,
    },
  ];

  const supportPairRules: SupportPairRule[] = [
    {
      id: generateId('support'),
      targetStaffId: takahashi.id,
      supporterStaffIds: [ito.id, yamada.id, kobayashi.id],
      purpose: '新人教育・OJT',
      active: true,
    },
  ];

  const dateOverridesEmpty: Record<string, number> = {};

  return {
    version: 1,
    facility: {
      facilityName,
      mode,
      onboardingCompleted: true,
    },
    jobRoles: DEFAULT_JOB_ROLES,
    qualifications: DEFAULT_QUALIFICATIONS,
    staff,
    shiftTypes: DEFAULT_SHIFT_TYPES,
    qualificationRequirements: [
      {
        id: generateId('qreq'),
        shiftTypeId: nightShiftId,
        qualificationId: qualCareId,
        minCount: 1,
      },
      {
        id: generateId('qreq'),
        shiftTypeId: dayShiftId,
        qualificationId: qualCareId,
        minCount: 1,
      },
    ],
    shiftRequirements: [
      { id: generateId('req'), shiftTypeId: earlyShiftId, defaultMinCount: 2, overrides: dateOverridesEmpty },
      { id: generateId('req'), shiftTypeId: dayShiftId, defaultMinCount: 3, overrides: {} },
      { id: generateId('req'), shiftTypeId: lateShiftId, defaultMinCount: 2, overrides: {} },
      { id: generateId('req'), shiftTypeId: nightShiftId, defaultMinCount: 2, overrides: {} },
    ],
    pairRules,
    supportPairRules,
    facilityRules: DEFAULT_FACILITY_RULES,
    dayNotes: [
      {
        id: generateId('note'),
        staffId: takahashi.id,
        date: dateKeys[2] ?? toDateKey(2024, 1, 3),
        text: '新人同行研修',
      },
    ],
    schedules: { [yearMonth]: schedule },
    feedbackResponses: [],
  };
}

export function createEmptyData(mode: FacilityMode, facilityName: string, onboardingCompleted = false): AppData {
  const yearMonth = currentYearMonth();
  return {
    version: 1,
    facility: { facilityName, mode, onboardingCompleted },
    jobRoles: DEFAULT_JOB_ROLES,
    qualifications: DEFAULT_QUALIFICATIONS,
    staff: [],
    shiftTypes: DEFAULT_SHIFT_TYPES,
    qualificationRequirements: [],
    shiftRequirements: [
      { id: generateId('req'), shiftTypeId: 'st_hayaban', defaultMinCount: 1, overrides: {} },
      { id: generateId('req'), shiftTypeId: 'st_nikkin', defaultMinCount: 1, overrides: {} },
      { id: generateId('req'), shiftTypeId: 'st_osoban', defaultMinCount: 1, overrides: {} },
      { id: generateId('req'), shiftTypeId: 'st_yakin', defaultMinCount: 1, overrides: {} },
    ],
    pairRules: [],
    supportPairRules: [],
    facilityRules: DEFAULT_FACILITY_RULES,
    dayNotes: [],
    schedules: { [yearMonth]: { yearMonth, assignments: {}, status: 'draft', publishedAt: null } },
    feedbackResponses: [],
  };
}
