import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/AppStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Form';
import { useToast } from '../ui/ToastProvider';
import { buildCopyFromPreviousMonth } from '../../engine/copyMonth';
import { shiftYearMonth, formatYearMonthLabel } from '../../utils/date';

export function CopyPreviousMonthModal({
  open,
  onClose,
  yearMonth,
}: {
  open: boolean;
  onClose: () => void;
  yearMonth: string;
}) {
  const { state, dispatch } = useAppStore();
  const { showToast } = useToast();
  const [copyLocks, setCopyLocks] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const prevYearMonth = shiftYearMonth(yearMonth, -1);
  const hasPrevSchedule = !!state.data.schedules[prevYearMonth];

  function run() {
    setIsProcessing(true);
    setTimeout(() => {
      try {
        const assignments = buildCopyFromPreviousMonth(state.data, yearMonth, {
          copyAssignments: true,
          copyLocks,
        });
        if (assignments.length > 0) {
          dispatch({ type: 'BULK_SET_ASSIGNMENTS', yearMonth, assignments });
          showToast(`${assignments.length}件のセルをコピーしました。`, { hint: '「元に戻す」で取り消せます' });
        } else {
          showToast('コピーできるセルがありませんでした(すでに入力済みか、前月にデータがありません)。');
        }
        setIsProcessing(false);
        onClose();
      } catch {
        setIsProcessing(false);
        showToast('コピーに失敗しました。もう一度お試しください。', { tone: 'error' });
      }
    }, 30);
  }

  return (
    <Modal
      open={open}
      onClose={() => !isProcessing && onClose()}
      title="前月からコピー"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isProcessing}>キャンセル</Button>
          <Button
            disabled={!hasPrevSchedule || isProcessing}
            onClick={run}
            icon={isProcessing ? <Loader2 size={15} className="animate-spin" /> : undefined}
          >
            {isProcessing ? 'コピー中...' : 'コピーする'}
          </Button>
        </>
      }
    >
      {!hasPrevSchedule ? (
        <p className="text-sm text-slate-500">{formatYearMonthLabel(prevYearMonth)}のシフトが見つかりませんでした。</p>
      ) : (
        <>
          <p className="text-sm text-slate-600 mb-3">
            {formatYearMonthLabel(prevYearMonth)}の勤務割当を、同じ日番号で{formatYearMonthLabel(yearMonth)}へコピーします
            (例: 前月1日 → 当月1日)。曜日は変わるため、コピー後の見直しをおすすめします。
          </p>
          <p className="text-xs text-slate-400 mb-4">
            すでに入力済みのセルは上書きされません。空いているセルにのみコピーします。
          </p>
          <Checkbox label="ロック状態も引き継ぐ" checked={copyLocks} onChange={setCopyLocks} />
          <div className="mt-4 bg-slate-50 rounded-xl px-3 py-2.5 text-xs text-slate-500">
            スタッフ情報・勤務ルール・必要人数・資格配置ルールは施設全体の設定のため、月をまたいで自動的に共有されています。コピー操作は不要です。
          </div>
        </>
      )}
    </Modal>
  );
}
