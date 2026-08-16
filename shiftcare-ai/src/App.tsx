import { useState } from 'react';
import { AppStoreProvider, useAppStore } from './store/AppStore';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { StaffPage } from './components/staff/StaffPage';
import { ShiftTypesPage } from './components/shiftTypes/ShiftTypesPage';
import { ScheduleGridPage, type ScheduleJumpTarget } from './components/schedule/ScheduleGridPage';
import { RulesPage } from './components/rules/RulesPage';
import { IssuesPage } from './components/issues/IssuesPage';
import { ReportsPage } from './components/reports/ReportsPage';
import { StaffPortalPage } from './components/staffPortal/StaffPortalPage';
import { validateSchedule, countBySeverity } from './engine/validateSchedule';
import { currentYearMonth } from './utils/date';
import { HeartHandshake } from 'lucide-react';

export type View = 'dashboard' | 'staff' | 'shiftTypes' | 'schedule' | 'rules' | 'issues' | 'reports' | 'staffPortal';

function AppContent() {
  const { state } = useAppStore();
  const [view, setView] = useState<View>('dashboard');
  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const [jumpTarget, setJumpTarget] = useState<ScheduleJumpTarget | null>(null);

  if (!state.loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-teal-600">
          <HeartHandshake size={32} className="animate-pulse" />
          <span className="text-sm text-slate-400">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (!state.data.facility.onboardingCompleted) {
    return <OnboardingWizard />;
  }

  const issues = validateSchedule(state.data, yearMonth);
  const counts = countBySeverity(issues);

  return (
    <AppShell view={view} onNavigate={setView} errorCount={counts.error} warningCount={counts.warning}>
      {view === 'dashboard' && <DashboardPage yearMonth={yearMonth} onNavigate={setView} />}
      {view === 'staff' && <StaffPage />}
      {view === 'shiftTypes' && <ShiftTypesPage />}
      {view === 'schedule' && (
        <ScheduleGridPage
          yearMonth={yearMonth}
          onYearMonthChange={setYearMonth}
          jumpTarget={jumpTarget}
          onJumpHandled={() => setJumpTarget(null)}
        />
      )}
      {view === 'rules' && <RulesPage />}
      {view === 'issues' && (
        <IssuesPage
          yearMonth={yearMonth}
          onNavigate={setView}
          onJumpToCell={(target) => setJumpTarget(target)}
        />
      )}
      {view === 'reports' && <ReportsPage yearMonth={yearMonth} />}
      {view === 'staffPortal' && <StaffPortalPage yearMonth={yearMonth} />}
    </AppShell>
  );
}

export default function App() {
  return (
    <AppStoreProvider>
      <AppContent />
    </AppStoreProvider>
  );
}
