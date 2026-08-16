import { Moon, CalendarOff, Plane, Ban, Eraser } from 'lucide-react';
import type { Staff } from '../../types/domain';
import { useAppStore } from '../../store/AppStore';
import { Modal } from '../ui/Modal';
import { getWeekdayLabel } from '../../utils/date';

type RequestKind = 'off' | 'paidLeave' | 'work' | 'night' | 'unavailable' | 'clear';

export function RequestEditorModal({
  open,
  onClose,
  staff,
  date,
}: {
  open: boolean;
  onClose: () => void;
  staff: Staff | null;
  date: string | null;
}) {
  const { state, dispatch } = useAppStore();

  if (!open || !staff || !date) return null;

  const nightShiftType = state.data.shiftTypes.find((s) => s.isNightShift);
  const workableShiftTypes = [...state.data.shiftTypes].filter((s) => !s.isTimeOff).sort((a, b) => a.sortOrder - b.sortOrder);
  const currentWork = staff.desiredWorkDates[date];
  const isOff = staff.desiredOffDates.includes(date);
  const isPaidLeave = staff.desiredPaidLeaveDates.includes(date);
  const isUnavailable = staff.unavailableDates.includes(date);

  function apply(kind: RequestKind, shiftTypeId?: string) {
    if (!staff || !date) return;
    const desiredOffDates = staff!.desiredOffDates.filter((d) => d !== date);
    const desiredPaidLeaveDates = staff!.desiredPaidLeaveDates.filter((d) => d !== date);
    const unavailableDates = staff!.unavailableDates.filter((d) => d !== date);
    const desiredWorkDates = { ...staff!.desiredWorkDates };
    delete desiredWorkDates[date];

    if (kind === 'off') desiredOffDates.push(date);
    if (kind === 'paidLeave') desiredPaidLeaveDates.push(date);
    if (kind === 'unavailable') unavailableDates.push(date);
    if (kind === 'work' && shiftTypeId) desiredWorkDates[date] = shiftTypeId;
    if (kind === 'night' && nightShiftType) desiredWorkDates[date] = nightShiftType.id;

    dispatch({
      type: 'UPSERT_STAFF',
      staff: { ...staff!, desiredOffDates, desiredPaidLeaveDates, unavailableDates, desiredWorkDates, updatedAt: new Date().toISOString() },
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={`${Number(date.split('-')[2])}日(${getWeekdayLabel(date)})の希望`}>
      <div className="space-y-2">
        <OptionButton
          icon={<CalendarOff size={18} />}
          label="希望休"
          hint="この日は休みたい"
          active={isOff}
          color="pink"
          onClick={() => apply('off')}
        />
        <OptionButton
          icon={<Plane size={18} />}
          label="有休希望"
          hint="有休を使いたい"
          active={isPaidLeave}
          color="amber"
          onClick={() => apply('paidLeave')}
        />
        {nightShiftType && (
          <OptionButton
            icon={<Moon size={18} />}
            label="夜勤希望"
            hint="この日は夜勤に入りたい"
            active={currentWork === nightShiftType.id}
            color="indigo"
            onClick={() => apply('night')}
          />
        )}
        <OptionButton
          icon={<Ban size={18} />}
          label="勤務不可日"
          hint="どうしても勤務できない(通院等)"
          active={isUnavailable}
          color="rose"
          onClick={() => apply('unavailable')}
        />

        <div className="pt-2">
          <div className="text-xs font-semibold text-slate-500 mb-1.5 px-1">その他の希望勤務を選ぶ</div>
          <div className="grid grid-cols-3 gap-2">
            {workableShiftTypes.map((st) => (
              <button
                key={st.id}
                onClick={() => apply('work', st.id)}
                className={`rounded-xl py-2.5 flex flex-col items-center gap-0.5 text-white font-bold border-2 ${
                  currentWork === st.id ? 'border-slate-700' : 'border-transparent'
                }`}
                style={{ backgroundColor: st.color }}
              >
                <span className="text-sm leading-none">{st.shortLabel}</span>
                <span className="text-[10px] leading-none opacity-90">{st.name}</span>
              </button>
            ))}
          </div>
        </div>

        {(isOff || isPaidLeave || isUnavailable || currentWork) && (
          <button
            onClick={() => apply('clear')}
            className="w-full mt-2 flex items-center justify-center gap-1.5 text-slate-400 text-sm py-2.5 rounded-xl hover:bg-slate-50"
          >
            <Eraser size={14} />
            この日の希望を取り消す
          </button>
        )}
      </div>
    </Modal>
  );
}

const COLOR_CLASSES: Record<string, string> = {
  pink: 'bg-pink-50 text-pink-600 ring-pink-200',
  amber: 'bg-amber-50 text-amber-600 ring-amber-200',
  indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-200',
  rose: 'bg-rose-50 text-rose-600 ring-rose-200',
};

function OptionButton({
  icon,
  label,
  hint,
  active,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-colors ${
        active ? `${COLOR_CLASSES[color]} ring-2` : 'bg-white ring-1 ring-slate-200 hover:bg-slate-50'
      }`}
    >
      <span className={active ? '' : 'text-slate-400'}>{icon}</span>
      <span>
        <span className="block text-sm font-bold text-slate-700">{label}</span>
        <span className="block text-xs text-slate-400">{hint}</span>
      </span>
    </button>
  );
}
