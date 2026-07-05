import { UI } from "../data/constants";
import { SectionTitle } from "../components/ui";

export default function Dashboard({ records, scores }) {
  const now = new Date();
  const thisMonth = records.filter((r) => {
    const d = new Date(r.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const count = (st) => records.filter((r) => r.status === st).length;

  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const n = records.filter((r) => {
      const rd = new Date(r.date);
      return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth();
    }).length;
    months.push({ label: `${d.getMonth() + 1}月`, n });
  }
  const maxM = Math.max(...months.map((m) => m.n), 5);

  const avg = scores.length ? Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length) : 0;
  const best = scores.length ? Math.max(...scores.map((s) => s.score)) : 0;
  const trend = [...scores].slice(0, 8).reverse();

  const cards = [
    { label: "今月の対応件数", n: thisMonth.length, color: "text-indigo-600", bg: "bg-indigo-100", icon: "📋" },
    { label: "対応中", n: count("open"), color: "text-amber-600", bg: "bg-amber-100", icon: "🕐" },
    { label: "解決済", n: count("resolved"), color: "text-emerald-600", bg: "bg-emerald-100", icon: "✅" },
    { label: "未対応", n: count("pending"), color: "text-red-500", bg: "bg-red-100", icon: "❗" },
  ];

  return (
    <div className="px-4 pt-5 pb-24">
      <SectionTitle>今月の対応状況</SectionTitle>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {cards.map((c) => (
          <div key={c.label} className={`${UI.card} p-4 text-center`}>
            <div className={`w-10 h-10 ${c.bg} rounded-full flex items-center justify-center text-lg mx-auto mb-2`}>{c.icon}</div>
            <p className="text-xs text-slate-500 mb-1">{c.label}</p>
            <p className={`text-2xl font-black ${c.color}`}>
              {c.n}
              <span className="text-xs font-bold text-slate-400 ml-0.5">件</span>
            </p>
          </div>
        ))}
      </div>

      <SectionTitle>対応件数の推移(過去6ヶ月)</SectionTitle>
      <div className={`${UI.card} p-4 mb-6`}>
        <div className="flex items-end justify-between gap-2 h-40">
          {months.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
              <p className="text-xs font-bold text-indigo-600 mb-1">{m.n > 0 ? `${m.n}件` : ""}</p>
              <div
                className="w-full bg-gradient-to-t from-indigo-600 to-sky-400 rounded-t-md transition-all"
                style={{ height: `${Math.max((m.n / maxM) * 100, m.n > 0 ? 6 : 2)}%`, opacity: m.n > 0 ? 1 : 0.15 }}
              />
              <p className="text-xs text-slate-500 mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      <SectionTitle>研修スコア分析</SectionTitle>
      {scores.length === 0 ? (
        <div className={`${UI.card} p-4 text-center mb-6`}>
          <p className="text-xs text-slate-400">
            研修の採点データがまだありません。
            <br />
            研修タブでロールプレイ→採点すると集計されます。
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className={`${UI.card} p-3 text-center`}>
              <p className="text-xs text-slate-500 mb-1">受講回数</p>
              <p className="text-xl font-black text-indigo-600">
                {scores.length}
                <span className="text-xs text-slate-400 font-bold">回</span>
              </p>
            </div>
            <div className={`${UI.card} p-3 text-center`}>
              <p className="text-xs text-slate-500 mb-1">平均スコア</p>
              <p className="text-xl font-black text-blue-600">
                {avg}
                <span className="text-xs text-slate-400 font-bold">点</span>
              </p>
            </div>
            <div className={`${UI.card} p-3 text-center`}>
              <p className="text-xs text-slate-500 mb-1">ベスト</p>
              <p className={`text-xl font-black ${UI.gold}`}>
                {best}
                <span className="text-xs text-slate-400 font-bold">点</span>
              </p>
            </div>
          </div>
          <div className={`${UI.card} p-4 mb-6`}>
            <p className="text-xs font-bold text-slate-500 mb-2">スコア推移(直近{trend.length}回・満点100)</p>
            <div className="flex items-end justify-between gap-2 h-32">
              {trend.map((s, i) => (
                <div key={s.id} className="flex-1 flex flex-col items-center justify-end h-full">
                  <p className="text-xs font-bold text-indigo-600 mb-1">{s.score}</p>
                  <div className="w-full bg-gradient-to-t from-indigo-600 to-amber-300 rounded-t-md" style={{ height: `${Math.max(s.score, 4)}%` }} />
                  <p className="text-xs text-slate-400 mt-1">{i + 1}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      <p className="text-xs text-slate-400 text-center">記録・研修のデータが自動で集計されます</p>
    </div>
  );
}
