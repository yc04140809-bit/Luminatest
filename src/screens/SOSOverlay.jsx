import { useState } from "react";
import { HoldButton } from "../components/ui";

export default function SOSOverlay({ sos, onClose }) {
  const [dialed, setDialed] = useState(null);
  const dial = (label, number) => {
    setDialed({ label, number });
    try {
      const a = document.createElement("a");
      a.href = "tel:" + number;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error("dial failed", e);
    }
  };
  const targets = [
    { label: "警察", icon: "🚔", number: "110", desc: "暴力・脅迫・身の危険を感じるとき", cls: "bg-red-600" },
    { label: "救急・消防", icon: "🚑", number: "119", desc: "ケガ・急病・火災", cls: "bg-orange-600" },
  ];
  return (
    <div className="absolute inset-0 z-50 bg-slate-900 bg-opacity-95 flex flex-col p-5 overflow-y-auto">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-white">🚨 緊急コール</h2>
        <button onClick={onClose} className="text-sm text-slate-200 bg-slate-700 px-3 py-1.5 rounded-full">✕ 閉じる</button>
      </div>
      <p className="text-xs text-red-300 font-bold mb-4">ボタンを2秒長押しすると発信します(誤発信防止のため)</p>

      {targets.map((t) => (
        <HoldButton key={t.number} seconds={2} onComplete={() => dial(t.label, t.number)} className={`${t.cls} text-white rounded-2xl p-4 mb-3 text-left shadow-lg w-full`}>
          <p className="text-base font-black">{t.icon} {t.label}({t.number})</p>
          <p className="text-xs mt-0.5" style={{ opacity: 0.9 }}>{t.desc}</p>
        </HoldButton>
      ))}

      {sos && sos.phone ? (
        <HoldButton seconds={2} onComplete={() => dial(sos.name || "上司・責任者", sos.phone)} className="bg-indigo-600 text-white rounded-2xl p-4 mb-3 text-left shadow-lg w-full">
          <p className="text-base font-black">👤 {sos.name || "上司・責任者"}</p>
          <p className="text-xs mt-0.5" style={{ opacity: 0.9 }}>{sos.phone}</p>
        </HoldButton>
      ) : (
        <div className="bg-slate-800 rounded-2xl p-4 mb-3">
          <p className="text-sm text-slate-300 font-bold mb-1">👤 上司・責任者(未登録)</p>
          <p className="text-xs text-slate-400">設定タブ →「🚨 緊急連絡先」で電話番号を登録すると、ここから直接発信できます。</p>
        </div>
      )}

      {dialed && (
        <div className="bg-white rounded-2xl p-4 mb-3">
          <p className="text-sm font-bold text-slate-800 mb-1">📞 {dialed.label}へ発信を試みました</p>
          <p className="text-xs text-slate-500">電話画面が自動で開かない場合は、電話アプリから直接おかけください:</p>
          <p className="text-2xl font-black text-red-600 mt-1 select-all">{dialed.number}</p>
        </div>
      )}

      <div className="bg-slate-800 rounded-2xl p-4 mt-auto">
        <p className="text-xs font-bold text-amber-300 mb-1">⚠️ 危険時の行動原則</p>
        <p className="text-xs text-slate-300 leading-relaxed">
          ①身の安全が最優先。その場を離れてよい
          ②1人で対応しない。周囲に助けを求める
          ③暴力・脅迫・土下座の強要は犯罪。ためらわず110番
          ④落ち着いたら日時・状況を必ず記録する
        </p>
      </div>
    </div>
  );
}
