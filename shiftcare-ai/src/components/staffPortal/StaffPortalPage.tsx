import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Info, Moon, CalendarOff, Plane, Ban, CalendarCheck } from 'lucide-react';
import { useAppStore } from '../../store/AppStore';
import { getCalendarWeeks, formatYearMonthLabel, getWeekdayIndex } from '../../utils/date';
import { WEEKDAYS } from '../../types/domain';
import { Select } from '../ui/Form';
import { Card, CardBody } from '../ui/Card';
import { RequestEditorModal } from './RequestEditorModal';

function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function StaffPortalPage({ yearMonth: initialYearMonth }: { yearMonth: string }) {
  const { state } = useAppStore();
  const activeStaff = state.data.staff.filter((s) => s.active);
  const [staffId, setStaffId] = useState(activeStaff[0]?.id ?? '');
  const [yearMonth, setYearMonth] = useState(initialYearMonth);
  const [editingDate, setEditingDate] = useState<string | null>(null);

  const staff = activeStaff.find((s) => s.id === staffId) ?? null;
  const weeks = useMemo(() => getCalendarWeeks(yearMonth), [yearMonth]);
  const schedule = state.data.schedules[yearMonth];
  const status = schedule?.status ?? 'draft';
  const nightShiftType = state.data.shiftTypes.find((s) => s.isNightShift);

  const totalRequiredByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const req of state.data.shiftRequirements) {
      for (const [date, count] of Object.entries(req.overrides)) {
        map.set(date, (map.get(date) ?? 0) + count);
      }
    }
    return map;
  }, [state.data.shiftRequirements]);

  function defaultRequiredForDate(date: string): number {
    if (totalRequiredByDate.has(date)) return totalRequiredByDate.get(date)!;
    return state.data.shiftRequirements.reduce((sum, r) => sum + r.defaultMinCount, 0);
  }

  function congestionForDate(date: string): { count: number; crowded: boolean } {
    const count = activeStaff.filter((s) => s.desiredOffDates.includes(date)).length;
    const required = defaultRequiredForDate(date);
    const crowded = count > 0 && activeStaff.length - count < required;
    return { count, crowded };
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-800">希望提出(スタッフ用画面プレビュー)</h1>
        <p className="text-sm text-slate-400 mt-0.5">スマホからログインなしで希望を提出できる、将来のスタッフ専用画面のプレビューです。</p>
      </div>

      <div className="bg-sky-50 border border-sky-100 rounded-xl px-3.5 py-2.5 mb-4 flex gap-2">
        <Info size={16} className="text-sky-500 shrink-0 mt-0.5" />
        <p className="text-xs text-sky-700 leading-relaxed">
          本番では各スタッフがログインして自分の画面のみ操作します。このMVPでは認証機能を省略しているため、下のプルダウンで「自分」を選んで動作を確認してください。
        </p>
      </div>

      <Card className="mb-4">
        <CardBody className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-600 shrink-0">あなたの名前</span>
          <Select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            {activeStaff.map((s) => (
              <option key={s.id} value={s.id}>{s.fullName}</option>
            ))}
          </Select>
        </CardBody>
      </Card>

      {!staff ? (
        <div className="text-center text-slate-400 py-16">スタッフが登録されていません。</div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setYearMonth(shiftMonth(yearMonth, -1))} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <ChevronLeft size={18} />
            </button>
            <span className="font-bold text-slate-700">{formatYearMonthLabel(yearMonth)}</span>
            <button onClick={() => setYearMonth(shiftMonth(yearMonth, 1))} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <ChevronRight size={18} />
            </button>
          </div>

          <p className="text-xs text-slate-400 mb-3">
            {status === 'published'
              ? 'このシフトは公開済みです。確定シフトの個人画面表示は今後追加予定です。'
              : 'このシフトはまだ公開されていません。希望はいつでも修正できます。'}
          </p>

          <div className="bg-white rounded-2xl border border-slate-200 p-2 sm:p-3">
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((w, i) => (
                <div key={w} className={`text-center text-[11px] font-bold py-1 ${i === 0 ? 'text-rose-400' : i === 6 ? 'text-sky-500' : 'text-slate-400'}`}>
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weeks.flatMap((week, wi) =>
                week.map((date, di) => {
                  if (!date) return <div key={`${wi}-${di}`} />;
                  const isOff = staff.desiredOffDates.includes(date);
                  const isPaidLeave = staff.desiredPaidLeaveDates.includes(date);
                  const isUnavailable = staff.unavailableDates.includes(date);
                  const workShiftId = staff.desiredWorkDates[date];
                  const isNightWish = workShiftId && workShiftId === nightShiftType?.id;
                  const { count, crowded } = congestionForDate(date);
                  const weekday = getWeekdayIndex(date);

                  return (
                    <button
                      key={date}
                      onClick={() => setEditingDate(date)}
                      className={`aspect-square rounded-lg border flex flex-col items-center justify-center gap-0.5 relative ${
                        isUnavailable
                          ? 'bg-rose-50 border-rose-200'
                          : isOff
                          ? 'bg-pink-50 border-pink-200'
                          : isPaidLeave
                          ? 'bg-amber-50 border-amber-200'
                          : isNightWish
                          ? 'bg-indigo-50 border-indigo-200'
                          : workShiftId
                          ? 'bg-teal-50 border-teal-200'
                          : 'bg-white border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`text-xs font-bold ${weekday === 0 ? 'text-rose-400' : weekday === 6 ? 'text-sky-500' : 'text-slate-600'}`}>
                        {Number(date.split('-')[2])}
                      </span>
                      {isUnavailable && <Ban size={11} className="text-rose-500" />}
                      {isOff && <CalendarOff size={11} className="text-pink-500" />}
                      {isPaidLeave && <Plane size={11} className="text-amber-500" />}
                      {isNightWish && <Moon size={11} className="text-indigo-500" />}
                      {workShiftId && !isNightWish && <CalendarCheck size={11} className="text-teal-500" />}
                      {count > 0 && (
                        <span className={`absolute -bottom-1 text-[9px] px-1 rounded-full font-bold ${crowded ? 'bg-amber-400 text-white' : 'text-slate-300'}`}>
                          {crowded ? `希望集中${count}` : count}
                        </span>
                      )}
                    </button>
                  );
                }),
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-4 text-xs text-slate-500">
            <Legend color="bg-pink-100 text-pink-600" icon={<CalendarOff size={12} />} label="希望休" />
            <Legend color="bg-amber-100 text-amber-600" icon={<Plane size={12} />} label="有休希望" />
            <Legend color="bg-indigo-100 text-indigo-600" icon={<Moon size={12} />} label="夜勤希望" />
            <Legend color="bg-teal-100 text-teal-600" icon={<CalendarCheck size={12} />} label="希望勤務" />
            <Legend color="bg-rose-100 text-rose-600" icon={<Ban size={12} />} label="勤務不可日" />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            日付の下の数字は、その日に希望休を出している人数です(誰が出しているかは表示されません)。「希望集中」は必要人数に対して休み希望が多いことを示します。
          </p>
        </>
      )}

      <RequestEditorModal open={!!editingDate} onClose={() => setEditingDate(null)} staff={staff} date={editingDate} />
    </div>
  );
}

function Legend({ color, icon, label }: { color: string; icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-5 h-5 rounded-full flex items-center justify-center ${color}`}>{icon}</span>
      {label}
    </span>
  );
}
