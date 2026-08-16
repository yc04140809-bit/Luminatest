import { useState } from 'react';
import { FacilityRulesTab } from './FacilityRulesTab';
import { RequirementsTab } from './RequirementsTab';
import { PairRulesTab } from './PairRulesTab';

type Tab = 'facility' | 'requirements' | 'pairs';

const TABS: { key: Tab; label: string }[] = [
  { key: 'facility', label: '施設ルール' },
  { key: 'requirements', label: '人数・資格配置' },
  { key: 'pairs', label: '組み合わせルール' },
];

export function RulesPage() {
  const [tab, setTab] = useState<Tab>('facility');

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-800">ルール設定</h1>
        <p className="text-sm text-slate-400 mt-0.5">施設ごとの勤務ルールをON/OFF・数値変更できます</p>
      </div>

      <div className="flex gap-1.5 mb-5 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              tab === t.key ? 'bg-teal-600 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'facility' && <FacilityRulesTab />}
      {tab === 'requirements' && <RequirementsTab />}
      {tab === 'pairs' && <PairRulesTab />}
    </div>
  );
}
