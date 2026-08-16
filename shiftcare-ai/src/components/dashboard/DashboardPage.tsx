import React, { useMemo } from 'react';
import { Check, CalendarDays, Users, AlertCircle, AlertTriangle, CalendarX2, Gauge, Wand2, ShieldCheck, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../store/AppStore';
import { validateSchedule, countBySeverity } from '../../engine/validateSchedule';
import { getDateKeysInMonth, formatYearMonthLabel } from '../../utils/date';
import { Card, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import type { View } from '../../App';

interface WorkflowStep {
  label: string;
  done: boolean;
  view: View;
}

const WANT_TO_USE_LABEL = {
  yes: 'ぜひ使いたい',
  ifImproved: '改善されれば使いたい',
  no: '今のところ使わない',
} as const;

export function DashboardPage({ yearMonth, onNavigate }: { yearMonth: string; onNavigate: (v: View) => void }) {
  const { state } = useAppStore();
  const { data } = state;
  const activeStaff = data.staff.filter((s) => s.active);

  const issues = useMemo(() => validateSchedule(data, yearMonth), [data, yearMonth]);
  const counts = countBySeverity(issues);
  const desiredOffPending = issues.filter((i) => i.ruleType === 'desiredOffConflict').length;

  const dateKeys = getDateKeysInMonth(yearMonth);
  const schedule = data.schedules[yearMonth];
  const totalCells = activeStaff.length * dateKeys.length;
  const filledCells = activeStaff.reduce((sum, s) => {
    return (
      sum +
      dateKeys.filter((d) => {
        const a = schedule?.assignments[`${s.id}__${d}`];
        return a && a.shiftTypeId;
      }).length
    );
  }, 0);
  const completion = totalCells === 0 ? 0 : Math.round((filledCells / totalCells) * 100);

  const hasRequests = activeStaff.some(
    (s) => s.desiredOffDates.length > 0 || s.desiredPaidLeaveDates.length > 0 || s.unavailableDates.length > 0 || Object.keys(s.desiredWorkDates).length > 0,
  );

  const steps: WorkflowStep[] = [
    { label: 'スタッフ登録', done: activeStaff.length > 0, view: 'staff' },
    { label: '希望休入力', done: hasRequests, view: 'staffPortal' },
    { label: 'シフト作成', done: completion === 100, view: 'schedule' },
    { label: '問題チェック', done: completion === 100 && counts.error === 0, view: 'issues' },
    { label: '完成', done: completion === 100 && counts.error === 0 && counts.warning === 0, view: 'issues' },
  ];
  const currentStepIndex = steps.findIndex((s) => !s.done);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-800">ダッシュボード</h1>
        <p className="text-sm text-slate-400 mt-0.5">{formatYearMonthLabel(yearMonth)}の状況</p>
      </div>

      <WorkflowStrip steps={steps} currentStepIndex={currentStepIndex} onNavigate={onNavigate} />

      <div className="grid sm:grid-cols-2 gap-3 mb-5 mt-5">
        <Button size="lg" icon={<CalendarDays size={20} />} onClick={() => onNavigate('schedule')}>
          シフトを作成する
        </Button>
        <Button size="lg" variant="secondary" icon={<ShieldCheck size={20} />} onClick={() => onNavigate('issues')}>
          自動チェックを実行
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <StatCard
          icon={<Users size={18} />}
          label="登録スタッフ"
          value={`${activeStaff.length}名`}
          color="teal"
          onClick={() => onNavigate('staff')}
        />
        <StatCard
          icon={<Gauge size={18} />}
          label="シフト完成度"
          value={`${completion}%`}
          color="sky"
          onClick={() => onNavigate('schedule')}
        />
        <StatCard
          icon={<CalendarX2 size={18} />}
          label="希望休未処理"
          value={`${desiredOffPending}件`}
          color="amber"
          onClick={() => onNavigate('issues')}
        />
        <StatCard
          icon={<AlertCircle size={18} />}
          label="未解決エラー"
          value={`${counts.error}件`}
          color="rose"
          onClick={() => onNavigate('issues')}
        />
        <StatCard
          icon={<AlertTriangle size={18} />}
          label="警告"
          value={`${counts.warning}件`}
          color="amber"
          onClick={() => onNavigate('issues')}
        />
        <StatCard
          icon={<Wand2 size={18} />}
          label="改善提案"
          value={`${counts.suggestion}件`}
          color="sky"
          onClick={() => onNavigate('issues')}
        />
      </div>

      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-700">今月のシフト完成度</h2>
            <span className="text-sm text-slate-400">{filledCells} / {totalCells} 枠</span>
          </div>
          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-600 transition-all"
              style={{ width: `${completion}%` }}
            />
          </div>
          <button
            onClick={() => onNavigate('schedule')}
            className="mt-4 w-full flex items-center justify-between text-sm font-medium text-teal-700 hover:bg-teal-50 rounded-xl px-3 py-2.5 -mx-1"
          >
            シフト表を開く
            <ChevronRight size={16} />
          </button>
        </CardBody>
      </Card>

      {(counts.error > 0 || counts.warning > 0) && (
        <Card className="mt-4">
          <CardBody>
            <h2 className="font-bold text-slate-700 mb-3">直近の問題</h2>
            <div className="space-y-2">
              {issues.slice(0, 4).map((issue) => (
                <div key={issue.id} className="flex items-start gap-2 text-sm">
                  <span>{issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵'}</span>
                  <span className="text-slate-600">{issue.message}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => onNavigate('issues')}
              className="mt-3 w-full flex items-center justify-between text-sm font-medium text-teal-700 hover:bg-teal-50 rounded-xl px-3 py-2.5 -mx-1"
            >
              すべての問題を見る({counts.error + counts.warning}件)
              <ChevronRight size={16} />
            </button>
          </CardBody>
        </Card>
      )}

      {data.feedbackResponses.length > 0 && (
        <Card className="mt-4">
          <CardBody>
            <h2 className="font-bold text-slate-700 mb-3">テスターの声({data.feedbackResponses.length}件)</h2>
            <div className="space-y-3">
              {[...data.feedbackResponses]
                .reverse()
                .slice(0, 5)
                .map((r) => (
                  <div key={r.id} className="border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                    <span
                      className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mb-1.5 ${
                        r.wantToUse === 'yes'
                          ? 'bg-teal-50 text-teal-700'
                          : r.wantToUse === 'ifImproved'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {WANT_TO_USE_LABEL[r.wantToUse]}
                    </span>
                    {r.favoriteFeature && <div className="text-xs text-slate-500">👍 {r.favoriteFeature}</div>}
                    {r.biggestPain && <div className="text-xs text-slate-500 mt-0.5">😖 {r.biggestPain}</div>}
                  </div>
                ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function WorkflowStrip({
  steps,
  currentStepIndex,
  onNavigate,
}: {
  steps: WorkflowStep[];
  currentStepIndex: number;
  onNavigate: (v: View) => void;
}) {
  const allDone = currentStepIndex === -1;
  return (
    <Card>
      <CardBody className="py-3.5">
        {allDone ? (
          <div className="flex items-center gap-2 text-teal-700 font-semibold text-sm">
            <Check size={18} className="shrink-0" />
            今月のシフトは完成です。おつかれさまでした。
          </div>
        ) : (
          <div className="flex items-start">
            {steps.map((step, i) => {
              const isDone = step.done;
              const isCurrent = i === currentStepIndex;
              return (
                <React.Fragment key={step.label}>
                  {i > 0 && (
                    <div className={`h-0.5 flex-1 mt-[15px] sm:mt-[17px] ${isDone || i <= currentStepIndex ? 'bg-teal-300' : 'bg-slate-200'}`} />
                  )}
                  <button onClick={() => onNavigate(step.view)} className="flex flex-col items-center gap-1 px-0.5 shrink-0 w-14 sm:w-20">
                    <span
                      className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shrink-0 transition-colors ${
                        isDone
                          ? 'bg-teal-500 text-white'
                          : isCurrent
                          ? 'bg-teal-600 text-white ring-4 ring-teal-100'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isDone ? <Check size={15} /> : i + 1}
                    </span>
                    <span className={`text-[10px] sm:text-xs text-center leading-tight ${isCurrent ? 'font-bold text-teal-700' : 'text-slate-400'}`}>
                      {step.label}
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'teal' | 'sky' | 'amber' | 'rose';
  onClick: () => void;
}) {
  const colorClasses = {
    teal: 'bg-teal-50 text-teal-600',
    sky: 'bg-sky-50 text-sky-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  }[color];
  return (
    <Card onClick={onClick}>
      <CardBody className="py-3.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${colorClasses}`}>{icon}</div>
        <div className="text-xl font-bold text-slate-800 leading-tight">{value}</div>
        <div className="text-xs text-slate-400 mt-0.5">{label}</div>
      </CardBody>
    </Card>
  );
}
