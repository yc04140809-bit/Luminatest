import { useState } from 'react';
import { MessageCircleHeart, Check } from 'lucide-react';
import { useAppStore, newId } from '../../store/AppStore';
import type { FeedbackResponse } from '../../types/domain';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Form';

const WANT_TO_USE_OPTIONS: { value: FeedbackResponse['wantToUse']; label: string }[] = [
  { value: 'yes', label: 'ぜひ使いたい' },
  { value: 'ifImproved', label: '改善されれば使いたい' },
  { value: 'no', label: '今のところ使わない' },
];

export function FeedbackWidget() {
  const { dispatch } = useAppStore();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [wantToUse, setWantToUse] = useState<FeedbackResponse['wantToUse'] | null>(null);
  const [favoriteFeature, setFavoriteFeature] = useState('');
  const [biggestPain, setBiggestPain] = useState('');

  function reset() {
    setSubmitted(false);
    setWantToUse(null);
    setFavoriteFeature('');
    setBiggestPain('');
  }

  function close() {
    setOpen(false);
    setTimeout(reset, 300);
  }

  function submit() {
    if (!wantToUse) return;
    dispatch({
      type: 'ADD_FEEDBACK_RESPONSE',
      item: {
        id: newId('feedback'),
        wantToUse,
        favoriteFeature: favoriteFeature.trim(),
        biggestPain: biggestPain.trim(),
        createdAt: new Date().toISOString(),
      },
    });
    setSubmitted(true);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-3 bottom-[76px] sm:right-4 sm:bottom-6 z-40 flex items-center justify-center gap-1.5 bg-slate-800/90 text-white shadow-lg hover:bg-slate-700 transition-colors w-11 h-11 rounded-full sm:w-auto sm:h-auto sm:pl-3.5 sm:pr-4 sm:py-3 sm:rounded-full"
        aria-label="感想を送る"
      >
        <MessageCircleHeart size={18} />
        <span className="hidden sm:inline text-sm font-semibold">感想を送る</span>
      </button>

      <Modal open={open} onClose={close} title={submitted ? 'ありがとうございました' : '使ってみた感想を教えてください'}>
        {submitted ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-4">
              <Check size={28} />
            </div>
            <p className="text-slate-600 text-sm mb-6">回答ありがとうございました。今後の改善に役立てます。</p>
            <Button fullWidth onClick={close}>閉じる</Button>
          </div>
        ) : (
          <div>
            <div className="mb-5">
              <div className="text-sm font-bold text-slate-700 mb-2">① このアプリ、実際に使いたいと思いましたか？</div>
              <div className="space-y-2">
                {WANT_TO_USE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setWantToUse(opt.value)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                      wantToUse === opt.value ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <div className="text-sm font-bold text-slate-700 mb-2">② 一番便利だと思った機能は？</div>
              <Textarea rows={2} value={favoriteFeature} onChange={(e) => setFavoriteFeature(e.target.value)} placeholder="自由入力(任意)" />
            </div>

            <div className="mb-2">
              <div className="text-sm font-bold text-slate-700 mb-2">③ 今のシフト作成で一番面倒なことは？</div>
              <Textarea rows={2} value={biggestPain} onChange={(e) => setBiggestPain(e.target.value)} placeholder="自由入力(任意)" />
            </div>

            <Button fullWidth size="lg" className="mt-4" disabled={!wantToUse} onClick={submit}>
              回答を送信する
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
