import { useState } from "react";
import { CHAR, UI, INDUSTRIES } from "../data/constants";
import { SectionTitle } from "../components/ui";
import { supabase } from "../lib/supabaseClient";
import { updateSettings } from "../lib/db";

export default function Settings({ userId, userEmail, userName, setUserName, records, setRecords, scores, setScores, industry, setIndustry, sos, setSos }) {
  const [sosName, setSosName] = useState((sos && sos.name) || "");
  const [sosPhone, setSosPhone] = useState((sos && sos.phone) || "");
  const [sosSaved, setSosSaved] = useState(false);
  const [name, setName] = useState(userName);
  const [saved, setSaved] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [wiping, setWiping] = useState(false);

  const saveSos = async () => {
    const v = { name: sosName.trim(), phone: sosPhone.replace(/[^0-9+\-]/g, "") };
    const updated = await updateSettings(userId, { sos_name: v.name, sos_phone: v.phone });
    if (updated) {
      setSos(v);
      setSosSaved(true);
      setTimeout(() => setSosSaved(false), 1500);
    }
  };
  const saveName = async () => {
    const updated = await updateSettings(userId, { user_name: name });
    if (updated) {
      setUserName(name);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };
  const pickIndustry = async (ind) => {
    const updated = await updateSettings(userId, { industry: ind.id });
    if (updated) setIndustry(ind);
  };
  const wipe = async () => {
    setWiping(true);
    await supabase.from("records").delete().eq("user_id", userId);
    await supabase.from("scores").delete().eq("user_id", userId);
    setRecords([]);
    setScores([]);
    setConfirmDel(false);
    setWiping(false);
  };
  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="px-4 pt-5 pb-24">
      <SectionTitle>⚙️ 設定</SectionTitle>

      <div className="rounded-xl p-3 mb-4 text-xs font-bold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
        ✅ データはクラウド(Supabase)に安全に保存され、他の端末からログインしても引き継がれます。
      </div>

      <div className={`${UI.card} p-4 mb-4`}>
        <p className="text-sm font-bold text-slate-700 mb-2">お名前(対応者名の初期値)</p>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例:佐藤 花子"
            className="flex-1 bg-slate-50 rounded-xl p-3 text-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button onClick={saveName} className={`px-4 rounded-xl text-sm font-bold ${saved ? "bg-emerald-100 text-emerald-700" : "bg-gradient-to-r from-indigo-600 to-blue-500 text-white shadow"}`}>
            {saved ? "✓" : "保存"}
          </button>
        </div>
      </div>

      <div className={`${UI.card} p-4 mb-4`}>
        <p className="text-sm font-bold text-slate-700 mb-1">業種別モード</p>
        <p className="text-xs text-slate-500 mb-3">選ぶと、AIのフレーズ・アドバイス・研修シナリオが業種特化になります。</p>
        <div className="grid grid-cols-2 gap-2">
          {INDUSTRIES.map((ind) => (
            <button
              key={ind.id}
              onClick={() => pickIndustry(ind)}
              className={`rounded-xl p-2.5 text-sm font-bold border-2 transition-all text-left ${industry.id === ind.id ? "border-indigo-600 bg-gradient-to-r from-indigo-50 to-sky-50 text-indigo-700 shadow-sm" : "border-slate-200 bg-white text-slate-500"}`}
            >
              {ind.icon} {ind.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`${UI.card} p-4 mb-4`}>
        <p className="text-sm font-bold text-slate-700 mb-1">🚨 緊急連絡先(上司・責任者)</p>
        <p className="text-xs text-slate-500 mb-3">画面右上の「SOS」から、2秒長押しで直接発信できる番号です。</p>
        <div className="space-y-2">
          <input
            value={sosName}
            onChange={(e) => setSosName(e.target.value)}
            placeholder="名前(例:田中店長)"
            className="w-full bg-slate-50 rounded-xl p-3 text-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-2">
            <input
              value={sosPhone}
              onChange={(e) => setSosPhone(e.target.value)}
              placeholder="電話番号(例:09012345678)"
              inputMode="tel"
              className="flex-1 bg-slate-50 rounded-xl p-3 text-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button onClick={saveSos} className={`px-4 rounded-xl text-sm font-bold ${sosSaved ? "bg-emerald-100 text-emerald-700" : "bg-slate-900 text-amber-300"}`}>
              {sosSaved ? "✓" : "保存"}
            </button>
          </div>
        </div>
      </div>

      <div className={`${UI.card} p-4 mb-4`}>
        <p className="text-sm font-bold text-slate-700 mb-2">データの初期化</p>
        <p className="text-xs text-slate-500 mb-3">記録{records.length}件・スコア{scores.length}件をすべて削除します(元に戻せません)。</p>
        {confirmDel ? (
          <div className="flex gap-2">
            <button onClick={wipe} disabled={wiping} className="flex-1 bg-red-500 text-white text-sm font-bold py-2 rounded-xl shadow">
              {wiping ? "削除中…" : "本当に削除する"}
            </button>
            <button onClick={() => setConfirmDel(false)} className="flex-1 bg-slate-100 text-slate-600 text-sm font-bold py-2 rounded-xl">
              やめる
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDel(true)} className="text-red-500 text-sm font-semibold">
            すべての記録・スコアを削除する
          </button>
        )}
      </div>

      <div className={`${UI.card} p-4 mb-4`}>
        <p className="text-sm font-bold text-slate-700 mb-1">アカウント</p>
        <p className="text-xs text-slate-500 mb-3">{userEmail}</p>
        <button onClick={logout} className="text-sm font-semibold text-slate-500">
          ログアウト
        </button>
      </div>

      <div className="relative overflow-hidden rounded-2xl p-4 text-white bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900 shadow-lg">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-300 rounded-full blur-3xl opacity-20 pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <img src={CHAR.normal} alt="ケイオスちゃん" className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-300 shadow" />
          <div>
            <p className="text-sm font-bold">🛡️ 接遇ガードAI</p>
            <p className="text-xs text-blue-200 leading-relaxed mt-1">あなたの安心を、AIが守る。AIの提案は参考情報であり、重大な事案は必ず上司・関係機関にご相談ください。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
