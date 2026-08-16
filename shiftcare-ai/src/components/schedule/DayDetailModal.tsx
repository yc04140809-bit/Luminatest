import { useAppStore } from '../../store/AppStore';
import { Modal } from '../ui/Modal';
import { getWeekdayLabel } from '../../utils/date';
import { getAssignment } from '../../engine/scheduleHelpers';

export function DayDetailModal({
  open,
  onClose,
  yearMonth,
  date,
}: {
  open: boolean;
  onClose: () => void;
  yearMonth: string;
  date: string | null;
}) {
  const { state } = useAppStore();
  const { data } = state;
  const schedule = data.schedules[yearMonth] ?? { yearMonth, assignments: {}, status: 'draft' as const, publishedAt: null };

  if (!open || !date) return null;

  const activeStaff = data.staff.filter((s) => s.active);
  const workingShiftTypes = [...data.shiftTypes].filter((s) => !s.isTimeOff).sort((a, b) => a.sortOrder - b.sortOrder);

  const rows = workingShiftTypes.map((st) => {
    const assignedStaff = activeStaff.filter((s) => getAssignment(schedule, s.id, date)?.shiftTypeId === st.id);
    const req = data.shiftRequirements.find((r) => r.shiftTypeId === st.id);
    const required = req ? (req.overrides[date] ?? req.defaultMinCount) : 0;
    const current = assignedStaff.length;
    const diff = current - required;

    const qualReqs = data.qualificationRequirements.filter((q) => q.shiftTypeId === st.id);
    const qualStatus = qualReqs.map((qreq) => {
      const qualification = data.qualifications.find((q) => q.id === qreq.qualificationId);
      const holders = assignedStaff.filter((s) => s.qualificationIds.includes(qreq.qualificationId)).length;
      return { name: qualification?.name ?? '?', required: qreq.minCount, current: holders };
    });

    return { shiftType: st, assignedStaff, required, current, diff, qualStatus };
  });

  return (
    <Modal open={open} onClose={onClose} title={`${Number(date.split('-')[2])}日(${getWeekdayLabel(date)})の人員状況`} wide>
      <div className="space-y-4">
        {rows.map(({ shiftType, assignedStaff, required, current, diff, qualStatus }) => {
          const barColor = diff < 0 ? 'bg-rose-500' : diff === 0 ? 'bg-teal-500' : 'bg-sky-500';
          const pct = required > 0 ? Math.min(100, Math.round((current / required) * 100)) : current > 0 ? 100 : 0;
          const diffLabel = diff === 0 ? 'OK' : diff > 0 ? `+${diff}` : `${diff}`;
          const diffColor = diff < 0 ? 'text-rose-600' : diff === 0 ? 'text-teal-600' : 'text-sky-600';
          return (
            <div key={shiftType.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: shiftType.color }}>
                    {shiftType.shortLabel}
                  </span>
                  {shiftType.name}
                </span>
                <span className="text-sm text-slate-500">
                  必要 {required} ／ 現在 <span className="font-bold text-slate-700">{current}</span>
                  <span className={`ml-2 font-bold ${diffColor}`}>{diffLabel}</span>
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
              </div>
              {assignedStaff.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {assignedStaff.map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-1 text-xs bg-slate-50 border border-slate-200 rounded-full pl-1 pr-2 py-0.5">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: s.color }}>
                        {s.displayName.slice(0, 1)}
                      </span>
                      {s.displayName}
                    </span>
                  ))}
                </div>
              )}
              {qualStatus.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {qualStatus.map((q) => (
                    <span
                      key={q.name}
                      className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                        q.current < q.required ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {q.name} {q.current}/{q.required}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {rows.length === 0 && <div className="text-center text-slate-400 py-8 text-sm">必要人数が設定された勤務種別がありません。</div>}
      </div>
    </Modal>
  );
}
