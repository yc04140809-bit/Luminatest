import React from 'react';
import { useAppStore } from '../../store/AppStore';
import type { FacilityRules } from '../../types/domain';
import { Card, CardBody } from '../ui/Card';
import { Toggle, Input, Select } from '../ui/Form';

function RuleCard({
  title,
  hint,
  checked,
  onToggle,
  children,
}: {
  title: string;
  hint?: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold text-slate-700 text-sm">{title}</div>
            {hint && <div className="text-xs text-slate-400 mt-0.5">{hint}</div>}
          </div>
          <Toggle checked={checked} onChange={onToggle} />
        </div>
        {checked && children && <div className="mt-3 pt-3 border-t border-slate-100">{children}</div>}
      </CardBody>
    </Card>
  );
}

function NumberField({ value, onChange, unit }: { value: number; onChange: (v: number) => void; unit: string }) {
  return (
    <div className="flex items-center gap-2">
      <Input type="number" min={0} className="w-24" value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="text-sm text-slate-500">{unit}</span>
    </div>
  );
}

export function FacilityRulesTab() {
  const { state, dispatch } = useAppStore();
  const rules = state.data.facilityRules;

  function patch(p: Partial<FacilityRules>) {
    dispatch({ type: 'UPDATE_FACILITY_RULES', patch: p });
  }

  const workingShiftTypes = state.data.shiftTypes.filter((s) => !s.isTimeOff);

  function toggleForbiddenId(field: 'nightShiftNextDayForbiddenShiftTypeIds' | 'nightShiftFollowUpForbiddenShiftTypeIds', id: string) {
    const current = rules[field];
    patch({ [field]: current.includes(id) ? current.filter((x) => x !== id) : [...current, id] } as Partial<FacilityRules>);
  }

  return (
    <div className="space-y-3">
      <RuleCard title="最大連勤数" hint="設定日数を超えて連続勤務した場合に警告します" checked={rules.maxConsecutiveDaysEnabled} onToggle={(v) => patch({ maxConsecutiveDaysEnabled: v })}>
        <NumberField value={rules.maxConsecutiveDays} onChange={(v) => patch({ maxConsecutiveDays: v })} unit="日を超えたら警告" />
      </RuleCard>

      <RuleCard title="勤務間隔(休息時間)チェック" hint="施設として設定する最低休息時間です。法令上の必須時間を断定するものではありません" checked={rules.restIntervalEnabled} onToggle={(v) => patch({ restIntervalEnabled: v })}>
        <NumberField value={rules.minRestHours} onChange={(v) => patch({ minRestHours: v })} unit="時間を下回ったら警告" />
      </RuleCard>

      <RuleCard title="夜勤可能スタッフに限定" hint="夜勤不可のスタッフに夜勤が入った場合エラー表示します" checked={rules.nightShiftRestrictedToEligibleEnabled} onToggle={(v) => patch({ nightShiftRestrictedToEligibleEnabled: v })} />

      <RuleCard title="夜勤回数上限チェック" hint="スタッフごとの夜勤回数上限(スタッフ管理で個別設定)を超えたら警告します" checked={rules.nightShiftLimitEnabled} onToggle={(v) => patch({ nightShiftLimitEnabled: v })} />

      <RuleCard title="夜勤の連続回数" hint="夜勤が連続した場合に警告します" checked={rules.nightShiftConsecutiveEnabled} onToggle={(v) => patch({ nightShiftConsecutiveEnabled: v })}>
        <NumberField value={rules.maxConsecutiveNightShifts} onChange={(v) => patch({ maxConsecutiveNightShifts: v })} unit="回を超えたら警告" />
      </RuleCard>

      <RuleCard
        title="夜勤翌日の勤務制限"
        hint="夜勤の翌日に指定した勤務種別が入ったら警告します"
        checked={rules.nightShiftNextDayRestrictionEnabled}
        onToggle={(v) => patch({ nightShiftNextDayRestrictionEnabled: v })}
      >
        <div className="flex flex-wrap gap-1.5">
          {workingShiftTypes.map((st) => (
            <ChipToggle
              key={st.id}
              label={st.name}
              active={rules.nightShiftNextDayForbiddenShiftTypeIds.includes(st.id)}
              onClick={() => toggleForbiddenId('nightShiftNextDayForbiddenShiftTypeIds', st.id)}
            />
          ))}
        </div>
      </RuleCard>

      <RuleCard
        title="夜勤明け翌日の勤務制限"
        hint="夜勤明けの翌日に指定した勤務種別が入ったら警告します"
        checked={rules.nightShiftFollowUpRestrictionEnabled}
        onToggle={(v) => patch({ nightShiftFollowUpRestrictionEnabled: v })}
      >
        <div className="flex flex-wrap gap-1.5">
          {workingShiftTypes.map((st) => (
            <ChipToggle
              key={st.id}
              label={st.name}
              active={rules.nightShiftFollowUpForbiddenShiftTypeIds.includes(st.id)}
              onClick={() => toggleForbiddenId('nightShiftFollowUpForbiddenShiftTypeIds', st.id)}
            />
          ))}
        </div>
      </RuleCard>

      <RuleCard title="夜勤の間隔" hint="夜勤と次の夜勤の間に空けたい最低日数です" checked={rules.nightShiftIntervalEnabled} onToggle={(v) => patch({ nightShiftIntervalEnabled: v })}>
        <NumberField value={rules.minNightShiftIntervalDays} onChange={(v) => patch({ minNightShiftIntervalDays: v })} unit="日以上あける" />
      </RuleCard>

      <RuleCard title="公平性チェック" hint="夜勤・土日祝の回数に偏りがあるスタッフを警告します" checked={rules.fairnessCheckEnabled} onToggle={(v) => patch({ fairnessCheckEnabled: v })}>
        <div className="flex items-center gap-2">
          <Select value={rules.fairnessToleranceCount} onChange={(e) => patch({ fairnessToleranceCount: Number(e.target.value) })} className="w-28">
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}回</option>
            ))}
          </Select>
          <span className="text-sm text-slate-500">以上平均を上回ったら警告</span>
        </div>
      </RuleCard>
    </div>
  );
}

function ChipToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}
