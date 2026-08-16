import React, { useState } from 'react';
import type { EmploymentType, Staff, WeekdayIndex } from '../../types/domain';
import { WEEKDAYS } from '../../types/domain';
import { useAppStore, newId } from '../../store/AppStore';
import { Field, Input, Select, Textarea, Checkbox, Toggle } from '../ui/Form';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

const EMPLOYMENT_TYPES: EmploymentType[] = ['常勤', '非常勤', 'パート', '派遣', 'その他'];
const STAFF_COLORS = ['#f472b6', '#6366f1', '#22c55e', '#f59e0b', '#0ea5e9', '#14b8a6', '#a855f7', '#84cc16', '#ef4444', '#f97316'];

function emptyStaff(): Staff {
  const now = new Date().toISOString();
  return {
    id: newId('staff'),
    fullName: '',
    displayName: '',
    jobRoleIds: [],
    employmentType: '常勤',
    qualificationIds: [],
    availability: {
      canWorkNight: true,
      maxNightShiftsPerMonth: null,
      maxShiftsPerWeek: null,
      targetShiftsPerMonth: null,
      restrictedWeekdays: [],
      availableTimeNote: '',
    },
    desiredOffDates: [],
    desiredPaidLeaveDates: [],
    unavailableDates: [],
    desiredWorkDates: {},
    note: '',
    active: true,
    isNightSpecialist: false,
    color: STAFF_COLORS[Math.floor(Math.random() * STAFF_COLORS.length)],
    createdAt: now,
    updatedAt: now,
  };
}

export function StaffForm({
  open,
  onClose,
  editingStaff,
}: {
  open: boolean;
  onClose: () => void;
  editingStaff: Staff | null;
}) {
  const { state, dispatch } = useAppStore();
  const mode = state.data.facility.mode;
  const [form, setForm] = useState<Staff>(() => editingStaff ?? emptyStaff());

  React.useEffect(() => {
    if (open) setForm(editingStaff ?? emptyStaff());
  }, [open, editingStaff, mode]);

  const jobRoles = state.data.jobRoles.filter((r) => r.mode === mode || r.mode === 'both');
  const qualifications = state.data.qualifications.filter((q) => q.mode === mode || q.mode === 'both');

  const canSave = form.fullName.trim().length > 0 && form.displayName.trim().length > 0;

  function toggleWeekday(wd: WeekdayIndex) {
    setForm((f) => ({
      ...f,
      availability: {
        ...f.availability,
        restrictedWeekdays: f.availability.restrictedWeekdays.includes(wd)
          ? f.availability.restrictedWeekdays.filter((w) => w !== wd)
          : [...f.availability.restrictedWeekdays, wd],
      },
    }));
  }

  function toggleJobRole(id: string) {
    setForm((f) => ({
      ...f,
      jobRoleIds: f.jobRoleIds.includes(id) ? f.jobRoleIds.filter((r) => r !== id) : [...f.jobRoleIds, id],
    }));
  }

  function toggleQualification(id: string) {
    setForm((f) => ({
      ...f,
      qualificationIds: f.qualificationIds.includes(id)
        ? f.qualificationIds.filter((q) => q !== id)
        : [...f.qualificationIds, id],
    }));
  }

  function save() {
    dispatch({ type: 'UPSERT_STAFF', staff: { ...form, updatedAt: new Date().toISOString() } });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingStaff ? 'スタッフを編集' : 'スタッフを登録'}
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>キャンセル</Button>
          <Button variant="primary" disabled={!canSave} onClick={save}>保存する</Button>
        </>
      }
    >
      <div className="grid sm:grid-cols-2 gap-x-5">
        <Field label="氏名 *">
          <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="田中 花子" />
        </Field>
        <Field label="表示名 *" hint="シフト表に表示される短い名前">
          <Input value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} placeholder="田中" />
        </Field>
      </div>

      <Field label="職種(複数選択可)">
        <div className="flex flex-wrap gap-2">
          {jobRoles.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => toggleJobRole(role.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                form.jobRoleIds.includes(role.id)
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {role.name}
            </button>
          ))}
        </div>
      </Field>

      <Field label="雇用形態">
        <Select value={form.employmentType} onChange={(e) => setForm((f) => ({ ...f, employmentType: e.target.value as EmploymentType }))}>
          {EMPLOYMENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
      </Field>

      <Field label="保有資格(複数選択可)">
        <div className="flex flex-wrap gap-2">
          {qualifications.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => toggleQualification(q.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                form.qualificationIds.includes(q.id)
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {q.name}
            </button>
          ))}
        </div>
      </Field>

      <Field label="勤務可能時間(自由記述)">
        <Input
          value={form.availability.availableTimeNote}
          onChange={(e) => setForm((f) => ({ ...f, availability: { ...f.availability, availableTimeNote: e.target.value } }))}
          placeholder="例: 平日9-17時のみ可"
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-x-5">
        <Field label="夜勤">
          <Toggle
            checked={form.availability.canWorkNight}
            onChange={(v) => setForm((f) => ({ ...f, availability: { ...f.availability, canWorkNight: v } }))}
            label={form.availability.canWorkNight ? '可能' : '不可'}
          />
        </Field>
        <Field label="夜勤専従(公平性判定から除外)">
          <Toggle checked={form.isNightSpecialist} onChange={(v) => setForm((f) => ({ ...f, isNightSpecialist: v }))} label={form.isNightSpecialist ? '専従' : '通常'} />
        </Field>
      </div>

      <div className="grid sm:grid-cols-3 gap-x-5">
        <Field label="夜勤回数上限(月)" hint="空欄=上限なし">
          <Input
            type="number"
            min={0}
            value={form.availability.maxNightShiftsPerMonth ?? ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                availability: { ...f.availability, maxNightShiftsPerMonth: e.target.value === '' ? null : Number(e.target.value) },
              }))
            }
          />
        </Field>
        <Field label="週勤務回数上限" hint="空欄=上限なし">
          <Input
            type="number"
            min={0}
            value={form.availability.maxShiftsPerWeek ?? ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                availability: { ...f.availability, maxShiftsPerWeek: e.target.value === '' ? null : Number(e.target.value) },
              }))
            }
          />
        </Field>
        <Field label="月勤務回数目安" hint="空欄=指定なし">
          <Input
            type="number"
            min={0}
            value={form.availability.targetShiftsPerMonth ?? ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                availability: { ...f.availability, targetShiftsPerMonth: e.target.value === '' ? null : Number(e.target.value) },
              }))
            }
          />
        </Field>
      </div>

      <Field label="曜日制限(勤務不可の曜日)">
        <div className="flex gap-1.5 flex-wrap">
          {WEEKDAYS.map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() => toggleWeekday(idx as WeekdayIndex)}
              className={`w-10 h-10 rounded-full text-sm font-bold border transition-colors ${
                form.availability.restrictedWeekdays.includes(idx as WeekdayIndex)
                  ? 'bg-rose-500 text-white border-rose-500'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="備考">
        <Textarea rows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
      </Field>

      <Checkbox label="在籍中" checked={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} />
    </Modal>
  );
}
