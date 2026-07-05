import { useState, useEffect } from "react";
import { UI, STATUS } from "../data/constants";
import { SectionTitle, CopyBtn, Spinner, ChaosBubble } from "../components/ui";
import { callClaude } from "../lib/claude";
import { aiErrorMessage } from "../lib/utils";
import { insertRecord, updateRecordStatus, deleteRecord } from "../lib/db";

/* 記録→テキスト形式 */
function recordsToText(records) {
  const lines = [`【接遇ガードAI 対応記録】全${records.length}件`, ""];
  records.forEach((r, i) => {
    lines.push(`■ ${i + 1}. ${r.situation || "記録"}(${STATUS[r.status].label})`);
    lines.push(`日時:${new Date(r.date).toLocaleString("ja-JP")}`);
    if (r.place) lines.push(`場所:${r.place}`);
    if (r.person) lines.push(`相手:${r.person}`);
    if (r.staff) lines.push(`対応者:${r.staff}`);
    lines.push(`内容:${r.content}`);
    if (r.result) lines.push(`結果:${r.result}`);
    lines.push("");
  });
  return lines.join("\n");
}
/* 記録→CSV形式(Excel貼り付け用) */
function recordsToCSV(records) {
  const esc = (v) => `"${String(v || "").replace(/"/g, '""')}"`;
  const head = ["日時", "状況", "場所", "相手", "対応者", "内容", "結果", "状態"].join(",");
  const rows = records.map((r) =>
    [new Date(r.date).toLocaleString("ja-JP"), r.situation, r.place, r.person, r.staff, r.content, r.result, STATUS[r.status].label].map(esc).join(",")
  );
  return [head, ...rows].join("\n");
}

