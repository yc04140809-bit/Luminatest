import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Wand2,
  ListPlus,
  Moon,
  Lock,
  StickyNote,
  CopyPlus,
  Eye,
  Send,
  CheckCircle2,
  Users,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '../../store/AppStore';
import { getDateKeysInMonth, getWeekdayLabel, formatDayLabel, formatYearMonthLabel } from '../../utils/date';
import { validateSchedule, checkFeasibility, countBySeverity } from '../../engine/validateSchedule';
import { runAutoAssign, type AutoAssignMode } from '../../engine/autoAssign';
import { mergeAssignments } from '../../engine/scheduleHelpers';
import { Button } from '../ui/Button';
import { CellEditorModal } from './CellEditorModal';
import { DayDetailModal } from './DayDetailModal';
import { CopyPreviousMonthModal } from './CopyPreviousMonthModal';
import { ScrollFadeEdges } from '../ui/ScrollFade';
import { EmptyState } from '../ui/EmptyState';
import { useScrollEdges } from '../../hooks/useScrollEdges';
import { useToast } from '../ui/ToastProvider';
import type { FeasibilityIssue, ScheduleStatus, ValidationIssue } from '../../types/domain';
import type { View } from '../../App';

export interface ScheduleJumpTarget {
  staffId: string | null;
  date: string | null;
}

const AUTO_ASSIGN_LABEL: Record<AutoAssignMode, string> = {
  nightOnly: 'STEP1: 夜勤のみ自動作成',
  fillEmpty: '未入力を自動補完',
  full: 'シフトを自動作成(フル)',
};

const STATUS_META: Record<ScheduleStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: '下書き', color: 'bg-slate-100 text-slate-600', icon: Eye },
  review: { label: '確認中', color: 'bg-amber-100 text-amber-700', icon: Send },
  published: { label: '公開済み', color: 'bg-teal-100 text-teal-700', icon: CheckCircle2 },
};

