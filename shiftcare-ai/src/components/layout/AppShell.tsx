import React from 'react';
import {
  LayoutDashboard,
  Users,
  Tags,
  CalendarDays,
  SlidersHorizontal,
  AlertTriangle,
  BarChart3,
  Undo2,
  Redo2,
  HeartHandshake,
  Smartphone,
} from 'lucide-react';
import { useAppStore } from '../../store/AppStore';
import { FeedbackWidget } from '../feedback/FeedbackWidget';
import type { View } from '../../App';

const NAV_ITEMS: { key: View; label: string; icon: React.ElementType }[] = [
  { key: 'dashboard', label: 'ホーム', icon: LayoutDashboard },
  { key: 'schedule', label: 'シフト表', icon: CalendarDays },
  { key: 'issues', label: '問題一覧', icon: AlertTriangle },
  { key: 'staff', label: 'スタッフ', icon: Users },
  { key: 'staffPortal', label: '希望提出', icon: Smartphone },
  { key: 'shiftTypes', label: '勤務種別', icon: Tags },
  { key: 'rules', label: 'ルール設定', icon: SlidersHorizontal },
  { key: 'reports', label: '月次集計', icon: BarChart3 },
];

export function AppShell({
  view,
  onNavigate,
  errorCount,
  warningCount,
  children,
}: {
  view: View;
  onNavigate: (v: View) => void;
  errorCount: number;
  warningCount: number;
  children: React.ReactNode;
}) {
  const { state, dispatch, canUndo, canRedo } = useAppStore();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col sm:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden sm:flex sm:flex-col w-60 shrink-0 bg-white border-r border-slate-200 p-4 gap-1">
        <div className="flex items-center gap-2 px-2 py-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shrink-0">
            <HeartHandshake size={20} />
          </div>
          <div>
            <div className="font-bold text-slate-800 leading-tight">ShiftCare AI</div>
            <div className="text-[11px] text-slate-400 leading-tight">{state.data.facility.facilityName || '未設定施設'}</div>
          </div>
        </div>
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.key}
            item={item}
            active={view === item.key}
            badgeCount={item.key === 'issues' ? errorCount + warningCount : 0}
            onClick={() => onNavigate(item.key)}
          />
        ))}
        <div className="mt-auto pt-3 border-t border-slate-100 flex gap-2">
          <button
            disabled={!canUndo}
            onClick={() => dispatch({ type: 'UNDO' })}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-medium text-slate-600 disabled:opacity-30 hover:bg-slate-50"
          >
            <Undo2 size={15} /> 元に戻す
          </button>
          <button
            disabled={!canRedo}
            onClick={() => dispatch({ type: 'REDO' })}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-medium text-slate-600 disabled:opacity-30 hover:bg-slate-50"
          >
            <Redo2 size={15} /> やり直す
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sm:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white">
            <HeartHandshake size={16} />
          </div>
          <div>
            <div className="font-bold text-slate-800 text-sm leading-tight">ShiftCare AI</div>
            <div className="text-[10px] text-slate-400 leading-tight">{state.data.facility.facilityName || '未設定施設'}</div>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            disabled={!canUndo}
            onClick={() => dispatch({ type: 'UNDO' })}
            className="p-2 rounded-lg text-slate-500 disabled:opacity-30 active:bg-slate-100"
            aria-label="元に戻す"
          >
            <Undo2 size={18} />
          </button>
          <button
            disabled={!canRedo}
            onClick={() => dispatch({ type: 'REDO' })}
            className="p-2 rounded-lg text-slate-500 disabled:opacity-30 active:bg-slate-100"
            aria-label="やり直す"
          >
            <Redo2 size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 min-w-0 pb-20 sm:pb-8">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 flex overflow-x-auto no-scrollbar">
        {NAV_ITEMS.map((item) => (
          <MobileNavButton
            key={item.key}
            item={item}
            active={view === item.key}
            badgeCount={item.key === 'issues' ? errorCount + warningCount : 0}
            onClick={() => onNavigate(item.key)}
          />
        ))}
      </nav>

      <FeedbackWidget />
    </div>
  );
}

function NavButton({
  item,
  active,
  badgeCount,
  onClick,
}: {
  item: { key: View; label: string; icon: React.ElementType };
  active: boolean;
  badgeCount: number;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors relative ${
        active ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      <Icon size={18} />
      {item.label}
      {badgeCount > 0 && (
        <span className="ml-auto min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">
          {badgeCount}
        </span>
      )}
    </button>
  );
}

function MobileNavButton({
  item,
  active,
  badgeCount,
  onClick,
}: {
  item: { key: View; label: string; icon: React.ElementType };
  active: boolean;
  badgeCount: number;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 py-2 min-w-[64px] flex-1 relative ${
        active ? 'text-teal-700' : 'text-slate-400'
      }`}
    >
      <div className="relative">
        <Icon size={20} strokeWidth={active ? 2.5 : 2} />
        {badgeCount > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
            {badgeCount}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium">{item.label}</span>
    </button>
  );
}
