import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabaseClient";
import { fetchRecords, fetchScores, fetchSettings, updateSettings, logAudit } from "./lib/db";
import { INDUSTRIES } from "./data/constants";

import Login from "./screens/Login";
import SuiteHome from "./screens/SuiteHome";
import DocumentAI from "./screens/DocumentAI";
import OrgJoin from "./screens/OrgJoin";
import Onboarding from "./screens/Onboarding";
import Home from "./screens/Home";
import SituationDetail from "./screens/SituationDetail";
import Records from "./screens/Records";
import Training from "./screens/Training";
import Dashboard from "./screens/Dashboard";
import Settings from "./screens/Settings";
import DailyChallenge from "./screens/DailyChallenge";
import Cases from "./screens/Cases";
import SOSOverlay from "./screens/SOSOverlay";
import { Spinner } from "./components/ui";

const TABS = [
  { id: "home", label: "ホーム", icon: "🛡️" },
  { id: "records", label: "記録", icon: "📝" },
  { id: "training", label: "研修", icon: "🎓" },
  { id: "dashboard", label: "管理", icon: "📊" },
  { id: "settings", label: "設定", icon: "⚙️" },
];

export default function App() {
  const [session, setSession] = useState(undefined); // undefined=判定中 / null=未ログイン
  const [tab, setTab] = useState("home");
  const [situation, setSituation] = useState(null);
  const [records, setRecords] = useState([]);
  const [scores, setScores] = useState([]);
  const [draft, setDraft] = useState(null);
  const [userName, setUserName] = useState("");
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [loaded, setLoaded] = useState(false);
  const [daily, setDaily] = useState({ streak: 0, lastAnsweredDate: "", quizDate: "", quiz: null, answered: null });
  const [showDaily, setShowDaily] = useState(false);
  const [showCases, setShowCases] = useState(false);
  const [caseDraft, setCaseDraft] = useState(null);
  const [onboarded, setOnboarded] = useState(true);
  const [sos, setSos] = useState({ name: "", phone: "" });
  const [showSOS, setShowSOS] = useState(false);
  const [orgId, setOrgId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [suiteScreen, setSuiteScreen] = useState("home"); // "home" = Chaos AI Suite一覧 / "sesshoku" = 接遇ガードAI本体
  const loggedInRef = useRef(false);

  /* ログイン状態の監視(マジックリンクで戻ってきた場合も自動検知) */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  /* ログイン確定後:自分のデータを読込 */
  useEffect(() => {
    if (!session) return;
    setLoaded(false);
    (async () => {
      const userId = session.user.id;
      const [recs, scs, settings] = await Promise.all([fetchRecords(userId), fetchScores(userId), fetchSettings(userId)]);
      setRecords(recs);
      setScores(scs);
      setUserName(settings.user_name || "");
      const ind = INDUSTRIES.find((x) => x.id === settings.industry) || INDUSTRIES[0];
      setIndustry(ind);
      setDaily(settings.daily || { streak: 0, lastAnsweredDate: "", quizDate: "", quiz: null, answered: null });
      setOnboarded(!!settings.onboarded);
      setSos({ name: settings.sos_name || "", phone: settings.sos_phone || "" });
      setOrgId(settings.org_id || null);
      setIsAdmin(!!settings.is_admin);
      setLoaded(true);
      if (!loggedInRef.current) {
        loggedInRef.current = true;
        logAudit(userId, settings.org_id || null, "login", {});
      }
    })();
  }, [session]);

  const openRecordFrom = (s) => {
    setDraft(s);
    setSituation(null);
    setTab("records");
  };

  if (session === undefined) {
    return (
      <div className="w-full h-screen bg-slate-900 flex items-center justify-center">
        <Spinner light />
      </div>
    );
  }

  if (!session) return <Login />;

  const userId = session.user.id;

  /* Chaos AI Suite ホーム画面(全データ読込・組織参加・初回案内が済んだ後に表示) */
  if (loaded && orgId && onboarded && suiteScreen === "home") {
    return <SuiteHome onOpenAgent={(id) => setSuiteScreen(id)} />;
  }

  /* 書類作成AI(接遇ガードAIとは独立した画面) */
  if (suiteScreen === "documents") {
    return <DocumentAI onBack={() => setSuiteScreen("home")} />;
  }

  return (
    <div className="w-full h-screen bg-slate-200 flex justify-center font-sans">
      <div className="w-full max-w-md bg-slate-50 h-full flex flex-col relative overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 text-white px-4 py-2.5 flex items-center gap-2 shrink-0 shadow-md">
          <button onClick={() => setSuiteScreen("home")} className="text-amber-200 text-sm shrink-0 mr-0.5" title="Chaos AI Suiteに戻る">
            ←
          </button>
          <span className="text-lg">🛡️</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-none tracking-wide">接遇ガードAI</p>
            <p className="text-xs text-amber-200 mt-0.5">✦ あなたの安心を、AIが守る</p>
          </div>
          <button onClick={() => setShowSOS(true)} className="bg-red-600 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-md active:scale-95 transition-transform shrink-0">
            🚨 SOS
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!loaded ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Spinner />
            </div>
          ) : situation ? (
            <SituationDetail situation={situation} industry={industry} onBack={() => setSituation(null)} onSaveRecordDraft={openRecordFrom} />
          ) : showDaily ? (
            <DailyChallenge userId={userId} daily={daily} setDaily={setDaily} industry={industry} onBack={() => setShowDaily(false)} />
          ) : showCases ? (
            <Cases
              userId={userId}
              orgId={orgId}
              isAdmin={isAdmin}
              industry={industry}
              onBack={() => setShowCases(false)}
              onPractice={(sc) => { setCaseDraft(sc); setShowCases(false); setTab("training"); }}
            />
          ) : tab === "home" ? (
            <Home onSelect={setSituation} userName={userName} lastScore={scores[0]} onGoTraining={() => setTab("training")} daily={daily} onDaily={() => setShowDaily(true)} onCases={() => setShowCases(true)} />
          ) : tab === "records" ? (
            <Records userId={userId} orgId={orgId} records={records} setRecords={setRecords} draft={draft} clearDraft={() => setDraft(null)} userName={userName} />
          ) : tab === "training" ? (
            <Training userId={userId} orgId={orgId} scores={scores} setScores={setScores} industry={industry} caseDraft={caseDraft} clearCaseDraft={() => setCaseDraft(null)} />
          ) : tab === "dashboard" ? (
            <Dashboard records={records} scores={scores} userName={userName} orgId={orgId} />
          ) : (
            <Settings
              userId={userId}
              userEmail={session.user.email}
              userName={userName}
              setUserName={setUserName}
              records={records}
              setRecords={setRecords}
              scores={scores}
              setScores={setScores}
              industry={industry}
              setIndustry={setIndustry}
              sos={sos}
              setSos={setSos}
              orgId={orgId}
              isAdmin={isAdmin}
            />
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex shadow-lg">
          {TABS.map((t) => {
            const active = tab === t.id && !situation && !showDaily && !showCases;
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setSituation(null); setShowDaily(false); setShowCases(false); }}
                className={`flex-1 py-2 pb-3 text-center transition-colors ${active ? "text-amber-300" : "text-slate-500"}`}
              >
                <div className="text-lg leading-none mb-0.5">{t.icon}</div>
                <p className={`text-xs ${active ? "font-bold" : ""}`}>{t.label}</p>
                <div className={`w-1 h-1 rounded-full mx-auto mt-0.5 ${active ? "bg-amber-300" : "bg-transparent"}`} />
              </button>
            );
          })}
        </div>

        {showSOS && <SOSOverlay sos={sos} onClose={() => setShowSOS(false)} />}

        {loaded && !orgId && (
          <OrgJoin
            onDone={(newOrgId) => {
              setOrgId(newOrgId);
              logAudit(userId, newOrgId, "org_join", {});
            }}
          />
        )}

        {loaded && orgId && !onboarded && (
          <Onboarding
            onDone={async () => {
              setOnboarded(true);
              await updateSettings(userId, { onboarded: true });
            }}
          />
        )}
      </div>
    </div>
  );
}
