import { useState } from 'react';
import { HeartHandshake, Sparkles, Check, ChevronLeft, Users, Tags, ListChecks, SlidersHorizontal, Building2 } from 'lucide-react';
import { useAppStore } from '../../store/AppStore';
import type { FacilityMode } from '../../types/domain';
import { Button } from '../ui/Button';
import { Card, CardBody } from '../ui/Card';
import { Field, Input, Toggle } from '../ui/Form';
import { StaffForm } from '../staff/StaffForm';
import { Plus } from 'lucide-react';

const STEPS = ['モード選択', '施設名', 'スタッフ登録', '勤務種別', '必要人数', '勤務ルール'];

export function OnboardingWizard() {
  const { state, dispatch } = useAppStore();
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<FacilityMode>('care');
  const [facilityName, setFacilityName] = useState('');
  const [staffFormOpen, setStaffFormOpen] = useState(false);
  const [dataInitialized, setDataInitialized] = useState(false);

  function startDemo() {
    dispatch({ type: 'RESET_WITH_SEED', mode, facilityName: facilityName || 'さくら介護施設' });
  }

  function ensureEmptyData() {
    if (!dataInitialized) {
      dispatch({ type: 'RESET_EMPTY', mode, facilityName: facilityName || '未設定施設' });
      setDataInitialized(true);
    }
  }

  function next() {
    if (step === 1) ensureEmptyData();
    if (step === STEPS.length - 1) {
      dispatch({ type: 'UPDATE_FACILITY', patch: { onboardingCompleted: true } });
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white flex flex-col">
      <div className="max-w-lg w-full mx-auto px-5 pt-10 pb-24 flex-1">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-11 h-11 rounded-2xl bg-teal-600 flex items-center justify-center text-white shrink-0">
            <HeartHandshake size={22} />
          </div>
          <div>
            <div className="font-bold text-slate-800 text-lg leading-tight">ShiftCare AI</div>
            <div className="text-xs text-slate-500 leading-tight">介護・看護の現場に寄り添うシフト作成アシスタント</div>
          </div>
        </div>

        {step > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-1 mb-1.5">
              {STEPS.map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-teal-500' : 'bg-slate-200'}`} />
              ))}
            </div>
            <div className="text-xs text-slate-400">STEP {step + 1} / {STEPS.length} ・ {STEPS[step]}</div>
          </div>
        )}

        {step === 0 && (
          <div>
            <h1 className="text-xl font-bold text-slate-800 mb-1">ご利用モードを選択してください</h1>
            <p className="text-sm text-slate-500 mb-6">職種や資格の初期設定が切り替わります。あとから変更もできます。</p>
            <div className="grid grid-cols-2 gap-3 mb-8">
              <ModeCard label="介護モード" active={mode === 'care'} onClick={() => setMode('care')} desc="特養・老健・グループホーム等" />
              <ModeCard label="看護モード" active={mode === 'nursing'} onClick={() => setMode('nursing')} desc="病院・クリニック・看護施設等" />
            </div>
            <Button fullWidth size="lg" onClick={next}>次へ</Button>
            <button
              onClick={startDemo}
              className="w-full mt-3 flex items-center justify-center gap-2 text-teal-700 font-semibold text-sm py-3 rounded-xl hover:bg-teal-50"
            >
              <Sparkles size={16} />
              デモを試す(設定をすべて自動入力)
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <h1 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2"><Building2 size={20} className="text-teal-600" />施設名を入力してください</h1>
            <p className="text-sm text-slate-500 mb-6">あとから変更できます。</p>
            <Field label="施設名">
              <Input value={facilityName} onChange={(e) => setFacilityName(e.target.value)} placeholder="例: さくら介護施設" autoFocus />
            </Field>
            <StepNav onBack={back} onNext={next} onSkipDemo={startDemo} />
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2"><Users size={20} className="text-teal-600" />スタッフを登録しましょう</h1>
            <p className="text-sm text-slate-500 mb-4">最低1名から始められます。あとで「スタッフ管理」からいつでも追加できます。</p>
            <div className="space-y-2 mb-4">
              {state.data.staff.map((s) => (
                <Card key={s.id}><CardBody className="py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: s.color }}>{s.displayName.slice(0,1)}</div>
                  <span className="font-medium text-slate-700">{s.fullName}</span>
                </CardBody></Card>
              ))}
            </div>
            <Button variant="outline" fullWidth icon={<Plus size={16} />} onClick={() => setStaffFormOpen(true)}>スタッフを追加</Button>
            <StaffForm open={staffFormOpen} onClose={() => setStaffFormOpen(false)} editingStaff={null} />
            <StepNav onBack={back} onNext={next} onSkipDemo={startDemo} />
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2"><Tags size={20} className="text-teal-600" />勤務種別を確認してください</h1>
            <p className="text-sm text-slate-500 mb-4">早番・日勤・夜勤などが初期設定されています。「勤務種別設定」画面から自由に追加・編集できます。</p>
            <div className="flex flex-wrap gap-2">
              {state.data.shiftTypes.map((st) => (
                <span key={st.id} className="inline-flex items-center gap-1.5 pl-1.5 pr-3 py-1.5 rounded-full text-sm font-medium text-white" style={{ backgroundColor: st.color }}>
                  <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-xs">{st.shortLabel}</span>
                  {st.name}
                </span>
              ))}
            </div>
            <StepNav onBack={back} onNext={next} onSkipDemo={startDemo} />
          </div>
        )}

        {step === 4 && (
          <div>
            <h1 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2"><ListChecks size={20} className="text-teal-600" />必要人数を設定してください</h1>
            <p className="text-sm text-slate-500 mb-4">勤務種別ごとの最低人数です。日ごとの上書きは「ルール設定」画面から可能です。</p>
            <div className="space-y-3">
              {state.data.shiftTypes.filter((st) => !st.isTimeOff).map((st) => {
                const req = state.data.shiftRequirements.find((r) => r.shiftTypeId === st.id);
                return (
                  <div key={st.id} className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3">
                    <span className="font-medium text-slate-700 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: st.color }}>{st.shortLabel}</span>
                      {st.name}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      className="w-20 text-center"
                      value={req?.defaultMinCount ?? 0}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (req) {
                          dispatch({ type: 'UPSERT_SHIFT_REQUIREMENT', item: { ...req, defaultMinCount: value } });
                        } else {
                          dispatch({
                            type: 'UPSERT_SHIFT_REQUIREMENT',
                            item: { id: `req_${st.id}`, shiftTypeId: st.id, defaultMinCount: value, overrides: {} },
                          });
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <StepNav onBack={back} onNext={next} onSkipDemo={startDemo} />
          </div>
        )}

        {step === 5 && (
          <div>
            <h1 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2"><SlidersHorizontal size={20} className="text-teal-600" />勤務ルールを設定してください</h1>
            <p className="text-sm text-slate-500 mb-4">施設ごとに数値を調整できます。詳細は後から「ルール設定」画面で変更できます。</p>
            <div className="space-y-4">
              <RuleRow
                label="最大連勤数を超えたら警告"
                checked={state.data.facilityRules.maxConsecutiveDaysEnabled}
                onToggle={(v) => dispatch({ type: 'UPDATE_FACILITY_RULES', patch: { maxConsecutiveDaysEnabled: v } })}
                numberValue={state.data.facilityRules.maxConsecutiveDays}
                onNumberChange={(v) => dispatch({ type: 'UPDATE_FACILITY_RULES', patch: { maxConsecutiveDays: v } })}
                unit="日"
              />
              <RuleRow
                label="最低休息時間を下回ったら警告"
                checked={state.data.facilityRules.restIntervalEnabled}
                onToggle={(v) => dispatch({ type: 'UPDATE_FACILITY_RULES', patch: { restIntervalEnabled: v } })}
                numberValue={state.data.facilityRules.minRestHours}
                onNumberChange={(v) => dispatch({ type: 'UPDATE_FACILITY_RULES', patch: { minRestHours: v } })}
                unit="時間"
              />
              <RuleRow
                label="夜勤連続回数を超えたら警告"
                checked={state.data.facilityRules.nightShiftConsecutiveEnabled}
                onToggle={(v) => dispatch({ type: 'UPDATE_FACILITY_RULES', patch: { nightShiftConsecutiveEnabled: v } })}
                numberValue={state.data.facilityRules.maxConsecutiveNightShifts}
                onNumberChange={(v) => dispatch({ type: 'UPDATE_FACILITY_RULES', patch: { maxConsecutiveNightShifts: v } })}
                unit="回"
              />
            </div>
            <div className="mt-8">
              <Button fullWidth size="lg" icon={<Check size={18} />} onClick={next}>設定を完了する</Button>
              <button onClick={back} className="w-full mt-2 flex items-center justify-center gap-1 text-slate-400 text-sm py-2"><ChevronLeft size={14} />戻る</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ModeCard({ label, desc, active, onClick }: { label: string; desc: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-2xl border-2 transition-all ${active ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
    >
      <div className={`font-bold mb-1 ${active ? 'text-teal-700' : 'text-slate-700'}`}>{label}</div>
      <div className="text-xs text-slate-400">{desc}</div>
    </button>
  );
}

function StepNav({ onBack, onNext, onSkipDemo }: { onBack: () => void; onNext: () => void; onSkipDemo: () => void }) {
  return (
    <div className="mt-8">
      <Button fullWidth size="lg" onClick={onNext}>次へ</Button>
      <div className="flex justify-between mt-3">
        <button onClick={onBack} className="flex items-center gap-1 text-slate-400 text-sm py-2 px-1"><ChevronLeft size={14} />戻る</button>
        <button onClick={onSkipDemo} className="flex items-center gap-1.5 text-teal-700 font-semibold text-sm py-2 px-1"><Sparkles size={14} />デモを試す</button>
      </div>
    </div>
  );
}

function RuleRow({
  label,
  checked,
  onToggle,
  numberValue,
  onNumberChange,
  unit,
}: {
  label: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
  numberValue: number;
  onNumberChange: (v: number) => void;
  unit: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
      <Toggle checked={checked} onChange={onToggle} label={label} />
      {checked && (
        <div className="flex items-center gap-1.5 shrink-0">
          <Input type="number" className="w-16 text-center" value={numberValue} onChange={(e) => onNumberChange(Number(e.target.value))} />
          <span className="text-xs text-slate-400">{unit}</span>
        </div>
      )}
    </div>
  );
}
