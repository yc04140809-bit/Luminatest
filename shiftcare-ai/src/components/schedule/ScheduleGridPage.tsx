import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Wand2, ListPlus, Lock, StickyNote } from 'lucide-react';
import { useAppStore } from '../../store/AppStore';
import { getDateKeysInMonth, getWeekdayLabel, formatDayLabel, formatYearMonthLabel } from '../../utils/date';
import { validateSchedule } from '../../engine/validateSchedule';
import { runAutoAssign } from '../../engine/autoAssign';
import { Button } from '../ui/Button';
import { CellEditorModal } from './CellEditorModal';
import type { ValidationIssue } from '../../types/domain';

export interface ScheduleJumpTarget {
  staffId: string | null;
  date: string | null;
}

export function ScheduleGridPage({
  yearMonth,
  onYearMonthChange,
  jumpTarget,
  onJumpHandled,
}: {
  yearMonth: string;
  onYearMonthChange: (ym: string) => void;
  jumpTarget: ScheduleJumpTarget | null;
  onJumpHandled: () => void;
}) {
  const { state, dispatch } = useAppStore();
  const { data } = state;
  const activeStaff = data.staff.filter((s) => s.active);
  const dateKeys = useMemo(() => getDateKeysInMonth(yearMonth), [yearMonth]);
  const schedule = data.schedules[yearMonth];
  const shiftTypes = data.shiftTypes;

  const [selectedCell, setSelectedCell] = useState<{ staffId: string; date: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<'full' | 'fillEmpty' | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const issues = useMemo(() => validateSchedule(data, yearMonth), [data, yearMonth]);
  const issuesByCell = useMemo(() => {
    const map = new Map<string, ValidationIssue[]>();
    for (const issue of issues) {
      if (!issue.date || !issue.staffId) continue;
      const key = `${issue.staffId}__${issue.date}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(issue);
    }
    return map;
  }, [issues]);

  useEffect(() => {
    if (!jumpTarget?.date) return;
    const key = jumpTarget.staffId ? `${jumpTarget.staffId}__${jumpTarget.date}` : null;
    if (key) {
      const el = cellRefs.current.get(key);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        el.classList.add('ring-4', 'ring-teal-400');
        setTimeout(() => el.classList.remove('ring-4', 'ring-teal-400'), 1800);
      }
    } else {
      // 日付のみ指定の場合はその列までスクロール
      const el = scrollRef.current?.querySelector(`[data-date-col="${jumpTarget.date}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    onJumpHandled();
  }, [jumpTarget, onJumpHandled]);

  function runAssign(mode: 'full' | 'fillEmpty') {
    const assignments = runAutoAssign(data, yearMonth, mode);
    dispatch({ type: 'BULK_SET_ASSIGNMENTS', yearMonth, assignments });
    setConfirmAction(null);
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">月間シフト表</h1>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={() => onYearMonthChange(shiftMonth(yearMonth, -1))} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
              <ChevronLeft size={18} />
            </button>
            <span className="font-semibold text-slate-600 text-sm w-24 text-center">{formatYearMonthLabel(yearMonth)}</span>
            <button onClick={() => onYearMonthChange(shiftMonth(yearMonth, 1))} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={<ListPlus size={15} />} onClick={() => setConfirmAction('fillEmpty')}>
            未入力を自動補完
          </Button>
          <Button size="sm" icon={<Wand2 size={15} />} onClick={() => setConfirmAction('full')}>
            シフトを自動作成
          </Button>
        </div>
      </div>

      {activeStaff.length === 0 ? (
        <div className="text-center text-slate-400 py-20 bg-white rounded-2xl border border-slate-200">
          スタッフが登録されていません。先に「スタッフ管理」から登録してください。
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div ref={scrollRef} className="overflow-x-auto">
            <table className="border-collapse w-full">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 bg-slate-50 border-b border-r border-slate-200 px-3 py-2.5 text-left text-xs font-bold text-slate-500 min-w-[110px]">
                    スタッフ
                  </th>
                  {dateKeys.map((date) => {
                    const wd = getWeekdayLabel(date);
                    const isWeekend = wd === '土' || wd === '日';
                    return (
                      <th
                        key={date}
                        data-date-col={date}
                        className={`border-b border-slate-200 px-1.5 py-2.5 text-center text-xs font-bold min-w-[42px] ${
                          isWeekend ? 'text-rose-400' : 'text-slate-500'
                        }`}
                      >
                        <div>{formatDayLabel(date)}</div>
                        <div className="text-[10px] font-normal">{wd}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {activeStaff.map((staff) => (
                  <tr key={staff.id} className="group">
                    <td className="sticky left-0 z-10 bg-white group-even:bg-slate-50/40 border-r border-b border-slate-100 px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                          style={{ backgroundColor: staff.color }}
                        >
                          {staff.displayName.slice(0, 1)}
                        </span>
                        <span className="text-sm font-medium text-slate-700 truncate">{staff.displayName}</span>
                      </div>
                    </td>
                    {dateKeys.map((date) => {
                      const assignment = schedule?.assignments[`${staff.id}__${date}`];
                      const shiftType = shiftTypes.find((s) => s.id === assignment?.shiftTypeId);
                      const cellIssues = issuesByCell.get(`${staff.id}__${date}`) ?? [];
                      const hasError = cellIssues.some((i) => i.severity === 'error');
                      const hasWarning = cellIssues.some((i) => i.severity === 'warning');
                      const hasNote = data.dayNotes.some((n) => n.staffId === staff.id && n.date === date);
                      const isDesiredOff = staff.desiredOffDates.includes(date);
                      return (
                        <td key={date} className="border-b border-slate-100 p-1 text-center">
                          <button
                            ref={(el) => {
                              if (el) cellRefs.current.set(`${staff.id}__${date}`, el);
                            }}
                            onClick={() => setSelectedCell({ staffId: staff.id, date })}
                            className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-transform active:scale-90 ${
                              shiftType ? 'text-white' : 'bg-slate-50 text-slate-300 border border-dashed border-slate-200'
                            } ${hasError ? 'ring-2 ring-rose-500' : hasWarning ? 'ring-2 ring-amber-400' : ''}`}
                            style={shiftType ? { backgroundColor: shiftType.color } : undefined}
                          >
                            {shiftType ? shiftType.shortLabel : isDesiredOff ? '希' : ''}
                            {assignment?.locked && (
                              <Lock size={9} className="absolute -top-1 -right-1 bg-slate-700 text-white rounded-full p-[1.5px]" />
                            )}
                            {hasNote && <StickyNote size={9} className="absolute -bottom-1 -left-1 text-amber-500 fill-amber-200" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        {[...shiftTypes]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((st) => (
            <span key={st.id} className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: st.color }} />
              {st.name}
            </span>
          ))}
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 ml-2">
          <span className="w-3.5 h-3.5 rounded ring-2 ring-rose-500 bg-white" />エラー
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-3.5 h-3.5 rounded ring-2 ring-amber-400 bg-white" />警告
        </span>
      </div>

      <CellEditorModal
        open={!!selectedCell}
        onClose={() => setSelectedCell(null)}
        yearMonth={yearMonth}
        staffId={selectedCell?.staffId ?? null}
        date={selectedCell?.date ?? null}
      />

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setConfirmAction(null)} />
          <div className="relative bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl">
            <p className="text-slate-700 font-semibold mb-1">
              {confirmAction === 'full' ? 'シフトを自動作成しますか？' : '未入力部分だけを自動補完しますか？'}
            </p>
            <p className="text-sm text-slate-400 mb-4">
              {confirmAction === 'full'
                ? 'ロック(🔒)されたセル以外は上書きされます。実行後に「元に戻す」で取り消せます。'
                : '既に入力済みのセルは変更されません。空欄のみ自動的に埋められます。'}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmAction(null)}>キャンセル</Button>
              <Button onClick={() => runAssign(confirmAction)}>実行する</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
