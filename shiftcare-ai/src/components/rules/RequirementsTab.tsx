import { Plus, Trash2 } from 'lucide-react';
import { useAppStore, newId } from '../../store/AppStore';
import { Card, CardBody } from '../ui/Card';
import { Input, Select } from '../ui/Form';
import { Button } from '../ui/Button';

export function RequirementsTab() {
  const { state, dispatch } = useAppStore();
  const { shiftTypes, shiftRequirements, qualificationRequirements, qualifications, facility } = state.data;
  const workingShiftTypes = shiftTypes.filter((s) => !s.isTimeOff);
  const availableQualifications = qualifications.filter((q) => q.mode === facility.mode || q.mode === 'both');

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-bold text-slate-700 mb-1">必要人数(既定値)</h2>
        <p className="text-xs text-slate-400 mb-3">日ごとの人数変更は「シフト表」のセル編集、または将来的な拡張で対応予定です。</p>
        <div className="space-y-2">
          {workingShiftTypes.map((st) => {
            const req = shiftRequirements.find((r) => r.shiftTypeId === st.id);
            return (
              <Card key={st.id}>
                <CardBody className="py-3 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 font-medium text-slate-700">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: st.color }}>
                      {st.shortLabel}
                    </span>
                    {st.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      className="w-20 text-center"
                      value={req?.defaultMinCount ?? 0}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (req) dispatch({ type: 'UPSERT_SHIFT_REQUIREMENT', item: { ...req, defaultMinCount: value } });
                        else dispatch({ type: 'UPSERT_SHIFT_REQUIREMENT', item: { id: newId('req'), shiftTypeId: st.id, defaultMinCount: value, overrides: {} } });
                      }}
                    />
                    <span className="text-sm text-slate-400">名</span>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-slate-700">資格配置ルール</h2>
          <Button
            size="sm"
            variant="outline"
            icon={<Plus size={14} />}
            onClick={() =>
              dispatch({
                type: 'UPSERT_QUALIFICATION_REQUIREMENT',
                item: {
                  id: newId('qreq'),
                  shiftTypeId: workingShiftTypes[0]?.id ?? '',
                  qualificationId: availableQualifications[0]?.id ?? '',
                  minCount: 1,
                },
              })
            }
          >
            追加
          </Button>
        </div>
        <p className="text-xs text-slate-400 mb-3">勤務帯ごとに必要な資格・最低人数を設定します。</p>
        <div className="space-y-2">
          {qualificationRequirements.map((qreq) => (
            <Card key={qreq.id}>
              <CardBody className="py-3 flex items-center gap-2 flex-wrap">
                <Select
                  className="flex-1 min-w-[120px]"
                  value={qreq.shiftTypeId}
                  onChange={(e) => dispatch({ type: 'UPSERT_QUALIFICATION_REQUIREMENT', item: { ...qreq, shiftTypeId: e.target.value } })}
                >
                  {workingShiftTypes.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </Select>
                <Select
                  className="flex-1 min-w-[120px]"
                  value={qreq.qualificationId}
                  onChange={(e) => dispatch({ type: 'UPSERT_QUALIFICATION_REQUIREMENT', item: { ...qreq, qualificationId: e.target.value } })}
                >
                  {availableQualifications.map((q) => (
                    <option key={q.id} value={q.id}>{q.name}</option>
                  ))}
                </Select>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={1}
                    className="w-16 text-center"
                    value={qreq.minCount}
                    onChange={(e) => dispatch({ type: 'UPSERT_QUALIFICATION_REQUIREMENT', item: { ...qreq, minCount: Number(e.target.value) } })}
                  />
                  <span className="text-xs text-slate-400">名以上</span>
                </div>
                <button
                  onClick={() => dispatch({ type: 'DELETE_QUALIFICATION_REQUIREMENT', id: qreq.id })}
                  className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 ml-auto"
                >
                  <Trash2 size={16} />
                </button>
              </CardBody>
            </Card>
          ))}
          {qualificationRequirements.length === 0 && (
            <div className="text-center text-slate-400 text-sm py-8">資格配置ルールはまだありません。</div>
          )}
        </div>
      </section>
    </div>
  );
}
