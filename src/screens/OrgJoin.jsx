import { useState } from "react";
import { CHAR, UI } from "../data/constants";
import { joinOrganization, createOrganization } from "../lib/db";

/* 初回ログイン時:組織(契約単位)への参加、または新規作成 */
export default function OrgJoin({ onDone }) {
  const [mode, setMode] = useState("join"); // "join" | "create"
  const [code, setCode] = useState("");
  const [orgName, setOrgName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const doJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    const { data, error: err } = await joinOrganization(code.trim());
    setLoading(false);
    if (err || !data) {
      setError("招待コードが見つかりませんでした。管理者に確認してください。");
      return;
    }
    onDone(data.id);
  };

  const doCreate = async () => {
    if (!orgName.trim() || !newCode.trim()) return;
    setLoading(true);
    setError("");
    const { data, error: err } = await createOrganization(orgName.trim(), newCode.trim());
    setLoading(false);
    if (err || !data) {
      setError(err && err.includes("duplicate") ? "そのコードは既に使われています。別のコードにしてください。" : "作成に失敗しました。時間をおいて再度お試しください。");
      return;
    }
    onDone(data.id);
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-900 bg-opacity-95 flex items-center justify-center p-6 overflow-y-auto">
      <div className="w-full bg-gradient-to-b from-white to-slate-50 rounded-3xl p-6 text-center shadow-2xl my-auto">
        <img src={CHAR.point} alt="ケイオスちゃん" className="w-20 h-20 rounded-full object-cover ring-4 ring-amber-300 mx-auto mb-4 shadow-lg" />
        <h2 className="text-lg font-bold text-slate-900 mb-2">組織への参加</h2>
        <p className="text-sm text-slate-600 leading-relaxed mb-5">
          このアプリは組織(会社・施設など)単位で利用します。すでに招待コードをお持ちなら参加、初めての方は新しく組織を作成してください。
        </p>

        <div className="flex bg-slate-100 rounded-xl p-1 mb-5">
          <button onClick={() => setMode("join")} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${mode === "join" ? "bg-white shadow text-indigo-600" : "text-slate-400"}`}>
            招待コードで参加
          </button>
          <button onClick={() => setMode("create")} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${mode === "create" ? "bg-white shadow text-indigo-600" : "text-slate-400"}`}>
            新しく組織を作る
          </button>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg p-3 mb-4 text-left">{error}</p>}

        {mode === "join" ? (
          <div className="space-y-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="招待コードを入力"
              className="w-full bg-slate-50 rounded-xl p-3 text-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-center"
            />
            <button onClick={doJoin} disabled={loading || !code.trim()} className={`w-full py-3 text-sm ${UI.btnPrimary}`}>
              {loading ? "確認中…" : "この組織に参加する"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="組織名(例:〇〇介護施設)"
              className="w-full bg-slate-50 rounded-xl p-3 text-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="招待コードを決める(半角英数字)"
              className="w-full bg-slate-50 rounded-xl p-3 text-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-center"
            />
            <p className="text-xs text-slate-400 leading-relaxed">このコードを同僚に伝えると、同じ組織に参加できます。あなたはこの組織の管理者になります。</p>
            <button onClick={doCreate} disabled={loading || !orgName.trim() || !newCode.trim()} className={`w-full py-3 text-sm ${UI.btnGold}`}>
              {loading ? "作成中…" : "組織を作成する"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
