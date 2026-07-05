import { useState, useEffect } from "react";
import { CHAR, UI, INDUSTRIES } from "../data/constants";
import { Spinner } from "../components/ui";
import { callClaude, parseJSON } from "../lib/claude";
import { aiErrorMessage } from "../lib/utils";
import { fetchSharedCases, insertSharedCase, deleteSharedCase, reportCase } from "../lib/db";

export default function Cases({ userId, orgId, isAdmin, industry, onBack, onPractice }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // list | form | check
  const [filter, setFilter] = useState("all");
  const emptyForm = { industry: (industry && industry.id) || "general", situation: "", summary: "", response: "", result: "" };
  const [form, setForm] = useState(emptyForm);
  const [checking, setChecking] = useState(false);
  const [cleaned, setCleaned] = useState(null);
  const [err, setErr] = useState("");
  const [posting, setPosting] = useState(false);
  const [shareWarn, setShareWarn] = useState(false);
  const [reportedIds, setReportedIds] = useState([]);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState("");

  useEffect(() => {
    (async () => {
      setCases(await fetchSharedCases());
      setLoading(false);
    })();
  }, []);

  const aiCheck = async () => {
    if (!form.situation.trim() || !form.summary.trim()) {
      setErr("「状況タイトル」と「何が起きたか」は必須です");
      return;
    }
    setChecking(true);
    setErr("");
    setCleaned(null);
    const { text, error } = await callClaude(
      [{ role: "user", content: `以下はクレーム対応の体験談投稿です。公開前の匿名化チェックと修正をしてください。
ルール:
- 個人名は必ずイニシャル表記に(例:「Aさん」「B様」)
- 企業・施設・店舗・商品名は「当施設」「当店」等の一般名詞に置換
- 特定につながる地名・詳細な日時は曖昧化
- 誹謗中傷・攻撃的表現は事実ベースの中立表現に修正
- 匿名化しても公開に不適切な場合(著しい攻撃性・犯罪の助長等)は ok を false に

状況タイトル:${form.situation}
何が起きたか:${form.summary}
どう対応したか:${form.response}
結果:${form.result}

JSONのみで回答:{"ok":true/false,"reason":"NGの場合の理由","situation":"修正後","summary":"修正後","response":"修正後","result":"修正後"}` }],
      "あなたは個人情報保護と公開コンテンツ審査の専門家です。回答はJSONのみ。",
      900
    );
    const r = parseJSON(text);
    if (r && r.ok === true) {
      setCleaned(r);
      setView("check");
    } else if (r && r.ok === false) setErr("この内容は公開できません:" + (r.reason || "内容を見直してください"));
    else setErr(aiErrorMessage(error));
    setChecking(false);
  };

  const post = async () => {
    setPosting(true);
    const entry = { industry: form.industry, situation: cleaned.situation, summary: cleaned.summary, response: cleaned.response || "", result: cleaned.result || "" };
    const saved = await insertSharedCase(entry, userId, orgId);
    if (saved) {
      setCases([saved, ...cases]);
      setShareWarn(false);
    } else {
      setShareWarn(true);
    }
    setForm(emptyForm);
    setCleaned(null);
    setPosting(false);
    setView("list");
  };

  const removeCase = async (id) => {
    const ok = await deleteSharedCase(id, userId, orgId);
    if (ok) setCases(cases.filter((c) => c.id !== id));
  };

  const submitReport = async () => {
    if (!reportTarget) return;
    const ok = await reportCase(reportTarget.id, orgId, userId, reportReason.trim());
    if (ok) setReportedIds([...reportedIds, reportTarget.id]);
    setReportTarget(null);
    setReportReason("");
  };

  const toScenario = (c) => ({
    id: "case-" + c.id,
    fromCase: true,
    title: c.situation,
    desc: c.summary.slice(0, 60) + (c.summary.length > 60 ? "…" : ""),
    time: "約8分",
    caseText: `実例の内容:${c.summary}` + (c.response ? `\n実際の対応:${c.response}` : "") + (c.result ? `\n結果:${c.result}` : ""),
  });

  const indOf = (id) => INDUSTRIES.find((x) => x.id === id) || INDUSTRIES[0];
  const filtered = filter === "all" ? cases : cases.filter((c) => c.industry === filter);

  if (view === "list")
    return (
      <div className="pb-24">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 text-white px-4 pt-4 pb-5 shadow-md">
          <button onClick={onBack} className="text-amber-200 text-sm mb-2">← ホームに戻る</button>
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-lg font-bold">🌐 みんなのケース共有</h1>
              <p className="text-xs text-blue-200 mt-1">同じ組織のメンバーの実例から学ぶ・そのまま練習できる</p>
            </div>
            <button onClick={() => { setErr(""); setView("form"); }} className={`${UI.btnGold} px-4 py-2 text-xs shrink-0`}>＋ 投稿する</button>
          </div>
        </div>

        {shareWarn && <p className="mx-4 mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg p-3">⚠️ 投稿の保存に失敗しました。通信環境を確認して再度お試しください。</p>}

        <div className="px-4 mt-4 flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilter("all")}
            className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${filter === "all" ? "bg-slate-900 text-amber-300" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}
          >
            すべて
          </button>
          {INDUSTRIES.map((i) => (
            <button
              key={i.id}
              onClick={() => setFilter(i.id)}
              className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${filter === i.id ? "bg-slate-900 text-amber-300" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}
            >
              {i.icon} {i.label}
            </button>
          ))}
        </div>

        <div className="px-4 mt-3 space-y-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : filtered.length === 0 ? (
            <div className={`${UI.card} p-6 text-center`}>
              <img src={CHAR.point} alt="" className="w-14 h-14 rounded-full object-cover ring-2 ring-amber-300 mx-auto mb-3" />
              <p className="text-sm text-slate-600 font-semibold mb-1">まだ投稿がありません</p>
              <p className="text-xs text-slate-400">
                あなたの経験が、誰かの現場を守ります。
                <br />
                最初の投稿者になりませんか?
              </p>
            </div>
          ) : (
            filtered.map((c) => (
              <div key={c.id} className={`${UI.card} p-4`}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                    {indOf(c.industry).icon} {indOf(c.industry).label}
                  </span>
                  <span className="text-xs text-slate-400">{new Date(c.date).toLocaleDateString("ja-JP")}</span>
                </div>
                <p className="text-sm font-bold text-slate-800 mb-1">{c.situation}</p>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap mb-2">{c.summary}</p>
                {c.response && (
                  <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2 mb-1">
                    <span className="font-bold text-indigo-600">対応:</span>
                    {c.response}
                  </p>
                )}
                {c.result && (
                  <p className="text-xs text-slate-600 bg-emerald-50 rounded-lg p-2 mb-2">
                    <span className="font-bold text-emerald-600">結果:</span>
                    {c.result}
                  </p>
                )}
                <button onClick={() => onPractice(toScenario(c))} className={`${UI.btnPrimary} w-full py-2.5 text-xs mt-1`}>
                  🎓 このケースで練習する
                </button>
                <div className="flex justify-end gap-3 mt-2">
                  {isAdmin && (
                    <button onClick={() => removeCase(c.id)} className="text-xs text-red-500 font-semibold">
                      🗑 削除(管理者)
                    </button>
                  )}
                  <button
                    onClick={() => setReportTarget(c)}
                    disabled={reportedIds.includes(c.id)}
                    className="text-xs text-slate-400 font-semibold disabled:opacity-50"
                  >
                    {reportedIds.includes(c.id) ? "🚩 通報済み" : "🚩 通報する"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {reportTarget && (
          <div className="fixed inset-0 z-50 bg-slate-900 bg-opacity-70 flex items-center justify-center p-6">
            <div className="w-full max-w-xs bg-white rounded-2xl p-5 shadow-2xl">
              <p className="text-sm font-bold text-slate-800 mb-1">🚩 この投稿を通報しますか?</p>
              <p className="text-xs text-slate-500 mb-3">「{reportTarget.situation}」を管理者に報告します。理由があれば入力してください(任意)。</p>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="通報理由(任意)"
                className="w-full bg-slate-50 rounded-xl p-3 text-sm ring-1 ring-slate-200 outline-none h-20 mb-3"
              />
              <div className="flex gap-2">
                <button onClick={() => { setReportTarget(null); setReportReason(""); }} className="flex-1 bg-slate-100 text-slate-600 text-sm font-bold py-2 rounded-xl">
                  キャンセル
                </button>
                <button onClick={submitReport} className="flex-1 bg-red-500 text-white text-sm font-bold py-2 rounded-xl">
                  通報する
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );

  if (view === "form")
    return (
      <div className="px-4 pt-4 pb-24">
        <button onClick={() => setView("list")} className="text-indigo-600 text-sm mb-3">← 一覧に戻る</button>
        <h2 className="text-base font-bold text-slate-800 mb-2">📝 ケースを投稿する</h2>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <p className="text-xs text-amber-800 leading-relaxed">
            ⚠️ 投稿は<b>あなたと同じ組織のメンバーに公開</b>されます(組織外には公開されません)。個人名はイニシャル(Aさん等)で記入し、施設名・実名・特定できる情報は書かないでください。公開前にAIが自動で匿名化チェックを行います。
          </p>
        </div>
        {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg p-3 mb-3">{err}</p>}
        <div className="space-y-3">
          <select
            value={form.industry}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
            className="w-full bg-white rounded-xl p-3 text-sm ring-1 ring-slate-200 outline-none"
          >
            {INDUSTRIES.map((i) => (
              <option key={i.id} value={i.id}>
                {i.icon} {i.label}
              </option>
            ))}
          </select>
          <input
            value={form.situation}
            onChange={(e) => setForm({ ...form, situation: e.target.value })}
            placeholder="状況タイトル(例:退去をほのめかす強い苦情)※必須"
            className="w-full bg-white rounded-xl p-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <textarea
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            placeholder="何が起きたか(例:Aさんのご家族から、面会時間の対応について強い口調で…)※必須"
            className="w-full bg-white rounded-xl p-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-24"
          />
          <textarea
            value={form.response}
            onChange={(e) => setForm({ ...form, response: e.target.value })}
            placeholder="どう対応したか(任意)"
            className="w-full bg-white rounded-xl p-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-20"
          />
          <textarea
            value={form.result}
            onChange={(e) => setForm({ ...form, result: e.target.value })}
            placeholder="結果どうなったか(任意)"
            className="w-full bg-white rounded-xl p-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-20"
          />
          <button onClick={aiCheck} disabled={checking} className={`${UI.btnPrimary} w-full py-3 text-sm flex items-center justify-center gap-2`}>
            {checking ? (
              <>
                <Spinner light /> AIが匿名化チェック中…
              </>
            ) : (
              "🛡️ AIチェックに進む(公開前の匿名化)"
            )}
          </button>
        </div>
      </div>
    );

  return (
    <div className="px-4 pt-4 pb-24">
      <button onClick={() => setView("form")} className="text-indigo-600 text-sm mb-3">← 修正する</button>
      <h2 className="text-base font-bold text-slate-800 mb-2">✅ 公開内容の最終確認</h2>
      <p className="text-xs text-slate-500 mb-3">AIが匿名化済みの内容です。この形で同じ組織のメンバーに公開されます。</p>
      <div className={`${UI.card} p-4 space-y-2 mb-4`}>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">🛡️ AI匿名化チェック済み</span>
        {[["状況", cleaned.situation], ["内容", cleaned.summary], ["対応", cleaned.response], ["結果", cleaned.result]].map(([k, v]) =>
          v ? (
            <div key={k} className="flex gap-3 py-1 border-b border-slate-50 last:border-0">
              <p className="text-xs font-bold text-indigo-600 w-8 shrink-0 pt-0.5">{k}</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{v}</p>
            </div>
          ) : null
        )}
      </div>
      <button onClick={post} disabled={posting} className={`${UI.btnGold} w-full py-3 text-sm`}>
        {posting ? "投稿中…" : "🌐 この内容で公開する"}
      </button>
    </div>
  );
}
