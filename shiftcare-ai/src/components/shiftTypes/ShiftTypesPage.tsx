import { useState } from 'react';
import { Plus, Pencil, Trash2, Moon, Clock } from 'lucide-react';
import { useAppStore, newId } from '../../store/AppStore';
import type { ShiftType } from '../../types/domain';
import { Card, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Field, Input, Checkbox } from '../ui/Form';
import { Modal } from '../ui/Modal';

function emptyShiftType(sortOrder: number): ShiftType {
  return {
    id: newId('st'),
    name: '',
    shortLabel: '',
    isTimeOff: false,
    isNightShift: false,
    isNightShiftFollowUp: false,
    startTime: '09:00',
    endTime: '18:00',
    color: '#38bdf8',
    sortOrder,
  };
}

const COLOR_PALETTE = ['#38bdf8', '#34d399', '#fb923c', '#818cf8', '#c4b5fd', '#d4d4d8', '#fbbf24', '#f9a8d4', '#f87171', '#2dd4bf'];

export function ShiftTypesPage() {
  const { state, dispatch } = useAppStore();
  const shiftTypes = [...state.data.shiftTypes].sort((a, b) => a.sortOrder - b.sortOrder);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ShiftType | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ShiftType | null>(null);
  const [form, setForm] = useState<ShiftType>(emptyShiftType(shiftTypes.length + 1));

  function openNew() {
    setEditing(null);
    setForm(emptyShiftType(shiftTypes.length + 1));
    setFormOpen(true);
  }
  function openEdit(st: ShiftType) {
    setEditing(st);
    setForm(st);
    setFormOpen(true);
  }

  function save() {
    dispatch({ type: 'UPSERT_SHIFT_TYPE', shiftType: form });
    setFormOpen(false);
  }

  const canSave = form.name.trim().length > 0 && form.shortLabel.trim().length > 0;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">勤務種別設定</h1>
          <p className="text-sm text-slate-400 mt-0.5">早番・日勤・夜勤などを自由に追加・編集できます</p>
        </div>
        <Button icon={<Plus size={18} />} onClick={openNew}>勤務種別を追加</Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {shiftTypes.map((st) => (
          <Card key={st.id}>
            <CardBody>
              <div className="flex items-start gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold shrink-0 text-lg"
                  style={{ backgroundColor: st.color }}
                >
                  {st.shortLabel}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800">{st.name}</div>
                  <div className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
                    <Clock size={13} />
                    {st.isTimeOff ? '休み系(時間なし)' : `${st.startTime} - ${st.endTime}`}
                  </div>
                  <div className="flex gap-1 mt-2">
                    {st.isNightShift && <Badge color="violet"><Moon size={12} />夜勤</Badge>}
                    {st.isNightShiftFollowUp && <Badge color="slate">夜勤明け扱い</Badge>}
                    {st.isPreset && <Badge color="teal">初期設定</Badge>}
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => openEdit(st)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-teal-600">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => setConfirmDelete(st)} className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? '勤務種別を編集' : '勤務種別を追加'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>キャンセル</Button>
            <Button disabled={!canSave} onClick={save}>保存する</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="名称 *">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="例: 準夜" />
          </Field>
          <Field label="略称 *" hint="表内に表示">
            <Input maxLength={3} value={form.shortLabel} onChange={(e) => setForm((f) => ({ ...f, shortLabel: e.target.value }))} placeholder="準" />
          </Field>
        </div>

        <Checkbox
          label="休み系の勤務種別(勤務時間を持たない)"
          checked={form.isTimeOff}
          onChange={(v) => setForm((f) => ({ ...f, isTimeOff: v, startTime: v ? null : f.startTime ?? '09:00', endTime: v ? null : f.endTime ?? '18:00' }))}
        />

        {!form.isTimeOff && (
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="開始時刻">
              <Input type="time" value={form.startTime ?? ''} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
            </Field>
            <Field label="終了時刻">
              <Input type="time" value={form.endTime ?? ''} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
            </Field>
          </div>
        )}

        <Checkbox
          label="夜勤として扱う"
          hint="夜勤関連ルール(上限・連続回数など)の対象になります"
          checked={form.isNightShift}
          onChange={(v) => setForm((f) => ({ ...f, isNightShift: v }))}
        />
        <Checkbox
          label="夜勤明けとして扱う"
          hint="前日夜勤者の翌日に自動生成で優先配置されます"
          checked={form.isNightShiftFollowUp}
          onChange={(v) => setForm((f) => ({ ...f, isNightShiftFollowUp: v }))}
        />

        <Field label="表示色">
          <div className="flex gap-2 flex-wrap">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm((f) => ({ ...f, color: c }))}
                className={`w-8 h-8 rounded-full border-2 ${form.color === c ? 'border-slate-700' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </Field>
      </Modal>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl">
            <p className="text-slate-700 font-medium mb-1">「{confirmDelete.name}」を削除しますか？</p>
            <p className="text-sm text-slate-400 mb-4">この勤務種別を使っているセルは空欄になります。</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>キャンセル</Button>
              <Button
                variant="danger"
                onClick={() => {
                  dispatch({ type: 'DELETE_SHIFT_TYPE', shiftTypeId: confirmDelete.id });
                  setConfirmDelete(null);
                }}
              >
                削除する
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