export default function Records({ userId, records, setRecords, draft, clearDraft, userName }) {
  const [view, setView] = useState(draft ? "form" : "list");
  const [current, setCurrent] = useState(null);
  const empty = { situation: draft ? draft.title : "", place: "", person: "", staff: userName || "", content: "", result: "", status: "open" };
  const [form, setForm] = useState(empty);
  const [report, setReport] = useState("");
  const [repLoading, setRepLoading] = useState(false);
  const [repError, setRepError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (draft) {
      setForm((f) => ({ ...f, situation: draft.title }));
      setView("form");
    }
  }, [draft]);

  const filtered = records.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (!query.trim()) return true;
    const q = query.trim();
    return [r.situation, r.content, r.place, r.person, r.staff, r.result].some((v) => (v || "").includes(q));
  });

  const save = async () => {
    if (!form.content.trim()) return;
    const rec = { ...form, date: new Date().toISOString() };
    const saved = await insertRecord(userId, rec);
    if (saved) setRecords([saved, ...records]);
    setForm(empty);
    clearDraft();
    setView("list");
  };
  const updateStatus = async (id, status) => {
    const ok = await updateRecordStatus(id, status);
    if (ok) {
      const next = records.map((r) => (r.id === id ? { ...r, status } : r));
      setRecords(next);
      if (current) setCurrent({ ...current, status });
    }
  };
  const removeRecord = async (id) => {
    const ok = await deleteRecord(id);
    if (ok) {
      setRecords(records.filter((r) => r.id !== id));
      setView("list");
      setCurrent(null);
    }
  };
  const genReport = async (rec) => {
    setRepLoading(true);
    setReport("");
    setRepError("");
    const d = new Date(rec.date);
    const { text, error } = await callClaude(
      [{ role: "user", content: `以下のクレーム対応記録をもとに、上司へ提出する報告文を日本語で作成してください。【日時】【場所】【相手】【内容】【対応】【結果】【所感】の項目立てで、簡潔かつビジネス文書として適切に。300字程度。\n\n日時:${d.toLocaleString("ja-JP")}\n場所:${rec.place || "未記入"}\n相手の属性:${rec.person || "未記入"}\n対応者:${rec.staff || "未記入"}\n状況:${rec.situation}\n対応内容:${rec.content}\n対応・結果:${rec.result || "未記入"}` }],
      "あなたは日本企業の報告書作成の専門家です。事実を整理し、読みやすい報告文を作成します。",
      800
    );
    if (text) setReport(text);
    else setRepError(aiErrorMessage(error));
    setRepLoading(false);
  };

  if (view === "list")
    return (
      <div className="px-4 pt-5 pb-24">
        <SectionTitle
          right={
            <button onClick={() => { setForm(empty); setView("form"); }} className={`text-xs px-4 py-2 ${UI.btnPrimary}`}>
              ＋ 新規記録
            </button>
          }
        >
          クレーム記録
        </SectionTitle>

        {records.length > 0 && (
          <>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍 キーワード検索(内容・場所・相手など)"
              className="w-full bg-white rounded-xl p-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none mb-2 shadow-sm"
            />
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {[["all", "すべて"], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])].map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${filter === k ? "bg-gradient-to-r from-indigo-600 to-blue-500 text-white shadow" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              <CopyBtn text={recordsToText(filtered)} label={`📋 テキスト出力(${filtered.length}件)`} />
              <CopyBtn text={recordsToCSV(filtered)} label="📊 CSV出力" />
            </div>
          </>
        )}

        {records.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-4xl mb-3">📝</div>
            <p className="text-sm">
              記録はまだありません。
              <br />
              「＋ 新規記録」から対応内容を残せます。
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-10">条件に一致する記録がありません</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <button
                key={r.id}
                onClick={() => { setCurrent(r); setReport(""); setView("detail"); }}
                className={`w-full ${UI.card} p-3 text-left active:scale-95 transition-transform`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-slate-800">{r.situation || "記録"}</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS[r.status].color}`}>{STATUS[r.status].label}</span>
                </div>
                <p className="text-xs text-slate-500 truncate">{r.content}</p>
                <p className="text-xs text-slate-400 mt-1">{new Date(r.date).toLocaleString("ja-JP")}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    );

  if (view === "form")
    return (
      <div className="px-4 pt-5 pb-24">
        <button onClick={() => { setView("list"); clearDraft(); }} className="text-indigo-600 text-sm mb-3">
          ← 一覧に戻る
        </button>
        <h2 className="text-base font-bold text-slate-800 mb-4">クレーム記録</h2>
        <div className="space-y-3">
          {[
            ["situation", "状況(例:無理な要求をされている)"],
            ["place", "場所(例:受付カウンター)"],
            ["person", "相手の属性(例:家族・女性・60代)"],
            ["staff", "対応者(あなたの名前)"],
          ].map(([k, ph]) => (
            <input
              key={k}
              value={form[k]}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              placeholder={ph}
              className="w-full bg-white rounded-xl p-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
            />
          ))}
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="対応内容(できるだけ具体的に)※必須"
            className="w-full bg-white rounded-xl p-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-24 shadow-sm"
          />
          <textarea
            value={form.result}
            onChange={(e) => setForm({ ...form, result: e.target.value })}
            placeholder="対応・結果(例:別の時間帯での対応を提案し、ご理解いただけた)"
            className="w-full bg-white rounded-xl p-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-20 shadow-sm"
          />
          <div className="flex gap-2">
            {Object.entries(STATUS).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setForm({ ...form, status: k })}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${form.status === k ? "border-indigo-600 bg-gradient-to-r from-indigo-600 to-blue-500 text-white shadow" : "border-slate-200 bg-white text-slate-500"}`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <button onClick={save} disabled={!form.content.trim()} className={`w-full py-3 ${UI.btnPrimary}`}>
            保存する
          </button>
        </div>
      </div>
    );

  const r = current;
  return (
    <div className="px-4 pt-5 pb-24">
      <button onClick={() => setView("list")} className="text-indigo-600 text-sm mb-3">
        ← 一覧に戻る
      </button>
      <div className={`${UI.card} p-4 mb-4`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-800">{r.situation || "記録"}</h2>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS[r.status].color}`}>{STATUS[r.status].label}</span>
        </div>
        {[["日時", new Date(r.date).toLocaleString("ja-JP")], ["場所", r.place], ["相手", r.person], ["対応者", r.staff], ["内容", r.content], ["結果", r.result]].map(([k, v]) =>
          v ? (
            <div key={k} className="flex gap-3 py-1.5 border-b border-slate-50 last:border-0">
              <p className="text-xs font-bold text-indigo-700 w-12 shrink-0 pt-0.5">{k}</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{v}</p>
            </div>
          ) : null
        )}
        <div className="flex gap-2 mt-3">
          {Object.entries(STATUS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => updateStatus(r.id, k)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${r.status === k ? "border-indigo-600 bg-gradient-to-r from-indigo-600 to-blue-500 text-white" : "border-slate-200 text-slate-500"}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={() => genReport(r)} disabled={repLoading} className={`w-full py-3 flex items-center justify-center gap-2 ${UI.btnPrimary}`}>
        {repLoading ? (
          <>
            <Spinner light /> 作成中…
          </>
        ) : (
          "📄 上司報告文をAIで生成"
        )}
      </button>
      {repError && <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg p-3">{repError}</p>}
      {report && (
        <ChaosBubble title="ケイオスちゃん(報告文を作成しました)">
          <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{report}</p>
          <div className="mt-3 flex justify-end">
            <CopyBtn text={report} />
          </div>
        </ChaosBubble>
      )}
      <button onClick={() => removeRecord(r.id)} className="w-full mt-4 text-red-500 text-sm font-semibold py-2">
        この記録を削除
      </button>
    </div>
  );
}
