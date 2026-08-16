import React, { useMemo } from 'react';
import { CalendarDays, Users, AlertCircle, AlertTriangle, CalendarX2, Gauge, Wand2, ShieldCheck, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../store/AppStore';
import { validateSchedule, countBySeverity } from '../../engine/validateSchedule';
import { getDateKeysInMonth, formatYearMonthLabel } from '../../utils/date';
import { Card, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import type { View } from '../../App';

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

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-800">ダッシュボード</h1>
        <p className="text-sm text-slate-400 mt-0.5">{formatYearMonthLabel(yearMonth)}の状況</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-5">
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
    </div>
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
