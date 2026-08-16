import { useMemo } from 'react';
import { useAppStore } from '../../store/AppStore';
import { computeFairness } from '../../engine/fairness';
import { getDateKeysInMonth, getWeekdayIndex, isJapaneseHoliday, formatYearMonthLabel } from '../../utils/date';
import { Badge } from '../ui/Badge';
import { Card, CardBody } from '../ui/Card';
import type { FairnessLevel } from '../../types/domain';

const FAIRNESS_COLOR: Record<FairnessLevel, 'teal' | 'amber' | 'rose'> = {
  '偏り小': 'teal',
  '偏りあり': 'amber',
  '要確認': 'rose',
};

export function ReportsPage({ yearMonth }: { yearMonth: string }) {
  const { state } = useAppStore();
  const { data } = state;
  const activeStaff = data.staff.filter((s) => s.active);
  const dateKeys = useMemo(() => getDateKeysInMonth(yearMonth), [yearMonth]);
  const schedule = data.schedules[yearMonth];
  const workingShiftTypes = [...data.shiftTypes].filter((s) => !s.isTimeOff).sort((a, b) => a.sortOrder - b.sortOrder);
  const timeOffShiftTypes = [...data.shiftTypes].filter((s) => s.isTimeOff).sort((a, b) => a.sortOrder - b.sortOrder);

  const fairness = useMemo(() => computeFairness(data, yearMonth), [data, yearMonth]);

  const rows = activeStaff.map((staff) => {
    const perShiftType: Record<string, number> = {};
    let workedDays = 0;
    let saturday = 0;
    let sunday = 0;
    let holiday = 0;

    for (const date of dateKeys) {
      const shiftTypeId = schedule?.assignments[`${staff.id}__${date}`]?.shiftTypeId;
      if (!shiftTypeId) continue;
      perShiftType[shiftTypeId] = (perShiftType[shiftTypeId] ?? 0) + 1;
      const st = data.shiftTypes.find((s) => s.id === shiftTypeId);
      if (st && !st.isTimeOff) {
        workedDays++;
        const wd = getWeekdayIndex(date);
        if (wd === 6) saturday++;
        if (wd === 0) sunday++;
        if (isJapaneseHoliday(date)) holiday++;
      }
    }

    const fairnessResult = fairness.find((f) => f.staffId === staff.id);

    return { staff, perShiftType, workedDays, saturday, sunday, holiday, fairnessResult };
  });

  const nightFairnessTargets = rows.filter((r) => !r.staff.isNightSpecialist && r.staff.availability.canWorkNight);
  const nightAverage =
    nightFairnessTargets.length === 0
      ? 0
      : nightFairnessTargets.reduce((sum, r) => sum + (r.fairnessResult?.nightCount ?? 0), 0) / nightFairnessTargets.length;
  const nightMax = Math.max(1, ...nightFairnessTargets.map((r) => r.fairnessResult?.nightCount ?? 0));

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-800">月次集計</h1>
        <p className="text-sm text-slate-400 mt-0.5">{formatYearMonthLabel(yearMonth)}のスタッフ別集計・公平性チェック</p>
      </div>

      {nightFairnessTargets.length > 0 && (
        <Card className="mb-4">
          <CardBody>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-700">公平性一覧(夜勤回数)</h2>
              <span className="text-xs text-slate-400">平均 {nightAverage.toFixed(1)}回(夜勤専従・夜勤不可を除く)</span>
            </div>
            <div className="space-y-2">
              {nightFairnessTargets
                .slice()
                .sort((a, b) => (b.fairnessResult?.nightCount ?? 0) - (a.fairnessResult?.nightCount ?? 0))
                .map((r) => {
                  const count = r.fairnessResult?.nightCount ?? 0;
                  const pct = Math.round((count / nightMax) * 100);
                  const overAverage = count - nightAverage > (data.facilityRules.fairnessToleranceCount ?? 2);
                  return (
                    <div key={r.staff.id} className="flex items-center gap-3">
                      <span className="w-14 text-xs font-medium text-slate-600 shrink-0 truncate">{r.staff.displayName}</span>
                      <div className="flex-1 h-4 rounded-full bg-slate-100 overflow-hidden relative">
                        <div
                          className={`h-full rounded-full transition-all ${overAverage ? 'bg-amber-500' : 'bg-teal-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                        <div
                          className="absolute top-0 bottom-0 w-px bg-slate-400"
                          style={{ left: `${Math.min(100, (nightAverage / nightMax) * 100)}%` }}
                          title={`平均 ${nightAverage.toFixed(1)}回`}
                        />
                      </div>
                      <span className={`w-10 text-xs font-bold text-right shrink-0 ${overAverage ? 'text-amber-600' : 'text-slate-600'}`}>{count}回</span>
                    </div>
                  );
                })}
            </div>
            <p className="text-[11px] text-slate-400 mt-3">縦線は全体平均を示します。平均より一定回数以上多いスタッフはオレンジ表示され、下の一覧に理由が表示されます。</p>
          </CardBody>
        </Card>
      )}

      {activeStaff.length === 0 ? (
        <div className="text-center text-slate-400 py-20 bg-white rounded-2xl border border-slate-200">集計するデータがありません。</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="border-collapse w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="sticky left-0 z-10 bg-slate-50 border-b border-r border-slate-200 px-3 py-2.5 text-left font-bold text-slate-500 min-w-[100px]">スタッフ</th>
                  <th className="border-b border-slate-200 px-2 py-2.5 font-bold text-slate-500 min-w-[64px]">勤務日数</th>
                  {workingShiftTypes.map((st) => (
                    <th key={st.id} className="border-b border-slate-200 px-2 py-2.5 font-bold text-slate-500 min-w-[52px]">{st.shortLabel}</th>
                  ))}
                  {timeOffShiftTypes.map((st) => (
                    <th key={st.id} className="border-b border-slate-200 px-2 py-2.5 font-bold text-slate-500 min-w-[52px]">{st.name}</th>
                  ))}
                  <th className="border-b border-slate-200 px-2 py-2.5 font-bold text-slate-500 min-w-[52px]">土曜</th>
                  <th className="border-b border-slate-200 px-2 py-2.5 font-bold text-slate-500 min-w-[52px]">日曜</th>
                  <th className="border-b border-slate-200 px-2 py-2.5 font-bold text-slate-500 min-w-[52px]">祝日</th>
                  <th className="border-b border-slate-200 px-2 py-2.5 font-bold text-slate-500 min-w-[110px]">負担バランス</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ staff, perShiftType, workedDays, saturday, sunday, holiday, fairnessResult }) => (
                  <tr key={staff.id} className="even:bg-slate-50/40">
                    <td className="sticky left-0 z-10 bg-white even:bg-slate-50/40 border-r border-b border-slate-100 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{ backgroundColor: staff.color }}>
                          {staff.displayName.slice(0, 1)}
                        </span>
                        <span className="font-medium text-slate-700">{staff.displayName}</span>
                      </div>
                    </td>
                    <td className="border-b border-slate-100 px-2 py-2 text-center font-bold text-slate-700">{workedDays}</td>
                    {workingShiftTypes.map((st) => (
                      <td key={st.id} className="border-b border-slate-100 px-2 py-2 text-center text-slate-600">{perShiftType[st.id] ?? 0}</td>
                    ))}
                    {timeOffShiftTypes.map((st) => (
                      <td key={st.id} className="border-b border-slate-100 px-2 py-2 text-center text-slate-600">{perShiftType[st.id] ?? 0}</td>
                    ))}
                    <td className="border-b border-slate-100 px-2 py-2 text-center text-slate-600">{saturday}</td>
                    <td className="border-b border-slate-100 px-2 py-2 text-center text-slate-600">{sunday}</td>
                    <td className="border-b border-slate-100 px-2 py-2 text-center text-slate-600">{holiday}</td>
                    <td className="border-b border-slate-100 px-2 py-2 text-center">
                      {fairnessResult && (
                        <div title={fairnessResult.notes.join('・')}>
                          <Badge color={FAIRNESS_COLOR[fairnessResult.level]}>{fairnessResult.level}</Badge>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {rows
          .filter((r) => r.fairnessResult && r.fairnessResult.notes.length > 0)
          .map((r) => (
            <div key={r.staff.id} className="text-xs text-slate-500 bg-white rounded-xl border border-slate-200 px-3 py-2">
              <span className="font-semibold text-slate-700">{r.staff.displayName}さん：</span>
              {r.fairnessResult!.notes.join('・')}
            </div>
          ))}
      </div>
    </div>
  );
}