export function ScheduleGridPage({
  yearMonth,
  onYearMonthChange,
  jumpTarget,
  onJumpHandled,
  onNavigate,
}: {
  yearMonth: string;
  onYearMonthChange: (ym: string) => void;
  jumpTarget: ScheduleJumpTarget | null;
  onJumpHandled: () => void;
  onNavigate: (v: View) => void;
}) {
  const { state, dispatch } = useAppStore();
  const { data } = state;
  const { showToast } = useToast();
  const activeStaff = data.staff.filter((s) => s.active);
  const dateKeys = useMemo(() => getDateKeysInMonth(yearMonth), [yearMonth]);
  const schedule = data.schedules[yearMonth];
  const shiftTypes = data.shiftTypes;
  const status: ScheduleStatus = schedule?.status ?? 'draft';

  const [selectedCell, setSelectedCell] = useState<{ staffId: string; date: string } | null>(null);
  const [dayDetailDate, setDayDetailDate] = useState<string | null>(null);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [autoMenuOpen, setAutoMenuOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<AutoAssignMode | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const scrollEdges = useScrollEdges(scrollRef, [yearMonth, activeStaff.length]);

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

  const feasibility: FeasibilityIssue[] = useMemo(
    () => (pendingMode ? checkFeasibility(data, yearMonth, pendingMode === 'nightOnly' ? 'nightOnly' : 'all') : []),
    [data, yearMonth, pendingMode],
  );

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

  function runAssign(mode: AutoAssignMode) {
    setIsProcessing(true);
    // 計算前にスピナーを描画させるため、重い同期処理は次のタスクへ遅延する
    setTimeout(() => {
      try {
        const beforeCounts = countBySeverity(issues);
        const assignments = runAutoAssign(data, yearMonth, mode);

        const mergedAssignments = mergeAssignments(schedule?.assignments ?? {}, assignments);
        const previewData = {
          ...data,
          schedules: {
            ...data.schedules,
            [yearMonth]: { yearMonth, assignments: mergedAssignments, status, publishedAt: schedule?.publishedAt ?? null },
          },
        };
        const afterCounts = countBySeverity(validateSchedule(previewData, yearMonth));

        dispatch({ type: 'BULK_SET_ASSIGNMENTS', yearMonth, assignments });
        setPendingMode(null);
        setIsProcessing(false);

        const beforeTotal = beforeCounts.error + beforeCounts.warning;
        const afterTotal = afterCounts.error + afterCounts.warning;
        const changedCells = assignments.length;
        showToast(
          beforeTotal !== afterTotal
            ? `${AUTO_ASSIGN_LABEL[mode]}を実行しました。問題が${beforeTotal}件 → ${afterTotal}件になりました。`
            : `${AUTO_ASSIGN_LABEL[mode]}を実行しました(${changedCells}件のセルを更新)。`,
          { hint: '「元に戻す」で取り消せます' },
        );
      } catch {
        setIsProcessing(false);
        setPendingMode(null);
        showToast('自動作成に失敗しました。もう一度お試しください。', { tone: 'error' });
      }
    }, 30);
  }

  function setStatus(next: ScheduleStatus) {
    dispatch({ type: 'SET_SCHEDULE_STATUS', yearMonth, status: next });
    setPublishConfirmOpen(false);
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
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

        <StatusControl status={status} onChangeDraftReview={setStatus} onRequestPublish={() => setPublishConfirmOpen(true)} />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant="outline" size="sm" icon={<CopyPlus size={15} />} onClick={() => setCopyModalOpen(true)}>
          前月からコピー
        </Button>
        <div className="relative">
          <Button size="sm" icon={<Wand2 size={15} />} onClick={() => setAutoMenuOpen((v) => !v)}>
            自動作成 <ChevronDown size={14} className="ml-0.5" />
          </Button>
          {autoMenuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setAutoMenuOpen(false)} />
              <div className="absolute z-40 top-full mt-1 left-0 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 min-w-[240px]">
                <MenuItem
                  icon={<Moon size={15} className="text-indigo-500" />}
                  label={AUTO_ASSIGN_LABEL.nightOnly}
                  hint="段階作成モード。他の勤務は空欄のまま残します"
                  onClick={() => {
                    setPendingMode('nightOnly');
                    setAutoMenuOpen(false);
                  }}
                />
                <MenuItem
                  icon={<ListPlus size={15} className="text-teal-600" />}
                  label={AUTO_ASSIGN_LABEL.fillEmpty}
                  hint="入力済みのセルは変更しません"
                  onClick={() => {
                    setPendingMode('fillEmpty');
                    setAutoMenuOpen(false);
                  }}
                />
                <MenuItem
                  icon={<Wand2 size={15} className="text-amber-500" />}
                  label={AUTO_ASSIGN_LABEL.full}
                  hint="ロック以外のセルを全て再計算します"
                  onClick={() => {
                    setPendingMode('full');
                    setAutoMenuOpen(false);
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {activeStaff.length === 0 ? (
        <EmptyState
          icon={<Users size={26} />}
          title="スタッフがまだ登録されていません"
          description="シフト表を作るには、先にスタッフを登録してください。"
          actionLabel="スタッフ管理を開く"
          onAction={() => onNavigate('staff')}
        />
      ) : (
        <div className="relative bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <ScrollFadeEdges atStart={scrollEdges.atStart} atEnd={scrollEdges.atEnd} showStart={false} />
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
                        onClick={() => setDayDetailDate(date)}
                        title="タップで人員状況を確認"
                        className={`border-b border-slate-200 px-1.5 py-2.5 text-center text-xs font-bold min-w-[42px] cursor-pointer hover:bg-teal-50 transition-colors ${
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

      <DayDetailModal open={!!dayDetailDate} onClose={() => setDayDetailDate(null)} yearMonth={yearMonth} date={dayDetailDate} />

      <CopyPreviousMonthModal open={copyModalOpen} onClose={() => setCopyModalOpen(false)} yearMonth={yearMonth} />

      {pendingMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => !isProcessing && setPendingMode(null)} />
          <div className="relative bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl max-h-[85vh] overflow-y-auto">
            <p className="text-slate-700 font-semibold mb-1">{AUTO_ASSIGN_LABEL[pendingMode]}を実行しますか？</p>
            <p className="text-sm text-slate-400 mb-3">
              {pendingMode === 'full' && 'ロック(🔒)されたセル以外は上書きされます。実行後に「元に戻す」で取り消せます。'}
              {pendingMode === 'fillEmpty' && '既に入力済みのセルは変更されません。空欄のみ自動的に埋められます。'}
              {pendingMode === 'nightOnly' && '夜勤の必要人数だけを埋めます。早番・日勤・遅番などは空欄のまま残ります。内容を確認してロックしたら、続けてSTEP2(未入力を自動補完)を実行してください。'}
            </p>

            {feasibility.length > 0 && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-bold text-amber-700 mb-1.5">
                  現在の登録条件では、一部の勤務が成立しない可能性があります({feasibility.length}件)
                </p>
                <ul className="space-y-1 max-h-32 overflow-y-auto">
                  {feasibility.slice(0, 6).map((f) => (
                    <li key={f.id} className="text-xs text-amber-700">・{f.message}</li>
                  ))}
                  {feasibility.length > 6 && <li className="text-xs text-amber-600">他{feasibility.length - 6}件</li>}
                </ul>
                <p className="text-[11px] text-amber-600 mt-1.5">スタッフの追加や必要人数の見直しをおすすめします。それでも実行することは可能です。</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPendingMode(null)} disabled={isProcessing}>キャンセル</Button>
              <Button onClick={() => runAssign(pendingMode)} disabled={isProcessing} icon={isProcessing ? <Loader2 size={15} className="animate-spin" /> : undefined}>
                {isProcessing ? '作成中...' : feasibility.length > 0 ? 'それでも実行する' : '実行する'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {publishConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setPublishConfirmOpen(false)} />
          <div className="relative bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl">
            <p className="text-slate-700 font-semibold mb-1">シフトを公開しますか？</p>
            <p className="text-sm text-slate-400 mb-4">
              公開すると、スタッフ画面に確定シフトとして表示されるようになります(将来のスタッフ公開機能を想定)。公開後も下書きに戻すことは可能です。
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPublishConfirmOpen(false)}>キャンセル</Button>
              <Button onClick={() => setStatus('published')}>公開する</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusControl({
  status,
  onChangeDraftReview,
  onRequestPublish,
}: {
  status: ScheduleStatus;
  onChangeDraftReview: (s: ScheduleStatus) => void;
  onRequestPublish: () => void;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full p-1">
      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${meta.color}`}>
        <Icon size={13} />
        {meta.label}
      </span>
      {status === 'draft' && (
        <button onClick={() => onChangeDraftReview('review')} className="text-xs font-semibold text-slate-500 px-2.5 py-1 rounded-full hover:bg-slate-50">
          確認待ちにする
        </button>
      )}
      {status === 'review' && (
        <>
          <button onClick={() => onChangeDraftReview('draft')} className="text-xs font-semibold text-slate-400 px-2 py-1 rounded-full hover:bg-slate-50">
            下書きに戻す
          </button>
          <button onClick={onRequestPublish} className="text-xs font-semibold text-teal-700 px-2.5 py-1 rounded-full hover:bg-teal-50">
            公開する
          </button>
        </>
      )}
      {status === 'published' && (
        <button onClick={() => onChangeDraftReview('draft')} className="text-xs font-semibold text-slate-400 px-2.5 py-1 rounded-full hover:bg-slate-50">
          下書きに戻す
        </button>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2">
      <span className="mt-0.5">{icon}</span>
      <span>
        <span className="block text-sm font-medium text-slate-700">{label}</span>
        <span className="block text-[11px] text-slate-400">{hint}</span>
      </span>
    </button>
  );
}

function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
