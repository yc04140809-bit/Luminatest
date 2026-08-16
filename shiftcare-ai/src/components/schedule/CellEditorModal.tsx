import { useState, useEffect } from 'react';
import { Lock, Unlock, CalendarOff, CalendarCheck2, Trash2 } from 'lucide-react';
import { useAppStore, newId } from '../../store/AppStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Form';
import { getWeekdayLabel } from '../../utils/date';

export function CellEditorModal({
  open,
  onClose,
  yearMonth,
  staffId,
  date,
}: {
  open: boolean;
  onClose: () => void;
  yearMonth: string;
  staffId: string | null;
  date: string | null;
}) {
  const { state, dispatch } = useAppStore();
  const staff = state.data.staff.find((s) => s.id === staffId);
  const schedule = state.data.schedules[yearMonth];
  const assignment = staffId && date ? schedule?.assignments[`${staffId}__${date}`] : undefined;
  const shiftTypes = [...state.data.shiftTypes].sort((a, b) => a.sortOrder - b.sortOrder);

  const existingNote = state.data.dayNotes.find((n) => n.staffId === staffId && n.date === date);
  const [noteText, setNoteText] = useState(existingNote?.text ?? '');

  useEffect(() => {
    setNoteText(existingNote?.text ?? '');
  }, [existingNote, staffId, date]);

  if (!open || !staff || !date) return null;

  const isDesiredOff = staff.desiredOffDates.includes(date);
  const locked = assignment?.locked ?? false;

  function setShift(shiftTypeId: string | null) {
    if (!staffId || !date) return;
    dispatch({ type: 'SET_ASSIGNMENT', yearMonth, staffId, date, shiftTypeId });
  }

  function toggleLock() {
    if (!staffId || !date) return;
    dispatch({ type: 'TOGGLE_LOCK', yearMonth, staffId, date });
  }

  function toggleDesiredOff() {
    if (!staff || !date) return;
    const next = isDesiredOff ? staff.desiredOffDates.filter((d) => d !== date) : [...staff.desiredOffDates, date];
    dispatch({ type: 'UPSERT_STAFF', staff: { ...staff, desiredOffDates: next, updatedAt: new Date().toISOString() } });
  }

  function saveNote() {
    if (!staffId || !date) return;
    if (!noteText.trim()) {
      if (existingNote) dispatch({ type: 'DELETE_DAY_NOTE', id: existingNote.id });
      return;
    }
    dispatch({
      type: 'UPSERT_DAY_NOTE',
      item: existingNote ? { ...existingNote, text: noteText } : { id: newId('note'), staffId, date, text: noteText },
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={`${staff.displayName}さん・${Number(date.split('-')[2])}日(${getWeekdayLabel(date)})`}>
      <div className="mb-4">
        <div className="text-sm font-semibold text-slate-700 mb-2">勤務種別を選択</div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setShift(null)}
            disabled={locked}
            className={`aspect-square rounded-xl border-2 flex items-center justify-center text-xs font-medium text-slate-400 disabled:opacity-40 ${
              !assignment?.shiftTypeId ? 'border-slate-400 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            未設定
          </button>
          {shiftTypes.map((st) => (
            <button
              key={st.id}
              onClick={() => setShift(st.id)}
              disabled={locked}
              className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 text-white font-bold disabled:opacity-40 transition-transform active:scale-95 ${
                assignment?.shiftTypeId === st.id ? 'border-slate-700 scale-105' : 'border-transparent'
              }`}
              style={{ backgroundColor: st.color }}
            >
              <span className="text-base leading-none">{st.shortLabel}</span>
              <span className="text-[10px] leading-none opacity-90">{st.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Button variant={locked ? 'primary' : 'outline'} size="sm" icon={locked ? <Lock size={14} /> : <Unlock size={14} />} onClick={toggleLock} className="flex-1">
          {locked ? 'ロック中' : 'ロックする'}
        </Button>
        <Button
          variant={isDesiredOff ? 'primary' : 'outline'}
          size="sm"
          icon={isDesiredOff ? <CalendarCheck2 size={14} /> : <CalendarOff size={14} />}
          onClick={toggleDesiredOff}
          className="flex-1"
        >
          {isDesiredOff ? '希望休 設定済み' : 'この日を希望休にする'}
        </Button>
      </div>

      <div>
        <div className="text-sm font-semibold text-slate-700 mb-1.5">メモ</div>
        <Textarea
          rows={2}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onBlur={saveNote}
          placeholder="例: 研修、受診、会議、新人同行 など"
        />
      </div>

      {assignment?.shiftTypeId && !locked && (
        <button
          onClick={() => setShift(null)}
          className="mt-4 w-full flex items-center justify-center gap-1.5 text-rose-500 text-sm font-medium py-2 rounded-xl hover:bg-rose-50"
        >
          <Trash2 size={14} />
          この勤務をクリア
        </button>
      )}
    </Modal>
  );
}
