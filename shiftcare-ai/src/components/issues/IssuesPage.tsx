import { useMemo, useState } from 'react';
import { ChevronRight, PartyPopper, Wand2 } from 'lucide-react';
import { useAppStore } from '../../store/AppStore';
import { validateSchedule, countBySeverity } from '../../engine/validateSchedule';
import { mergeAssignments } from '../../engine/scheduleHelpers';
import type { Assignment, Severity, ValidationIssue } from '../../types/domain';
import { SeverityBadge } from '../ui/Badge';
import { Card, CardBody } from '../ui/Card';
import { useToast } from '../ui/ToastProvider';
import { formatYearMonthLabel } from '../../utils/date';
import type { View } from '../../App';
import type { ScheduleJumpTarget } from '../schedule/ScheduleGridPage';

type Filter = 'all' | Severity;

export function IssuesPage({
  yearMonth,
  onNavigate,
  onJumpToCell,
}: {
  yearMonth: string;
  onNavigate: (v: View) => void;
  onJumpToCell: (target: ScheduleJumpTarget) => void;
}) {
  const { state, dispatch } = useAppStore();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<Filter>('all');

  const issues = useMemo(() => validateSchedule(state.data, yearMonth), [state.data, yearMonth]);
  const counts = countBySeverity(issues);
  const filtered = filter === 'all' ? issues : issues.filter((i) => i.severity === filter);

  function jump(issue: ValidationIssue) {
    if (!issue.date) return;
    onJumpToCell({ staffId: issue.staffId, date: issue.date });
    onNavigate('schedule');
  }

  function applySuggestion(s: ValidationIssue['suggestions'][number]) {
    const schedule = state.data.schedules[yearMonth];
    let previewAssignments: Assignment[];

    if (s.action.type === 'assign') {
      previewAssignments = [{ staffId: s.action.staffId, date: s.action.date, shiftTypeId: s.action.shiftTypeId, locked: false }];
      dispatch({ type: 'SET_ASSIGNMENT', yearMonth, staffId: s.action.staffId, date: s.action.date, shiftTypeId: s.action.shiftTypeId });
    } else {
      const a = schedule?.assignments[`${s.action.staffIdA}__${s.action.dateA}`];
      const b = schedule?.assignments[`${s.action.staffIdB}__${s.action.dateB}`];
      previewAssignments = [
        { staffId: s.action.staffIdA, date: s.action.dateA, shiftTypeId: b?.shiftTypeId ?? null, locked: false },
        { staffId: s.action.staffIdB, date: s.action.dateB, shiftTypeId: a?.shiftTypeId ?? null, locked: false },
      ];
      dispatch({ type: 'SET_ASSIGNMENT', yearMonth, staffId: s.action.staffIdA, date: s.action.dateA, shiftTypeId: b?.shiftTypeId ?? null });
      dispatch({ type: 'SET_ASSIGNMENT', yearMonth, staffId: s.action.staffIdB, date: s.action.dateB, shiftTypeId: a?.shiftTypeId ?? null, pushHistory: false });
    }

    const beforeCounts = countBySeverity(issues);
    const previewData = {
      ...state.data,
      schedules: {
        ...state.data.schedules,
        [yearMonth]: {
          yearMonth,
          assignments: mergeAssignments(schedule?.assignments ?? {}, previewAssignments),
          status: schedule?.status ?? ('draft' as const),
          publishedAt: schedule?.publishedAt ?? null,
        },
      },
    };
    const afterCounts = countBySeverity(validateSchedule(previewData, yearMonth));
    const beforeTotal = beforeCounts.error + beforeCounts.warning;
    const afterTotal = afterCounts.error + afterCounts.warning;

    showToast(
      beforeTotal !== afterTotal ? `修正候補を適用しました。問題が${beforeTotal}件 → ${afterTotal}件になりました。` : '修正候補を適用しました。',
      { hint: '「元に戻す」で取り消せます' },
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-800">問題一覧</h1>
        <p className="text-sm text-slate-400 mt-0.5">{formatYearMonthLabel(yearMonth)}の自動チェック結果</p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <SummaryTile label="エラー" value={counts.error} icon="🔴" active={filter === 'error'} onClick={() => setFilter(filter === 'error' ? 'all' : 'error')} />
        <SummaryTile label="警告" value={counts.warning} icon="🟡" active={filter === 'warning'} onClick={() => setFilter(filter === 'warning' ? 'all' : 'warning')} />
        <SummaryTile label="提案" value={counts.suggestion} icon="🔵" active={filter === 'suggestion'} onClick={() => setFilter(filter === 'suggestion' ? 'all' : 'suggestion')} />
      </div>

      {issues.length === 0 ? (
        <Card>
          <CardBody className="text-center py-14">
            <PartyPopper className="mx-auto text-teal-500 mb-3" size={36} />
            <div className="font-bold text-slate-700">問題は見つかりませんでした</div>
            <div className="text-sm text-slate-400 mt-1">シフトは完成です。おつかれさまでした。</div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((issue) => (
            <Card key={issue.id} className="overflow-hidden">
              <CardBody className="py-3.5">
                <button onClick={() => jump(issue)} className="w-full text-left flex items-start gap-2 group">
                  <SeverityBadge severity={issue.severity} />
                  <span className="flex-1 text-sm text-slate-700 leading-snug">{issue.message}</span>
                  {issue.date && <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-500 shrink-0 mt-0.5" />}
                </button>
                {issue.suggestions.length > 0 && (
                  <div className="mt-3 pl-1 space-y-1.5 border-t border-slate-100 pt-3">
                    <div className="text-xs font-semibold text-slate-400 flex items-center gap-1"><Wand2 size={12} />修正候補</div>
                    {issue.suggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => applySuggestion(s)}
                        className="w-full text-left text-sm text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg px-3 py-2 transition-colors"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  icon,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border-2 p-3 text-center transition-colors ${active ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
    >
      <div className="text-lg">{icon}</div>
      <div className="text-xl font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </button>
  );
}
